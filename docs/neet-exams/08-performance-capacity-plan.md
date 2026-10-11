# 08 — Performance and Capacity Plan: 1,000 Concurrent Exam Takers (PROPOSED)

> **Readiness claim: none.** No load test has ever been run against this codebase, and there is no load-testing tooling in the repository today (see the audit, §2 and §8). The figures below are **design estimates** to be confirmed or refuted by the test plan in §5. "1,000 concurrent" means 1,000 attempts in progress at once. It does not mean 1,000 registered accounts.

## 1. Traffic model

The model is derived from the observed client constants:

- debounce 700 ms
- max wait 3 s
- batch ≤ 50
- heartbeat 45 s
- proctor flush 4 s
- a visit to an unvisited question enqueues a write (`examController.js:203,218`)

### 1.1 Per student, full mock (180 questions, 180 min)

| Source                       | Writes or requests per student                                                                                       | Notes                                   |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------- | --------------------------------------- |
| Answer saves                 | ~400–450 writes (180 visits, ~200–250 answer changes, ~30 review marks) coalesced into **~250–400 requests per 3 h** | Writes made within 700 ms are coalesced |
| Heartbeats                   | 240 per 3 h                                                                                                          | 45 s interval                           |
| Proctor events (Mode A only) | typically 10–100 batches per 3 h                                                                                     | Flushed only when there are events      |
| Start                        | ~6 requests (test, register, mode, ready, start/session)                                                             | Once per attempt                        |
| Submit                       | 1–2 requests                                                                                                         | Once per attempt                        |

### 1.2 Aggregate at 1,000 concurrent

| Scenario                                                                 | Request rate                                                       | Character                                                          |
| ------------------------------------------------------------------------ | ------------------------------------------------------------------ | ------------------------------------------------------------------ |
| Steady state                                                             | **~50–80 req/s** (saves ~25–40, heartbeats ~22, events ≤ 15)       | Small JSON writes                                                  |
| Theoretical save ceiling (everyone editing continuously; max-wait bound) | ≤ 333 save req/s                                                   | Upper bound for headroom                                           |
| Start storm (scheduled mock, all 1,000 start in ~60 s)                   | ~100 req/s of pre-start calls, plus **~17 heavy session builds/s** | Session payload ≈ 180 questions, ~150–250 KB JSON (~40–60 KB gzip) |
| Deadline storm (everyone hits zero within ~5 s)                          | **~200 submits/s** for ~5 s                                        | Each is ~4–5 Mongo ops and 1 auth read                             |
| Reconnect storm (network blip then recovery)                             | Up to 1,000 resumes plus queued flushes in ~10 s                   | Backoff and jitter (1–15 s plus 400 ms) spread this                |

**Design target:** 400 req/s sustained and 600 req/s burst, which is 5–8× the steady state. The start and deadline storms are tested separately.

## 2. Per-request cost (current code, before optimisation)

| Operation      | Redis round trips                   | Mongo ops                                                                                                         | Payload                     | Notes                                                                       |
| -------------- | ----------------------------------- | ----------------------------------------------------------------------------------------------------------------- | --------------------------- | --------------------------------------------------------------------------- |
| Save           | 3 (IP, user, user+attempt limiters) | 1 user read (non-lean) + 1 `findOneAndUpdate` on a ~40 KB document, returning the **full** `responses[]` (~20 KB) | ~1 KB in / ~1 KB out        | D10 and the save-projection fix cut this to a lean read plus a ~1 KB return |
| Heartbeat      | 3                                   | 1 user + 1 CAS                                                                                                    | tiny                        |                                                                             |
| Start / resume | 3                                   | 1 user + ~4 attempt ops + **2 queries reading 180 question documents each**                                       | ~200 KB out (Zod-validated) | D3 LRU makes the question reads 0 Mongo ops                                 |
| Submit         | 3                                   | 1 user + ~4 attempt ops + **1 query reading 180 answer keys**                                                     | small                       | The D3 key-version cache makes the key read 0 Mongo ops                     |

