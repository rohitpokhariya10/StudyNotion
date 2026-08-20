# Entitlement Stage 2 sidecar evidence — August 2026

## Scope and decision boundary

This slice implements the non-authoritative writers and durable recovery stage
from [ADR 0010](../architecture/0010-entitlement-migration-design.md). It builds
on the inert Entitlement models and policies without changing any authorization
consumer.

The governing Stage 2 compatibility rule is explicit: sidecar success or
failure does not change the existing Purchase outcome, enrollment mirrors,
CourseProgress behavior, email delivery, HTTP status, or response body. The
future treatment-mode reservation gate, replacement transfer saga, and
Entitlement-backed authorization remain deferred.

Only Purchase lifecycle evidence whose `Purchase.createdAt` **and**
`Purchase.paidAt` are both at or after the immutable
`ENTITLEMENT_SIDECAR_STARTED_AT` boundary can create a missing episode. A
checkout created before the boundary remains legacy-only even if its verified
capture arrives after the boundary. Operators must drain those in-flight
pre-boundary checkouts or let them expire before enabling Stage 2. Runtime
writers and recovery leave every pre-boundary Purchase and episode untouched.
There is no bulk historical writer, migration command, or API.

## Implemented flow

```text
verified captured Purchase
  -> bounded, non-gating provisioning reservation
  -> unchanged legacy progress/User/Course writes
  -> unchanged Purchase fulfilled transition and email
  -> bounded, non-gating activation from fulfilledAt

processed refund
  -> unchanged provider persistence and legacy cleanup
  -> exact source-Purchase active->revoked or provisioning->cancelled
  -> unchanged final Purchase refund transition

account deletion
  -> existing deletion lock and payment recheck
  -> exact current Stage 2 episodes terminalized non-authoritatively
  -> unchanged legacy cleanup/anonymization and response
```

Browser verification, the signed raw-body webhook, and Admin reconciliation
still converge on the existing shared fulfillment function. Identity and course
scope come only from the trusted Purchase. Delivery path is never persisted as
grant provenance: live episodes use `source: purchase`.

Fulfillment creates one shared five-second sidecar deadline before reservation
and carries the remaining budget through activation; legacy work between those
phases does not reset the clock. The non-authoritative wrapper releases the
request at the deadline, aborts in-flight sidecar database work through the
shared signal, and prevents the service from starting another repository
operation after exhaustion. Every repository operation also carries a stable
privacy-safe query comment plus a two-second server and client operation
timeout. Uniqueness, exact CAS, and idempotency retain replay safety. All
sidecar errors are contained by the non-authoritative boundary.

## Recovery and convergence

The one-shot recovery runner uses only MongoDB CAS and the seven Stage 1
Entitlement indexes. MongoDB `hello.localTime` supplies scheduling time, and
decisive query/update predicates use complementary `$$NOW` fences. It claims
due provisioning work with a 60-second lease,
persists attempts, uses the ADR delay schedule, hands work to manual review on
attempt five or at 24 hours, and fences stale workers with lease expiry plus
revision.

Boundary catch-up scans bounded raw Purchase pages in ascending `_id` order
before Entitlement lookup and unresolved filtering. Its privileged continuation
is the last raw Purchase `_id` examined, so converged or permanently failing
rows cannot keep later Purchases out of the scan. Operators continue to the end
and then run once without a continuation to wrap around and retry earlier
unresolved work; Stage 2 adds no checkpoint collection. Status and preflight
expose aggregate gaps, wrong lifecycle states, due work, expired leases, manual
review, legacy conflicts, completed deletions that still have a current episode,
and malformed episodes. Public `malformedEpisodes` and
`ageHandoffRequired` findings are blocking, as is truncation; none can be
reported healthy.

Completed deletion recovery is deliberately narrow: it requires the exact
persisted anonymized tombstone produced by the current profile controller.
Pending and completed deletion use the same retained private
`User.deletionStartedAt` event timestamp; the final tombstone must have a later
or equal `updatedAt`, no deletion lock, and the exact anonymized post-image.
Recovery never infers deletion from inactivity alone.

## Compatibility and security evidence

- Learning V2, protected playback, v1 progress, ratings, My Courses, auth, role,
  policy, and deletion gates contain no Entitlement reader or fallback.
- No route, public contract, frontend state, or DTO exposes Entitlement.
- Existing webhook raw-body mounting, Razorpay signature verification, browser
  auth/role/rate limiting, and Admin authorization are unchanged.
- Refund request, refund rejection, provider pending/failed/ambiguous outcomes,
  and provider invocation are unchanged and perform no terminal sidecar write.
- Processed refunds mutate only the exact source Purchase episode. A newer
  Purchase episode is never selected or terminalized by the stale refund.
- Replacement selection/outcome mutation is deferred; Stage 2 never asserts a
  learner refund has no replacement. The only `none/not_required` state is the
  ADR-approved direct cancellation for a payment-review-origin refund that
  never intended access.
