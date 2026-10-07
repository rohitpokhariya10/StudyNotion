# Learning StudyNotion from fundamentals to architecture

Follow the numbered order. Read the simple explanation first, then trace the actual source and an existing test. This guide describes this checkout rather than a generic MERN tutorial. The master map and FILE_MAP help locate unfamiliar symbols. Do not begin with the 2,000-line payment controller before understanding requests, models, sessions, and conditional updates.

For each lesson, explain the flow aloud, follow the important files, identify the authority for each decision, and predict one failure before reading its tests. Experiments that mutate data belong in guarded disposable environments; the audit itself makes no application changes.

## 1. JavaScript modules, npm and the workspace

| Question                         | Explanation                                                                                                                                                                                      |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| WHAT IS IT?                      | A module is a file with a clear public surface. Technically, this repository combines ES modules in the browser/tooling with CommonJS modules in the API/contracts, connected by npm workspaces. |
| WHY DO WE NEED IT?               | One install and shared contract package keep independently deployed web/API code aligned without copying validation logic.                                                                       |
| WHERE IS IT USED IN STUDYNOTION? | Root scripts invoke named workspaces; web uses @/ aliases; API uses require; contracts expose explicit subpaths.                                                                                 |
| HOW DOES IT WORK?                | Node/npm resolve workspace package links; Vite resolves browser aliases; index files re-export domain APIs. A directory name alone does not create a boundary.                                   |
| FLOW                             | root npm script → workspace script → entry module → imports → runtime                                                                                                                            |
| IMPORTANT FILES                  | package.json; package-lock.json; apps/api/index.js; apps/web/src/app/main.jsx; packages/contracts/package.json                                                                                   |
| WHAT IF WE REMOVE IT?            | Removing workspace wiring breaks package resolution and shared install/build assumptions.                                                                                                        |
| ALTERNATIVES                     | Separate repositories/packages or another monorepo tool; each requires explicit dependency/version coordination.                                                                                 |
| COMMON MISTAKES                  | Confusing a declared version range with the locked version; assuming every index file starts a server; reading old server/src paths from historical ADRs.                                        |
| INTERVIEW QUESTIONS              | What differs between require and import? What is an npm workspace? Why commit one lockfile?                                                                                                      |

## 2. React components, props, state and effects

| Question                         | Explanation                                                                                                                                                                                  |
| -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| WHAT IS IT?                      | A component turns data into UI. Technically, function components render JSX, props carry parent inputs, state triggers rerenders, and effects synchronize external systems.                  |
| WHY DO WE NEED IT?               | Reusable buttons/cards/forms keep screens understandable while effects manage browser or request lifecycle.                                                                                  |
| WHERE IS IT USED IN STUDYNOTION? | CourseCard presents domain data; forms own draft values; bootstrap mounts the component tree.                                                                                                |
| HOW DOES IT WORK?                | React renders from current props/state; events update state; effects need cleanup for subscriptions, files or asynchronous work. StrictMode deliberately exercises lifecycle assumptions.    |
| FLOW                             | props/state → render → user event → state update → render; effect → external resource → cleanup                                                                                              |
| IMPORTANT FILES                  | apps/web/src/app/bootstrap.jsx; apps/web/src/entities/course/ui/CourseCard.jsx; apps/web/src/shared/ui/ConfirmationModal.jsx; apps/web/src/features/course-authoring/ui/AddCourse/Upload.jsx |
| WHAT IF WE REMOVE IT?            | Without React the UI must be rebuilt with another renderer; removing cleanup can retain stale resources.                                                                                     |
| ALTERNATIVES                     | Native DOM, Vue or Svelte; concepts of state/ownership remain.                                                                                                                               |
| COMMON MISTAKES                  | Calling APIs during render; treating effect execution as exactly once; mutating state directly; forgetting object-URL cleanup.                                                               |
| INTERVIEW QUESTIONS              | What triggers a rerender? When is an effect appropriate? Why can StrictMode reveal duplicate work?                                                                                           |

## 3. Routing, layouts and protected navigation

