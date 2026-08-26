# Deployment operations

This runbook is the canonical local, staging, and production deployment guide
for StudyNotion. It keeps the application provider-neutral and deployable on any
container platform that supports immutable images, HTTPS ingress, one-shot
jobs, and private managed services.

This release does **not** run historical Entitlement backfill, activate an
Entitlement authorization reader, or change legacy enrollment authority.
`Course.studentsEnroled` and the Student `User.courses` mirror remain the access
authority. The Stage 2 Entitlement writers and recovery job remain
non-authoritative sidecars.

## Runtime and topology

Use Node.js 24.x for installs, tests, jobs, and the API image. Build the API
image and each tier-specific web image from one reviewed Git SHA, publish
immutable tags such as `registry.example/studynotion-api:<git-sha>`, and record
the registry digest after push. Never promote a floating `latest` tag.

The web image is an unprivileged Nginx process on port 8080. It serves the SPA
and proxies `/api` to `127.0.0.1:4000` without rewriting the request path. The
API image is an unprivileged Node process on port 4000. The current AWS staging
task uses this same-origin topology:

```text
Browser / HTTPS AWS entry point     -> web/Nginx image:8080
/api and /api/*                     -> task loopback -> API image:4000
MongoDB 8 / Atlas-compatible TLS   -> API and operational jobs only
TLS Redis                          -> API shared rate limiting only
Cloudinary                         -> uploads and authenticated lesson media
Razorpay                           -> checkout and signed webhook
Resend                             -> transactional email
Google Identity                    -> optional in staging, required in production
```

`VITE_API_BASE_URL=/api/v1` selects that topology; `PUBLIC_API_URL` is then the
same public origin as `APP_URL`. An absolute HTTPS API base remains supported
when a platform deliberately exposes and routes a separate API origin. In that
layout, the public app and API hosts must share one registrable site. This is
required even when the configured cookie policy could otherwise cross sites,
because browsers can block credentialed cross-site requests. Use a host-only
session cookie unless reviewed cross-subdomain sharing is required. The HTTPS
ingress must preserve the `Host`, `Origin`, and request ID headers, forward the
exact configured number of proxy hops, terminate TLS, redirect HTTP to HTTPS,
and expose only ports 443/80. MongoDB and Redis must not be exposed by the
application ingress.

## Environment inventory

The classifications below describe actual repository consumers. Public values
may be compiled into the browser. Private values belong in the platform secret
manager or a private one-shot job environment, never in an image, Git, or a
frontend variable.

### Browser build

| Variable                  | Classification                                                  | Contract                                                                                                                                                                                         |
| ------------------------- | --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `VITE_DEPLOYMENT_TIER`    | `REQUIRED_PRODUCTION`, `PUBLIC_FRONTEND`                        | `staging` or `production`; selects the allowed Razorpay key prefix.                                                                                                                              |
| `VITE_API_BASE_URL`       | `REQUIRED_PRODUCTION`, `PUBLIC_FRONTEND`                        | Exact same-origin path `/api/v1`, or an HTTPS URL ending in `/api/v1`; absolute values reject credentials, query, fragment, placeholders, and loopback/development hosts. V2 is derived from it. |
| `VITE_GOOGLE_CLIENT_ID`   | `REQUIRED_PRODUCTION`, `PUBLIC_FRONTEND`; `OPTIONAL` in staging | Google Web Client ID. Omit it from both staging sides to remove the complete Google sign-in affordance cleanly.                                                                                  |
| `VITE_RAZORPAY_KEY_ID`    | `REQUIRED_PRODUCTION`, `PUBLIC_FRONTEND`                        | `rzp_test_...` in staging and `rzp_live_...` in production. This is the public key ID, never the secret.                                                                                         |
| `VITE_SUPPORT_EMAIL`      | `REQUIRED_PRODUCTION`, `PUBLIC_FRONTEND`                        | Public support address.                                                                                                                                                                          |
| `VITE_LEGAL_ENTITY_NAME`  | `REQUIRED_PRODUCTION`, `PUBLIC_FRONTEND`                        | Registered operator shown on policy pages.                                                                                                                                                       |
| `VITE_LEGAL_ADDRESS`      | `REQUIRED_PRODUCTION`, `PUBLIC_FRONTEND`                        | Public legal address.                                                                                                                                                                            |
| `VITE_LEGAL_JURISDICTION` | `REQUIRED_PRODUCTION`, `PUBLIC_FRONTEND`                        | Public governing jurisdiction.                                                                                                                                                                   |
| `STUDYNOTION_WEB_BUILD`   | `BUILD_ONLY`                                                    | Docker build selector: `production` runs the validated public build and `local` runs the local build. It is not a browser runtime variable.                                                      |

Vite supplies `DEV` and `PROD`; operators must not set them. `build:local`
intentionally bypasses the public production validator and must never produce a
staging or production artifact.

### API runtime and providers

