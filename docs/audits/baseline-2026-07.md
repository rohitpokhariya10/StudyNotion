# StudyNotion modernisation baseline — 27 July 2026

**Observed:** 27 July 2026 (Asia/Kolkata)

**Audited branch:** `main`

**Audited HEAD:** `dab6a0a2dd989e7a9f3d27a9f14066d69a52ea05`
(`docs: document local evaluation and production operations`)

**Original clean HEAD:** `fa0196b6aadc3ce72ea1db13d86d71584f03e61e`

## Scope and conclusion

This is the Phase 0 evidence record required before architecture-seam work. It
captures the repository after the owner-authorised staged snapshot was audited
and divided into 16 dependency-aware commits. Phase 0 itself changes only this
document.

The deterministic application, contract, lint, unit, build, guarded catalog
integration, container, and browser checks pass on Node 24. The full dependency
audit remains red because of six high-severity advisories in the development-only
ESLint dependency tree. The production dependency audit exits successfully at
the configured high threshold, but still reports two moderate React Router
advisories. Neither finding is hidden or force-fixed in this baseline.

No remote CI result exists for the 16 local commits because the owner explicitly
prohibited pushing. This evidence is local and is not a production-readiness
claim.

## Recovery and repository safety

- The annotated rollback tag `pre-modernisation-2026` resolves to the original
  clean HEAD `fa0196b6aadc3ce72ea1db13d86d71584f03e61e` and has the message
  `Rollback point before StudyNotion 2026 modernisation`.
- The local-only branch `backup/pre-modernisation-staged-2026-07-27` points to
  snapshot commit `840f4519ccd82679257aae65ddb8e113a87adc78`.
- A binary-safe patch is stored outside the repository at
  `/private/tmp/StudyNotion-pre-modernisation-staged-2026-07-27.patch`. It is
  10,808,307 bytes, has SHA-256
  `4efe9186a11153bc52b443dc1aebdceb06068f6e0c84e3d03b2af2b17327b11b`, and
  parses as 225 paths with 6,573 insertions and 1,721 deletions.
- `main` remained at the original HEAD while the rollback tag was created. The
  snapshot was then reapplied without committing and reviewed before being split.
- Real `.env` files, archives, dependency folders, generated builds, browser
  reports, uploaded media, temporary screenshots, and other local artifacts were
  not committed. Root and server environment examples remain tracked.
- `StudyNotion_Codex_Master_Prompt.md`, `project-structure.txt`, and the 16 seeded
  live-browser screenshots remain local and ignored. The existing catalog audit
  screenshots are intentional tracked evidence.
- The ignored real `.env` and `server/.env` files were not opened or included in
  the patch, backup snapshot, commits, images, or logs.
- No commit or tag was pushed. No reset, clean, force operation, destructive
  migration, or file-content discard was used.

## Repository architecture observed

### Runtime and workspace

- `.nvmrc`, the root manifest, CI, and both Dockerfiles select Node 24. Root and
  server engines require `node >=24 <25` and `npm >=10`.
- The repository has one lockfile (`package-lock.json`, lockfile version 3) and
  npm workspaces for `packages/*` and `server`.
- The root workspace owns frontend scripts and orchestration, `server` owns the
  Express application, and `packages/contracts` owns runtime catalog schemas and
  generated OpenAPI.

### Frontend

- React 18 and Vite 8 render a client-side application. `src/main.jsx` currently
  composes Redux, `BrowserRouter`, and the application error boundary directly;
  `src/App.jsx` owns the route tree.
- The Redux store combines legacy slices with the catalog RTK Query API. Most
  legacy API calls remain in `src/services/operations`; two UI components still
  call the shared connector directly.
- The largest change-coupling hotspots include `src/pages/Catalog.jsx` (602
  lines), the admin payment reconciliation view (511), course details (390), the
  navbar (379), and several 300+ line legacy API modules.

### Backend and compatibility surfaces

- `server/index.js` currently performs environment/bootstrap work, middleware
  composition, route registration, readiness, and shutdown coordination in one
  278-line module.
- `/api/v1` remains the compatibility surface for authentication, profile,
  course/learning, payments, admin, and contact flows. `/api/v2/courses` is the
  additive catalog vertical slice backed by `server/domains/catalog` and shared
  contracts.
- The signed Razorpay webhook is mounted with a size-limited raw body before the
  global JSON parser. API rate limiting is mounted before route handlers, and
  trusted-browser origin checks remain in front of v1/v2 browser routes.
- Authentication/session versioning, role checks, policy acceptance,
  deletion-pending state, protected lesson playback, payment idempotency,
  reconciliation, refund, and entitlement behavior remain in their existing
  modules.
- The main backend change-coupling hotspots are `server/controllers/payments.js`
  (1,934 lines), `Course.js` (1,175), `profile.js` (766), and `Auth.js` (590).
