class CatalogApiError extends Error {
  constructor(code, message, statusCode = 500, details) {
    super(message)
    this.name = "CatalogApiError"
    this.code = code
    this.statusCode = statusCode
    this.details = details
  }
}

const statusCodeToErrorCode = (statusCode) => {
  if (statusCode === 400) return "INVALID_REQUEST"
  if (statusCode === 401) return "UNAUTHORIZED"
  if (statusCode === 403) return "FORBIDDEN"
  if (statusCode === 404) return "ROUTE_NOT_FOUND"
  if (statusCode === 413) return "PAYLOAD_TOO_LARGE"
  if (statusCode === 429) return "RATE_LIMITED"
  return "INTERNAL_ERROR"
}

const createV2ErrorEnvelope = (req, code, message, details) => ({
  error: {
    code,
    message,
    requestId: req.requestId || "unknown",
    ...(details === undefined ? {} : { details }),
  },
})

const sendV2Error = (req, res, { code, message, statusCode, details }) => {
  res.setHeader("Cache-Control", "private, no-store")
  return res
    .status(statusCode)
    .json(createV2ErrorEnvelope(req, code, message, details))
}

// The existing security middleware intentionally retains the v1 response
// shape. Install this before the shared limiter/parser stack so v2 failures
// receive the v2 envelope without changing any v1 bytes or limiter behavior.
const normalizeV2ErrorEnvelope = (req, res, next) => {
  const originalJson = res.json.bind(res)
  res.json = (body) => {
    if (
      res.statusCode >= 400 &&
      (!body || typeof body !== "object" || !body.error)
    ) {
      res.setHeader("Cache-Control", "private, no-store")
      const message =
        typeof body?.message === "string" && body.message
          ? body.message
          : "The request could not be completed"
      return originalJson(
        createV2ErrorEnvelope(
          req,
          statusCodeToErrorCode(res.statusCode),
          message
        )
      )
    }
    return originalJson(body)
  }
  next()
}

const isV2Request = (req) =>
  req.path === "/api/v2" || req.path.startsWith("/api/v2/")

module.exports = {
  CatalogApiError,
  createV2ErrorEnvelope,
  isV2Request,
  normalizeV2ErrorEnvelope,
  sendV2Error,
}
