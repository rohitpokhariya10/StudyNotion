# Project NEET implementation and verification report

Date: 5 October 2026. Branch: `project-neet`.

The requested implementation is delivered through results. This continuation
preserves the existing working tree, completes the documentation and makes only
the small corrections required by fresh UI verification, described below.
Nothing was committed, pushed, merged, reset, or stashed. No normal
developer database was seeded, cleared, or used for these integration tests.

**The latest UI state has been freshly production-build and browser verified.**
The final production build passed and the Project NEET browser suite passed
**31 tests with 2 intentional skips** after the minimum fixes. Earlier broad
suite results and bundle measurements remain historical evidence; frontend unit,
backend, contract, Mongo and unrelated StudyNotion browser suites were not rerun
for this final verification. Live production verification is still required.

## Delivered scope

Project NEET → mock selection → candidate onboarding → Proctored/Non-Proctored
mode → instructions/system check → exam → autosave/resume → submit → result.

Five lazy pages, a dedicated shell, StudyNotion navbar/Home entry points, original
sample content, protected APIs, server scoring and focused automation implement
this flow. No unrelated StudyNotion feature was intentionally rewritten.

Not implemented: mock recovery, external mock upload, OCR/OMR scanning, weak-topic
analysis, mistake bank, AI recommendations, personalized recovery questions,
spaced repetition, or Project NEET payments/subscriptions.

## Architecture, models and contracts

The backend lives under `apps/api/modules/project-neet`, with HTTP controller/
validation boundaries, services, repositories and pure domain logic. It composes
with the existing Express app, auth, trusted-origin controls, logging and indexes.
The frontend follows `app → pages → widgets → features → entities → shared`.
Exam and proctor features are composed at page level; the exam controller owns
side effects and React subscribes to its state.

| Model              | Stored purpose                                                                                          |
| ------------------ | ------------------------------------------------------------------------------------------------------- |
| `NeetMockTest`     | Publication, sections, duration, marks, modes, availability, policy                                     |
| `NeetQuestion`     | Original question/options/media and private keys/explanation                                            |
| `NeetAttempt`      | Owner/candidate, consent/checks, paper/timing, responses/sequences, active session, warnings and result |
| `NeetProctorEvent` | Deduplicated event metadata and severity, with 180-day TTL                                              |

The partial unique open-attempt index enforces one open attempt per user/test.
Model registration and the existing non-destructive index provisioning include
NEET. Attempt integrity uses single-document compare-and-set operations.

`packages/contracts/src/neet.js` exports strict candidate, test, attempt, exam
session, question, response, proctor event/policy/warning and result schemas,
including route params, queries and envelopes. It is exported through the
`@studynotion/contracts/neet` subpath and registered in generated OpenAPI.
Unknown fields, duplicate question writes, invalid sequences and arbitrary media
URLs are rejected. The dedicated `CAMERA_OBSTRUCTION` event is distinct from face
signals. Student DTOs have no answer-key/explanation field.

## API and browser routes

API prefix: `/api/v2/project-neet`.

| Method     | Relative endpoint                     | Access/purpose                         |
| ---------- | ------------------------------------- | -------------------------------------- |
| GET        | `/tests`                              | Public published mocks                 |
| GET        | `/tests/:testId`                      | Public instructions and policy         |
| GET, POST  | `/attempts`                           | Student-owned listing and registration |
| GET, PATCH | `/attempts/:attemptId`                | Owned state/pre-start updates          |
| POST       | `/attempts/:attemptId/ready`          | Instructions, consent and checks       |
| POST       | `/attempts/:attemptId/start`          | Start once, claim session              |
| POST       | `/attempts/:attemptId/session`        | Resume/explicit takeover               |
| PUT        | `/attempts/:attemptId/responses`      | Sequenced answer batch                 |
| POST       | `/attempts/:attemptId/heartbeat`      | Server time/session state              |
| POST       | `/attempts/:attemptId/proctor-events` | Bounded event batch                    |
| POST       | `/attempts/:attemptId/submit`         | Idempotent submission                  |
| GET        | `/attempts/:attemptId/result`         | Owner-only result                      |

Browser routes are `/project-neet`, `/project-neet/mocks`,
`/project-neet/mocks/:testId/start`, `/project-neet/attempts/:attemptId`, and
`/project-neet/attempts/:attemptId/result`. The last three use existing session
restoration, private-route and Student-role guards. Direct navigation, refresh,
owned resume and already-submitted redirect were exercised in browser tests.

