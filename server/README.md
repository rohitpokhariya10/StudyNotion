# StudyNotion backend

## Local setup

1. Ensure MongoDB is running locally on `127.0.0.1:27017`.
2. Copy `.env.example` to `.env` if `.env` is missing.
3. From the repository root, install every workspace with `npm ci`.
4. Add demo categories, courses, and users with
   `npm --workspace studynotion-backend run seed`.
5. Start the API with `npm --workspace studynotion-backend start`.

The root `package-lock.json` is the only dependency lockfile. It installs this
API together with the JavaScript/Zod `@studynotion/contracts` workspace used by
the v2 catalog route.

The API runs at `http://localhost:4000` and the frontend uses
`http://localhost:4000/api/v1`.

## Demo accounts

- Admin: `admin@studynotion.local` / `Admin@123`
- Instructor: `instructor@studynotion.local` / `Instructor@123`
- Student: `student@studynotion.local` / `Student@123`

The local setup works without Cloudinary, Resend, or Razorpay credentials. Media
uploads, outbound email, and payments stay disabled until their values are added
to `.env`. In development, signup OTPs are shown by the frontend so SMTP is not
required.

## Instructor approval workflow

Public signup can create only Student or Instructor accounts. New instructors
start in `Pending` state and cannot authenticate until an admin reviews them.
The admin dashboard exposes `/dashboard/instructor-approvals`, backed by these
cookie-authenticated, Admin-only endpoints:

- `GET /api/v1/admin/instructors/pending?page=1&limit=20`
- `PATCH /api/v1/admin/instructors/:instructorId/approve` with an optional
  `{ "note": "..." }`
- `PATCH /api/v1/admin/instructors/:instructorId/reject` with a required
  `{ "reason": "..." }`

Each decision records its state, reviewing admin, review time, and note. Rejecting
an application also deactivates the account; both decisions increment the session
version. Repeated delivery of the same decision is idempotent, while attempts to
reverse a completed decision return `409 Conflict`.

`npm run seed` creates the local demo admin listed above and marks the demo
instructor as approved by that admin. The seed accepts loopback MongoDB hosts by
default. A non-loopback target additionally requires a database beginning with
`studynotion_seed_disposable_` and the exact one-run confirmation
`STUDYNOTION_DISPOSABLE_SEED_CONFIRM=seed-disposable-database`. It always refuses
`DEPLOYMENT_TIER=production`. A production-style staging one-shot additionally
requires `NODE_ENV=production`, `DEPLOYMENT_TIER=staging`,
`STUDYNOTION_DEMO_SEED_MODE=staging`, that exact confirmation, and a disposable
database name. Public signup never accepts `accountType=Admin`.
Provision production admins only through a controlled operational process with
database access and an audit trail—never through a public HTTP endpoint.

## Contact and protected media

Set `CONTACT_RECIPIENT` to the monitored support inbox. Contact form submissions
are validated, rate limited, HTML escaped, and delivered to that inbox through
Resend with the learner's address as `Reply-To`; request bodies are never logged.

Course thumbnails accept verified JPEG, PNG, WebP, or AVIF content. Lesson videos
accept verified MP4, QuickTime, or WebM content. The server checks file signatures
in addition to browser MIME labels and records Cloudinary public IDs so replaced
or deleted assets are cleaned up.

New lesson videos use Cloudinary's `authenticated` delivery type. Only an
entitled student, the owning instructor, or an admin receives a time-limited
signed URL from `getFullCourseDetails`; `MEDIA_URL_TTL_SECONDS` controls its
lifetime (default one hour). Videos uploaded by an older release remain legacy
public assets and must be re-uploaded before production: production responses do
not return those legacy URLs.

Account deletion uses a durable, leased workflow. While cleanup is pending the
account can only restore its minimal session/profile state and call the deletion
endpoint; checkout and all normal protected operations are blocked. The client
then routes the user to a deletion-only recovery screen. Enrollment, progress,
review, profile, OTP, and profile media cleanup is idempotent, so a crash or
provider outage can be retried without reactivating a partially erased account.
Identity anonymization and session revocation happen only after every cleanup
step succeeds.