| Question                         | Explanation                                                                                                                                                                    |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| WHAT IS IT?                      | A route chooses the screen for a URL. Technically, BrowserRouter maps history/location to nested route elements and Outlet composition.                                        |
| WHY DO WE NEED IT?               | Direct links, reloads, dashboards and lessons need stable URLs and consistent loading/access feedback.                                                                         |
| WHERE IS IT USED IN STUDYNOTION? | AppRouter lazily imports pages; PrivateRoute/OpenRoute/RoleRoute coordinate session and role UI; Nginx serves SPA fallback.                                                    |
| HOW DOES IT WORK?                | Route matching selects layout and child page; session-checking waits before redirect; sanitized return paths preserve user intent after login.                                 |
| FLOW                             | URL → AppRouter → guard → layout → page → feature                                                                                                                              |
| IMPORTANT FILES                  | apps/web/src/app/router/AppRouter.jsx; apps/web/src/features/authentication/routing/PrivateRoute.jsx; apps/web/src/shared/lib/routing/internalRedirect.js; apps/web/nginx.conf |
| WHAT IF WE REMOVE IT?            | Navigation/deep links fail unless replaced; removing a UI gate does not remove backend authorization.                                                                          |
| ALTERNATIVES                     | Another client router or server-rendered routing.                                                                                                                              |
| COMMON MISTAKES                  | Confusing UI guards with security; allowing external return URLs; forgetting history fallback; dropping search/hash on compatibility redirects.                                |
| INTERVIEW QUESTIONS              | Why are nested routes useful? Why must the server still authorize? What happens on direct-page reload?                                                                         |

## 4. Forms, validation and asynchronous HTTP

| Question                         | Explanation                                                                                                                                                                                   |
| -------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| WHAT IS IT?                      | A form gathers a draft; an HTTP request asks the server to act. Technically, react-hook-form/controlled state produce JSON or FormData sent through credentialed adapters.                    |
| WHY DO WE NEED IT?               | Users need immediate feedback, but the server must independently reject malformed or unauthorized data.                                                                                       |
| WHERE IS IT USED IN STUDYNOTION? | Contact/profile/course forms; shared Axios transport for v1; fetchBaseQuery for catalog/learning.                                                                                             |
| HOW DOES IT WORK?                | Validate draft, disable/reconcile pending interaction, await bounded transport, map error/success, update confirmed state. Multipart list fields are JSON strings; file fields remain binary. |
| FLOW                             | input → client checks → feature API adapter → HTTP → server validation → response/error → feedback                                                                                            |
| IMPORTANT FILES                  | apps/web/src/features/contact-support/ui/ContactUsForm.jsx; apps/web/src/shared/api/httpClient.js; apps/api/controllers/ContactUs.js; apps/api/middleware/upload.js                           |
| WHAT IF WE REMOVE IT?            | Without adapters, transport/session/error logic becomes duplicated; without server validation, client bypasses matter.                                                                        |
| ALTERNATIVES                     | Native fetch/manual form state, alternative form libraries, another runtime schema validator.                                                                                                 |
| COMMON MISTAKES                  | Trusting client prices/roles; forgetting credentials; swallowing errors; using JSON parser assumptions for multipart/raw webhooks.                                                            |
| INTERVIEW QUESTIONS              | Why validate twice? What differs between JSON and FormData? What does a timeout establish?                                                                                                    |

## 5. Redux, server state and caching

