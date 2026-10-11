# 04 — Database Design (PROPOSED, awaiting approval)

> Status: **Proposal.** It extends the four existing NEET collections and keeps the Course/Purchase/Entitlement domain untouched.
> Production does not auto-index (`MONGODB_AUTO_INDEX=false`), so every index below ships through `apps/api/scripts/create-indexes.js` and its `diffIndexes` verification.

## 1. Consistency strategy

- **No multi-document transactions.** The platform has none today, and the exam path does not need them.
- **The attempt document is the unit of atomicity.** It holds the pinned paper and key version IDs, all responses, the lifecycle state, the result and the proctoring counters. Every transition is a single-document compare-and-set (`findOneAndUpdate` with a status/session/deadline predicate). This keeps the proven `lifecycle.js` design.
- **Immutable reference data:** `NeetPaperVersion`, `NeetAnswerKeyVersion` and `NeetQuestionRevision`. They are written once and never updated, apart from a retirement flag. That makes them safe to cache in process by `_id`.
- **Cross-document effects are idempotent and replayable.** These are:
  - proctor events, then attempt counters
  - order paid, then access grant
  - key correction, then rescore

  Each carries an idempotency key, and a sweeper or job can replay it.

- **Write concern.** `w=majority`, journaled (already enforced for production URIs). Reads that drive state transitions go to the primary.

## 2. Collections

Legend:

- **(new)** a new collection
- **(Δ)** an existing collection that changes
- **(=)** an existing collection that stays as it is

### 2.1 `neetquestions` (Δ): reusable bank item (head record)

| Field                              | Type                                                                              | Notes                                                             |
| ---------------------------------- | --------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| `subject`                          | enum `physics, chemistry, botany, zoology`                                        | Required                                                          |
| `chapter`, `microtopic`, `concept` | string (taxonomy keys)                                                            | Validated against a taxonomy list (`neettaxonomy`, admin-managed) |
| `difficulty`                       | enum `EASY, MEDIUM, HARD`                                                         | Required for approval                                             |
| `reviewStatus`                     | enum `DRAFT, IN_REVIEW, APPROVED, REJECTED, RETIRED`                              | Only `APPROVED` revisions can enter a paper                       |
| `currentRevisionId`                | ObjectId → `neetquestionrevisions`                                                |                                                                   |
| `provenance`                       | `{type: ORIGINAL, LICENSED or AI_DRAFT_REVIEWED, author, licenseRef, sourceNote}` | Required. `AI_DRAFT_REVIEWED` requires a named expert reviewer.   |
| `legacyTestId`                     | ObjectId, optional                                                                | Migration only. Replaces the required, immutable `testId`.        |

Indexes:

- `{subject, chapter, reviewStatus}`
- `{reviewStatus, updatedAt: -1}`

### 2.2 `neetquestionrevisions` (new, immutable)

Fields:

- `questionId`
- `revision` (integer)
- `text`, `options[4]`, `media[≤3]`
- `answerKey {correctOptionKeys[]}` (`select:false`)
- `explanation` (`select:false`)
- `createdBy`, `createdAt`
- `contentHash`
- `reviews[{reviewerId, decision, note, at}]`

Indexes:

- `{questionId, revision}`, unique

### 2.3 `neetmocktests` (Δ): an offering

Added fields:

- `kind`: `FULL | SUBJECT | MINI`
- `subjects[]`
- `patternId`, e.g. `neet-ug-2026` (a versioned pattern registry in configuration)
- `accessTier`: `FREE | PAID`
- `productSkus[]`
- `currentPaperVersionId`

The existing fields stay: sections, marking, duration, modes, availability and `proctorPolicy`. The policy defaults change per D5.

Indexes: the existing `neet_test_slug` and `neet_test_published_listing` are kept.

### 2.4 `neetpaperversions` (new, immutable once `PUBLISHED`)

Fields:

- `testId`
- `version`
- `status`: `DRAFT | PUBLISHED | RETIRED`
- `patternSnapshot {sections, marking, durationSeconds}`
- `questions[{questionId, revisionId, sectionKey, number, marks, content: {text, options, media}}]`, with no keys
- `contentHash`
- `publishedBy`, `publishedAt`

Size: about 180 × ~1–2 KB, so 180–360 KB per version. That is well under the 16 MB document limit, and the document is read through an LRU cache, not per request.

Indexes:

- `{testId, version}`, unique
- `{testId, status, publishedAt: -1}`

### 2.5 `neetanswerkeyversions` (new, private, append-only)

Fields:

- `paperVersionId`
- `version`
- `keys[{questionId, correctOptionKeys[], status: ACTIVE | CANCELLED | BONUS}]`
- `reason`
- `createdBy`, `createdAt`
- `supersedes`

Only the scoring code and admin routes read this collection, and its contracts are never exposed to students.

Indexes:

- `{paperVersionId, version}`, unique

### 2.6 `neetattempts` (Δ)

The responses stay embedded (D2). Each `responses[]` entry keeps `{questionId, selectedOption, markedForReview, visited, timeSpentMs, seq, updatedAt}`.

Added fields:

| Field                                                                                                                            | Purpose                                                                               |
| -------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| `paperVersionId`, `answerKeyVersionId`                                                                                           | Pinned at `start`. The existing `paper` snapshot keeps ordering, numbering and marks. |
| `accommodation {extraSeconds, reasonCode, approvedBy, approvedAt}`                                                               | Set before start only                                                                 |
| `result.version`, `resultHistory[]` (bounded to the last 5)                                                                      | Rescoring, with old results kept for audit                                            |
| `review {status: NONE, FLAGGED, UNDER_REVIEW, CLEARED, ACTION_TAKEN; reviewerId; notes[]; decidedAt; appeal {status, note, at}}` | Kept independent of the submission status                                             |
| `accessGrantId`                                                                                                                  | Access evidence for paid tests                                                        |

Removed or changed:

- `candidate.phone` and `candidate.email` are no longer copied. This is decision J-6.

Estimated size: about 40 KB in progress and about 60–100 KB after scoring. The proctor warnings are already capped at 200.

Indexes (new ones are marked **new**):

- the existing `neet_attempt_one_open_per_test`: `{userId, testId}`, unique, partial `isOpen: true`
- the existing `neet_attempt_user_recent`: `{userId, createdAt: -1}`, extended to `{userId, createdAt: -1, _id: -1}` for keyset pagination
- **new** `neet_attempt_sweep`: `{status, expiresAt}`, partial `{isOpen: true}`
- **new** `neet_attempt_review_queue`: `{"review.status", updatedAt: -1}`, partial `{"review.status": {$in: ["FLAGGED", "UNDER_REVIEW"]}}`
- **new** `neet_attempt_test_reporting`: `{testId, status, submittedAt: -1}`

### 2.7 `neetproctorevents` (=)

No change to the schema, the idempotency index or the 180-day TTL. The retention period becomes a policy value (decision J-2).

### 2.8 `neetorders` (new)

This collection mirrors the proven `Purchase` patterns without the course coupling.

Fields:

- `userId`
- `sku`
- `amountPaise`, `currency`
- `status`: `created → paid → fulfilled | failed | refunded`
- `receipt`
- `razorpayOrderId`
- `razorpayPaymentId`
- `idempotencyKey`
- `checkoutExpiresAt`
- `priceSnapshot`

Indexes:

- `{receipt}`, unique
- `{razorpayOrderId}`, unique and sparse
- `{razorpayPaymentId}`, unique and sparse
- `{userId, idempotencyKey}`, unique and partial
- `{status, checkoutExpiresAt}`

### 2.9 `neetaccessgrants` (new, authoritative for paid exam access)

Fields:

- `userId`
- `sku`
- `testIds[]` or `tier`
- `source {type: ORDER | ADMIN | PROMO, ref}`
- `status`: `ACTIVE | REVOKED | EXPIRED`
- `validUntil`

Indexes:

- `{userId, status, validUntil}`
- `{"source.type", "source.ref"}`, unique (so a grant is idempotent per order)

### 2.10 `neetauditlog` (new)

Fields:

- `actorId`
- `action`: one of publish, keyCorrection, rescore, reviewDecision, evidenceView, accommodation, grant
- `target`
- `before` / `after` digests
- `requestId`
- `at`

It is append-only, with no TTL; the retention period is set by policy.

Indexes:

- `{target.type, target.id, at: -1}`
- `{actorId, at: -1}`

### 2.11 Later: mock recovery

`neetmistakes` will have these fields:

- `userId`, `attemptId`, `questionId`, `revisionId`
- `outcome`
- `suggestedReason`
- `confirmedReason`, a student-confirmed enum
- `resolvedAt`

It will be fed from `result.questions[]`. The schema is reserved now so that results carry stable question and revision references.

## 3. Constraints summary

| Invariant                                 | Mechanism                                                                                                      |
| ----------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| One open attempt per learner per test     | Partial unique index (existing)                                                                                |
| One answer per attempt and question       | Embedded array initialised from the paper. `$all` and `arrayFilters` in the save CAS (existing).               |
| Stale writes cannot overwrite newer ones  | `seq < incoming` array filter (existing)                                                                       |
| No double finalisation                    | Two-step CAS on `status` (existing)                                                                            |
| Paper and key immutable during an attempt | Pinned version IDs plus immutable collections (new)                                                            |
| No cross-user exposure                    | Every attempt query includes `userId` (existing). Admin routes are role-gated and audited (new).               |
| Paid access is authoritative              | A grant is required by `POST /attempts` for `accessTier: PAID` (new)                                           |
| Bounded growth                            | Warnings capped at 200, events capped at 3,000 per attempt with a TTL, `resultHistory` ≤ 5, paginated listings |

## 4. Migration plan (M2)

1. Add the new collections and indexes with `create-indexes`, run with `MIGRATION_CONFIRM`.
2. Run the migration script, which uses the confirm-variable pattern of the existing CLIs:
   - Create a revision 1 for every existing `NeetQuestion`.
   - Create a `NeetPaperVersion` and a `NeetAnswerKeyVersion` v1 per published sample test.
   - Set `currentPaperVersionId`.
3. Make code paths read the pinned versions. Attempts without `paperVersionId` (legacy) keep the current live-read path until they finish. This compatibility branch is removed after all legacy open attempts are final.
4. There is no downtime: the new fields are additive and old attempts finish on the old path.
