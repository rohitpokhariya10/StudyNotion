# Testing and audit verification

## Testing layers

| Layer                              | Source/configuration                                                                                                       | Protection and boundaries                                                                                                                                                                                               |
| ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Frontend unit/component            | 45 `apps/web/src/**/*.test.*` files; `apps/web/vite.config.ts`, `apps/web/test/setup.js`; Vitest + jsdom + Testing Library | Routing, safe navigation, session restoration/gates, cookie transport, contracts, cart/cache state, catalog/learning, policy/purchase/admin UI, forms and keyboard/focus behavior; requests/provider scripts are mocked |
| Backend unit/characterization/HTTP | 65 `apps/api/test/*.test.js` files including seven opt-in integration files; Node test runner                              | Auth/security/model/financial/lifecycle/domain/operational invariants; most DB/provider calls stubbed through injected dependencies/module cache; HTTP tests exercise an actual temporary loopback Express server       |
| Contract tests                     | Two `packages/contracts/test` files, 14 tests                                                                              | Strict public DTOs, no private leakage, stable primitives, canonical progress consistency and OpenAPI determinism                                                                                                       |
| Real-service integration           | Seven backend `*.integration.test.js` files; Compose/CI MongoDB 8 and Redis 7.4                                            | Catalog query plans/real HTTP/store, learning concurrency/indices, Mongoose model behavior, enrollment aggregation, entitlement persistence/Stage 2 convergence, production preflight                                   |
| Mocked browser E2E                 | `e2e/catalog.spec.js`, `learning.spec.js`; `playwright.config.mjs`                                                         | Seven declared journeys across three browser/device projects: built SPA, intercepted API responses, navigation/loading/retry/access/empty states, accessibility and screenshots                                         |
| Live-stack smoke                   | `e2e/live-stack.spec.js`, live config/environment/setup                                                                    | Four declared journeys across three projects: public pages, real student session/protected playback, instructor data, admin queues; requires separately running stack and prepared identities                           |
| Containers/config/security         | Workflows and backend configuration tests                                                                                  | Build env/release pair, proxy/cookie/TLS configuration, non-root images, health and exclusion boundaries; separate scanning/audit gates                                                                                 |

Test titles alone do not prove correctness; assertions and fixtures remain source of truth. The complete case index below connects every test file to its declared behavior. Parameterized/dynamic test counts exceed literal source titles.

## Commands and prerequisites

- `npm test` / `npm run test:frontend`: frontend only.
- `npm run test:backend`: Node backend suite; pretest checks OpenAPI drift; seven integration suites skip unless enabled.
- `npm run contracts:test` and `contracts:openapi:check`: schema behavior and generated artifact consistency.
- `npm run typecheck`: incremental TS foundation, not full JS type coverage.
- `npm run lint`: ESLint then architecture; `architecture:check` can run separately.
- `npm run verify`: contracts → format → lint → types → frontend → local build → backend. Does not include integration/E2E/container/live/provider checks.
- `npm run test:integration`: enables all seven explicit integration flags. Requires guarded disposable Mongo/Redis targets; does not silently use ordinary development/production databases.
- `npm run test:e2e`: builds local SPA and starts preview at 4173, request-mocks API; desktop Chrome, Pixel 7 and WebKit Safari projects. Local config selects installed Chrome channel; CI installs browser binaries.
- `npm run test:e2e:live`: does not start the stack. Requires explicit strong, distinct role identities for HTTPS non-loopback targets. Public target traces are disabled; local loopback may use demo fixtures. Never copy fixture credentials into documentation.

No Istanbul/V8 coverage report script or minimum coverage threshold is configured. Accessibility checks use axe and selected interaction assertions, not a full manual accessibility audit. There is no unit-test proof of actual provider settlement, email delivery, deployed TLS or cloud policies.

## Integration safety

`catalog-v2`, `learning-v2`, `enrollment-consistency`, `entitlement-models`, `entitlement-stage2`, `mongoose-models`, and `preflight-production` integration suites require their STUDYNOTION_RUN_* flags and specific *_TEST_MONGODB_URI names. Target validation requires allowed disposable database prefixes and local/explicit-safe topology, rejects production mode, and teardown drops only guarded databases. Catalog/learning additionally use guarded Redis test URLs/indexes. `compose.integration.yml` exposes loopback 27018/6380 for this purpose. Read the suite's setup/teardown before running against anything new.

Mocked tests intentionally replace database/provider behavior; integration tests validate actual indexes, aggregation and races they cannot prove. Neither should be described as the other.

## Fresh checks during this documentation audit

Run date: 2026-10-04, checked-out baseline `7b367c0`. Local Node **v26.3.0**, npm **11.16.0**; repository/CI target is Node 24. This is useful local evidence, not a replacement for supported-runtime CI.

| Check                                         | Observed result                                                                           |
| --------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `npm run contracts:test`                      | 14 passed, zero failed                                                                    |
| `npm run contracts:openapi:check`             | Passed; no artifact drift                                                                 |
| `npm run architecture:check`                  | Passed; 218 frontend and 29 bounded backend source files                                  |
| `npm run typecheck`                           | Passed                                                                                    |
| `npm run test:frontend`                       | 45 files, 199 tests passed; jsdom emitted one CSS stylesheet parsing warning              |
| `npm run test:backend` in sandbox             | 556 tests: 528 passed, 28 skipped, zero failed; 21 skips were blocked loopback HTTP cases |
| Backend rerun with authorized loopback access | 556 tests: **549 passed, seven opt-in real-service suites skipped**, zero failed          |

No Docker stack, real-service integration, Playwright, build/deploy/provider operation, data migration, seed, account action, or live environment inspection was run for this audit. Existing documentation's historical test runs are not relabeled as fresh evidence. Full repository lint/format/build was not run; application code was unchanged. Final documentation verification is recorded below.

Browser suites write screenshots under tracked `docs/audits/screenshots/*`; `live-global-setup.js` recursively clears the live screenshot directory first. That is another reason a docs-only audit should not casually run live E2E just to claim more checks.

## Final documentation verification

The audit produced all 18 requested documents: the root master map and 17 detailed files. The completed per-file index covers 491 meaningful text/configuration files, both generated metadata artifacts, and 62 asset paths, accounting for all 555 baseline tracked files. The master map links to every detailed document.

The previous run verified all 55 HTTP operations against route registrations, all 12 model names, and the three OpenAPI operations. Its documentation check found zero broken local links among 1,697 links and no omitted baseline tracked paths. Targeted Markdown formatting completed, and the repository secret scanner passed with 573 files checked. Final source-specific corrections covered the checkout policy field names, password-reset adapter ownership, AppShell composition, and seed service dependency.

The continuation reused those results without rerunning tests, rescanning source, or regenerating documents. It confirmed that all requested documents and master links are present and that the per-file index has 491 unique entries. No requested file remains missing. Only this verification record was updated during the continuation; application source was not modified. A pre-existing `.gitignore` edit observed on resumption was left untouched.