| Question                         | Explanation                                                                                                                                                                  |
| -------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| WHAT IS IT?                      | State is the data a screen needs now. Technically, Redux slices own client/session/authoring state while RTK Query owns fetched resources and cache lifecycles.              |
| WHY DO WE NEED IT?               | Shared identity/cart must remain consistent, and repeated catalog/learning requests benefit from controlled reuse.                                                           |
| WHERE IS IT USED IN STUDYNOTION? | auth/profile/cart/course reducers; catalogApi/learningApi caches; URL filter state; local video state.                                                                       |
| HOW DOES IT WORK?                | Components subscribe through react-redux; action reducers update state; query middleware keys requests and processes responses; confirmed completion patches learning cache. |
| FLOW                             | action/query → reducer or query middleware → store → subscribers → UI                                                                                                        |
| IMPORTANT FILES                  | apps/web/src/app/store/index.js; apps/web/src/app/store/rootReducer.js; apps/web/src/entities/cart/model/cartSlice.js; apps/web/src/entities/learning/api/learningApi.js     |
| WHAT IF WE REMOVE IT?            | Removing RTK Query needs replacement request/cache/race handling; removing Redux requires reorganizing shared state.                                                         |
| ALTERNATIVES                     | Context/reducers, Zustand, TanStack Query; URL state remains useful independently.                                                                                           |
| COMMON MISTAKES                  | Putting JWTs in localStorage; treating cached data as authorization; claiming Redis caches courses; assuming completion updates are optimistic.                              |
| INTERVIEW QUESTIONS              | Client versus server state? How is cache invalidation different from logout? Why keep playback URLs out of durable state?                                                    |

## 6. Express middleware and the request lifecycle

| Question                         | Explanation                                                                                                                                                                |
| -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| WHAT IS IT?                      | Middleware is a sequence of request checkpoints. Technically, Express passes req/res through ordered handlers until one responds or forwards an error.                     |
| WHY DO WE NEED IT?               | Cross-cutting security/parsing/logging must be applied consistently before business actions.                                                                               |
| WHERE IS IT USED IN STUDYNOTION? | createApp/registerRoutes build the stack; individual routers add auth/roles/validation/uploads.                                                                            |
| HOW DOES IT WORK?                | Global headers/request IDs/CORS run, raw webhook is handled before JSON parsing, ordinary requests pass limits/parsers/origin gates, then route middleware and controller. |
| FLOW                             | HTTP → app middleware → router → auth/role/input checks → handler → response → completion log                                                                              |
| IMPORTANT FILES                  | apps/api/app/createApp.js; apps/api/app/registerRoutes.js; apps/api/routes/LearningV2.js; apps/api/shared/http/errorHandler.js                                             |
| WHAT IF WE REMOVE IT?            | Removing or reordering middleware can lose security or break signature/body semantics.                                                                                     |
| ALTERNATIVES                     | Fastify hooks, native Node handlers, other web frameworks with equivalent gates.                                                                                           |
| COMMON MISTAKES                  | Parsing webhook JSON before verifying raw bytes; registering catch-all before a route; sending twice; logging secret-bearing URLs.                                         |
| INTERVIEW QUESTIONS              | Why does middleware order matter? How do next and error handlers differ? Why separate app construction from listen?                                                        |

## 7. MongoDB documents, references and indexes

| Question                         | Explanation                                                                                                                                                                          |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| WHAT IS IT?                      | A document stores one entity; a reference points to another. Technically, Mongoose adds schema validation/query APIs and declares MongoDB indexes, but does not create foreign keys. |
| WHY DO WE NEED IT?               | Courses, people, progress and immutable purchases have different storage and query needs.                                                                                            |
| WHERE IS IT USED IN STUDYNOTION? | Twelve model files; Course→Section→SubSection; User→Profile; Purchase and CourseProgress.                                                                                            |
| HOW DOES IT WORK?                | Controllers/repositories query models; populate/aggregation load related data; unique indexes resolve concurrent conflicts; operational index jobs deploy declarations.              |
| FLOW                             | validated intent → model query/update → Mongo index/constraint → document → DTO                                                                                                      |
| IMPORTANT FILES                  | apps/api/models/Course.js; apps/api/models/User.js; apps/api/models/CourseProgress.js; apps/api/models/Purchase.js; apps/api/scripts/create-indexes.js                               |
| WHAT IF WE REMOVE IT?            | Without unique indexes, application checks alone cannot prevent race duplicates; replacing Mongoose requires new persistence code.                                                   |
| ALTERNATIVES                     | Mongo native driver or relational tables/foreign keys with redesigned queries.                                                                                                       |
| COMMON MISTAKES                  | Treating refs as enforced integrity; relying on TTL for immediate expiry; storing money imprecisely; assuming an index speeds every aggregation.                                     |
| INTERVIEW QUESTIONS              | Why compound unique indexes? What can populate not guarantee? Why separate financial snapshots from current course price?                                                            |

