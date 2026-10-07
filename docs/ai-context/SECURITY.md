# Security mechanisms and evidence-supported limits

This is a source review and documentation audit, not a penetration test or a current dependency-advisory report. No issue was fixed. Absence of a mechanism does not by itself prove an exploitable vulnerability.

## Implemented controls

| Boundary                        | Concrete mechanism and sources                                                                                                                                                                                                 |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Passwords                       | `controllers/Auth.js`, `resetPassword.js`, `utils/validation.js`: bcrypt cost 12, strength and 72-byte bounds, old-password verification, dummy comparison for missing login identity                                          |
| Session authenticity/revocation | `utils/auth.js`, `middleware/auth.js`: HS256 algorithm allowlist, issuer/audience/expiry, HttpOnly cookie, DB sessionVersion plus active/approved/role on every request                                                        |
| OTP/reset                       | HMAC OTP with separate secret, attempts/application expiry + TTL; hashed random one-time reset token, atomic expiry/hash match, version revocation, fragment reset link                                                        |
| Google                          | `utils/googleIdentity.js` verifies audience/subject/verified email within deadline; account linking conflicts checked; deletion requires fresh identity proof                                                                  |
| Browser origin                  | `middleware/trustedOrigin.js` rejects untrusted Origin and cross-site Fetch Metadata for unsafe methods; `createApp.js` exact-origin credentialed CORS; production secure/SameSite/domain/site validation                      |
| Authorization                   | Server role middleware plus owning-instructor, enrolled-student, target-course/section/lesson, purchase-owner and Admin checks; UI guards are supplementary                                                                    |
| Lifecycle locks                 | User payment/deletion locks, pending deletion recovery gates, Purchase reconciliation lock and compare-and-set; account/curriculum destruction constrained by financial history                                                |
| Payments                        | Server snapshots/amounts, unique provider/reservation keys, timing-safe verification/webhook HMAC, provider captured status/order/amount/currency, late-capture review, persisted refund attempt evidence before provider call |
| Public data                     | Explicit safe user/course/review/catalog/learning DTOs, model hidden fields, strict v2 response schemas, no-store private responses; no raw Mongoose user document sent as a session                                           |
| Request bounds                  | JSON/form limits, strict v2 unknown-field rejection, ID/range/string checks, route-local upload and request rate limits                                                                                                        |
| Uploads                         | `middleware/upload.js`, `utils/imageUploader.js`: authenticated role-gated parsing, one-file/size limits, temp files/cleanup, MIME + magic-byte checks; restricted image/video formats; authenticated lesson delivery          |
| Media                           | Signed short-lived Cloudinary private URLs, ownership/enrollment and membership checked before signing, production rejects legacy public lessons                                                                               |
| XSS/HTML                        | React text rendering; `SafeMarkdown` skips HTML and restricts links/images; email template escaping; Nginx CSP and Helmet headers                                                                                              |
| Rate-limit storage              | Redis shared limits in production, hashed identities, IPv6 key normalization, bounded Redis calls, fail-closed store errors; in-memory only in local fallback                                                                  |
| Logging                         | `utils/logger.js`: sensitive-key/string redaction, safe error metadata, request IDs/route templates, aggregate private operation reports rather than personal IDs/cursors                                                      |
| Runtime configuration           | Strong independent secrets, TLS/host checks, placeholder rejection, provider/tier consistency, reviewed proxy hops, public/private build separation                                                                            |
| Containers/operations           | Digest pins, non-root web/API, minimal runtime copies; explicit migration/seed/admin confirmations; hardened recovery container and private non-symlink checkpoints                                                            |
| Repository/CI                   | Secret scan, dependency audit/review/CodeQL, pinned Actions, explicit environment exclusions and generated-artifact checks                                                                                                     |

## Important rate windows

General API: 500/15 minutes. Login IP: 30/15 minutes with failure-aware behavior; login identity: 10/15 minutes. Signup IP: 10/hour, identity: 3/hour. OTP IP: 10/15 minutes, identity: 5/15 minutes. Reset IP: 10/hour, identity: 5/hour. Contact IP: 10/hour, identity: 5/hour. Payment: 20 per authenticated user/minute. Webhook: 300/minute. Read exact limiter source if changing retries/proxy topology; incorrect trusted-proxy configuration changes IP identity and abuse controls.

## Supported risks, ambiguities, and operational limits

1. **Non-atomic enrollment mirrors:** Purchase/User/Course/Progress and Cloudinary operations do not share a transaction. Compensation/reconciliation/audit exist, but crash windows can leave access/listing/progress disagreements. Entitlement sidecars do not currently fix authorization or mirrors. Evidence: payment/refund/profile controllers and enrollment domain.
2. **Deferred entitlement cutover:** Policy/model terminology can look authoritative; actual lesson access is still Course membership. Treating an active Entitlement as a current public gate would misdescribe behavior. Audit model/historical migration/admin replacement work is unfinished.
3. **Browser origin defense has a boundary:** no synchronizer CSRF token. Requests with neither Origin nor hostile Fetch Metadata can proceed as non-browser clients, and webhook deliberately bypasses that gate in favor of its signature. Correct cookies/origins/ingress are essential.
4. **Signed URLs are capabilities:** a URL remains usable until expiry after issuance; it is not DRM or per-byte authorization. Backend revocation prevents future signing but does not invalidate every already issued URL instantly.
5. **Completion is not watch proof:** current lesson membership and enrollment are verified, but a client can request completion without demonstrating watched duration. This is a product trust boundary, not an authorization bypass to another course.
6. **Email reliability:** Resend deadlines and per-send idempotency exist, but no durable outbox/retry queue. Notification failure can occur after committed business state; receipt endpoint can send again for a valid fulfilled purchase under rate limiting.
7. **Configuration evidence versus live controls:** checked-in validation cannot prove TLS certificates, firewall rules, backups, alarms, provider webhook setup, or cloud secret-manager deployment. No live environment was audited.
8. **Type/test limits:** JS internals are not comprehensively checked by tsc. Real-service integration/browser/container/provider tests were not executed in this audit. No coverage percentage/threshold is configured. Source scanner checks current files, not Git history.
9. **Storage/category UI candidates:** unguarded legacy localStorage cleanup and authoring category ID/object comparisons may fail under particular browser/form states; no exploit or reproduced production incident is claimed.
10. **V1/v2 differences:** v1 financial DTOs include some provider identifiers that stricter future contracts omit. Scope/ownership is enforced, but generated v2 schemas do not retroactively validate all v1 responses. Idempotency header is optional server-side despite README wording.

## Secret-handling boundaries

Real `.env` files and private credentials were not read for this audit. Context documents list names and behavior only, and do not reproduce demo passwords, signing material, provider tokens, or private endpoints. Operational file permissions and placeholder checks are intentional. No application configuration, dependency, or security control was changed.

For a future fix, start from the relevant flow, characterize the exact failure, preserve state-machine/replay semantics, and run the matching existing tests. Do not “simplify” raw webhook ordering, sessionVersion gates, financial snapshots, or refund uncertainty handling in isolation.