## Test-file and behavior index

The following lists every inspected test/spec file and its literal declared cases. Runtime parameterization and imported helpers add coverage beyond these titles. See FILE_MAP for imports/consumers and the source assertions for exact fixtures.

### [apps/api/test/admin-instructor.test.js](../../apps/api/test/admin-instructor.test.js)

- pending instructor listing is paginated and includes legacy applications
- approval records the admin audit and is idempotent
- rejection requires a reason, writes audit fields, and cannot reverse approval

### [apps/api/test/app-composition.test.js](../../apps/api/test/app-composition.test.js)

- index keeps the public compatibility bootstrap surface
- route registration preserves webhook, parser, limiter, and route order
- catalog error imports remain adapters to shared HTTP behavior
- shared terminal handlers preserve v1 and v2 boundary envelopes
- server lifecycle retains startup order, timeouts, and idempotency
- server shutdown attempts every dependency cleanup after a rejection

### [apps/api/test/auth-contract.test.js](../../apps/api/test/auth-contract.test.js)

- OTP, signup, and local login preserve the frontend contract
- authenticated responses expose deletion recovery state outside the user DTO
- first-time Google signup requires affirmative policy acknowledgement
- Google credential exchange returns the same authenticated user shape
- Google login rejects an email already linked to another subject
- login does not issue a session cookie when the safe user response cannot load
- logout preserves a valid cookie when revocation storage is unavailable
- public signup cannot provision an Admin account
- OTP attempts are bounded and the challenge stays non-replayable
- expired OTP challenges cannot create an account

### [apps/api/test/catalog-v2-contract.test.js](../../apps/api/test/catalog-v2-contract.test.js)

- catalog query normalizes search and chooses deterministic defaults
- catalog query accepts its maximum page size and validated filters
- OpenAPI scalar patterns match runtime case and cursor acceptance
- catalog responses reject cursors outside the request contract
- catalog query is closed and rejects invalid pagination, sort, and category

### [apps/api/test/catalog-v2-http.test.js](../../apps/api/test/catalog-v2-http.test.js)

- v2 catalog returns the stable success and request-id envelope
- v2 catalog validates search, pagination, category, and sort
- v2 catalog exposes standard 404 and internal error envelopes
- v2 parser, CORS, and origin failures retain the standard envelope
- v1 not-found response remains byte-compatible
- v2 unsupported charsets fail with a stable envelope
- invalid incoming request IDs are replaced before v2 envelopes are emitted
- v2 rate-limit failures retain the standard envelope

### [apps/api/test/catalog-v2-repository.test.js](../../apps/api/test/catalog-v2-repository.test.js)

- catalog repository begins with a Published-only canonical Course match
- all six catalog sorts have an explicit stable _id tie-break
- catalog projection excludes source enrollment, review, and curriculum data
- default indexed sorts page before expensive public DTO lookups
- computed filters run before paging so matches are not truncated

### [apps/api/test/catalog-v2-service.test.js](../../apps/api/test/catalog-v2-service.test.js)

- catalog service returns limit-sized pages and a filter-bound cursor
- catalog service returns a stable empty page
- catalog mapper exposes only the stable public card DTO

### [apps/api/test/catalog-v2.integration.test.js](../../apps/api/test/catalog-v2.integration.test.js)

- v2 catalog runs through real MongoDB indexes and Redis-backed middleware
- integration URI guards reject production-looking targets

### [apps/api/test/category-privacy.test.js](../../apps/api/test/category-privacy.test.js)

- public categories expose published counts without course IDs
- catalog course DTOs remove enrollment and reviewer identities
- top-selling catalog ranking is bounded inside MongoDB

### [apps/api/test/contact-security.test.js](../../apps/api/test/contact-security.test.js)

- contact submissions reject malformed PII without sending email
- contact submissions go to support with a safe user reply-to

### [apps/api/test/course-lifecycle.test.js](../../apps/api/test/course-lifecycle.test.js)

- a course without sections cannot be published
- publish readiness rejects dangling sections and empty sections
- every referenced section and lesson must exist before publishing
- publish readiness rejects insecure or invalid lesson metadata

### [apps/api/test/course-management-lifecycle.test.js](../../apps/api/test/course-management-lifecycle.test.js)

- new courses cannot bypass curriculum validation by starting Published
- editing a category moves the denormalized course reference
- a failed course save rolls category membership back
- course edits cannot publish incomplete or zero-priced metadata
- deleting a Published course atomically archives it
- a previously Published Draft is archive-only
- demoting a legacy Published course records its permanent lifecycle marker
- true deletion is limited to confirmed unsold drafts and cleans dependants
- course deletion requires the exact course name

### [apps/api/test/course-playback-security.test.js](../../apps/api/test/course-playback-security.test.js)

- an enrolled learner receives a fresh minimal signed playback response
- playback rejects non-entitled users and cross-course lesson IDs
- production playback never returns a legacy public media URL
- entitled course DTOs expose enrollment counts but no learner IDs
- instructor course DTOs never expose learner IDs

### [apps/api/test/course-progress-v1-characterization.test.js](../../apps/api/test/course-progress-v1-characterization.test.js)

- v1 progress retains its response and idempotent add-to-set behavior
- v1 progress rejects a non-enrolled learner before writing
- v1 progress rejects a lesson outside the enrolled course before writing

### [apps/api/test/create-indexes.test.js](../../apps/api/test/create-indexes.test.js)

- production index creation requires an explicit backup-first confirmation
- index creation requires confirmation in every runtime tier
- index creation rejects empty or mistyped runtime modes before connecting
- production index jobs require automatic index creation to remain disabled
- verify mode is read only and proves every declared index is present
- index verification fails closed when a declared index is absent
- index job errors are emitted through the redacting structured logger

### [apps/api/test/curriculum-deletion-security.test.js](../../apps/api/test/curriculum-deletion-security.test.js)

- published curriculum cannot be physically deleted during checkout
- adding an empty section atomically moves a Published course to Draft
- archived courses reject section and lesson mutations
- paid curriculum stays immutable even after it is moved to Draft
- previously Published Draft curriculum cannot be destructively removed
- unsold draft lesson deletion removes stale progress references

### [apps/api/test/database-config.test.js](../../apps/api/test/database-config.test.js)

- Mongo deadlines use supported client and Mongoose options
- Mongo connection signals immediately update readiness and emit safe log events

### [apps/api/test/enrollment-consistency-repository.test.js](../../apps/api/test/enrollment-consistency-repository.test.js)

- enrollment repository uses one bounded read-only aggregation shape
- repository mapping is strict, media-free, and preserves raw duplicate counts
- repository mapping keeps missing-user defaults ineligible
- repository mapping treats malformed security defaults as unknown and preserves financial integrity counts
- repository maps malformed references to bounded nullable discriminators
- repository bounds unexpected account types before classification
- empty immutable Purchase courses become blocking nullable evidence