## Lifecycle, timing, saves and results

The implemented state chain is
`REGISTERED → READY → IN_PROGRESS → SUBMITTING → SUBMITTED/AUTO_SUBMITTED`.
Unstarted registrations can become `EXPIRED`. Changing mode before start clears
readiness/consent. `TERMINATED` and `ADMIN_RECOVERY` are reserved contract values;
this phase does not ship corresponding admin workflows.

The server writes `startedAt`/`expiresAt` once. A monotonic `performance.now()`
anchor, server timestamps and RTT estimates smooth the display; normal heartbeats
run every 45 seconds. Refresh preserves the deadline and changing the local wall
clock cannot extend it. Input locks at estimated zero. The server rejects premature
timeout submission and all answer writes at/after its actual deadline. The former
network grace no longer permits late answers; new attempts report zero grace.
Lazy expiry/finalization requires no background worker to reject late edits.

Autosave coalesces per question, debounces 700 ms, bounds scheduling at three
seconds, batches at most 50, and allows one request in flight. Pending writes
persist by attempt/session and retry with backoff/Retry-After on reconnect.
Mongo applies only `incoming.seq > stored.seq`; equal writes are idempotent.
An older retry or acknowledgement cannot overwrite a newer accepted/local answer.
Offline answers arriving after expiry cannot count. Blocked storage falls back to
memory, so closing the tab can lose unsent answers.

Every explicit start/resume gets a fresh UUID even when session storage was cloned.
BroadcastChannel announces takeover and pauses the old tab; the server's current
session predicate protects saves/submission independently. Without the channel,
the old tab learns on its next save/heartbeat. The UI explains the takeover and
offers “Continue in this tab”; it never silently runs an automatic takeover loop.

Manual submit locks edits and drains pending saves for up to ten seconds. If
delivery fails, retry or explicitly submit saved answers only. Server expiry and
policy submission use accepted responses. The atomic transition to `SUBMITTING`
freezes answers; final scoring is stored once by a second conditional update.
Duplicate requests converge on one result, and a later reader completes an
interrupted finalization. Save-vs-submit includes a save before the freeze or
rejects it after; it cannot alter the final score.

Scoring uses the server paper/marking snapshot and private answer keys. Samples
use +4/−1/0; configuration controls marking. Marked answered questions score
normally. Missing keys prevent finalization. Results display candidate/test,
score/max marks, attempted/correct/incorrect/unanswered totals, subject breakdown,
submission reason and applicable warning summary. No client-computed replacement
score, key reveal or recovery analysis is added.

## Security, privacy and proctoring

All attempt queries authorize the authenticated owner; cross-user attempt/result
access returns 404. Account/Student gates precede input handling. Safe React text
rendering and restricted media URLs prevent question HTML execution. Questions
are explicitly projected without keys or explanations. Controller error logging
was restricted to error types to avoid logging candidate-bearing error messages.
No real credentials were introduced by this continuation; build/test settings are
synthetic. This is a scoped change review, not a new repository-wide secret scan.

Practice mode creates no media grant and requests no camera/microphone. Proctored
mode requires explicit consent followed by explicit device buttons. Server-side
consent/check requirements are enforced. After refresh, recorded consent permits
explicit reconnect; requests do not start automatically. Denial/retry and returning
to practice before starting have usable controls. Tracks are stopped on exit,
submission or supersession, including late permission resolutions after unmount.

Nginx now sends `camera=(self), microphone=(self)` in Permissions-Policy. This
permits same-origin requests; it does not bypass consent or browser permission.
No video, audio, screen frames or biometric identities are recorded or uploaded.
Candidate details are server-side attempt data; answer queues contain answer
writes, not candidate details. Event records have TTL retention; warning summaries
on attempts and candidate retention need a separate deployment data policy.

Visibility/focus/clipboard/fullscreen/track adapters and local camera/audio
detectors feed a throttled, bounded, deduplicated event queue. The server chooses
severity, repetition, cooldown and policy outcomes. Low brightness/variance emits
`CAMERA_OBSTRUCTION` only; it proves neither no face nor cheating. Experimental
native FaceDetector may supply sustained face counts where supported, degrading
to camera health on failure. The fragile head-pose heuristic was removed.
Sound levels do not establish speech or intent; brief sounds do not suffice.
Uncertain camera/audio/face signals cannot cause automatic submission, even with
unsafe stored overrides. Repeated configured browser violations may trigger
policy submission. Network loss never counts as misconduct.

