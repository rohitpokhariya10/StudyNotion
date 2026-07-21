const assert = require("node:assert/strict")
const test = require("node:test")

const { catalogCourseListQuerySchema } = require("@studynotion/contracts")
const { decodeCatalogCursor } = require("../domains/catalog/catalogCursor")
const { CatalogApiError } = require("../domains/catalog/catalogErrors")
const { mapCatalogCourse } = require("../domains/catalog/catalogMapper")
const { listCatalogCourses } = require("../domains/catalog/catalogService")

const course = (id, createdAt, overrides = {}) => ({
  _id: id,
  category: { _id: "64b000000000000000000010", name: "Engineering" },
  courseDescription: `Description ${id}`,
  courseName: `Course ${id}`,
  createdAt: new Date(createdAt),
  durationSeconds: 1800,
  enrollmentCount: 2,
  instructor: {
    _id: "64b000000000000000000020",
    firstName: "Ada",
    image: "https://cdn.example.test/ada.png",
    lastName: "Lovelace",
  },
  language: "en",
  level: "beginner",
  price: 999,
  ratingAverage: 4.5,
  ratingCount: 8,
  searchScore: 2,
  thumbnail: "https://cdn.example.test/course.png",
  ...overrides,
})

test("catalog service returns limit-sized pages and a filter-bound cursor", async () => {
  const documents = [
    course("64b000000000000000000003", "2026-03-03T00:00:00.000Z"),
    course("64b000000000000000000002", "2026-03-02T00:00:00.000Z"),
    course("64b000000000000000000001", "2026-03-01T00:00:00.000Z"),
  ]
  let receivedCursor
  const repository = {
    listPublishedCourses: async (_query, cursor) => {
      receivedCursor = cursor
      return documents
    },
  }
  const query = catalogCourseListQuerySchema.parse({ limit: "2" })
  const result = await listCatalogCourses(query, "request-1", { repository })

  assert.equal(result.success, true)
  assert.equal(result.requestId, "request-1")
  assert.equal(result.data.items.length, 2)
  assert.equal(result.data.pageInfo.hasNextPage, true)
  assert.equal(typeof result.data.pageInfo.endCursor, "string")
  assert.equal(receivedCursor, null)

  const nextQuery = catalogCourseListQuerySchema.parse({
    cursor: result.data.pageInfo.endCursor,
    limit: "2",
  })
  const decoded = decodeCatalogCursor(nextQuery.cursor, nextQuery)
  assert.equal(decoded.id, "64b000000000000000000002")
  assert.equal(decoded.key, "2026-03-02T00:00:00.000Z")

  const changedFilters = catalogCourseListQuerySchema.parse({
    cursor: result.data.pageInfo.endCursor,
    level: "advanced",
    limit: "2",
  })
  assert.throws(
    () => decodeCatalogCursor(changedFilters.cursor, changedFilters),
    (error) =>
      error instanceof CatalogApiError && error.code === "INVALID_CURSOR"
  )
})

test("catalog service returns a stable empty page", async () => {
  const query = catalogCourseListQuerySchema.parse({})
  const result = await listCatalogCourses(query, "request-empty", {
    repository: { listPublishedCourses: async () => [] },
  })

  assert.deepEqual(result, {
    success: true,
    requestId: "request-empty",
    data: {
      items: [],
      pageInfo: { endCursor: null, hasNextPage: false },
    },
  })
})

test("catalog mapper exposes only the stable public card DTO", () => {
  const mapped = mapCatalogCourse(
    course("64b000000000000000000001", "2026-03-01T00:00:00.000Z", {
      archivedBy: "private-admin-id",
      catalogLessons: [{ videoUrl: "https://private.example.test/video" }],
      ratingAndReviews: [{ review: "private review body", user: "student-id" }],
      studentsEnroled: ["student-id"],
      thumbnailPublicId: "private-provider-id",
    })
  )

  assert.deepEqual(Object.keys(mapped).sort(), [
    "category",
    "createdAt",
    "currency",
    "description",
    "durationSeconds",
    "enrollmentCount",
    "id",
    "instructor",
    "language",
    "level",
    "name",
    "price",
    "rating",
    "thumbnailUrl",
  ])
  const serialized = JSON.stringify(mapped)
  for (const secret of [
    "student-id",
    "private-admin-id",
    "private-provider-id",
    "private review body",
    "private.example.test",
  ]) {
    assert.equal(serialized.includes(secret), false)
  }
})
