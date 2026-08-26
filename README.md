# StudyNotion

StudyNotion is a modernized MERN learning-commerce and LMS application. The
repository has evolved from an earlier full-stack codebase into a production-
oriented npm monorepo; it is not presented as a ground-up rewrite. It supports
public course discovery, student learning and progress, instructor course
management, admin operations, cookie-based authentication, protected
Cloudinary media, Resend email, Google Identity, and server-priced Razorpay
purchases.

The repository is an npm workspace. Application code is separated under
`apps/`, while shared API contracts, end-to-end tests, deployment orchestration,
and operational documentation remain at the repository root.

## Repository map

```text
apps/
  web/                    React 19/Vite application and Nginx image
    src/
      app/                bootstrap, providers, router, and store
      pages/              route-level composition
      widgets/            reusable page-scale compositions
      features/           user actions and use cases
      entities/           client-side business concepts
      shared/             business-agnostic UI, API, hooks, and utilities
  api/                    Node 24/Express API and operational jobs
    app/                  HTTP application composition
    bootstrap/            process and server lifecycle
    domains/              mature domain-oriented vertical slices
    routes/               compatibility and public route registration
    controllers/          legacy-compatible HTTP handlers
    models/               Mongoose persistence models
    scripts/              one-shot operational commands
    test/                 unit, contract, and integration tests
packages/
  contracts/              shared Zod contracts and generated OpenAPI
e2e/                      Playwright mock and live-stack journeys
docs/                     architecture decisions, audits, and runbooks
scripts/                  repository-wide validation and operations helpers
.github/                   CI, security, and dependency automation
compose.*.yml              local, integration, and operations adapters
```

## Current stack

- React 19, React Router 8, Vite 8, Tailwind CSS 4, Redux Toolkit, and RTK Query
- Node.js 24, Express 5, Mongoose 9, MongoDB 8-compatible deployments, and Redis
- Zod 4 shared runtime contracts with a committed OpenAPI 3.1 document
- Razorpay, Cloudinary, Resend, and Google Identity provider integrations
- Vitest, Node's test runner, Playwright, ESLint, Prettier, Docker, and Nginx

## Architecture

The frontend dependency direction is:

```text
app -> pages -> widgets -> features -> entities -> shared
```

Lower layers cannot import upward, one feature cannot import another feature's
internals, and page/UI code cannot call the raw HTTP transport directly. The API
remains a domain-oriented modular monolith; it is not forced into frontend
layers. Existing `/api/v1` behavior is preserved while mature `/api/v2` slices
use validation, controller, service, repository, mapper, and shared-contract
boundaries where that structure already adds value.

See [ADR 0011](docs/architecture/0011-repository-modularization.md) for the
repository boundaries and dependency rules. The
[deployment runbook](docs/operations/deployment.md) is authoritative for the
newer runtime topology.

The current AWS staging topology is same-origin:

```text
Browser
  -> HTTPS / AWS entry point
  -> main Nginx/web container :8080
  -> /api/v1
  -> API container on task loopback :4000
```

Nginx serves the React application and proxies `/api` without rewriting the
path. An explicit separate HTTPS API origin remains supported for deployments
that deliberately route the two services independently.

## Main functionality

- Public users can browse and filter published courses, view course details,
  use the contact flow, and review the legal policies before signup or checkout.
- Students can manage a cart, purchase server-priced courses, view immutable
  purchase history, request eligible refunds, access enrolled curricula, record
  progress, and submit course reviews.
- Instructors require Admin approval before login. Approved instructors can
  create, edit, publish, and manage their own courses and curricula and view
  instructor dashboard data.
- Admins can approve or reject instructor applications, manage categories, and
  resolve payment/refund reconciliation cases through server-authorized routes.

## Requirements

- Node.js 24 (`nvm use` reads `.nvmrc`)
- npm 10 or newer
- MongoDB on `127.0.0.1:27017` for direct local API development
- Redis when exercising production-style shared rate limiting
- Docker Desktop for the containerized local and integration workflows

## Local development

Install all workspaces from the repository root:

```bash
nvm use
npm ci
```

Create local configuration without overwriting existing files:

```bash
test -e apps/web/.env || cp apps/web/.env.example apps/web/.env
test -e apps/api/.env || cp apps/api/.env.example apps/api/.env
```