## Rate limits

Public endpoints retain the legacy shared-IP limit (500/15 minutes). The bounded
attempt prefix bypasses that budget so a classroom NAT is not charged for every
student's ordinary autosaves against that small shared allowance. Its replacement
chain is coarse IP → auth → Student/account → user → user/attempt → validation.

| Budget                               | Limit               |
| ------------------------------------ | ------------------- |
| Coarse network ceiling               | 30,000 / 15 minutes |
| Authenticated user                   | 240 / minute        |
| User + attempt                       | 120 / minute        |
| Registration, additional user budget | 30 / hour           |

Unknown NEET paths terminate within the module. Middleware ordering and narrow
legacy-limiter exemption were tested. Redis supplies shared deployment budgets;
representative NAT load and multi-replica Redis behavior still need live checking.

## Landing, exam UI and accessibility

The landing retains an aspirational science/medical helix design, self-hosted
fonts, scoped tokens and a dedicated shell. It makes no claim to reproduce an
official future NEET interface or confirm NEET 2027 exam mode. Heavy Three.js is
dynamically loaded after idle, with immediate SVG/CTA content, capability/reduced-
motion fallback, pause-on-hidden/offscreen behavior and GPU/resource cleanup.
The normal StudyNotion initial bundle and the exam do not load the helix chunk.

The exam uses a calm light palette, readable question cards, large native radio
targets, subject navigation, five OMR states, a visible timer, save/network/proctor
status, offline and duplicate-session feedback, warning/submit dialogs and a locked
submitting state. No 3D or landing animation runs inside the exam.
Labels, native controls, focus handling, text/symbol state cues and responsive
layouts support keyboard use. Desktop/mobile screenshots were reviewed; the
practice exam passed the automated Axe checks in the recorded browser matrix.
Manual screen-reader and real-device checks remain outstanding.

## Tests added and historical verification

New coverage includes the exam controller, monotonic clock, queue sequencing and
retry, isolated persistence, tab coordination, all OMR states, candidate validation,
result rendering, consent/media adapters, camera-health classification, sustained
thresholds and event deduplication. Backend HTTP tests cover strict boundaries,
ownership, middleware order and policy guardrails. Real-Mongo tests cover stale/
duplicate writes, two submissions, timer/manual races, save/submit races, session
takeover, expiry, immutability, key secrecy, consent and event retry deduplication.

All commands ran from the repository root unless noted, using Node `24.19.0`.
`node` below denotes `/opt/homebrew/opt/node@24/bin/node`; npm/Playwright commands
used PATH `/opt/homebrew/opt/node@24/bin:/opt/homebrew/bin:/usr/bin:/bin`.

The following results are retained unchanged from the earlier verification run.
They are not presented as reruns against the final UI corrections.

| Actual command                                                                       | Recorded result                                                  |
| ------------------------------------------------------------------------------------ | ---------------------------------------------------------------- |
| `npm run test:frontend`                                                              | **219 passed**, 50 files                                         |
| `node --test apps/api/test/*.test.js`                                                | **558 passed**, 8 opt-in integration tests skipped; 566 total    |
| `npm run contracts:openapi:check`                                                    | Passed; generated contract document synchronized                 |
| `npm run contracts:test`                                                             | **18 passed**                                                    |
| `node scripts/run-neet-integration.mjs`                                              | **6 passed**, no skips; parent plus five subtests                |
| `node node_modules/@playwright/test/cli.js test --config playwright.neet.config.mjs` | **31 passed**, **2 skipped**                                     |
| `node node_modules/@playwright/test/cli.js test --config playwright.config.mjs`      | **21 passed**; existing catalog/learning matrix                  |
| `npm run lint`                                                                       | Passed, including architecture boundaries                        |
| `node node_modules/typescript/bin/tsc --project apps/web/tsconfig.json`              | Passed                                                           |
| `npm run build:local`                                                                | Passed as each Playwright preview prerequisite                   |
| `npm run build` with synthetic public settings below                                 | Passed; public production configuration validator and Vite build |
| `git diff --check`                                                                   | Passed                                                           |

