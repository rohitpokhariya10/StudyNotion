# NEET Exams — Progress

Last updated: 2026-10-10 · Branch `project-neet` @ `262abbd`. **M2 changes are uncommitted** and sit alongside the uncommitted branding work, which was not modified except for the two lines noted under "Files changed".

## Status

| Milestone                   | State                                                                                                                                                                                            |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| M1 audit and architecture   | Delivered and approved (with decisions 1–5)                                                                                                                                                      |
| **M2 reliable exam engine** | **Implemented and locally verified; awaiting your review.** Nothing is committed or pushed. The new CI jobs have not yet run on GitHub Actions; their steps were reproduced locally with Docker. |
| M3–M7                       | Not started. A further review is required before any work begins.                                                                                                                                |

**Readiness claims:**

- **1,000-user readiness: not established.** Only a single-machine smoke test (100 students) has run.
- **Production readiness: not established.**

## Approved decisions applied

1. **Monitoring flags, it never submits.** Monitoring no longer submits or cancels an attempt. Crossing the threshold sets `review.status = FLAGGED`. Server-authoritative deadline submission is unchanged.
2. **Monitored mode is adults-only.** It requires a recorded 18+ self-declaration, enforced by the server (`NEET_ADULT_CONFIRMATION_REQUIRED`). Practice mode is unaffected.
3. **Contact details are no longer copied onto attempts.** Attempts store only a display name; ownership is `userId`. A migration step removes previously copied phone and email values.
4. **"Prahit NEET Mocks" at `/neet`.** `/project-neet/**` redirects with its query string and hash preserved. The API prefix `/api/v2/project-neet` is unchanged.
5. **NTA NEET UG 2026 scoring, 180 minutes:**
   - Dropped or invalid questions give +4 to every appeared candidate, attempted or not.
   - Multiple-correct questions give +4 for any listed option, −1 otherwise.
   - All-options-correct questions give +4 for any attempt.

## Acceptance criteria — results

Criteria are defined in [M2-acceptance-criteria.md](M2-acceptance-criteria.md). "Fails on HEAD" means the new test was run against the `262abbd` engine in a throwaway copy and failed there.