- Provider adapters/configuration exist for MongoDB, Redis, Cloudinary, Razorpay,
  Google identity, and Resend. Phase 0 does not make live provider calls.

### Delivery and security automation

- CI uses Node 24 and SHA-pinned actions. It checks production dependencies,
  OpenAPI drift, format, lint, frontend/backend tests, the production web build,
  guarded catalog integration, mocked catalog Playwright journeys, image builds,
  non-root users, readiness, and web security headers.
- The security workflow runs the deterministic secret scanner and CodeQL and uses
  pull-request dependency review. Dependabot covers npm and GitHub Actions.
- Local Compose binds the web and API only to loopback, applies capability drops
  and `no-new-privileges` to application containers, and uses disposable
  integration data stores. Final web and API images run as non-root users.
- The seeded Student/Instructor/Admin live-browser suite is currently a local
  verification command, not a CI lane.

## Node 24 verification evidence

The host shell exposes Node `v26.3.0`, which is deliberately not treated as a
supported runtime. Every result below was therefore run in a clean official Node
24 Docker environment using the repository lockfile. The main verification
container reported Node `v24.18.0` and npm `11.16.0`; the official Playwright
image reported Node `v24.17.0`.

| Check                 | Command                                    | Exact result                                                                                                                          |
| --------------------- | ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------- |
| Locked install        | `npm ci`                                   | Passed; 693 packages installed and 696 audited in a fresh dependency volume. npm reported 8 advisories (2 moderate, 6 high).          |
| Secret scan           | `node scripts/scan-secrets.mjs`            | Passed; 371 files checked.                                                                                                            |
| OpenAPI drift         | `npm run contracts:openapi:check`          | Passed; generated OpenAPI matches the committed artifact.                                                                             |
| Formatting            | `npm run format:check`                     | Passed.                                                                                                                               |
| Lint                  | `npm run lint`                             | Passed.                                                                                                                               |
| Frontend tests        | `npm test`                                 | Passed; 35 files and 130 tests. Expected React Router future warnings and the intentional error-boundary stderr fixture were emitted. |
| Local bundle          | `npm run build:local`                      | Passed; Vite transformed 573 modules. This command intentionally omits public production-environment validation.                      |
| Backend tests         | `npm --workspace studynotion-backend test` | Passed; 145 total, 144 passed, 1 guarded integration test skipped, 0 failed.                                                          |
| Consolidated baseline | `npm run verify`                           | Passed; repeated OpenAPI, format, lint, 130 frontend tests, local build, and backend 144-pass/1-skip results.                         |

## Integration, container, and browser evidence

| Check                        | Command                                                                                                                                                                              | Exact result                                                                                                                                                     |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Guarded services             | `docker compose -f compose.integration.yml up -d --wait`                                                                                                                             | Passed; MongoDB 8 and Redis 7.4 became healthy on loopback with disposable storage.                                                                              |
| Catalog integration          | `npm run test:integration` with `CATALOG_TEST_MONGODB_URI=mongodb://127.0.0.1:27018/studynotion_catalog_test_phase0_20260727` and `CATALOG_TEST_REDIS_URL=redis://127.0.0.1:6380/14` | Passed; 2/2 tests. Integration services and their network were removed afterward.                                                                                |
| Local stack                  | `docker compose --env-file compose.local.env.example -f compose.local.yml up -d --build --wait`                                                                                      | Passed; MongoDB, Redis, API, and web are healthy. The idempotent seed completed successfully.                                                                    |
| Runtime identity             | Container user checks                                                                                                                                                                | Passed; final API and web processes run as non-root users.                                                                                                       |
| Smoke checks                 | `curl` against `/health`, `/health/ready`, and `/api/v2/courses?limit=3` with the configured browser origin                                                                          | Passed; health/readiness and the seeded catalog responded successfully.                                                                                          |
| Mocked catalog browser suite | `npm run test:e2e`                                                                                                                                                                   | Passed; 8/8 desktop/mobile tests in the official Playwright 1.61.1 image.                                                                                        |
| Seeded live role suite       | `npm run test:e2e:live`                                                                                                                                                              | Passed; 8/8 desktop/mobile public, Student, Instructor, and Admin journeys.                                                                                      |
| Production images            | Production web/API image builds and smoke checks                                                                                                                                     | Passed; public production-env validation, web security headers, API readiness, and non-root assertions passed. The API production install reported 0 advisories. |

The local evaluation stack was intentionally left running for manual end-to-end
inspection at `http://127.0.0.1:3000`; its API is at
`http://127.0.0.1:4000`. Demo credentials are documented in `README.md` and
`server/README.md` and are local-only.

## Dependency audit evidence

