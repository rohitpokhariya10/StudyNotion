# ADR 0010: Make Entitlement the future course-access authority

- **Status:** Proposed for implementation review; no runtime decision is deployed
- **Date:** 9 August 2026
- **Scope:** Architecture and migration design only

## Context

StudyNotion currently represents a learner/course relationship in five places:

- immutable financial history in `Purchase.courses`;
- the mutable checkout lock/projection in `Purchase.activeCourses`;
- the Student dashboard mirror in `User.courses`;
- the runtime learner-access mirror in `Course.studentsEnroled`; and
- learning state in `CourseProgress` plus its unreliable
  `User.courseProgress` reverse reference.

There is no canonical Enrollment or Entitlement collection. Cross-document
workflows support a standalone MongoDB deployment, so they use compare-and-set
updates, unique indexes, application locks, idempotent operators, and
best-effort compensation rather than requiring transactions. The read-only
consistency audit in ADR 0009 now exposes divergence, but it deliberately does
not repair data or change authorization.

This ADR designs an additive authority and a staged migration. It does not add
a Mongoose model, create an index, write enrollment data, modify a payment or
refund workflow, change an API response, switch authorization, remove a legacy
mirror, or begin CourseVersion work.

## Current architecture traced from the repository

### Checkout, capture, and fulfillment

The real write sequence is more detailed than the conceptual checkout diagram:

```text
Student checkout request
  -> validate authenticated active/approved Student and policy versions
  -> validate 1..20 unique Published Courses and server-side prices
  -> reject Course.studentsEnroled or conflicting Purchase evidence
  -> acquire the User payment/deletion-operation lock
  -> create immutable Purchase snapshot + mutable activeCourses reservation
  -> create/recover Razorpay order and store order_created
  -> browser verification or signed webhook validates captured provider payment
  -> compare-and-set Purchase to paid
  -> upsert one CourseProgress per Student/Course
  -> add Course and progress references to the Student User
  -> add Student to Course.studentsEnroled
  -> compare-and-set Purchase to fulfilled
  -> emit best-effort telemetry and email
```

The relevant implementation is in:

- `capturePayment`, `verifyPayment`, `razorpayWebhook`, `fulfillPurchase`, and
  `enrollStudent` in `server/controllers/payments.js`;
- `releaseStaleCheckoutLocks` in `server/utils/purchaseLifecycle.js`;
- the immutable financial fields, statuses, and checkout indexes in
  `server/models/Purchase.js`; and
- the unique learner/course progress index in
  `server/models/CourseProgress.js`.

Webhook raw-body parsing is mounted before normal parsers in
`server/app/registerRoutes.js`. The webhook accepts only `payment.captured` and
`order.paid`; there is no refund webhook. Browser verification and webhook
delivery converge on `fulfillPurchase`. Purchase compare-and-set operations,
`$addToSet`, and the CourseProgress unique index make ordinary replays mostly
idempotent, but no transaction spans Purchase, User, Course, and
CourseProgress. A crash or failed compensation can therefore leave partial
state. The current final fulfillment filter is also broader than an exact
`paid -> fulfilled` transition, which a later dual-write implementation must
not copy.

### Current access checks

Protected Student routes below reach their enrollment predicate only after the
existing authentication, session-version, active/approved, deletion-pending,
policy, and role gates in `server/middleware/auth.js`. V1 full details and
playback are `auth`-only routes that branch on Student/Instructor/Admin inside
`resolveCourseAccess`. `getEnrolledCourses` is also `auth`-only and currently
serializes polymorphic `User.courses` even for a direct non-Student caller; that
compatibility edge is handled explicitly below.

| Consumer                      | Current learner decision              | Repository location                                                      |
| ----------------------------- | ------------------------------------- | ------------------------------------------------------------------------ |
| Learning V2 course state      | `Course.studentsEnroled`              | `server/domains/learning/learningRepository.js` and `learningService.js` |
| Learning V2 progress mutation | Course mirror, then lesson membership | `server/domains/learning/learningService.js`                             |
| V1 progress mutation          | Course mirror, then lesson membership | `server/controllers/courseProgress.js`                                   |
| V1 full-course details        | Course mirror for Students            | `resolveCourseAccess` in `server/controllers/Course.js`                  |
| Protected lesson playback     | Course mirror, then lesson membership | `getLessonPlaybackUrl` in `server/controllers/Course.js`                 |
| Review submission             | Course mirror                         | `server/controllers/RatingandReview.js`                                  |
| Enrolled-course dashboard     | `User.courses` only                   | `getEnrolledCourses` in `server/controllers/profile.js`                  |
| Checkout already-owned check  | Course mirror plus Purchase conflicts | `capturePayment` in `server/controllers/payments.js`                     |

`resolveCourseAccess` separately permits the owning Instructor and an Admin for
legacy full details and protected playback. Those are policy overrides, not
Student enrollment. They must remain endpoint-specific during migration.

There is no separate course-download endpoint. Protected media is the relevant
boundary: the server rechecks course access and lesson membership before it
returns a short-lived signed playback URL. A URL already issued before a
revocation remains usable until its provider expiry.

`Course.studentsEnroled` is also used for enrollment counts and lifecycle
guards in catalog/category queries, Course DTOs, the instructor dashboard, and
Course/Section/Subsection deletion logic. Those reads are projections and
reporting concerns, not all authorization decisions.

Authentication/login and `getUserDetails` currently serialize `User.courses`
and `User.courseProgress`. Migration must not silently remove those response
fields. Admin approval/rejection changes Instructor account/session approval
state but does not grant, revoke, or rewrite Student course access.

### The legacy mirrors are not interchangeable

`User.courses` is polymorphic. Course creation writes Instructor-owned course
IDs into it in `server/controllers/Course.js`, while payment fulfillment writes
Student enrollment course IDs in `server/controllers/payments.js`. Only a
Student's entries can be treated as an enrollment compatibility mirror. A
future derivation must never clear or rewrite an Instructor's ownership values.

`User.courseProgress` is also not authoritative. Fulfillment writes the reverse
reference, but V1 and V2 lazy progress upserts do not maintain it. No production
access or progress read depends on that User array.

### Refund and reconciliation lifecycle

The current Purchase states intentionally combine financial and workflow
concerns:

| Purchase state                           | Current meaning for access                                                                      |
| ---------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `created`, `order_created`               | Unpaid reservation. `activeCourses` must not grant access.                                      |
| `paid`                                   | Captured payment whose fulfillment is incomplete or crashed. Manual reconciliation is required. |
| `fulfilled`                              | Financial fulfillment completed; mirrors normally grant access.                                 |
| `payment_review`                         | Captured funds need support resolution; no access is intended.                                  |
| `refund_requested`                       | Learner requested a refund; access intentionally remains.                                       |
| `refund_pending` from `refund_requested` | Provider refund is unresolved; access intentionally remains.                                    |
| `refund_pending` from `payment_review`   | A held payment is being returned; access was not intended.                                      |
| `refunded`                               | Provider processed the refund and access should be removed.                                     |
| `failed`, `expired`                      | No access.                                                                                      |

`requestRefund` moves a learner-owned `fulfilled` Purchase to
`refund_requested` without removing access. Admin rejection returns it to
`fulfilled`. Admin refund reconciliation durably records `refund_pending`,
reuses or polls a provider refund, and removes `Course.studentsEnroled`,
`User.courses`, CourseProgress, and `User.courseProgress` only after Razorpay
reports `processed`. It then records `refundEntitlementsRevokedAt` and finalizes
`refunded`.

The cleanup is retryable but nontransactional. Existing code preserves mirrors
when another Purchase in a qualifying state covers the same Student/Course,
although its broad treatment of every `refund_pending` origin is a known
semantic gap. A finalized `refunded` replay does not repeat cleanup, so the
read-only consistency audit remains necessary for residual mirrors.

Admin manual fulfillment is not an arbitrary course grant. It resolves a
captured `payment_review` Purchase and then uses the common fulfillment path.
Admin reconciliation is protected by `auth`, `isAdmin`, exact action
confirmation, a bounded note, and a short Purchase reconciliation lock.

A provider `pending` or `failed` result remains `refund_pending`. An ambiguous
provider timeout records the attempt and is recovered/polled by immutable
evidence; it never automatically issues a second refund. A failed provider
refund can be retried only through the explicit audited `retry_refund` action,
and prior failed refund IDs remain recorded. A timely learner request remains
eligible even when support processes it after the deadline, while a held
payment outside the refund window requires an explicit audited override.

### Account and Course lifecycle

Student account deletion:

1. expires stale checkout locks;
2. blocks unresolved `created`, `order_created`, `paid`, `payment_review`,
   `refund_requested`, and `refund_pending` work;
3. acquires and rechecks the User deletion/payment-operation lock;
4. removes Course mirrors, progress, reviews, OTPs, profile data, and User
   mirror arrays; and
5. anonymizes and deactivates the retained User while preserving Purchase and
   provider history.

This behavior is in `deleteAccount` in `server/controllers/profile.js`. Failed
cleanup leaves deletion pending so authentication fails closed and a retry can
continue. Instructor deletion is blocked when Course history exists, and Admin
self-deletion is blocked.

Course deletion in `server/controllers/Course.js` archives Published,
Archived, ever-published, enrolled, or financially sold Courses. Archival keeps
curriculum, mirrors, progress, and learner access; new checkout still requires
`Published`. Only a never-published, unsold, unenrolled Draft can be physically
deleted. Section and lesson deletion apply similar guards. Course status is not
part of the current protected Student access predicate, so an existing learner
continues to access an archived or Draft-demoted Course.