| Variable                                          | Classification                                                  | Contract                                                                                                                                                                              |
| ------------------------------------------------- | --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `NODE_ENV`                                        | `REQUIRED_PRODUCTION`, `PRIVATE_BACKEND`                        | Exactly `production` for staging and production runtimes. Only `development`, `test`, and `production` are accepted.                                                                  |
| `DEPLOYMENT_TIER`                                 | `REQUIRED_PRODUCTION`, `PRIVATE_BACKEND`                        | `staging` or `production`; must match `VITE_DEPLOYMENT_TIER`.                                                                                                                         |
| `PORT`                                            | `OPTIONAL`, `PRIVATE_BACKEND`                                   | API listen port; default 4000.                                                                                                                                                        |
| `LOG_LEVEL`                                       | `OPTIONAL`, `PRIVATE_BACKEND`                                   | `debug`, `info`, `warn`, or `error`; production default `info`.                                                                                                                       |
| `FRONTEND_ORIGINS`                                | `REQUIRED_PRODUCTION`, `PRIVATE_BACKEND`                        | Comma-separated exact HTTPS origins. No wildcard, path, credentials, or loopback host; every origin must share one registrable site with `PUBLIC_API_URL`.                            |
| `FRONTEND_URL`                                    | `OPTIONAL`, `PRIVATE_BACKEND`                                   | Legacy single-origin alias; prefer `FRONTEND_ORIGINS`.                                                                                                                                |
| `APP_URL`                                         | `REQUIRED_PRODUCTION`, `PRIVATE_BACKEND`                        | Canonical HTTPS frontend origin and one member of `FRONTEND_ORIGINS`.                                                                                                                 |
| `PUBLIC_API_URL`                                  | `REQUIRED_PRODUCTION`, `PRIVATE_BACKEND`                        | Canonical non-loopback HTTPS API origin. It equals `APP_URL` for `/api/v1`, or the origin of an absolute `VITE_API_BASE_URL`.                                                         |
| `BRAND_NAME`, `BRAND_LOGO_URL`, `SUPPORT_EMAIL`   | `REQUIRED_PRODUCTION`, `PRIVATE_BACKEND`                        | Transactional-email branding; logo must be a non-loopback HTTPS URL.                                                                                                                  |
| `MONGODB_URI`                                     | `REQUIRED_PRODUCTION`, `PRIVATE_BACKEND`                        | Authenticated TLS MongoDB/Atlas URI naming a non-system database, with `w=majority` and primary reads; standard URIs must set `tls=true`, and `j=false`/`journal=false` are rejected. |
| `MONGODB_URL`                                     | `OPTIONAL`, `PRIVATE_BACKEND`                                   | Legacy alias; prefer `MONGODB_URI`.                                                                                                                                                   |
| `MONGODB_AUTO_INDEX`                              | `REQUIRED_PRODUCTION`, `PRIVATE_BACKEND`                        | Must be explicitly `false` in staging and production; controlled one-shot jobs own index creation.                                                                                    |
| `REDIS_URL`                                       | `REQUIRED_PRODUCTION`, `PRIVATE_BACKEND`                        | Authenticated, non-loopback `rediss://` URI. Redis stores shared rate-limit state; it is not an application cache.                                                                    |
| `JWT_SECRET`, `OTP_SECRET`                        | `REQUIRED_PRODUCTION`, `PRIVATE_BACKEND`, `GENERATED_SECRET`    | Independent random values, each at least 32 characters.                                                                                                                               |
| `ALLOW_DEV_OTP`                                   | `LOCAL_ONLY`, `PRIVATE_BACKEND`                                 | May be true only in local development; production runtime rejects it.                                                                                                                 |
| `TRUST_PROXY`                                     | `REQUIRED_PRODUCTION`, `PRIVATE_BACKEND`                        | In staging/production, use an exact reviewed numeric proxy-hop count from 1 through 10. Subnets, names, `false`, `0`, and unrestricted `true` are rejected.                           |
| `COOKIE_NAME`                                     | `OPTIONAL`, `PRIVATE_BACKEND`                                   | Valid cookie token; default `studynotion_session`. Prefix rules are enforced.                                                                                                         |
| `COOKIE_DOMAIN`                                   | `OPTIONAL`, `PRIVATE_BACKEND`                                   | Leave empty for host-only. If set, it must be a valid reviewed parent DNS domain containing both app and API hosts.                                                                   |
| `COOKIE_SAME_SITE`                                | `REQUIRED_PRODUCTION`, `PRIVATE_BACKEND`                        | `lax`, `strict`, or `none`; use `lax` for the recommended same-site subdomains.                                                                                                       |
| `COOKIE_SECURE`                                   | `REQUIRED_PRODUCTION`, `PRIVATE_BACKEND`                        | Must be `true` in a production runtime.                                                                                                                                               |
| `GOOGLE_CLIENT_ID`                                | `REQUIRED_PRODUCTION`, `PRIVATE_BACKEND`; `OPTIONAL` in staging | Must exactly equal the browser Google client ID when enabled. Never add a browser client secret.                                                                                      |
| `RESEND_API_KEY`                                  | `REQUIRED_PRODUCTION`, `PRIVATE_BACKEND`                        | Private Resend token.                                                                                                                                                                 |
| `EMAIL_FROM`, `CONTACT_RECIPIENT`                 | `REQUIRED_PRODUCTION`, `PRIVATE_BACKEND`                        | Verified sender and contact destination.                                                                                                                                              |
| `EMAIL_REPLY_TO`                                  | `OPTIONAL`, `PRIVATE_BACKEND`                                   | Valid reply-to address.                                                                                                                                                               |
| `RAZORPAY_KEY_ID`                                 | `REQUIRED_PRODUCTION`, `PRIVATE_BACKEND`                        | Must equal `VITE_RAZORPAY_KEY_ID`; test prefix in staging, live prefix in production.                                                                                                 |
| `RAZORPAY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`      | `REQUIRED_PRODUCTION`, `PRIVATE_BACKEND`                        | Independent private provider secrets.                                                                                                                                                 |
| `REFUND_WINDOW_DAYS`                              | `REQUIRED_PRODUCTION`, `PRIVATE_BACKEND`                        | Integer 0-30; must match the published policy.                                                                                                                                        |
| `CLOUD_NAME`, `CLOUD_API_KEY`, `CLOUD_API_SECRET` | `REQUIRED_PRODUCTION`, `PRIVATE_BACKEND`                        | Private Cloudinary upload/signing configuration.                                                                                                                                      |
| `FOLDER_NAME`                                     | `REQUIRED_PRODUCTION`, `PRIVATE_BACKEND`                        | Valid isolated folder; staging and production must use different folders.                                                                                                             |
| `ENTITLEMENT_SIDECAR_STARTED_AT`                  | `REQUIRED_PRODUCTION`, `PRIVATE_BACKEND`                        | One immutable strict UTC timestamp with milliseconds, shared by API, preflight, and recovery.                                                                                         |

### Bounded runtime tuning

All of these are `OPTIONAL`, `PRIVATE_BACKEND`; keep the committed example
defaults unless load evidence justifies a reviewed change.

| Variables                                                                                                                                                         | Purpose                                                                                            |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `JSON_BODY_LIMIT`, `FORM_BODY_LIMIT`, `UPLOAD_MAX_BYTES`                                                                                                          | Request and upload bounds.                                                                         |
| `REQUEST_TIMEOUT_MS`, `SHUTDOWN_TIMEOUT_MS`                                                                                                                       | HTTP deadline and graceful shutdown bound.                                                         |
| `REDIS_CONNECT_TIMEOUT_MS`, `REDIS_COMMAND_TIMEOUT_MS`                                                                                                            | Redis startup connection plus startup-ping and global runtime-command deadlines.                   |
| `MONGODB_MAX_POOL_SIZE`, `MONGODB_MIN_POOL_SIZE`                                                                                                                  | Per-replica MongoDB pool bounds; multiply by the maximum replica count before sizing the database. |
| `MONGODB_SERVER_SELECTION_TIMEOUT_MS`, `MONGODB_CONNECT_TIMEOUT_MS`, `MONGODB_OPERATION_TIMEOUT_MS`, `MONGODB_SOCKET_TIMEOUT_MS`, `MONGODB_WAIT_QUEUE_TIMEOUT_MS` | MongoDB connection/query deadlines.                                                                |
| `MEDIA_URL_TTL_SECONDS`                                                                                                                                           | Authenticated Cloudinary playback lifetime, 300-86400 seconds.                                     |
| `CHECKOUT_TTL_SECONDS`                                                                                                                                            | Server checkout lifetime, 300-86400 seconds.                                                       |
| `RAZORPAY_TIMEOUT_MS`, `GOOGLE_TIMEOUT_MS`                                                                                                                        | Bounded provider calls.                                                                            |