The **two device-specific tests were intentionally skipped outside desktop
Chromium**: the fake-device permission scenario does not run in mobile Chromium or
WebKit. It passed on desktop Chromium. The 8 backend skips are existing opt-in
service suites plus the NEET opt-in wrapper; NEET was separately run explicitly
against its own disposable mongod. It did not use the developer's normal database.

The NEET browser matrix exercised practice onboarding/manual submit, timeout,
refresh/resume, interruption/reconnect, duplicate tabs, repeated confirmation,
already-submitted redirects, ownership denial, reduced-motion/non-WebGL fallback,
the normal Home entry and heavy-script isolation. Existing catalog and course
learning behavior passed their unchanged browser regression tests. Existing auth
unit/backend tests and session restoration were exercised; live identity-provider
sign-in was not tested.

Production build invocation (synthetic, nonfunctional public identifiers):

```bash
env PATH=/opt/homebrew/opt/node@24/bin:/opt/homebrew/bin:/usr/bin:/bin \
  VITE_DEPLOYMENT_TIER=production VITE_API_BASE_URL=/api/v1 \
  VITE_GOOGLE_CLIENT_ID=neet-build-fixture.apps.googleusercontent.com \
  VITE_RAZORPAY_KEY_ID=rzp_live_NeetBuildFixture000 \
  VITE_SUPPORT_EMAIL=support@neet-build.invalid \
  VITE_LEGAL_ENTITY_NAME=BuildFixture \
  VITE_LEGAL_ADDRESS='Build validation fixture' \
  VITE_LEGAL_JURISDICTION=India npm run build
```

The build emitted the >500 KB minified-chunk advisory for the separate helix
chunk. The frontend suite emitted a jsdom stylesheet parsing warning but passed.
Neither is hidden as a test failure; neither verifies production infrastructure.

Additional focused checks from the earlier documentation continuation, also
historical and not rerun during the final build/browser verification:

- From `apps/web`: `node ../../node_modules/vitest/vitest.mjs run src/features/neet-exam src/features/neet-onboarding src/features/neet-proctoring src/pages/neet-result/NeetResult.test.jsx` — **20 passed**, five files.
- `node node_modules/eslint/bin/eslint.js apps/web/src/entities/neet apps/web/src/features/neet-exam apps/web/src/pages/neet-landing apps/web/src/pages/neet-mocks apps/web/src/shared/hooks/useRevealOnScroll.js` — passed.
- `node scripts/check-architecture.mjs` — passed, 283 frontend/55 bounded backend source files.

## Fresh verification of the latest UI

The later changes span the landing/mock cards, reveal behavior, exam shell,
question card, timer and OMR palette. The complete **Project NEET suite only** was
run to cover these related flows. No full frontend/backend/contract/Mongo matrix
or separate StudyNotion browser suite was rerun.

Only these application/test corrections were necessary:

- `QuestionCard.jsx`: restore visible native radio controls; the hidden input's
  click target was intercepted by the decorative option key.
- `ExamShell.jsx`: restore a semantic `main` landmark around the exam content,
  resolving the existing Axe assertion's missing-landmark/region failures.
- `e2e/project-neet.spec.js`: match the current duplicate-tab heading and open/
  close the mobile OMR dialog before inspecting its answer state. Existing
  selection, disabled-state, score and accessibility assertions remain enabled.

The first completed browser run returned **19 passed, 12 failed, 2 skipped**:
answer selection timed out and the takeover heading assertion used old copy.
After those corrections, **28 passed, 3 failed, 2 skipped** exposed the landmark
and mobile-dialog issues. After the remaining minimal corrections, the final
complete NEET run passed:

| Current check                                                     | Final result                                                                             |
| ----------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `npm run build` with the synthetic public environment shown above | **Passed**, exit 0; production settings validator and Vite production build, 738 modules |
| Project NEET Playwright, desktop Chromium/mobile Chromium/WebKit  | **31 passed, 2 skipped, 0 failed**, exit 0, 45.3 seconds                                 |
| `npm run build:local`                                             | **Passed** as the final NEET browser run's fresh preview prerequisite                    |

The final browser command was:

```bash
env CI=1 PATH=/opt/homebrew/opt/node@24/bin:/opt/homebrew/bin:/usr/bin:/bin \
  node node_modules/@playwright/test/cli.js test \
  --config /tmp/neet-current-verify.config.mjs
```

