const assert = require("node:assert/strict")
const { test } = require("node:test")

process.env.NODE_ENV = "test"
process.env.FRONTEND_URL = "http://localhost:3000"
process.env.MONGODB_URL =
  "mongodb://127.0.0.1:27017/studynotion-app-composition"
process.env.JWT_SECRET = "app-composition-jwt-secret-123456789012345"
process.env.OTP_SECRET = "app-composition-otp-secret-123456789012345"
process.env.RAZORPAY_KEY_ID = "rzp_test_app_composition"
process.env.RAZORPAY_SECRET = "app-composition-razorpay-secret"
process.env.RAZORPAY_WEBHOOK_SECRET = "app-composition-webhook-secret"

const api = require("../index")
const { registerRoutes } = require("../app/registerRoutes")
const { createServerLifecycle } = require("../bootstrap")
const { razorpayWebhook } = require("../controllers/payments")
const legacyCatalogErrors = require("../domains/catalog/catalogErrors")
const { apiLimiter, webhookLimiter } = require("../middleware/rateLimiters")
const { requireTrustedBrowserOrigin } = require("../middleware/trustedOrigin")
const catalogV2Routes = require("../routes/CatalogV2")
const learningV2Routes = require("../routes/LearningV2")
const {
  createErrorHandler,
  errorHandler,
} = require("../shared/http/errorHandler")
const { notFoundHandler } = require("../shared/http/notFoundHandler")
const sharedV2Errors = require("../shared/http/v2ErrorEnvelope")

const createResponse = () => ({
  body: undefined,
  headers: {},
  headersSent: false,
  statusCode: 200,
  json(body) {
    this.body = body
    return this
  },
  setHeader(name, value) {
    this.headers[name.toLowerCase()] = value
  },
  status(statusCode) {
    this.statusCode = statusCode
    return this
  },
})

test("index keeps the public compatibility bootstrap surface", () => {
  assert.deepEqual(Object.keys(api).sort(), ["app", "shutdown", "startServer"])
  assert.equal(typeof api.app, "function")
  assert.equal(typeof api.startServer, "function")
  assert.equal(typeof api.shutdown, "function")

  const stack = api.app.router.stack
  assert.equal(stack.at(-2).handle, notFoundHandler)
  assert.equal(stack.at(-1).handle, errorHandler)
})

test("route registration preserves webhook, parser, limiter, and route order", () => {
  const calls = []
  const recorder = {
    post(...args) {
      calls.push({ method: "post", args })
    },
    use(...args) {
      calls.push({ method: "use", args })
    },
  }

  registerRoutes(recorder)

  assert.deepEqual(
    calls.map(({ method, args }) => [
      method,
      typeof args[0] === "string" ? args[0] : "<global>",
    ]),
    [
      ["post", "/api/v1/payment/webhook"],
      ["use", "/api/v1"],
      ["use", "/api/v2"],
      ["use", "<global>"],
      ["use", "<global>"],
      ["use", "<global>"],
      ["use", "/api/v1"],
      ["use", "/api/v2"],
      ["use", "/api/v2/learning"],
      ["use", "/api/v2"],
      ["use", "/api/v1/auth"],
      ["use", "/api/v1/admin"],
      ["use", "/api/v1/profile"],
      ["use", "/api/v1/course"],
      ["use", "/api/v1/payment"],
      ["use", "/api/v1/reach"],
    ]
  )

  assert.equal(calls[0].args[1], webhookLimiter)
  assert.equal(typeof calls[0].args[2], "function")
  assert.equal(calls[0].args[3], razorpayWebhook)
  assert.equal(calls[1].args[1], apiLimiter)
  assert.equal(calls[2].args[1], sharedV2Errors.normalizeV2ErrorEnvelope)
  assert.equal(calls[2].args[2], apiLimiter)
  assert.equal(calls[6].args[1], requireTrustedBrowserOrigin)
  assert.equal(calls[7].args[1], requireTrustedBrowserOrigin)
  assert.equal(calls[8].args[1], learningV2Routes)
  assert.equal(calls[9].args[1], catalogV2Routes)
})