## 8. Authentication, cookies and revocation

| Question                         | Explanation                                                                                                                                                                      |
| -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| WHAT IS IT?                      | Authentication answers who is calling. Technically, StudyNotion verifies a signed JWT cookie and reloads the User/sessionVersion for each protected request.                     |
| WHY DO WE NEED IT?               | Passwords must not travel/stay in ordinary application state, and logout/password changes must invalidate old sessions.                                                          |
| WHERE IS IT USED IN STUDYNOTION? | OTP signup, bcrypt login, Google identity, cookie helpers, session middleware and SessionBootstrap.                                                                              |
| HOW DOES IT WORK?                | Login verifies credentials then issues 12-hour HS256 cookie; browser sends it automatically; server checks claims plus current DB state. Version increments revoke older tokens. |
| FLOW                             | credentials → bcrypt/Google → safe user + cookie → protected request → JWT + DB checks                                                                                           |
| IMPORTANT FILES                  | apps/api/controllers/Auth.js; apps/api/utils/auth.js; apps/api/middleware/auth.js; apps/web/src/features/authentication/SessionBootstrap.jsx                                     |
| WHAT IF WE REMOVE IT?            | Without DB version checks, signed tokens remain valid until expiry even after intended logout/revocation.                                                                        |
| ALTERNATIVES                     | Opaque server sessions or other reviewed token formats; refresh-token design would be new work here.                                                                             |
| COMMON MISTAKES                  | Thinking Redux token is a JWT; trusting token role over DB; claiming refresh rotation exists; conflating HttpOnly with complete XSS immunity.                                    |
| INTERVIEW QUESTIONS              | JWT versus session store? Why sessionVersion? How do HttpOnly, Secure and SameSite differ?                                                                                       |

## 9. Authorization, ownership and product policy

| Question                         | Explanation                                                                                                                                                                   |
| -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| WHAT IS IT?                      | Authorization answers whether this caller may perform this action on this resource. Technically, roles combine with DB ownership/enrollment, lifecycle and policy predicates. |
| WHY DO WE NEED IT?               | An Instructor must not edit another instructor’s course; a Student must not open an unrelated lesson.                                                                         |
| WHERE IS IT USED IN STUDYNOTION? | Role middleware; Course.resolveCourseAccess; section/lesson membership; Purchase ownership; pending policy/deletion paths.                                                    |
| HOW DOES IT WORK?                | Authorize identity, role, target relationship and current state before mutation/signing; do not accept a body userId as authority.                                            |
| FLOW                             | authenticated User → role → ownership/enrollment → resource relationship → lifecycle permission → action                                                                      |
| IMPORTANT FILES                  | apps/api/middleware/auth.js; apps/api/controllers/Course.js; apps/api/controllers/Subsection.js; apps/api/controllers/payments.js; apps/api/utils/courseLifecycle.js          |
| WHAT IF WE REMOVE IT?            | Removing any target check can allow cross-account/resource actions even with a valid session.                                                                                 |
| ALTERNATIVES                     | Central policy/attribute-based authorization; future Entitlement access service after planned cutover.                                                                        |
| COMMON MISTAKES                  | Checking only Student role; treating CourseProgress or Purchase existence as entitlement; applying proposed ADR rules as current code.                                        |
| INTERVIEW QUESTIONS              | Authentication versus authorization? Why check a lesson belongs to its course? Why archive instead of delete sold content?                                                    |

## 10. Shared contracts, DTOs and API versions