Generate different random values of at least 32 characters for `JWT_SECRET`
and `OTP_SECRET`. `ALLOW_DEV_OTP=true` may be used only in local development.
Use `apps/web/.env` for browser-public `VITE_*` values and `apps/api/.env` for
private API values. The API loads only its application-owned file. A legacy
root `.env` may still supply browser-public `VITE_*` values for compatibility;
new configuration belongs under `apps/web`. An old `server/.env`, if found in
another checkout, is sensitive local residue: it remains ignored but is not
loaded by the application and must never be migrated into Git.

Start both applications:

```bash
npm run dev
```

- Web: `http://localhost:3000`
- API v1: `http://localhost:4000/api/v1`
- Public catalog v2: `http://localhost:4000/api/v2/courses`
- Liveness: `http://localhost:4000/health/live`
- Readiness: `http://localhost:4000/health/ready`

Seed idempotent local demo data when needed:

```bash
npm --workspace studynotion-backend run seed
```

Seeded local accounts are:

- `admin@studynotion.local` / `Admin@123`
- `instructor@studynotion.local` / `Instructor@123`
- `student@studynotion.local` / `Student@123`

The seed rejects production and guards every non-loopback target. Cloudinary,
Resend, Google, and Razorpay may be omitted for local catalog evaluation; their
corresponding upload, delivery, federated-login, and checkout behavior remains
unavailable until valid development credentials are supplied.

## Root commands

Run normal development and verification commands from the repository root:

```bash
npm run dev                 # web and API watch processes
npm run dev:web             # Vite only
npm run dev:api             # API only
npm run format:check        # repository formatting
npm run lint                # ESLint and architecture boundaries
npm run typecheck           # web TypeScript boundary
npm run test:frontend       # Vitest frontend suite
npm run test:backend        # Node API suite
npm run build               # validated release web build
npm run build:local         # local web build
npm run verify              # contracts, format, lint, types, unit tests, build
npm run test:integration    # guarded MongoDB/Redis integration suites
npm run test:e2e            # mock Playwright browser matrix
npm run test:e2e:live       # configured live-stack browser journeys
npm run contracts:generate  # regenerate committed OpenAPI
npm run architecture:check  # frontend and backend dependency boundaries
```

Install the repository-pinned Playwright browsers once after `npm ci`:

```bash
npx playwright install chromium webkit
```

`npm run verify` intentionally does not start disposable integration services or
run browser journeys. CI runs those as independent gates so a path migration
cannot make the main verification command silently skip them.

## Containerized local evaluation

`compose.local.yml` builds the two application images, starts MongoDB and Redis,
and publishes only the web and API ports on loopback. `compose.local.env` is
user-owned, ignored, and must never be replaced by automation.

```bash
test -e compose.local.env || cp compose.local.env.example compose.local.env
docker compose --env-file compose.local.env -f compose.local.yml up -d --build --wait
docker compose --env-file compose.local.env -f compose.local.yml run --rm seed
```

Verify the running stack:

```bash
curl --fail http://localhost:3000/health
curl --fail http://localhost:4000/health/ready
curl --fail --header 'Origin: http://localhost:3000' \
  'http://localhost:4000/api/v2/courses?limit=3'
npm run test:e2e:live
```

If `STUDYNOTION_WEB_PORT` is not `3000`, set
`STUDYNOTION_LIVE_BASE_URL=http://localhost:<port>` for the live suite and keep
the same loopback hostname in the matching CORS origin.

Stop it without deleting the local database volume:

```bash
docker compose --env-file compose.local.env -f compose.local.yml down
```

Add `--volumes` only when intentionally resetting this named disposable stack.

For the guarded integration matrix:

```bash
docker compose -f compose.integration.yml up -d --wait
CATALOG_TEST_MONGODB_URI=mongodb://127.0.0.1:27018/studynotion_catalog_test_local \
CATALOG_TEST_REDIS_URL=redis://127.0.0.1:6380/14 \
ENROLLMENT_TEST_MONGODB_URI=mongodb://127.0.0.1:27018/studynotion_enrollment_test_local \
ENTITLEMENT_TEST_MONGODB_URI=mongodb://127.0.0.1:27018/studynotion_entitlement_test_local \
ENTITLEMENT_STAGE2_TEST_MONGODB_URI=mongodb://127.0.0.1:27018/studynotion_entitlement_stage2_test_local \
LEARNING_TEST_MONGODB_URI=mongodb://127.0.0.1:27018/studynotion_learning_test_local \
LEARNING_TEST_REDIS_URL=redis://127.0.0.1:6380/15 \
MONGOOSE_TEST_MONGODB_URI=mongodb://127.0.0.1:27018/studynotion_mongoose_test_local \
PREFLIGHT_TEST_MONGODB_URI=mongodb://127.0.0.1:27018/studynotion_preflight_test_local \
npm run test:integration
docker compose -f compose.integration.yml down
```

