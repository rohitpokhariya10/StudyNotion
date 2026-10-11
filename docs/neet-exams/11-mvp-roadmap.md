# 11 — MVP Roadmap and Decisions (PROPOSED, awaiting approval)

Strategy: **harden the existing NEET slice first, then make it sellable, then prove scale.**

- Reliability work comes before new features.
- The reliable practice-mode engine comes before monitored mode.
- Monitored mode for minors waits for legal confirmation.

Durations are rough engineering estimates, and they assume the decisions in §3 arrive on time. **The critical path to revenue is reviewed question content, not code.**

## 1. Milestones

### M1 — Audit and architecture (this deliverable)

Delivered:

- `01` audit
- `03` architecture
- `04` database design
- `08` capacity plan
- `09` testing strategy
- this roadmap
- `PROGRESS.md`

Still to write, each at the start of the milestone that needs it:

- `02` product requirements, after the J decisions
- `05` API contracts, at M2
- `06` threat and privacy model, at M2/M7
- `07` UI/UX design, at M4
- `10` deployment and costs, after J-5

### M2 — Reliable exam engine (~2 weeks)

This is the existing engine with its defects fixed. No new UI surface is added.

| #   | Work                                                                                                                                                                                | Fixes         |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------- |
| 1   | CI green: fix the Prettier failures. Add NEET integration to CI on a single-node replica set.                                                                                       | G1, G3        |
| 2   | Redis resilience: unbounded reconnect, exam limiters fail open with an in-process fallback, readiness on Mongo only                                                                 | R-1           |
| 3   | Client: final-seconds flush, attempt-keyed recovery across tabs, stable session on refresh, recover from the `error`/`save-error` phases, per-question saving marker, `timeSpentMs` | F-1, F-2, F-3 |
| 4   | Proctor policy becomes flag-for-review only. A same-session resume is not a takeover. Rename to "Monitored mode".                                                                   | R-6, F-1      |
| 5   | Session protection: cookie re-issue at start, 428 exemption while `IN_PROGRESS`                                                                                                     | R-3           |
| 6   | Frozen `NeetPaperVersion` and `NeetAnswerKeyVersion`, with migration, LRU cache and a legacy-compatibility path                                                                     | R-2           |
| 7   | Scoring v2: CANCELLED/BONUS keys, versioned results, rescore job (CLI)                                                                                                              | —             |
| 8   | Expiry sweeper                                                                                                                                                                      | R-11          |
| 9   | Hot-path efficiency: lean auth read, save projection, nginx keepalive, drain delay, log sampling, NAT-safe limits                                                                   | R-4, R-5      |
| 10  | Pagination for attempt history. Accommodation field (admin CLI first).                                                                                                              | —             |

**Exit criteria:**

- All G4 regression tests pass.
- The NEET integration suite runs in CI.
- No change to course, auth or payment behaviour, confirmed by the existing suites staying green.

### M3 — Content pipeline and admin (~2–3 weeks)

**Backend:**

- question bank, revisions and taxonomy
- review workflow: draft, review, approved
- CSV/JSON import with preview and validation
- paper assembly, validation and immutable publish
- answer-key correction leading to a rescore
- audit log

**Admin UI:** pages inside the existing dashboard Admin branch.

- question bank
- review queue
- paper builder
- publish

**Content:** sanitised rich text, plus KaTeX (configured safely) if the content needs mathematical or chemical notation.

**Exit criteria:**

- A subject expert can take a question from draft to a published paper without engineering help.
- The first **Full mock** and **Physics, Chemistry and Biology sprints (45 Q / 60 min)** are published from approved content.

### M4 — Results and Prahit-matched UX (~1–2 weeks)

- **Question-wise review:** explanations, accepted keys, time per question.
- **Comparison and history:** topic breakdown (approved taxonomy only), comparison with the previous attempt, paginated history.
- **Re-skin:** move the NEET pages onto the `--sn-*` tokens and the Prahit mark. This waits until the current branding work is committed.
- **Navigation:** a dashboard sidebar entry, and fixes to the landing-page overclaims.
- **Accessibility:** roving-tabindex palette, keyboard shortcuts, an axe check on every page, and a manual screen-reader pass.

### M5 — Commercial readiness (~1–2 weeks)

- **Payments and access:** `NeetOrder`, `NeetAccessGrant` and a separate Razorpay webhook. Course payments are not touched.
- **Packaging:** a free sample mock, plus paid pack gating.
- **Analytics:** privacy-preserving events for discovery, start, completion, technical abandonment, return attempts, conversion, monitored-mode adoption and revenue by SKU. These are first-party, aggregate-first, and carry no third-party trackers on exam pages.
- **Support:** a workflow covering outage review, the accommodation process and the refund policy for exam packs.

### M6 — Scale verification (~1 week, can overlap M4/M5)

