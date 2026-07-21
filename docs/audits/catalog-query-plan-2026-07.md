# Catalog v2 query-plan audit — July 2026

**Observed:** 21 July 2026

**Runtime target:** Node.js 24, MongoDB 8.0, Redis 7.4

**Evidence runtime:** Node.js 26.3.0 host test process with the committed Compose
MongoDB 8.0 and Redis 7.4 services. Node.js 24 remains the application and CI
target and is also exercised by both container builds.

## Scope and method

`server/test/catalog-v2.integration.test.js` exercises the real Express v2
route, MongoDB aggregation/index planner, and Redis-backed API limiter against
disposable services. It explicitly refuses Atlas/production-looking MongoDB
targets, permits only a database named `studynotion_catalog_test_*` on a local
or CI service host, and permits only Redis database 14 or 15 on a local or CI
service host.

The fixture includes two published courses in one category, an empty second
category, and a draft course that must remain private. It creates
declared indexes with Mongoose automatic index creation disabled. The test also
proves the public payload omits the draft, learner email, review body, protected
video URL/provider ID, and other private document structure.

Run it from the repository root:

```bash
docker compose -f compose.integration.yml up -d --wait
CATALOG_TEST_MONGODB_URI=mongodb://127.0.0.1:27018/studynotion_catalog_test_local \
CATALOG_TEST_REDIS_URL=redis://127.0.0.1:6380/14 \
npm run test:integration
docker compose -f compose.integration.yml down
```

## Explain evidence

| Query                                      | Planner evidence                                               | Execution bound                                               |
| ------------------------------------------ | -------------------------------------------------------------- | ------------------------------------------------------------- |
| `categoryId=<id>&limit=1&sort=newest`      | Winning plan contains an `IXSCAN` on `catalog_category_newest` | `totalDocsExamined <= limit + 1` (at most 2 for this fixture) |
| `q=secure` with the natural, unhinted plan | Winning plan contains an `IXSCAN` on `catalog_published_text`  | Result remains restricted to published courses                |

The category/newest explain uses the declared index as a hint and then inspects
the winning plan and `executionStats`; this proves that the cursor-stage read is
bounded to the requested page plus the single look-ahead document. The text
explain deliberately supplies no hint, so the `catalog_published_text` IXSCAN is
the planner's natural choice for the `$text` query. The integration test fails
if either IXSCAN disappears or the category query examines beyond `limit + 1`.

The same test follows the returned opaque cursor to the next distinct course,
checks an empty category response, and verifies that the Redis API-rate-limit
namespace receives a key. This covers the production middleware path rather than
calling the repository in isolation.

## Index inventory

The additive indexes relevant to this slice are:

| Name                       | Keys                                               | Purpose                                                           |
| -------------------------- | -------------------------------------------------- | ----------------------------------------------------------------- |
| `catalog_published_newest` | `status`, `createdAt desc`, `_id desc`             | Default published feed and stable cursor tie-break                |
| `catalog_category_newest`  | `status`, `category`, `createdAt desc`, `_id desc` | Default category feed                                             |
| `catalog_published_price`  | `status`, `price`, `_id`                           | Published price ordering/ranges                                   |
| `catalog_category_price`   | `status`, `category`, `price`, `_id`               | Category price ordering/ranges                                    |
| `catalog_published_text`   | `status`, weighted text fields                     | Published full-text search; name weight 10, tags 5, description 1 |

No production index was created by this audit and no document was migrated. In
production, keep `autoIndex` disabled and use the backup-first, confirmed
`db:indexes` procedure in `server/README.md`.

## Limitations and follow-up

- The disposable fixture proves index selection and a bounded category/newest
  page, not production cardinality or latency. Capture representative Atlas
  `explain("executionStats")`, index size, and slow-query telemetry before broad
  rollout.
- Rating, duration, and popularity require derived aggregation values. Their
  behavior is covered functionally, but large-data performance needs production-
  shaped load evidence before higher catalog limits or additional sort modes.
- Legacy documents without optional `level` or `language` do not match those
  explicit filters. No backfill is authorized by this slice.
- Text relevance and results can change as documents or MongoDB text-analysis
  behavior change; cursors are intentionally filter-bound and should be restarted
  after an invalid-cursor response.