## Environment boundaries

- `apps/web/.env*` contains only browser-public `VITE_*` values.
- `apps/api/.env*` contains database, authentication, cookie, provider,
  timeout, logging, and operational secrets.
- `compose.local.env` configures only the user-owned local Compose stack.
- Staging and production examples are sanitized contracts, not deployable
  credentials.
- The browser receives the Razorpay key ID only. `RAZORPAY_SECRET` and
  `RAZORPAY_WEBHOOK_SECRET` are backend-only secrets.

Production validation rejects missing providers, placeholders, weak signing
secrets, insecure URLs, non-TLS Redis, invalid MongoDB posture, and payment keys
that do not match the deployment tier. Copy values into a deployment secret
manager; never commit a populated environment file.

## Builds and deployment

The web build output is `apps/web/dist/`. Both images use the repository root
as their Docker context so npm workspaces and `packages/contracts` are
available:

```bash
docker build -f apps/web/Dockerfile -t studynotion-web \
  --build-arg VITE_DEPLOYMENT_TIER=production \
  --build-arg VITE_API_BASE_URL=/api/v1 \
  --build-arg VITE_GOOGLE_CLIENT_ID=replace.apps.googleusercontent.com \
  --build-arg VITE_RAZORPAY_KEY_ID=rzp_live_REPLACE123 \
  --build-arg VITE_SUPPORT_EMAIL=support@example.com \
  --build-arg VITE_LEGAL_ENTITY_NAME='Registered entity' \
  --build-arg VITE_LEGAL_ADDRESS='Registered address' \
  --build-arg VITE_LEGAL_JURISDICTION=India \
  .
docker build -f apps/api/Dockerfile -t studynotion-api .
```

The web image is an unprivileged Nginx service on port 8080. In the current
same-origin AWS deployment it is the main container: it serves the SPA and
proxies `/api` to the API container on task loopback port 4000. The API path is
preserved, forwarded request metadata is retained, and API-shaped requests
cannot fall through to the SPA. An absolute HTTPS `VITE_API_BASE_URL` remains a
supported alternative when public ingress intentionally exposes a separate API
origin.

The complete environment inventory, staging seed, backup/restore rehearsal,
controlled indexes, production preflight, recovery scheduler, smoke tests,
monitoring, and rollback contract are in the
[deployment runbook](docs/operations/deployment.md). API-specific security,
payment, Entitlement, index, and provider procedures are in the
[API guide](apps/api/README.md).

Entitlement remains a Stage 2 non-authoritative sidecar: writers and bounded
recovery are active, legacy enrollment mirrors remain the authorization source,
and there is no historical backfill or shadow authorization reader.

## Security posture

- Real environment files and Compose secrets are ignored; browser `VITE_*`
  values are public build inputs, while API/provider credentials are injected at
  runtime and are never copied into either image.
- Production sessions use HttpOnly cookies with explicit Secure, SameSite,
  domain, trusted-origin, CORS, proxy-hop, and session-version controls.
- Server middleware enforces active-account, policy, deletion-state, role, and
  resource-ownership authorization; frontend route guards are not treated as
  the security boundary.
- Checkout totals come from server-side course prices. Razorpay browser and
  webhook signatures, immutable purchase evidence, idempotency, and audited
  reconciliation protect payment state.
- New lesson videos use authenticated Cloudinary delivery. Only entitled
  students, owning instructors, or Admins receive short-lived signed playback
  URLs; protected media metadata is excluded from public contracts.

## Security and dependency maintenance

Before staging or committing, follow the
[repository safety runbook](docs/security/repository-safety.md) and run:

```bash
node scripts/scan-secrets.mjs
git diff --check
```

Do not use `npm audit fix --force`, weaken dependency review, or merge a major
Dependabot update solely to clear a bot queue. The August 2026 read-only
Dependabot disposition is recorded in
[`docs/audits/dependabot-2026-08.md`](docs/audits/dependabot-2026-08.md).

## License

This repository does not currently include a root `LICENSE` file. Treat it as
private source code until the owner publishes an explicit license.
