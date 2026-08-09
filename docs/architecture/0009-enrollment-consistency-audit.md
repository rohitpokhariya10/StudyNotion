# ADR 0009: Audit enrollment consistency before redesigning authority

- **Status:** Accepted for the read-only audit; authority redesign deferred
- **Date:** 8 August 2026

## Context

StudyNotion stores the relationship between a learner and a course in several
places, but it has no canonical Enrollment or Entitlement collection. The
copies were introduced for different workflows and can diverge because the
application supports a standalone MongoDB deployment and coordinates
cross-document changes with compare-and-set updates and compensation rather
than multi-document transactions.

This phase audits that divergence. It does not change which record authorizes
an API request, repair production data, redesign payments, or introduce a new
access-grant model.

### Current duplicated state

- `User.courses` is a denormalized Course reference array. For a Student it is
  treated as the enrolled-course list; for an Instructor the same field holds
  courses they created. A non-Student `User.courses`-only pair is ownership
  context, not learner evidence, and is excluded from the audit stream. When
  independent Purchase, Course, or progress evidence brings a non-Student pair
  into the audit, `User.courses` remains contextual and is never proposed for
  mutation.
- `Course.studentsEnroled` is the reverse learner array. The misspelled field
  name is persisted and is part of current storage compatibility.
- `Purchase.courses` is immutable financial history for the checkout. It must
  remain available after a refund, account deletion, or entitlement removal.
- `Purchase.activeCourses` is a mutable lock/projection. It is populated when an
  unpaid checkout is created, survives the normal path to fulfillment, and is
  cleared when a checkout expires, payment is held for review, or a refund is
  finalized.
- `CourseProgress` stores one learner/course completion document, protected by
  the existing unique `{ userId, courseID }` index. `User.courseProgress` is a
  denormalized reverse array of those documents. Learning V2 can lazily create
  progress without adding that reverse reference.
- `CourseProgress.completedVideos` is a stored completion array. Current V2 and
  enrolled-course DTOs intersect it with the extant curriculum; it is neither
  enrollment nor entitlement authority.

`$addToSet` prevents most new duplicate array entries but does not remove
duplicates already stored. The unique CourseProgress pair index prevents two
normal progress documents for one pair once that index exists. The unique
multikey Purchase index prevents overlapping non-empty `activeCourses` keys
across normal Purchase documents, but it does not make the field an access
grant or repair legacy data.

### Current authority matrix

For runtime API rows, the decision source shown below is the enrollment or
workflow predicate reached only after the route's existing authentication,
active/approved/deletion-state, policy, and role/ownership gates have passed.
`Course.studentsEnroled` is therefore the current Student enrollment predicate,
not a substitute for those independent security gates.

| Consumer or operation                                               | Current decision source                                                                          | Consequence of drift                                                                                 |
| ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------- |
| `GET /api/v2/learning/courses/:courseId`                            | After the existing gates, `Course.studentsEnroled`                                               | A Course-side mirror satisfies the Student enrollment check even when Purchase and User disagree.    |
| `PUT /api/v2/learning/courses/:courseId/lessons/:lessonId/progress` | After the existing gates, `Course.studentsEnroled`, then curriculum membership                   | The same mirror can satisfy the enrollment check for a progress write; progress never authorizes.    |
| V1 `updateCourseProgress`                                           | After the existing gates, `Course.studentsEnroled`                                               | It retains the same enrollment allow/deny boundary and legacy response envelope.                     |
| V1 full-course details and protected lesson playback                | After existing gates, `Course.studentsEnroled` for Students; Instructor/Admin overrides          | A stale Course mirror can pass the Student enrollment check for curriculum or signed playback.       |
| Rating creation                                                     | `Course.studentsEnroled`                                                                         | A stale Course mirror can authorize a review.                                                        |
| V1 enrolled-course profile list                                     | `User.courses`                                                                                   | A stale User mirror can display a course that protected learning denies.                             |
| Learner Purchase history                                            | Existing account gates, then User-scoped immutable `Purchase.courses` and lifecycle status       | Missing or malformed history affects financial visibility but does not itself add runtime access.    |
| Checkout conflict detection                                         | Course mirror, then Purchase status with `activeCourses` or immutable `courses`                  | A stale Course mirror can block a valid checkout; different Purchase states also reserve the course. |
| Fulfillment                                                         | CourseProgress, User mirror, Course mirror, then Purchase `fulfilled`                            | A crash or failed compensation can leave only some projections written.                              |
| Refund revocation                                                   | Purchase history first, then Course/User/progress cleanup                                        | Access can persist when one cleanup projection remains.                                              |
| Admin payment reconciliation                                        | Admin authorization, locked Purchase/provider evidence, status CAS, then fulfillment/refund work | Purchase state records the financial resolution; projection cleanup or creation can still drift.     |
| Course and curriculum deletion                                      | Course enrollment mirror plus Purchase history and lifecycle markers                             | Financial history protects most sold content even when enrollment mirrors are absent.                |
| Public and instructor enrollment counts                             | Length of `Course.studentsEnroled`                                                               | Missing or duplicate mirrors undercount or overcount learners.                                       |