### One-shot operations

| Variable                                                          | Classification                                                | Contract                                                                                                                                               |
| ----------------------------------------------------------------- | ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `ENTITLEMENT_RECOVERY_CONFIRM`                                    | `CONDITIONAL_REQUIRED`, `PRIVATE_BACKEND`                     | Exact literal `reconcile-entitlements` for every mutating recovery run, in every runtime tier.                                                         |
| `ENTITLEMENT_RECOVERY_BATCH_SIZE`                                 | `OPTIONAL`, `PRIVATE_BACKEND`                                 | Scheduled batch limit; default/recommendation 25 and never above the service maximum.                                                                  |
| `ENTITLEMENT_RECOVERY_CHECKPOINT_FILE`                            | `REQUIRED_PRODUCTION`, `PRIVATE_BACKEND`                      | Absolute path inside a persistent private directory. The atomic 0600 document is sensitive and is never logged.                                        |
| `STUDYNOTION_API_IMAGE_DIGEST`                                    | `REQUIRED_PRODUCTION`, `PRIVATE_OPERATIONS`                   | Immutable API image reference consumed by the recovery host orchestration.                                                                             |
| `STUDYNOTION_ENTITLEMENT_RECOVERY_ENV_FILE`                       | `REQUIRED_PRODUCTION`, `PRIVATE_OPERATIONS`                   | Absolute host path to the recovery-only private env file; it is not an API runtime env file.                                                           |
| `STUDYNOTION_ENTITLEMENT_RECOVERY_STATE_DIR`                      | `REQUIRED_PRODUCTION`, `PRIVATE_OPERATIONS`                   | Absolute host path to the canonical persistent 0700 state directory.                                                                                   |
| `STUDYNOTION_INDEX_ENV_FILE`                                      | `REQUIRED_PRODUCTION`, `PRIVATE_OPERATIONS`                   | Absolute path to a private 0600 job env file containing the additive-index principal as `MONGODB_URI` and, if needed, bounded MongoDB timeouts only.   |
| `STUDYNOTION_PREFLIGHT_ENV_FILE`                                  | `REQUIRED_PRODUCTION`, `PRIVATE_OPERATIONS`                   | Absolute path to a private 0600 full production-style env file whose `MONGODB_URI` uses a separate read-only preflight principal.                      |
| `MIGRATION_CONFIRM`                                               | `CONDITIONAL_REQUIRED`, `PRIVATE_BACKEND`                     | Exact literal `create-indexes` for every additive index-creation run, in every runtime tier.                                                           |
| `INDEX_OPERATION`                                                 | `OPTIONAL`, `PRIVATE_BACKEND`                                 | `create` by default; `verify` is read-only and requires no mutation confirmation.                                                                      |
| `BACKFILL_CONFIRM`                                                | `CONDITIONAL_REQUIRED`, `PRIVATE_BACKEND`                     | Required only when running the existing security-field repair; exact literal `backfill-security-fields`. It is not an Entitlement backfill.            |
| `PROVISION_ADMIN_CONFIRM`, `ADMIN_ACCEPT_POLICIES`, `ADMIN_EMAIL` | `CONDITIONAL_REQUIRED`, `PRIVATE_BACKEND`                     | Required only for the one-time initial-admin job; confirmation is `provision-initial-admin`, policy acceptance is `true`, and the email must be valid. |
| `ADMIN_FIRST_NAME`, `ADMIN_LAST_NAME`                             | `OPTIONAL`, `PRIVATE_BACKEND`                                 | Initial-admin display names; defaults are supplied by the job.                                                                                         |
| `ADMIN_PASSWORD`                                                  | `CONDITIONAL_REQUIRED`, `PRIVATE_BACKEND`, `GENERATED_SECRET` | Required for initial-admin provisioning; use an ephemeral strong password and remove it afterward.                                                     |
| `SOURCE_DATABASE`, `RESTORE_DATABASE`                             | `CONDITIONAL_REQUIRED`, `PRIVATE_OPERATIONS`                  | Exact source and isolated disposable target database names for the backup/restore rehearsal.                                                           |
| `SOURCE_MONGODB_TOOLS_CONFIG`, `RESTORE_MONGODB_TOOLS_CONFIG`     | `CONDITIONAL_REQUIRED`, `PRIVATE_OPERATIONS`                  | Distinct absolute paths to pre-populated, owner-controlled mode-0600 MongoDB Tools YAML files outside the checkout.                                    |

### Local, staging-demo, E2E, and integration-only inputs

These must not be copied into a production runtime.

