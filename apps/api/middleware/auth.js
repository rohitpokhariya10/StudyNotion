const User = require("../models/User")
const { readSessionToken, verifySessionToken } = require("../utils/auth")
const logger = require("../utils/logger")
const { hasCurrentPolicyAcceptance } = require("../utils/policyAcceptance")

const POLICY_PENDING_ALLOWED_PATHS = new Set([
  "/api/v1/auth/accept-policies",
  "/api/v1/profile/deleteProfile",
  "/api/v1/profile/getUserDetails",
])

// Operations on an exam that is already running stay available when a new
// policy version is published mid-exam, so a student is not locked out of a
// timed attempt; the acceptance prompt appears once the exam ends. These
// paths act only on an attempt in progress (or return its final state).
// Registering, readying, starting, listing and results still require
// acceptance.
const POLICY_PENDING_ALLOWED_PATTERNS = Object.freeze([
  /^\/api\/v2\/project-neet\/attempts\/[0-9a-f]{24}\/(?:responses|heartbeat|session|submit|proctor-events)$/i,
])

const isPolicyPendingAllowed = (path) =>
  POLICY_PENDING_ALLOWED_PATHS.has(path) ||
  POLICY_PENDING_ALLOWED_PATTERNS.some((pattern) => pattern.test(path))

const DELETION_PENDING_ALLOWED_PATHS = new Set([
  "/api/v1/profile/deleteProfile",
  "/api/v1/profile/getUserDetails",
])

exports.auth = async (req, res, next) => {
  const token = readSessionToken(req)
  if (!token) {
    return res.status(401).json({ success: false, message: "Token Missing" })
  }

  try {
    const decoded = verifySessionToken(token)

    if (
      !decoded ||
      typeof decoded !== "object" ||
      !decoded.id ||
      !User.db.base.isValidObjectId(decoded.id)
    ) {
      return res.status(401).json({
        success: false,
        message: "Token is invalid or expired",
      })
    }

    const user = await User.findById(decoded.id).select(
      "_id email accountType active approved sessionVersion +deletionPending +policyAcceptances"
    )
    const tokenSessionVersion = Number.isInteger(decoded.sessionVersion)
      ? decoded.sessionVersion
      : 0
    const currentSessionVersion = Number.isInteger(user?.sessionVersion)
      ? user.sessionVersion
      : 0

    if (
      !user ||
      !user.active ||
      !user.approved ||
      tokenSessionVersion !== currentSessionVersion
    ) {
      return res.status(401).json({
        success: false,
        message: "This session is no longer authorized",
      })
    }

    const requiresPolicyAcceptance = !hasCurrentPolicyAcceptance(user)
    req.user = {
      id: user._id.toString(),
      email: user.email,
      accountType: user.accountType,
      deletionPending: user.deletionPending === true,
      requiresPolicyAcceptance,
    }
    // Session metadata for handlers that may need to re-issue the same
    // session (for example, a long exam). Not part of req.user.
    req.sessionExpiresAt = Number.isFinite(decoded.exp)
      ? new Date(decoded.exp * 1000)
      : null
    req.sessionVersion = currentSessionVersion
    res.setHeader("Cache-Control", "private, no-store, max-age=0")
    res.setHeader("Pragma", "no-cache")

    const requestPath = String(req.originalUrl || "").split("?", 1)[0]
    if (
      user.deletionPending === true &&
      !DELETION_PENDING_ALLOWED_PATHS.has(requestPath)
    ) {
      return res.status(423).json({
        success: false,
        code: "ACCOUNT_DELETION_PENDING",
        message:
          "Account deletion is pending; retry deletion or contact support",
      })
    }
    if (requiresPolicyAcceptance && !isPolicyPendingAllowed(requestPath)) {
      return res.status(428).json({
        success: false,
        code: "POLICY_ACCEPTANCE_REQUIRED",
        message:
          "Review and accept the current Terms and Privacy Notice to continue",
      })
    }
    return next()
  } catch (error) {
    if (
      error.name === "JsonWebTokenError" ||
      error.name === "TokenExpiredError" ||
      error.name === "NotBeforeError"
    ) {
      return res.status(401).json({
        success: false,
        message: "Token is invalid or expired",
      })
    }

    logger.error("auth.session_validation_failed", {
      requestId: req.requestId || "unknown",
      error: logger.errorMetadata(error),
    })
    return res.status(500).json({
      success: false,
      message: "Something went wrong while validating the session",
    })
  }
}

const requireAccountType = (accountType, message) => (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: "Unauthorized" })
  }
  if (req.user.accountType !== accountType) {
    return res.status(403).json({ success: false, message })
  }
  return next()
}

exports.isStudent = requireAccountType(
  "Student",
  "This is a Protected Route for Students"
)
exports.isInstructor = requireAccountType(
  "Instructor",
  "This is a Protected Route for Instructors"
)
exports.isAdmin = requireAccountType(
  "Admin",
  "This is a Protected Route for Admins"
)