## Problems to solve

The current shape has six architectural problems:

1. A mutable Course array with no grant provenance decides protected access.
2. User and Course mirrors can disagree, producing dashboard/access drift.
3. Purchase lifecycle states cannot be interpreted as access without origin
   and account-lifecycle context.
4. Multi-document fulfillment, refund, and deletion can stop between writes.
5. Refunds and later repurchases need distinct historical grant provenance.
6. Moving one call site alone would create inconsistent security decisions.

The migration must fix these without weakening authentication, Razorpay
verification, reconciliation, protected-media checks, account deletion,
origin/CSRF protection, rate limiting, API compatibility, or production
preflight behavior.

## Decision

Introduce one future domain concept named **Entitlement**.

An active Entitlement grants an eligible Student access to one Course. The word
“enrollment” remains appropriate in product copy, but a separate Enrollment
model is not justified: StudyNotion has no cohort, seat, schedule, attendance,
or academic-registration state distinct from access. Two models would duplicate
the same Student/Course relationship and create another synchronization
boundary.

The authoritative boundaries will eventually be:

```text
Purchase
  = financial/accounting evidence and refund/reconciliation workflow

Entitlement
  = course-access authority

CourseProgress
  = learning progress for a Student/Course

User.courses and Course.studentsEnroled
  = temporary compatibility projections
```

Explicitly:

- a current `active` Entitlement grants Student Course access;
- a processed refund or completed account deletion revokes access through a
  terminal Entitlement transition;
- Purchase is retained financial and reconciliation history;
- CourseProgress is learning state and never grants access; and
- `User.courses`, `Course.studentsEnroled`, and `User.courseProgress` are
  compatibility projections, with non-Student `User.courses` also retaining
  Instructor ownership semantics.

Only a schema-valid Entitlement with `status === "active"` and
`isCurrent === true` may grant Student course access, and only after all
existing identity, account, policy, and endpoint role gates pass. A missing,
provisioning, revoked, cancelled, or internally inconsistent Entitlement denies
access once the final cutover is complete.

Entitlement does not replace Instructor ownership or Admin policy overrides.
Those remain explicit decisions based on the authenticated principal, Course
owner, endpoint purpose, and current authorization policy.

## Proposed Entitlement model

### Record identity

Use one document per grant episode, not one permanently unique mutable pair. A
processed refund makes that episode terminal. If the learner later purchases
the Course again, the new Purchase creates a new Entitlement document. This
retains provenance without an unbounded history array and still permits the
database to enforce at most one active episode per Student/Course.

One multi-Course Purchase creates one Entitlement per Purchase line Course.

### Proposed Mongoose shape

The following is a design contract, not code added by this ADR:

```js
{
  schemaVersion: {
    type: Number,
    enum: [1],
    default: 1,
    required: true,
    immutable: true
  },

  studentId: {
    type: ObjectId,
    ref: "user",
    required: true,
    immutable: true
  },
  courseId: {
    type: ObjectId,
    ref: "Course",
    required: true,
    immutable: true
  },
  purchaseId: {
    type: ObjectId,
    ref: "Purchase",
    required: true,
    immutable: true
  },

  isCurrent: {
    type: Boolean,
    required: true,
    default: true
  },

  status: {
    type: String,
    enum: ["provisioning", "active", "revoked", "cancelled"],
    required: true,
    default: "provisioning"
  },
  source: {
    type: String,
    enum: ["purchase", "verified_backfill"],
    required: true,
    immutable: true
  },

  grantedAt: Date,

  revokedAt: Date,
  revocationReason: {
    type: String,
    enum: ["refund_completed", "account_deleted"]
  },

  cancelledAt: Date,
  cancellationReason: {
    type: String,
    enum: [
      "refund_completed_before_activation",
      "account_deleted_before_activation"
    ]
  },

  replacementPurchaseId: {
    type: ObjectId,
    ref: "Purchase",
    select: false
  },
  replacementDecision: {
    type: String,
    enum: ["none", "selected"],
    select: false
  },
  replacementOutcome: {
    type: String,
    enum: ["not_required", "pending", "activated", "abandoned", "superseded"],
    select: false
  },
  replacementAbandonReason: {
    type: String,
    enum: ["financial_state_changed", "user_ineligible", "course_unavailable"],
    select: false
  },

  reconciliationAttempts: {
    type: Number,
    default: 0,
    min: 0,
    max: 5,
    required: true,
    select: false
  },
  nextReconciliationAt: {
    type: Date,
    select: false
  },
  reconciliationLeaseId: {
    type: String,
    maxlength: 100,
    select: false
  },
  reconciliationLeaseUntil: {
    type: Date,
    select: false
  },
  manualReviewRequiredAt: {
    type: Date,
    select: false
  },
  lastReconciliationCode: {
    type: String,
    enum: [
      "activation_retry",
      "compatibility_write_failed",
      "current_pair_conflict",
      "purchase_cas_uncertain",
      "replacement_transfer"
    ],
    select: false
  },
  supersededByEntitlementId: {
    type: ObjectId,
    ref: "Entitlement",
    select: false
  },
  lastManualOperationId: {
    type: String,
    maxlength: 100,
    select: false
  },

  migrationRunId: {
    type: String,
    trim: true,
    maxlength: 100,
    immutable: true,
    select: false
  },

  revision: {
    type: Number,
    default: 0,
    min: 0,
    required: true
  },

  createdAt: Date,
  updatedAt: Date
}
```

Schema options should be `timestamps: true`, `strict: "throw"`, and
`versionKey: false` because `revision` is the explicit concurrency token.
Repository methods must set `runValidators: true` where applicable, but query
validators alone do not prove whole-document invariants. The pure policy must
construct and validate the complete target state; the repository must use the
exact predecessor status/revision, atomically increment `revision`, and verify
the returned post-image. Mongoose document optimistic concurrency is not a
substitute for guarded `findOneAndUpdate` operations.

The first schema deliberately requires a Purchase for every grant episode.
There is no production complimentary-course or arbitrary Admin-grant workflow
today. Mirror-only legacy evidence is not enough to invent one. A future
complimentary/manual-grant product would require a separate reviewed source,
actor, reason, approval, and audit design. The disposable local seed must either
remain on the legacy path during early stages or create an explicit synthetic
test Purchase in a later, separately reviewed implementation.

`source` describes whether the episode was created live from Purchase or by a
verified migration, not whether browser, webhook, or Admin delivery won a race.
Every live captured-payment path uses `purchase`; the Purchase reconciliation
audit retains the Admin actor and action. This lets an episode created during
normal fulfillment later be activated by Admin reconciliation without changing
or mismatching immutable provenance.

### Cross-field invariants

- `provisioning`: `isCurrent` is true; `grantedAt`, revocation fields, and
  cancellation fields are absent.
- `active`: `isCurrent` is true; `grantedAt` is required and terminal fields are
  absent.
- `revoked`: `isCurrent` is false; `grantedAt`, `revokedAt`, and
  `revocationReason` are required; cancellation fields are absent.
- `cancelled`: `isCurrent` is false; `grantedAt` and revocation fields are
  absent; `cancelledAt` and `cancellationReason` are required.
- `migrationRunId` is required only for `verified_backfill` and forbidden for
  live fulfillment sources.
- `replacementDecision` is write-once and allowed only on a refund-terminal
  episode (`revoked/refund_completed` or
  `cancelled/refund_completed_before_activation`). `selected` requires a
  write-once `replacementPurchaseId` different from `purchaseId`; `none`
  forbids it. An absent decision means the transfer selection has not committed.
  `none` requires `replacementOutcome: "not_required"`. `selected` starts at
  `pending` and may move exactly once to `activated` after the replacement
  post-image is active, or to `abandoned` through an audited manual action with
  one allowlisted `replacementAbandonReason`. The selected Purchase ID remains
  retained even when abandoned; no different replacement is substituted. It
  may instead become `superseded` only through an audited CAS that proves a
  different eligible active Entitlement won under the Student lease and stores
  its write-once `supersededByEntitlementId`. `superseded` forbids an abandon
  reason; all other outcomes forbid the superseding pointer.
- Reconciliation attempts are safe nonnegative integers. Lease ID/until must be
  present or absent together and are allowed only while `provisioning`. A
  provisioning record either has a due schedule with no manual-review timestamp
  or has entered manual review with no schedule; creation durably schedules its
  first worker attempt one minute later, before compatibility work begins.
  Active and terminal transitions clear only lease and schedule fields. They
  retain the required final attempt count plus any manual-review timestamp and
  last allowlisted code as bounded operational evidence; the private operation
  ledger retains durable manual history.
- `lastManualOperationId` is only a crash-correlation pointer to the private
  operation ledger. It changes only as part of an exact manual claim after the
  prior operation is terminal and never contributes to authorization.
- `revoked` and `cancelled` are terminal access states. They never return to an
  authorizing status; only the one-way replacement outcome and manual audit
  correlation fields may advance afterward. A re-grant creates a new episode.
- Immutable identity, source, and Purchase provenance never change.
- `grantedAt`, revocation fields, and cancellation fields are write-once
  through the transition policy.
- `revision` is a nonnegative safe integer and increments on every successful
  state transition or operational lease/schedule mutation.
- Dates are written by the server. Clients cannot submit transition fields.
- Entitlement stores no email, name, provider ID, note, policy text, media URL,
  progress array, or Course snapshot.