| Variables                                                                                                                                                                                                                                                                                             | Classification                                                             | Purpose                                                                                                               |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `STUDYNOTION_WEB_PORT`, `STUDYNOTION_API_PORT`                                                                                                                                                                                                                                                        | `LOCAL_ONLY`                                                               | Loopback-published Compose ports.                                                                                     |
| `STUDYNOTION_LOCAL_JWT_SECRET`, `STUDYNOTION_LOCAL_OTP_SECRET`, `STUDYNOTION_LOCAL_ENTITLEMENT_SIDECAR_STARTED_AT`                                                                                                                                                                                    | `LOCAL_ONLY`                                                               | Deliberately non-production Compose fixtures.                                                                         |
| `STUDYNOTION_DISPOSABLE_SEED_CONFIRM`                                                                                                                                                                                                                                                                 | `CONDITIONAL_REQUIRED`, `TEST_ONLY`, `PRIVATE_BACKEND`                     | Required for a staging or other non-loopback seed; exact guard for an explicitly named disposable database.           |
| `STUDYNOTION_DEMO_SEED_MODE`                                                                                                                                                                                                                                                                          | `CONDITIONAL_REQUIRED`, `TEST_ONLY`, `PRIVATE_BACKEND`                     | Must be `staging` for a staging demo seed; local seeding defaults to `local`.                                         |
| `STUDYNOTION_DEMO_ADMIN_EMAIL`, `STUDYNOTION_DEMO_INSTRUCTOR_EMAIL`, `STUDYNOTION_DEMO_STUDENT_EMAIL`                                                                                                                                                                                                 | `CONDITIONAL_REQUIRED`, `TEST_ONLY`, `PRIVATE_BACKEND`                     | All three distinct identities are required for a staging demo seed; local defaults exist.                             |
| `STUDYNOTION_DEMO_ADMIN_PASSWORD`, `STUDYNOTION_DEMO_INSTRUCTOR_PASSWORD`, `STUDYNOTION_DEMO_STUDENT_PASSWORD`                                                                                                                                                                                        | `CONDITIONAL_REQUIRED`, `TEST_ONLY`, `PRIVATE_BACKEND`, `GENERATED_SECRET` | All three distinct passwords are required for a staging demo seed; never commit staging values.                       |
| `STUDYNOTION_DEMO_VIDEO_PUBLIC_ID`, `STUDYNOTION_DEMO_VIDEO_FORMAT`                                                                                                                                                                                                                                   | `CONDITIONAL_REQUIRED`, `TEST_ONLY`, `PRIVATE_BACKEND`                     | Authenticated Cloudinary metadata required for a staging demo seed.                                                   |
| `STUDYNOTION_LIVE_BASE_URL`                                                                                                                                                                                                                                                                           | `CONDITIONAL_REQUIRED`, `TEST_ONLY`                                        | Required to target a public live stack; otherwise the suite defaults to local Compose.                                |
| `STUDYNOTION_LIVE_ADMIN_EMAIL`, `STUDYNOTION_LIVE_ADMIN_PASSWORD`, `STUDYNOTION_LIVE_INSTRUCTOR_EMAIL`, `STUDYNOTION_LIVE_INSTRUCTOR_PASSWORD`, `STUDYNOTION_LIVE_STUDENT_EMAIL`, `STUDYNOTION_LIVE_STUDENT_PASSWORD`                                                                                 | `CONDITIONAL_REQUIRED`, `TEST_ONLY`, `PRIVATE_BACKEND`                     | All three credential pairs are required for a non-loopback live E2E target.                                           |
| `CAPTURE_CATALOG_SCREENSHOTS`, `CAPTURE_LEARNING_SCREENSHOTS`                                                                                                                                                                                                                                         | `TEST_ONLY`                                                                | Opt-in visual evidence generation.                                                                                    |
| `INTEGRATION_MONGO_PORT`, `INTEGRATION_REDIS_PORT`                                                                                                                                                                                                                                                    | `TEST_ONLY`                                                                | Disposable integration Compose ports.                                                                                 |
| `MONGO_INITDB_DATABASE`                                                                                                                                                                                                                                                                               | `LOCAL_ONLY`, `TEST_ONLY`, `THIRD_PARTY_IMAGE`                             | Database initialization input consumed only by the disposable MongoDB image.                                          |
| `CATALOG_TEST_MONGODB_URI`, `ENROLLMENT_TEST_MONGODB_URI`, `ENTITLEMENT_TEST_MONGODB_URI`, `ENTITLEMENT_STAGE2_TEST_MONGODB_URI`, `LEARNING_TEST_MONGODB_URI`, `MONGOOSE_TEST_MONGODB_URI`, `PREFLIGHT_TEST_MONGODB_URI`                                                                              | `CONDITIONAL_REQUIRED`, `TEST_ONLY`                                        | Each guarded disposable MongoDB URI is required when its corresponding integration suite is enabled.                  |
| `CATALOG_TEST_REDIS_URL`, `LEARNING_TEST_REDIS_URL`                                                                                                                                                                                                                                                   | `CONDITIONAL_REQUIRED`, `TEST_ONLY`                                        | Each guarded disposable Redis URI is required when its corresponding integration suite is enabled.                    |
| `STUDYNOTION_RUN_CATALOG_INTEGRATION`, `STUDYNOTION_RUN_ENROLLMENT_INTEGRATION`, `STUDYNOTION_RUN_ENTITLEMENT_INTEGRATION`, `STUDYNOTION_RUN_ENTITLEMENT_STAGE2_INTEGRATION`, `STUDYNOTION_RUN_LEARNING_INTEGRATION`, `STUDYNOTION_RUN_MONGOOSE_INTEGRATION`, `STUDYNOTION_RUN_PREFLIGHT_INTEGRATION` | `CONDITIONAL_REQUIRED`, `TEST_ONLY`                                        | Set the corresponding gate to `1` to execute that integration suite; the aggregate integration script sets all gates. |
| `CI`                                                                                                                                                                                                                                                                                                  | `TEST_ONLY`                                                                | Standard CI behavior flag.                                                                                            |

## Canonical Entitlement boundary

`ENTITLEMENT_SIDECAR_STARTED_AT` is release state, not a restart timestamp.
Before the first Stage 2 deployment, drain or let expire all pre-boundary
checkouts, choose the exact UTC deployment instant, and record it in the change
ticket and secret manager. Use a value formatted exactly like
`YYYY-MM-DDTHH:mm:ss.sssZ`.

The API, recovery job, preflight job, every replica, staging restore, and every
rollback must receive the same reviewed value. Never default it to `now`,
regenerate it during a restart, or move it backward/forward to clear a report.
Startup, recovery, and preflight reject missing, malformed, or materially future
values. Both Purchase `createdAt` and `paidAt` must be at or after the boundary
for Stage 2 eligibility; historical absence is intentionally not a preflight
failure.

## Local workflows

Without Docker, copy the two local examples, replace the signing secrets, run a
local MongoDB, and optionally run Redis:

```bash
npm ci
test -e apps/web/.env || cp apps/web/.env.example apps/web/.env
test -e apps/api/.env || cp apps/api/.env.example apps/api/.env
npm --workspace studynotion-backend run seed
npm run dev
```

With Docker, `compose.local.yml` is the canonical disposable application stack.
`compose.integration.yml` is only MongoDB/Redis test infrastructure.

```bash
test -e compose.local.env || cp compose.local.env.example compose.local.env
docker compose --env-file compose.local.env -f compose.local.yml up -d --build --wait
docker compose --env-file compose.local.env -f compose.local.yml run --rm seed
```

Open `http://localhost:3000`; use `localhost` consistently in browser origins:

```bash
curl --fail http://localhost:3000/health
curl --fail http://localhost:4000/health/live
curl --fail http://localhost:4000/health/ready
curl --fail --header 'Origin: http://localhost:3000' \
  'http://localhost:4000/api/v2/courses?limit=3'
npm run test:e2e:live
```

Stop without deleting the database volume:

```bash
docker compose --env-file compose.local.env -f compose.local.yml down
```

Only add `--volumes` when intentionally resetting this named disposable stack.
`compose.local.env` is user-owned, ignored by Git and Docker, and must not be
overwritten by automation.

## Staging release