This matrix describes the implementation being audited. It is not a decision
that any one of these existing fields should become the future authority.

## Divergence behavior being characterized

The audit classifies a normalized learner/course pair and reports the current
behavior without repairing it.

Every API behavior described below assumes that authentication,
active/approved/deletion-state, policy, and role/ownership gates have already
passed. A Course mirror can satisfy only the subsequent Student enrollment
predicate; it does not bypass those independent checks.

### Case A: User mirror only

`User.courses` contains the Course while `Course.studentsEnroled` does not.
Today the enrolled-course profile response includes the Course, while Learning
V2, V1 progress, protected Student playback, and rating creation deny it.
Checkout can proceed unless a Purchase state independently blocks it.

### Case B: Course mirror without an active Purchase course

`Course.studentsEnroled` contains the User while no Purchase has the Course in
`activeCourses`. Today Learning V2, V1 progress, protected Student playback, and
rating creation allow the learner. Checkout rejects the learner as already
enrolled. The profile list still depends separately on `User.courses`.

This case includes both stale enrollment mirrors and verified legacy/manual
fulfillments whose `activeCourses` projection is missing; the audit must report
the surrounding Purchase status rather than guessing which interpretation is
correct.

### Case C: active Purchase projection without enrollment mirrors

A Purchase contains the Course in `activeCourses`, but the User and Course
mirrors are missing. Current learning and playback deny, and the profile list
omits the Course. Checkout is generally blocked by the Purchase and its unique
active-course key. An `activeCourses` value on an unpaid checkout is not an
entitlement, so the Purchase status must always accompany this finding.

### Case D: progress without an active entitlement projection

A CourseProgress document exists while entitlement state is inactive or
absent. Progress alone does not grant access. If a stale Course mirror also
exists, current Student learning and playback still allow because that mirror,
not CourseProgress, is checked. The audit does not delete progress or treat it
as proof of purchase.

### Case E: processed refund with one enrollment mirror remaining

The Purchase is finalized as `refunded` and `activeCourses` is empty, but a User
or Course mirror remains. A remaining Course mirror can still authorize current
learning, playback, progress, and review APIs. A remaining User mirror can still
display the Course. The resolved reconciliation path may return “already
resolved” without repeating cleanup, so drift can persist until an explicit
operational repair is designed.

### Case F: captured payment with a partial enrollment write

Fulfillment creates or reuses CourseProgress, updates the User projection,
updates Course projections, and only then finalizes the Purchase as
`fulfilled`. A recognized enrollment failure moves the captured payment to
`payment_review`, clears `activeCourses`, and runs best-effort compensation.
Compensation uses settled promises and can itself leave a projection. A crash
after enrollment projections but before Purchase finalization can instead leave
a `paid` Purchase with mirrors present. Current mirror-based APIs can grant in
either partial state even though financial reconciliation is incomplete.

## Purchase lifecycle is not an entitlement ledger

The same `activeCourses` field means different things at different stages:

| Purchase status                 | Normal `activeCourses` meaning                                                                                                                       |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `created`, `order_created`      | Unpaid checkout reservation. It must carry its matching active-course lock but must never authorize protected learning.                              |
| `paid`                          | Provider payment has been captured, but fulfillment may not have completed; the audit always requires manual reconciliation.                         |
| `fulfilled`                     | Normally retains the purchased course projection and has enrollment mirrors.                                                                         |
| `payment_review`                | Captured funds require support; `activeCourses` is cleared and learning must not be inferred.                                                        |
| `refund_requested`              | A fulfilled learner normally retains access while the request is reviewed.                                                                           |
| `refund_pending`                | Ambiguous without origin: a fulfilled refund normally retains the projection, while a refund originating from `payment_review` starts with it empty. |
| `refunded`, `failed`, `expired` | The active projection is cleared. Immutable purchase history remains.                                                                                |

`Purchase.activeCourses` cannot be the eventual canonical grant because:

1. unpaid `created` and `order_created` rows contain it;
2. the manual reconciliation path first clears it when holding a payment and
   does not restore it when that payment is later manually fulfilled; and
3. successful account deletion removes enrollment mirrors and deactivates the
   learner but intentionally leaves fulfilled Purchase history, including its
   existing active-course projection.

Combining status with `activeCourses` can make an audit classification safer,
but it does not turn a mutable checkout lock into an immutable access grant.

For audit safety, every `paid` Purchase pair is blocking and suppresses every
candidate write until manual financial reconciliation establishes the outcome.
A `created` or `order_created` Purchase whose immutable Course reference lacks
the matching `activeCourses` reservation is also blocking and suppresses every
candidate write on that pair. An empty or malformed immutable `courses` value,
or an active Course outside that immutable history, is manual-review evidence,
not permission to infer a grant or revocation.

## Intentional account-deletion exception

Student self-deletion is blocked while checkout, payment review, or refund work
is unresolved. A fulfilled Student may delete their account. Successful
deletion removes Course enrollment mirrors, CourseProgress, reviews, and the
User's `courses` and `courseProgress` arrays, then anonymizes and deactivates the
User. It deliberately retains immutable Purchase and provider history.

The normalized evidence has no positive completed-deletion marker, so the audit
cannot prove that an inactive, no-mirror Student is a successfully deleted and
anonymized account. To avoid recreating intentionally revoked access, it
conservatively suppresses expected mirrors, expected progress, and restoration
proposals for any ineligible Student with no enrollment mirrors. Progress, if
present, is reported as residual historical learner state but does not trigger
restoration. Other residual learner state on an ineligible Student is also
reported. This means completed deletion is compatible with a suppressed state,
not a positively detected classification; operators must consult
account-deletion audit history to distinguish it from another ineligible
no-mirror account. Missing security defaults remain a blocking finding. No
report emits the User's email or former identity. A future Entitlement ledger
should record an auditable deletion revocation without erasing the Purchase.

## Lifecycle and crash-window boundaries

- **Fulfillment:** CourseProgress, User, Course, and Purchase are separate
  writes. User ineligibility or a missing Course moves captured funds to review.
  Course-update compensation is best effort, and a process crash can occur
  before compensation or before the final `fulfilled` compare-and-set.
- **Refund:** provider processing, mirror/progress cleanup, the entitlement
  cleanup timestamp, clearing `activeCourses`, and final `refunded` status are
  separate steps. A thrown cleanup is retryable, but silent zero-match drift or
  a crash after an audit marker can require a separate consistency repair. The
  current “other entitlement” lookup uses immutable Purchase courses and status,
  which can preserve mirrors for a `refund_pending` payment-review purchase
  whose `activeCourses` is empty.
- **Account deletion:** cleanup occurs before the final locked User
  deactivation. Thrown cleanup leaves deletion pending for an idempotent retry.
  Purchase history is intentionally outside cleanup.
- **Course archive:** Published, Archived, or ever-published content is
  archive-only. Archiving keeps curriculum, purchases, enrollment projections,
  and progress so existing learners retain current access. Archived courses
  reject further course, section, and lesson edits.