| Question                         | Explanation                                                                                                                                         |
| -------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| WHAT IS IT?                      | A contract describes what may cross a boundary. Technically, strict Zod schemas parse input/output and generate a stable OpenAPI 3.1 artifact.      |
| WHY DO WE NEED IT?               | Public responses should not accidentally expose passwords, learner IDs or media signing metadata; clients need predictable shapes.                  |
| WHERE IS IT USED IN STUDYNOTION? | Catalog/learning v2 routes/services, packages/contracts and frontend response parsing.                                                              |
| HOW DOES IT WORK?                | Validate into res.locals, execute service, map DB fields into DTO, safeParse result, return requestId envelope; check artifact drift in CI.         |
| FLOW                             | unknown HTTP data → strict schema → domain input → result mapper → strict response → client cache                                                   |
| IMPORTANT FILES                  | packages/contracts/src/catalog.js; packages/contracts/src/learning.js; packages/contracts/src/openapi.js; apps/api/shared/http/validateV2Request.js |
| WHAT IF WE REMOVE IT?            | Without the boundary, accidental field leakage and response drift are easier; handwritten docs may diverge.                                         |
| ALTERNATIVES                     | JSON Schema/Ajv, generated clients, other runtime validators.                                                                                       |
| COMMON MISTAKES                  | Assuming a schema registers an endpoint; using generic progressUpdateRequestSchema for the live empty-body PUT; returning raw models.               |
| INTERVIEW QUESTIONS              | Why validate server output? What is a DTO? Why preserve v1 while introducing v2?                                                                    |

## 11. Catalog queries and cursor pagination

| Question                         | Explanation                                                                                                                                                                |
| -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| WHAT IS IT?                      | Pagination loads a useful slice instead of every course. Technically, keyset pagination uses the last sort key plus ID and a filter fingerprint.                           |
| WHY DO WE NEED IT?               | Catalog filters/search/sort need stable bounded results and predictable query work.                                                                                        |
| WHERE IS IT USED IN STUDYNOTION? | URL filter model, catalogApi, catalogCursor/service/repository, Course catalog indexes.                                                                                    |
| HOW DOES IT WORK?                | Normalize filters; validate cursor version/fingerprint; build Published aggregation; compute metrics before/after paging as needed; fetch limit+1; produce next cursor.    |
| FLOW                             | URL filters → strict query → cursor → Mongo aggregation → public DTO → accumulated cards                                                                                   |
| IMPORTANT FILES                  | apps/web/src/pages/catalog/index.jsx; apps/api/domains/catalog/catalogCursor.js; apps/api/domains/catalog/catalogRepository.js; apps/api/domains/catalog/catalogService.js |
| WHAT IF WE REMOVE IT?            | Without pagination work grows with the catalog; without tie-breaks or matching filters pages can skip/repeat unexpectedly.                                                 |
| ALTERNATIVES                     | Offset pagination for simpler small datasets; search service for different scaling needs.                                                                                  |
| COMMON MISTAKES                  | Calling the cursor an authentication token; changing filters but reusing old cursor; assuming computed popularity/rating is covered by price index.                        |
| INTERVIEW QUESTIONS              | Cursor versus offset? Why use ID as a tie-breaker? When must aggregation happen before limit?                                                                              |

## 12. Course/media lifecycle and protected delivery

| Question                         | Explanation                                                                                                                                                                               |
| -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| WHAT IS IT?                      | A published course must have usable lessons. Technically, lifecycle predicates validate metadata/curriculum while Cloudinary stores authenticated video and signs expiring delivery URLs. |
| WHY DO WE NEED IT?               | Uploading a file is not sufficient to safely publish/sell content or authorize playback.                                                                                                  |
| WHERE IS IT USED IN STUDYNOTION? | Authoring wizard, route-local uploads, courseLifecycle, imageUploader, VideoDetails.                                                                                                      |
| HOW DOES IT WORK?                | Validate file size/MIME/magic bytes; upload authenticated video; store private provider metadata; verify all content before Published; sign only after access and membership checks.      |
| FLOW                             | file → authorized multipart → validated upload → private metadata → publish readiness → entitled request → signed URL                                                                     |
| IMPORTANT FILES                  | apps/api/utils/imageUploader.js; apps/api/utils/courseLifecycle.js; apps/api/controllers/Subsection.js; apps/web/src/features/lesson-playback/ui/VideoDetails.jsx                         |
| WHAT IF WE REMOVE IT?            | Without lifecycle gates incomplete content can be sold; without media authorization URLs may expose paid lessons.                                                                         |
| ALTERNATIVES                     | Object storage plus signed CDN delivery/transcoding; a different media provider with equivalent privacy.                                                                                  |
| COMMON MISTAKES                  | Trusting extension alone; exposing provider IDs publicly; calling expiring URLs DRM; assuming local Compose proxy equals shared-task proxy.                                               |
| INTERVIEW QUESTIONS              | Why inspect bytes and MIME? How do signed URLs differ from sessions? Why preserve content after purchases?                                                                                |