Staging must have a public HTTPS app origin and API route, a separate MongoDB
database, separate TLS Redis, a separate Cloudinary folder, Razorpay test-mode
keys and webhook secret, and sandbox/test email. The checked-in examples use
the current same-origin `/api/v1` route; a deliberate separate-origin deployment
remains supported. Never point staging at production data or copy production
personal data into fixtures. Google may be disabled by omitting both client-ID
variables.

1. Require green CI at the reviewed SHA. Build the web image with
   `apps/web/.env.staging.example` inputs and the API image from
   `apps/api/Dockerfile`.
   In the release job, inject the exact browser values plus their matching API
   runtime tier, origins, Google/Razorpay IDs, cookie policy, and support address;
   run `npm run deploy:validate-pair` before the build. Publish both images with
   the Git SHA and record their registry digests and validator result.
2. Create the database and provider resources through the chosen platform's
   normal private workflow. Do not place credentials in build arguments.
3. Put the long-lived runtime variables from `apps/api/.env.staging.example` in
   the API secret manager. Set `NODE_ENV=production`,
   `DEPLOYMENT_TIER=staging`, `MONGODB_AUTO_INDEX=false`, test Razorpay keys,
   and the immutable boundary. Use `apps/api/.env.staging.seed.example` as the
   contract for a separate seed-job-only secret; never merge it into the API
   or recovery secret.
4. Capture and verify a backup. Run additive indexes, read-only index
   verification, and the production preflight from the exact API image.
5. On a new disposable interview database only, run the guarded staging seed.
   It requires `STUDYNOTION_DEMO_SEED_MODE=staging`, the exact one-shot
   disposable confirmation/database name, injected identities/passwords, and
   authenticated Cloudinary demo video metadata. The portable one-shot form is
   `docker run --rm --env-file /private/staging-runtime.env --env-file /private/staging-seed.env <api-image@sha256:digest> npm run seed`.
   Neither seed-only file is mounted into the API or recovery job. Run recovery,
   then rerun preflight until it exits 0.
6. Deploy API replicas without traffic, wait for `/health/ready`, deploy the web
   image, then route traffic. Register the exact Google origin if enabled and
   the Razorpay HTTPS webhook.
7. Enable the scheduled recovery job, execute the public smoke matrix, and save
   redacted evidence. Promotion remains manual.

The demo seed is idempotent and is never automatic. It always refuses a
production seed target. Keep a public demo behind an access gateway or an
interview-time allowlist, rotate all demo credentials afterward, and do not
publish the Admin password. The application has real Admin mutation controls;
there is no claim that a shared public Admin account is read-only.

## Production release gate

Production is released from the same reviewed Git SHA as staging. The exact
staging-validated API digest can be promoted because its configuration is
runtime-injected. Vite values and the Nginx CSP are baked into the web image, so
the production web image must instead be built with the production release
pair and recorded as its own validated digest; never promote the staging web
digest. Use `DEPLOYMENT_TIER=production`, live Razorpay keys, production
providers, and an independently isolated database/Redis/Cloudinary folder. Do
not seed it.

1. Confirm the branch/SHA, successful CI/security checks, artifact digests,
   image users and sizes, release owner, and previous known-good digests.
2. Confirm DNS, valid certificates, HTTPS redirect, ingress request limits,
   exact frontend origins, proxy-hop count, and host-only secure cookie policy.
3. Verify MongoDB 8 compatibility, TLS/auth/private networking, capacity, pool
   budget, and a completed restorable backup.
4. Verify TLS/auth Redis connectivity and capacity. API startup must connect and
   ping it before listening.
5. Verify Cloudinary protected media, Resend sender/domain, matching Google
   client IDs/origins, Razorpay live key pair, signed webhook secret/events, and
   operator alerts.
6. Inject the exact production browser/API release pair and require
   `npm run deploy:validate-pair` to pass before promotion. This compares the
   tier, exact API base path, shared registrable site, Google/Razorpay IDs,
   support address, and cookie posture; representative CI values are not
   evidence for a real release.
7. Run controlled indexes and the read-only production preflight. Any non-zero
   preflight exit holds the release. Do not suppress findings or treat
   historical pre-boundary Entitlement absence as drift.
8. Start API replicas without traffic and require readiness 200. Deploy the web
   digest and check its rendered CSP uses `'self'` for a same-origin API or the
   exact configured HTTPS API origin for a separate-origin release, with no
   source maps or local endpoints.
9. Route a canary, run non-destructive health/auth/catalog/media checks, then
   increase traffic. Keep real-money mutation outside an automated smoke test.
10. Start the scheduler, watch structured logs and provider dashboards, and
    retain the previous image digests for rollback.

## MongoDB backup, indexes, and preflight

Prefer provider-native point-in-time backups for production. Record the backup
ID, source database, start/end time, encryption/retention, Git SHA, boundary,
and recovery owner. Define RPO/RTO with the operator; this repository cannot
promise them. A backup is not verified until restored into an isolated target.

For a disposable staging rehearsal with MongoDB Database Tools, quiesce API,
seed, webhook, and recovery writers and drain in-flight work first. Keep each
URI in a MongoDB Tools YAML config owned by the job user with mode 0600; populate
the single `uri` key directly from the secret manager, never with an echoed
command or a `--uri` argument that is visible in a process listing. Each URI
must either omit its default database path or name the same source/restore
database passed to that config's `mongodump --db` probe; MongoDB Database Tools
reject conflicting URI and command-line database selections. The restore
principal also needs read/list access to the isolated target so the emptiness
probe can fail closed before it exercises restore privileges.

Run this block with Bash so every guard, dump, checksum, and restore error stops
the rehearsal immediately:

