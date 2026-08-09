# Enrollment consistency query-plan audit — August 2026

## Scope and evidence status

This audit describes the report-only enrollment consistency aggregation added
in August 2026. It does not authorize learning access, reconcile data, add an
index, or change the User, Course, Purchase, or CourseProgress schemas.

A guarded full integration-suite run completed against MongoDB 8.0.26 and
emitted the measurements recorded below. This was one execution against a tiny
disposable fixture. It is smoke evidence that the aggregation executes, remains
read-only, and uses the expected lookup indexes in that fixture; it is not a
benchmark, production-cardinality test, capacity result, latency objective, or
production query-plan claim. No value below is extrapolated beyond that single
run.

## Guarded verification fixture

[`server/test/enrollment-consistency.integration.test.js`](../../server/test/enrollment-consistency.integration.test.js)
is disabled unless `STUDYNOTION_RUN_ENROLLMENT_INTEGRATION=1`. It accepts only
a single `mongodb://` local or CI host and a database whose name starts with
`studynotion_enrollment_test_`. It rejects production mode, SRV URIs,
multi-host URIs, remote hosts, and other database names. Setup and teardown
drop only the name that passed that guard.

The designed fixture contains 300 clean decoy learner/course pairs plus named
characterization cases. The live test asserts the following persisted document
cardinalities before it will report a measurement:

| Collection       | Asserted fixture documents | Notes                                                        |
| ---------------- | -------------------------: | ------------------------------------------------------------ |
| User             |                        332 | Disposable fixture documents                                 |
| Course           |                        331 | Includes characterization evidence for a missing Course      |
| Purchase         |                        330 | Includes immutable history and duplicate/multiple evidence   |
| CourseProgress   |                        316 | Includes one raw duplicate pair before the unique pair index |
| Normalized pairs |                        332 | Aggregate report `pairCount`                                 |

These are fixture assertions, not production cardinality measurements. The
test covers:

- consistent mirrors and fulfilled history;
- missing User and Course mirrors, both missing mirrors, and missing User or
  Course documents;
- learner mirrors without a qualifying ledger, missing progress, and progress
  without runtime authority;
- refunded and inactive-account residual learner state;
- duplicate raw `User.courses`, `Course.studentsEnroled`, and CourseProgress
  evidence;
- duplicate raw `Purchase.courses` and `Purchase.activeCourses` evidence;
- malformed User and Course references that must not reach `_id` lookups;
- an empty immutable `Purchase.courses` array preserved as suppressed malformed
  Course evidence for manual review;
- a non-Student `User.courses`-only ownership pair excluded from learner
  evidence, plus a non-Student pair retained when independent evidence exists;
  neither path proposes mutation of non-Student `User.courses`;
- captured `paid` state that blocks all candidate writes for manual
  reconciliation;
- `created` and `order_created` reservations missing their matching
  `activeCourses` lock;
- multiple qualifying purchases;
- a fulfilled manual reconciliation record with no `activeCourses` value;
- terminal-status `activeCourses` residue;
- refund-request-origin `refund_pending` with retained entitlement;
- payment-review-origin `refund_pending` without entitlement, its invalid
  active-course residual, and an unknown refund origin; and
- a deletion-compatible state: an ineligible inactive Student, retained
  fulfilled Purchase history, and no learner mirrors or restoration proposal.
  The audit deliberately suppresses restoration but cannot positively prove
  that account deletion completed.

The duplicate CourseProgress fixture is inserted into a fresh disposable
collection while only MongoDB's `_id_` index exists. This safely characterizes
pre-index legacy corruption without weakening the production unique
`{ userId: 1, courseID: 1 }` index.

## Aggregation architecture

The repository issues one Purchase-rooted aggregate for each audit execution.
It unions four evidence streams:

1. `Purchase.activeCourses`;
2. `User.courses`, counted as source evidence only for Students and retained as
   context for a non-Student pair only when another source independently brings
   that pair into the report;
3. `Course.studentsEnroled`; and
4. CourseProgress user/course pairs.

The initial immutable `Purchase.courses` stream and those four unions are
grouped into one normalized user/course pair stream. Two correlated lookups
then resolve User eligibility and Course existence by `_id`. No per-pair
`find`, populate, or secondary aggregate is issued, so the design has no N+1
query path. The pipeline contains no `$out` or `$merge` stage.

The report's `runtimeAuthorityPresent` value means only that the persisted
`Course.studentsEnroled` mirror contains the pair. A real request reaches that
Student enrollment predicate only after the existing authentication,
active/approved/deletion-state, policy, and role/ownership gates; the audit does
not model those gates as bypassed or replaced.