## 13. Payments, money and idempotency

| Question                         | Explanation                                                                                                                                                                                              |
| -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| WHAT IS IT?                      | A payment confirmation must be trustworthy and repeatable. Technically, immutable Purchase snapshots, provider evidence, unique keys and conditional transitions prevent unsafe client/replay decisions. |
| WHY DO WE NEED IT?               | Clients can alter totals and callbacks can be duplicated or lost; money and access must remain tied to verified evidence.                                                                                |
| WHERE IS IT USED IN STUDYNOTION? | BuyCourse, capturePayment, verifyPayment, razorpayWebhook, fulfillPurchase/enrollStudent.                                                                                                                |
| HOW DOES IT WORK?                | Server prices courses in paise, reserves checkout, creates/reuses provider order, verifies signature/captured money, then writes enrollment; browser and webhook share fulfillment.                      |
| FLOW                             | course IDs/policy → Purchase snapshot → provider order → verified capture → enrollment → fulfilled                                                                                                       |
| IMPORTANT FILES                  | apps/web/src/features/course-purchase/api/coursePurchaseApi.js; apps/api/controllers/payments.js; apps/api/models/Purchase.js                                                                            |
| WHAT IF WE REMOVE IT?            | Without verification a forged callback could grant access; without idempotency repeated callbacks could duplicate work.                                                                                  |
| ALTERNATIVES                     | Another provider requires equivalent signatures, evidence and uncertainty handling; database transactions alone cannot include a remote payment provider.                                                |
| COMMON MISTAKES                  | Trusting UI amount; treating order-created as paid; retrying uncertain remote writes blindly; claiming exactly-once execution.                                                                           |
| INTERVIEW QUESTIONS              | What does idempotent mean? Why paise? Why can webhook and browser callback race safely?                                                                                                                  |

## 14. Refunds and resumable destructive work

| Question                         | Explanation                                                                                                                                                                                                                |
| -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| WHAT IS IT?                      | When a process can fail halfway, save enough state to resume. Technically, refund/deletion flows use persisted intermediate states, locks, audit evidence and retry-safe cleanup.                                          |
| WHY DO WE NEED IT?               | A timeout cannot prove a provider did not refund, and partial deletion should not restore normal account use.                                                                                                              |
| WHERE IS IT USED IN STUDYNOTION? | Learner refund request, Admin reconciliation, account deletionPending and locks.                                                                                                                                           |
| HOW DOES IT WORK?                | Persist intention/evidence before provider work; recover/poll existing refund before retry; after processed refund clean access and finalize. Deletion verifies fresh identity, restricts account, cleans then anonymizes. |
| FLOW                             | request → authorized state transition → persisted attempt → external result → cleanup → final state                                                                                                                        |
| IMPORTANT FILES                  | apps/api/controllers/payments.js::resolvePaymentReview; apps/api/controllers/profile.js::deleteAccount; apps/api/models/Purchase.js; apps/api/models/User.js                                                               |
| WHAT IF WE REMOVE IT?            | Without intermediate evidence, retries can duplicate financial actions or leave unrestricted half-deleted users.                                                                                                           |
| ALTERNATIVES                     | Durable workflow engine/outbox/saga design; still requires provider idempotency/evidence.                                                                                                                                  |
| COMMON MISTAKES                  | Removing access at refund request time; issuing a second ambiguous refund; hard-deleting retained financial history; treating 500 as proof nothing changed.                                                                |
| INTERVIEW QUESTIONS              | How do you handle unknown remote outcome? Why retain financial snapshots? What makes deletion resumable?                                                                                                                   |

## 15. Consistency audits and the Entitlement migration