test("catalog error imports remain adapters to shared HTTP behavior", () => {
  for (const name of [
    "createV2ErrorEnvelope",
    "isV2Request",
    "normalizeV2ErrorEnvelope",
    "sendV2Error",
  ]) {
    assert.equal(legacyCatalogErrors[name], sharedV2Errors[name])
  }

  const error = new legacyCatalogErrors.CatalogApiError(
    "CATALOG_UNAVAILABLE",
    "Unavailable",
    503
  )
  assert.equal(error.code, "CATALOG_UNAVAILABLE")
  assert.equal(error.statusCode, 503)
})

test("shared terminal handlers preserve v1 and v2 boundary envelopes", () => {
  const v1Response = createResponse()
  notFoundHandler({ path: "/api/v1/missing" }, v1Response)
  assert.equal(v1Response.statusCode, 404)
  assert.deepEqual(v1Response.body, {
    success: false,
    message: "Route not found",
  })

  const v2Response = createResponse()
  notFoundHandler(
    { path: "/api/v2/missing", requestId: "boundary-request-1" },
    v2Response
  )
  assert.equal(v2Response.statusCode, 404)
  assert.equal(v2Response.headers["cache-control"], "private, no-store")
  assert.deepEqual(v2Response.body, {
    error: {
      code: "ROUTE_NOT_FOUND",
      message: "Route not found",
      requestId: "boundary-request-1",
    },
  })

  const logEvents = []
  const handler = createErrorHandler({
    error(event, metadata) {
      logEvents.push({ event, metadata })
    },
    getRequestRoute() {
      return "/private-route"
    },
  })
  const errorResponse = createResponse()
  handler(
    new Error("private database detail"),
    { method: "GET", path: "/api/v1/private", requestId: "request-2" },
    errorResponse,
    assert.fail
  )
  assert.equal(errorResponse.statusCode, 500)
  assert.deepEqual(errorResponse.body, {
    success: false,
    message: "Internal server error",
  })
  assert.equal(JSON.stringify(errorResponse.body).includes("database"), false)
  assert.equal(logEvents[0].event, "http.request.unhandled_error")
  assert.equal(logEvents[0].metadata.requestId, "request-2")
})

test("server lifecycle retains startup order, timeouts, and idempotency", async () => {
  const calls = []
  const listener = {
    close(callback) {
      calls.push("server.close")
      this.listening = false
      callback()
    },
    headersTimeout: 0,
    keepAliveTimeout: 0,
    listening: true,
    maxRequestsPerSocket: 0,
    requestTimeout: 0,
  }
  const lifecycleState = { isShuttingDown: false }
  const services = {
    cloudinaryConnect() {
      calls.push("media.connect")
    },
    database: {
      async connect() {
        calls.push("database.connect")
      },
      async disconnect() {
        calls.push("database.disconnect")
      },
    },
    env: {
      port: 4321,
      requestTimeoutMs: 65_000,
      shutdownTimeoutMs: 100,
    },
    logger: {
      error() {},
      info(event) {
        calls.push(event)
      },
    },
    redis: {
      async connect() {
        calls.push("redis.connect")
      },
      async disconnect() {
        calls.push("redis.disconnect")
      },
    },
  }
  const app = {
    listen(port, callback) {
      calls.push(`app.listen:${port}`)
      callback()
      return listener
    },
  }
  const { shutdown, startServer } = createServerLifecycle({
    app,
    lifecycleState,
    services,
  })

  assert.equal(await startServer(), listener)
  assert.equal(await startServer(), listener)
  assert.deepEqual(calls, [
    "database.connect",
    "redis.connect",
    "media.connect",
    "app.listen:4321",
    "api.listening",
  ])
  assert.equal(listener.requestTimeout, 65_000)
  assert.equal(listener.headersTimeout, 60_000)
  assert.equal(listener.keepAliveTimeout, 5000)
  assert.equal(listener.maxRequestsPerSocket, 1000)

  const originalExitCode = process.exitCode
  try {
    await shutdown("test shutdown", 0)
    await shutdown("duplicate shutdown", 1)
    assert.equal(lifecycleState.isShuttingDown, true)
    assert.deepEqual(calls.slice(5), [
      "api.shutdown_started",
      "server.close",
      "redis.disconnect",
      "database.disconnect",
    ])
  } finally {
    process.exitCode = originalExitCode
  }
})
