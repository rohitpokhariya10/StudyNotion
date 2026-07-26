const { catalogCourseListQuerySchema } = require("@studynotion/contracts")

const {
  CatalogApiError,
  sendV2Error,
} = require("../domains/catalog/catalogErrors")
const { listCatalogCourses } = require("../domains/catalog/catalogService")
const logger = require("../utils/logger")

const CATALOG_SLOW_REQUEST_MS = 1_000

const validationDetails = (issues) => ({
  fields: issues.map((issue) => ({
    code: issue.code,
    message: issue.message,
    path: issue.path.join("."),
  })),
})

exports.listCatalogCourses = async (req, res) => {
  const parsedQuery = catalogCourseListQuerySchema.safeParse(req.query)
  if (!parsedQuery.success) {
    return sendV2Error(req, res, {
      code: "INVALID_QUERY",
      message: "The catalog query is invalid",
      statusCode: 400,
      details: validationDetails(parsedQuery.error.issues),
    })
  }

  try {
    const startedAt = performance.now()
    const response = await listCatalogCourses(
      parsedQuery.data,
      req.requestId || "unknown"
    )
    const durationMs = Math.round(performance.now() - startedAt)
    if (durationMs >= CATALOG_SLOW_REQUEST_MS) {
      logger.warn("catalog.v2.slow_lookup", {
        requestId: req.requestId || "unknown",
        durationMs,
      })
    }
    // The success envelope carries a per-request trace ID. Shared HTTP caches
    // would replay that ID for later callers, so transport caching stays off;
    // RTK Query provides bounded client-side caching for this first slice.
    res.setHeader("Cache-Control", "private, no-store")
    return res.status(200).json(response)
  } catch (error) {
    if (error instanceof CatalogApiError) {
      return sendV2Error(req, res, error)
    }
    logger.error("catalog.v2.lookup_failed", {
      requestId: req.requestId || "unknown",
      error: logger.errorMetadata(error),
    })
    return sendV2Error(req, res, {
      code: "CATALOG_UNAVAILABLE",
      message: "The catalog could not be loaded",
      statusCode: 500,
    })
  }
}