| ID                                     | Result                 | Evidence                                                                                                                                                                                                                  |
| -------------------------------------- | ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| T-1 Expiry sweeper                     | Met                    | Integration: two concurrent sweeps plus a manual submit produce one `AUTO_SUBMITTED` / `TIME_EXPIRED` result with saved answers scored                                                                                    |
| T-2 Session covers exam                | Met                    | Integration: a 10-minute token is re-issued at start with `exp ≥ deadline + 30 min` and the same `sessionVersion`. A `sessionVersion` bump then gives 401.                                                                |
| T-3 Policy bump mid-exam               | Met                    | Unit (auth middleware) and integration through the real auth middleware: saves succeed while registration returns 428                                                                                                     |
| T-4 Deadline rules unchanged           | Met                    | Existing real-Mongo race tests pass                                                                                                                                                                                       |
| A-1 Final-seconds flush (F-2)          | Met                    | Vitest (fails on HEAD): with under 15 s left, changes are sent immediately. Queued writes are flushed before `TIME_EXPIRED`, verified by call order.                                                                      |
| A-2 Cross-tab/crash recovery (F-3)     | Met                    | Vitest storage and controller tests (fail on HEAD): a new tab recovers and sends queued answers, legacy keys are migrated, and all attempt keys are cleared on completion                                                 |
| A-3 Offline without the `online` event | Met                    | Vitest (fails on HEAD): sends retry while `navigator` stays offline                                                                                                                                                       |
| A-4 Invalid write does not freeze      | Met                    | Vitest (fails on HEAD): the phase stays `active`, a notice is shown, and answers are reconciled using the same session                                                                                                    |
| A-5 `save-error` recoverable           | Met                    | Vitest (fails on HEAD), plus a "Return to exam" control                                                                                                                                                                   |
| A-6 Revision-safe acknowledgement      | Met                    | Integration: the save acknowledgement contains only the written question (DB-side `$filter` projection); stale and duplicate tests pass                                                                                   |
| A-7 Zero acknowledged loss             | Met (smoke)            | 0 lost of 19,800 acknowledged answers (100 students); 0 of 4,950 (25 students)                                                                                                                                            |
| R-a Same-tab refresh (F-1)             | Met                    | Vitest (fails on HEAD). Integration: same-session resume leaves `sessionClaims` unchanged and records no `DUPLICATE_SESSION` event. Real e2e: `activeSessionId` and `sessionClaims` are unchanged after a browser reload. |
| R-b Reconnect                          | Met (by design)        | Every re-activation reuses the tab session through the same path as R-a; there is no separate 401-path test                                                                                                               |
| S-1 Single result                      | Met                    | Existing races, plus the sweeper race; 10/10 concurrent double submits were idempotent in the smoke                                                                                                                       |
| S-2 Completion once                    | Met (regression guard) | Vitest. HEAD already handled this race, so it is not a fixed defect.                                                                                                                                                      |
| K-1 Frozen paper (R-2)                 | Met                    | Integration: after start, editing question text and keys changes neither resumed content nor scoring                                                                                                                      |
| K-2 NTA rules                          | Met                    | Unit: single, multiple, all-correct and dropped (attempted and unattempted) cases; a 180-question paper keeps a 720 maximum and the invariants hold                                                                       |
| K-3 Correction and rescore             | Met                    | Integration: v2 rescoring is idempotent and keeps `resultHistory`, and later attempts use v2. The CLI was run against a disposable DB.                                                                                    |
| K-4 Key secrecy                        | Met                    | Integration scans of the session, save and result payloads; contract tests. Heartbeat and event contracts have no question fields.                                                                                        |
| P-1 No cheating-related auto-submit    | Met                    | Unit tests (including a stored `autoSubmit.enabled: true` override). Integration: 4 counted signals leave the attempt `FLAGGED` and `IN_PROGRESS`, and it then submits normally.                                          |
| P-2 Adults only                        | Met                    | Integration, contract, component, mocked e2e and real e2e (`adultDeclaredAt` stored)                                                                                                                                      |
| P-3 Honest consent copy                | Met                    | Component test: the copy says monitoring never submits, flags for review, is 18+ only, and that refresh is not counted                                                                                                    |
| D-1 No phone/email                     | Met                    | Contract, integration and real e2e (stored `candidate` is `{fullName}`); migration contacts step run on a disposable DB                                                                                                   |
| D-2 Ownership                          | Met                    | Existing cross-user 404 tests pass                                                                                                                                                                                        |
| X-1 Redis outage (R-1)                 | Met                    | Unit: exam limiters keep serving with local limits when the store throws (fourth request returns 429), the login limiter fails closed, readiness returns 200 when only Redis is down, and reconnect never gives up        |
| X-2 Shared-IP ceiling (R-4)            | Met                    | Unit: NEET per-IP limit is 180,000 per 15 min; user/attempt budgets unchanged                                                                                                                                             |
| N-1 Routes and naming                  | Met                    | Router tests, mocked e2e, real e2e redirect                                                                                                                                                                               |
| N-2 Four exam types                    | Met                    | Real e2e: Full (180 Q / 180 min / 720) and Physics/Chemistry/Biology sprints (45 Q / 3,600 s / 180; Biology split 23 Botany / 22 Zoology)                                                                                 |
| C-1 NEET integration in CI             | Met locally            | `neet-integration` job added. Its exact steps passed locally on Docker Mongo **8.0.29** as a replica set (12/12). The local runner also uses a replica set.                                                               |
| C-2 Real e2e                           | Met                    | 6/6 with **no request interception** (see limitations for the synthetic microphone)                                                                                                                                       |
| C-3 Performance smoke                  | Met                    | See "Performance smoke" below                                                                                                                                                                                             |
| C-4 Format gate                        | Met                    | Only `docs/growed-redesign/BRANDING.md` and `PROGRESS.md` (your uncommitted files) still fail                                                                                                                             |

## Tests run (final sweep, Node 24.19.0, working tree as-is)