- **Course deletion:** only a never-published, unsold Draft can be physically
  deleted. Paid and refunded Purchase history protects the Course even when
  mirrors are missing. Section, lesson, Course, relation, progress, review,
  failed-purchase, and media cleanup are not one transaction, so an operational
  failure can leave partial deletion work.
- **Course editing:** non-Archived metadata and curriculum can change. Adding an
  empty section to a Published Course demotes it to Draft and records the
  permanent publication marker. Existing entitled learners continue to use the
  current curriculum. Course/category and media replacements use compensation;
  course versioning remains deferred.
- **Curriculum deletion:** physical deletion is limited to never-published
  Draft content with no enrollment or active/paid purchase evidence. Current
  section and lesson guards do not list every refund status, so malformed
  legacy lifecycle markers remain a blocking audit concern rather than a fact
  that this phase repairs.

## Decision for this phase

Add a read-only enrollment consistency domain consisting of an aggregation
repository, classification service, operational CLI, and production-preflight
integration. Do not add an HTTP endpoint.

The repository will aggregate persisted facts by normalized User/Course pair
instead of loading unbounded documents into application memory. The service
will classify coherent pairs, Cases A–F, missing User/Course references,
duplicate projections, multiple Purchase records, invalid account roles, and
ineligible account state. For an ineligible Student with no enrollment mirrors,
it conservatively suppresses restoration rather than claiming to detect
completed deletion. Classification is evidence for operations; it does not
authorize requests.

The operational CLI and preflight will support:

- aggregate counts by classification and severity;
- a bounded sample of pairs that have at least one issue or one Case A–F
  scenario, with a hard cap;
- one dry-run proposal per issue on a sampled pair, such as “manual financial
  review,” “remove stale projection,” or “restore derived projection after
  verified grant”; an issue-free scenario-only sample has no proposal; and
- no `update`, `delete`, `bulkWrite`, migration, or other database write.

Dry-run proposals are not automated repair instructions. A User or Course
mirror, CourseProgress, or immutable Purchase row is insufficient by itself to
prove that a grant should be created. Historical financial cases must be
matched to verified provider or other authoritative records before a later,
separately approved repair. Captured `paid` state and missing
`created`/`order_created` reservation locks block all proposed writes. A
non-Student's `User.courses` references are never proposed for mutation because
they may be legitimate ownership state.

Consistency and preflight events sent through the application logger are
aggregate-only: command outcome, severity, duration, and classification counts.
Those logger events do not contain raw User/Course pair identifiers, email
addresses, names, provider IDs, progress IDs, lesson IDs, cookies, JWTs, signed
playback URLs, or payment metadata.

Payment activation and revocation events contain only the request ID, bounded
source, Purchase ID, and bounded course counts needed to correlate an audited
transition; they omit learner/course identifiers and provider payloads. A
bounded per-pair sample is privileged CLI or preflight JSON output for the
operator who invoked the audit; it is not sent through the application logger
or monitoring pipeline and contains only the identifiers and classification
needed for follow-up.
Payment lifecycle event emission is best effort and non-authoritative: logging
failures are swallowed and an event's presence or absence must not determine
financial or access state. The persisted Purchase lifecycle state and its
successful compare-and-set transition are authoritative for the payment
transition; they still do not replace the current runtime authorization gates.

CLI and preflight exit codes are stable:

- `0`: healthy; no warning or blocking findings;
- `1`: warning findings only;
- `2`: one or more blocking consistency or security findings;
- `3`: operational error, including configuration, connection, aggregation, or
  output failure that prevents a trustworthy audit.

Production preflight must propagate the audit severity. An operational error
must never be reported as healthy. Purchase history without mirrors on an
ineligible Student does not by itself trigger restoration or prove that account
deletion completed.

This phase makes no schema, index, stored-data, public/private API, session,
payment-provider, refund, protected-media, or authorization change. It also
does not claim production latency, production examined-document counts, or
production index use. Single-run disposable-fixture query-plan evidence is
recorded in the separate query-plan audit added alongside this ADR.

## Alternatives

### Option A: retain `Course.studentsEnroled` as canonical

