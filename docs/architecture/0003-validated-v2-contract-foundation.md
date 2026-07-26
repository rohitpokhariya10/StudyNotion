# ADR 0003: Establish a validated API v2 contract foundation

- **Status:** Accepted
- **Date:** 27 July 2026

## Context

The catalog vertical slice already uses Zod at runtime and emits OpenAPI 3.1,
but the shared package previously described only catalog responses and the common
error envelope. Authentication, profile, curriculum, learning, review, purchase,
refund, and administration code still uses compatibility-sensitive v1 payloads,
including several raw or populated Mongoose shapes.

Retrofitting those controllers in one contract pass would risk changing v1
response bytes, recovery gates, protected-media behavior, and financial state
transitions. Protected v2 routes also need a deliberate update to the existing
policy-acceptance and deletion-recovery allowlists before they can be mounted.

## Decision

1. `@studynotion/contracts` remains a CommonJS workspace with its existing root
   exports. Domain subpath exports are added so browser consumers can load only
   the contract family they use.
2. Runtime schemas are strict at every object boundary. The package now owns
   reusable primitives and explicit DTO/request schemas for auth/session,
   user/profile, course/curriculum, learning/progress, reviews, commerce/refunds,
   and admin queues.
   New response URLs accept only HTTP(S) schemes. The shipped catalog image
   fields retain their earlier non-empty-string behavior for compatibility.
3. A deterministic registry converts those same Zod schemas into OpenAPI 3.1
   `components.schemas`. A component records a reusable contract; it does not
   claim that a production route already implements that contract.
4. The existing `/api/v2/courses` path remains the only production v2 route in
   this phase. It adopts route-local shared validation and keeps its existing
   query, response, status, cache, and error behavior.
5. Body and path-parameter validation are proven with an isolated real-HTTP test
   application. No artificial validation endpoint is added to production.
6. Validated input is written to `res.locals.v2Input`. Express 5 exposes
   `req.query` through an immutable getter, so request input is neither assigned
   nor mutated.
7. Validation responses expose only bounded, control-character-free issue code,
   path, and message fields. Malformed error-shaped payloads are normalized
   instead of being trusted because they contain an `error` property. Error
   details currently accept only the explicit validation-issue shape; later
   slices must add another bounded public variant rather than pass raw records.
8. Request IDs use the exact server pattern
   `^[A-Za-z0-9._:-]{1,100}$`. They remain correlation metadata, never identity,
   authorization, or idempotency credentials. OpenAPI documents the optional
   request header and required response header.

## Money and compatibility

New commerce contracts use `{ amountMinor, currency: "INR" }`. Generic monetary
values may be zero, while payable course, checkout, purchase, and line-item
amounts must be positive safe integers. Checkout course IDs and purchase
line-item course IDs must be unique, and purchase totals must equal their
line-item totals. Existing purchase storage and Razorpay order amounts are
already minor units.

The shipped catalog v2 `price` field remains an INR **major-unit** number for
compatibility. It has a distinctly named `catalogPriceMajorSchema` and is not
reused by new purchase or checkout DTOs. A future catalog version may move to the
minor-unit money object only with an explicit mapper and compatibility plan.

## DTO and exposure rules

- Mongoose documents, ObjectId objects, and Date objects must be mapped to plain
  strings before response validation.
- Auth/session DTOs omit credentials, provider subjects, session versions,
  policy history, reset state, and deletion/payment locks.
- Public curriculum previews omit persistent media URLs and all provider
  metadata. A playback URL exists only in the entitled learning contract.
- Progress DTOs omit learner IDs and raw progress-document metadata.
- Public reviews omit reviewer, review, and course identifiers.
- Learner purchase DTOs omit provider IDs, receipts, idempotency keys, locks,
  failure internals, and administrator notes.
- Admin queue DTOs are role-scoped and remain distinct from learner/public DTOs.
  The reconciliation queue contract is a least-privilege list summary restricted
  to queued statuses and Student account state. It intentionally omits provider
  IDs, internal audit notes, locks, and action-specific refund evidence. It is
  not migration-ready until the payment phase defines separately authorized
  detail and command contracts with reconciliation tests.

## OpenAPI representation

Zod preprocessing, transforms, and cross-field refinements are not always
representable as JSON Schema. Query contracts therefore keep a
JSON-schema-compatible wire schema for OpenAPI and derive runtime normalization
and refinements from the same field constraints. Descriptions continue to record
rules such as relevance sorting requiring a search query. Optional pagination
defaults remain optional in the generated schema. Runtime-only relationships
such as balanced purchase totals, unique course snapshots, and internally
consistent progress values are described in OpenAPI and remain authoritative at
the server validation boundary. Session state uses an explicit signed-in/
signed-out union because that invariant is representable in both runtime Zod and
OpenAPI.

The generated `packages/contracts/openapi.json` remains byte-checked in CI.
Contract package tests are also a required root verification and CI gate.

## Consequences

- v1 routes, controllers, response bytes, models, and database collections do not
  change.
- Razorpay raw-body parsing, authentication, entitlement, protected media,
  account deletion, rate limiting, and production validation remain untouched.
- Future vertical slices can adopt one strict request/DTO pair at a time.
- Schemas alone are not proof of a safe endpoint. Every migrated route still
  requires an allowlist mapper, policy tests, HTTP parity tests, and its relevant
  integration evidence.
- Protected auth, profile, media, purchase, refund, and admin v2 routes are
  explicitly deferred to their domain phases.