### [apps/api/test/enrollment-consistency-service.test.js](../../apps/api/test/enrollment-consistency-service.test.js)

- consistency service returns a bounded healthy read-only report
- consistency service reports scenario-only pairs with financial evidence without changing severity
- consistency service distinguishes warnings, blocking issues, and dry-run truncation
- dry-run telemetry labels scenario-only evidence as sampled pairs
- consistency service reports orphaned progress without logging pair identifiers
- operational CLI parser is report-only and exit codes are stable
- operational CLI help exits successfully without MongoDB or an audit
- operational CLI rejects unknown flags even when combined with help
- operational CLI always disconnects after an audit and never exposes a write path
- operational failures are classified safely and disconnect after service failure
- operational CLI rejects missing or unknown report statuses and disconnects
- production preflight composes legacy findings with enrollment severity
- production preflight projects only bounded aggregate Entitlement status
- production preflight hard-caps enrollment evidence at five samples
- production preflight main maps invalid enrollment reports to operational exit 3
- production preflight main maps an invalid Entitlement report to operational exit 3

### [apps/api/test/enrollment-consistency.integration.test.js](../../apps/api/test/enrollment-consistency.integration.test.js)

- enrollment integration MongoDB guard rejects unsafe targets
- enrollment audit characterizes real MongoDB divergence without writes

### [apps/api/test/enrollment-consistency.test.js](../../apps/api/test/enrollment-consistency.test.js)

- commercial statuses are centralized and exclude in-flight and refunded purchases
- classifies mirror presence independently from commercial justification
- characterizes the documented A-F scenarios without treating every scenario as entitlement
- all and only qualifying immutable purchase histories justify mirrors
- refund_pending justification follows its persisted origin
- payment-review refunds cannot retain active course locks
- activeCourses is not required for fulfilled enrollment or manual fulfillment
- reservation activeCourses references remain valid for in-flight statuses
- missing reservation locks block every dry-run write
- captured paid purchases always block for manual reconciliation
- activeCourses references on inactive purchases are blocking residuals
- completed account deletion does not turn fulfilled history into a restoration proposal
- missing references are blocking and cannot propose restoring historical enrollment
- invalid roles never action User.courses ownership evidence
- ineligible Students never receive entitlement proposals
- missing persisted security defaults block restoration proposals
- unknown Purchase statuses block without inferring restoration or removal
- activeCourses outside the same immutable Purchase history is blocking
- malformed references fail closed without exposing raw values
- invalid account types are reported without interpolating persisted values
- raw Purchase array duplicates are blocking financial ambiguity
- pair-level ambiguity suppresses every otherwise concrete dry-run write
- duplicates and multiple qualifying purchases are reported in deterministic order
- refunded residual state is separate from the missing-ledger mismatch
- progress never grants entitlement and missing progress is only a warning
- dry-run proposals are deterministic, bounded, immutable, and never automatic
- strict pair-state validation rejects ambiguous and unbounded input
- the maximum supported raw count remains accepted

### [apps/api/test/entitlement-model.test.js](../../apps/api/test/entitlement-model.test.js)

- Entitlement declares the exact ADR identity, privacy, and schema options
- Entitlement declares only the seven approved named indexes
- Entitlement accepts each lifecycle state and provisioning work mode
- Entitlement rejects invalid lifecycle, provenance, recovery, and numeric shapes
- Entitlement accepts every valid replacement decision shape
- Entitlement JSON and object serialization remove every private field
- EntitlementOperationAudit declares exact privacy, immutability, and indexes
- EntitlementOperationAudit validates requested and terminal states
- EntitlementOperationAudit serialization always redacts actor and reason

### [apps/api/test/entitlement-models.integration.test.js](../../apps/api/test/entitlement-models.integration.test.js)

- Entitlement integration MongoDB guard rejects unsafe targets
- Entitlement persistence enforces lifecycle, privacy, indexes, and concurrency on MongoDB 8

### [apps/api/test/entitlement-policy.test.js](../../apps/api/test/entitlement-policy.test.js)

- publishes frozen allowlists from the approved ADR contract
- implements the exhaustive Entitlement lifecycle matrix
- accepts all four valid lifecycle state shapes and grants access only to valid active state
- rejects invalid core provenance, concurrency, and lifecycle shapes
- enforces provisioning schedule, manual-review, lease, and attempt invariants
- accepts the approved refund-terminal replacement shapes
- rejects incomplete, ineligible, or contradictory replacement state
- accepts exact-CAS lifecycle mutations and their required post-images
- lifecycle exits retain reconciliation evidence
- rejects mutation without exact revision, immutable provenance, or a legal predecessor
- validates every supported provisioning lease and schedule mutation
- rejects unsafe provisioning operational mutations
- allows only write-once one-way replacement mutations on terminal episodes
- rejects replacement reselection, terminal outcome rewrites, and unaudited late decisions
- implements the exhaustive private operation-audit transition matrix
- accepts requested and correctly paired terminal audit states
- rejects malformed audit request and terminal outcome shapes
- allows one exact requested-to-terminal audit finalization
- audit request evidence is immutable and terminal rows cannot reopen or change

### [apps/api/test/entitlement-purchase-evidence.test.js](../../apps/api/test/entitlement-purchase-evidence.test.js)

- exact Purchase evidence accepts one immutable line for every unique Course
- exact Purchase evidence normalizes native ObjectIds without recursion
- exact Purchase evidence rejects malformed bundle-wide and boundary evidence
- activation semantics preserve learner refunds and reject processed refunds
- processed-refund evidence requires exact origin-specific chronology
- persisted Purchase evidence rejects string references and partial line snapshots

### [apps/api/test/entitlement-recovery-service.test.js](../../apps/api/test/entitlement-recovery-service.test.js)

- recovery evidence activates only complete trusted fulfillment at Purchase.fulfilledAt
- recovery evidence keeps pending learner refunds active but rejects incomplete legacy mirrors
- processed refund and exact completed-deletion tombstone cancel provisioning without inference
- completed deletion revokes an active episode and retains its grant timestamp
- automatic failure releases use the exact ADR delay sequence and fifth-attempt handoff
- 24-hour handoff does not consume a recovery attempt
- automatic recovery rejects a persisted fifth attempt that remains scheduled
- age handoff uses MongoDB time for selection and the final server-age CAS
- claim is boundary and age fenced, uses a 60-second lease, and crash-after-claim leaves it durable
- successful worker finalization uses the exact live-lease fence
- worker refuses manual-review, aged, and malformed lease shapes before reading evidence
- finalization failpoint leaves the claimed lease untouched for expiry recovery
- expired claim consumes its existing attempt behind an exact expired-lease fence
- operational and catch-up reports are strict aggregates and omit cursors
- operational status samples MongoDB server time when no explicit time is supplied
- bounded catch-up keeps its canonical factory boundary and reports remaining pages
- one deadline below the lease stops the batch safely with the existing warning schema
- a deadline reached inside a recovery phase prevents every later mutation

