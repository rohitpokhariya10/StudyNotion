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
cd server && npm ci && cd ..
cp .env.example .env
cp server/.env.example server/.env
```

Replace `JWT_SECRET` and `OTP_SECRET` in `server/.env` with two different
random values of at least 32 characters. For example, run `openssl rand -hex
32` twice. Development can use `ALLOW_DEV_OTP=true`; the API then returns the
OTP to the local frontend instead of requiring an email provider.

Seed useful local data and run both applications:

```bash
cd server && npm run seed && cd ..
npm run dev
```

- Client: `http://localhost:3000`
- API: `http://localhost:4000/api/v1`
- Liveness: `http://localhost:4000/health/live`
- Readiness: `http://localhost:4000/health/ready`

Seeded local accounts:

- `admin@studynotion.local` / `Admin@123`
- `student@studynotion.local` / `Student@123`
- `instructor@studynotion.local` / `Instructor@123`

## Verification

```bash
npm run lint
npm test
npm run build:local
cd server && npm test
```

CI runs the same checks from committed lockfiles on Node.js 24.

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
Use `npm run build:local` only for local artifact verification. Deploy `server/`
separately using its Dockerfile or `npm start`. The API
must run behind HTTPS, use the configured trusted proxy count, and pass
`/health/ready` before receiving traffic.

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
docker build -t studynotion-api server
```

Both Docker contexts exclude local environment files and host dependencies.
The web image intentionally fails its build when any required public argument is
missing, uses HTTP, or does not look like the corresponding production key. The
web image also renders the exact API origin into its restrictive Content Security
Policy; the source `nginx.conf` placeholder must never be deployed directly.

For an existing database, follow the backup, security-field backfill,
`preflight:production`, and controlled index-creation sequence in
`server/README.md` before deploying this schema.