Port 4185 was occupied, so a temporary config imported the repository's unchanged
NEET config and used a fresh preview on **4186**, with the same tests, projects,
assertions and worker count. Paths in that temporary config resolve back to this
repository. An installed-Chrome run stalled and was interrupted; `CI=1` selected
the config's already-supported Playwright Chromium for the completed runs.
The existing server was left untouched. Neither the occupied-port launch nor
the interrupted run is counted as successful verification.

The two skips remain the fake-device permission scenario on mobile Chromium and
WebKit; that scenario passed on desktop Chromium. All three practice flows,
including the Axe check, passed. Browser APIs use intercepted fixtures; real
backend races are covered by the historical Mongo run, not by these browser tests.

Final local logs are `test-results/neet-production-build-current.log` and
`test-results/neet-browser-current.log`. Failed completed runs are retained as
`neet-browser-current-before-fix.log` and
`neet-browser-current-before-landmark-fix.log` in the same directory. Test logs
and browser artifacts are ignored working files, not added source files.

The build still emits the advisory for the separate >500 KB minified helix chunk.
Synthetic public settings validate build configuration only; they do not verify
live providers or deployment infrastructure. Historical lint/typecheck and broad
suite results above are unchanged; those checks were not rerun in this final pass.

## Measured bundle impact

Prior measurement compared the implementation with Git baseline
`7b367c025898c8a5e655b6e3e21091210e2c3dbf` using production-mode Vite manifests and
the same installed dependency toolchain. Gzip totals sum compressed files across
static import closures; optional dynamic dependencies are measured separately.

- Normal StudyNotion initial JavaScript: **approximately +1.8 KB gzip**
  (239,445 → 241,285 gzip bytes; +1,840).
- Project NEET landing 3D dependency closure: **approximately 131 KB gzip**
  (131,592 bytes), separately loaded. Three.js is **not** in normal initial JS.
- Landing adds 5,819 gzip JS bytes over the shared initial closure before 3D.
- Shared initial CSS grew by 1,932 gzip bytes; Home's total JS closure grew by
  2,003 gzip bytes. Font/image assets are excluded from these JS figures.

These preserve the recorded findings. The gzip delta has not been remeasured
after the later presentation updates. Fresh browser request checks again passed
for normal Home and reduced-motion landing isolation; this does not constitute
a new comparative bundle measurement.

## Remaining limitations and live checks

Browser proctoring is deterrence, not OS lockdown or proof of cheating. Native
face detection is experimental, head pose is unavailable, audio is only a level
signal, and fullscreen/screen sharing vary by browser/device. The fake-stream test
does not validate real camera/microphone hardware, permission UX or OS settings.

No admin authoring UI, background expiry worker or offline timestamp attestation
ships here. Scoring still reads retained question IDs: do not edit/reseed active
papers or keys. Proctor event insertion and policy updates span documents; a crash
between them can leave a stored event uncounted without a replay worker. Define
candidate/attempt retention separately from event TTL. Local queues are not a
durable cross-device backup.

Before production release verify HTTPS/proxy/SPA refresh routing, trusted origins,
cookies/auth restoration, final Permissions-Policy headers, Mongo indexes/timeouts,
Redis budgets across replicas, classroom NAT load, logs/PII handling, TTL/retention,
stable sample content, real-device consent/denial/revocation/reconnection,
fullscreen/sleep/wake/screen sharing, realistic detector thresholds, keyboard and
screen-reader use. Test existing external providers with actual deployment
credentials. The latest UI's local build/browser verification is complete; the
historical comparative bundle measurements are not new release measurements.

## Final safety evidence

