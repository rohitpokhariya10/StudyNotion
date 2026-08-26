# Entitlement Stage 2 recovery runbook

This runbook operates the non-authoritative Entitlement sidecar introduced by
ADR 0010. During Stage 2, `Course.studentsEnroled`, Student `User.courses`, the
existing `Purchase` lifecycle, and `CourseProgress` remain the product behavior
and authorization path. Entitlement failures must not change payment, refund,
email, learning, playback, dashboard, or account-deletion responses.

The runner can reserve or reconcile only Purchase-backed lifecycle events whose
`Purchase.createdAt` and `Purchase.paidAt` are both at or after one immutable
deployment boundary. It is not a historical backfill and it does not repair
legacy mirrors.

Run every command from the repository root. The implementation and tests live
under `apps/api/domains/entitlement`, `apps/api/scripts`, and `apps/api/test`;
the backend workspace commands remain the stable operator interface after the
repository move.

## Deployment boundary

Set `ENTITLEMENT_SIDECAR_STARTED_AT` once, before deploying Stage 2, to the exact
UTC deployment instant including milliseconds, for example:

```text
2026-08-12T08:30:00.000Z
```

Use the same value on every API replica, recovery invocation, preflight run,
and rollback audit. Production configuration rejects a missing, malformed,
non-canonical, or materially future value. The database does not add a second
boundary metadata model in Stage 2, so deployment configuration is the durable
anchor: pin the reviewed value and alert on configuration drift. Never move the
boundary in either direction after rollout. Historical Entitlement creation
remains a separately reviewed backfill stage.

A checkout created before this instant remains legacy-only even if capture sets
`paidAt` after the boundary. Before deploying the Stage 2 writers, stop creating
new checkouts and either drain every in-flight pre-boundary checkout or wait for
it to expire. Do not move the boundary to make those Purchases eligible.

## Recovery model

Automatic recovery is persisted on `provisioning` Entitlements. It uses the
existing MongoDB uniqueness constraints, exact status/revision CAS, a 60-second
lease, and these deterministic timings:

| Event                             | Persisted time                      |
| --------------------------------- | ----------------------------------- |
| Initial provisioning              | due after 1 minute                  |
| Failure after attempt 1           | retry after 5 minutes               |
| Failure after attempt 2           | retry after 30 minutes              |
| Failure after attempt 3           | retry after 2 hours                 |
| Failure after attempt 4           | retry after 12 hours                |
| Failure after attempt 5           | manual review; no automatic retry   |
| Provisioning age reaches 24 hours | manual review; attempt not consumed |
| Worker claim                      | 60-second non-renewable lease       |

The claim atomically consumes an attempt and increments the Entitlement
revision. Scheduling samples MongoDB server time and the decisive claim,
age-handoff, live-lease, and expired-lease CAS predicates use MongoDB `$$NOW`.
Finalization requires the exact live lease, identity, status, revision, source,
and deployment boundary. An expired-lease sweeper releases
the claim without repeating its work; a stale worker cannot commit afterward.

Every one-shot mutation batch also has one 45-second deadline, below the
60-second lease, shared by catch-up and recovery work. The process is
deliberately scheduler-neutral. It does not run a
daemon, create in-memory timers, or acquire a Redis lock. A production cron or
job runner must invoke it more frequently than the one-minute first due time,
must prevent overlapping invocations as an efficiency measure, and must still
rely on MongoDB CAS/leases—not scheduler exclusivity—for correctness.

The live fulfillment path creates one shared five-second sidecar deadline before
reservation and carries the remaining time through activation. Legacy
fulfillment work between those phases does not reset the budget. Deadline or
sidecar failures remain non-gating and idempotently recoverable; they do not
change the legacy Purchase, enrollment, email, HTTP, or response outcome.

## Commands

Show help without connecting:

```bash
npm --workspace studynotion-backend run entitlement:recover -- --help
```

Read aggregate operational status without writing:

```bash
npm --workspace studynotion-backend run entitlement:recover -- --status-only
```

Process a bounded batch (default 25, maximum 100):

```bash
npm --workspace studynotion-backend run entitlement:recover -- --limit 25
```

Every mutating recovery invocation additionally requires:

```text
ENTITLEMENT_RECOVERY_CONFIRM=reconcile-entitlements
```

`MONGODB_URI` and the immutable sidecar boundary are always required for a
connected run. The runner disables automatic index creation and bounds server
selection, connection, socket, and operation time below the recovery lease.

Catch-up reads a bounded raw Purchase page in ascending `_id` order and applies
the requested limit before Entitlement lookup or unresolved filtering. The
protected continuation is the last raw Purchase `_id` examined, so even a page
of already-converged or permanently failing rows advances the scan. When more
raw rows remain, the mutation report exits with a warning and returns the
cursor. Resume with:

```bash
npm --workspace studynotion-backend run entitlement:recover -- \
  --limit 25 --continuation '<cursor-from-the-protected-prior-report>'
```