| Command                                                                                                   | Result                                                                                                                                         |
| --------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run contracts:openapi:check`                                                                         | Pass (OpenAPI regenerated for the new contracts)                                                                                               |
| `npm run contracts:test`                                                                                  | 20/20 (baseline 18)                                                                                                                            |
| `npm run lint` (ESLint + architecture)                                                                    | Pass: 356 frontend / 61 backend files                                                                                                          |
| `npm run typecheck`                                                                                       | Pass (still near-vacuous; G6 deferred)                                                                                                         |
| `npm run test:frontend`                                                                                   | 62 files, **289/289** (baseline 271)                                                                                                           |
| `npm run test:backend`                                                                                    | **571 passed**, 0 failed, 8 opt-in skipped (baseline 558)                                                                                      |
| `npm run test:neet:integration`                                                                           | **12/12** on a disposable mongod 7.0.37 single-node replica set (baseline 6)                                                                   |
| CI `neet-integration` steps, reproduced with Docker                                                       | 12/12 on Mongo 8.0.29 replica set                                                                                                              |
| Platform integration (`test:integration`, 7 suites) on Docker Mongo 8.0.29 plus a disposable redis-server | 14 passed, 0 failed, 1 skipped (the NEET flag runs separately). On local Mongo 7.0 four suites refuse to run by design ("requires MongoDB 8"). |
| `CI=1 npm run test:neet:e2e` (mocked)                                                                     | 31 passed, 2 skipped (fake-device test is desktop-Chromium only), same as baseline                                                             |
| `CI=1 npm run test:neet:e2e:real`                                                                         | **6/6** on disposable mongod 7.0 and on Docker Mongo 8.0                                                                                       |
| `CI=1 npm run test:e2e` (existing catalog/learning)                                                       | 24/24                                                                                                                                          |
| `npm run build` (synthetic public settings)                                                               | Pass; the existing >500 KB lazy 3D-hero chunk advisory is unchanged                                                                            |
| `npm run format:check`                                                                                    | Fails only on your 2 uncommitted docs                                                                                                          |

## Performance smoke (`npm run test:neet:smoke`)

**This is not a capacity result.** Everything ran on one laptop: Apple M5, 10 cores, 24 GB. The generator, API and mongod shared the host, with no Redis or nginx, and each 180-question paper was answered in seconds.

| Students            | Requests | Save p50 / p95 / p99 | Start p95 | Submit p95 | Lost acknowledged answers | Score mismatches | Result |
| ------------------- | -------- | -------------------- | --------- | ---------- | ------------------------- | ---------------- | ------ |
| 25 (Docker Mongo 8) | 1,906    | 6.7 / 17.7 / 55.9 ms | 204 ms    | 54 ms      | 0 / 4,950                 | 0 / 25           | PASS   |
| 100 (mongod 7.0)    | 7,575    | 39.7 / 89 / 186.5 ms | 655 ms    | 293 ms     | 0 / 19,800                | 0 / 100          | PASS   |

Other results: 0 non-2xx responses, 0 rate-limit responses, and every double submit was idempotent. Latency rises with concurrency on this shared host. Reports are in `test-results/neet-smoke/` (git-ignored).

## Files changed by M2

**New files:**

| Area             | Files                                                                                              |
| ---------------- | -------------------------------------------------------------------------------------------------- |
| API models       | `apps/api/modules/project-neet/models/{NeetPaperVersion,NeetAnswerKeyVersion}.js`                  |
| API domain       | `domain/paperVersion.js`                                                                           |
| API repositories | `repositories/paperVersionRepository.js`                                                           |
| API services     | `services/{paperService,sweeper}.js`                                                               |
| API scripts      | `apps/api/scripts/{migrate-neet-m2,neet-answer-key}.js`                                            |
| API tests        | `apps/api/test/project-neet-{scoring,resilience}.test.js`                                          |
| Web tests        | `ProctorConsentPanel.test.jsx`                                                                     |
| e2e              | `e2e/neet-real.spec.js`, `playwright.neet-real.config.mjs`                                         |
| Stack scripts    | `scripts/{run-neet-e2e-real.mjs,neet-e2e-seed.cjs}`, `scripts/lib/{disposableMongo,neetStack}.mjs` |
| Load             | `load/{neet-smoke.mjs,README.md}`                                                                  |
| Docs             | `docs/neet-exams/M2-acceptance-criteria.md`                                                        |

**Modified, API module:**

- `config/defaults.js`
- `content/{sampleMocks,seedSampleMocks}.js`: adds the three sprints and publishes paper versions
- `domain/{errors,paper,proctorPolicy,scoring}.js`
- `http/controller.js`, `index.js`
- `models/{NeetAttempt,NeetMockTest,index}.js`
- `repositories/{attempt,test}Repository.js`
- `services/{attemptService,dto,index,lifecycle,proctorService}.js`

**Modified, shared API (additive):**

| File                                 | Change                                                                  |
| ------------------------------------ | ----------------------------------------------------------------------- |
| `middleware/auth.js`                 | Session metadata; policy-gate exemption for in-progress exam operations |
| `middleware/rateLimiters.js`         | `FailOpenStore` for exam limiters; NAT ceiling                          |
| `config/redis.js`                    | Reconnect never gives up                                                |
| `app/createApp.js`                   | Readiness no longer gated on Redis                                      |
| `bootstrap/createServerLifecycle.js` | Sweeper start/stop                                                      |

**Modified, contracts:** `packages/contracts/src/neet.js`, `test/neet.test.js`, and the regenerated `openapi.json`.

**Modified, web:**

- Engine and onboarding:
  - `features/neet-exam/{lib/examStorage,model/autosaveQueue,model/examController,model/neetExam.test,ui/ExamShell}`
  - `features/neet-onboarding/*` (name only)
- Proctoring copy: `features/neet-proctoring/{ui/ProctorConsentPanel,ui/ProctorStatusBar,ui/SystemCheckPanel,lib/browserSupport,lib/mediaAccess}`
- Routes and naming:
  - `app/router/AppRouter{,.parity.test}.jsx`
  - `pages/neet-*`
  - `entities/neet/*`
  - `widgets/{app-shell,support-link,navbar,footer/model,neet-shell,neet-hero}`
  - `pages/{profile,home/ui/sections/NeetCallout}`
- Fixtures: `test/neetFixtures.js`

**Modified, web edge (found while starting the local stack):**

- `apps/web/nginx.conf`: `absolute_redirect off`, so redirects never expose the internal port 8080. The bare `/project-neet` and `/project-neet/` now redirect to `/neet`; before this, nginx's directory redirect for `public/project-neet/media` broke the old link.

**Modified, CI and tooling:**

- `.github/workflows/ci.yml`: new `neet-integration` and `neet-real-e2e` jobs
- `package.json`: `test:neet:e2e:real`, `test:neet:smoke`
- `scripts/run-neet-integration.mjs`: replica set, temp cleanup
- `.prettierignore`: generated exports and verification logs

**Formatting only (they already failed Prettier at `262abbd`):** `RatingStars.jsx`, `SubjectCarousel.jsx`, `docs/ai-context/{API_MAP,DEPLOYMENT,DOCKER}.md`.

**Edits inside your uncommitted files:**

- `apps/web/src/widgets/footer/ui/Footer.test.jsx`: one route string, `/project-neet` → `/neet`
- `e2e/project-neet.spec.js`: routes, name-only onboarding, Monitored-mode/18+ steps

**Untouched:** course, catalog, learning, purchase, entitlement and payment code.

## Release order (data migration)

1. `MIGRATION_CONFIRM=create-indexes node apps/api/scripts/create-indexes.js` creates the new paper-version, key-version, sweep and review indexes.
2. `MIGRATION_CONFIRM=neet-m2 NEET_M2_STEPS=papers node apps/api/scripts/migrate-neet-m2.js` publishes paper versions. It is safe before the deploy because older code ignores the new fields. Run it first **without** `MIGRATION_CONFIRM` to see the dry run.
3. Deploy. New attempts need a published paper version and fail with `NEET_TEST_NOT_READY` until step 2 has run.
4. After the release is confirmed (no rollback needed): `MIGRATION_CONFIRM=neet-m2 NEET_M2_STEPS=contacts …`. The previous release reads `candidate.email` and `candidate.phone`, so removing them earlier would break a rollback.
5. Answer-key corrections:
   - Run `NEET_KEY_COMMAND=correct …`, then `NEET_KEY_COMMAND=rescore …`.
   - Re-run the rescore if it reports attempts still finalising.

## Remaining risks and limitations

**Not yet measured or verified:**

- **Capacity is unproven.** There has been no 1,000-concurrent run, no Redis, no nginx and no multi-replica test. That is M6 (k6 on production-sized disposable infrastructure).
- **Real devices are untested.** Monitored-mode browser tests use Chromium's fake camera, plus a **synthetic microphone track**: headless Chromium's fake audio capture hangs on this machine even for `{audio: true}`. Network requests are not intercepted. Real hardware, OS permission prompts, sleep/wake and fullscreen behaviour still need manual verification.
- **New CI jobs have not run on GitHub.** Their steps were reproduced locally only.

**Design trade-offs:**

- **Legacy attempts keep their old scoring.** Attempts started before paper versions keep the live-key path and are not rescored by key corrections.
- **Rescoring has a small window.** An attempt finalising at the instant a correction is published can be scored on the earlier key. A rescore re-run (idempotent) picks it up, and the CLI reports pending finalisations.
- **The adult check is a self-declaration**, not verification. The legal review for minors is still pending (decision 2).
- **Flags have no reviewer workflow yet.** Flagged attempts are indexed, but the review UI, decisions and appeals are M7.
- **A session is extended at exam start.** It is re-issued for up to 12 h (same `sessionVersion`, so logout and password changes still revoke it).
- **Pending policy acceptance does not block a running exam.** Students who have not accepted a new policy version can finish an exam already in progress; new starts still require acceptance.
- **Redis failure is visible but no longer gates readiness.** `/health/ready` reports `checks.rateLimitStore: false` without failing. Alert on that field; the separate `/health/deps` endpoint proposed in 03 was not added.

**Unchanged from before M2:**

- **Event and policy updates are not atomic.** A proctor-event insert and the attempt policy update still span two documents.

**Deferred, as recorded in the acceptance criteria:**

- lean auth read
- nginx keepalive and drain delay
- `timeSpentMs` capture
- per-question saving marker
- accommodations
- history pagination
- question-bank revisions and taxonomy

**Your follow-ups:**

- Run Prettier on your two branding docs before committing.
- Commit M2 separately from the branding work.

## Next step

Your review of M2. No M3–M7 work will start without it.