## Production session contract

The browser session is an HttpOnly signed cookie. Configure these server values:

- `JWT_SECRET`: at least 32 random characters from a secret manager.
- `FRONTEND_ORIGINS`: comma-separated, exact frontend origins, for example
  `https://app.example.com`. `FRONTEND_URL` remains a single-origin fallback.
- `GOOGLE_TIMEOUT_MS`: bounds both Google sign-in verification and the fresh
  Google re-authentication required for account deletion.
- `COOKIE_NAME`: normally `studynotion_session`.
- `COOKIE_DOMAIN`: optional; use `.example.com` only when the deployment needs a
  cookie shared by subdomains.
- `COOKIE_SECURE=true` in production.
- `COOKIE_SAME_SITE=lax` for the required same-site app/API deployment. Keep the
  app and API on subdomains of one registrable site; cross-site deployments are
  rejected because browser cookie behavior is not reliable enough for this
  credentialed session model.

Unsafe browser requests are checked against `FRONTEND_ORIGINS` as a CSRF
boundary. Do not configure wildcard origins when credentials are enabled. A
logout or password change increments the user's session version, invalidating
previously issued tokens; password resets do the same.

Password-reset bearer credentials are placed in the URL fragment, retained only
in browser memory, and expire after 30 minutes. Fragments are never sent to the
web server or proxy access logs. Keep analytics and third-party scripts off the
reset page.

Production rate limits use Redis rather than process memory, so OTP,
login, contact, payment, and global limits remain effective across API replicas.
Email-sensitive endpoints are limited by both source IP and normalized email.
The signed Razorpay webhook has its own high-burst limit and is excluded from
the browser API bucket. Set `REDIS_URL` to a TLS `rediss://` endpoint in
production. Local development and tests fall back to an in-process store when
Redis is not configured.

MongoDB selection, connection, socket, pool-wait, and per-operation deadlines
are independently bounded by the `MONGODB_*_TIMEOUT_MS` variables in the
environment examples. Tune them to the deployed region and observed query
latency; do not remove the bounds.

## Entitlement Stage 2 sidecar

Entitlement is a non-authoritative, authorization-write-only sidecar in Stage 2.
Recovery and preflight read it operationally, but existing Course/User
enrollment mirrors and security gates remain the only product authorization
path; there is no Entitlement fallback or public API. Set one
immutable `ENTITLEMENT_SIDECAR_STARTED_AT` UTC timestamp on every API,
preflight, and recovery process. Only a Purchase whose `createdAt` and `paidAt`
are both at or after that boundary belongs to the Stage 2 cohort. A checkout
created before the boundary remains legacy-only even if it is paid later, so
drain or expire all such in-flight checkouts before rollout. Never move the
boundary backwards to create historical episodes.

Live fulfillment reservation and activation share one five-second sidecar
budget; legacy work between the phases does not reset it. Sidecar timeout or
failure is non-gating and remains recoverable without changing legacy outcomes.
Replacement Purchase selection is deferred, and no Entitlement state authorizes
learning, playback, progress, My Courses, or dashboard access in this stage.

Run aggregate status or a bounded one-shot recovery batch with:

```bash
npm run entitlement:recover -- --status-only
ENTITLEMENT_RECOVERY_CONFIRM=reconcile-entitlements \
  npm run entitlement:recover -- --limit 25
```

Production recovery requires the confirmation value shown above. The process
uses MongoDB CAS and 60-second leases; it does not run a daemon, use Redis, call
Razorpay, repair legacy mirrors, or backfill history. Schedule it externally
and keep every invocation below the documented batch maximum. Catch-up pages
the raw Purchase stream in `_id` order; its protected continuation is the last
raw Purchase `_id` examined. Continue to the end, then run without a
continuation to wrap around. Public status and preflight treat
`malformedEpisodes` and `ageHandoffRequired` as blocking. Run
`npm run preflight:production` before release or rollback. See
`../docs/operations/entitlement-recovery.md` for retry timing, continuation,
privacy, exit codes, scheduler ownership, and rollback, and
`../docs/audits/entitlement-stage2-sidecar-2026-08.md` for the evidence
boundary.

