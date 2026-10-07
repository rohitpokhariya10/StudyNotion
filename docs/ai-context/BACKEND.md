# Backend implementation

Paths are relative to `apps/api` unless specified. The API is Express 5 on Node, predominantly CommonJS.

## Startup and shutdown

`index.js` calls `config/loadEnvironment.js::loadEnvironment`, then constructs the runtime through `bootstrap/createApiRuntime.js`. Environment loading targets the API-owned file, with no historical root/server fallback. `config/env.js` validates required names, tier consistency, secrets' shape, origin/cookie posture, proxy count, provider choices, DB/TLS posture, bounded tuning, and the immutable entitlement boundary. It throws on invalid configuration before serving traffic.

`bootstrap/createServerLifecycle.js` connects MongoDB, connects/pings Redis, configures Cloudinary, then listens. Database readiness reflects driver events and connection state; Redis readiness reflects connection/ping state. Default HTTP request timeout is 120 seconds, keep-alive 5 seconds, maximum requests per socket 1,000, with compatible header timeout. Shutdown marks readiness false, closes HTTP, and attempts both DB and Redis cleanup, with a bounded force-exit timer (10 seconds by default). Signal and fatal-error handlers are registered by the entry point. Tests can build the app without listening or loading production resources.

## HTTP ordering

1. `app/createApp.js`: Express, no x-powered-by, simple query parser, reviewed trust proxy, Helmet, validated/generated request ID, completion logger, credentialed CORS.
2. Liveness/root/readiness endpoints are registered. Readiness requires Mongo/Redis and, in production, Cloudinary configuration plus no shutdown in progress. It does not ping every external provider.
3. `app/registerRoutes.js` registers `/api/v1/payment/webhook` with its limiter and raw JSON parser (256 KB) before normal body/cookie/origin middleware.
4. General v1 rate limiter; v2 envelope normalizer and limiter.
5. Strict JSON and URL-encoded limits (100 KB, 100 parameters), cookie parser, and trusted browser origin checks for unsafe API methods.
6. Learning v2 router before catalog v2 catch-all; then v1 auth/profile/course/payment/contact/admin routers.
7. Not-found and error handlers, with version-appropriate response shapes and private error logging.

This ordering is security behavior: moving raw webhook registration after JSON parsing changes signature input; moving uploads before auth wastes unauthenticated resources; changing router order can make learning unreachable.

## Requests, validation, errors

Most v1 controllers validate strings, IDs, allowed fields, ranges, and related documents manually. V2 routes use `shared/http/validateV2Request.js` and Zod. Parsed input is assigned to `res.locals.v2Input`; unknown fields and malformed IDs produce bounded, sanitized details. Learning auth/role gates run before input validation.

V1 compatibility responses vary across `data`, `user`, `order`, and other keys. V2 success is `{success:true, requestId, data}` and error is `{error:{code,message,requestId,details?}}`. `v2ErrorEnvelope.js` normalizes legacy middleware errors and preserves allowlisted session-control codes. `errorHandler.js` does not return raw DB/provider stacks. Request IDs accept a bounded safe incoming value or use a UUID. `utils/logger.js` redacts sensitive keys/string patterns and logs route templates instead of sensitive raw URLs/payloads.

## Business units and important functions

| Source                                          | Input → processing → output / caller                                                                                                                          |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `controllers/Auth.js`                           | Identity/password/OTP/policy input → validation, identity/account gates, User/Profile changes → safe session/user response and cookie; auth router            |
| `controllers/resetPassword.js`                  | Email or one-time challenge → generic issuance response or atomic password replacement/session revocation → login screen can be used                          |
| `controllers/Course.js`                         | Authoring metadata, IDs, files → ownership/lifecycle/media checks and mirror updates → course DTO; also public details, protected details/playback, archiving |
| `controllers/Section.js`, `Subsection.js`       | Course/section/lesson relationships → owner checks and curriculum mutation → refreshed curriculum; protected deletion and media cleanup                       |
| `controllers/payments.js`                       | Checkout/verified capture/refund/admin input → Purchase state machine and Razorpay calls → order, enrollment, history, or reconciliation result               |
| `controllers/profile.js`                        | Profile changes/account deletion/current identity → allowlist, reauthentication, locks/cleanup/anonymization → safe user/enrolled/dashboard DTO               |
| `controllers/Admin.js`                          | Paginated queue or target instructor decision → active pending-instructor compare-and-set and audit fields → approval result                                  |
| `controllers/Category.js`, `RatingandReview.js` | Category/review query or authorized creation → bounded queries/projections/unique constraint → public data                                                    |
| `controllers/ContactUs.js`                      | Bounded contact values → validation/escaped mail template → configured support recipient via Resend                                                           |
| `controllers/CatalogV2.js` → catalog service    | Validated filters/requestId → cursor/query/DTO pipeline → schema-validated page                                                                               |
| `controllers/LearningV2.js` → learning service  | Current user and course/lesson IDs → current access/curriculum/progress → canonical schema-validated state                                                    |