## 3. Write-path strategy

1. **One atomic update per save batch.** Keep the existing `arrayFilters` CAS (D2). Mongo applies it as one document update. The oplog records a small diff, so the replication cost is proportional to the change, not to the document size.
2. **Bounded write concurrency.**
   - Each task has `maxPoolSize` 20 (configurable up to 200).
   - The client allows one save in flight per student and backs off on 429 and 503.
   - With N tasks, the cluster sees at most 20·N concurrent operations.
   - Choose N and the pool size so that 20·N stays below ~30–40 % of the Atlas tier's connection limit.
3. **No unbounded queues.**
   - Each client queue is bounded by the paper size (≤ 500 questions) and coalesces per question.
   - The server holds no in-memory queue.
   - The Mongo driver's wait queue is bounded by `waitQueueTimeoutMS` of 10 s.
4. **Working set.** 1,000 active attempts at ~60 KB each is about 60 MB, plus paper versions held in API memory. The working set fits in RAM on any M20+ tier.
5. **Fail-safe ordering.** A save is acknowledged only after `w:majority` returns, which production already enforces. The client marks an answer saved only on that acknowledgement.

## 4. Simultaneous submission strategy

- **Inline finalisation stays** (D6). Submission is a two-step CAS:
  1. `IN_PROGRESS → SUBMITTING`
  2. Score from the **cached** pinned key version, then `SUBMITTING → SUBMITTED`, writing the result once.
- **Cost.** About 4 small operations per submit. At 200 submits/s over 5 s, that is ~1,000 ops/s, inside the budget of an M30-class tier. **This is an estimate to be tested.**
- **Duplicates converge.** Double clicks, retries, a second tab, or the expiry sweeper racing a manual submit all end in one result (covered by the existing real-Mongo tests).
- **Crash safety.** If a task dies between the two CAS steps, the attempt stays in `SUBMITTING`. The next reader, or the sweeper, completes it. The client shows "Result processing" while it receives `submissionPending`.
- **Students who closed the browser.** The sweeper finalises their expired attempts within about 2 minutes.
- **No queue infrastructure** is introduced unless the load tests show request-path finalisation breaching the submit SLO. The fallback would be a Mongo-backed job collection consumed by a worker container using the same image. It would not be Kafka or SQS.

## 5. Load-test plan

### 5.1 Tooling

- **k6** (open source, a single binary, JavaScript scenarios). Neither k6 nor any alternative is present in the repository today.
- New directory: `load/`
  - `load/scenarios/*.js`
  - `load/lib/neetFlow.js`, the shared student state machine
  - `load/seed/`, which creates test users and published papers in a **disposable** environment
  - `load/verify/`, the post-run invariant checker
  - `load/README.md`
- **Authentication.** For a disposable environment, the seed script mints session cookies with that environment's own `JWT_SECRET`. This avoids exercising the login limiter 1,000 times. Login is tested separately at realistic rates.
- **Generator.** One c6i.xlarge-class instance in the same region drives 1,000 VUs. If CPU on the generator exceeds 70 %, split across two.

### 5.2 Environment

**This must be a disposable stack sized like production**, never production or the developer database:

- The same container images.
- N Fargate tasks.
- An Atlas cluster of the target tier, created for the test and destroyed afterwards.
- Redis of the target tier.

**A mocked database is not acceptable for capacity sign-off.**

### 5.3 Scenarios

