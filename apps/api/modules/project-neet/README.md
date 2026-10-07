# Project NEET

Project NEET adds an independent sample-mock experience to StudyNotion:
catalog → candidate details → mode → instructions/consent/checks → exam → result.
The feature ends at results. It does not add payments, diagnosis, recommendations,
mistake banks, recovery programmes, OCR, or personalised practice.

The mock configuration is practice content, not an official future NEET interface.
The NEET 2027 format and mode are not asserted as confirmed.

## Architecture and ownership

The backend remains a modular monolith. `http/` validates strict shared contracts,
applies auth/role/rate gates, invokes `services/`, and validates outgoing DTOs.
`repositories/` contains Mongo queries; `domain/` holds scoring, paper construction,
state transitions, and proctor policy. `config/` supplies snapshotted defaults.

The frontend follows the existing layer boundaries:

- `entities/neet`: validated API client, public types/helpers, safe question text.
- `features/neet-onboarding`: candidate form, modes, instructions.
- `features/neet-exam`: controller, monotonic clock, autosave, storage, tab coordination, exam UI.
- `features/neet-proctoring`: explicit media grants, browser adapters, local detectors, event queue, warnings.
- `widgets/neet-shell`, `widgets/neet-hero`: scoped experience/exam palettes and landing art.
- `pages/neet-*`: five lazy route compositions; the exam page composes exam and proctor features.

Every attempt operation derives the user from the existing authenticated student
session. Repository predicates include `userId`; another student's attempt/result
returns 404. Candidate identity is never accepted as authorization. Controller
failure logs contain error types rather than candidate-bearing error messages.
Question DTOs explicitly project public text/options/media; `answerKey` and
explanations are absent from student payloads, including results in this phase.

## Models

| Model              | Responsibility                                                                                                                        |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------- |
| `NeetMockTest`     | Published test configuration, sections, marking, duration, modes, availability, proctor policy                                        |
| `NeetQuestion`     | Original question content, ordered options, restricted images, private answer key, revision                                           |
| `NeetAttempt`      | Owner, candidate snapshot, mode/consent/checks, timing, paper references, responses/sequences, active session, warnings, final result |
| `NeetProctorEvent` | Deduplicated bounded event metadata, server severity, TTL retention; no media                                                         |

The partial unique attempt index allows one open attempt per student/test.
Question/test indexes support publication and ordering. Proctor events have
deduplication and 180-day TTL indexes. `scripts/create-indexes.js` includes these
models. No operation in normal exam flow deletes a database or rebuilds indexes.

## Routes and contracts

API prefix: `/api/v2/project-neet`. Test reads are public; all attempt operations
require the existing Student session, current account state and policy acceptance.
Normal trusted-origin middleware remains in effect for browser mutations.

| Method | Path                                  | Behavior                                                      |
| ------ | ------------------------------------- | ------------------------------------------------------------- |
| GET    | `/tests`                              | Published mock summaries                                      |
| GET    | `/tests/:testId`                      | Instructions and disclosed proctor policy                     |
| GET    | `/attempts`                           | Owner's recent attempts; optional strict `testId` query       |
| POST   | `/attempts`                           | Register candidate; reuse the current open attempt            |
| GET    | `/attempts/:attemptId`                | Owner-only current state; applies pending expiry/finalization |
| PATCH  | `/attempts/:attemptId`                | Edit candidate/mode before start                              |
| POST   | `/attempts/:attemptId/ready`          | Accept instructions and validate consent/checks               |
| POST   | `/attempts/:attemptId/start`          | Atomically start once and claim a session                     |
| POST   | `/attempts/:attemptId/session`        | Resume/explicitly take over a running session                 |
| PUT    | `/attempts/:attemptId/responses`      | Atomic sequenced answer batch, at most 50 questions           |
| POST   | `/attempts/:attemptId/heartbeat`      | Session/expiry check and server timestamp                     |
| POST   | `/attempts/:attemptId/proctor-events` | At most 20 strict event records per request                   |
| POST   | `/attempts/:attemptId/submit`         | Idempotent manual/timeout submission                          |
| GET    | `/attempts/:attemptId/result`         | Owner-only server-scored summary                              |