```bash
set -euo pipefail
repository_root="$(pwd -P)"
backup_dir="$(mktemp -d /var/tmp/studynotion-backup.XXXXXX)"
case "$backup_dir" in /var/tmp/studynotion-backup.*) ;; *) exit 2 ;; esac
chmod 0700 "$backup_dir"
: "${SOURCE_DATABASE:?Set the exact source database name}"
: "${RESTORE_DATABASE:?Set the exact restore database name}"
: "${SOURCE_MONGODB_TOOLS_CONFIG:?Set the absolute source MongoDB Tools config path}"
: "${RESTORE_MONGODB_TOOLS_CONFIG:?Set the absolute restore MongoDB Tools config path}"
test "$SOURCE_DATABASE" != "$RESTORE_DATABASE"
test "$SOURCE_MONGODB_TOOLS_CONFIG" != "$RESTORE_MONGODB_TOOLS_CONFIG"
for tools_config in \
  "$SOURCE_MONGODB_TOOLS_CONFIG" \
  "$RESTORE_MONGODB_TOOLS_CONFIG"; do
  case "$tools_config" in
    /*) ;;
    *) echo "MongoDB Tools config path must be absolute" >&2; exit 2 ;;
  esac
  tools_config_directory="$(CDPATH= cd -- "$(dirname -- "$tools_config")" && pwd -P)"
  tools_config_realpath="$tools_config_directory/$(basename -- "$tools_config")"
  test "$tools_config_realpath" = "$tools_config"
  case "$tools_config_realpath" in
    "$repository_root"|"$repository_root"/*)
      echo "MongoDB Tools configs must remain outside the checkout" >&2
      exit 2
      ;;
  esac
  test -f "$tools_config"
  test ! -L "$tools_config"
  test -O "$tools_config"
  test -s "$tools_config"
  if stat --version >/dev/null 2>&1; then
    tools_config_mode="$(stat -c '%a' "$tools_config")"
    tools_config_bytes="$(stat -c '%s' "$tools_config")"
  else
    tools_config_mode="$(stat -f '%Lp' "$tools_config")"
    tools_config_bytes="$(stat -f '%z' "$tools_config")"
  fi
  test "$tools_config_mode" = 600
  test "$tools_config_bytes" -le 32768
done
if test "$SOURCE_MONGODB_TOOLS_CONFIG" -ef "$RESTORE_MONGODB_TOOLS_CONFIG"; then
  echo "Source and restore MongoDB Tools configs must be separate files" >&2
  exit 2
fi
case "$RESTORE_DATABASE" in
  studynotion_restore_disposable_*) ;;
  *) echo "Restore target is not explicitly disposable" >&2; exit 2 ;;
esac
mongodump --config="$SOURCE_MONGODB_TOOLS_CONFIG" \
  --db="$SOURCE_DATABASE" \
  --archive="$backup_dir/staging.archive.gz" --gzip
openssl dgst -sha256 "$backup_dir/staging.archive.gz" \
  > "$backup_dir/staging.archive.gz.sha256"
openssl dgst -sha256 "$backup_dir/staging.archive.gz" \
  | cmp - "$backup_dir/staging.archive.gz.sha256"
cat "$backup_dir/staging.archive.gz.sha256"
restore_probe_dir="$backup_dir/restore-target-probe"
mkdir -m 0700 "$restore_probe_dir"
mongodump --config="$RESTORE_MONGODB_TOOLS_CONFIG" \
  --db="$RESTORE_DATABASE" --out="$restore_probe_dir" --quiet
if find "$restore_probe_dir" -type f -print -quit | grep -q .; then
  echo "Restore target already contains collections; refusing to merge" >&2
  exit 2
fi
mongorestore --config="$RESTORE_MONGODB_TOOLS_CONFIG" \
  --archive="$backup_dir/staging.archive.gz" --gzip \
  --nsInclude="${SOURCE_DATABASE}.*" --nsFrom="${SOURCE_DATABASE}.*" \
  --nsTo="${RESTORE_DATABASE}.*" --stopOnError
```

Pre-resolve `SOURCE_DATABASE` and `RESTORE_DATABASE`; the latter must be a new
isolated disposable database. The guarded probe uses the restore principal to
dump the target and refuses the operation if any existing collection metadata
or data file is found. Keep the target quiesced after this check. Compare the
printed digest with the private recorded digest after every transfer. Inspect
the rendered namespace mapping before approval. The rehearsal deliberately
omits `--drop`; `--stopOnError` must hold on any collision or restore fault. Resume
writers only after the archive completes. After restore, point the exact API
image and full staging runtime environment at the restored database, preserving
the original boundary, then run index verification and preflight. Compare
collection/document counts and a non-destructive catalog/login/playback smoke
result. Retain the checksum and redacted reports; remove the restored database
only through the provider's reviewed cleanup workflow. Use a provider-native
point-in-time snapshot for a live, write-active production backup rather than
claiming this quiesced archive procedure has point-in-time consistency. The
temporary directory must resolve outside the Git checkout; move only the archive
and checksum to approved encrypted storage. Create the two MongoDB Tools config
files before running the block by injecting their single `uri` values directly
from the secret manager. The block never creates, populates, copies, prints, or
deletes those operator-owned files. Remove their ephemeral secret bindings using
the platform's normal secret-cleanup workflow after the rehearsal.

Index creation is additive and idempotent; it never calls `syncIndexes`, drops
indexes, or rewrites documents. Automatic production index creation remains
disabled:

```bash
set -euo pipefail
case "${DEPLOYMENT_TIER:?Set DEPLOYMENT_TIER to staging or production}" in
  staging|production) ;;
  *) echo "Invalid DEPLOYMENT_TIER" >&2; exit 2 ;;
esac
: "${STUDYNOTION_API_IMAGE_DIGEST:?Set the reviewed immutable API digest}"
: "${STUDYNOTION_INDEX_ENV_FILE:?Set the absolute private index env-file path}"
: "${STUDYNOTION_PREFLIGHT_ENV_FILE:?Set the absolute private preflight env-file path}"
npm run ops:validate-image
test "$STUDYNOTION_INDEX_ENV_FILE" != "$STUDYNOTION_PREFLIGHT_ENV_FILE"
for job_env in "$STUDYNOTION_INDEX_ENV_FILE" "$STUDYNOTION_PREFLIGHT_ENV_FILE"; do
  case "$job_env" in /*) ;; *) echo "Job env path must be absolute" >&2; exit 2 ;; esac
  test -f "$job_env"
  test ! -L "$job_env"
  test -O "$job_env"
  if stat --version >/dev/null 2>&1; then
    job_mode="$(stat -c '%a' "$job_env")"
  else
    job_mode="$(stat -f '%Lp' "$job_env")"
  fi
  test "$job_mode" = 600
done

docker run --rm --init --user node --read-only \
  --tmpfs /tmp:rw,noexec,nosuid,nodev,size=16m \
  --cap-drop ALL --security-opt no-new-privileges \
  --env-file "$STUDYNOTION_INDEX_ENV_FILE" \
  --env NODE_ENV=production --env DEPLOYMENT_TIER="$DEPLOYMENT_TIER" \
  --env MONGODB_AUTO_INDEX=false --env MIGRATION_CONFIRM=create-indexes \
  "$STUDYNOTION_API_IMAGE_DIGEST" npm run db:indexes

docker run --rm --init --user node --read-only \
  --tmpfs /tmp:rw,noexec,nosuid,nodev,size=16m \
  --cap-drop ALL --security-opt no-new-privileges \
  --env-file "$STUDYNOTION_PREFLIGHT_ENV_FILE" \
  --env NODE_ENV=production --env DEPLOYMENT_TIER="$DEPLOYMENT_TIER" \
  --env MONGODB_AUTO_INDEX=false --env INDEX_OPERATION=verify \
  "$STUDYNOTION_API_IMAGE_DIGEST" npm run db:indexes

docker run --rm --init --user node --read-only \
  --tmpfs /tmp:rw,noexec,nosuid,nodev,size=16m \
  --cap-drop ALL --security-opt no-new-privileges \
  --env-file "$STUDYNOTION_PREFLIGHT_ENV_FILE" \
  --env NODE_ENV=production --env DEPLOYMENT_TIER="$DEPLOYMENT_TIER" \
  --env MONGODB_AUTO_INDEX=false \
  "$STUDYNOTION_API_IMAGE_DIGEST" npm run preflight:production
```

