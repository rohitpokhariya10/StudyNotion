# CI and release automation

## Actual pipeline

```text
Push to main/master or pull request
  → GitHub Actions ci.yml
     → client: install / audit / contracts / formatting / lint / types / tests / build checks
     → server: install / audit / Node backend tests
     → catalog-integration: Mongo + Redis / all seven enabled integration suites
     → catalog-e2e: browser install / mocked catalog + learning journeys
     → containers: Compose/host validation / Docker build / runtime smoke
  → review artifacts/checks
```

These five jobs are independently scheduled; no `needs` dependency makes them a sequential install→deploy chain. Workflow uses read-only content permissions, concurrency cancellation, and pinned third-party action revisions. The integration/E2E job names preserve earlier catalog naming even though scope now includes learning and entitlement/enrollment work.

There is **no checked-in registry push, AWS credential setup, ECS deployment, environment promotion, or production release job**. Docker build/test is the last automated delivery stage in this repository. The deployment runbook describes operator/platform actions outside that workflow.

## `.github/workflows/ci.yml`

| Job                 | What it verifies                                                                                                                                                                       | Important boundaries                                                                                                                                                              |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| client              | Node 24/npm ci; dependency audit; deterministic OpenAPI check/tests/generation with clean diff; Prettier; ESLint/architecture; TypeScript; frontend tests; validated web builds        | Separate-origin production and same-origin staging cases, optional staging Google disabled, release-pair validation, no local/development URLs or sourcemaps in release artifacts |
| server              | Node 24/npm ci; API dependency audit; backend node:test                                                                                                                                | Most provider/DB calls stubbed; seven explicit real-service suites not enabled by default here                                                                                    |
| catalog-integration | MongoDB 8 and Redis 7.4 service containers; seven integration flags                                                                                                                    | Disposable prefixed databases and guarded Redis targets; actual Mongoose behavior/indexes/aggregation/races and preflight                                                         |
| catalog-e2e         | Installs Chromium/WebKit and runs Playwright catalog/learning                                                                                                                          | Desktop Chrome, Pixel 7, Desktop Safari profiles; request-mocked API; reports/screenshots/trace artifacts as configured                                                           |
| containers          | Validate Compose and private recovery-host gates; build API and staging web; inspect non-root/boundary properties; run health/security-header/proxy smoke; actual API with Mongo/Redis | Web-only `/api` failure expectation is intentional upstream-proxy proof when API is absent; separate API stack readiness verifies dependency startup                              |

Environment fixtures in CI test configuration shape and boundaries. They are not evidence of real private production secrets or successful provider transactions. Container builds use immutable pinned bases and the workspace lockfile. Generated OpenAPI drift check ensures source schemas and checked artifact agree.

## Security workflow and dependency maintenance

`.github/workflows/security.yml` runs on repository events and a weekly Monday 03:17 UTC schedule. It runs the custom secret scanner, dependency review for eligible non-fork changes, high-severity npm audit fallback for fork PRs, and JavaScript/TypeScript CodeQL. Action permissions are limited per task. `.github/dependabot.yml` configures weekly npm and Actions update proposals.

`scripts/scan-secrets.mjs` scans tracked plus unignored current files using explicit secret patterns and allowed fixtures, skipping binary/generated/private inputs as defined. A full-depth checkout does **not** make this script a Git history scanner. It is not a replacement for all secret detection or a claim that historical commits are clean. Source-only inspection cannot establish current advisory status; this audit did not fetch fresh vulnerability data.

## Root checks and reproducibility

`npm run verify` sequences contracts check/tests, format check, lint (including architecture), typecheck, frontend tests, local build, backend tests. It does not run integration, Playwright, live-stack smoke, container verification, or a deploy. Root `npm test` is frontend only. Node target is `>=24 <25`; CI and containers use that target.

`prettier.config.js` configures import sorting and Tailwind class ordering; `eslint.config.mjs` has browser/server/test-specific settings, React/hooks/refresh rules; `scripts/check-architecture.mjs` enforces selected import constraints. `.prettierignore` and related ignore files define generated exclusions. The docs audit used targeted documentation formatting rather than repository-wide write formatting.

## Promotion remains external

Runbook order is reviewed source/lockfile → required checks → tier-specific web and API images from one SHA → registry push and digest recording by operator/platform → pair validation, backups/index/preflight gates → deploy → health/provider/smoke checks → record evidence/rollback references. The steps after local image construction are instructions, not implemented workflow stages. See [DEPLOYMENT](DEPLOYMENT.md).