- The `load/` k6 suite, a disposable production-sized environment, scenarios L1–L12 and the correctness checker.
- Fix the bottlenecks found.
- Observability: metrics (event-loop lag, pool wait, per-route latency), alarms and dashboards.
- An exam-day incident runbook.
- A sizing report with the measured numbers.
- **The 1,000-concurrency claim is made only from these results.**

### M7 — Monitored-mode governance (after legal sign-off)

- Consent v2, plus guardian consent if counsel requires it.
- The human review queue UI, with decisions and appeals.
- Reviewer audit and retention or deletion jobs.
- Evaluate Option B snapshots only if counsel and the product case support it.

### Deliberately postponed

- Option B snapshot evidence; Option C continuous recording.
- AI mistake-reason inference and AI recommendations.
- Percentiles and rank prediction (no defensible data yet).
- Monitored mode on mobile; native apps.
- Live all-India scheduled mocks until demand justifies pre-scaling.

### Revenue timeline (indicative)

- **Practice-mode free sample:** can go live after M2 plus the first approved paper, around week 3–4. This builds an audience and a waitlist.
- **First paid pack:** after M5, around week 7–9. That fits the 2–3 month window only if content production starts **now**, in parallel with M2.

Illustrative unit economics, using the brief's targets:

| Price | Paying students for ₹1,00,000 gross |
| ----- | ----------------------------------- |
| ₹499  | ~201                                |
| ₹699  | ~144                                |
| ₹999  | ~101                                |

The Razorpay standard fee is about 2 % plus 18 % GST on that fee, or ≈ 2.36 % effective. That is about ₹2,360 on ₹1 lakh; verify it on the Razorpay pricing page, since new-merchant offers may apply. Output GST on sales depends on registration status, so confirm with an accountant. Infrastructure costs are in 08 §7.

## 2. Files to create or modify (by milestone)

### M2 — Server

| Path                                                                                                   | Change                                                                                                      |
| ------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------- |
| `apps/api/config/redis.js`                                                                             | Unbounded reconnect; recreate the client after a fatal error                                                |
| `apps/api/middleware/rateLimiters.js`                                                                  | Exam limiters `passOnStoreError: true` with in-process fallback; NAT-safe ceilings                          |
| `apps/api/app/createApp.js`                                                                            | Readiness on Mongo only; `/health/deps`                                                                     |
| `apps/api/bootstrap/createServerLifecycle.js`                                                          | Drain delay before `server.close()`; keep-alive timeout                                                     |
| `apps/api/middleware/auth.js`                                                                          | Lean projected user read; 428 exemption hook for in-progress exam calls. Additive, existing semantics kept. |
| `apps/api/utils/auth.js`                                                                               | Cookie re-issue helper (same `sessionVersion`)                                                              |
| `apps/api/modules/project-neet/config/defaults.js`                                                     | `autoSubmit.enabled: false`                                                                                 |
| `apps/api/modules/project-neet/domain/proctorPolicy.js`                                                | Flag-only outcomes                                                                                          |
| `apps/api/modules/project-neet/domain/scoring.js`                                                      | CANCELLED/BONUS key status; versioned results                                                               |
| `apps/api/modules/project-neet/services/{attemptService,lifecycle,proctorService,dto}.js`              | Pinned versions; same-session resume; sweeper; save projection; review state                                |
| `apps/api/modules/project-neet/models/{NeetAttempt,NeetQuestion,NeetMockTest}.js`                      | Field additions per 04                                                                                      |
| `apps/api/modules/project-neet/models/{NeetPaperVersion,NeetAnswerKeyVersion,NeetQuestionRevision}.js` | New                                                                                                         |
| `apps/api/modules/project-neet/repositories/*`                                                         | Version reads plus LRU cache                                                                                |
| `apps/api/scripts/migrate-neet-paper-versions.js`                                                      | New migration (confirm-variable guard)                                                                      |
| `apps/api/scripts/neet-rescore.js`                                                                     | New rescore job                                                                                             |

### M2 — Contracts

| Path                              | Change                                   |
| --------------------------------- | ---------------------------------------- |
| `packages/contracts/src/neet.js`  | Pagination; result version; review state |
| `packages/contracts/openapi.json` | Regenerated                              |

### M2 — Client

| Path                                                                              | Change                                                        |
| --------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| `apps/web/src/features/neet-exam/model/{examController,autosaveQueue}.js`         | Fixes for F-1, F-2 and F-3; phase recovery                    |
| `apps/web/src/features/neet-exam/lib/examStorage.js`                              | Storage keyed by attempt (implemented with `localStorage`)    |
| `apps/web/src/features/neet-exam/ui/{ExamShell,QuestionPalette,QuestionCard}.jsx` | Per-question saving marker; render isolation; roving tabindex |

### M2 — CI and tests

