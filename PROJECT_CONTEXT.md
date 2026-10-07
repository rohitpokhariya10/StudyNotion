SOURCE CODE IS THE FINAL SOURCE OF TRUTH.

Before answering an implementation-specific question:

1. Read PROJECT_CONTEXT.md.
2. Read the relevant docs/ai-context file.
3. Inspect the actual source files involved.
4. Trace callers/dependencies if required.
5. Do not answer purely from generic framework knowledge.
6. Give exact file paths when explaining implementation.
7. If documentation conflicts with source code, trust the source code.

# StudyNotion

## What This Project Is

A course marketplace and learning SPA for Students, Instructors, and Admins. Students buy courses and track lesson completion; approved instructors author curricula; admins approve instructors and reconcile payments/refunds. This checkout does not implement a school administration platform.

Audit baseline: Git `7b367c0`, inspected 2026-10-04. These documents are a source-derived navigation aid, not proof of live deployment. See [scope and findings](docs/ai-context/PROJECT_OVERVIEW.md).

## Tech Stack

Node 24 target; npm workspaces; React 19, React Router 8, Vite 8, Tailwind 4, Redux Toolkit/RTK Query; Express 5; Mongoose 9/MongoDB; Redis rate limiting; shared Zod 4/OpenAPI 3.1 contracts. Application code is mostly JavaScript/JSX with incremental TypeScript configuration. See [dependencies](docs/ai-context/DEPENDENCIES.md).

## Repository Architecture

`apps/web` is the SPA; `apps/api` is the API and operational CLIs; `packages/contracts` is shared runtime validation. Frontend imports flow down `app → pages → widgets → features → entities → shared`. Backend v1 controllers coexist with catalog/learning services and repositories and enrollment/entitlement domains. `apps/api/modules` is a future boundary. See [architecture](docs/ai-context/ARCHITECTURE.md), [repository map](docs/ai-context/REPOSITORY_MAP.md), and [file map](docs/ai-context/FILE_MAP.md).

## Frontend

`apps/web/index.html → src/app/main.jsx → bootstrap.jsx → AppProviders → App → AppRouter`. Lazy pages, nested dashboards, session restoration, route guards, RTK Query catalog/learning caches, and Axios v1 adapters. HttpOnly cookies carry sessions; Redux `auth.token` is a boolean compatibility flag. See [frontend](docs/ai-context/FRONTEND.md).

## Backend

`apps/api/index.js → bootstrap/createApiRuntime.js → app/createApp.js` and `bootstrap/createServerLifecycle.js`. Startup validates configuration, connects MongoDB and Redis, configures Cloudinary, then listens. Middleware includes Helmet, request IDs/logging, CORS, rate limiting, body limits, trusted browser origins, authentication, roles, validation, and terminal error handling. The raw Razorpay webhook is registered before JSON parsing. See [backend](docs/ai-context/BACKEND.md).

## Database

Twelve Mongoose models. Course references Section → SubSection; User references Profile; Purchase retains immutable financial snapshots; CourseProgress stores completed lesson IDs. `Course.studentsEnroled` gates current learner access; Student `User.courses` drives enrolled listings. Entitlement is a non-authoritative sidecar. No multi-document transaction wraps the legacy mirrors. See [database](docs/ai-context/DATABASE.md).

## Authentication

Email OTP → signup → login; bcrypt cost 12; HS256 JWT in an HttpOnly cookie with a 12-hour lifetime, issuer/audience, and DB-backed `sessionVersion`. Every protected request reloads active/approved account state. Google identity is server-verified. Logout/password changes revoke old session versions. Password reset stores a hash of a single-use challenge. No refresh-token flow exists. Policy and deletion gates supplement roles. See [authentication](docs/ai-context/AUTHENTICATION.md).

## Major Features

Public catalog/filtering/reviews; local and Google sign-in; policies/profile/security; instructor approval and course authoring/publishing/archiving; Razorpay checkout and webhook fulfillment; student purchases/refund requests; admin reconciliation; protected Cloudinary playback and learning progress; contact email; enrollment audit and entitlement recovery CLIs.

## Important Data Flows

- Catalog filters → RTK Query → v2 Zod validation → Mongo aggregation → public DTO → cards.
- Checkout → immutable Purchase → Razorpay → signed verification/webhook → legacy enrollment mirrors/progress → best-effort Entitlement sidecar → enrolled UI.
- Lesson route → v2 curriculum/progress → separately authorized v1 playback URL → video → mark-complete PUT → confirmed RTK cache update.
- Refund request → admin/provider reconciliation → confirmed refund → legacy access cleanup → sidecar terminalization.

See [complete flows](docs/ai-context/FEATURE_FLOWS.md).

## API Architecture

`/api/v1` exposes compatibility auth, profile, course, payment, admin, and contact routes with mixed response shapes. `/api/v2/courses` and two `/api/v2/learning/...` operations have strict contracts and stable envelopes. Other shared domain schemas do not establish live v2 endpoints. See [all 55 HTTP operations](docs/ai-context/API_MAP.md).