The implementation must enforce these invariants both in a pure transition
policy and in model validation. Raw operational scripts must use the same
policy or an explicitly reviewed migration-only adapter.

### Proposed indexes

Use stable explicit names:

```js
entitlementSchema.index(
  { purchaseId: 1, courseId: 1 },
  { name: "unique_entitlement_purchase_course", unique: true }
)

entitlementSchema.index(
  { studentId: 1, courseId: 1 },
  {
    name: "unique_current_entitlement_student_course",
    unique: true,
    partialFilterExpression: { isCurrent: true },
  }
)

entitlementSchema.index(
  { studentId: 1, status: 1, courseId: 1 },
  { name: "entitlement_student_status_course" }
)

entitlementSchema.index(
  { courseId: 1, status: 1, studentId: 1 },
  { name: "entitlement_course_status_student" }
)

entitlementSchema.index(
  { status: 1, nextReconciliationAt: 1, _id: 1 },
  {
    name: "entitlement_stale_provisioning",
    partialFilterExpression: { status: "provisioning" },
  }
)

entitlementSchema.index(
  { status: 1, reconciliationLeaseUntil: 1, _id: 1 },
  {
    name: "entitlement_expired_reconciliation_lease",
    partialFilterExpression: { status: "provisioning" },
  }
)

entitlementSchema.index(
  { migrationRunId: 1, _id: 1 },
  {
    name: "entitlement_migration_run",
    partialFilterExpression: { migrationRunId: { $type: "string" } },
  }
)
```

`isCurrent` is a deliberately small enforcement projection: it is true only
for `provisioning` and `active` and becomes false in the same atomic update that
sets a terminal status. This avoids relying on production feature-compatibility
support for `$in` inside a partial filter. It detects a competing Purchase at
provisioning time, before legacy enrollment writes or `paid -> fulfilled`, and
allows historical revoked/cancelled episodes while guaranteeing at most one
open episode and therefore at most one active grant.

The unique current index also supports exact authorization after filtering the
single candidate for `status: "active"`. The Student/status and Course/status
indexes serve account deletion, listings, lifecycle guards, counts, and
multi-status pair inspection. The due and expired-lease provisioning indexes
separately drive deterministic claims and crashed-claim recovery; oldest-age
metrics use their bounded result sets rather than an unbounded scan. No text,
wildcard, or speculative reporting index is proposed. A current-pair conflict
fails closed and holds the captured Purchase for reconciliation; it never
silently overwrites provenance.

Indexes must be proven on MongoDB 8 with real unique/partial-index tests and
query-plan evidence. Production `autoIndex` remains disabled. Any later index
creation uses the existing confirmed, additive, no-drop index workflow.

## Entitlement state machine

| State          |            Student access | Progress update |    New review | Refund handling                                           | Can become active?                    |
| -------------- | ------------------------: | --------------: | ------------: | --------------------------------------------------------- | ------------------------------------- |
| No record      |    No after final cutover |              No |            No | Purchase workflow; held refund may create cancelled audit | Yes, through verified provisioning    |
| `provisioning` |                        No |              No |            No | A processed refund cancels it                             | Yes, after exact fulfillment checks   |
| `active`       | Yes, after existing gates |             Yes |           Yes | Request/pending retains access; processed refund revokes  | It remains active on refund rejection |
| `revoked`      |                        No |              No | No new review | Purchase history remains                                  | No; terminal                          |
| `cancelled`    |                        No |              No |            No | Never represented an active grant                         | No; terminal                          |

Existing reviews remain after a processed refund, matching current behavior;
revocation prevents a new review submission. Instructor-owner and Admin access
are evaluated separately and are not represented by this table.

### Legal transitions

| Trigger                                      | Entitlement transition        | Initiator and evidence                                                           |
| -------------------------------------------- | ----------------------------- | -------------------------------------------------------------------------------- |
| Verified captured payment                    | no record -> `provisioning`   | Server-only fulfillment using the scoped Purchase and captured provider evidence |
| Successful financial fulfillment             | `provisioning` -> `active`    | Exact Purchase status/payment predicates plus Entitlement revision CAS           |
| Duplicate webhook or browser verification    | no change                     | Same `{ purchaseId, courseId }` natural key; verify immutable fields             |
| Captured payment held after grant work began | remain `provisioning`         | No access; Admin must resolve the Purchase                                       |
| Late/expired capture held before grant work  | no record                     | Admin fulfillment first creates a purchase-sourced `provisioning` episode        |
| Admin manual fulfillment                     | `provisioning` -> `active`    | Existing Admin reconciliation lock, note, provider evidence, and exact CAS       |
| Learner refund request                       | no change; remain `active`    | Owner-scoped Purchase request                                                    |
| Refund rejected                              | no change; remain `active`    | Admin reconciliation audit                                                       |
| Learner-origin provider refund pending       | no change; remain `active`    | Persisted Purchase refund origin/status                                          |
| Provider refund processed                    | `active` -> `revoked`         | Purchase/provider result, reason `refund_completed`                              |
| Refund before activation                     | `provisioning` -> `cancelled` | Purchase/provider result                                                         |
| Held-payment refund with no prior episode    | no record -> `cancelled`      | Exact payment-review origin and processed provider result                        |
| Account deletion                             | `active` -> `revoked`         | Existing deletion lock and reason `account_deleted`                              |
| Account deletion before activation           | `provisioning` -> `cancelled` | Existing deletion lock                                                           |
| Course archive or Draft demotion             | no change                     | Course lifecycle policy retains learner access                                   |
| Repurchase after revocation                  | create a new episode          | New Purchase; old episode remains terminal                                       |

There is no Entitlement `refund_requested`, `refund_pending`, `refunded`,
`expired`, or `payment_review` state. Those belong to Purchase. There is no
Entitlement suspension or expiry because the current product has neither
subscriptions nor legal-takedown semantics.

`provisioning` is necessary for standalone-safe recovery. If an active record
were inserted only after Purchase fulfillment, a delayed insert could race a
refund or deletion and recreate access after cleanup. A durable non-authorizing
record gives refund/deletion an object to cancel. Activation requires
`status: "provisioning"`, the expected `revision`, exact financial eligibility,
and an eligible User; a winning cancellation prevents a delayed activation.
Every activation atomically sets `status` and `grantedAt`, retains
`isCurrent: true`, and increments `revision` as one validated post-image;
terminal transitions atomically set `isCurrent: false` with their write-once
timestamp, reason, and revision increment.

The direct no-record-to-cancelled path exists only for a captured
`payment_review` Purchase that never intended access and has a durably processed
provider refund. It creates one idempotent purchase/course audit episode with
`source: "purchase"`, `isCurrent: false`,
`cancellationReason: "refund_completed_before_activation"`,
`cancelledAt = Purchase.refundProcessedAt`, and
`replacementDecision/outcome = none/not_required`. It cannot be used for a
fulfilled or unknown-origin Purchase and never grants access.

## Purchase and CourseProgress relationships

### Purchase remains financial history

Purchase answers who checked out, what immutable Course/price/policy snapshot
was purchased, what Razorpay evidence exists, and what refund/reconciliation
occurred. It remains retained after access revocation and account anonymization.

Entitlement answers only whether the Student may access a particular Course.
One Purchase can source several Entitlements. An Entitlement references its
Purchase, but an authorization request does not infer access from Purchase
status or `activeCourses`. This keeps financial workflows and bundle history
out of the protected-read hot path.

Refund fields are not duplicated into Entitlement. Request and pending states
leave an active record unchanged. Only a durable processed outcome changes
access. An external/provider-originated refund is not currently ingested by a
webhook or worker; adding that discovery mechanism is an open implementation
decision, not behavior this ADR claims already exists. Final cutover is blocked
until out-of-band provider refunds are either operationally prohibited or a
verified webhook/poller/reconciliation path detects them and drives the same
revocation saga.

### CourseProgress remains learner/course learning state

Keep `CourseProgress` keyed by `{ userId, courseID }` in the first migration.
Do not add an `entitlementId`:

- a learner can have several historical grant episodes for one Course;
- progress is not authorization and must never create access;
- tying progress to one Purchase complicates refund and repurchase behavior;
- existing reads already use the learner/course pair; and
- the current unique pair index is proven.

Every progress read or mutation still checks authorization first. Preserve the
current lifecycle initially: a processed refund with no other valid access and
account deletion remove CourseProgress; Course archive retains it; a later
repurchase starts with the state left by the approved cleanup policy, which is
currently empty after refund. `User.courseProgress` remains a nonauthoritative
compatibility projection and is not copied into Entitlement.

## Legacy mirror migration

Migration is staged so `Course.studentsEnroled` remains available as rollback
authority until after the final reviewed cutover.

