const assert = require("node:assert/strict")
const test = require("node:test")

const { catalogCourseListQuerySchema } = require("@studynotion/contracts")
const { SORT_DEFINITIONS } = require("../domains/catalog/catalogCursor")
const { buildCatalogPipeline } = require("../domains/catalog/catalogRepository")

test("catalog repository begins with a Published-only canonical Course match", () => {
  const query = catalogCourseListQuerySchema.parse({
    categoryId: "64b000000000000000000001",
    language: "EN",
    level: "beginner",
    maxPrice: "2000",
    minPrice: "500",
    q: "  secure node  ",
  })
  const pipeline = buildCatalogPipeline(query, null, query.limit + 1)
  const firstMatch = pipeline[0].$match

  assert.equal(firstMatch.status, "Published")
  assert.deepEqual(firstMatch.$text, { $search: "secure node" })
  assert.equal(firstMatch.category.toString(), query.categoryId)
  assert.equal(firstMatch.level, "beginner")
  assert.equal(firstMatch.language, "en")
  assert.deepEqual(firstMatch.price, { $gte: 500, $lte: 2000 })
})

test("all six catalog sorts have an explicit stable _id tie-break", () => {
  assert.deepEqual(Object.keys(SORT_DEFINITIONS).sort(), [
    "newest",
    "popular",
    "price_asc",
    "price_desc",
    "rating_desc",
    "relevance",
  ])

  for (const sort of Object.keys(SORT_DEFINITIONS)) {
    const query = catalogCourseListQuerySchema.parse({
      ...(sort === "relevance" ? { q: "node" } : {}),
      sort,
    })
    const pipeline = buildCatalogPipeline(query, null, query.limit + 1)
    const sortStage = pipeline.find((stage) => stage.$sort)
    const definition = SORT_DEFINITIONS[sort]
    assert.deepEqual(sortStage.$sort, {
      [definition.field]: definition.direction,
      _id: definition.direction,
    })
  }
})

test("catalog projection excludes source enrollment, review, and curriculum data", () => {
  const query = catalogCourseListQuerySchema.parse({})
  const pipeline = buildCatalogPipeline(query, null, query.limit + 1)
  const projection = pipeline.at(-1).$project

  for (const privateField of [
    "studentsEnroled",
    "ratingAndReviews",
    "courseContent",
    "catalogLessons",
    "thumbnailPublicId",
    "archivedBy",
  ]) {
    assert.equal(privateField in projection, false)
  }
})

test("default indexed sorts page before expensive public DTO lookups", () => {
  for (const sort of ["newest", "price_asc", "price_desc"]) {
    const query = catalogCourseListQuerySchema.parse({ sort })
    const pipeline = buildCatalogPipeline(query, null, query.limit + 1)
    const limitIndex = pipeline.findIndex((stage) => stage.$limit)
    const lookupIndex = pipeline.findIndex((stage) => stage.$lookup)

    assert.equal(limitIndex > -1, true)
    assert.equal(lookupIndex > limitIndex, true)
  }
})

test("computed filters run before paging so matches are not truncated", () => {
  const query = catalogCourseListQuerySchema.parse({
    minDurationSeconds: "3600",
    minRating: "4",
  })
  const pipeline = buildCatalogPipeline(query, null, query.limit + 1)
  const computedMatchIndex = pipeline.findIndex(
    (stage) => stage.$match?.ratingAverage || stage.$match?.durationSeconds
  )
  const limitIndex = pipeline.findIndex((stage) => stage.$limit)

  assert.equal(computedMatchIndex > -1, true)
  assert.equal(computedMatchIndex < limitIndex, true)
})