## Razorpay production contract

Configure `RAZORPAY_KEY_ID`, `RAZORPAY_SECRET`, and an independent
`RAZORPAY_WEBHOOK_SECRET` on the server. The browser receives only the matching
`VITE_RAZORPAY_KEY_ID`; neither secret belongs in frontend configuration.
`RAZORPAY_TIMEOUT_MS` bounds every provider request, `CHECKOUT_TTL_SECONDS`
bounds an unpaid checkout, and the required production value
`REFUND_WINDOW_DAYS` (0-30) is snapshotted on every Purchase. The frontend must
read `GET /api/v1/payment/config` so its displayed Terms/refund version, refund
window, and checkout lifetime cannot drift from the server.

In the Razorpay dashboard, register this HTTPS endpoint:

```text
https://api.example.com/api/v1/payment/webhook
```

Subscribe it to `payment.captured` and `order.paid`. The API verifies
`X-Razorpay-Signature` against the untouched raw request body, checks the order,
amount, and currency against its immutable `Purchase`, and fulfills each payment
idempotently. Ensure any reverse proxy forwards the body without transforming
it. Browser-side verification remains a fast path; the webhook is the recovery
path when checkout succeeds after the tab closes.

Checkout creation requires an `Idempotency-Key` header and the exact policy
snapshot returned by `/payment/config`: `{ "acknowledgeCheckoutPolicies": true,
"termsVersion": "...", "refundPolicyVersion": "...", "refundWindowDays": 7 }`.
The API rejects stale snapshots instead of recording agreement to text the
learner did not see. The immutable Purchase records the acknowledgement
time/source, Terms and refund-policy versions, refund window, line-item names,
and integer minor-unit prices. A captured payment arriving after expiry, or one
that cannot safely enroll the current active Student, is never auto-enrolled;
it moves to `payment_review`.

Authenticated Students can read their immutable purchase history with
`GET /api/v1/payment/purchases` and request an eligible refund with
`POST /api/v1/payment/purchases/:purchaseId/refund-request`. The request body
must include `{ "confirmation": "REQUEST REFUND", "reason": "..." }`, where
the reason is 10-1000 characters. Eligibility is calculated from the
snapshotted purchase policy; the browser must not infer it from the current
global setting.

Admins operate that queue through:

- `GET /api/v1/admin/payments/reconciliation?page=1&limit=20`
- `POST /api/v1/admin/payments/reconciliation/:purchaseId/resolve`

Resolution requires a 10-1000 character audit note and either
`{ "action": "refund", "confirmation": "REFUND PAYMENT" }` or
`{ "action": "fulfill", "confirmation": "FULFILL PAYMENT" }`. A learner
request can instead be closed without revoking access using
`{ "action": "reject_refund", "confirmation": "REJECT REFUND" }`; that
decision is audited and the same Purchase cannot submit another automatic
request. Refunds are
recovered by immutable Purchase notes before any retry, store the Razorpay
refund ID, and require `overrideRefundWindow: true` when an admin deliberately
acts outside the snapshotted public window. The original eligibility deadline,
override time, and responsible Admin are retained. A learner request submitted
inside its window stays eligible even when support processes it later. Manual
fulfillment revalidates the
course set and active approved Student before enrollment. A provider refund
that is queued rather than processed remains `refund_pending`; retrying the
same resolution polls that refund instead of issuing a duplicate. A processed
learner-requested refund revokes the refunded entitlement unless another
fulfilled purchase still grants it. Restrict this workflow to trained support
staff and reconcile every non-empty queue before launch. The refund attempt is
persisted before calling Razorpay. If the provider outcome is ambiguous, later
requests only recover by the immutable Purchase note and never automatically
issue another refund. Provider confirmation is persisted before idempotent
entitlement cleanup, so a crash resumes cleanup without losing the financial
audit trail. If Razorpay explicitly marks an attempt `failed`, a new provider
refund requires the separate audited action
`{ "action": "retry_refund", "confirmation": "RETRY FAILED REFUND" }`; prior
failed refund IDs remain attached to the Purchase.