## State Management

Redux holds session/profile, persisted cart, course authoring, a legacy learning slice, and catalog/learning RTK Query reducers. Catalog state lives in URL filters plus cached responses. Playback URLs live in component state. There is no server-side session table or Redis course cache.

## External Services

Razorpay orders/payments/refunds; Cloudinary uploads and signed authenticated video delivery; Google Identity; Resend transactional email via native `fetch`; MongoDB and Redis. See [dependencies](docs/ai-context/DEPENDENCIES.md) and [security](docs/ai-context/SECURITY.md).

## Testing

Vitest/Testing Library frontend; Node test runner backend/contracts; seven opt-in Mongo/Redis integration suites; mocked Playwright catalog/learning and separate live-stack smoke tests. Audit run: frontend 199 passed; contracts 14 passed; backend 549 passed, seven integration suites skipped; OpenAPI, architecture, and type checks passed. This machine ran Node 26, outside the declared Node 24 target. See [testing and verification limits](docs/ai-context/TESTING.md).

## Docker

Local Compose: web on host 3000, API 4000, internal MongoDB/Redis; browser calls the absolute API URL. Release web image: unprivileged Nginx 8080 proxies `/api` to task loopback API 4000. Separate integration and entitlement-operations Compose files exist. See [Docker](docs/ai-context/DOCKER.md).

## CI/CD

GitHub Actions runs client, server, integration, browser, and container checks, plus separate security scanning. Container images are built/tested in CI; no checked-in registry push or deployment job exists. See [CI/CD](docs/ai-context/CICD.md).

## Deployment

Runbooks describe current AWS staging with same-origin ingress → Nginx → task-local API → private Mongo/Redis and providers. The code supports this topology, but this repository has no AWS infrastructure/task definitions or proof of live service state. Production requires a stricter environment/release-pair validation gate. See [deployment evidence](docs/ai-context/DEPLOYMENT.md).

## Security

Server-authoritative prices, signature verification, DB role/ownership checks, session revocation, origin checks, secure production cookies, restricted uploads, signed media, response projections, rate limits, secret scanning, and private operational checkpoints. Remaining limits include non-transactional mirrored state and incomplete entitlement migration. See [mechanisms and supported concerns](docs/ai-context/SECURITY.md).

## Important Entry Points

- [SPA bootstrap](apps/web/src/app/bootstrap.jsx), [router](apps/web/src/app/router/AppRouter.jsx), [store](apps/web/src/app/store/index.js).
- [API entry](apps/api/index.js), [route composition](apps/api/app/registerRoutes.js), [runtime environment](apps/api/config/env.js).
- [contracts](packages/contracts/src/index.js), [model directory](apps/api/models), [payments](apps/api/controllers/payments.js).
- [deployment runbook](docs/operations/deployment.md), [CI workflow](.github/workflows/ci.yml), [root scripts](package.json).

## Important Conventions

Preserve case-sensitive paths and legacy names such as `studentsEnroled`, `courseID`, and v1 `subsectionId` versus playback `subSectionId`. Course/catalog prices use major INR; Purchase amounts use integer paise. Do not treat Purchase status, progress, or Entitlement existence as interchangeable access evidence. V2 parsing goes into `res.locals.v2Input`; browser adapters send cookies, not JWT headers. Real environment values must stay private.

## Known Incomplete / Suspicious Areas

Entitlement authorization cutover, historical backfill, replacement workflows, and admin entitlement operations are deferred; `EntitlementOperationAudit` is inert. Most API domains remain v1. TypeScript does not check JS bodies. Legacy learning state/adapters and commented implementations remain. Catalog level/language lack normal authoring inputs. Course category edit comparison mixes string IDs and objects. Legacy auth storage cleanup can throw if storage is unavailable. API README calls the idempotency header mandatory, although the handler accepts omission. See [evidence register](docs/ai-context/PROJECT_OVERVIEW.md).

## Detailed Documentation

[Overview](docs/ai-context/PROJECT_OVERVIEW.md) · [Architecture](docs/ai-context/ARCHITECTURE.md) · [Repository map](docs/ai-context/REPOSITORY_MAP.md) · [File map](docs/ai-context/FILE_MAP.md) · [Frontend](docs/ai-context/FRONTEND.md) · [Backend](docs/ai-context/BACKEND.md) · [Database](docs/ai-context/DATABASE.md) · [Authentication](docs/ai-context/AUTHENTICATION.md) · [API map](docs/ai-context/API_MAP.md) · [Feature flows](docs/ai-context/FEATURE_FLOWS.md) · [Dependencies](docs/ai-context/DEPENDENCIES.md) · [Testing](docs/ai-context/TESTING.md) · [Docker](docs/ai-context/DOCKER.md) · [CI/CD](docs/ai-context/CICD.md) · [Deployment](docs/ai-context/DEPLOYMENT.md) · [Security](docs/ai-context/SECURITY.md) · [Learning guide](docs/ai-context/LEARNING_GUIDE.md)