| Item                                          | Evidence / limitation                                                                                |
| --------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| Existing StudyNotion remains functional       | 21 existing browser regressions plus frontend/backend suites; no unrelated feature rewrite           |
| NEET remains isolated                         | Lazy routes, scoped shells, architecture checks; same-origin API integration only                    |
| Three.js excluded from normal initial JS/exam | Prior manifest closure plus fresh browser request checks; comparative byte measurements not repeated |
| Explicit consent before camera/microphone     | Media-grant unit tests, server consent integration and desktop permission browser test               |
| Non-Proctored requests no camera/microphone   | Unit tests and all three practice browser projects                                                   |
| Stale saves preserve newer answers            | Queue tests plus real-Mongo stale/equal-sequence tests                                               |
| Expired/submitted attempts immutable          | Real-Mongo atomic predicate/race tests                                                               |
| Duplicate submission idempotent               | Controller/browser double-submit plus concurrent/repeated real-Mongo submits                         |
| Keys absent before submission                 | Strict contracts, student DTO projections and real HTTP payload assertions                           |
| Cross-user attempt/result denied              | HTTP and real-auth real-Mongo ownership tests                                                        |
| PII/media privacy in deployed infrastructure  | Code constraints tested/reviewed; live traffic/log/retention verification outstanding                |

## File inventory

Paths below describe the preserved complete NEET work, including foundation files
from the earlier run. The documentation continuation added this report and finished
the module README; the final verification added only the three scoped file
corrections listed above. It did not recreate the implementation. Existing root
context files and `docs/ai-context/` were already untracked and left untouched.

Existing tracked files modified for NEET integration:

```text
.gitignore
package.json
package-lock.json
apps/api/app/registerRoutes.js
apps/api/middleware/rateLimiters.js
apps/api/package.json
apps/api/scripts/create-indexes.js
apps/api/test/app-composition.test.js
apps/web/nginx.conf
apps/web/package.json
apps/web/src/app/router/AppRouter.jsx
apps/web/src/pages/home/index.jsx
apps/web/src/shared/api/endpoints.js
apps/web/src/shared/styles/globals.css
apps/web/src/widgets/app-shell/AppShell.jsx
apps/web/src/widgets/navbar/model/links.js
packages/contracts/package.json
packages/contracts/openapi.json
packages/contracts/src/index.js
packages/contracts/src/openapi.js
packages/contracts/src/registry.js
```

Added files are listed below from the scoped working-tree inventory. Untracked
implementation files do not appear in ordinary `git diff --stat`; its line count
therefore understates the feature and is dominated by generated OpenAPI changes.