## Public catalog v2

`GET /api/v2/courses` is an additive, unauthenticated published-course listing.
It accepts validated search, category, level, language, price, rating, duration,
sort, page-size, and opaque-cursor parameters. See
`packages/contracts/openapi.json` for the machine-readable schema and
`docs/architecture/0002-catalog-v2-vertical-slice.md` for the compatibility and
cache decisions.

Reusable strict schemas for later v2 slices are emitted under
`components.schemas`; their presence does not mean a protected route has already
been migrated. See
`docs/architecture/0003-validated-v2-contract-foundation.md` for validation,
DTO-exposure, request-ID, and minor-unit money rules.

Only stable public fields are returned. Draft courses, learner identities,
review bodies, curriculum and protected lesson/video URLs, provider IDs, and
entitlement state are not part of the DTO. Public thumbnail and instructor image
URLs remain part of the card DTO. Both success and error bodies carry the
request ID exposed in `X-Request-Id`. All v2 responses are `private, no-store`;
frontend RTK Query owns the short-lived in-memory cache so an intermediary
cannot replay a stale trace ID.

`level` and `language` are optional additions. A legacy course missing either
field remains visible without that filter, returns `null` metadata, and does not
match an explicit filter. This release does not backfill historical courses.

Run the real MongoDB/Redis verification from the repository root:

```bash
docker compose -f compose.integration.yml up -d --wait
CATALOG_TEST_MONGODB_URI=mongodb://127.0.0.1:27018/studynotion_catalog_test_local \
CATALOG_TEST_REDIS_URL=redis://127.0.0.1:6380/14 \
npm run test:integration
docker compose -f compose.integration.yml down
```

The target guards reject production-looking stores. Query-plan evidence is
recorded in `docs/audits/catalog-query-plan-2026-07.md`.

Build the API image from the repository root so Docker can include the shared
contract workspace:

```bash
docker build -f server/Dockerfile -t studynotion-api .
```

## Contract verification

Run `npm --workspace studynotion-backend test` from the repository root. The
suite mocks MongoDB and external providers for OTP, local login, Google token
exchange, session revocation, purchase pricing, verification, webhook
idempotency, and the catalog contract. HTTP boundary tests bind only a temporary
loopback port and never contact an external service. Node.js 24 is the supported
runtime; local Node 26 results do not change that production target.

## Database indexes

Production disables Mongoose automatic index creation. After taking a database
backup and resolving any duplicate email, review, progress, receipt, order, or
payment values, create the declared indexes during a maintenance window:

```bash
MIGRATION_CONFIRM=create-indexes \
npm --workspace studynotion-backend run db:indexes
```

The command only creates declared indexes; it does not drop existing indexes.
The preflight checks case-normalized identities plus Category, OTP, Google ID,
and every compound Purchase uniqueness constraint before this command runs.
Prove that every declared index is present with the read-only mode:

```bash
MONGODB_AUTO_INDEX=false INDEX_OPERATION=verify \
npm --workspace studynotion-backend run db:indexes
```

For the catalog slice this command adds the named
`catalog_published_newest`, `catalog_category_newest`,
`catalog_published_price`, `catalog_category_price`, and
`catalog_published_text` indexes. No data backfill or destructive migration is
required. Rolling the application back does not require dropping them; remove
them only through a separate backup-first database change after confirming the
previous application does not use them.

The same controlled command declares the seven Entitlement and four private
Entitlement-operation-audit indexes approved by ADR 0010. Stage 2 payment,
refund, account-deletion, and recovery sidecars may write Entitlement only for
the post-boundary cohort described above. There is still no Entitlement
authorization reader, public API, or historical backfill, and
`EntitlementOperationAudit` remains inert outside its model/index tests. The
Stage 1 definitions and guarded MongoDB 8 verification are recorded in
`../docs/audits/entitlement-inert-persistence-2026-08.md`; Stage 2 evidence and
the completed Node 24/MongoDB 8 release verification record are in
`../docs/audits/entitlement-stage2-sidecar-2026-08.md`.