| Question                         | Explanation                                                                                                                                                                                                                 |
| -------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| WHAT IS IT?                      | Duplicated facts can disagree. Technically, enrollment mirrors are denormalized projections; the proposed ledger is being introduced with non-authoritative sidecar writes and bounded recovery.                            |
| WHY DO WE NEED IT?               | Migration must preserve existing access and financial behavior while identifying crash-window divergence.                                                                                                                   |
| WHERE IS IT USED IN STUDYNOTION? | enrollment classifier/repository/report; Entitlement policy/evidence/repository/service/recovery; payment/deletion hooks.                                                                                                   |
| HOW DOES IT WORK?                | Audit reads unioned evidence without repairs. Sidecars write only eligible post-boundary episodes; recovery uses DB time, leases, revisions and evidence rechecks. Current readers still use legacy mirrors.                |
| FLOW                             | financial + legacy evidence → read-only classification; verified new purchase → sidecar → bounded recovery → future cutover (not implemented)                                                                               |
| IMPORTANT FILES                  | apps/api/domains/enrollment/enrollmentConsistency.js; apps/api/domains/entitlement/entitlementPolicy.js; apps/api/domains/entitlement/entitlementRecoveryService.js; docs/architecture/0010-entitlement-migration-design.md |
| WHAT IF WE REMOVE IT?            | Removing audit/recovery loses visibility/convergence; removing mirrors now breaks current access, despite new Entitlement rows.                                                                                             |
| ALTERNATIVES                     | Transactional redesign, chosen canonical mirror, or staged ledger migration with shadow reads and controlled backfill.                                                                                                      |
| COMMON MISTAKES                  | Automatically repairing ambiguous evidence; treating proposed replacement/backfill as shipped; using app wall clock for lease fences; logging private cursors.                                                              |
| INTERVIEW QUESTIONS              | Why non-authoritative sidecars? What does compare-and-set protect? Why is a progress record not access evidence?                                                                                                            |

## 16. Testing from pure logic to real browsers

| Question                         | Explanation                                                                                                                                                                             |
| -------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| WHAT IS IT?                      | A test gives evidence about one behavior under specified conditions. Technically, unit/component/HTTP/integration/E2E layers trade isolation for realistic boundaries.                  |
| WHY DO WE NEED IT?               | Auth/payment/lifecycle changes can break hidden invariants even if one happy-path screen works.                                                                                         |
| WHERE IS IT USED IN STUDYNOTION? | Node tests, Vitest/Testing Library, contracts, guarded Mongo/Redis integration, Playwright/axe.                                                                                         |
| HOW DOES IT WORK?                | Pure tests isolate decisions; component tests interact with UI; HTTP tests run middleware; integration uses real indexes/queries; E2E runs built SPA with mocks or prepared live stack. |
| FLOW                             | input/fixture → action → observable assertion → failure explains regression                                                                                                             |
| IMPORTANT FILES                  | apps/api/test/payment-security.test.js; apps/api/test/learning-v2.integration.test.js; apps/web/src/features/lesson-playback/ui/VideoDetails.test.jsx; e2e/learning.spec.js             |
| WHAT IF WE REMOVE IT?            | Without tests, regressions may be discovered only after payment/account changes reach users.                                                                                            |
| ALTERNATIVES                     | Other runners can cover similar layers; manual exploration complements but does not replace repeatable assertions.                                                                      |
| COMMON MISTAKES                  | Calling mocked DB tests integration; forgetting skipped suites; dropping real databases with test teardown; mistaking counts for coverage.                                              |
| INTERVIEW QUESTIONS              | What should be mocked? Why test duplicate-key races against real Mongo? What does an E2E mock fail to prove?                                                                            |

## 17. Docker, networking, health and process lifecycle

