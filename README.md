# StudyNotion

StudyNotion is a full-stack edtech application with a Vite/React client and an
Express/MongoDB API. Authentication uses an HttpOnly cookie, email verification
uses Resend in production, Google sign-in uses Google Identity Services, and
payments use server-priced Razorpay purchases.

## Product capabilities

- Public course discovery with search, filters, sorting, cursor pagination, and
  explicit loading, empty, error, and not-found states.
- Student signup, OTP verification, local and Google sign-in, password recovery,
  policy acknowledgement, enrolled learning, progress, reviews, purchases, and
  refund requests.
- Instructor approval, course/curriculum/media management, publishing, learner
  analytics, and ownership-enforced API access.
- Admin-only instructor review and payment reconciliation workflows.
- Server-priced Razorpay checkout, signed idempotent webhooks, immutable purchase
  snapshots, protected Cloudinary playback, account-deletion recovery, and
  shared Redis-backed rate limiting.

## Architecture and stack

The browser uses React 19, React Router, Redux Toolkit/RTK Query, Axios, and
Tailwind CSS. A strict incremental TypeScript configuration checks typed files
while the existing JavaScript migrates by vertical slice. The API uses Node.js
24, Express 5, Mongoose/MongoDB, Redis, HttpOnly JWT sessions, Zod-backed shared
v2 contracts, Resend, Google Identity Services, Razorpay, and Cloudinary. Vite
builds the static web app; Nginx serves it as a non-root container. Both
applications share one npm lockfile and communicate through versioned `/api/v1`
and `/api/v2` routes.

```text
src/                    React application, state, UI, and frontend tests
server/                 Express API, domain modules, models, scripts, and tests
packages/contracts/     Shared JavaScript/Zod v2 contracts and OpenAPI source
e2e/                    Playwright browser journeys
docs/                   Architecture, security, query-plan, and audit evidence
.github/workflows/      CI and security automation
Dockerfile              Production web image
server/Dockerfile       Production API image
compose.local.yml       Disposable local end-to-end stack
```

## Local development

Prerequisites:

- Node.js 24 (`nvm use` reads `.nvmrc`)
- npm 10 or newer
- MongoDB running on `127.0.0.1:27017`
- Redis is optional locally and required for production or multi-replica rate
  limiting. Docker Desktop is needed only for the Compose workflow.

Install and configure:

```bash
nvm use
npm ci
cp .env.example .env
cp server/.env.example server/.env
```

The repository is an npm workspace. The root lockfile installs the React app,
the API workspace, and the JavaScript/Zod `@studynotion/contracts` package.
Do not create or maintain a separate `server/package-lock.json`.

Replace `JWT_SECRET` and `OTP_SECRET` in `server/.env` with two different
random values of at least 32 characters. For example, run `openssl rand -hex
32` twice. Development can use `ALLOW_DEV_OTP=true`; the API then returns the
OTP to the local frontend instead of requiring an email provider.

Environment files are grouped by responsibility:

- Root `.env`: public browser values only. Every key must start with `VITE_`.
- `server/.env`: database, authentication, cookie, email, Google, payment,
  media, rate-limit, timeout, and logging configuration. Never expose these
  secrets through a `VITE_` variable.
- `*.production.example`: sanitized production contracts. Production startup
  rejects missing providers, placeholder values, insecure application URLs,
  invalid database URLs, invalid cookie settings, weak signing secrets, and
  non-TLS Redis.

Cloudinary, Resend, Google, and Razorpay are optional for local catalog and demo
account evaluation. Their corresponding upload, outbound delivery, federated
login, and checkout features remain unavailable until valid development
credentials are supplied.

Seed useful local data and run both applications:

```bash
npm --workspace studynotion-backend run seed
npm run dev
```

The demo seed accepts loopback MongoDB hosts by default. A non-loopback target is
rejected unless its database name begins with `studynotion_seed_disposable_` and
the one-run environment includes
`STUDYNOTION_DISPOSABLE_SEED_CONFIRM=seed-disposable-database`. Production always
rejects the seed, including when that confirmation is present.

- Client: `http://localhost:3000`
- API: `http://localhost:4000/api/v1`
- Public catalog API: `http://localhost:4000/api/v2/courses`
- Liveness: `http://localhost:4000/health/live`
- Readiness: `http://localhost:4000/health/ready`

Seeded local accounts:

- `admin@studynotion.local` / `Admin@123`
- `student@studynotion.local` / `Student@123`
- `instructor@studynotion.local` / `Instructor@123`

Common development commands:

