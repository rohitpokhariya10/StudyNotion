const env = require("../config/env")

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"])
const trustedOrigins = new Set(env.frontendOrigins)

const rejectRequest = (res) =>
  res.status(403).json({
    success: false,
    message: "Request origin is not allowed",
  })

// Cookie-authenticated APIs need an explicit CSRF boundary when the frontend
// and API are deployed on different origins. Browsers attach Origin and
// Sec-Fetch-Site; non-browser API clients may omit both and remain supported.
exports.requireTrustedBrowserOrigin = (req, res, next) => {
  if (SAFE_METHODS.has(req.method)) return next()

  const origin = req.get("origin")
  if (origin) {
    let normalizedOrigin
    try {
      normalizedOrigin = new URL(origin).origin
    } catch {
      return rejectRequest(res)
    }

    return trustedOrigins.has(normalizedOrigin) ? next() : rejectRequest(res)
  }

  if (req.get("sec-fetch-site")?.toLowerCase() === "cross-site") {
    return rejectRequest(res)
  }

  return next()
}