| Stage                            | Deployment and behavior                                                                                                                                                                                           | Metrics and release gate                                                                                                       | Failure behavior and rollback                                                                                                                                            |
| -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1. Collection and indexes        | Deploy only the model, pure transition policy, indexes, and tests. Runtime reads/writes remain legacy.                                                                                                            | Index build success, duplicate-current preflight, zero runtime Entitlement calls.                                              | Abort index rollout or deploy the old app. Empty/additive data is ignored.                                                                                               |
| 2. Non-authoritative dual write  | Before backfill, make new fulfillment, processed refund, account deletion, and Admin reconciliation maintain Entitlement and every legacy projection. Reads remain legacy.                                        | Dual-write outcome, current-pair conflicts, stale provisioning age, retry queue, and no untracked lifecycle mutation gap.      | Disable the new writer only after its in-flight work is drained; hold failures in the existing financial/deletion recovery path. Legacy authorization remains.           |
| 3. Backfill and catch-up         | Establish a high-watermark, dry-run, review, insert approved episodes in bounded batches, and repeatedly catch up while Stage 2 writers cover new mutations. Finish with a quiesced full audit. No mirror repair. | Safe/manual/ignore/invalid counts, uncovered-pair count, catch-up lag, checksums, and a quiesced second run with zero changes. | Stop the job. Legacy remains authoritative. Exact untouched batch records can be removed by manifest or ignored. Coverage-incomplete pairs cannot enter rollout cohorts. |
| 4. Shadow read                   | After normal legacy decisions, read Entitlement asynchronously/bounded and compare without changing status/body.                                                                                                  | Agree-allow, agree-deny, legacy-only, entitlement-only, query-error counts per endpoint; no unexplained security mismatch.     | Disable shadow work. Request behavior is byte-compatible.                                                                                                                |
| 5. Cohort dual read              | Both sources are read for comparison, but each server-controlled cohort has exactly one authority: control uses legacy; treatment uses Entitlement. There is no per-request fallback.                             | Per-cohort parity, coverage, authorization error/latency, stale provisioning, and rollback-preflight results.                  | Treatment errors/missing/non-active states deny or 503. Roll back a cohort only after the security gate below passes.                                                    |
| 6. Runtime cutover               | Move every protected Student call site and Student listing to Entitlement as one release; keep shadow comparison and legacy writes.                                                                               | Zero unresolved mismatch, zero stale provisioning over SLO, complete coverage, and full security/journey gates.                | Quiesce writers, prove projection safety, and return every call site to legacy as one unit. Mirrors are still maintained.                                                |
| 7. Derived compatibility mirrors | Entitlement remains authority; Student `User.courses` and `Course.studentsEnroled` are maintained/rebuilt as derived projections for legacy APIs/counts. Instructor `User.courses` ownership remains untouched.   | Projection lag/mismatch, rebuild duration, count parity, and no authorization dependency on mirrors.                           | Resume synchronous legacy writes or rebuild from Entitlement; an authority rollback still requires the security gate.                                                    |
| 8. Possible mirror removal       | Only a separate ADR may split Instructor ownership, version APIs, remove reads, and then remove fields.                                                                                                           | Zero consumers, compatibility approval, destructive migration review, and restore rehearsal.                                   | Not authorized by this ADR. Until then, retain mirrors.                                                                                                                  |

Deploying lifecycle writers before the mutating backfill closes the scan/write
gap. Standalone MongoDB cannot provide a cross-collection migration snapshot,
so the high-watermark is an operational checkpoint, not snapshot isolation.
Every row is revalidated at write time, repeated delta/full scans must converge
under a short approved quiescence window, and incomplete coverage blocks cohort
eligibility.

Stages 2 through 4 and every Stage 5 control cohort do not tighten or
reinterpret legacy projection behavior. In particular, the current refund
cleanup broadly treats another qualifying `refund_pending` Purchase as a reason
to retain Course/User mirrors and CourseProgress. The non-authoritative writer
runs as a sidecar/catch-up after the existing financial outcome: its failure or
stricter classification cannot change Purchase status, legacy values, HTTP
response, or email. It records the Entitlement state and shadow mismatch
instead. No pair with an unresolved sidecar result can enter treatment.

A Stage 5 treatment cohort uses the new Entitlement saga for access and recovery
while still invoking the legacy cleanup algorithm only as a compatibility
projection. It may therefore ignore a stale retained mirror; that mismatch
blocks rollback until reconciled. Fully source-aware projection cleanup begins
only after every Student authorization/listing consumer has cut over and Stage
7 is separately reviewed. It never silently changes a legacy-authoritative
cohort.

Cohort authority is sticky per Student. Admission to or rollback from treatment
requires no in-flight checkout, `paid`, payment-review, refund, deletion,
provisioning, manual-operation, or Student-lease work; the selected mode cannot
change mid-saga.

An OR decision such as `legacyAllow || entitlementAllow`, including a
`no Entitlement record -> legacy` request fallback, is forbidden. A missing
record cannot distinguish an unmigrated pair from a missed dual write, and a
stale Course mirror could bypass a refund or deletion. In a treatment cohort,
missing, provisioning, revoked, cancelled, invalid, and operational-error
outcomes deny or 503. Rollout and rollback change the server-owned cohort mode,
not the result of an individual request.

## Backfill design

The ADR 0009 consistency classifier is the evidence inventory and starting
point, not an automatic repair engine. Its existing dry-run proposals remain
non-authoritative. The later backfill adds a separate, versioned decision policy
with these categories.

### Safe automatic backfill

An active episode may be created automatically only when all of the following
are true:

- User and Course references are valid and exist;
- the User is a Student with explicit current security defaults, `active` and
  `approved` true, and `deletionPending` false;
- exactly one immutable Purchase/course line is selected;
- the financial status is `fulfilled`, `refund_requested`, or
  learner-origin `refund_pending`;
- provider evidence or another approved historical financial source has been
  independently verified;
- the current Course runtime mirror and Student `User.courses` mirror are each
  present exactly once, so backfill preserves both protected access and current
  dashboard visibility;
- there is no `paid`, unknown status/origin, malformed relationship, duplicate
  immutable line, second qualifying Purchase, or ambiguous refund evidence;
  and
- the deterministic Purchase/course natural key and migration evidence hash
  match the manifest.

A terminal episode may be reconstructed automatically only from equally strong
evidence, for example a `refunded` Purchase with a processed provider state and
the persisted entitlement-cleanup marker, no alternate qualifying Purchase,
no residual Course or Student User mirror or CourseProgress, and a verified
historical grant. It becomes `revoked` when it was previously active or
`cancelled` for a payment-review-origin refund that never activated. Any
terminal financial state with residual learner state is blocking manual
review; backfill does not silently repair current authorization or dashboard
behavior.

Historical event dates must come from these exact Purchase fields, never
migration wall clock time:

- active or formerly active episode: `grantedAt = Purchase.fulfilledAt`;
- learner-origin processed refund:
  `revokedAt = Purchase.refundEntitlementsRevokedAt`;
- payment-review-origin processed refund:
  `cancelledAt = Purchase.refundProcessedAt`.

A processed-refund record must also satisfy
`refundProcessedAt <= refundEntitlementsRevokedAt <= refundedAt`; an active
record must have a valid `fulfilledAt`, and every terminal timestamp must be at
or after the selected `grantedAt` when one exists. No provider timestamp or
`refundedAt` fallback is automatic. A missing, invalid, inverted, or
contradictory field makes the pair manual rather than manufacturing history.

### Manual review

The following never become active automatically:

- a qualifying Purchase with either learner mirror missing, because cutover
  would change protected access or dashboard behavior;
- partial/missing evidence without independent provider verification;
- two or more qualifying Purchases for one pair;
- `paid` or `payment_review` financial work;
- unknown `refund_pending` origin or unknown Purchase status;
- mirror-only or progress-only history;
- an inactive, unapproved, deletion-pending, or security-default-incomplete
  User;
- a missing User or Course;
- a Course active reference outside immutable Purchase history; or
- duplicate/malformed financial or mirror references.

Operators may approve a record only through a later privileged, reason-coded,
reviewed process. Review does not mutate Purchase history or silently repair
mirrors.

### Ignore/no active episode

Coherent `created`, `order_created`, `failed`, and `expired` Purchases do not
represent access. A clean processed refund, a payment-review-origin refund with
no historical activation, a non-Student Instructor ownership entry, and
completed-deletion-compatible ineligible history do not create an active
Entitlement. Progress alone is never promoted to access.

### Invalid or corrupt evidence

Malformed identifiers, unknown statuses, duplicate immutable line items,
missing security defaults, active Courses outside immutable Purchase history,
and impossible state combinations are quarantined in a bounded privileged
report. Query or validation failure blocks the batch; it is never converted to
zero findings.

### Idempotency and reversibility

The backfill must:

1. run in read-only dry-run mode first;
2. require an exact database name, explicit confirmation, read/write role
   separation, and production `autoIndex: false`;
3. process stable `_id` checkpoints in bounded batches;
4. write a manifest containing policy/schema version, `migrationRunId`, source
   Purchase/course keys, evidence hashes, proposed state, counts, and checksum;
5. use the unique Purchase/course key and compare immutable fields on replay;
6. record before/after counts and a second-run zero-change result; and
7. never update Purchase, Course, User, or CourseProgress.

Because the source collections remain live, a normal second run is not expected
to be byte-static. The zero-change assertion applies only after Stage 2 writers
are active, every checkpoint/delta is caught up, relevant workflows are briefly
quiesced, and a final full audit reports complete coverage.

If the Stage 2 writer already won a Purchase/course key with `source:
"purchase"`, backfill validates it and records the pair as live-covered; it
does not overwrite the source or attach a migration run. Only an existing
`verified_backfill` record from the same manifest is compared as a backfill
replay.

Before dual-write or runtime use, rollback may delete only exact
`source: "verified_backfill"` documents from that run whose revision and
checksum still match the manifest. Once a record has participated in live
transitions, rollback disables Entitlement readers/writers and retains the
audit record; it does not destructively rewrite history.

## Dual-write and recovery design