```bash
npm run dev                                      # web and API with watch mode
npm run client                                   # web only
npm run server                                   # API only
npm --workspace studynotion-backend run seed     # idempotent local demo data
npm run build:local                              # local frontend artifact
npm run typecheck                                # strict incremental TS gate
npm run contracts:test                           # shared schema unit tests
npm run contracts:generate                       # regenerate committed OpenAPI
```

## Containerized local evaluation

The local Compose stack builds the web and API images, starts MongoDB and
Redis, and publishes only the web and API ports on the loopback interface. It
uses an explicitly disposable database name and public local-only signing
values; it is not a production deployment configuration.

```bash
cp compose.local.env.example .env.compose.local
docker compose --env-file .env.compose.local -f compose.local.yml up -d --build --wait
docker compose --env-file .env.compose.local -f compose.local.yml run --rm seed
```

Open `http://127.0.0.1:3000` and use any seeded account listed above. Confirm
the web server, API dependencies, and catalog before testing longer journeys:

```bash
curl --fail http://127.0.0.1:3000/health
curl --fail http://127.0.0.1:4000/health/ready
curl --fail --header 'Origin: http://127.0.0.1:3000' \
  'http://127.0.0.1:4000/api/v2/courses?limit=3'
npm run test:e2e:live
```

If you change `STUDYNOTION_WEB_PORT`, set `STUDYNOTION_LIVE_BASE_URL` to the
matching `http://127.0.0.1:<port>` value when running the live browser suite.
Keep the host spelling aligned with `FRONTEND_ORIGINS`.

Stop the stack without deleting its local database volume:

```bash
docker compose --env-file .env.compose.local -f compose.local.yml down
```

To intentionally reset only this Compose project's disposable data, add
`--volumes` to the `down` command. External Google sign-in, email, Razorpay,
and Cloudinary writes stay disabled until their own development credentials
are supplied outside the committed sample configuration.

## Verification

```bash
npm run verify
npm run test:e2e
```

`npm run verify` checks OpenAPI drift, contract schemas, formatting, ESLint,
strict TypeScript, frontend tests, frontend compilation, and backend tests.
Individual commands are `npm run contracts:test`, `npm run format:check`,
`npm run lint`, `npm run typecheck`, `npm test`,
`npm --workspace studynotion-backend test`, `npm run test:integration`, and
`npm run test:e2e`. With the seeded Compose stack running,
`npm run test:e2e:live` verifies real student, instructor, admin, catalog, and
protected-playback paths. Coverage and transient Playwright output are
intentionally ignored.

The real MongoDB/Redis catalog check is intentionally separate from the unit
suite:

```bash
docker compose -f compose.integration.yml up -d --wait
CATALOG_TEST_MONGODB_URI=mongodb://127.0.0.1:27018/studynotion_catalog_test_local \
CATALOG_TEST_REDIS_URL=redis://127.0.0.1:6380/14 \
npm run test:integration
docker compose -f compose.integration.yml down
```

The integration test refuses production-looking targets and cleans only its
guarded disposable database and Redis database. CI runs these checks from the
committed root lockfile on Node.js 24. A local Node 26 result is compatibility
evidence only; Node 24 remains the supported runtime.

## Production providers

Copy values from `.env.production.example` and
`server/.env.production.example` into the deployment platform's secret
manager. Never commit real credentials.

The production application needs:

- MongoDB Atlas connection URI
- Managed Redis connection URL for shared rate limits
- Resend API key and a verified sender domain
- Public app URL, brand name/logo URL, and support email used in transactional email
- Registered legal entity, address, and jurisdiction shown on policy pages
- Google OAuth Web Client ID with authorized frontend origins
- Razorpay live key ID, secret, and webhook secret
- Cloudinary cloud name, API key, and API secret
- Two independently generated JWT/OTP secrets

The browser receives only `VITE_*` values. Database, email, payment, Cloudinary
and signing secrets belong only in the API environment.

The API rejects copied example placeholders and malformed production provider
values. It also requires independently generated JWT and OTP secrets. This is a
configuration guard, not a credential-activity check; run the provider go-live
checks in `server/README.md` with test accounts before launch.

Provider setup checklist:

1. In Resend, verify the sending domain, create a restricted API key, and set
   `RESEND_API_KEY`, `EMAIL_FROM`, `EMAIL_REPLY_TO`, and `CONTACT_RECIPIENT`.
2. In Google Cloud, create a Web OAuth client, register every exact HTTPS app
   origin, and set the same client ID as `GOOGLE_CLIENT_ID` and
   `VITE_GOOGLE_CLIENT_ID`. This release exchanges a Google Identity Services ID
   token; it does not expose a client secret in the browser.