| #   | Scenario                                                                                      | Pass criteria (proposed SLOs)                                                                              |
| --- | --------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| L1  | Ramp 100 → 300 → 500 → 1,000 concurrent students on the realistic save model, 30 min per step | Save ack p95 < 300 ms and p99 < 1 s. 5xx < 0.1 %. 429 < 0.5 %. No pool wait-queue timeouts.                |
| L2  | 1,000 starts within 60 s                                                                      | Start p95 < 2 s, p99 < 4 s. 0 failed starts after client retry.                                            |
| L3  | 1,000 manual submits within 5 s                                                               | Submit p95 < 3 s. **All 1,000 have exactly one result within 60 s.** 0 duplicates.                         |
| L4  | Deadline race: 1,000 students saving up to T−1 s, then expiry                                 | 0 accepted writes after `expiresAt`. Every write acknowledged before `expiresAt` is present in the result. |
| L5  | Hot editing: 1,000 students changing an answer every 3 s for 10 min (worst case)              | Save p99 < 1.5 s, 5xx < 0.5 %                                                                              |
| L6  | Reconnect storm: drop all connections for 30 s, then restore                                  | Full recovery within 60 s. 0 acknowledged answers lost.                                                    |
| L7  | Redis killed for 5 min mid-exam                                                               | **Exam saves continue** (requires the D7 fix; fails today). Login degrades as documented.                  |
| L8  | API task killed (1 of N) mid-exam                                                             | Error spike < 30 s. 0 acknowledged answers lost.                                                           |
| L9  | Mongo primary step-down (Atlas "test failover")                                               | Retryable writes recover. Save p99 spike < 10 s. 0 lost acknowledgements.                                  |
| L10 | Mongo slowdown (latency injected through a proxy, +200 ms)                                    | Graceful backoff. Clients show "Saving…". No data loss.                                                    |
| L11 | Shared-IP case: 300 students from one source IP                                               | No 429 below the per-user budgets (fails today for all v1 traffic; see R-4)                                |
| L12 | Soak: 1,000 students for 180 min (the full-mock duration)                                     | Stable memory, no p99 drift, all finalised                                                                 |

### 5.4 Correctness verification (the required invariant)

- **Zero loss of server-acknowledged answers.** Every k6 VU logs the `(attemptId, questionId, seq, selectedOption)` tuples that the server acknowledged. After each run, `load/verify` asserts:
  - For every acknowledged tuple, the stored response has `seq ≥` the acknowledged `seq`.
  - If the stored `seq` equals the acknowledged `seq`, the values are identical.
  - The final result scores against the pinned key version.
- **Scoring correctness.** The checker independently recomputes every score from the stored responses and the key version, and requires an exact match.
- **Duplicates.** The checker requires exactly one result per attempt and counts duplicate requests absorbed by idempotency.

### 5.5 Metrics to collect

- **k6:** throughput; p50/p95/p99 per endpoint; HTTP status mix; timeouts.
- **API:** event-loop lag; CPU; RSS; GC pauses; Mongo pool checkout wait; Redis latency.
- **Atlas:** ops/s; queue lengths; WiredTiger cache dirty %; replication lag; connection count.
- **Proctor events:** ingestion delay.

The API needs **new instrumentation** for this: a lightweight Prometheus-format or CloudWatch EMF exporter for event-loop lag, pool metrics and per-route latency. None exists today.

## 6. Proctoring bandwidth and storage

| Mode                                             | Bandwidth at 1,000 concurrent                                        | Storage per 1,000-student 3 h sitting                  |
| ------------------------------------------------ | -------------------------------------------------------------------- | ------------------------------------------------------ |
| Practice (no proctoring)                         | 0                                                                    | 0                                                      |
| A — Event-only (MVP)                             | Worst case ≈ 250 KB/s ingress, typically < 50 KB/s                   | Typically < 100 MB (≤ 0.9 GB worst case); TTL 180 days |
| B — Snapshots, 20 KB/min, presigned direct to S3 | ≈ 2.7 Mbit/s into S3; the API handles only presign calls (~17 req/s) | ≈ 3.6 GB                                               |
| C — Continuous webcam + screen                   | ≈ 0.5–1 Gbit/s sustained through SFU/media servers                   | ≈ 1 TB                                                 |

**The B and C storage dollar costs are small. The real costs are:**

- media infrastructure (C only)
- reviewer labour (C: about 3 h of video per student)
- legal and retention obligations for images of minors

This is why Option A is the MVP and C is rejected (03 §5).

## 7. Sizing and cost model

### 7.1 Price anchors and assumptions