`@studynotion/contracts/neet` supplies candidate, test, policy, attempt, session,
response, event, warning, result, parameter, query, and request/response schemas.
Unknown fields, duplicate question writes, invalid sequences, arbitrary media
URLs, and unsupported client submission reasons are rejected. OpenAPI is generated
from the shared registry.

Browser routes:

```text
/project-neet
/project-neet/mocks
/project-neet/mocks/:testId/start          Student guard
/project-neet/attempts/:attemptId         Student guard
/project-neet/attempts/:attemptId/result  Student guard
```

Auth restoration and existing route guards remain in place. The app shell hides
the normal navbar only under the exact Project NEET path prefix. The normal
navbar and Home link to the landing page. All five pages are lazy imports.

## Attempt state and timer

```text
REGISTERED → READY → IN_PROGRESS → SUBMITTING → SUBMITTED
                                      └─────→ AUTO_SUBMITTED
REGISTERED / READY → EXPIRED (registration window elapsed)
```

Changing mode before start clears readiness/consent/checks. The state contract
also reserves `TERMINATED`; this deliverable has no termination admin workflow.
`MANUAL_SUBMIT`, `TIME_EXPIRED`, and server-only `PROCTOR_POLICY` are implemented
submission reasons; `ADMIN_RECOVERY` is reserved, not a shipped admin action.

The server writes `startedAt` and `expiresAt` once. Refresh/resume never restarts
them. Every answer mutation requires `IN_PROGRESS`, the current session, owner,
and an unexpired `expiresAt`. The old network-grace configuration is retained for
compatibility but is not used to accept late answers; new sessions report zero
grace. `writesCloseAt` is a compatibility field, set equal to `expiresAt` on start.

The display clock anchors validated server time to `performance.now()`, with RTT
estimation. Heartbeats normally run every 45 seconds; reconnect/visibility return
also checks the server. Local wall-clock changes cannot extend the attempt.
The UI locks at estimated expiry and asks the server to finalize. If that estimate
is slightly early, the server refuses early timeout submission and the client
retries. The server is authoritative.

Expiry is applied lazily on requests. There is no background expiry worker.
This does not allow late edits: the atomic write predicate rejects them even when
no read has yet finalized an abandoned attempt.

## Autosave, offline behavior and submission

Each local write contains a question ID, selected option, review/visited flags,
bounded time field, and increasing sequence. The queue coalesces by question,
debounces 700 ms with a three-second scheduling bound, batches at most 50, and
permits one in-flight save. Pending writes persist under attempt **and session**
keys. Candidate details and media are not stored in this queue.

Mongo array filters apply a response only when `stored.seq < incoming.seq`.
Sequence 11 arriving before a retry of sequence 10 leaves 11 intact. Equal
sequences are idempotent, and the acknowledgement returns the canonical stored
response. The controller also ignores acknowledgements older than its local
state, so slow responses cannot revert the selected option on screen.

Offline changes remain queued. Reconnect resumes with bounded exponential
backoff and `Retry-After` support. Storage failure degrades to memory; closing
that tab can lose unsent changes. Offline data is not trusted evidence of when an
answer was chosen: an answer arriving after the deadline cannot count.

Manual submit locks input and waits up to ten seconds for pending saves. If they
cannot drain before expiry, the UI explicitly offers retry or submission of
already-saved answers only. Timeout/policy completion uses only accepted server
answers. Repeated or ambiguous submission requests converge on the same result.

The atomic `IN_PROGRESS → SUBMITTING` change freezes responses. Scoring reads
that frozen document, then a second compare-and-set stores the result once.
A later reader completes interrupted finalization. A save racing submit is either
included before the freeze or rejected after it; it cannot change a scored result.

## Scoring and result

Scoring runs on the server after responses freeze. It combines the attempt's
paper/marking snapshot with private question answer keys; missing keys prevent
finalization instead of silently awarding an incorrect result. Original sample
papers use +4 for correct, −1 for incorrect and 0 for unanswered. Configuration,
not the browser, controls these marks. Marking an answered question for review
does not exclude it from scoring.