| Scope                | Command                                   | Result                                                                                                                                                                                                                                       |
| -------------------- | ----------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Runtime dependencies | `npm audit --omit=dev --audit-level=high` | Exit 0, but not clean: 2 moderate advisories affect `react-router`/`react-router-dom` (backslash-based open redirect and SSR hydration constructor injection). npm offers only the breaking React Router 7 line as the automatic resolution. |
| Complete graph       | `npm audit --audit-level=high`            | Exit 1: the same 2 moderate runtime advisories plus 6 high advisories in the development ESLint dependency path through `brace-expansion`/`minimatch`. The suggested forced resolution includes breaking dependency changes.                 |

These advisories are recorded rather than hidden, force-fixed, or mixed into a
composition-only phase. They require a separately reviewed dependency upgrade
with regression tests.

## Preserved security and compatibility behavior

- Phase 0 changes no runtime code, API response, route, cookie, database model,
  index, migration, or provider configuration.
- Existing v1 API behavior remains available; catalog v2 remains additive.
- Authentication, authorization, policy acceptance, CSRF/origin validation,
  rate limiting, account deletion, Razorpay signature/raw-body handling,
  idempotency, reconciliation, refund, entitlement, protected-media, and
  production-preflight paths were not refactored.
- No destructive database command was run. Guarded integration used a uniquely
  named test database and disposable services; local seeding is environment- and
  database-name-guarded.
- No secret value was printed or copied into Git. The scanner is deterministic
  pattern matching, not an entropy or complete history scanner.

## Known limitations and risks

1. The complete dependency audit is failing because of six high-severity
   development-tool advisories; two moderate React Router runtime advisories also
   remain.
2. The 16 local commits have not run on hosted CI because pushing is prohibited.
3. Only the catalog currently has real MongoDB/Redis integration coverage. Live
   Google, Resend, Razorpay, Cloudinary, refund, and protected-media provider
   activity was not exercised.
4. Large legacy bootstrap/controllers and frontend pages/services make later
   changes high-coupling until Phase 1 establishes adapters and boundaries.
5. Container base and service images use mutable tags rather than digests. There
   is no release provenance, SBOM/signing, or production-reference Compose stack.
6. `playwright.config.mjs` matches only `catalog.spec.js`; a future non-live spec
   could be silently omitted unless test discovery is made explicit.
7. Two recently converted button controls retain block-level descendants. Tests
   and lint pass, but their HTML content model should be corrected with focused
   accessibility coverage.
8. Unicode input hardening covers the JavaScript `Cc` category. It lacks a
   dedicated C1 regression case and does not claim to reject every `Cf` format
   character.
9. `build:local` bypasses public production-environment validation by design and
   must not be used as a production release build.
10. Coverage thresholds, broader real-service integration, provider go-live
    checks, incident response, and restoration drills remain future work.
11. `docs/security/repository-safety.md` still references the older rollback-tag
    naming and a generic push workflow. This run obeyed the task-specific
    no-push instruction; the runbook should be reconciled in a documentation-only
    follow-up.

## Exact Phase 1 file plan

Phase 1 must remain composition-only and retain adapters at every existing import
or route boundary. The proposed review set is:

- Extract Express creation and route registration from `server/index.js` into
  `server/app/createApp.js` and `server/app/registerRoutes.js`. Keep the singleton
  lifecycle, process hooks, and the existing `{ app, startServer, shutdown }`
  export in `server/index.js` until characterization tests make a move into
  `server/bootstrap/` demonstrably safe.
- Move only generic not-found/error-envelope composition into
  `server/shared/http/`, preserving the byte-level v1 responses and the current
  v2 normalizer. Add `server/modules/README.md` to document the future module
  boundary without moving auth, payment, course, or profile logic.
- Add `src/app/AppProviders.jsx`, `src/app/router/AppRoutes.jsx`,
  `src/app/session/SessionBootstrap.jsx`, and `src/app/store/index.js` as the
  frontend composition seam. Keep `src/main.jsx`, `src/App.jsx`, and
  `src/store.js` as compatible adapters during migration.
- Add the shared API-error normalization seam under `src/shared/api/` without
  changing legacy response handling. Document allowed frontend dependency
  directions with lightweight boundary files under `src/entities`,
  `src/features`, and `src/widgets`.
- Add focused app-composition tests plus architecture restrictions in
  `eslint.config.js` preventing new page/UI-level API connector imports and new
  cross-feature imports. Existing violations must be grandfathered explicitly,
  not silently rewritten.
- Update `docs/architecture/0001-incremental-productization.md` with the allowed
  backend and frontend dependency directions and adapter-removal criteria.

Before committing Phase 1, rerun every Phase 0 command, the guarded catalog
integration suite, both browser suites, production image checks, and dependency
audits. The planned commit is
`chore(architecture): establish feature module boundaries`.