| Question                         | Explanation                                                                                                                                                                                  |
| -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| WHAT IS IT?                      | A container packages a process, not an entire deployment. Technically, separate network namespaces, workspace image builds, readiness and shutdown determine reliable routing and rollout.   |
| WHY DO WE NEED IT?               | The same application must start with dependencies, run without root and stop without silently abandoning cleanup.                                                                            |
| WHERE IS IT USED IN STUDYNOTION? | Two Dockerfiles, three Compose files, Nginx proxy, API bootstrap/dependency readiness.                                                                                                       |
| HOW DOES IT WORK?                | Build from root context; web/API have different runtime ports; local separate containers use service names internally and absolute browser API URL; release shared task uses loopback proxy. |
| FLOW                             | build → non-root process → dependency connect → ready → requests → unready/shutdown → cleanup                                                                                                |
| IMPORTANT FILES                  | apps/web/Dockerfile; apps/api/Dockerfile; compose.local.yml; apps/web/nginx.conf; apps/api/bootstrap/createServerLifecycle.js                                                                |
| WHAT IF WE REMOVE IT?            | Without packaging/network/health contracts, release routing and safe restart become manual and error-prone.                                                                                  |
| ALTERNATIVES                     | Other container platforms or process supervisors with equivalent requirements.                                                                                                               |
| COMMON MISTAKES                  | Thinking localhost means another container; treating liveness as full provider health; putting private env in images; editing runtime env to change a compiled VITE value.                   |
| INTERVIEW QUESTIONS              | Liveness versus readiness? What is a network namespace? Why mark unready before shutdown?                                                                                                    |

## 18. CI, deployment validation and evidence-based operations

| Question                         | Explanation                                                                                                                                                                                                                                    |
| -------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| WHAT IS IT?                      | CI checks a change; deployment makes an artifact run. Technically, workflows verify code/contracts/tests/images while platform release promotion remains outside this repository.                                                              |
| WHY DO WE NEED IT?               | Validated immutable artifacts and reproducible checks reduce configuration drift and make rollback reviewable.                                                                                                                                 |
| WHERE IS IT USED IN STUDYNOTION? | GitHub workflows, release-pair/image/recovery-host validators and deployment runbook.                                                                                                                                                          |
| HOW DOES IT WORK?                | Independent jobs install/check/test/build. Operators supply registry push, infrastructure, private inputs, backups/index/preflight and deployment; health/smoke evidence follows. Source supports a topology, not proof of a live AWS account. |
| FLOW                             | Git change → CI checks/builds → external promotion by digest → configured ingress/runtime → health/smoke evidence                                                                                                                              |
| IMPORTANT FILES                  | .github/workflows/ci.yml; .github/workflows/security.yml; scripts/validate-release-pair.mjs; docs/operations/deployment.md; compose.operations.yml                                                                                             |
| WHAT IF WE REMOVE IT?            | Without these gates, wrong frontend/provider/cookie pairs or mutable artifacts can be promoted unnoticed.                                                                                                                                      |
| ALTERNATIVES                     | Another CI/provider or deployment system; equivalent source/artifact/configuration evidence is still needed.                                                                                                                                   |
| COMMON MISTAKES                  | Inventing ECR/ECS/ALB provisioning from generic AWS knowledge; claiming CI deploys because it builds Docker; running mutation CLIs for inspection; copying secrets into docs.                                                                  |
| INTERVIEW QUESTIONS              | CI versus CD? Why use image digests? How do you prove a deployed topology? What is a rollback boundary for retained financial data?                                                                                                            |

## Reading milestones

1. After topics 1–5, trace the contact form and a catalog card without opening the payment code.
2. After topics 6–10, trace login through a protected request and explain why current User state overrides token role claims.
3. After topics 11–14, diagram checkout success, lost browser callback, late capture, pending refund and partial deletion.
4. After topic 15, explain the three different facts represented by Purchase, CourseProgress and Entitlement, and the two legacy access/listing mirrors.
5. After topics 16–18, distinguish source evidence, a passing local test, a CI run, an image artifact and a live deployment observation.

## How to answer a future file/function question

Start with its FILE_MAP entry and owning flow. Read the implementation and direct consumers, then model/schema/middleware dependencies. State input → processing → output, identify who is trusted, and show a happy path plus one failure/retry path. Say what is implemented, what is planned, and what cannot be established without a runtime observation. Exact paths and symbols matter more than framework buzzwords.