The verification mode compares every registered Mongoose model with database
indexes and fails if any declared index is absent. The registry includes
Catalog, identity, Purchase, CourseProgress, Entitlement, and private
Entitlement-operation-audit indexes. Extra indexes are ignored and never
removed. Run the security-field backfill only when upgrading an older database and
only under its separate documented confirmation; it is unrelated to historical
Entitlement backfill.

Create both env files outside the checkout and load their values directly from
the secret manager. The index file contains only `MONGODB_URI` plus optional
bounded MongoDB timeout variables; its principal may create indexes but should
not mutate application documents. The separate preflight file contains the full
validated runtime contract with a read-only `MONGODB_URI`. Never put either URI
on the command line, and retain the digest plus redacted job output as release
evidence.

With `NODE_ENV=production` and a valid `DEPLOYMENT_TIER` set as shown, preflight
validates the full production-style runtime before MongoDB, then performs
read-only data, media, enrollment, and Stage 2 operational checks. The CLI
rejects an omitted, test, development, or mistyped runtime posture; disposable
data-only coverage runs only through the guarded integration suite and is not
release evidence. Exit codes are 0 healthy, 1 warning, 2 blocking, and 3
operational error. Release requires 0. Production preflight must never receive
a database principal with write permission.

## Entitlement recovery schedule

Run the existing recovery as a one-shot scheduled container, not inside the
Express process. `compose.operations.yml` is a portable adapter around the exact
API image. The recovery-only database principal needs only the MongoDB reads and
Stage 2 compare-and-set writes used by the worker; it needs no Redis or provider
credentials.

Prepare a recovery-only env file outside the repository, owned by the scheduler
user with mode 0600. It must contain only `MONGODB_URI`,
`ENTITLEMENT_SIDECAR_STARTED_AT`,
`ENTITLEMENT_RECOVERY_CONFIRM=reconcile-entitlements`, and, when needed, the
allowlisted `MONGODB_CONNECT_TIMEOUT_MS`,
`MONGODB_SERVER_SELECTION_TIMEOUT_MS`, `MONGODB_SOCKET_TIMEOUT_MS`, and
`MONGODB_OPERATION_TIMEOUT_MS`. Connect/server-selection values are capped at
60000 ms; socket/operation values are capped at 10000 ms to match the worker's
lease-safe contract. Do not reuse or copy the full API runtime env;
provider, application, and user credentials are forbidden in this file.
Prepare a persistent 0700 state directory owned by the container's effective
user. Resolve that numeric identity from the exact digest and verify the host
inputs before scheduling:

```bash
set -eu
npm run ops:validate-image
api_uid="$(docker run --rm --entrypoint id "$STUDYNOTION_API_IMAGE_DIGEST" -u node)"
api_gid="$(docker run --rm --entrypoint id "$STUDYNOTION_API_IMAGE_DIGEST" -g node)"
test "${STUDYNOTION_ENTITLEMENT_RECOVERY_STATE_DIR:?}" = \
  /var/lib/studynotion/entitlement-recovery
test ! -L /var/lib/studynotion
sudo mkdir -p /var/lib/studynotion
test -d /var/lib/studynotion
test ! -L /var/lib/studynotion
test ! -e /var/lib/studynotion/entitlement-recovery
sudo install -d -m 0700 -o "$api_uid" -g "$api_gid" \
  /var/lib/studynotion/entitlement-recovery
if stat --version >/dev/null 2>&1; then
  state_identity="$(stat -c '%a:%u:%g' "$STUDYNOTION_ENTITLEMENT_RECOVERY_STATE_DIR")"
else
  state_identity="$(stat -f '%Lp:%u:%g' "$STUDYNOTION_ENTITLEMENT_RECOVERY_STATE_DIR")"
fi
test "$state_identity" = "700:${api_uid}:${api_gid}"
npm run ops:validate-recovery-host
docker compose -f compose.operations.yml config --quiet
```

The creation block is first-install only and deliberately fails if the exact
state directory already exists. On later deployments, do not reinstall or
change ownership blindly; rerun the immutable-image gate plus the non-symlink
and exact `700:uid:gid` checks before `config --quiet`.

Configure the platform scheduler every minute with maximum concurrency 1 and a
90-second termination deadline plus a 15-second hard-kill grace. On a Linux
Docker host the job payload validates the immutable image reference and private
host inputs on every invocation immediately before starting the container:

```bash
set -eu
npm run ops:validate-image
npm run ops:validate-recovery-host
timeout --signal=TERM --kill-after=15s 90s \
  docker compose -f compose.operations.yml up \
  --abort-on-container-exit \
  --exit-code-from entitlement-recovery \
  entitlement-recovery
```

Do not use `docker compose run`, scale the service, or discard the state
directory between invocations. The adapter reads a canonical private
continuation, invokes one bounded batch (default 25), and atomically replaces a
0600 checkpoint. At end-of-scan it stores an empty versioned checkpoint so the
next invocation wraps safely. Neither output nor errors expose the continuation
or checkpoint path.

The MongoDB lease/CAS protocol remains the correctness boundary if different
hosts overlap accidentally; the scheduler's no-overlap setting is for
efficiency. Record exit codes and duration. Code 0 is completed, 1 is warning,
and 3 is an operational/configuration/checkpoint failure. The mutating scheduled
adapter does not run `--status-only`, so it does not emit code 2; the separate
read-only recovery status/preflight gate emits 2 for blocking state. Alert
immediately on any status/preflight 2, scheduler 3, and repeated or unusual
scheduler 1 results. The internal mutation budget is 45 seconds and remains
below the 60-second recovery lease.

## Health, security, and provider checks

