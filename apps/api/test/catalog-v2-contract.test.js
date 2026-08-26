const assert = require("node:assert/strict")
const test = require("node:test")

const {
  catalogCourseListResponseSchema,
  catalogCourseListQuerySchema,
  createOpenApiDocument,
} = require("@studynotion/contracts")

test("catalog query normalizes search and chooses deterministic defaults", () => {
  const searched = catalogCourseListQuerySchema.parse({
    q: "  Node   APIs\nsecure  ",
  })
  assert.equal(searched.q, "Node APIs secure")
  assert.equal(searched.sort, "relevance")
  assert.equal(searched.limit, 12)

  const unsearched = catalogCourseListQuerySchema.parse({})
  assert.equal(unsearched.sort, "newest")
  assert.equal(unsearched.limit, 12)
})

test("catalog query accepts its maximum page size and validated filters", () => {
  const query = catalogCourseListQuerySchema.parse({
    categoryId: "ABCDEF000000000000000001",
    language: "EN-in",
    level: "advanced",
    limit: "50",
    maxDurationSeconds: "7200",
    maxPrice: "5000",
    minDurationSeconds: "60",
    minPrice: "10",
    minRating: "4.5",
    sort: "rating_desc",
  })

  assert.equal(query.limit, 50)
  assert.equal(query.language, "en-in")
  assert.equal(query.minRating, 4.5)
  assert.equal(query.minDurationSeconds, 60)
})

test("OpenAPI scalar patterns match runtime case and cursor acceptance", () => {
  const parameters = Object.fromEntries(
    createOpenApiDocument().paths["/api/v2/courses"].get.parameters.map(
      (parameter) => [parameter.name, parameter]
    )
  )

  assert.match(
    "ABCDEF000000000000000001",
    new RegExp(parameters.categoryId.schema.pattern)
  )
  assert.match("EN-in", new RegExp(parameters.language.schema.pattern))
  assert.equal(parameters.cursor.schema.pattern, "^[A-Za-z0-9_-]+$")
})

test("catalog responses reject cursors outside the request contract", () => {
  assert.equal(
    catalogCourseListResponseSchema.safeParse({
      success: true,
      requestId: "request-id",
      data: {
        items: [],
        pageInfo: { endCursor: "not a base64url cursor", hasNextPage: true },
      },
    }).success,
    false
  )
})

test("catalog query is closed and rejects invalid pagination, sort, and category", () => {
  for (const query of [
    { limit: "51" },
    { limit: "NaN" },
    { sort: "recommended" },
    { sort: "relevance" },
    { categoryId: "not-an-object-id" },
    { unsupported: "field" },
    { minPrice: "100", maxPrice: "99" },
    { minDurationSeconds: "120", maxDurationSeconds: "60" },
  ]) {
    assert.equal(catalogCourseListQuerySchema.safeParse(query).success, false)
  }
})