The later payment implementation should introduce one internal operation,
conceptually `ensureEntitlementsForPurchase`, and call it from browser,
webhook, replay, and Admin reconciliation paths. The natural idempotency key is
the database-enforced `{ purchaseId, courseId }`, not a delivery-specific key.

For each verified Purchase:

1. exact-CAS the Purchase into `paid` using its expected predecessor and
   payment ID;
2. upsert purchase-sourced `provisioning` Entitlements, schedule first recovery
   for one minute after creation, and compare every immutable field; the unique
   current-pair reservation must succeed for every Course before any
   compatibility write;
3. run the existing CourseProgress, Student mirror, and Course mirror writes;
4. exact-CAS Purchase `paid -> fulfilled`;
5. exact-CAS each Entitlement `provisioning -> active` with the expected
   revision and a final eligibility check; and
6. send success email only after all line Entitlements are active.

Creation/activation must prove `Purchase.user === studentId`, exactly one
matching immutable Purchase Course/line item, an existing Course, and an
eligible active/approved non-deleting Student. Activation accepts only
`fulfilled`, `refund_requested`, or learner-origin `refund_pending`; it rejects
`payment_review`, payment-review-origin/unknown refund pending, `refunded`,
unknown financial state, and missing Course. It does not require the Course to
remain Published because archive and Draft demotion preserve existing access.

The existing fulfilled replay path must ensure all Purchase/course
Entitlements rather than return before checking them. A stale-provisioning
reconciler scans deterministically, verifies the Purchase, User, Course, refund,
and legacy facts, and either activates, cancels, or sends the pair to manual
review. It never infers access from a mirror alone.

This sequence chooses fail-closed recovery: on a standalone database, a crash
may leave `fulfilled` financial history with a provisioning Entitlement, so
access is temporarily denied after final cutover until reconciliation. It must
not create active access before durable financial fulfillment. A verified
replica-set transaction may later reduce this window, but correctness cannot
depend on transactions because production topology is not yet known.

No request handler or webhook loops until convergence. Each durable operation
gets one normal attempt and at most one bounded race-recovery reread/retry under
the existing request/database timeout. Exhaustion leaves an inspectable state:

- provisioning conflict/failure before compatibility writes keeps the captured
  Purchase out of `fulfilled` and sends it through the existing
  `payment_review` path;
- compatibility failure retains provisioning and uses the same financial
  review/compensation behavior;
- `paid -> fulfilled` CAS loss rereads the winner and never overwrites another
  financial state; and
- activation failure after `fulfilled` leaves a durable provisioning record in
  a new internal Entitlement reconciliation queue/CLI keyed by status and age.

The queue is a due-work view over persisted `provisioning` Entitlements, not a
second source-of-truth collection. A worker claims one record with an exact
`status/isCurrent/revision` predicate, `manualReviewRequiredAt` absent,
`nextReconciliationAt <= now`, no live lease, `reconciliationAttempts < 5`, and
age below 24 hours. The claim atomically removes the due schedule, writes a
random bounded lease ID and 60-second expiry, increments both
`reconciliationAttempts` and `revision`, and returns the post-image. Every
subsequent update must match that lease ID and returned revision. Work remains
below the lease duration and never renews indefinitely.
The in-request fulfillment budget must remain below the one-minute first-due
delay so the worker cannot race an otherwise healthy handler.

Creation schedules automatic attempt 1 after 1 minute. A failed attempt 1
schedules attempt 2 after 5 minutes; failures 2 and 3 schedule the next attempt
after 30 minutes and 2 hours; failure 4 schedules attempt 5 after 12 hours. A
failed attempt 5 sets `manualReviewRequiredAt` instead of another schedule. The
24-hour age gate uses an exact status/revision/no-live-lease CAS to clear the
schedule, set manual review, and increment revision without consuming another
attempt. Each failure release is an exact lease/revision CAS that clears the
lease, sets the allowlisted code and next schedule or manual timestamp, and
increments `revision`.

A crashed claim already consumed its attempt. After lease expiry, the recovery
sweeper reads the post-image. If it is still `provisioning`, an exact
lease/revision CAS performs that attempt's failure-release mapping without
executing the attempt again. If activation or a terminal transition already
won, there is no retry work. Advancing the revision on expired-lease release
fences a late worker from committing. A successful eligibility/financial check
activates the record; a processed refund or completed account deletion may make
the corresponding terminal transition. Retry or age exhaustion by itself never
activates, cancels, or deletes an Entitlement.

The privileged internal CLI lists aggregate age/counts by allowlisted code and
requires an exact Entitlement ID, expected revision, explicit action, bounded
operator reason, and the durable Admin operation audit below for a manual retry.
Its one manual
attempt claims the exact persisted `manualReviewRequiredAt` and revision,
writes the same 60-second lease, increments only `revision`, and on failure
clears the lease while retaining the original manual timestamp and automatic
attempt count. It uses the same eligibility and transition policy. It cannot
invent a grant, bypass Purchase evidence, or mark a record terminal merely to
empty the queue. Oldest-age alerting pages the operator when any record enters
manual review.

Manual operations require a private durable **EntitlementOperationAudit**
ledger; scalar Purchase reconciliation fields and best-effort logs are not an
adequate history for repeated per-Course retries. This is operational evidence,
not an Enrollment model and never an authorization source. The later
reconciliation implementation must add one retained record per attempt with
this design contract:

```js
{
  schemaVersion: { type: Number, enum: [1], default: 1, required: true, immutable: true },
  operationId: { type: String, required: true, immutable: true, trim: true, maxlength: 100 },
  entitlementId: { type: ObjectId, ref: "Entitlement", required: true, immutable: true },
  actorId: { type: ObjectId, ref: "user", required: true, immutable: true, select: false },
  action: {
    type: String,
    enum: [
      "retry_activation",
      "select_replacement",
      "resume_replacement_transfer",
      "abandon_replacement",
      "resolve_replacement_superseded"
    ],
    required: true,
    immutable: true
  },
  expectedRevision: { type: Number, required: true, immutable: true, min: 0 },
  reason: { type: String, required: true, immutable: true, trim: true, maxlength: 500, select: false },
  status: {
    type: String,
    enum: ["requested", "succeeded", "failed", "conflict"],
    default: "requested",
    required: true
  },
  outcomeCode: {
    type: String,
    enum: ["completed", "retry_failed", "state_conflict", "evidence_invalid", "lease_expired"]
  },
  resultingRevision: { type: Number, min: 0 },
  requestedAt: { type: Date, required: true, immutable: true },
  completedAt: Date
}
```

All request fields are immutable. The only audit transition is an exact
`requested -> succeeded|failed|conflict` CAS that sets the allowlisted outcome,
observed resulting revision, and server completion time once. Requested rows
have no outcome fields; terminal rows require all three. `succeeded` permits
only `completed`, `conflict` permits only `state_conflict`, and `failed` permits
the other failure codes. Terminal rows are never reopened, overwritten, or
deleted by normal operations. The collection uses `strict: "throw"` and no
version key. Its exact indexes are:

```js
operationAuditSchema.index(
  { operationId: 1 },
  { name: "unique_entitlement_operation_id", unique: true }
)
operationAuditSchema.index(
  { entitlementId: 1, status: 1 },
  {
    name: "unique_open_entitlement_operation",
    unique: true,
    partialFilterExpression: { status: "requested" },
  }
)
operationAuditSchema.index(
  { entitlementId: 1, requestedAt: -1 },
  { name: "entitlement_operation_history" }
)
operationAuditSchema.index(
  { actorId: 1, requestedAt: -1 },
  { name: "entitlement_operator_history" }
)
```

An authorized manual command uses a server-generated high-entropy
`operationId` and inserts its `requested` audit row before touching
Entitlement. `retry_activation` is the only manual action that claims the
provisioning reconciliation lease. It sets both that lease and
`lastManualOperationId` to `operationId` and increments revision. Replacement
selection, resume, abandonment, and supersession actions operate on terminal
sources, so they must not write provisioning lease fields; they use
the User payment-operation lease described below, the unique open audit row,
exact source revision, and `lastManualOperationId` as their fences.

The resulting state retains the correlation pointer, clears any applicable
lease, and is followed by one-time audit finalization. A crash before claim is
safe to replay with the same operation ID; a provisioning crash after claim
resumes only that reconciliation lease; a replacement-operation crash
reacquires the User lease and verifies the persisted source post-image. A crash
after the Entitlement transition but before audit finalization is resolved from
the matching `lastManualOperationId` and post-image without repeating the
transition. The partial index blocks a second open manual operation. No manual
command is enabled until this ledger, Admin authorization, exact confirmation,
retention, redaction, and crash-recovery tests exist.

Browser verification performs the normal attempt plus at most one guarded
reread/retry. If any line remains `provisioning`, it returns HTTP 409 with
`{ success: false, message: "Payment was captured and is awaiting support reconciliation" }`;
it never reports enrollment complete. A signed webhook performs the same
bounded ensure, then acknowledges durable pending work with HTTP 200 and
`{ success: true, reconciliationRequired: true, message: "Captured payment held for support reconciliation" }`
so Razorpay is not encouraged to repeat a side effect already recorded. Email
is sent only after every line is `active`. Characterization tests must lock the
surrounding legacy v1 response bytes before implementation; these status and
success semantics are the required future contract.

