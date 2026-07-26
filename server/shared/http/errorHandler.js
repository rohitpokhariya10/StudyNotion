const logger = require("../../utils/logger")
const { isV2Request, sendV2Error } = require("./v2ErrorEnvelope")

const createErrorHandler = (httpLogger = logger) =>
  function errorHandler(error, req, res, next) {
    if (res.headersSent) return next(error)

    if (error.code === "CORS_NOT_ALLOWED") {
      if (isV2Request(req)) {
        return sendV2Error(req, res, {
          code: "CORS_NOT_ALLOWED",
          message: "Origin is not allowed",
          statusCode: 403,
        })
      }
      return res
        .status(403)
        .json({ success: false, message: "Origin is not allowed" })
    }
    if (error.type === "entity.too.large" || error.status === 413) {
      return res
        .status(413)
        .json({ success: false, message: "Request payload is too large" })
    }
    if (
      error instanceof SyntaxError &&
      error.status === 400 &&
      "body" in error
    ) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid JSON payload" })
    }

    httpLogger.error("http.request.unhandled_error", {
      requestId: req.requestId || "unknown",
      method: req.method,
      path: httpLogger.getRequestRoute(req),
      statusCode: 500,
      error,
    })
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" })
  }

const errorHandler = createErrorHandler()

module.exports = { createErrorHandler, errorHandler }
