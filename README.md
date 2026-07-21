# StudyNotion

StudyNotion is a full-stack edtech application with a Vite/React client and an
Express/MongoDB API. Authentication uses an HttpOnly cookie, email verification
uses Resend in production, Google sign-in uses Google Identity Services, and
payments use server-priced Razorpay purchases.

## Local development

Requirements:

- Node.js 24 (`nvm use` reads `.nvmrc`)
- npm 10 or newer
- MongoDB running on `127.0.0.1:27017`

Install and configure:

```bash
nvm use
npm ci
cp .env.example .env
cp server/.env.example server/.env
```

The repository is an npm workspace. The root lockfile installs the React app,
the API workspace, and `@studynotion/contracts`; its install lifecycle also
builds the shared TypeScript contracts. Do not create or maintain a separate
`server/package-lock.json`.

Replace `JWT_SECRET` and `OTP_SECRET` in `server/.env` with two different
random values of at least 32 characters. For example, run `openssl rand -hex
32` twice. Development can use `ALLOW_DEV_OTP=true`; the API then returns the
OTP to the local frontend instead of requiring an email provider.

Seed useful local data and run both applications:

```bash
npm --workspace studynotion-backend run seed
npm run dev
```

- Client: `http://localhost:3000`
- API: `http://localhost:4000/api/v1`
- Public catalog API: `http://localhost:4000/api/v2/courses`
- Liveness: `http://localhost:4000/health/live`
- Readiness: `http://localhost:4000/health/ready`

Seeded local accounts:

- `admin@studynotion.local` / `Admin@123`
- `student@studynotion.local` / `Student@123`
- `instructor@studynotion.local` / `Instructor@123`

## Verification

```bash
npm run verify
npm run test:e2e
```

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

## Deployment

Build the production frontend with `npm run build` and deploy `dist/` as
immutable static assets. This command validates every public provider, support,
and legal value and refuses placeholder, HTTP, or test payment configuration.
Use `npm run build:local` only for local artifact verification. Deploy the API
from the repository-root context with `server/Dockerfile`; an isolated
`server/` install is not supported because the API consumes the shared contract
workspace. The API must run behind HTTPS, use the configured trusted proxy
count, and pass `/health/ready` before receiving traffic.

For a non-container API host, install from the repository root with development
dependencies, build the contracts, prune without rerunning lifecycle scripts,
and start the backend workspace:

```bash
npm ci --include=dev
npm run contracts:build
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

For an existing database, follow the backup, security-field backfill,
`preflight:production`, and controlled index-creation sequence in
`server/README.md` before deploying this schema.