Two competing grants conflict on the current-pair unique index before mirror
writes and before the losing Purchase can become fulfilled. The losing
captured Purchase enters `payment_review`; already-created sibling provisions
for its bundle remain nonauthorizing for the reconciler rather than being
silently deleted. Multi-Course activation can still be temporarily partial on
a standalone database. Automatic recovery is time- and attempt-bounded, but a
fail-closed denial can continue through manual review and has no promised
availability bound. Strict bundle atomicity would require a separate
topology/product decision.

### Refund dual write

The sequence below is enabled only for an Entitlement-authoritative treatment
cohort or full cutover. Earlier non-authoritative stages use the byte-compatible
sidecar rule above and cannot block or reinterpret the existing refund.

Once the provider result is durably `processed`:

1. acquire the Student's payment-operation lease after the provider call, then
   determine the exact active/provisioning episodes sourced by the refunded
   Purchase; for an exact payment-review-origin line with no episode, create the
   idempotent `cancelled/none/not_required` audit episode defined above;
2. for a formerly active learner-origin source, identify independently verified
   replacement Purchases. Zero produces `replacementDecision: "none"` and
   `replacementOutcome: "not_required"`; exactly one produces
   `selected/pending` plus its immutable Purchase ID; more than one leaves the
   decision absent for audited Admin selection. A no-record
   payment-review-origin line skips replacement selection because access was
   never intended and retains `none/not_required`;
3. CAS active episodes to `revoked` and provisioning episodes to `cancelled`,
   atomically clearing `isCurrent` and persisting any unambiguous decision; an
   already-created cancelled no-record episode is the source gate for its line;
4. synchronously invalidate any future authorization cache;
5. for `selected/pending`, idempotently provision and activate only that
   Purchase, then CAS the source outcome to `activated`; for an invalid selected
   source, stop for audited abandonment rather than substituting another;
6. run the stage-appropriate compatibility projection policy described below;
7. persist the revocation marker only after transfer/cleanup convergence; and
8. finalize Purchase `refunded`.

For a zero/one candidate result, the decision is durable in the same terminal
CAS that frees the current slot. For multiple candidates, access is still
terminalized, but the absent decision is an explicit fail-closed manual state:
no projection cleanup, revocation marker, or Purchase finalization may pass it.
An Admin selection uses a requested operation-audit row and exact source
revision to set the write-once decision once.

On replay, the saga loads the exact source episode by
`{ purchaseId, courseId }`, even when terminal, and uses only its persisted
decision. It never rescans and chooses a different winner. The selected
replacement is idempotently upserted by its own `{ purchaseId, courseId }` and
must pass current financial and Student/Course eligibility again before
activation. If it becomes permanently invalid, an Admin may CAS
`replacementOutcome: "pending" -> "abandoned"` with the exact source revision,
the `abandon_replacement` audit action, and an allowlisted reason. The selected
Purchase ID remains retained; abandonment authorizes cleanup, not a substitute
grant. Missing decision or `pending` outcome always blocks cleanup and final
refund resolution.

If the selected Purchase remains valid but a different legitimate Entitlement
wins the current-pair slot after lease expiry, the operator uses
`resolve_replacement_superseded`. Under a newly acquired Student lease it must
prove the other episode is active, current, eligible, financially supported,
and different from both the refunded source and selected Purchase. One exact
source CAS stores that episode ID and changes `pending -> superseded`; it never
rewrites the selected Purchase. This resolves the old refund while preserving
the independent winner and makes later replay deterministic.

Projection cleanup requires one of these exact committed states:

- `replacementDecision === "none"` and
  `replacementOutcome === "not_required"`; or
- `replacementDecision === "selected"` and
  `replacementOutcome === "abandoned"`.

An `activated` or `superseded` replacement preserves or rebuilds mirrors and
CourseProgress.
Before destructive cleanup, the saga must also re-read under the Student lease
and prove no other current valid Entitlement exists. If a later independent
grant is current, its shared mirrors/progress are preserved even though it was
not the old refund's selected replacement. A mismatching current grant while a
selected transfer is pending is a manual conflict, never a cleanup signal.

Every step is replayable. If Entitlement transition, invalidation, replacement
activation, or compatibility cleanup fails, the Purchase remains
reconciliation-pending and access is never re-granted by per-request fallback.
The saga is exact-CAS driven, may deny until an operator resolves it, and never
briefly permits two current grants. A refund rejection makes no Entitlement
transition.

### Student-operation serialization and cleanup fencing

The future dual writer reuses the existing User
`paymentOperationLockId/paymentOperationLockUntil` lease as the Student-wide
fence for checkout admission, fulfillment, processed-refund cleanup, Entitlement
reconciliation, replacement transfer, and Admin financial resolution. Account
deletion retains its complementary deletion lock. Existing checkout already
uses this lease. Every remaining Entitlement-authoritative writer must adopt
the common helper before the first Stage 5 treatment cohort; a partially
adopted treatment path is not releaseable. Legacy control paths retain their
current behavior until cutover.

Provider network calls occur before this database-only critical section. The
current 30-second lease gets a 20-second hard operation budget and at most
5-second bounded database commands, leaving a safety margin before expiry. A
holder verifies its exact token and deadline before every new mutation, never
renews indefinitely, and performs no further write after budget/lease loss.
Failure leaves the durable refund/provisioning state pending for a later exact
replay. A new grant writer cannot acquire the Student lease during cleanup, and
the current-pair unique index remains the database backstop.

After a crash or lease expiry, the next worker reacquires the Student lease and
re-reads the source, current Entitlement, Purchase, User, Course, mirrors, and
progress before acting. Destructive cleanup is source-aware and convergent: it
never deletes shared pair state when another current grant exists, and it
rebuilds compatibility projections when an active winner exists. Tests must
pause at source terminalization, lease expiry, replacement activation, each
mirror/progress write, and concurrent repurchase; no interleaving may delete a
new grant's state or pass the rollback gate with drift.

Before any Entitlement-to-legacy authority rollback, a security preflight must
prove there is no terminal/provisioning Entitlement whose stale Course mirror
would allow a Student that Entitlement mode denies. Writers are quiesced or
drained, those mirrors are reconciled idempotently, and the check is rerun. If
the gate cannot complete, the affected cohort remains fail-closed/503 rather
than switching to legacy and resurrecting access.

## Shadow read and authorization cutover

### Shared internal authorization boundary

Introduce a future internal service such as:

```text
resolveCourseAccess(principal, courseId, purpose)
```

The principal comes from server-side session authentication, never a request
body. The service first preserves the existing active/approved,
deletion-pending, policy, and role gates. It then applies purpose-specific
rules:

- Student learning, progress, playback, and review require an active
  Entitlement;
- an Instructor-owner override is available only where current behavior permits
  it;
- an Admin override is available only where current behavior permits it; and
- Course and lesson membership are still checked after course access.

The result should be an allow/deny decision with a bounded reason, not a
serialized Entitlement. Existing 401/403/404 behavior and v1 envelopes must be
characterized and preserved.

### Call-site migration order

Migrate and gate each adapter independently:

1. Learning V2 entitled-course lookup;
2. V1 progress mutation;
3. V1 full details and protected playback;
4. review creation;
5. checkout already-owned detection;
6. Student enrolled-course listing, while the existing auth-only endpoint keeps
   its non-Student polymorphic `User.courses` behavior until a separately
   versioned role/API change;
7. Course/catalog/instructor enrollment counts; and
8. Course, Section, and Subsection lifecycle guards.

These adapters may land in separate green pull requests while legacy remains
authoritative and Entitlement is shadow-only. No protected Student consumer
changes authority until every such adapter routes through the shared boundary
and parity gates pass; the later authority-mode flip remains one coordinated
release/configuration unit.

The last two groups consume derived projections rather than making the same
authorization decision, so they should not be hidden inside a generic access
method. The inventory includes `getAllCourses`, `getInstructorCourses`,
`instructorDashboard`, category details, Catalog V2 popularity/counts,
instructor Course sanitization, and Course/Section/Subsection deletion and
cleanup. Login, Google login, and `getUserDetails` serialization of the two User
arrays also remains compatible until an explicit response-version decision. No
download adapter is needed today.

### Shadow behavior

Shadow mode computes legacy and Entitlement Student decisions after the same
security gates, records only a bounded aggregate reason, and returns the legacy
result byte-for-byte. A shadow timeout, validation failure, missing record, or
logger failure cannot affect the request. Compare Instructor-owner/Admin paths
separately so a legitimate override is not mislabeled as an entitlement
mismatch.

Required outcomes are `agree_allow`, `agree_deny`, `legacy_only`,
`entitlement_only`, and `operational_error`, split by endpoint template and
rollout cohort. Pair identifiers appear only in a privileged bounded audit, not
application telemetry.

Before Stage 6, every unexplained `legacy_only` or `entitlement_only` decision
in the migration cohort must be resolved, provisioning age must be within its
approved SLO, dual-write recovery must be healthy, and the forbidden fallback
counter must remain zero for a defined observation window. The window and
latency/error threshold require production evidence and remain an approval
question.

## Account deletion and Course lifecycle

### Account deletion

Preserve the current deletion locks and unresolved-Purchase blockers. After the
User enters deletion-pending state and before final anonymization:

- CAS every active Entitlement to `revoked/account_deleted`;
- CAS every provisioning Entitlement to
  `cancelled/account_deleted_before_activation`;
- verify no authorizing record remains;
- remove progress, reviews, OTP/profile data, and legacy mirrors as today; and
- invalidate sessions and anonymize/deactivate the User.