- Automatic recovery writes no private manual operation audit row and invents
  no actor. No Admin mutation endpoint or command exists.
- New structured logs omit all domain/provider/user identifiers and sensitive
  payloads. The privileged continuation cursor is absent from logs, status, and
  preflight.

## Data and rollback impact

The slice adds no field, migration, or repair to `User`, `Course`, `Purchase`, or
`CourseProgress`. The existing private `User.deletionStartedAt` field is retained
on the final deletion tombstone as the canonical terminal-event timestamp;
previously the controller removed it. All other new lifecycle writes target the
already-declared Entitlement collection.
`EntitlementOperationAudit` remains inert outside its model/index tests. There
is no Redis state and no in-memory correctness state.

Rollback is code-only after quiescing writers/runner and passing the documented
legacy/sidecar mismatch gate. Additive Entitlement records and indexes can stay;
terminal history must not be deleted. Stage 3 must first extend terminal writers
to reviewed `verified_backfill` episodes before any historical cohort can be
created or shadow-read.

## Verification record

The final local release matrix ran on Node.js 24.19.0 against MongoDB 8.0.26.
Redis-backed integration cases used Redis 7.4. No production database,
production credential, or real payment-provider call was used.

| Gate                                         | Final result                                                                                                                                                                         |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `npm ci`                                     | PASS                                                                                                                                                                                 |
| `npm run verify`                             | PASS: contracts 14/14; formatting, lint, architecture, typecheck, local build, 198 frontend tests, and 447 backend tests passed; 28 environment-only backend tests skipped; 0 failed |
| `npm run test:integration`                   | PASS: 14/14 across isolated catalog, enrollment, Entitlement Stage 1, Entitlement Stage 2, Learning V2, Mongoose, and production-preflight databases                                 |
| Guarded Stage 2 MongoDB 8 suite              | PASS: 2/2, including the live convergence case                                                                                                                                       |
| Guarded production-preflight MongoDB 8 suite | PASS: 2/2, with command monitoring proving zero writes                                                                                                                               |
| `npm run test:e2e`                           | PASS: 14/14 desktop and mobile cases                                                                                                                                                 |
| Production `npm run build`                   | PASS: 644 modules transformed with structurally valid non-secret public build variables                                                                                              |
| `cd server && npm test`                      | PASS: 447 passed, 28 intentional environment skips, 0 failed (475 total)                                                                                                             |
| Root and backend `npm audit`                 | PASS: 0 vulnerabilities after the lock-only `nanoid` patch                                                                                                                           |
| Root and backend `npm ls --omit=dev --all`   | PASS; Mongoose accelerator packages remained expected optional dependencies                                                                                                          |
| Secret/import/generated-file review          | PASS: no real secret, generated artifact, Entitlement authorization reader, or automatic operation-audit writer found                                                                |
| `git diff --check`                           | PASS                                                                                                                                                                                 |

The live Stage 2 case proved browser verification versus signed webhook
convergence, duplicate webhook and client replay, one Purchase/Course episode,
exact second-read activation evidence, malformed-evidence rejection, persistent
retry/manual-review state, two-worker lease exclusion, expired-lease reclaim,
and stale-worker rejection after a new owner claimed the episode. It also proved
requested/pending refunds retain access, processed refund replay is idempotent,
a stale refund cannot remove a newer repurchase's legacy or sidecar grant, and
completed deletion progresses past healthy and malformed rows without access
resurrection.

The production-shaped boundary explain used the Purchase `_id_` cursor, the
`unique_entitlement_purchase_course` foreign lookup index, and the User `_id_`
lookup without a collection scan and within the fixture's explicit document and
key bounds. Current-pair, due, expired-lease, aged-handoff, operation-ID, and
operation-history shapes were also exercised with their intended indexes.
These disposable-fixture plans prove query/index shape, not production latency,
cardinality, or an unhinted optimizer choice.

The release commits preceding this record are:

- `d063311bff96d4e2905448d7ff8417799b9dda21` — characterize the Stage 2
  lifecycle boundary.
- `e21f22f3ac383f9c1ce15da8c5bb7671b68211c5` — add the non-authoritative
  Stage 2 sidecar.
- `08256f0ff6fe53b9365209b559b5b31ddc22c733` — add bounded durable recovery.
- `e01d9d2e88d42a42a0503781515b6155cf5cfbe3` — harden recovery, concurrency,
  compatibility, preflight, and MongoDB 8 evidence.
- `a5f47cc537b010b8a5aedacdda68ba91fcd3a650` — patch the transitive `nanoid`
  advisory in the lockfile.

Hosted CI was not observed during this local release run. The workflow is wired
to run the isolated Stage 2 MongoDB 8 suite, but its eventual hosted result must
be evaluated separately from this evidence.