## Upgrading legacy production data

Take and verify a database backup first. Older users may not have session,
provider, approval, or profile defaults required by this release. The explicit
backfill repairs only those safe defaults and missing/dangling empty profiles.
It also records `everPublishedAt` for currently Published legacy courses so
content already offered to learners becomes archive-only:

```bash
BACKFILL_CONFIRM=backfill-security-fields \
npm --workspace studynotion-backend run db:backfill-security
```

It intentionally does not guess how to repair duplicate identities, reviews,
progress records, purchases, missing curriculum references, or legacy public
videos. Historical enrollments must be matched to verified Razorpay exports (or
another authoritative financial record) and imported with their real user,
course, amount, currency, provider IDs, and paid timestamp; never fabricate a
Purchase or current policy acknowledgement. Review the backfill counts, resolve
those cases manually, re-upload every legacy lesson as authenticated Cloudinary
media, then run:

```bash
MIGRATION_CONFIRM=create-indexes \
npm --workspace studynotion-backend run db:indexes
INDEX_OPERATION=verify \
npm --workspace studynotion-backend run db:indexes
npm --workspace studynotion-backend run preflight:production
```

`preflight:production` exits non-zero for insecure or malformed media in both
Published and learner-entitled Draft/Archived courses, empty/dangling curriculum,
invalid published instructors, missing or reverse-mismatched category links,
missing lifecycle markers, Course-side or User-side enrollment pairs without an
authoritative Purchase ledger, dangling enrollment references, invalid enrolled
account roles, asymmetric learner `User.courses`/`Course.studentsEnroled` mirrors,
profile/security gaps, or any duplicate that would violate production indexes.
A deployment must not proceed until every finding is zero.

The provider-neutral staging/production sequence, scheduler adapter,
environment matrix, backup/restore rehearsal, and rollback contract are in
`../docs/operations/deployment.md`.

## Initial production admin

Public signup can never create an Admin. On a new production database, run the
one-time provisioning command from a trusted deployment job. Inject
`ADMIN_PASSWORD` directly from its secret manager (not an inline shell value or
command-line argument) and remove that secret binding immediately afterward:

```bash
test -n "${ADMIN_PASSWORD-}" || {
  echo "Inject ADMIN_PASSWORD from the one-shot secret binding" >&2
  exit 2
}
PROVISION_ADMIN_CONFIRM=provision-initial-admin \
ADMIN_ACCEPT_POLICIES=true \
ADMIN_EMAIL=owner@example.com \
ADMIN_FIRST_NAME=Platform \
ADMIN_LAST_NAME=Owner \
npm --workspace studynotion-backend run admin:provision
```

The command refuses to run when an active Admin already exists and never prints
the supplied credentials. `ADMIN_ACCEPT_POLICIES=true` records that the
provisioning operator reviewed the current Terms and Privacy Notice; do not set
it on somebody else's behalf.

## Provider go-live checks

Environment validation rejects copied example values and checks production URL,
email, Google, Resend, Razorpay, Cloudinary, MongoDB, and secret formats. Format
validation cannot prove that a provider credential is active. Before routing
traffic, verify against sandbox/test accounts and then live configuration:

- Send and redeem an OTP and password-reset email through the verified Resend domain.
- Complete Google sign-in from every configured frontend origin.
- Upload an image and authenticated video, play it with Range requests, and
  confirm a fresh playback URL works after the prior URL expires.
- Complete one low-value Razorpay payment and confirm both browser verification
  and a replayed signed webhook remain idempotent.
- Force an expired checkout capture, confirm it appears in the Admin
  reconciliation queue, then complete a test refund and verify its provider ID.
- Revoke the temporary test accounts/media/orders afterward and confirm
  `/health/ready` remains healthy.