The cursor is an internal Purchase identifier. It is accepted only in canonical
lowercase 24-hex form, narrows the still-mandatory deployment boundary, and
appears only in the access-controlled interactive mutation report. It must
never be copied into application logs, monitoring dimensions, tickets, or
public output. After reaching the end of a continued sweep, run once without a
continuation to wrap around and retry earlier unresolved work.

Production scheduling uses the file-backed adapter instead of exposing the
cursor to the scheduler:

```bash
npm --workspace studynotion-backend run entitlement:recover:scheduled
```

It requires `ENTITLEMENT_RECOVERY_CHECKPOINT_FILE` under a persistent private
0700 directory and maintains an exact 0600 versioned checkpoint by same-directory
atomic replacement. Its allowlisted aggregate output never includes the cursor
or path. At the end of the scan it retains an empty checkpoint, so the next
one-shot invocation wraps safely. `compose.operations.yml` supplies the hardened
container adapter; schedule it once per minute with maximum concurrency one and
a 90-second outer deadline. The full command and host preparation are in
`deployment.md`.

## Exit codes

| Code | Meaning                                    | Operator action                                                     |
| ---- | ------------------------------------------ | ------------------------------------------------------------------- |
| `0`  | Batch completed or status healthy          | Preserve the aggregate report and continue scheduled operation.     |
| `1`  | Batch warning or status warning            | Continue a truncated sweep; inspect retry/manual evidence; rerun.   |
| `2`  | Read-only status blocking                  | Stop rollout/cutover; resolve every mismatch or manual-review item. |
| `3`  | Configuration, dependency, or report error | Treat state as unknown; fix the failure and rerun.                  |

Status is fail-closed. Truncated evidence, boundary gaps or lifecycle
mismatches, a completed deletion with a current episode, manual review, an
active episode missing legacy mirrors, or a terminal episode conflicting with
legacy access cannot be reported healthy. The public aggregate
`malformedEpisodes` count also blocks for an invalid persisted Stage 2 shape;
`ageHandoffRequired` blocks when provisioning has reached the 24-hour handoff
threshold without reaching manual review. Due work and expired leases are
warnings. Historical Purchases before the configured boundary are excluded.

## What recovery may do

- Reserve one `provisioning` episode per trusted Purchase/Course natural key.
- Activate a provisioning episode only after re-reading a qualifying Purchase,
  eligible Student, existing Course, and all expected legacy mirrors/progress.
- Use `Purchase.fulfilledAt` as `grantedAt`; worker wall-clock time is not grant
  provenance.
- Cancel a provisioning episode after an exact processed refund or completed
  account-deletion tombstone.
- Revoke an active episode for the exact source Purchase after those terminal
  events.
- Create a direct cancelled audit episode only for an exact post-boundary,
  payment-review-origin processed refund that never intended access.
- Record bounded attempts, schedules, leases, result codes, and manual-review
  time on the Entitlement.

It does not alter Purchase status, User/Course mirrors, CourseProgress, refund
provider state, or account data. It does not choose or transfer replacement
Purchases, backfill history, authorize access, or invoke a provider.

Automatic recovery does not create `EntitlementOperationAudit` records. That
private model requires a real Admin actor and its actions are reserved for a
future authenticated, confirmed manual workflow. No fake system actor or
mutation API is introduced here.

## Production preflight

The existing read-only production preflight embeds only aggregate Entitlement
recovery counts and truncation flags:

```bash
npm --workspace studynotion-backend run preflight:production
```

Run preflight after status is healthy, before release or rollback, and again
after any operator intervention. Never reinterpret a timeout, malformed report,
or truncation as zero findings. Use read-only database credentials for status
and preflight when possible.

## Telemetry and privacy

Application sidecar and recovery events contain only request correlation,
allowlisted flow/outcome/reason codes, bounded counts, attempts, and duration.
They contain no Student, Course, Purchase, Entitlement, provider, payment,
lease, email, cookie, token, signed-media URL, or payload identifiers. Logging
is best effort and never authoritative; MongoDB state is the evidence.

The recovery mutation report is privileged operational output. Store it with
restricted deployment evidence and do not forward its continuation cursor to
normal telemetry.

## Rollback

1. Quiesce payment/refund/deletion handlers and the recovery scheduler.
2. Run status and production preflight with the original immutable boundary.
3. Require zero Entitlement-deny/legacy-allow conflicts and no unfinished
   sidecar work. Repair legacy mirrors only through a separately approved,
   audited procedure.
4. Deploy or revert to the prior immutable application in reverse commit order.
5. Keep the additive Entitlement history and indexes. Do not delete terminal
   episodes, drop collections, restore a database, reset shared Git history, or
   force-push merely to disable Stage 2 writers.
6. Verify legacy learning, playback, progress, My Courses, payment, refund, and
   account-deletion behavior after rollback.

Stage 2 remains safe to disable only because no product authorization reader
uses Entitlement. A future treatment/cutover rollback has stricter gates in ADR
0010 and must not use this simplified Stage 2 procedure.