3. In Razorpay, set live server keys and the matching public `VITE_` key. Add the
   HTTPS webhook `/api/v1/payment/webhook`, subscribe to `payment.captured` and
   `order.paid`, and store an independent webhook secret.
4. In Cloudinary, create least-privilege API credentials and configure the
   production folder. Upload a fresh lesson video so production serves only
   authenticated, expiring playback URLs.
5. Create managed MongoDB and TLS Redis instances in the same region as the API,
   restrict network access, and run the documented preflight/index sequence
   before accepting traffic.

## Deployment

Build the production frontend with `npm run build` and deploy `dist/` as
immutable static assets. This command validates every public provider, support,
and legal value and refuses placeholder, HTTP, or test payment configuration.
Use `npm run build:local` only for local artifact verification. Deploy the API
from the repository-root context with `server/Dockerfile`; an isolated
`server/` install is not supported because the API consumes the shared contract
workspace. The API must run behind HTTPS, use the configured trusted proxy
count, and pass `/health/ready` before receiving traffic.

For a non-container API host, install from the repository root, prune
development dependencies without rerunning lifecycle scripts, and start the
backend workspace:

```bash
npm ci --include=dev
npm prune --omit=dev --ignore-scripts
npm --workspace studynotion-backend start
```

```bash
docker build -t studynotion-web \
  --build-arg VITE_API_BASE_URL=https://api.your-domain.com/api/v1 \
  --build-arg VITE_GOOGLE_CLIENT_ID=your-web-client-id.apps.googleusercontent.com \
  --build-arg VITE_RAZORPAY_KEY_ID=rzp_live_REPLACE123 \
  --build-arg VITE_SUPPORT_EMAIL=support@your-domain.com \
  --build-arg VITE_LEGAL_ENTITY_NAME=REPLACE_WITH_REGISTERED_ENTITY \
  --build-arg VITE_LEGAL_ADDRESS=REPLACE_WITH_REGISTERED_ADDRESS \
  --build-arg VITE_LEGAL_JURISDICTION=India \
  .
docker build -f server/Dockerfile -t studynotion-api .
```

Both images use the repository root as their Docker context so the shared
contract workspace is available. The context excludes local environment files
and host dependencies.
The web image intentionally fails its build when any required public argument is
missing, uses HTTP, or does not look like the corresponding production key. The
web image also renders the exact API origin into its restrictive Content Security
Policy; the source `nginx.conf` placeholder must never be deployed directly.
Its Nginx master and workers run as the unprivileged `nginx` user on port 8080;
publish that port through the deployment platform rather than granting a
privileged bind capability.

For an existing database, follow the backup, security-field backfill,
`preflight:production`, and controlled index-creation sequence in
`server/README.md` before deploying this schema.

A complete container-platform rollout is:

1. Build immutable web and API image tags from one reviewed commit and push them
   to the deployment registry.
2. Load all production values from the platform secret manager; never bake a
   server secret into either image.
3. Run the security-field backfill once, run `preflight:production`, then create
   indexes from a controlled release job.
4. Deploy the API behind HTTPS, forward the configured proxy hop count, and wait
   for `/health/ready` before routing traffic.
5. Deploy the web image on internal port `8080`, configure its public domain,
   then register the final Google origin and Razorpay webhook URL.
6. Execute the provider go-live checks in `server/README.md`, monitor structured
   API logs by request ID, and reconcile any non-empty payment review queue.

Rollback by routing traffic to the previous immutable image tags. Do not roll
back security-field backfills; they are additive. Restore a database backup only
for a separately approved data incident, then rerun preflight and index checks.

## Troubleshooting and security notes

- `EBADENGINE` means the shell is not using Node 24; run `nvm use` and reinstall.
- A `503` readiness response names the unavailable database, Redis, or media
  check. Inspect API JSON logs using the returned `X-Request-Id`.
- A browser CORS/CSRF rejection usually means its exact origin is absent from
  `FRONTEND_ORIGINS`; do not solve it with a wildcard.
- If a production frontend build fails, replace every sample public value and
  use HTTPS/live-provider identifiers. Use `build:local` only for local checks.
- Never seed production, commit `.env` files, log cookies/provider payloads, or
  put reset credentials in query parameters. Run `node scripts/scan-secrets.mjs`
  before staging and follow `docs/security/repository-safety.md`.

## License

This repository does not currently include a root `LICENSE` file. Treat it as
private source code until the owner publishes an explicit license.
