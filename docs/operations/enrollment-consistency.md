# Enrollment consistency audit runbook

This runbook operates the read-only enrollment consistency audit introduced by
ADR 0009. It does not grant, revoke, repair, refund, delete, or migrate data.
There is no HTTP endpoint and no automatic repair mode.

Run every command from the repository root. The implementation and tests live
under `apps/api/domains/enrollment`, `apps/api/scripts`, and `apps/api/test`;
the workspace command is the stable operator interface.

## Before running

- Use Node 24 and the lockfile-installed dependencies.
- Prefer a read-only MongoDB credential.
- Start with an approved point-in-time production snapshot. If a live primary
  must be used, choose a quiesced release window and obtain database capacity
  approval. Fulfillment, refund, and account-deletion transitions legitimately
  pass through intermediate states.
- Set `MONGODB_URI` or `MONGODB_URL` through the normal protected environment.
  Never paste a credentialed URI into a command, ticket, or log.
- Treat bounded pair samples as sensitive operational evidence even though they
  contain no email, name, provider payload, or protected-media data.
- Distinguish the privileged JSON report from application telemetry. Logger
  events contain aggregate counts and outcomes only; sampled pair identifiers
  stay in approved operator output and must not be forwarded to public logs or
  general monitoring fields.

## Commands

Show usage without connecting to MongoDB:

```bash
npm --workspace studynotion-backend run enrollment:audit -- --help
```

Run a summary plus at most 100 classified pair samples. A classified pair has
at least one issue or one Case A–F scenario:

```bash
npm --workspace studynotion-backend run enrollment:audit
```

Request proposed writes without executing any write:

```bash
npm --workspace studynotion-backend run enrollment:audit -- --dry-run --sample-limit 25
```

`--sample-limit` accepts `0` through `100`. A zero value produces counts only.
Dry run emits one proposal per issue on a sampled pair; an issue-free,
scenario-only sample has an empty proposal list. Every proposal has
`safeForAutomaticRepair: false`. Unknown flags, including `--repair`, are
rejected as operational errors.

Run the complete production data gate, which embeds the enrollment summary and
at most five classified pair samples after the existing checks:

```bash
npm --workspace studynotion-backend run preflight:production
```

The preflight hard-caps this evidence at five samples and reports whether the
complete classified set was truncated. Pair IDs are sensitive internal
operational identifiers; keep the output in approved deployment evidence and
do not expose it to frontend users or public logs. Missing or unknown audit
statuses are operational errors (exit code `3`), never healthy results.

## Exit codes

| Code | Meaning           | Operator action                                                                                      |
| ---- | ----------------- | ---------------------------------------------------------------------------------------------------- |
| `0`  | Healthy           | Preserve the report with release evidence.                                                           |
| `1`  | Warning           | Review every warning class and sampled pair, verify intent, then rerun before approving the release. |
| `2`  | Blocking finding  | Stop deployment; investigate every blocking issue with financial/support data.                       |
| `3`  | Operational error | Treat the result as unknown, fix configuration/dependency/query failure, rerun.                      |

Never convert a warning, blocking result, timeout, connection failure, or
malformed report into a healthy result.

## Interpretation boundaries

- After the route's existing authentication, active/approved/deletion-state,
  policy, and role/ownership gates pass, `Course.studentsEnroled` remains the
  current Student enrollment predicate for learning, playback, progress, and
  review. It does not replace or bypass those independent gates.
- Student `User.courses` is the enrolled-course dashboard mirror. The same
  field is also instructor ownership state. A non-Student `User.courses`-only
  pair is excluded as ownership context. If independent Purchase, Course, or
  progress evidence makes the pair auditable, the non-Student references remain
  contextual and are never proposed for mutation.
- `Purchase.courses` and status are financial evidence. `activeCourses` is a
  checkout/lifecycle lock, not entitlement authority.
- Every captured `paid` pair is blocking and requires manual financial
  reconciliation before any dry-run write may be considered, regardless of its
  mirrors or active-course value.
- A `created` or `order_created` Purchase must retain the matching
  `activeCourses` reservation. A missing lock is blocking and suppresses every
  proposed write for that pair. Empty/malformed immutable `courses` history and
  an active Course outside that history also require manual review; do not infer
  enrollment intent from them.
- A `refund_pending` Purchase justifies retained learner mirrors only when its
  persisted `refundOriginStatus` is `refund_requested`. A `payment_review`
  origin is non-entitled; an absent/unknown legacy origin blocks for review.
- CourseProgress is historical learning state and never grants access. A
  missing progress document is a warning because Learning V2 can return zero
  progress and create it on the first authorized completion.
- The audit cannot positively detect completed account deletion from normalized
  pair evidence. It conservatively suppresses restoration for any ineligible
  Student with no enrollment mirrors, which safely includes a successfully
  deleted inactive learner retaining immutable Purchase history. Progress, if
  present, is reported as residual state but does not trigger restoration.
  Confirm deletion through account audit records; do not interpret suppression
  itself as proof that deletion completed.
- `purchase.entitlement_activated` and `purchase.entitlement_revoked` telemetry
  is best effort and non-authoritative. Missing or duplicate log delivery does
  not change state; the persisted Purchase lifecycle fields and successful
  compare-and-set outcome are authoritative for the payment transition, while
  runtime access still uses the existing security and enrollment gates.

## Handling findings

1. Preserve the read-only JSON report and request ID.
2. Verify the pair against immutable Purchase/provider history, account status,
   refunds, and support audit records. Do not infer a grant from one mirror.
3. Re-run against the same snapshot or after a grace period to distinguish a
   transient lifecycle state from durable drift.
4. Design any repair as a separate backup-first change with explicit approval,
   idempotency, review, and its own dry run. This command cannot execute it.
5. Re-run both the enrollment audit and full production preflight after any
   separately approved repair.

The aggregation is one bounded-memory cursor with a 15-second MongoDB deadline,
primary/majority reads, disk-backed sort permission, and a stable query comment.
It intentionally scans the complete relationship sources; small-fixture timing
and explain evidence are not production-cardinality guarantees. Review the
query-plan audit before live use.

## Rollback

The audit performs no database writes and adds no schema or index. Roll back the
application with reviewed `git revert` commits in reverse order and rebuild the
previous immutable release. No database restore or reverse migration is needed.
Never reset shared history or force-push.