```text
apps/api/modules/project-neet/README.md
apps/api/modules/project-neet/config/defaults.js
apps/api/modules/project-neet/content/sampleMocks.js
apps/api/modules/project-neet/content/sampleQuestionBank.js
apps/api/modules/project-neet/content/seedSampleMocks.js
apps/api/modules/project-neet/domain/attemptStateMachine.js
apps/api/modules/project-neet/domain/errors.js
apps/api/modules/project-neet/domain/paper.js
apps/api/modules/project-neet/domain/proctorPolicy.js
apps/api/modules/project-neet/domain/scoring.js
apps/api/modules/project-neet/http/controller.js
apps/api/modules/project-neet/http/routes.js
apps/api/modules/project-neet/index.js
apps/api/modules/project-neet/models/NeetAttempt.js
apps/api/modules/project-neet/models/NeetMockTest.js
apps/api/modules/project-neet/models/NeetProctorEvent.js
apps/api/modules/project-neet/models/NeetQuestion.js
apps/api/modules/project-neet/models/index.js
apps/api/modules/project-neet/repositories/attemptRepository.js
apps/api/modules/project-neet/repositories/proctorEventRepository.js
apps/api/modules/project-neet/repositories/testRepository.js
apps/api/modules/project-neet/services/attemptService.js
apps/api/modules/project-neet/services/dto.js
apps/api/modules/project-neet/services/index.js
apps/api/modules/project-neet/services/lifecycle.js
apps/api/modules/project-neet/services/proctorService.js
apps/api/modules/project-neet/services/testService.js
apps/api/scripts/seed-project-neet.js
apps/api/test/project-neet-http.test.js
apps/api/test/project-neet.integration.test.js
apps/web/public/project-neet/media/physics-circuit-01.svg
apps/web/public/project-neet/media/physics-vt-graph-01.svg
apps/web/src/entities/neet/api/neetClient.js
apps/web/src/entities/neet/index.js
apps/web/src/entities/neet/lib/errors.js
apps/web/src/entities/neet/lib/format.js
apps/web/src/entities/neet/lib/markup.js
apps/web/src/entities/neet/lib/responseState.js
apps/web/src/entities/neet/lib/subjects.js
apps/web/src/entities/neet/model/useNeetResource.js
apps/web/src/entities/neet/ui/NeetMockCard.jsx
apps/web/src/entities/neet/ui/NeetResourceStatus.jsx
apps/web/src/entities/neet/ui/NeetRichText.jsx
apps/web/src/features/neet-exam/index.js
apps/web/src/features/neet-exam/lib/examStorage.js
apps/web/src/features/neet-exam/lib/tabCoordinator.js
apps/web/src/features/neet-exam/model/autosaveQueue.js
apps/web/src/features/neet-exam/model/examController.js
apps/web/src/features/neet-exam/model/neetExam.test.js
apps/web/src/features/neet-exam/model/serverClock.js
apps/web/src/features/neet-exam/model/useExamEngine.js
apps/web/src/features/neet-exam/ui/ExamShell.jsx
apps/web/src/features/neet-exam/ui/ExamTimer.jsx
apps/web/src/features/neet-exam/ui/QuestionCard.jsx
apps/web/src/features/neet-exam/ui/QuestionPalette.jsx
apps/web/src/features/neet-exam/ui/QuestionPalette.test.jsx
apps/web/src/features/neet-onboarding/index.js
apps/web/src/features/neet-onboarding/lib/candidateValidation.js
apps/web/src/features/neet-onboarding/neetOnboarding.test.jsx
apps/web/src/features/neet-onboarding/ui/CandidateDetailsForm.jsx
apps/web/src/features/neet-onboarding/ui/InstructionsPanel.jsx
apps/web/src/features/neet-onboarding/ui/ModeSelector.jsx
apps/web/src/features/neet-proctoring/index.js
apps/web/src/features/neet-proctoring/lib/adapters/pageAdapters.js
apps/web/src/features/neet-proctoring/lib/adapters/trackAdapter.js
apps/web/src/features/neet-proctoring/lib/browserSupport.js
apps/web/src/features/neet-proctoring/lib/detectors/audioActivity.js
apps/web/src/features/neet-proctoring/lib/detectors/faceSignal.js
apps/web/src/features/neet-proctoring/lib/mediaAccess.js
apps/web/src/features/neet-proctoring/model/proctorEventQueue.js
apps/web/src/features/neet-proctoring/model/proctorMediaStore.js
apps/web/src/features/neet-proctoring/model/useProctorMonitor.js
apps/web/src/features/neet-proctoring/neetProctor.test.js
apps/web/src/features/neet-proctoring/ui/MonitoringOverlay.jsx
apps/web/src/features/neet-proctoring/ui/ProctorConsentPanel.jsx
apps/web/src/features/neet-proctoring/ui/ProctorStatusBar.jsx
apps/web/src/features/neet-proctoring/ui/ProctorWarningDialog.jsx
apps/web/src/features/neet-proctoring/ui/SystemCheckPanel.jsx
apps/web/src/pages/neet-exam/index.jsx
apps/web/src/pages/neet-landing/index.jsx
apps/web/src/pages/neet-mocks/index.jsx
apps/web/src/pages/neet-onboarding/index.jsx
apps/web/src/pages/neet-result/NeetResult.test.jsx
apps/web/src/pages/neet-result/index.jsx
apps/web/src/shared/hooks/useRevealOnScroll.js
apps/web/src/shared/ui/AccessibleDialog.jsx
apps/web/src/widgets/neet-hero/index.js
apps/web/src/widgets/neet-hero/lib/helixScene.js
apps/web/src/widgets/neet-hero/lib/heroCapabilities.js
apps/web/src/widgets/neet-hero/ui/HelixFallback.jsx
apps/web/src/widgets/neet-hero/ui/HeroBackdrop.jsx
apps/web/src/widgets/neet-hero/ui/NeetHero.jsx
apps/web/src/widgets/neet-shell/index.js
apps/web/src/widgets/neet-shell/styles/projectNeet.css
apps/web/src/widgets/neet-shell/ui/ExamFocusShell.jsx
apps/web/src/widgets/neet-shell/ui/NeetFonts.js
apps/web/src/widgets/neet-shell/ui/NeetLogo.jsx
apps/web/src/widgets/neet-shell/ui/ProjectNeetShell.jsx
apps/web/test/neetFixtures.js
docs/project-neet/IMPLEMENTATION_REPORT.md
e2e/project-neet.spec.js
packages/contracts/src/neet.js
packages/contracts/test/neet.test.js
playwright.neet.config.mjs
scripts/run-neet-integration.mjs
```
