const crypto = require("crypto")

const { ipKeyGenerator, MemoryStore, rateLimit } = require("express-rate-limit")
const { RedisStore } = require("rate-limit-redis")

const redis = require("../config/redis")
const logger = require("../utils/logger")

class DeferredRedisStore extends RedisStore {
  init(options) {
    // The Redis connection is intentionally opened by startServer before the
    // app listens. Defer script loading until the first request so importing
    // the Express app remains side-effect free in tests and tooling.
    this.windowMs = options.windowMs
  }

  async ensureScripts() {
    try {
      if (!this.incrementScriptSha) {
        this.incrementScriptSha = this.loadIncrementScript()
      }
      if (!this.getScriptSha) this.getScriptSha = this.loadGetScript()
      await Promise.all([this.incrementScriptSha, this.getScriptSha])
    } catch (error) {
      // A transient first Redis failure must not poison every future request
      // with the same permanently rejected promise.
      this.incrementScriptSha = undefined
      this.getScriptSha = undefined
      throw error
    }
  }

  async increment(key) {
    await this.ensureScripts()
    return super.increment(key)
  }

  async get(key) {
    await this.ensureScripts()
    return super.get(key)
  }
}

// Wraps the shared Redis store with a per-process fallback. Used only for
// exam traffic: a Redis outage must not stop students saving answers, and
// exam integrity is enforced by the attempt's own server-side predicates,
// not by rate limits. While Redis is unavailable, limits still apply per
// process. Security-sensitive limiters (login, OTP, payment) stay fail-closed.
class FailOpenStore {
  constructor({ name, primary, fallback = new MemoryStore() }) {
    this.name = name
    this.primary = primary
    this.fallback = fallback
    this.prefix = primary.prefix
    this.localKeys = false
    this.lastWarnedAt = 0
  }

  init(options) {
    this.primary.init?.(options)
    this.fallback.init?.(options)
  }

  report(error) {
    const now = Date.now()
    if (now - this.lastWarnedAt < 30_000) return
    this.lastWarnedAt = now
    logger.warn("rate_limit.store_fallback", {
      limiter: this.name,
      error: logger.errorMetadata(error),
    })
  }

  async attempt(method, key) {
    try {
      return await this.primary[method](key)
    } catch (error) {
      this.report(error)
      return this.fallback[method](key)
    }
  }

  increment(key) {
    return this.attempt("increment", key)
  }

  decrement(key) {
    return this.attempt("decrement", key)
  }

  resetKey(key) {
    return this.attempt("resetKey", key)
  }

  get(key) {
    return this.attempt("get", key)
  }

  shutdown() {
    return this.fallback.shutdown?.()
  }
}

const hashRateLimitIdentity = (value) =>
  crypto.createHash("sha256").update(String(value)).digest("hex")

const requestIpKey = (request) => {
  const normalizedIp = ipKeyGenerator(
    request.ip || request.socket?.remoteAddress || "unknown"
  )
  return `ip:${hashRateLimitIdentity(normalizedIp)}`
}

const identityKey = (field) => (request) => {
  const value = request.body?.[field]
  if (typeof value !== "string" || !value.trim()) return requestIpKey(request)
  return `${field}:${hashRateLimitIdentity(
    value.trim().toLowerCase().slice(0, 254)
  )}`
}

const authenticatedUserKey = (request) =>
  request.user?.id
    ? `user:${hashRateLimitIdentity(request.user.id)}`
    : requestIpKey(request)

const sharedStore = (name) =>
  redis.isConfigured()
    ? new DeferredRedisStore({
        prefix: `studynotion:rate-limit:${name}:`,
        sendCommand: redis.sendCommand,
      })
    : undefined

const createLimiter = ({
  name,
  limit,
  windowMs,
  message,
  failOpen = false,
  keyGenerator = requestIpKey,
  skipSuccessfulRequests = false,
}) => {
  const shared = sharedStore(name)
  const store =
    shared && failOpen ? new FailOpenStore({ name, primary: shared }) : shared
  return rateLimit({
    windowMs,
    limit,
    keyGenerator,
    ...(store ? { store } : {}),
    standardHeaders: "draft-8",
    legacyHeaders: false,
    passOnStoreError: false,
    skipSuccessfulRequests,
    message: { success: false, message },
  })
}

exports.apiLimiter = createLimiter({
  name: "api-ip",
  windowMs: 15 * 60 * 1000,
  limit: 500,
  message: "Too many requests. Please try again later.",
})

