const { catalogCourseListResponseSchema } = require("@studynotion/contracts")

const { decodeCatalogCursor, encodeCatalogCursor } = require("./catalogCursor")
const { CatalogApiError } = require("./catalogErrors")
const { mapCatalogCourse } = require("./catalogMapper")
const catalogRepository = require("./catalogRepository")

const listCatalogCourses = async (query, requestId, dependencies = {}) => {
  const repository = dependencies.repository || catalogRepository
  const cursor = decodeCatalogCursor(query.cursor, query)
  const documents = await repository.listPublishedCourses(query, cursor)
  const hasNextPage = documents.length > query.limit
  const pageDocuments = documents.slice(0, query.limit)
  const endCursor = hasNextPage
    ? encodeCatalogCursor(pageDocuments[pageDocuments.length - 1], query)
    : null

  const response = {
    success: true,
    requestId,
    data: {
      items: pageDocuments.map(mapCatalogCourse),
      pageInfo: { endCursor, hasNextPage },
    },
  }
  const parsed = catalogCourseListResponseSchema.safeParse(response)
  if (!parsed.success) {
    throw new CatalogApiError(
      "CATALOG_RESPONSE_INVALID",
      "The catalog response could not be produced",
      500
    )
  }
  return parsed.data
}

module.exports = { listCatalogCourses }
