# ADR 0002: Add the public catalog as a versioned vertical slice

- **Status:** Accepted
- **Date:** 20 July 2026

## Context

The legacy catalog UI reads broad v1 course documents and manages request state
inside components. Replacing identity, payment, enrollment, or protected-media
code at the same time would expand the security and compatibility surface beyond
a reviewable first product slice.

The catalog also needs deterministic pagination, validated filters, a stable
public DTO, responsive states, and query-plan evidence before it can carry
production traffic.

## Decision

1. Keep every `/api/v1` route and response unchanged. Add the public read-only
   endpoint `GET /api/v2/courses` behind the existing request ID, CORS/origin,
   rate-limit, and parser middleware plus the existing production startup
   validation.
2. Define the query, success DTO, and error envelope in the TypeScript/Zod
   workspace `@studynotion/contracts`. Generate and commit its OpenAPI 3.1
   document so frontend and API validation share one source of truth.
3. Isolate catalog controller, service, repository, mapper, cursor, and error
   concerns under the v2 boundary. Repository reads are constrained to
   `status=Published`; the public mapper excludes learner identities, review
   bodies, curriculum and protected lesson/video URLs, provider IDs, and
   entitlement state while retaining public thumbnail and instructor images.
4. Use opaque cursor pagination. A cursor contains a version, a fingerprint of
   the normalized filters, the stable sort key, and `_id` tie-breaker. Changing
   filters or sort invalidates it. Each query returns at most `limit + 1`
   aggregate results to derive `hasNextPage`; the public maximum is 50.
5. Use RTK Query for catalog request state and cursor-page accumulation. Filters
   remain URL-addressable, and the existing course-detail route remains the card
   destination. The client validates successful v2 payloads before rendering.
6. Return a request ID in both the response header and body. Because an HTTP
   cache could replay a prior caller's diagnostic ID, all v2 responses use
   `Cache-Control: private, no-store`. RTK Query provides bounded in-memory
   caching instead (unused course pages are retained for 60 seconds and the
   legacy category lookup for 300 seconds).
7. Add only optional `level` and `language` course fields plus named secondary
   indexes. Do not backfill or rewrite existing documents in this slice.

## HTTP contract

The endpoint accepts `q`, `categoryId`, `level`, `language`, `minPrice`,
`maxPrice`, `minRating`, `minDurationSeconds`, `maxDurationSeconds`, `sort`,
`limit`, and `cursor`. Unknown keys and invalid ranges are rejected. Search
defaults to `relevance`; other requests default to `newest`. Supported explicit
sorts are `relevance`, `newest`, `price_asc`, `price_desc`, `rating_desc`, and
`popular`.

Success uses:

```json
{
  "success": true,
  "requestId": "trace-id",
  "data": {
    "items": [],
    "pageInfo": { "endCursor": null, "hasNextPage": false }
  }
}
```

Failures use:

```json
{
  "error": {
    "code": "INVALID_QUERY",
    "message": "The catalog query is invalid",
    "requestId": "trace-id",
    "details": {}
  }
}
```

`details` is optional. A cursor that passes the query-shape check but cannot be
decoded, has an invalid payload, or belongs to different filters returns
`INVALID_CURSOR`; invalid cursor characters or length return `INVALID_QUERY`.
Clients must discard either cursor and restart from the first page. The committed
machine-readable contract is `packages/contracts/openapi.json`.

## Compatibility and data consequences

- This slice is additive: no collection is renamed, no field is removed, and no
  destructive migration runs. v1 authentication, authorization, Razorpay,
  reconciliation, protected media, CSRF/origin enforcement, rate limiting,
  account deletion, and production validation retain their prior behavior.
- Legacy courses without `level` or `language` remain visible when those filters
  are absent and return `null` for the missing metadata. They do not match an
  explicit level or language filter. Populating historical metadata requires a
  separately reviewed backfill and editorial workflow.
- Existing category discovery and course-detail calls stay on v1 during this
  slice. Course listing moves to the additive v2 contract.

## Index rollout and rollback

The model declares these named catalog indexes:

- `catalog_published_newest`
- `catalog_category_newest`
- `catalog_published_price`
- `catalog_category_price`
- `catalog_published_text`

Production keeps automatic index creation disabled. After a verified backup,
review index size/build impact and run the existing guarded command during a
maintenance window:

```bash
MIGRATION_CONFIRM=create-indexes npm --workspace studynotion-backend run db:indexes
```

The command calls `createIndexes`; it neither rewrites documents nor drops
existing indexes. Application rollback does not require dropping these indexes.
If storage recovery later requires removal, first deploy the prior application,
confirm the indexes are unused, retain a backup, and drop only the five names
above through a separately approved database change.

## Verification

From the repository root:

```bash
npm ci
npm run verify
npm run test:e2e
```

For the guarded real-service test, start `compose.integration.yml` and run
`npm run test:integration` with the disposable URIs documented in the root
README. The query-plan evidence and limitations are recorded in
`docs/audits/catalog-query-plan-2026-07.md`.

## Consequences

The first productized path now has shared runtime contracts, stable public data,
observable failures, deterministic pagination, and explicit UI states without
coupling the work to protected domains. Some v1 catalog dependencies and missing
legacy metadata remain intentionally deferred.
