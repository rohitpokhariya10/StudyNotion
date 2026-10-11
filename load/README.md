# Project NEET API smoke test

**SMOKE ONLY — not a 1,000-user capacity result.**

`load/neet-smoke.mjs` is a fast, self-contained check that the NEET exam API
keeps its correctness guarantees with a modest number of concurrent students
on one machine. It catches regressions. It is not a capacity measurement.

## Run

Requires Node 24, `npm install` at the repo root and `mongod` on `PATH` (or
`MONGOD_BIN`).

```sh
node load/neet-smoke.mjs                       # 100 students, full mock
node load/neet-smoke.mjs --students 25
node load/neet-smoke.mjs --students 100 --test full-length-neet-style-mock-01 \
  --think-ms 20 --ramp-ms 0 --save-p95-ms 500
```

| Option          | Default                          | Meaning                                                             |
| --------------- | -------------------------------- | ------------------------------------------------------------------- |
| `--students`    | `100`                            | Virtual students, all run concurrently                              |
| `--test`        | `full-length-neet-style-mock-01` | Seeded sample mock (slug)                                           |
| `--think-ms`    | `20`                             | Maximum random pause between saves (0..n ms)                        |
| `--ramp-ms`     | `0`                              | Spread student starts evenly over this window; `0` is a start storm |
| `--save-p95-ms` | `500`                            | Fail when the save p95 latency is above this                        |

The script uses `scripts/lib/neetStack.mjs` to boot a disposable stack: a
throwaway single-node replica-set `mongod`, seeded sample mocks and students,
and the real API process without Redis. Session cookies are minted with the
stack's own `JWT_SECRET`, so logins are not exercised. Everything is torn
down at the end.

Each student registers, picks non-proctored mode, accepts instructions,
starts, answers every question with sequenced autosaves (batches of 1–5,
monotonic `seq`), changes about 10% of answers with a newer `seq`, sends a
heartbeat every 15 saves and submits. Every 10th student sends two concurrent
submits.

Output: a summary table on stdout and a full JSON report in
`test-results/neet-smoke/neet-smoke-<timestamp>.json` (git-ignored) with the
host, parameters, per-operation latency (p50/p95/p99/max), status and error
code counts, 429s, throughput, verification results and request failure
samples. The exit code is `1` when any check fails.

## What it verifies

Checked by reading MongoDB directly after the run:

- **Zero lost acknowledged answers.** For every answer the server
  acknowledged with a `200`, the stored response has `seq >=` the
  acknowledged `seq`, with the same option when the `seq` is equal.
- **Exactly one final result per attempt.** Every attempt is `SUBMITTED`
  with a result, no result history, and the submit response matches the
  stored result. No duplicate attempts were created.
- **Independent scoring.** Every score is recomputed from the stored
  responses, the attempt's pinned marks and the latest answer-key version,
  using the ACTIVE / ALL_CORRECT / DROPPED rules implemented in the script
  itself (no server code is imported). The stored `answerKeyVersion` must
  match.

Checked during the run:

- Every `200` save echoes the `seq` and option that was written.
- Concurrent double submits both return `200` with identical summaries.
- Heartbeats report an active session.
- No non-2xx responses, no 429s, no network errors, and save p95 within
  `--save-p95-ms`.

## What it does not prove

- **Capacity.** Everything runs on one machine: the load generator, a
  single API process and a single `mongod` share the same CPU, memory and
  disk, so the generator competes with the system under test.
- **Production topology.** There is no Redis (rate limits are in-process),
  no nginx or load balancer, no TLS, no network latency, no multiple API
  tasks and no Atlas.
- **Realistic pacing.** Students answer a three-hour paper in seconds. This
  compresses the request rate per student; it does not model a sitting.
- **Failure modes.** No Redis or API outages, Mongo failover, slow
  networks, reconnect storms, proctored mode or deadline races.

The capacity plan (`docs/neet-exams/08-performance-capacity-plan.md`, M6)
requires k6 scenarios run against disposable, production-sized
infrastructure (same images, multiple API tasks, an Atlas cluster and
Redis of the target tier). Only that can support a 1,000-concurrent-student
claim. A passing smoke run does not.
