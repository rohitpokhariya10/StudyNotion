const logger = require("../../utils/logger")
const { isV2Request, sendV2Error } = require("./v2ErrorEnvelope")

const createErrorHandler = (httpLogger = logger) =>
  function errorHandler(error, req, res, next) {
    if (res.headersSent) return next(error)
    const v2Request = isV2Request(req)

    if (error.code === "CORS_NOT_ALLOWED") {
      if (v2Request) {
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
      if (v2Request) {
        return sendV2Error(req, res, {
          code: "PAYLOAD_TOO_LARGE",
          message: "Request payload is too large",
          statusCode: 413,
        })
      }
      return res
        .status(413)
        .json({ success: false, message: "Request payload is too large" })
    }
    if (
      error instanceof SyntaxError &&
      error.status === 400 &&
      "body" in error
    ) {
      if (v2Request) {
        return sendV2Error(req, res, {
          code: "INVALID_REQUEST",
          message: "Invalid JSON payload",
          statusCode: 400,
        })
      }
      return res
        .status(400)
        .json({ success: false, message: "Invalid JSON payload" })
    }
    if (v2Request && error instanceof URIError && error.status === 400) {
      return sendV2Error(req, res, {
        code: "INVALID_PARAMS",
        message: "The route parameters are invalid",
        statusCode: 400,
      })
    }
    if (v2Request && error.status === 415) {
      return sendV2Error(req, res, {
        code: "UNSUPPORTED_MEDIA_TYPE",
        message: "The request media type is not supported",
        statusCode: 415,
      })
    }
    if (v2Request && error.status === 400) {
      return sendV2Error(req, res, {
        code: "INVALID_REQUEST",
        message: "The request could not be completed",
        statusCode: 400,
      })
    }

    httpLogger.error("http.request.unhandled_error", {
      requestId: req.requestId || "unknown",
      method: req.method,
      path: httpLogger.getRequestRoute(req),
      statusCode: 500,
      error,
    })
    if (v2Request) {
      return sendV2Error(req, res, {
        code: "INTERNAL_ERROR",
        message: "Internal server error",
        statusCode: 500,
      })
    }
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    })
  }

const errorHandler = createErrorHandler()

module.exports = { createErrorHandler, errorHandler }