The web `/health` endpoint proves only that Nginx can serve the artifact. API
`/health/live` proves that the process/event loop is alive and remains
independent of providers. API `/health/ready` returns 503 during shutdown or
when MongoDB, the Redis rate-limit store, or production Cloudinary
configuration is unavailable. It intentionally checks Cloudinary configuration
rather than making a flaky external request on every probe.

Redis is required in staging/production, uses TLS, is pinged before listen, and
affects readiness. A transient store failure makes rate-limited endpoints fail
closed (`passOnStoreError=false`); it does not silently switch replicas to
independent in-memory limits.

Sessions are 12-hour HttpOnly cookies with path `/`, `Secure` in production,
and the configured SameSite/domain policy. Logout increments the session
version and clears current plus legacy cookie variants. CORS allows credentials
only for exact configured origins. Unsafe browser methods also pass the trusted
Origin/Sec-Fetch-Site boundary. Never fix a deployment mismatch with `*`, by
disabling credentials, or by weakening trusted-origin checks.

The Razorpay webhook is `POST /api/v1/payment/webhook`. It receives a bounded
raw body before JSON parsing and verifies the independent webhook signature;
fulfillment and replay are idempotent. Staging subscribes test-mode
`payment.captured` and `order.paid` events to the HTTPS endpoint. Exercise test
checkout/refund/replay only; production live-money checks require explicit
human approval.

Cloudinary lesson videos must use `videoDeliveryType=authenticated` with a
stored public ID and format; the API issues short-lived signed playback URLs.
Provider secrets stay backend-only, signed URLs are redacted from logs, and the
frontend does not persist them globally. Staging and production use different
folders/assets.

Resend covers OTP, password reset/update, enrollment/payment confirmation, and
contact delivery. Verify the sender domain, reply-to and contact destination
with sandbox recipients before promotion. Failure is surfaced to the existing
request/recovery semantics; do not log provider payloads. This repository does
not implement generic SMTP variables.

When Google is enabled, both client IDs must match, the exact app HTTPS origin
must be authorized, and server-side ID-token audience verification remains
enabled. When it is omitted in staging, the login divider/button/copy is hidden;
local email login remains available.

## Smoke and accessibility evidence

After deployment, first check headers, health, CSP, exact CORS, cookies, and the
public catalog. Confirm there are no localhost requests, mixed content, source
maps, broken assets, unhandled console errors, or unexpected API-to-SPA 200s.
Then use disposable staging accounts to run:

```text
health/readiness -> signup or login -> catalog -> course detail
instructor create/edit/publish -> student discovery -> Razorpay test checkout
signed webhook -> legacy enrollment + Entitlement sidecar -> protected playback
lesson completion -> persisted progress -> logout/login -> persisted progress
```

The Compose service has a 10-second stop grace, so a TERM from `timeout` causes
the Docker daemon to kill a stuck container before the client reaches its
15-second hard-kill deadline. Treat timeout exits as operational errors and
confirm the fixed-name container is stopped before the next invocation.

Also verify payment/webhook replay, unenrolled playback denial, invalid lesson
denial, expired session behavior, and logout cookie clearing. Run the committed
live Playwright suite against the public URL with injected demo credentials.
Exercise Chromium desktop/mobile plus WebKit where the configured runner makes
it available. Keep the existing axe checks for keyboard navigation, focus,
headings, landmarks, dialogs/drawers, and progress semantics. Never point these
mutating journeys at production.

Before public staging, run the full Node 24 verification matrix, both Docker
builds, local Compose health/live E2E, integration services, production-style
index/preflight/recovery jobs against disposable data, both npm audits, the
secret scanner, and `git diff --check`. Inspect the web/API image history and
filesystem to confirm no env file, Git history, tests, source maps, or server
secret is present.

Record dependency audits as two distinct gates, running these exact commands
from the repository root. The first audits the root workspace graph; the second
audits from the backend package directory. Do not use `npm audit fix --force`.

```bash
npm audit
cd apps/api && npm audit
```

## Logging, monitoring, and alerts

The API emits structured JSON with timestamp, severity, application/version,
environment, request ID, route template, method, status, and bounded error
metadata. Sensitive keys, credentialed URIs, bearer/JWT values, emails,
provider secrets, and signed media URLs are redacted. Operational scripts emit
mostly bounded aggregate reports. Enrollment audit and preflight reports can
include bounded raw record IDs for diagnosis; treat every operational report as
private, restrict access and retention, and never attach an unreviewed report to
a public ticket.

At minimum, retain searchable API/job logs and platform health/restart events;
alert on readiness failure, crash/restart loops, HTTP 5xx/error-rate spikes,
Redis/MongoDB disconnects, recovery exit 2/3 or repeated 1, manual payment
review, failed webhook delivery, and backup failure. Use provider dashboards for
MongoDB, Redis, Cloudinary, Resend, and Razorpay. No paid error-monitoring vendor
is required for interview staging; adding one needs a separate reviewed change.

## Rollback

Rollback is a traffic/config operation, not a Git history rewrite:

1. Stop promotion and preserve logs, request IDs, job reports, and both image
   digests.
2. If the new API is unsafe, stop its traffic and scheduled job, then route to
   the previous immutable API/web digests.
3. Preserve the original `ENTITLEMENT_SIDECAR_STARTED_AT`; never move it during
   rollback. Keep Entitlement records/history and additive indexes in place.
4. Re-enable the recovery job only with an image compatible with the retained
   Stage 2 records and boundary. Rerun readiness and non-mutating smoke checks.
5. Use database restore only for an independently diagnosed data incident with
   explicit approval. Restore into isolation first, verify it, and reconcile
   writes since the recovery point before any cutover.

Never force-push, reset shared Git history, drop Entitlement/index data, run a
historical backfill, or silently change enrollment authority as rollback.

## Promotion record

Do not mark a stage complete without attaching evidence for every applicable
item:

- reviewed Git SHA and immutable web/API digests;
- CI, security scan, audits, Node 24 tests, integration, E2E, Docker, and image
  inspection results;
- HTTPS/DNS, exact CORS, CSP, secure cookie, health/readiness, and public smoke
  results;
- provider configuration and non-production test evidence;
- backup ID/checksum plus isolated restore/preflight result;
- controlled index create/verify and read-only preflight reports;
- recovery scheduler invocation, exit code, duration, and alert route;
- previous digests, preserved boundary, rollback owner, and rollback smoke
  result.

Repository-side success means **staging-ready**, not deployed or production
ready. Public interview readiness additionally requires real HTTPS staging,
configured providers, protected demo media, safe demo accounts, and a passing
public smoke/accessibility run. Production readiness additionally requires
live infrastructure/provider evidence, a verified backup/restore, monitoring,
and an approved promotion.