### [apps/api/test/entitlement-repository.test.js](../../apps/api/test/entitlement-repository.test.js)

- internal repository reads explicitly select every private operational field
- transition CAS fences identity, revision, exact lease, validity, and deployment boundary
- automatic claim uses both inclusive deployment and exclusive 24-hour age fences
- aged recovery lookup uses an exact timestamp fence inside a bounded _id_ range
- inserts carry the same bounded database budget and privacy-safe comment
- boundary catch-up limits the raw indexed Purchase page before its lookup
- boundary scanner classifies every malformed post-boundary financial row in JavaScript
- operational status blocks each unresolved malformed financial row
- operational status rejects ObjectId-looking strings in persisted Entitlement references
- operational lifecycle status pages beyond 1,000 healthy rows and still finds a later mismatch
- operational status pages past a healthy raw Purchase page to a later mismatch
- operational status counts duplicate Purchase episodes as one lifecycle mismatch
- operational status keeps manual-review provisioning as a blocking condition
- bounded Purchase scan makes a completed-deletion active episode impossible to report healthy

### [apps/api/test/entitlement-service.test.js](../../apps/api/test/entitlement-service.test.js)

- reservation creates one scheduled episode per trusted Purchase line and replay converges
- reservation rejects ambiguous lines, ineligible Students, and another current Purchase
- reservation fails closed without a valid boundary and rejects historical Purchases
- activation reloads authoritative evidence, proves every legacy mirror, and exact-CAS activates
- activation replay requires the active grant timestamp to equal fulfillment
- activation cannot bypass manual review or the 24-hour recovery handoff
- activation never creates missing episodes and rejects incomplete legacy evidence
- activation rejects a refund that became provider-processed
- processed-refund terminalization rejects unknown provider or origin evidence without mutation
- processed refund terminalizes only the exact Purchase episode and preserves a newer Purchase
- boundary-qualified processed refund may create a deterministic terminal audit episode
- processed refund leaves an existing pre-boundary episode untouched
- a boundary learner-refund terminal episode never invents a replacement decision
- a later processed refund accepts an exact account-deletion terminal reason
- account deletion uses pending server evidence and terminalizes active and provisioning episodes
- account deletion skips malformed provenance and still terminalizes later exact episodes
- account deletion accepts only the exact persisted completed-deletion tombstone
- boundary catch-up creates a missing terminal episode only from an exact deletion tombstone
- catch-up requires the immutable paidAt boundary and returns bounded cursor counts
- non-authoritative wrapper catches every failure and logs no domain identifiers
- catch-up advances a protected cursor when its deadline expires mid-page
- non-authoritative wrapper hard-bounds a stalled operation at an outer deadline
- a shared deadline can expire between sidecar repository operations
- deadline checks fail closed before starting another repository operation

### [apps/api/test/entitlement-stage2.integration.test.js](../../apps/api/test/entitlement-stage2.integration.test.js)

- Entitlement Stage 2 integration MongoDB guard rejects unsafe targets
- Entitlement Stage 2 sidecars and recovery converge safely on MongoDB 8

### [apps/api/test/environment-loader.test.js](../../apps/api/test/environment-loader.test.js)

- environment loading uses the API-owned environment file
- environment loading delegates one quiet load without inspecting values
- importing operational modules does not load a repository environment
- operational CLI entry points load runtime logging after their environment

### [apps/api/test/google-identity-timeout.test.js](../../apps/api/test/google-identity-timeout.test.js)

- Google identity verification has a bounded deadline

### [apps/api/test/http-contract.test.js](../../apps/api/test/http-contract.test.js)

- health and public auth routes expose stable JSON envelopes
- protected payment routes reject an absent session before provider access
- unauthenticated multipart uploads are rejected before file parsing
- unsafe cross-site browser requests are rejected even without Origin
- the mounted Razorpay webhook verifies the untouched raw body

### [apps/api/test/image-reference.test.js](../../apps/api/test/image-reference.test.js)

- operations host gate accepts only immutable sha256 image references

### [apps/api/test/learning-v2-http.test.js](../../apps/api/test/learning-v2-http.test.js)

- learning v2 authenticates before parameter validation
- learning v2 rejects non-students and invalid route parameters
- learning v2 rejects unknown query fields and mutation bodies
- learning v2 routes reach the validated controller before the v2 catch-all
- learning v2 mounting leaves the v1 response byte-compatible

### [apps/api/test/learning-v2-mapper.test.js](../../apps/api/test/learning-v2-mapper.test.js)

- learning mapper preserves source order while removing duplicate and dangling relations
- learning mapper gives legacy labels and deterministic zero-lesson progress
- learning mapper supplies a usable title for a legacy unnamed extant lesson

### [apps/api/test/learning-v2-service.test.js](../../apps/api/test/learning-v2-service.test.js)

- learning service distinguishes a missing course from denied enrollment
- learning service returns only canonical current progress
- learning completion is repeat-safe and normalizes uppercase ObjectIds
- learning completion rejects a lesson from another course before persistence
- learning service fails closed when mapped source data violates the response contract

### [apps/api/test/learning-v2.integration.test.js](../../apps/api/test/learning-v2.integration.test.js)

- learning v2 enforces entitlement and idempotent progress with real services
- learning integration URI guards reject production-looking targets

### [apps/api/test/live-e2e-environment.test.js](../../apps/api/test/live-e2e-environment.test.js)

- live E2E defaults use the canonical loopback origin and local accounts
- loopback live E2E follows configured demo identities
- public live E2E targets fail closed without explicit credentials
- public live E2E targets use only injected live credentials

### [apps/api/test/logger.test.js](../../apps/api/test/logger.test.js)

- runtime logger derives level and metadata from an explicit environment
- structured logger emits stable JSON metadata and respects levels
- structured logger safely serializes errors and redacts secrets
- structured logger omits error causes and redacts common payment and identity fields
- error metadata omits messages, stacks, and provider payloads
- HTTP request logger records correlation, status, and duration once
- structured logger rejects unsupported levels

### [apps/api/test/media-upload.test.js](../../apps/api/test/media-upload.test.js)

- media validation accepts matching signatures and rejects MIME spoofing
- completed uploads remove their temporary file
- route cleanup removes unconsumed and incorrectly named upload fields
- private course-media links are signed, authenticated, and expiring

### [apps/api/test/model-validation.test.js](../../apps/api/test/model-validation.test.js)

- course and lesson schemas enforce bounded production inputs
- course, section, and lesson schemas maintain timestamps

### [apps/api/test/mongo-deployment.test.js](../../apps/api/test/mongo-deployment.test.js)