This is a full-dataset consistency audit. Global scans of the Purchase, User,
Course, and CourseProgress evidence streams are expected; there is no selective
tenant, user, time, or status predicate that could honestly turn the audit into
an indexed point query. The tradeoff is deliberate: a full audit can find
orphan evidence that a Purchase-only or mirror-only query would miss. It must
therefore run as a controlled operational job, not in a request path.

The correlated User and Course lookups target `_id`. MongoDB 8 explain output
normally exposes an `indexesUsed` array on `$lookup` stages. The integration
test requires `_id_` there for both lookups when it runs on MongoDB 8 and emits
their actual `totalDocsExamined`, `totalKeysExamined`, `collectionScans`, and
returned cardinality. No index is inferred for the global union scans, and no
new index is proposed by this phase.

## Recorded single-run smoke measurements

The guarded full integration-suite run on MongoDB 8.0.26 emitted these report
and wall-clock observations:

| Observation            | Single-run value |
| ---------------------- | ---------------: |
| Clean decoy pairs      |              300 |
| Report `pairCount`     |              332 |
| Report `affectedPairs` |               27 |
| `read_only` duration   |            72 ms |
| `dry_run` duration     |            69 ms |
| Explain-call duration  |            43 ms |

The explain record reported these global-stream document examinations:

| Aggregation cursor stream      | Documents examined |
| ------------------------------ | -----------------: |
| Initial `Purchase.courses`     |                330 |
| `Purchase.activeCourses` union |                330 |
| `User.courses` union           |                332 |
| `Course.studentsEnroled` union |                331 |
| CourseProgress pair union      |                316 |

Each of the two Purchase cursors examined zero keys. Key-examination counts for
the other global union cursors are not asserted here because they were not part
of the supplied measurement summary.

The two correlated lookups reported:

| Lookup | Index used | Documents examined | Keys examined | Collection scans |
| ------ | ---------- | -----------------: | ------------: | ---------------: |
| User   | `_id_`     |                330 |           330 |                0 |
| Course | `_id_`     |                329 |           329 |                0 |

These values describe only that disposable fixture and that one execution.
Runtime variation and production data distribution were not measured.

## Bounded operational settings

Every repository execution uses the same bounded settings:

- `maxTimeMS: 15000`;
- `allowDiskUse: true`;
- primary read preference;
- majority read concern;
- cursor batch size 250; and
- command comment `studynotion.enrollment-consistency.v1`.

The service streams results and keeps only aggregate counters plus a sample of
0–100 classified pairs. A pair is sampled when it has at least one issue or one
Case A–F scenario, so an issue-free scenario-only pair can appear. The
integration test runs both `read_only` and `dry_run`, asserts exact issue counts
and truncation with sample limits 5 and 3, and takes canonical Extended JSON
snapshots of User, Course, Purchase, and CourseProgress before and after each
mode. Byte inequality is a test failure. Dry run creates one proposal per issue;
a scenario-only sample has no proposals. Every proposal remains a description
with `safeForAutomaticRepair: false`; there is no repair executor.

Aggregate consistency events written through the application logger contain
counts and outcomes, not pair identifiers. The bounded samples above are
privileged operator report output, not telemetry, and require separate handling
as sensitive operational evidence.

## Reproducing the measurement

Use Node 24 and a disposable MongoDB 8 instance already dedicated to testing:

```sh
STUDYNOTION_RUN_ENROLLMENT_INTEGRATION=1 \
ENROLLMENT_TEST_MONGODB_URI=mongodb://127.0.0.1:27017/studynotion_enrollment_test_local \
node --test server/test/enrollment-consistency.integration.test.js
```

The test prints one JSON line prefixed with
`ENROLLMENT_CONSISTENCY_MEASUREMENTS`. It contains the actual MongoDB version,
fixture collection counts, normalized and affected pair cardinality, service
durations, explain duration, cursor execution statistics, and the two lookup
statistics. Record the complete CI job URL and its commit hash with any numbers
copied into a future measurement update; preserve the raw emitted line rather
than substituting estimates.

## Production interpretation caveat

A production explain or audit is not a transactionally consistent snapshot of
four collections. Majority reads on the primary prevent reading uncommitted
data, but writes can still occur between evidence streams while the aggregate
runs. Before treating a production mismatch count as a repair inventory,
capture the database backup/snapshot identifier and run during a documented
quiescence window or maintenance period. Re-run after the window to distinguish
stable divergence from lifecycle writes that crossed the audit. Never run
`explain("executionStats")` against production merely to fill this document
without a separate operational approval and capacity review.