Exact endpoints, middleware, and inputs are in [API_MAP](API_MAP.md); end-to-end callers are in [FEATURE_FLOWS](FEATURE_FLOWS.md).

## Domain repositories

Catalog repository builds MongoDB aggregation with Published base filters, optional text search, category/level/language/price, rating/duration/enrollment calculations, stable sorting and ID tie-breaks, and conditional early paging. Rating/duration work runs before paging when filters/sort need it, otherwise after selection. Cursor fields are base64url JSON with version, filter fingerprint, sort key, and ID; fingerprint is a consistency check, not a secret authorization signature. Service fetches limit+1, emits an end cursor only when another page exists, maps public fields, and validates output. No count-all/Redis cache is involved.

Learning repository loads a course whose `studentsEnroled` includes the student, then related sections/lessons and progress. Mapper removes duplicate/missing curriculum references and ignores stale completed IDs. `markLessonComplete` uses unique learner/course upsert plus `$addToSet`, retrying the duplicate-key race; response is current canonical progress. Missing course is 404, existing unowned course 403. Progress is learning state, not access proof.

Enrollment consistency repository unions financial and legacy references and streams grouped pairs. Classifier explains divergence scenarios, malformed/duplicate evidence, and account-deletion exceptions. Service/report never mutate. Entitlement repository uses explicit private projections, revisions, compare-and-set conditions, DB time, leases, and bounded scan reports. Policy/evidence/service/recovery responsibilities are separated; [DATABASE](DATABASE.md) and [FEATURE_FLOWS](FEATURE_FLOWS.md) cover invariants.

## Rate limiting and providers

`middleware/rateLimiters.js` uses express-rate-limit with RedisStore when configured, or local memory for development. Production requires authenticated TLS Redis. Keys normalize/hash identities; IPv6 handling is explicit. API-wide limit is 500/15 minutes; payment is 20/user/minute; webhook 300/minute; login/OTP/signup/reset/contact use additional IP/email windows. Store errors fail closed. Redis is neither session storage nor a product cache.

`config/razorpay.js` builds the provider client. `utils/imageUploader.js` validates byte signatures/types, uploads images or authenticated video, signs protected playback URLs, deletes media, and cleans temporary files. `utils/mailSender.js` uses native fetch to Resend with a 10-second abort and per-send idempotency identifier. `utils/googleIdentity.js` bounds verification by a 10-second deadline. `utils/deadline.js` implements reusable timeout/abort behavior; a deadline alone does not prove cancellation of every SDK's remote action.

## Operational jobs

| Script                             | Effect / guard                                                                                                                                                                          |
| ---------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `create-indexes.js`                | All 12 models; `create` requires explicit migration confirmation, `verify` compares declared indexes; does not automatically drop extra indexes                                         |
| `backfill-security-fields.js`      | Explicit backup/confirmation gate; fills missing legacy session/approval/provider/deletion defaults, published timestamp, repairs missing Profiles; not historical Entitlement backfill |
| `provision-admin.js`               | Explicit confirmation/policy acceptance, strong identity validation, refuses an existing active admin/account; creates Profile/User with compensation                                   |
| `seed.js`                          | Guarded local/disposable or explicitly configured staging demo target; controlled identities/media and synthetic financial evidence; not a production import engine                     |
| `audit-enrollment-consistency.js`  | Read-only report, bounded samples and dry-run proposals; never automatic repair                                                                                                         |
| `preflight-production.js`          | Runtime config, declared indexes, data integrity/media readiness, enrollment/entitlement health; aggregate redacted report                                                              |
| `reconcile-entitlements.js`        | Status or explicit bounded recovery; no provider calls or legacy-access repairs                                                                                                         |
| `schedule-entitlement-recovery.js` | Immutable image assertion, private checkpoint, one batch/resume; external scheduler invokes it                                                                                          |

Preflight/audit use meaningful exit codes: healthy 0, warning 1, blocking 2, operational failure 3 where defined. Check each CLI's parser/help before invocation. No cron installation or queue daemon is supplied.