- production MongoDB validation accepts authenticated TLS SRV and replica-set URIs
- production MongoDB validation rejects missing auth, TLS, database, and loopback
- production MongoDB validation rejects TLS verification bypasses
- production MongoDB validation requires durable writes and primary reads
- an explicit deployment tier cannot bypass production runtime posture
- MongoDB jobs reject mistyped runtime posture instead of failing open
- production MongoDB validation rejects IPv4-mapped IPv6 loopback
- non-production disposable jobs do not require production MongoDB posture
- MongoDB operational jobs require an explicit runtime mode
- one-shot MongoDB jobs always disable implicit writes and bound deadlines

### [apps/api/test/mongoose-9-compatibility.test.js](../../apps/api/test/mongoose-9-compatibility.test.js)

- Mongoose 9 rejects numeric ObjectIds while preserving valid identifiers
- numeric public course identifiers retain the generic 400 response
- Mongoose 9 index declarations preserve semantics without background

### [apps/api/test/mongoose-models.integration.test.js](../../apps/api/test/mongoose-models.integration.test.js)

- core StudyNotion models preserve validation, indexes, relationships, and query behavior
- Mongoose integration URI guards reject production-looking targets

### [apps/api/test/payment-security.test.js](../../apps/api/test/payment-security.test.js)

- capture persists the server-priced purchase before creating an order
- checkout requires affirmative purchase-policy acknowledgement
- checkout rejects a policy snapshot the learner did not currently view
- checkout config exposes the server-owned policy contract
- an account-deletion lock prevents checkout creation
- checkout revalidation stops an order when a course was unpublished
- a concurrent created checkout reconciles by receipt and always responds
- a timed-out Razorpay create recovers the provider order by receipt
- a failed provider attempt logs allowlisted metadata and releases its idempotency key
- a repeated capture reuses the active Razorpay order
- verification ignores substituted client course IDs, survives logging failure, and is idempotent
- an activation-only sidecar failure preserves verification and legacy fulfillment
- one fulfillment deadline spans reservation and an exhausted activation phase
- signed Razorpay webhooks fulfill the server-owned purchase once
- webhook fulfillment and replay ignore an unexpected sidecar wrapper rejection
- manual fulfillment records one bounded entitlement activation
- a captured payment for an expired checkout is held without enrollment
- checkout expiry racing the payment claim is held for reconciliation
- fulfillment holds payment when the Student became inactive
- webhook enrollment failure reaches payment_review when error logging fails
- verification enrollment failure reaches payment_review when error logging fails
- manual fulfillment enrollment failure remains in review when error logging fails
- Razorpay webhook rejects a payload whose raw-body signature is invalid
- an admin refund resolves payment_review with an auditable provider ID
- an already-refunded Admin replay ignores a sidecar wrapper rejection
- a learner refund request is processed and revokes its entitlements
- a timely learner request remains valid when support processes it later
- an admin can reject a learner refund request without revoking access
- purchase history exposes refund eligibility and a usable purchase ID
- a pending provider refund stays queued until Razorpay processes it
- an ambiguous provider timeout is durably queued without issuing a second refund
- a failed provider refund requires an explicit audited retry
- processed refunds survive logging failure and retry idempotent entitlement cleanup before finalizing
- a stale refund preserves legacy access written by a newer paid Purchase

### [apps/api/test/preflight-configuration.test.js](../../apps/api/test/preflight-configuration.test.js)

- production preflight validates the complete runtime contract before data checks
- disposable preflight fixtures do not require production provider credentials
- production preflight cannot silently run with an omitted or mistyped runtime
- production preflight index verification is read only and reports missing indexes

### [apps/api/test/preflight-lesson.test.js](../../apps/api/test/preflight-lesson.test.js)

- production preflight validates published lesson metadata and duration
- production preflight rejects a materially future Entitlement boundary

### [apps/api/test/preflight-production.integration.test.js](../../apps/api/test/preflight-production.integration.test.js)

- production preflight integration MongoDB guard rejects unsafe targets
- production preflight reports enrollment states without mutating MongoDB

### [apps/api/test/production-cookie.test.js](../../apps/api/test/production-cookie.test.js)

- production session issue and clearing preserve the hardened cookie contract

### [apps/api/test/production-env.test.js](../../apps/api/test/production-env.test.js)

- production configuration accepts structurally valid provider settings
- runtime mode rejects NODE_ENV typos instead of disabling production safeguards
- production runtimes require an explicit deployment tier
- staging requires Razorpay test mode and may disable Google sign-in
- production requires matching live Razorpay and Google identifiers
- production configuration rejects copied example placeholders
- production public origins reject loopback and development hosts
- frontend-origin validation never prints credential-bearing input
- production configuration requires independently generated secrets
- production configuration requires an immutable Entitlement rollout boundary
- production Redis connections require TLS
- production Redis URLs reject ambiguous query parameters and fragments
- production data services require authentication, TLS, and non-loopback hosts
- production trust proxy accepts only bounded hop counts
- production network, cookie, and index posture must be explicit
- production cookies require valid names, domains, and secure delivery
- production refuses automatic indexes and invalid shared media folders
- configuration rejects unsupported structured log levels
- APP_URL remains the canonical app when multiple origins are allowed
- production rejects cross-site API and secondary frontend origins

### [apps/api/test/profile-security.test.js](../../apps/api/test/profile-security.test.js)

- profile input is normalized and rejects invalid dates and enum values
- enrolled course DTOs contain content and own progress without learner IDs
- account deletion anonymizes identity and removes learner-owned data
- account deletion requires the current local password
- account deletion is blocked while a payment is active
- a failed deletion cleanup remains pending and retries idempotently
- instructors with course history cannot self-delete
- administrator accounts cannot self-delete
- Google-only deletion rejects a stale credential
- instructor revenue comes from fulfilled purchase line items

### [apps/api/test/public-production-env.test.js](../../apps/api/test/public-production-env.test.js)

- public production configuration accepts HTTPS and live provider identifiers
- public staging configuration requires a test key and can hide Google sign-in
- public production configuration requires Google and a live payment key
- public deployment tier is explicit and enumerated
- public API configuration rejects loopback and development hosts
- public API configuration requires the canonical /api/v1 path
- optional staging Google configuration is still validated when supplied
- checked-in staging examples preserve the isolated test-mode contract
- Nginx rendering permits loopback HTTP only for local builds

### [apps/api/test/purchase-lifecycle.test.js](../../apps/api/test/purchase-lifecycle.test.js)

- stale checkout locks are expired within the requested account and course scope

### [apps/api/test/rate-limit-store.test.js](../../apps/api/test/rate-limit-store.test.js)

- rate-limit keys never expose email, user, or IP identities

### [apps/api/test/rating-contract.test.js](../../apps/api/test/rating-contract.test.js)

- rating GET without a query or body courseId returns 400

### [apps/api/test/reconcile-entitlements.test.js](../../apps/api/test/reconcile-entitlements.test.js)