Any failure leaves deletion pending and therefore fails authentication. Retry
uses exact terminal states and is idempotent. Purchase remains the retained
financial record. Entitlement retains only internal ObjectId provenance linked
to the already-retained anonymized User; it stores no direct identity data. A
later legal retention policy may tombstone that reference, but must not erase
Purchase obligations or recreate access.

A late captured payment for an ineligible/deleting User may enter financial
review but cannot activate an Entitlement. Manual reconciliation rechecks
`deletionPending`, active, approved, and Student status immediately before
activation.

### Course archive and physical deletion

Archiving or Draft demotion does not change Entitlement. Existing learners keep
access, and new checkout remains restricted to Published Courses.

An active or provisioning Entitlement, or any formerly active episode with
financial history, forces archive rather than physical deletion. A
never-published unsold Draft can be physically deleted only when no Entitlement
or protected Purchase history exists. Live Entitlement creation begins only
after verified capture, so cancelled live episodes are retained with their
financial audit and also prevent destructive deletion. The only Entitlement
deletion allowed by this ADR is exact untouched pre-live backfill rollback.
Instructor ownership deletion remains a separate transfer/archive policy and
never revokes Student access by itself.

## API impact

Keep Entitlement internal through model rollout, backfill, dual write, shadow,
and authorization cutover. Existing learning, playback, progress, review,
dashboard, payment, refund, and reconciliation APIs remain the compatibility
surface.

If a dedicated learner resource is later justified, prefer:

```text
GET /api/v2/me/enrollments
```

It must derive the Student from the authenticated session and expose only
course-facing fields and normalized progress needed by the learner. It must not
expose Student IDs, Purchase/provider IDs, source, migration run, internal
revision, Admin identity/notes, raw revocation evidence, learner arrays, or
media provider fields. Financial history remains a Purchase API concern. No
route is authorized by this ADR.

## Security model

| Threat                                 | Required control                                                                                                                                                                                                                                  |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Student submits a Course or Student ID | No public Entitlement writer; derive Student from the authenticated principal and Course from a verified Purchase.                                                                                                                                |
| Replayed webhook or verification       | Validate existing Razorpay evidence; unique Purchase/course key and exact CAS make replay idempotent.                                                                                                                                             |
| Duplicate Purchase                     | Keep Purchase reservation/idempotency indexes; current-pair unique index prevents a second open or active grant.                                                                                                                                  |
| Refund races activation                | Provisioning is nonauthorizing; exact transition CAS lets activation or cancellation/revocation win, then reconciliation converges.                                                                                                               |
| Revoked access survives in a mirror    | Revoked/provisioning/cancelled records never use legacy fallback; final authority ignores mirrors.                                                                                                                                                |
| Revoked access survives in cache       | Do not cache initially; any later design must bound and measure the unavoidable stale-read window or verify authoritative revision per request.                                                                                                   |
| Account deletion races fulfillment     | Existing User lock plus immediate eligibility recheck; deletion revokes/cancels before finalization and auth fails while pending.                                                                                                                 |
| IDOR                                   | Principal-derived Student, exact Course lookup, purpose-specific authorization, and unchanged lesson membership checks.                                                                                                                           |
| Instructor/Admin privilege escalation  | Read role from current User; preserve explicit owner/Admin overrides only on approved endpoints.                                                                                                                                                  |
| Arbitrary Admin entitlement adjustment | Excluded from the initial model. Existing captured-payment reconciliation remains supported through Purchase. A future grant/revoke workflow needs `isAdmin`, exact confirmation, bounded reason, actor audit, CAS, and preferably dual approval. |
| Malformed legacy data                  | Fail validation, quarantine for privileged review, and never infer an active grant.                                                                                                                                                               |
| Mongo/Redis/contract error             | Fail closed or 503; never silently switch an individual request to the other authority.                                                                                                                                                           |

Protected playback continues to recheck Course and lesson membership and issue a
fresh signed URL. Revocation prevents new URLs; an already issued URL remains
valid until its current provider TTL. The acceptable residual window must be an
explicit release SLO before cutover.

## Concurrency requirements

- **Webhook versus browser verification:** both use the same Purchase/course
  natural key and exact Purchase/Entitlement CAS. The loser verifies the winner
  instead of repeating side effects.
- **Two webhook deliveries:** same behavior; emails and transition telemetry
  occur only for winning transitions.
- **Manual reconciliation versus webhook:** the Purchase reconciliation lock
  and exact Purchase status/payment/lock predicates, together with Entitlement
  revision filters, serialize financial resolution; both paths converge on the
  same Entitlements. The current Purchase model has no application-managed
  revision token, so this design does not claim one.
- **Refund versus playback/progress:** the authorization check and downstream
  action cannot be one cross-service transaction. Once revocation wins, no new
  request is authorized; an in-flight request or signed URL has the documented
  bounded residual window.
- **Refund versus activation:** `provisioning -> cancelled` and
  `active -> revoked` filters prevent a delayed activation from overwriting a
  terminal state.
- **Account deletion versus payment completion:** keep the User lock, recheck
  eligibility before activation, and make deletion prove no active or
  provisioning episode remains before anonymization.
- **Two different qualifying grants:** the current-pair partial index permits
  one open episode. The conflict is a manual financial case, not
  last-write-wins.

Distributed locks are not justified. Unique indexes, current User/Purchase
locks, exact predecessor-state CAS, revision checks, deterministic idempotency,
and a durable reconciler are sufficient for the current topology. Transactions
may optimize a verified replica-set deployment later but are not a correctness
precondition.

## Cache implications

Do not cache positive Entitlement decisions during migration or initial
cutover. MongoDB remains the source, and the authorization query is supported
by the current-pair index plus the active-status predicate.

If production evidence later justifies Redis caching:

- use a pair-scoped, versioned key with no PII in logs;
- cap positive TTL at 30 seconds and at or below the approved revocation SLO;
- request synchronous invalidation on revoke/cancel/account deletion before
  reporting access cleanup complete;
- never use stale-if-error for an allow;
- on Redis failure, query MongoDB;
- on MongoDB failure, deny/503; and
- retain a server-side kill switch.

Even synchronous invalidation cannot claw back a value already read by another
request or guarantee delivery across a partition. A future positive cache must
therefore admit and measure a stale-allow window no greater than the approved
TTL/revocation SLO, or perform an authoritative revision check per request.
Invalidation failure disables/bypasses the cache and keeps the revocation saga
pending; it does not pretend stale access is impossible. Negative-only caching
is safer but must also be invalidated on activation. Any cache implementation
needs its own failure-injection and revocation-latency review.

## Migration observability

Use bounded, low-cardinality metrics and structured events:

- `entitlement_backfill_pairs_total{classification,outcome}`;
- `entitlement_dual_write_total{flow,outcome}`;
- `entitlement_provisioning_stale_total` and oldest age;
- `entitlement_reconciliation_attempt_total{flow,outcome}` and manual-review
  oldest age;
- `entitlement_manual_operation_open_total` and oldest requested age;
- `entitlement_shadow_read_total{endpoint,result}`;
- `entitlement_authorization_fallback_total{endpoint}`, which must remain zero
  because per-request fallback is forbidden;
- `entitlement_authorization_duration`;
- `entitlement_revocation_total{reason,outcome}`;
- `entitlement_revoked_access_attempt_total{endpoint}`;
- active Entitlement versus Course/User mirror mismatch counts;
- fulfilled Purchase without active/provisioning Entitlement;
- active Entitlement without valid financial provenance;
- duplicate-current index conflicts;
- terminal/provisioning Entitlement versus legacy-allow rollback blockers; and
- backfill high-watermark lag and uncovered-pair counts.

Normal application telemetry may include request ID, bounded flow, state,
reason, outcome, duration, and aggregate counts. It must not include email,
name, Student/Course ID, provider payload/ID, cookie, JWT, signed URL, progress
details, refund note, or migration sample. Internal pair/Purchase/Entitlement
identifiers belong only in access-controlled, bounded operational reports with
retention and redaction rules. A lost telemetry event never changes a durable
transition.

`EntitlementOperationAudit` is the deliberate durable-audit exception: it
stores internal actor/Entitlement references and the bounded operator reason,
is excluded from normal serialization/logging, requires privileged access and
at-rest protection, and initially follows the retained Purchase audit policy.
It stores no email, name, provider payload, Course media, or learner progress.

## Rollback principles

Every stage before mirror removal is additive and preserves
`Course.studentsEnroled`:

- stop admission to the affected cohort and drain/quiesce fulfillment, refund,
  deletion, and reconciliation writers;
- run the rollback security preflight and require zero
  Entitlement-deny/legacy-allow pairs, including terminal or provisioning
  episodes with a Course mirror;
- reconcile projection mismatches and rerun the gate before setting the
  server-owned mode to legacy-only or deploying the prior immutable
  application;
- stop backfill/dual-write/shadow workers without changing Purchase;
- retain Entitlement documents for audit or remove only an exact untouched
  backfill run before live use;
- reconcile legacy mirrors from existing workflows if a dual write stopped;
- never reset shared Git history, drop indexes/collections, or restore a
  database merely to disable the new authority; and
- use database restore only for an independent data incident.

If the rollback preflight or reconciliation cannot run, affected treatment
traffic remains denied/503. Availability pressure never authorizes a known
revoked, cancelled, or incomplete pair through a stale mirror. Account-deletion
tests additionally prove that `deletionPending` keeps the existing auth layer
closed through every partial cleanup.

