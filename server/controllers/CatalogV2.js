const { catalogCourseListQuerySchema } = require("@studynotion/contracts")

const {
  CatalogApiError,
  sendV2Error,
} = require("../domains/catalog/catalogErrors")
const { listCatalogCourses } = require("../domains/catalog/catalogService")

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
      console.warn(
        `Slow catalog v2 lookup [${req.requestId || "unknown"}]: ${durationMs}ms`
      )
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
    console.error(
      `Catalog v2 lookup failed [${req.requestId || "unknown"}]:`,
      error?.name || "UnknownError"
    )
    return sendV2Error(req, res, {
      code: "CATALOG_UNAVAILABLE",
      message: "The catalog could not be loaded",
      statusCode: 500,
    })
  }
}