These are **not** verified Mumbai prices. Confirm them in the AWS Pricing Calculator and the Atlas cluster builder for ap-south-1 before budgeting.

| Item                                          | Anchor price                                                                                                                                                                   |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Fargate x86                                   | ≈ US$0.0405 per vCPU-hour + US$0.0045 per GB-hour (US list); ≈ US$36/month for a 1 vCPU / 2 GB task running always-on                                                          |
| MongoDB Atlas                                 | M10 US$0.08/h (≈ $58/month), M20 US$0.20/h (≈ $146/month), M30 US$0.54/h (≈ $394/month), as published US/AWS list rates. Mumbai rates are typically higher.                    |
| ALB                                           | ≈ US$20–35/month including LCUs at this scale                                                                                                                                  |
| NAT gateway (if tasks are in private subnets) | ≈ US$35–45/month                                                                                                                                                               |
| ElastiCache (small node)                      | ≈ US$12–25/month                                                                                                                                                               |
| CloudWatch Logs ingest                        | ≈ US$0.50/GB. The current one-info-line-per-request logging at ~60 req/s is ≈ 75–80 GB/month, ≈ **US$40/month**. Recommendation: sample successful exam hot-path request logs. |
| Exchange rate                                 | **Assumed ₹88/US$ — recompute**                                                                                                                                                |

### 7.2 Monthly estimates (infrastructure only)

These exclude payment fees, taxes and content costs.

| Profile                                                                        | Composition                                                    | ≈ US$/month | ≈ ₹/month |
| ------------------------------------------------------------------------------ | -------------------------------------------------------------- | ----------- | --------- |
| **Baseline**, ≤ 100 concurrent                                                 | 2 × (0.5 vCPU / 1 GB) tasks, M10, small Redis, ALB, NAT, logs  | ~170–200    | ~15–18k   |
| **500 concurrent** always-on                                                   | 2–3 × (1 vCPU / 2 GB), M20, Redis, ALB, NAT, logs              | ~300–350    | ~26–31k   |
| **1,000 concurrent** always-on                                                 | 3–4 × (1 vCPU / 2 GB), M30, Redis with replica, ALB, NAT, logs | ~620–700    | ~55–62k   |
| **Recommended:** baseline always-on, scaled up only for scheduled mock windows | Baseline, plus M30 and 4 tasks for ~40–50 h/month              | ~220–260    | ~19–23k   |
| One full load-test day (disposable)                                            | M30 × 8 h, 4 tasks × 8 h, generator × 8 h                      | < 25        | < 2.2k    |

### 7.3 Commercial implication

At the ₹1,00,000 gross-revenue goal over 2–3 months:

- Always-on 1,000-concurrency infrastructure (~₹55–62k/month) would consume most of the revenue.
- With **self-paced** mocks, early concurrency is likely to stay well under 100.

Recommendations:

1. **Prove 1,000-concurrency on disposable infrastructure (L1–L12)**, and keep the runbook to scale up.
2. Run baseline infrastructure day to day.
3. Pre-scale only for announced live mock events.

Atlas tier changes are online rolling operations, but they must be scheduled ahead of a window. **The tier and task count are decision J-5.**

## 8. Hot-path optimisations to land before load testing (M2)

Each is listed with the problem it addresses.

1. **D7** Redis resilience and exam limiters failing open (R-1).
2. **D3** Frozen paper and key versions with an LRU cache. This removes the 180-document reads on start and submit.
3. **D10** Lean auth read on exam paths.
4. **Save CAS projection.** Return about 1 KB instead of about 20 KB.
5. **Raise the NEET per-IP ceiling**, and key the v1 shared limiter by user once a request is authenticated (R-4). Edge-cache `GET /tests` (it is already `public, max-age=30`).
6. **nginx.** Add an `upstream` block with `keepalive`. Set the ALB idle timeout below the Node `keepAliveTimeout`, or raise Node's to about 65 s.
7. **Graceful drain.** Add a readiness-flip delay, ≥ the ALB deregistration interval, before `server.close()`.
8. **Sample** successful exam hot-path request logs.