After Stage 6, rollback changes every protected call site as one release/config
unit; reverting only playback or progress would recreate split authority. Stage
7 continues mirrors specifically so this remains possible. Stage 8 is outside
this ADR and cannot begin without a separate destructive-migration and restore
rehearsal.

## Production-shaped rehearsal

There is no real production customer dataset available. Do not claim a
production snapshot or use production credentials.

Build a deterministic disposable MongoDB 8 dataset, with Redis only when a
later cache experiment requires it, containing:

- multiple Students, Instructors, Courses, and multi-Course Purchases;
- healthy browser and webhook fulfillment plus duplicate deliveries;
- two concurrent Purchases attempting to provision the same Student/Course;
- process-stop fixtures after each dual-write boundary;
- User-only, Course-only, both-mirror, and no-mirror relationships;
- duplicate mirror and immutable Purchase references;
- all Purchase states and both known `refund_pending` origins;
- processed payment-review-origin refund with no Entitlement episode;
- `paid`, unknown status/origin, and malformed raw legacy records;
- progress-only and missing/duplicate-progress evidence;
- multiple qualifying Purchases and repurchase after refund;
- terminal Entitlement plus a stale Course mirror, and an alternate-Purchase
  source transfer with selection, abandonment, supersession,
  Student-lease expiry, and concurrent repurchase;
- inactive, unapproved, deletion-pending, and deletion-compatible Users;
- Published, Draft, Archived, and missing Course references; and
- Instructor `User.courses` ownership that must never become Student access.

Run a small correctness fixture and adjustable larger synthetic profiles; call
them smoke/load evidence, not production scale. Verify index creation and
execution plans, dry-run zero writes, stable checkpoints, two-run idempotency,
manifest checksums, before/after collection hashes, memory/duration, every saga
restart, shadow classification, cohort cutover, and configuration rollback.
Raw malformed fixtures must bypass Mongoose validation only inside a guarded
disposable database. Razorpay calls use a deterministic fake adapter.

## Test and migration plan

Later implementation must add, in dependency order:

1. **Pure policy tests:** every legal/illegal transition, conditional field,
   terminal-state, replacement-decision, lease/schedule, revision, and reason
   rule.
2. **Model tests:** required/immutable fields, strict mode, timestamps, and
   serialization redaction, plus the one-way private operation-audit state
   machine and open-operation uniqueness.
3. **Real MongoDB index tests:** Purchase/course idempotency, current-pair
   partial uniqueness, historical episodes, due/expired-lease provisioning
   scans, and index plans.
4. **Payment idempotency tests:** browser/webhook races, duplicate deliveries,
   post-refund duplicate payment webhook, already-fulfilled recovery, source
   stability after auto-failure then Admin reconciliation, concurrent
   provisioning conflict, multi-Course bundles, and byte-identical Stage 2-4
   control behavior when legacy `refund_pending` evidence retains mirrors.
5. **Dual-write failure tests:** inject failure after every Purchase,
   Entitlement, progress, User, Course, activation, revocation, invalidation,
   marker, and email boundary; prove bounded handler exhaustion, durable queue
   ownership, exact lease takeover, the five-delay retry schedule, 24-hour and
   attempt-limit manual handoff, crashed-claim attempt consumption and late
   worker fencing, manual retry failure, browser/webhook pending response
   contracts, requested-audit insertion, crash before/after the Entitlement
   transition, one-time audit finalization, and successful convergence.
6. **Backfill tests:** every classifier category, provider-evidence adapter,
   confirmation, checkpoint, checksum, cap, malformed record, rerun, and exact
   untouched-batch rollback, including high-watermark/delta races with
   fulfillment/refund/deletion, historical timestamp derivation, and terminal
   financial evidence with a residual Course mirror.
7. **Authorization parity tests:** all listed call sites, exact v1/v2 status and
   envelopes, Instructor owner/Admin overrides, archived Courses, missing
   Courses, and cross-Course lessons.
8. **Refund tests:** request/rejection/pending access, both origins, processed
   revocation, deterministic alternate-Purchase transfer and fail-closed gap,
   no-record payment-review cancellation, zero/one/multiple replacement
   decisions, crash after source termination, replay from the persisted
   selection, audited abandonment/supersession, exact cleanup gates, User-lease
   expiry, concurrent repurchase at every cleanup boundary, replacement
   invalidation, retries, and signed-URL window.
9. **Account tests:** deletion/payment interleavings, revoke/cancel retry,
   anonymization, session invalidation, and retained financial history.
10. **Course lifecycle tests:** archive retention, Draft physical-delete gates,
    counts/projections, and Instructor ownership safety.
11. **Cache tests, if enabled:** Redis loss, invalidation failure, stale positive
    denial, version changes, and kill switch.
12. **Playwright journey:** purchase -> dashboard -> learning -> playback ->
    progress -> review -> refund request/pending access -> processed-refund
    denial, plus archive and account-deletion outcomes.
13. **Rollback tests:** legacy-only, shadow, control/treatment cohort,
    Entitlement-only, terminal/provisioning-versus-stale-mirror rejection, every
    dual-write failpoint, and full gated configuration rollback while new
    documents remain.
14. **Production-shaped migration rehearsal:** guarded MongoDB 8, raw corrupt
    evidence, query plans, cardinality profiles, hashes, and zero production
    credentials.

Existing authentication, payment-security, playback, Learning V2, account
deletion, Course lifecycle, Mongoose, enrollment-consistency, production
preflight, and live learner tests remain mandatory regression gates.

## Rejected alternatives

- **Keep `Course.studentsEnroled` canonical:** it has no source/revocation
  provenance, no uniqueness guarantee, and already diverges.
- **Use `User.courses`:** it is a dashboard mirror overloaded with Instructor
  ownership and does not protect learning.
- **Use `Purchase.activeCourses`:** unpaid reservations contain it,
  payment-review/manual fulfillment clears it, and account deletion leaves it.
- **Authorize from Purchase status:** this couples every protected read to
  financial bundles/refund workflow and still mishandles origin/deletion.
- **Create both Enrollment and Entitlement:** no distinct product lifecycle
  justifies two authorities today.
- **Merge Entitlement and CourseProgress:** progress must never grant access and
  has different refund/repurchase semantics.
- **Use one mutable unique pair with an embedded history array:** repurchases
  grow the record and weaken immutable per-Purchase provenance.
- **Evaluate a full event ledger on every request:** unnecessary complexity for
  the current small state machine; persisted episode state plus financial audit
  is sufficient.
- **Immediate destructive cutover:** provides no parity evidence or rollback.
- **OR legacy and Entitlement decisions:** stale mirrors bypass revocation.
- **Require transactions or distributed locks:** incompatible with the
  repository's supported/tested standalone topology and unsafe to assume for
  the unknown production topology; correctness uses CAS, indexes, and
  reconciliation.
- **Cache positive access during cutover:** adds a stale-grant path before
  authority is proven.

## Open questions requiring approval or production evidence

1. What provider/export evidence is sufficient to mark a historical Purchase
   as verified for automatic backfill?
2. Which audited Admin policy may select one of multiple independently
   qualifying legacy Purchases? Until approved, the refunded source may become
   terminal to deny processed-refund access, but its decision remains absent
   and projection cleanup/finalization stops. Once selected,
   `replacementDecision` makes replay deterministic.
3. Is a complimentary/manual course grant a real product requirement, and if
   so, what approval and audit controls are required?
4. What observation window and exact mismatch/error thresholds authorize each
   cohort and full cutover?
5. What production MongoDB version, topology, and cardinality must the later
   design support? Transactions cannot be assumed.
6. Is strict all-Course bundle activation required, or is fail-closed partial
   activation with the specified automatic-retry/manual-handoff policy
   acceptable?
7. What maximum post-revocation signed-media window is acceptable, and should
   `MEDIA_URL_TTL_SECONDS` be reduced before cutover?
8. What retention period and pseudonymization policy apply to revoked/cancelled
   Entitlements and their private operation-audit rows when linked to an
   anonymized User?
9. Must an externally initiated Razorpay refund webhook/poller be added before
   cutover?
10. Does StudyNotion need a legal-takedown/suspension state distinct from Course
    archive and account deletion?
11. Should a future Admin adjustment require four-eyes approval?

## Exact next implementation slice after approval

The smallest safe next pull request is model-only:

1. add the `Entitlement` Mongoose schema and pure transition policy exactly as
   approved;
2. add the inert private `EntitlementOperationAudit` schema and its one-way
   request/finalization policy, without adding a CLI or runtime writer;
3. add both sets of proposed indexes through the existing controlled index
   registry;
4. add unit and guarded real MongoDB 8 validation/index/concurrency tests;
5. add serialization, privacy, and audit-redaction tests; and
6. stop for review.

That pull request must not add a payment writer, backfill executor,
authorization reader, public API, cache, mirror mutation, CourseProgress
reference, data migration, or CourseVersion.

## Consequences

The design adds a future access authority with explicit provenance and terminal
revocation while retaining safe rollback to the current Course mirror. It also
adds operational complexity: provisioning reconciliation, staged parity, and
multiple temporary projections are necessary to migrate without weakening
security or depending on an unverified transaction topology.

This ADR is ready for implementation review, not implementation approval.

Explicit scope confirmation:

- Runtime authorization changed? **NO**
- Database schema changed? **NO**
- Enrollment data mutated? **NO**
- Entitlement model implemented? **NO**
- CourseVersion implemented? **NO**
- Ready for implementation review? **YES**