- Entitlement recovery CLI parses only bounded one-shot options
- sidecar boundary accepts only an exact valid UTC ISO timestamp
- MongoDB runner timeouts stay strictly below the 60-second recovery lease
- --help is offline and needs no repository environment
- runner hard-binds the parsed boundary and never passes a mutable override
- mutation always requires exact confirmation while status remains read-only
- recovery rejects empty or mistyped runtime modes before connecting
- blocking operational status has exit code 2
- runner fails closed on missing boundary, invalid reports, and dependency errors
- runner rejects report fields that could leak identifiers or cursors

### [apps/api/test/recovery-host-validation.test.js](../../apps/api/test/recovery-host-validation.test.js)

- recovery host validation accepts only a private least-privilege file
- recovery host validation rejects provider secrets and permissive files
- recovery host validation mirrors the worker's exact MongoDB deadlines

### [apps/api/test/redis-deadline.test.js](../../apps/api/test/redis-deadline.test.js)

- Redis operations fail within their explicit deadline
- Redis applies the configured deadline to every runtime command

### [apps/api/test/release-pair.test.js](../../apps/api/test/release-pair.test.js)

- release pair accepts the matching same-origin staging contract
- release pair preserves the supported separate-origin contract
- release pair rejects tier, API origin, and public provider drift
- release pair independently enforces tier-specific provider contracts
- release pair requires Google to be disabled or identical on both sides
- release pair rejects every cookie policy across registrable sites
- release pair rejects non-canonical API paths and cross-site secondary origins

### [apps/api/test/reset-password-security.test.js](../../apps/api/test/reset-password-security.test.js)

- reset links keep the bearer token out of request paths and logs
- unknown reset emails receive the same generic success response
- a reset token is consumed atomically and cannot be replayed
- expired reset tokens fail without changing the session version
- password validation runs before consuming a reset token

### [apps/api/test/review-privacy.test.js](../../apps/api/test/review-privacy.test.js)

- public review feed omits stable reviewer, review, and course IDs

### [apps/api/test/schedule-entitlement-recovery.test.js](../../apps/api/test/schedule-entitlement-recovery.test.js)

- scheduled recovery configuration requires an absolute path and bounded batch
- checkpoint storage is exact-mode, strict-shape, and symlink refusing
- checkpoint replacement is atomic, mode 0600, and represents wraparound without deletion
- scheduled recovery advances and wraps the private cursor without returning it
- a failed recovery leaves the prior checkpoint unchanged
- scheduled command preserves runner exits and never prints cursor or checkpoint path
- operations Compose fixes one immutable image to one hardened process

### [apps/api/test/seed-safety.test.js](../../apps/api/test/seed-safety.test.js)

- demo admin provisioning is disabled in production
- the production deployment tier always refuses the demo seed
- production-style staging requires every independent disposable guard
- demo identities are injected and local media remains explicitly local
- local demo mode preserves the documented zero-config identities
- staging seed mode requires private operator-owned Cloudinary metadata
- synthetic demo Purchase is exact fulfilled sidecar recovery evidence
- normal local MongoDB seed targets remain allowed
- non-loopback targets are rejected without the exact disposable guard
- an explicitly confirmed disposable database can use a non-loopback host
- malformed and database-less MongoDB targets fail before connecting

### [apps/api/test/session-security.test.js](../../apps/api/test/session-security.test.js)

- session tokens carry a revocable version and use hardened cookies
- auth accepts the current session version and rejects it after revocation
- logout cleanup clears both current and legacy cookie names
- a pending deletion restricts the account while allowing a safe retry
- sessions without the current policy acceptance are gated except for recovery routes

### [apps/api/test/v2-request-validation.test.js](../../apps/api/test/v2-request-validation.test.js)

- route-local validation parses into locals without mutating Express query input
- strict v2 validation rejects unknown and invalid params, query, and body fields
- malformed encoded route parameters use the stable v2 envelope
- validation issue details are bounded and strip control characters
- the v2 normalizer replaces malformed error-shaped payloads
- the v2 normalizer replaces envelopes with a mismatched request ID
- the v2 normalizer preserves allowlisted session-control codes
- the v2 error-envelope factory fails closed on malformed internal input
- the v2 validator rejects unknown or missing source configuration
- status mapping covers reusable v2 client error classes

### [apps/web/src/app/App.test.jsx](../../apps/web/src/app/App.test.jsx)

- dashboard route normalization
- redirects the dashboard index to the profile
- redirects the legacy case-sensitive settings bookmark to its canonical path
- keeps deletion and policy gates ahead of the dashboard index

### [apps/web/src/app/composition.test.jsx](../../apps/web/src/app/composition.test.jsx)

- frontend application composition
- exposes the canonical application and shared primitives
- preserves every Redux reducer key
- clears enrolled learning data when the session ends

### [apps/web/src/app/router/AppRouter.parity.test.jsx](../../apps/web/src/app/router/AppRouter.parity.test.jsx)

- Router 8 public route parity
- maps %s without changing its URL
- Router 8 authentication redirect parity
- preserves pathname, search, and hash when an expired session reaches a protected route
- redirects an authenticated user away from an open-only route
- holds the current route while session bootstrap is still checking
- preserves the intended destination through the policy gate without looping
- allows a policy-pending session to stay on the acceptance route
- redirects a live protected URL after an authenticated session expires without looping
- Router 8 role and playback parity
- routes %s at %s to the authorized destination

### [apps/web/src/entities/cart/model/cartSlice.test.js](../../apps/web/src/entities/cart/model/cartSlice.test.js)

- cart persistence
- recovers safely from malformed browser storage
- derives totals from course data instead of trusting stored totals

### [apps/web/src/entities/catalog/api/catalogApi.test.js](../../apps/web/src/entities/catalog/api/catalogApi.test.js)

- catalog API configuration
- derives v2 without changing the existing v1 base
- keeps cookie credentials, timeout, reducer, and middleware API isolated
- serializes normalized filters and an opaque cursor
- never sends relevance sorting without a search query
- catalog response boundaries
- accepts the stable success envelope without coercing pagination
- rejects malformed DTOs and non-boolean pagination
- normalizes the compatible v1 category response
- presents only the safe API message and request identifier

### [apps/web/src/entities/course/api/courseApi.test.js](../../apps/web/src/entities/course/api/courseApi.test.js)

- lesson playback URL requests
- requests a fresh URL for the active enrolled lesson
- rejects malformed playback responses
- course lifecycle requests
- sends the exact course-name confirmation for archive or deletion

### [apps/web/src/entities/course/ui/CourseAccordionBar.test.jsx](../../apps/web/src/entities/course/ui/CourseAccordionBar.test.jsx)

- CourseAccordionBar
- uses an accessible button and exposes its expanded state

### [apps/web/src/entities/course/ui/CourseCard.test.jsx](../../apps/web/src/entities/course/ui/CourseCard.test.jsx)

- catalog course card
- links the stable DTO to the existing course-detail route
- does not invent optional metadata or ratings
- shows an accessible fallback when a thumbnail fails
- keeps the dormant v1 slider DTO compatible during migration

