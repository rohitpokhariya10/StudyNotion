const {
  apiErrorResponseSchema,
  requestIdSchema,
} = require("@studynotion/contracts")

const statusCodeToErrorCode = (statusCode) => {
  if (statusCode === 400) return "INVALID_REQUEST"
  if (statusCode === 401) return "UNAUTHORIZED"
  if (statusCode === 403) return "FORBIDDEN"
  if (statusCode === 404) return "ROUTE_NOT_FOUND"
  if (statusCode === 409) return "CONFLICT"
  if (statusCode === 413) return "PAYLOAD_TOO_LARGE"
  if (statusCode === 415) return "UNSUPPORTED_MEDIA_TYPE"
  if (statusCode === 422) return "UNPROCESSABLE_CONTENT"
  if (statusCode === 423) return "ACCOUNT_LOCKED"
  if (statusCode === 428) return "PRECONDITION_REQUIRED"
  if (statusCode === 429) return "RATE_LIMITED"
  return "INTERNAL_ERROR"
}

const preserveSessionControlCode = (statusCode, body) => {
  const code = body?.code
  if (statusCode === 423 && code === "ACCOUNT_DELETION_PENDING") return code
  if (statusCode === 428 && code === "POLICY_ACCEPTANCE_REQUIRED") return code
  return null
}

const createV2ErrorEnvelope = (req, code, message, details) => {
  const parsedRequestId = requestIdSchema.safeParse(req?.requestId)
  const requestId = parsedRequestId.success ? parsedRequestId.data : "unknown"
  const candidate = apiErrorResponseSchema.safeParse({
    error: {
      code,
      message,
      requestId,
      ...(details === undefined ? {} : { details }),
    },
  })
  if (candidate.success) return candidate.data

  return {
    error: {
      code: "INTERNAL_ERROR",
      message: "Internal server error",
      requestId,
    },
  }
}

const sendV2Error = (req, res, { code, message, statusCode, details }) => {
  res.setHeader("Cache-Control", "private, no-store")
  return res
    .status(statusCode)
    .json(createV2ErrorEnvelope(req, code, message, details))
}

// Existing v1 middleware intentionally retains its response shape. Install
// this before the shared limiter/parser stack so v2 failures receive the v2
// envelope without changing any v1 bytes or limiter behavior.
const normalizeV2ErrorEnvelope = (req, res, next) => {
  const originalJson = res.json.bind(res)
  res.json = (body) => {
    const parsedEnvelope = apiErrorResponseSchema.safeParse(body)
    const parsedRequestId = requestIdSchema.safeParse(req?.requestId)
    const expectedRequestId = parsedRequestId.success
      ? parsedRequestId.data
      : "unknown"
    if (
      res.statusCode >= 400 &&
      (!parsedEnvelope.success ||
        parsedEnvelope.data.error.requestId !== expectedRequestId)
    ) {
      res.setHeader("Cache-Control", "private, no-store")
      const message =
        typeof body?.message === "string" && body.message
          ? body.message
          : "The request could not be completed"
      return originalJson(
        createV2ErrorEnvelope(
          req,
          preserveSessionControlCode(res.statusCode, body) ||
            statusCodeToErrorCode(res.statusCode),
          message
        )
      )
    }
    return originalJson(body)
  }
  next()
}

const isV2Request = (req) => {
  const requestPath = typeof req.path === "string" ? req.path.toLowerCase() : ""
  return requestPath === "/api/v2" || requestPath.startsWith("/api/v2/")
}

module.exports = {
  createV2ErrorEnvelope,
  isV2Request,
  normalizeV2ErrorEnvelope,
  preserveSessionControlCode,
  sendV2Error,
  statusCodeToErrorCode,
}
