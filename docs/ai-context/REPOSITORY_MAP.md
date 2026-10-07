# Repository map

Inventory baseline: 555 tracked files at `7b367c0`; documentation added by this audit is listed separately at the end. [FILE_MAP](FILE_MAP.md) enumerates every meaningful source/config path and inventories excluded media artifacts.

```text
StudyNotion/
├── apps/
│   ├── web/
│   │   ├── src/{app,pages,widgets,features,entities,shared}/
│   │   ├── public/                  static branding, manifest, robots, redirects
│   │   ├── scripts/                 public env validation and Nginx rendering
│   │   ├── test/setup.js            browser test environment
│   │   └── Dockerfile, nginx.conf, vite.config.ts, tsconfig.json
│   └── api/
│       ├── app/, bootstrap/         HTTP composition and process lifecycle
│       ├── routes/, controllers/    current v1 and thin v2 HTTP boundaries
│       ├── domains/                 catalog, learning, enrollment, entitlement
│       ├── models/, middleware/     persistence and request gates
│       ├── config/, utils/          runtime validation and integrations
│       ├── scripts/                 one-shot operational commands
│       ├── mail/templates/          escaped transactional HTML
│       ├── modules/README.md        future migration boundary
│       └── test/                    Node tests and opt-in integration suites
├── packages/contracts/              shared Zod schemas and OpenAPI generation
├── e2e/                            mocked UI journeys and optional live smoke
├── scripts/                        architecture, secrets, release/host validators
├── .github/                        CI, security workflow, Dependabot
├── docs/{architecture,audits,operations,security}/
├── compose.local.yml, compose.integration.yml, compose.operations.yml
└── package.json, package-lock.json, tooling configs
```

## Responsibility and connections

| Directory             | What and why                                                                                                  | Connections                                                                   |
| --------------------- | ------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| `apps/web/src/app`    | Single composition root; prevents pages owning global providers                                               | Loads every page, Redux reducers, BrowserRouter, session bootstrap            |
| `pages`               | URL-specific presentation and coordination                                                                    | Composes widgets/features/entities; no raw HTTP                               |
| `widgets`             | Navbar, footer, dashboard sidebar, curriculum sidebar, review slider                                          | Reuses lower-layer state and feature actions                                  |
| `features`            | Authentication, authoring, buying, reviewing, playback, filtering, profile, approval, reconciliation, contact | Calls entity APIs or feature adapters over shared transport                   |
| `entities`            | User, course, catalog, learning, purchase, cart, review vocabulary/state                                      | Uses contracts/shared transport; imported throughout upper layers             |
| `shared`              | HTTP/error abstraction, endpoint registry, primitives, formatting, styles                                     | Lowest application layer; cannot know feature internals                       |
| `apps/api/app`        | Build Express independently from listening                                                                    | Makes HTTP tests possible without production startup                          |
| `bootstrap`           | Resource lifecycle and failure/shutdown behavior                                                              | DB, Redis, Cloudinary, app, HTTP server                                       |
| `routes`              | Method/path/middleware definitions                                                                            | Select controllers and validation contracts                                   |
| `controllers`         | Compatibility business orchestration and v2 adapters                                                          | Models, domains, provider wrappers; see API_MAP                               |
| `domains/catalog`     | Query/cursor/aggregation/public DTO pipeline                                                                  | Course/category/instructor/review/curriculum collections                      |
| `domains/learning`    | Authorize current enrollment and canonicalize progress                                                        | Course, Section, SubSection, CourseProgress                                   |
| `domains/enrollment`  | Audit duplicated enrollment and financial evidence                                                            | Read-only union aggregation and classification/reporting                      |
| `domains/entitlement` | Validate financial evidence; sidecar state/recovery                                                           | Entitlement/Purchase/User/Course/Progress; called from payments/deletion/jobs |
| `models`              | Twelve stored document schemas and indexes                                                                    | Shared by controllers, domains, tests, explicit operational jobs              |
| `middleware`          | Auth/roles, origin gate, limiter, uploads                                                                     | Runs in routes/app composition before handlers                                |
| `config`              | Load/validate names, resource setup/readiness                                                                 | Runtime-only private settings; never imported into browser                    |
| `utils`               | Cookies/JWT, lifecycle predicates, media/email, logging, operation safety                                     | Reused by HTTP paths and one-shot jobs                                        |
| `scripts` under API   | Explicit operational actions                                                                                  | Not automatically run at normal startup                                       |
| `packages/contracts`  | Shared public wire rules without DB/provider types                                                            | Both applications consume package exports; deterministic OpenAPI artifact     |
| `e2e`                 | Real browser regression and optional real-stack smoke                                                         | Built SPA plus request mocks, or separately running stack                     |
| root `scripts`        | Enforce repo/deployment boundaries                                                                            | CI and package scripts invoke them                                            |
| `.github`             | Automated quality/security checks                                                                             | Installs workspaces, runs all testing layers, builds images                   |
| `docs`                | Decisions, historical measurements, operator procedures                                                       | Helpful rationale; source confirms current behavior                           |

## Operational commands are not interchangeable

`seed.js` creates controlled demo data with disposable-target guards; `backfill-security-fields.js` changes legacy security defaults; `create-indexes.js` creates or verifies declared indexes; `provision-admin.js` creates the initial admin; `audit-enrollment-consistency.js` reads/classifies only; `preflight-production.js` checks configuration/data/index/readiness conditions; `reconcile-entitlements.js` has status/recovery modes; `schedule-entitlement-recovery.js` wraps bounded recovery with private checkpoint persistence. Do not run mutation commands merely to answer a question.

## Configuration ownership

Root owns workspace installation, lockfile, lint/format, Playwright, Compose, and architecture checks. Web owns Vite build variables, Nginx, TypeScript foundation, and styles. API owns runtime environment loading; only its own `.env` location is loaded by `config/loadEnvironment.js`. Examples describe local/staging/production and staging-demo seed names; they are templates, not usable production settings. Release pair validation checks browser/runtime agreement.

`.editorconfig`, `.gitattributes`, `.gitignore`, `.dockerignore`, `.prettierignore`, `.vscode/settings.json`, `.nvmrc`, and lint/format configs define developer/build boundaries. Static assets and audit screenshots have no executable business rules. Generated `packages/contracts/openapi.json` is checked for drift, and `package-lock.json` is the reproducible dependency graph; neither should be manually treated as application logic.

## Newly created context documents

Root `PROJECT_CONTEXT.md` is the compact entry. This directory contains PROJECT_OVERVIEW, ARCHITECTURE, REPOSITORY_MAP, FILE_MAP, FRONTEND, BACKEND, DATABASE, AUTHENTICATION, API_MAP, FEATURE_FLOWS, DEPENDENCIES, TESTING, DOCKER, CICD, DEPLOYMENT, SECURITY, and LEARNING_GUIDE. No application refactor or behavior fix accompanies them.