### [apps/web/src/entities/learning/api/learningApi.test.js](../../apps/web/src/entities/learning/api/learningApi.test.js)

- learning API boundary
- uses encoded V2 URLs with cookie credentials and a bounded timeout
- accepts only a self-consistent, media-free learning state for the requested course
- rejects inconsistent progress instead of coercing counts or percentages
- issues GET and PUT requests with cookies, then replaces cached progress with the server result
- passes a %i response through the shared session signal boundary

### [apps/web/src/entities/learning/lib/courseNavigation.test.js](../../apps/web/src/entities/learning/lib/courseNavigation.test.js)

- enrolled course navigation
- selects the first section that contains a real lesson
- returns null instead of constructing a route with undefined IDs

### [apps/web/src/entities/purchase/lib/paymentPresentation.test.js](../../apps/web/src/entities/purchase/lib/paymentPresentation.test.js)

- refund-window presentation
- requires override only before an out-of-window initial refund attempt
- does not require override for a timely learner request reviewed later
- does not require override when polling or retrying a provider attempt

### [apps/web/src/entities/user/lib/avatar.test.js](../../apps/web/src/entities/user/lib/avatar.test.js)

- local initials avatars
- creates a deterministic inline SVG without embedding the full identity
- supports a mononymous learner
- replaces legacy external DiceBear profile URLs locally

### [apps/web/src/entities/user/model/authSlice.test.js](../../apps/web/src/entities/user/model/authSlice.test.js)

- auth session state
- starts without a JavaScript-readable credential
- tracks a verified cookie session without storing the credential
- tracks a policy gate without treating it as a browser credential

### [apps/web/src/features/authentication/SessionBootstrap.test.jsx](../../apps/web/src/features/authentication/SessionBootstrap.test.jsx)

- SessionBootstrap
- dispatches session restoration once under StrictMode

### [apps/web/src/features/authentication/api/accountSecurityApi.test.js](../../apps/web/src/features/authentication/api/accountSecurityApi.test.js)

- account deletion requests
- sends the email and current password re-authentication contract
- keeps a failed cleanup authenticated in restricted recovery mode

### [apps/web/src/features/authentication/api/authApi.test.js](../../apps/web/src/features/authentication/api/authApi.test.js)

- post-login navigation
- returns a local login to the protected destination captured by PrivateRoute
- carries a sanitized destination through the policy gate
- rejects an unsafe destination and keeps deletion recovery authoritative
- keeps deletion recovery authoritative after Google sign-in
- preserves a protected destination across Google sign-in and policy acceptance
- resumes the saved path after policy acceptance unless deletion is pending
- development OTP delivery
- shows an API-provided development OTP in optimized local builds
- does not invent or display a development OTP when the API omits it

### [apps/web/src/features/authentication/model/sessionResponseIntegration.test.js](../../apps/web/src/features/authentication/model/sessionResponseIntegration.test.js)

- session response state integration
- clears stale session, profile, cart, and legacy persisted state on 401
- preserves a guest cart on an expected %s-session 401
- enters deletion-recovery mode without discarding the session
- enables the policy gate without logging out the current user

### [apps/web/src/features/authentication/routing/OpenRoute.test.jsx](../../apps/web/src/features/authentication/routing/OpenRoute.test.jsx)

- OpenRoute authenticated navigation
- preserves the protected destination during the login state transition
- carries only a sanitized destination through the policy gate

### [apps/web/src/features/authentication/routing/PrivateRoute.test.jsx](../../apps/web/src/features/authentication/routing/PrivateRoute.test.jsx)

- private account recovery routing
- redirects a deletion-pending session away from normal account pages

### [apps/web/src/features/authentication/ui/GoogleSignInButton.test.jsx](../../apps/web/src/features/authentication/ui/GoogleSignInButton.test.jsx)

- GoogleSignInButton redirect intent
- passes PrivateRoute's sanitized destination to Google login

### [apps/web/src/features/authentication/ui/LoginForm.test.jsx](../../apps/web/src/features/authentication/ui/LoginForm.test.jsx)

- LoginForm redirect intent
- passes PrivateRoute's sanitized destination to local login

### [apps/web/src/features/authentication/ui/PolicyAcknowledgement.test.jsx](../../apps/web/src/features/authentication/ui/PolicyAcknowledgement.test.jsx)

- PolicyAcknowledgement
- requires three separate affirmative acknowledgements and links policies

### [apps/web/src/features/authentication/ui/Template.test.jsx](../../apps/web/src/features/authentication/ui/Template.test.jsx)

- Template Google Identity deployment state
- removes the complete Google affordance when staging leaves it unconfigured
- shows Google Identity only for a configured client

### [apps/web/src/features/authentication/ui/VerificationCodeInput.test.jsx](../../apps/web/src/features/authentication/ui/VerificationCodeInput.test.jsx)

- VerificationCodeInput
- accepts six digits and advances focus
- filters a pasted code to digits and caps it at six characters
- moves backward and removes the previous digit on backspace

### [apps/web/src/features/course-filter/model/catalogFilters.test.js](../../apps/web/src/features/course-filter/model/catalogFilters.test.js)

- catalog URL filters
- normalizes valid filters and defaults searched lists to relevance
- drops invalid values and relevance sorting without a query
- does not send inverted ranges restored from a shared URL
- caps search text at the shared 120-character boundary
- serializes only non-default validated values
- keeps the legacy category slug convention
- treats price and duration ranges as one active filter each
- round-trips accessible duration presets

### [apps/web/src/features/course-purchase/api/coursePurchaseApi.test.js](../../apps/web/src/features/course-purchase/api/coursePurchaseApi.test.js)

- secure checkout creation
- sends a reusable idempotency key when capturing an order
- loads and validates the server checkout policy snapshot
- uses the authenticated purchase history pagination contract
- submits the exact learner refund confirmation and canonical reason

### [apps/web/src/features/course-purchase/lib/checkoutIdempotency.test.js](../../apps/web/src/features/course-purchase/lib/checkoutIdempotency.test.js)

- checkout idempotency
- reuses one key for retries of the same user and course set
- clears the completed checkout key

### [apps/web/src/features/course-review/ui/RatingInput.test.jsx](../../apps/web/src/features/course-review/ui/RatingInput.test.jsx)

- RatingInput
- exposes an accessible radio group and reports the selected rating
- prevents changes while disabled

### [apps/web/src/features/lesson-playback/ui/VideoDetails.test.jsx](../../apps/web/src/features/lesson-playback/ui/VideoDetails.test.jsx)

- VideoDetails
- loads protected playback separately and completes only after the video ends
- does not repeat completion for a completed lesson and supports rewatch
- keeps playback available and presents a safe completion failure with its request id
- offers an explicit playback retry and requests a fresh signed URL
- rejects an invalid route before requesting protected playback
- navigates across empty sections using the flattened valid lesson order