exports.loginIpLimiter = createLimiter({
  name: "login-ip",
  windowMs: 15 * 60 * 1000,
  limit: 30,
  skipSuccessfulRequests: true,
  message: "Too many login attempts. Please try again later.",
})

exports.loginIdentityLimiter = createLimiter({
  name: "login-email",
  windowMs: 15 * 60 * 1000,
  limit: 10,
  keyGenerator: identityKey("email"),
  skipSuccessfulRequests: true,
  message: "Too many login attempts for this account. Please try again later.",
})

exports.signupIpLimiter = createLimiter({
  name: "signup-ip",
  windowMs: 60 * 60 * 1000,
  limit: 10,
  message: "Too many signup attempts. Please try again later.",
})

exports.signupIdentityLimiter = createLimiter({
  name: "signup-email",
  windowMs: 60 * 60 * 1000,
  limit: 3,
  keyGenerator: identityKey("email"),
  message: "Too many signup attempts for this email. Please try again later.",
})

exports.otpIpLimiter = createLimiter({
  name: "otp-ip",
  windowMs: 15 * 60 * 1000,
  limit: 10,
  message: "Too many verification-code requests. Please try again later.",
})

exports.otpIdentityLimiter = createLimiter({
  name: "otp-email",
  windowMs: 15 * 60 * 1000,
  limit: 5,
  keyGenerator: identityKey("email"),
  message: "Too many verification-code requests for this email.",
})

exports.passwordResetIpLimiter = createLimiter({
  name: "password-reset-ip",
  windowMs: 60 * 60 * 1000,
  limit: 10,
  message: "Too many password requests. Please try again later.",
})

exports.passwordResetIdentityLimiter = createLimiter({
  name: "password-reset-email",
  windowMs: 60 * 60 * 1000,
  limit: 5,
  keyGenerator: identityKey("email"),
  message: "Too many password requests for this email. Please try again later.",
})

exports.contactIpLimiter = createLimiter({
  name: "contact-ip",
  windowMs: 60 * 60 * 1000,
  limit: 10,
  message: "Too many contact requests. Please try again later.",
})

exports.contactIdentityLimiter = createLimiter({
  name: "contact-email",
  windowMs: 60 * 60 * 1000,
  limit: 5,
  keyGenerator: identityKey("email"),
  message: "Too many contact requests for this email. Please try again later.",
})

exports.paymentLimiter = createLimiter({
  name: "payment-user",
  windowMs: 60 * 1000,
  limit: 20,
  keyGenerator: authenticatedUserKey,
  message: "Too many payment requests. Please try again later.",
})

exports.webhookLimiter = createLimiter({
  name: "razorpay-webhook-ip",
  windowMs: 60 * 1000,
  limit: 300,
  message: "Webhook rate limit exceeded.",
})

// Project NEET exam traffic is exempt from the shared per-IP API limiter
// (see app/registerRoutes.js) because classrooms and coaching centres often
// share one NAT address for a three-hour exam. These limiters replace it:
// a coarse per-IP ceiling before authentication, then per-student budgets.
// The per-IP ceiling is a flood guard sized for a whole centre behind one
// NAT address (about 200 requests/second); the per-student budgets below are
// the real controls.
exports.neetAttemptIpLimiter = createLimiter({
  name: "neet-attempt-ip",
  windowMs: 15 * 60 * 1000,
  limit: 180_000,
  failOpen: true,
  message: "Too many exam requests from this network. Please retry shortly.",
})

exports.neetAttemptUserLimiter = createLimiter({
  name: "neet-attempt-user",
  windowMs: 60 * 1000,
  limit: 240,
  failOpen: true,
  keyGenerator: authenticatedUserKey,
  message: "Too many exam requests. Your answers are kept; please retry.",
})

exports.neetAttemptSessionLimiter = createLimiter({
  name: "neet-attempt-session",
  windowMs: 60 * 1000,
  limit: 120,
  failOpen: true,
  keyGenerator: (request) =>
    `${authenticatedUserKey(request)}:attempt:${String(request.path).split("/")[1]?.toLowerCase() || "list"}`,
  message: "This attempt is sending too many requests. Please retry shortly.",
})

exports.neetRegistrationLimiter = createLimiter({
  name: "neet-registration-user",
  windowMs: 60 * 60 * 1000,
  limit: 30,
  failOpen: true,
  keyGenerator: authenticatedUserKey,
  message: "Too many mock registrations. Please try again later.",
})

exports.hashRateLimitIdentity = hashRateLimitIdentity
exports._test = { DeferredRedisStore, FailOpenStore, createLimiter }
