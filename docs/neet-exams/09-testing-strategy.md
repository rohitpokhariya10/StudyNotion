# 09 — Testing Strategy and CI Gaps (PROPOSED)

## 1. Current state (observed 2026-10-10, Node 24.19.0)

| Suite                                                                            | Runner                                                               | In CI?                                 | Real backend?                            | Result today                                         |
| -------------------------------------------------------------------------------- | -------------------------------------------------------------------- | -------------------------------------- | ---------------------------------------- | ---------------------------------------------------- |
| Contracts (`packages/contracts/test`)                                            | node:test                                                            | Yes                                    | n/a                                      | 18/18                                                |
| Frontend unit and component (`apps/web/src/**/*.test.*`)                         | Vitest + jsdom                                                       | Yes                                    | n/a                                      | 271/271                                              |
| Backend unit (`apps/api/test/*.test.js`), including `project-neet-http.test.js`  | node:test                                                            | Yes                                    | Fakes and stubs                          | 558 passed, 8 skipped                                |
| Catalog / learning / enrollment / entitlement / Mongoose / preflight integration | node:test                                                            | **Yes** (Mongo 8 + Redis 7.4 services) | Yes                                      | Not run in this audit                                |
| **NEET integration** (`project-neet.integration.test.js`)                        | node:test via `scripts/run-neet-integration.mjs` (disposable mongod) | **No**                                 | Yes (standalone mongod 7.0 locally)      | 6/6                                                  |
| Catalog e2e                                                                      | Playwright                                                           | Yes                                    | Mocked API                               | Not run                                              |
| **NEET e2e** (`e2e/project-neet.spec.js`)                                        | Playwright                                                           | **No**                                 | **Mocked**: `context.route("**/api/**")` | 31 passed, 2 skipped                                 |
| UI / live e2e                                                                    | Playwright                                                           | No                                     | Mocked / live URL                        | Not run                                              |
| Typecheck                                                                        | tsc                                                                  | Yes                                    | n/a                                      | Passes, but **near-vacuous** (`checkJs:false`)       |
| Format                                                                           | Prettier                                                             | Yes                                    | n/a                                      | **Fails**: 21 files, 16 already failing at `262abbd` |
| Load / capacity                                                                  | —                                                                    | **No tooling exists**                  | —                                        | —                                                    |

## 2. Gaps to close

These are in priority order.

### G1. NEET integration in CI

- Add `STUDYNOTION_RUN_NEET_INTEGRATION=1` and `NEET_TEST_MONGODB_URI` to the existing `catalog-integration` job, which already has a Mongo 8 service. The test's safety guards already accept a loopback host and a `studynotion_neet_test_*` database name.
- Run the job against a **single-node replica set**, so CAS and `w:majority` semantics match production.

### G2. A real-backend NEET e2e

Add a Playwright project that uses no route interception. It would run against:

- `compose.local.yml`, the API plus the web build
- a seeded disposable database containing one practice test and one proctored test

It would cover:

- sign in
- full practice flow
- refresh restore
- offline/online
- submit
- correct score

Run it nightly and on PRs that touch `modules/project-neet` or `features/neet-*`.

### G3. Fix the format gate

Fix the 16 committed files that fail Prettier. The goal is for CI's `client` job to go green before new work lands.

### G4. Regression tests for the verified defects

Each defect gets a test that fails first:

| Defect | Test                                                                                   |
| ------ | -------------------------------------------------------------------------------------- |
| F-1    | A same-session refresh is not a takeover and records no event                          |
| F-2    | A write enqueued in the last 2 s is flushed before `TIME_EXPIRED` submit               |
| F-3    | A pending write survives a new tab and session (attempt-keyed local storage)           |
| R-1    | An exam save succeeds when the Redis store throws, while login stays fail-closed       |
| R-2    | Editing a question after start changes neither the session content nor the scoring key |
| R-6    | A threshold breach sets `review.status = FLAGGED` and never `SUBMITTING`               |

### G5. Load-test smoke in CI

Add an optional manual-dispatch workflow that runs a 50-VU, 2-minute k6 smoke test against an ephemeral compose stack. Full L1–L12 runs stay manual on disposable infrastructure (see 08 §5).

### G6. Make typecheck meaningful (later)

Enable `checkJs` per directory, starting with `features/neet-exam/model` and `entities/neet`. Do not enable it repo-wide.

## 3. Test matrix for new work

| Area               | Unit (pure)                                                                 | Integration (real Mongo)                                                                                                     | e2e (real backend)                                            |
| ------------------ | --------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| Scoring v2         | Negative marking; multi-key; CANCELLED/BONUS; rounding; key-version pinning | Rescore job idempotency; `resultHistory` bound                                                                               | Result after a key correction                                 |
| Paper versions     | Assembly counts per section; uniqueness; approved-only; content hash        | Publish immutability; legacy-attempt compatibility path                                                                      | Session content equals the published snapshot                 |
| Lifecycle          | State table; accommodation deadline                                         | Duplicate start; out-of-order `seq`; save vs submit; submit vs expiry; sweeper vs manual submit; crash between the CAS steps | Expiry at a controlled clock (Playwright `page.clock`)        |
| Session protection | Cookie re-issue rule                                                        | 428 exemption only while `IN_PROGRESS`; logout still revokes                                                                 | Long exam across the 12 h JWT boundary (fake time)            |
| Access/payments    | Price snapshot; idempotency key                                             | Webhook HMAC; duplicate webhooks; grant idempotency; paid test denied without a grant                                        | Razorpay test-mode checkout (staging only)                    |
| Proctoring         | Policy engine with flag-only outcomes                                       | Event dedupe; counters CAS; review decisions audited                                                                         | Consent, denial, recovery; no device prompts in practice mode |
| Admin              | Import validation (CSV/JSON); sanitisation                                  | Role gates; audit log rows                                                                                                   | Question → review → paper → publish                           |
| Privacy            | Projection snapshots (no keys, no PII in logs)                              | Cross-user 404s on every new route                                                                                           | —                                                             |
| Frontend           | Palette states; queue, clock and storage adapters; reduced motion           | —                                                                                                                            | Keyboard-only exam; mobile layouts; axe on every new page     |

## 4. Rules

- Every bug fix starts with a failing test.
- Existing tests are never weakened or deleted to make a change pass.
- Capacity is signed off only from L1–L12 results on production-sized disposable infrastructure, with the correctness checker passing (08 §5.4).