### [apps/web/src/features/payment-reconciliation/api/paymentReconciliationApi.test.js](../../apps/web/src/features/payment-reconciliation/api/paymentReconciliationApi.test.js)

- payment reconciliation operations
- loads the paginated admin queue
- sends exact confirmations and audited refund overrides
- uses the explicit learner refund rejection contract
- uses a separate exact confirmation for a failed provider refund retry

### [apps/web/src/features/payment-reconciliation/ui/PaymentReconciliation.test.jsx](../../apps/web/src/features/payment-reconciliation/ui/PaymentReconciliation.test.jsx)

- PaymentReconciliation
- offers an audited rejection without forcing every request to refund
- uses the explicit retry path when Razorpay marked a refund failed

### [apps/web/src/pages/catalog/Catalog.test.jsx](../../apps/web/src/pages/catalog/Catalog.test.jsx)

- Catalog
- shows a named, layout-matched initial loading state
- keeps the loading state while a changed query has no current data
- renders a semantic populated grid and end state
- writes validated search and filters to the URL and query cache key
- validates price ranges before navigation
- sanitizes inconsistent ranges restored from a shared URL
- uses server-side sort values and never enables relevance without q
- distinguishes an empty category from filtered no-results
- shows a safe request ID and retries an initial API error
- loads the next cursor page without replacing current cards
- announces loading-more while retaining the current grid
- renders category-not-found separately from transport errors

### [apps/web/src/pages/learning/LearningPage.test.jsx](../../apps/web/src/pages/learning/LearningPage.test.jsx)

- ViewCourse
- shows a named initial loading state and skips no valid course id
- renders the server learning state, nested lesson, mobile toggle, and review course id
- renders a non-retryable 403 access state without leaking a lesson
- shows a safe 5xx message and retries the same query
- falls back to a generic message for malformed failures
- renders a stable empty-course state without mounting a lesson outlet

### [apps/web/src/pages/legal/Legal.test.jsx](../../apps/web/src/pages/legal/Legal.test.jsx)

- legal pages
- renders the %s document and support contact

### [apps/web/src/pages/policy-acceptance/PolicyAcceptance.test.jsx](../../apps/web/src/pages/policy-acceptance/PolicyAcceptance.test.jsx)

- PolicyAcceptance redirect intent
- passes the saved internal destination through policy acceptance

### [apps/web/src/pages/purchase-history/PurchaseHistory.test.jsx](../../apps/web/src/pages/purchase-history/PurchaseHistory.test.jsx)

- PurchaseHistory
- submits an eligible refund request with the learner reason
- shows a reviewed rejection without claiming the refund window simply closed

### [apps/web/src/shared/api/apiErrorModel.test.js](../../apps/web/src/shared/api/apiErrorModel.test.js)

- shared API error model
- normalizes both Axios responses and RTK Query error envelopes
- does not expose an untrusted JavaScript error message

### [apps/web/src/shared/api/httpClient.test.js](../../apps/web/src/shared/api/httpClient.test.js)

- API connector session security
- sends cross-origin requests with the HttpOnly session cookie enabled
- removes legacy bearer credentials without dropping safe headers
- allows multipart uploads to use the backend's longer request window
- classifies authenticated session response %s without replacing its rejection
- ignores unrelated response %s

### [apps/web/src/shared/lib/routing/internalRedirect.test.js](../../apps/web/src/shared/lib/routing/internalRedirect.test.js)

- internal redirect sanitization
- preserves a canonical internal destination
- rejects unsafe or malformed redirect value %#
- uses only a validated internal fallback

### [apps/web/src/shared/ui/ConfirmationModal.test.jsx](../../apps/web/src/shared/ui/ConfirmationModal.test.jsx)

- ConfirmationModal
- announces itself as a dialog and contains keyboard focus
- closes on Escape and restores focus to the opener

### [apps/web/src/shared/ui/ErrorBoundary.test.jsx](../../apps/web/src/shared/ui/ErrorBoundary.test.jsx)

- ErrorBoundary
- shows a recoverable fallback and reports only sanitized context
- recovers when a route reset key changes
- offers a reload action

### [apps/web/src/shared/ui/IconBtn.test.jsx](../../apps/web/src/shared/ui/IconBtn.test.jsx)

- IconBtn
- defaults to a non-submitting button
- allows callers to opt into submit behavior

### [apps/web/src/shared/ui/SafeMarkdown.test.jsx](../../apps/web/src/shared/ui/SafeMarkdown.test.jsx)

- SafeMarkdown
- does not render instructor-controlled remote images or unsafe links

### [apps/web/src/widgets/curriculum-panel/ui/VideoDetailsSidebar.test.jsx](../../apps/web/src/widgets/curriculum-panel/ui/VideoDetailsSidebar.test.jsx)

- VideoDetailsSidebar
- announces exact progress and marks the current and completed lessons
- supports keyboard section disclosure and an explicit empty-section state
- focuses and traps the mobile dialog, closes it, and preserves review behavior

### [apps/web/src/widgets/navbar/ui/Navbar.test.jsx](../../apps/web/src/widgets/navbar/ui/Navbar.test.jsx)

- Navbar
- renders an empty catalog state when the API response has no data array
- provides keyboard-accessible mobile navigation and anonymous actions

### [e2e/catalog.spec.js](../../e2e/catalog.spec.js)

- catalog reaches the existing public course-detail route
- catalog retains cards while loading the next cursor page
- catalog search has a recoverable no-results state
- catalog exposes stable loading, filter, empty, error, and missing states

### [e2e/learning.spec.js](../../e2e/learning.spec.js)

- learner navigates the curriculum and saves canonical progress
- learning exposes loading, retryable failure, and access-denied states
- learning has a clear empty-curriculum state

### [e2e/live-stack.spec.js](../../e2e/live-stack.spec.js)

- live public home, catalog, and course detail are connected
- live student session returns to enrollment and opens protected playback
- live instructor workspace loads owned course data
- live admin workspaces expose empty operational queues

### [packages/contracts/test/contracts.test.js](../../packages/contracts/test/contracts.test.js)

- common wire primitives use exact request IDs and integer minor money
- pagination and parameter contracts reject duplicates and unknown fields
- success and error envelopes are strict and carry validated request IDs
- auth and profile DTOs reject credentials, locks, and raw user fields
- course and learning DTOs keep learner identities and media metadata out
- review contracts do not expose reviewer, review, or course identifiers
- commerce and admin contracts keep provider and internal audit data scoped out
- root and all domain subpaths load while preserving catalog identity
- the shipped catalog contract retains legacy image-string compatibility
- OpenAPI 3.1 is deterministic and generated from every registered schema

### [packages/contracts/test/learning-v2.test.js](../../packages/contracts/test/learning-v2.test.js)

- learning v2 accepts canonical course state and direct progress responses
- learning v2 rejects inconsistent curriculum and progress state
- learning v2 DTOs reject identities and protected-media metadata
- learning v2 route boundaries are strict and mark-only