This matches current learning, progress, playback, and review checks and needs
the smallest code change. It cannot distinguish a paid grant from a stale or
manually inserted mirror, disagrees with the User list, and has no immutable
grant/revocation history. It remains the compatibility authority today, but it
is not recommended as the final design.

### Option B: add a dedicated immutable Enrollment/Entitlement ledger

In a future dedicated data-model phase, introduce an additive, auditable
Enrollment/Entitlement collection whose immutable grant and revocation facts
become the canonical access decision. Purchase remains financial history and a
source for verified paid-grant creation, not the access record itself.
`User.courses` and `Course.studentsEnroled` remain derived projections until
their compatibility consumers are migrated.

This is the recommended eventual design. Its exact schema, uniqueness rules,
manual-grant provenance, refund/deletion revocation representation, transaction
or outbox strategy, and migration tooling require a separate ADR and review.
It is **not implemented by this phase**.

### Option C: make `Purchase.activeCourses` canonical

This appears to connect access to payment with no new collection, but it mixes
unpaid checkout locks, fulfilled projections, refund workflow, manual
reconciliation gaps, and the intentional account-deletion state. It would also
make non-purchase/manual grants awkward and would couple every protected-content
read to mutable payment workflow state. Reject this as the eventual authority.

## Staged path to Option B

1. Ship and run the read-only audit. Resolve operational errors, review every
   blocking class, and keep all current API authorities unchanged.
2. Repair only independently verified legacy data through a backup-first,
   separately approved runbook. Harden fulfillment, refund, deletion, and
   lifecycle crash recovery before changing authorization.
3. Define the Entitlement contract and append-only/auditable lifecycle in a new
   ADR. Add its collection and indexes additively; do not remove existing
   fields.
4. Backfill grants only from verified Purchase/provider history or documented
   manual-grant evidence. Record explicit refund and account-deletion
   revocations. Never infer a grant solely from User, Course, or CourseProgress
   mirrors.
5. Shadow-write new entitlement facts while retaining current projection
   writes. Compare the proposed canonical result with existing gates using
   aggregate-only telemetry; do not expose learner identifiers.
6. Run dual-read comparison and production-shaped query-plan verification until
   no unexplained blocking divergence remains. Keep protected playback and
   progress denial fail-closed throughout.
7. Switch authorization consumers behind a reviewed rollout control, then
   derive enrolled-course lists and counts from the canonical ledger. Continue
   maintaining User/Course projections for v1 compatibility until a separate
   deprecation phase.

Each stage is independently reviewable. None is implied or automatically
started by this audit ADR.

## Security and privacy consequences

- The audit is read-only and cannot grant, revoke, enroll, delete, refund, or
  repair a learner.
- No audit HTTP route exists, so there is no new remote enumeration surface.
- Protected media remains independently authorized and signed; the audit never
  loads or emits playback URLs or provider media metadata.
- Aggregate application telemetry avoids stable learner and financial
  identifiers. Per-pair samples are bounded, privileged JSON/terminal output,
  are not application telemetry, and must be handled as sensitive operational
  data.
- A blocking finding includes any state that can make current mirror-based APIs
  grant access without adequately corroborating evidence. The audit itself does
  not silently choose a more permissive authority.
- Missing or inactive Users and missing Courses are not reconstructed. Purchase
  history is retained for support, refunds, accounting, and legal obligations.

## Rollout and rollback

Run the audit against a read-only database credential where operationally
available. Start with the aggregate summary, request bounded samples only for
follow-up, and treat exit code 2 or 3 as a production-preflight block. Review the
separate query-plan evidence before using it on production cardinality. Do not
interpret small fixtures as production performance proof.

Because this phase performs no writes and changes no schema, index, or API,
rollback requires no data restoration or reverse migration. In shared Git
history, review and `git revert` the audit/preflight and documentation commits
in reverse order, then rebuild the prior immutable release. Never reset, rewrite
shared commits, or force-push. A future shadow-write Entitlement rollout must
retain its additive records during an application rollback and route reads back
to the previously reviewed authority; deleting an audit or Entitlement
collection is never part of an emergency source rollback.