The result DTO contains the candidate and test snapshot, score/max score,
attempted/correct/incorrect/unanswered totals, subject/section breakdown,
submission reason and applicable proctor warning summary. The page displays
those server values. It does not calculate a replacement score, expose answer
keys, or generate diagnostic/recovery recommendations.

## Duplicate tabs

Every explicit start/resume claim uses a fresh cryptographic UUID, including
windows with cloned `sessionStorage`. BroadcastChannel announces a takeover and
pauses the former tab immediately. The new tab first shows a resume confirmation
explaining that the timer continues and any other session will pause.

The server stores one `activeSessionId` and checks it on writes/submission.
BroadcastChannel is an enhancement, not authorization. Without it, the old tab
learns of supersession on its next save/heartbeat. Separate pending queues keep
one tab from erasing another tab's unsent writes. Resume reconciles local pending
sequences against the server before retrying. No automatic takeover loop runs.

## Proctoring, consent and browser limits

Practice mode never creates a media grant or requests camera/microphone/screen
access. Proctored mode requires explicit consent and separate device buttons.
The backend records consent version/time and requires the reported checks for
the configured devices. These client observations are not attestation.

After refresh, consent is restored from the owned server attempt, but device
requests still require explicit reconnect clicks. Permission denial gives browser
settings guidance and retry controls. Before starting, students can return to
practice mode. The running timer never pauses for device recovery.

Device streams stay in memory across onboarding→exam. Cleanup stops tracks on
leaving the experience, submission, or session supersession. Late-resolving
permission requests are stopped if their screen is no longer active.
Nothing records, uploads or persists video, audio, screen frames, or biometrics.

The web Nginx `Permissions-Policy` permits `camera=(self), microphone=(self)`.
This makes same-origin consented checks possible; browser permission and explicit
mode consent still gate access. Verify the final deployed response headers because
an upstream proxy can add a more restrictive policy.

Signals and safeguards:

- Visibility, focus, clipboard, fullscreen and track adapters collect events.
- Frame brightness/variance reports **CAMERA_OBSTRUCTION** only. It never
  reports no face, head direction, multiple people, or cheating.
- Experimental native FaceDetector, when available, can report sustained face
  counts. Construction/detection failures degrade to obstruction checks. Head
  pose is not inferred. Most browsers have no reliable face detector.
- Sound levels use a sustained window, adaptive noise floor and cooldown. They
  cannot identify speech, speakers, or intent. Brief sounds do not suffice.
- The server derives severity, repetition thresholds and cooldowns. Camera,
  microphone, face and audio uncertainty can never count toward automatic
  submission, even if stored policy overrides try to enable that behavior.
- Repeated configured browser violations can trigger server-side policy submit.
  Network loss never counts as misconduct. Event IDs deduplicate retries; client
  batching/throttling and server budgets bound spam.

Browser monitoring is deterrence and signal collection. It cannot lock the OS,
detect another physical device, or resist a modified client. Fullscreen and screen
sharing support varies, especially on mobile. Real device quality, browser/OS
permissions and assistive-technology behavior still need live testing.

## Rate limits

The legacy shared-IP 500/15-minute limiter still protects public NEET test reads.
Only the bounded `/project-neet/attempts` prefix bypasses it. Its replacement chain
is coarse IP ceiling → auth → Student/account gates → per-user budget →
per-user/per-attempt budget → strict input validation → controller.

- Coarse IP ceiling: 30,000 requests / 15 minutes.
- Authenticated user: 240 requests / minute across their attempts.
- User plus attempt: 120 requests / minute.
- Registration: an additional 30 requests / hour per user.

Unknown paths terminate within the protected module and cannot fall through to
unlimited routes. Redis provides shared production budgets; local development
can use the process-local stores. Validate school NAT sizing and Redis behavior
under deployment-specific load; the coarse ceiling remains finite.

## Local development and seeds

From the repository root, use Node 24 and npm 10+:

```bash
nvm use
npm ci
test -e apps/web/.env || cp apps/web/.env.example apps/web/.env
test -e apps/api/.env || cp apps/api/.env.example apps/api/.env
```

