# ADR 0001: Productize StudyNotion incrementally

- **Status:** Accepted
- **Date:** 20 July 2026
- **Phase 1 clarification:** 27 July 2026

## Context

StudyNotion contains a substantial hardened baseline alongside large legacy
controllers and a tutorial-era frontend. Authentication, authorization,
Razorpay state and reconciliation, protected media, origin/CSRF enforcement,
rate limiting, account deletion, and production validation already encode
important security and operational guarantees.

A repository-wide rewrite would make those guarantees difficult to characterize
and review. The current database also contains compatibility-sensitive arrays and
relationships that must not be destructively migrated as part of initial product
work.

## Decision

Productize the application through small vertical slices on top of the tagged
baseline.

1. Keep the React SPA, Express API, MongoDB, Redis, Razorpay, and Cloudinary
   architecture while introducing boundaries incrementally.
2. Start with the catalog domain because it is public and bounded away from
   payment and identity state transitions.
3. Preserve `/api/v1` behavior while adding validated, explicitly versioned v2
   contracts.
4. Add characterization and integration coverage before extracting behavior from
   a legacy controller.
5. Keep Node 24 as the supported runtime and the root npm lockfile as the
   reproducibility source until a separate runtime or workspace migration is
   accepted.
6. Require security, compatibility, verification, and rollback notes for every
   slice. Database migrations require a separate idempotent plan and approval.

## Allowed dependency directions

These directions apply to code introduced under the new architecture. The
existing `src/components`, `src/pages`, `src/services`, `src/slices`, legacy
server routes/controllers/models, and their current imports remain compatibility
surfaces until a reviewed slice migrates them.

### Frontend

Dependencies flow inward through stable public boundaries:

```text
app -> pages -> widgets -> features -> entities -> shared
```

A layer may skip layers while moving to the right. `app` owns provider, router,
store, and process-level composition. Pages and widgets compose behavior but do
not own HTTP workflows. A feature may import its own internals plus entities and
shared code; it must not import another feature's internals. Entities may import
their own internals and shared code. Shared code must not import app, pages,
widgets, features, or entities.

Remote calls enter through an entity or feature API boundary. `src/shared/api`
owns the raw Axios transport and common error normalization. Entity and feature
API modules may own approved RTK Query base queries when they preserve the
cookie, timeout, session-response, request-metadata, and error policies relevant
to that endpoint. Page and UI modules must not import Axios,
`src/services/apiConnector`, or `src/shared/api/httpClient` directly. Legacy
operation modules remain callable only as documented compatibility adapters
until their callers move to RTK Query or another approved feature API.

### Backend

Startup and request dependencies flow in this direction:

```text
index/bootstrap -> app composition -> module public API -> shared infrastructure
                                      service -> repository -> data model
```

The compatibility bootstrap owns process lifecycle only. App composition owns
middleware ordering, route registration, not-found handling, and global error
mapping, but no domain decisions. Module controllers validate and map HTTP,
services own workflows and transaction/idempotency boundaries, repositories own
queries and projections, policies own authorization decisions, and mappers own
DTO exposure. A module may use shared code but must not import another module's
internals; cross-domain work goes through an explicit public service or an
application-level orchestrator.

Existing routes, controllers, and models may sit behind temporary adapters.
Shared code must not depend on app composition or module internals. External SDKs
and protocols (Razorpay, Cloudinary, Google identity, email, Redis, and future
queues or observability providers) belong behind provider adapters so domain
services do not acquire vendor-specific behavior.

## Compatibility-adapter policy

An adapter is a temporary, named seam, not a second implementation. It must:

1. Preserve the existing import, export, route, status, body, cookie, and error
   behavior while delegating in one direction to the new implementation.
2. Contain no new domain decisions and introduce no reverse dependency from a
   lower layer into a higher layer.
3. Have characterization or parity coverage at the boundary it preserves.
4. Be recorded explicitly in architecture checks or module documentation when
   it violates the target direction.

An adapter may be removed only when all callers are migrated, its replacement
has contract and security parity evidence, the complete baseline suite passes,
and API/version deprecation (where applicable) has separate approval. Payment,
identity, entitlement, and destructive data-path adapters require focused
integration evidence before removal. Architecture exceptions are exact: the
check fails when an exception becomes stale so it is removed with the adapter.

## Enforced boundaries and current exceptions

`npm run architecture:check`, also run by `npm run lint`, rejects new
cross-feature imports and direct transport imports from page/UI code. ESLint
provides the same direct-transport feedback during editing. The only current
direct-transport exceptions are:

- `src/components/Common/ReviewSlider.jsx` to
  `src/services/apiConnector.js`.
- `src/components/core/ContactUsPage/ContactUsForm.jsx` to
  `src/services/apiConnector.js`.

Those exceptions grandfather existing behavior; they are not permission for
new callers. The remaining legacy operation imports are migration inventory and
must not be copied into new feature UI.

## Safety invariants during migration

Architecture moves must keep the raw Razorpay webhook ahead of JSON parsing and
must preserve authentication, role/ownership/entitlement checks, CSRF and origin
enforcement, rate limits, reconciliation/idempotency state, protected-media
authorization, account-deletion recovery, and production environment
validation. Existing `/api/v1` routes and response envelopes remain compatible.
No architecture-only slice may perform a destructive migration, weaken indexes
or cookies, reorder security middleware, expose a provider secret, or change
the server singleton and shutdown semantics.

## Consequences

- Changes remain reviewable and can be reverted to
  `pre-modernisation-2026` without rewriting shared history.
- Some duplication and legacy structure remain temporarily while each domain is
  migrated.
- New v2 contracts and UI paths must coexist with v1 until compatibility evidence
  supports deprecation.
- Payment, identity, enrollment authorization, and destructive schema work remain
  explicit non-goals for the first catalog slice.
