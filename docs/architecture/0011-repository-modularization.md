# ADR 0011: Modularize the repository around deployable applications

- **Status:** Accepted
- **Date:** 24 August 2026
- **Scope:** Repository layout, frontend dependency layers, backend boundaries,
  shared contracts, and root orchestration

## Context

StudyNotion previously kept the frontend at the repository root and the API
under `server/`. That layout mixed application-owned configuration with
repository-wide tooling, made Docker and CI ownership harder to read, and left
frontend code spread across generic `components`, `services`, `hooks`, `slices`,
and `utils` directories.

The product behavior and deployment posture were already verified before this
decision. The migration therefore needs to clarify ownership without changing
public routes, response contracts, authentication, payment workflows, learning,
Catalog V2, Entitlement Stage 2, protected media, persistence schemas, or
operational safeguards.

## Decision

Use an npm-workspace repository with two deployable applications and one shared
contract package:

```text
apps/web                 React/Vite browser application and Nginx image
apps/api                 Express API and one-shot operational jobs
packages/contracts       shared Zod schemas, exports, tests, and OpenAPI
e2e                      cross-application browser journeys
scripts                  repository-wide validation and operational helpers
docs                     decisions, audits, security guidance, and runbooks
compose.*.yml             local, integration, and operations orchestration
.github                   CI, security, and dependency automation
```

The root package is an orchestration package. A single root lockfile installs
`apps/*` and `packages/*`; application workspaces do not maintain independent
lockfiles. Root scripts keep common development, verification, integration,
browser, contract, and operations commands independent of the caller's current
application directory.

## Frontend: pragmatic feature layers

`apps/web/src` uses these layers:

```text
app -> pages -> widgets -> features -> entities -> shared
```

Dependencies point to the right in that diagram. A lower layer cannot import a
higher layer.

- `app` owns bootstrap, global providers, router composition, the singleton
  store, and application-wide configuration.
- `pages` owns route-level composition. Pages assemble lower-layer behavior and
  should not become transport or workflow modules.
- `widgets` owns reusable page-scale compositions such as navigation, the
  dashboard sidebar, curriculum panel, and review slider.
- `features` owns user actions and use cases such as authentication, course
  purchase, authoring, review, lesson playback, profile settings, instructor
  approval, and payment reconciliation.
- `entities` owns client-side representations of stable business concepts and
  their focused API/model/UI helpers.
- `shared` owns business-agnostic HTTP infrastructure, reusable UI, hooks,
  configuration, assets, styles, and general-purpose libraries.

Slices expose a public entry point when it makes a real cross-layer interface
clear. Barrels are not required for private, single-caller files. Feature slices
must not import another feature's internals; shared orchestration belongs in a
higher layer or a deliberately extracted lower-level abstraction.

Page and UI source must use its owning feature or entity API instead of importing
Axios or the shared HTTP client directly. This keeps request construction,
credentials, error mapping, and domain-specific response integration at a
reviewable boundary.

`npm run architecture:check`, also included in `npm run lint`, enforces required
layers, rejects upward imports, cross-feature internal imports, direct UI
transport access, and stale pre-modularization path specifiers. ESLint supplies
normal JavaScript and React feedback. The check is deliberately lightweight and
does not replace characterization, contract, or browser tests.

## Backend: domain-oriented modular monolith

The API does not use frontend feature layers. `apps/api` remains one deployable
Node process with domain-oriented internal boundaries:

```text
index/bootstrap -> app composition -> route/controller boundary
                                      -> service/policy
                                      -> repository/provider adapter
                                      -> Mongoose model
                                      -> mapper/contract
```

Mature domains such as catalog, learning, enrollment consistency, and
Entitlement retain their service/repository structure under `domains/`. Existing
routes, controllers, models, middleware, and utilities remain valid compatibility
code where forcing another layer would add ceremony or risk behavioral drift.
New modular slices may use `modules/<capability>` when they have an explicit
public API and adequate characterization coverage.

Backend shared code cannot depend on app/bootstrap composition or business
domains. A domain cannot depend on process composition. One module may consume
another module only through the target module's public entry point. Cross-domain
work that does not fit either domain belongs in an application-level
orchestrator, not a circular import.

Provider protocols remain behind API-owned boundaries. Browser code never
receives MongoDB, Redis, Resend, Razorpay, Cloudinary, signing, or webhook
secrets.

## Shared contracts

`packages/contracts` remains the single source for currently shared v2 request,
response, error, and OpenAPI schemas. Both applications consume the workspace
package; DTO schemas must not be copied into either app.

Contract evolution remains additive and versioned. A generated OpenAPI change
must be regenerated intentionally and checked for drift in CI. The presence of a
schema does not imply that every legacy route has migrated to v2.

## Application and environment ownership

- `apps/web` owns its Vite config, browser-public environment examples, build
  output, Nginx config, and web Dockerfile.
- `apps/api` owns its private environment examples, API Dockerfile, runtime
  configuration, operational scripts, and backend tests.
- The repository root owns workspace installation, contracts, architecture
  checks, formatting/lint orchestration, Playwright, Compose, release-pair
  validation, image/reference validation, CI, and security automation.
- `compose.local.env` remains an ignored, user-owned root file. Application
  moves must never read, copy, rewrite, stage, or delete it.

The preferred local files are `apps/web/.env` and `apps/api/.env`. The Vite
configuration and API loader can read the prior user-owned locations as
compatibility fallbacks so the structural migration does not silently rewrite a
developer's secrets. New examples and documentation use the application-owned
locations.

## Containers and operations

Both Dockerfiles use the repository root as their build context so the root
lockfile and shared contracts are available. The runtime images preserve the
existing Node 24, non-root, minimal-content, read-only-compatible, and immutable
build requirements.

Compose files, Playwright suites, release validation, production preflight,
controlled indexes, demo seed, backup/restore procedure, and Entitlement
recovery stay root-operated. Their implementation paths may point into
`apps/api`, but operators invoke the supported root/workspace commands rather
than repeatedly changing directories.

The web image remains static-only. It does not proxy `/api`; separate HTTPS
ingress routes the public app and API hosts. API-shaped requests reaching the
web container continue to receive JSON 404 responses instead of SPA fallback.

## Compatibility and non-goals

This decision does not:

- change `/api/v1` or `/api/v2` routes, request/response bodies, cookies, CORS,
  trusted-origin enforcement, or health semantics;
- redesign authentication, payments, Catalog V2, Learning V2, protected media,
  database models, indexes, recovery, or provider integration;
- make Entitlement authoritative, add shadow authorization reads, or backfill
  historical Entitlements;
- convert JavaScript wholesale to TypeScript;
- introduce Next.js, NestJS, GraphQL, PostgreSQL, microservices, Kubernetes, or a
  publishable internal package system; or
- require every legacy API capability to adopt service/repository layers merely
  for directory symmetry.

Historical ADRs and audit reports retain the paths that were true when their
evidence was recorded. Current runbooks, live commands, and links use the
`apps/web` and `apps/api` layout.

## Consequences

- Deployable ownership and environment boundaries are visible from the tree.
- Frontend business concepts and user actions no longer accumulate in generic
  root folders.
- Backend domain slices remain cohesive without an architecture rewrite.
- One lockfile and root commands preserve developer, Docker, and CI ergonomics.
- Structural changes touch many paths, so path audits and the full release
  matrix remain mandatory before promotion.
- Dependency bot branches created before this move must be rebased or recreated;
  obsolete `server/` patches must not be merged into the new layout.