Set independent random `JWT_SECRET` and `OTP_SECRET` values of at least 32
characters in the private API environment. Start a local MongoDB and use a
deliberately chosen local database in `MONGODB_URI`. Then:

```bash
npm --workspace studynotion-backend run seed
npm --workspace studynotion-backend run seed:project-neet
npm run dev
```

Open `http://localhost:3000/project-neet`. The existing local demo seed creates
`student@studynotion.local` / `Student@123`; use the Student account for attempts.
The NEET seed creates original sample mocks/questions and required indexes; it
does not create users. Both seed CLIs have target/environment guards. No seed was
run against the developer's normal database during this continuation.

## Tests and builds

```bash
npm run lint
npm run typecheck
npm run test:frontend
npm run test:backend
npm run contracts:openapi:check
npm run contracts:test
npm run test:neet:integration
npm run test:neet:e2e
npm run test:e2e
npm run build:local
```

`test:neet:integration` needs a `mongod` binary on PATH (or `MONGOD_BIN`). It starts
its own process on an ephemeral loopback port, creates a fresh temporary data
directory and guarded `studynotion_neet_test_*` database, then stops that process.
The test refuses pre-existing collections. It never connects to the normal local
Mongo port. Diagnostic temporary files remain available after completion.

For separately provisioned **empty disposable** Mongo infrastructure:

```bash
STUDYNOTION_RUN_NEET_INTEGRATION=1 \
NEET_TEST_MONGODB_URI=mongodb://127.0.0.1:27029/studynotion_neet_test_unique_run \
node --test apps/api/test/project-neet.integration.test.js
```

NEET Playwright uses port 4185 and intercepted API fixtures; the existing catalog/
learning suite uses its existing config. Camera permission automation uses
desktop Chromium fake streams. These are not real hardware or live-provider tests.
The config uses installed Chrome locally and Playwright Chromium in CI, plus
WebKit. Provision the pinned browsers with `npx playwright install chromium webkit`
when needed. Use `--project neet-chromium` for the desktop-only device scenario;
that scenario is intentionally skipped in the mobile and WebKit projects.

`build:local` still produces a Vite production-mode bundle. `npm run build` also
requires validated deployment public settings. A build with synthetic public
settings only verifies build/config shape, not working Google/payment providers.

See [implementation and verification report](../../../../docs/project-neet/IMPLEMENTATION_REPORT.md)
for exact results, bundle measurements, edge-case evidence and remaining limits.

## Operational limits

There is no admin authoring UI, background expiry worker, offline answer timestamp
attestation, live media server, or recovery/analysis product in this phase.
Keep referenced question content/keys stable during running attempts; the existing
seed updates question revisions in place and scoring currently reads retained
question IDs. Do not edit or reseed active assessment content.

Proctor timeline insertion and policy-state updates span documents. A process
failure between them can leave a stored event uncounted; no crash-replay worker
ships here. Response/submission integrity instead uses a single attempt document.
Warnings embedded on attempts do not have the event collection's TTL; the 180-day
TTL applies to individual event records. Define attempt/candidate retention in the
deployment's data policy. Browser autosave is local convenience, not a backup.

## Deployment verification still required

Local automation does not establish production readiness. Before release, verify
the deployed SPA refresh routes, `/api/v2/project-neet` proxying, HTTPS, trusted
origins, cookie/session restoration and final camera/microphone Permissions-Policy.
Provision the NEET indexes without destructive index replacement; check Mongo
connectivity/timeouts, Redis-backed limiter behavior across replicas, and the
chosen school/coaching-centre NAT capacity under representative load.

Exercise consent, denied/revoked permissions, unplug/reconnect, sleep/wake,
fullscreen, optional screen sharing and reduced motion on real target devices.
Check warning thresholds in actual lighting/noise conditions and keyboard/screen
reader operation. Confirm that logs contain no candidate PII, no media leaves
the browser, and event TTL/attempt retention policies operate as intended.
Validate sample content and keep published question keys stable during attempts.
The original StudyNotion provider integrations require their existing live checks;
synthetic build settings do not verify those services.