| Path                                                     | Change                              |
| -------------------------------------------------------- | ----------------------------------- |
| `.github/workflows/ci.yml`                               | NEET integration on a replica set   |
| `apps/api/test/*.test.js`                                | New and extended tests per 09 §2 G4 |
| `apps/web/src/features/neet-exam/model/neetExam.test.js` | New and extended tests per 09 §2 G4 |
| `apps/api/test/project-neet.integration.test.js`         | New and extended tests per 09 §2 G4 |

### M2 — Edge

| Path                  | Change             |
| --------------------- | ------------------ |
| `apps/web/nginx.conf` | Upstream keepalive |

### M3

| Path                                                | Change                                   |
| --------------------------------------------------- | ---------------------------------------- |
| `apps/api/modules/project-neet/http/adminRoutes.js` | New, with admin controllers and services |
| `models/NeetAuditLog.js`, `neettaxonomy`            | New                                      |
| `packages/contracts/src/neet-admin.js`              | New                                      |
| `apps/web/src/pages/neet-admin-*`                   | New pages                                |
| `apps/web/src/features/neet-question-bank`          | New feature                              |
| `apps/web/src/features/neet-paper-builder`          | New feature                              |
| `AppRouter.jsx`                                     | Admin routes                             |
| `widgets/dashboard-sidebar/model/links.js`          | Admin entries                            |

### M4

| Path                                        | Change                      |
| ------------------------------------------- | --------------------------- |
| `apps/web/src/pages/neet-review`            | New page                    |
| `pages/neet-result`                         | Extended                    |
| `widgets/neet-shell/styles/projectNeet.css` | Remapped to `--sn-*` tokens |
| `NeetLogo.jsx`                              | Replaced by `BrandLogo`     |
| Copy fixes                                  | Across `pages/neet-*`       |

### M5

| Path                                                                                                  | Change                                                                              |
| ----------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| `apps/api/modules/project-neet/{models/NeetOrder,models/NeetAccessGrant,services/commerceService}.js` | New                                                                                 |
| Webhook route                                                                                         | Mounted before JSON parsing in `apps/api/app/registerRoutes.js` (one additive line) |
| `packages/contracts/src/neet-commerce.js`                                                             | New                                                                                 |
| Frontend                                                                                              | Checkout feature                                                                    |

### M6

| Path                             | Change                                 |
| -------------------------------- | -------------------------------------- |
| `load/**`                        | New k6 scenarios, seed, verify, README |
| Metrics exporter                 | `apps/api/shared/metrics/`             |
| `docs/runbooks/neet-exam-day.md` | New                                    |

Untouched throughout: the course catalogue, learning, `Purchase`, `Entitlement` and the course payment controllers.

## 3. Decisions requiring approval

Only decisions that block a milestone are listed.

| ID  | Decision                                                                                                                                                                                 | Recommendation                                                                                                                                                                                                       | Blocks           |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- |
| J-1 | Replace proctoring auto-submit with flag-for-human-review, and rename "Proctored" to "Monitored mode" in student-facing copy                                                             | **Yes to both**                                                                                                                                                                                                      | M2               |
| J-2 | Monitored mode for under-18 users before legal review                                                                                                                                    | **No.** Offer practice mode to everyone. Offer monitored mode to self-declared 18+ users only until counsel confirms the DPDP §9 position or a guardian-consent flow ships. Cut event retention from 180 to 90 days. | M2 (gate), M7    |
| J-6 | Stop copying phone and email onto each attempt (display name only)                                                                                                                       | **Yes**                                                                                                                                                                                                              | M2               |
| J-7 | Naming and paths: user-facing "Project NEET" becomes "Prahit NEET Mocks", and the browser route `/project-neet` becomes `/neet`. The internal API prefix `/api/v2/project-neet` is kept. | **Yes.** Pre-launch is the cheapest time.                                                                                                                                                                            | M2               |
| J-8 | Cancelled-question policy                                                                                                                                                                | **Configurable per paper.** Default: award full marks to all candidates (mirrors common NTA practice; verify against the bulletin).                                                                                  | M2               |
| J-3 | Content source and reviewers: who writes and reviews the questions, the number of mocks per paid pack, and the budget                                                                    | Needs your input. At least 1 full mock and 3 sprints (~315 questions) for launch; ≥ 3 full mocks for a paid pack.                                                                                                    | M3, revenue      |
| J-4 | Pricing and packaging                                                                                                                                                                    | Needs your input. A free sample, plus one paid pack at a single price point to start.                                                                                                                                | M5               |
| J-5 | Infrastructure: confirm that the AWS staging account exists, Atlas versus alternatives, a monthly ceiling, and always-on versus scheduled scale-up                                       | **Baseline always-on plus scheduled scale-up** (~₹19–23k/month estimate)                                                                                                                                             | M6, `10`         |
| J-9 | Confirm the NEET UG duration from the official NTA bulletin (180 vs 195 min; the NTA page returned 403 to our fetch)                                                                     | You verify. Duration is already configurable.                                                                                                                                                                        | Content and copy |
