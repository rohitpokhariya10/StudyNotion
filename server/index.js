require("dotenv").config({ quiet: true })

const crypto = require("crypto")

const cookieParser = require("cookie-parser")
const cors = require("cors")
const express = require("express")
const helmet = require("helmet")

const { cloudinaryConnect, isCloudinaryConfigured } = require("./config/cloudinary")
const database = require("./config/database")
const redis = require("./config/redis")
const env = require("./config/env")
const { apiLimiter, webhookLimiter } = require("./middleware/rateLimiters")
const {
  requireTrustedBrowserOrigin,
} = require("./middleware/trustedOrigin")
const { razorpayWebhook } = require("./controllers/payments")
const adminRoutes = require("./routes/Admin")
const contactUsRoutes = require("./routes/Contact")
const courseRoutes = require("./routes/Course")
const paymentRoutes = require("./routes/Payments")
const profileRoutes = require("./routes/profile")
const userRoutes = require("./routes/user")

const app = express()
let server
let isShuttingDown = false

app.disable("x-powered-by")
app.set("query parser", "simple")
if (env.trustProxy !== false) app.set("trust proxy", env.trustProxy)

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    strictTransportSecurity: env.isProduction ? undefined : false,
  })
)

app.use((req, res, next) => {
  const incomingRequestId = req.get("x-request-id")
  req.requestId =
    incomingRequestId && /^[A-Za-z0-9._:-]{1,100}$/.test(incomingRequestId)
      ? incomingRequestId
      : crypto.randomUUID()
  res.setHeader("x-request-id", req.requestId)
  next()
})

const allowedOrigins = new Set(env.frontendOrigins)
app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.has(origin.replace(/\/$/, ""))) {
        return callback(null, true)
      }
      const error = new Error("Origin is not allowed")
      error.code = "CORS_NOT_ALLOWED"
      return callback(error)
    },
    credentials: true,
    methods: ["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Accept",
      "Authorization",
      "Content-Type",
      "Idempotency-Key",
      "X-Request-Id",
    ],
    exposedHeaders: ["RateLimit", "RateLimit-Policy", "X-Request-Id"],
    maxAge: 86400,
    optionsSuccessStatus: 204,
  })
)

app.get("/health/live", (_req, res) => {
  res.setHeader("cache-control", "no-store")
  return res.status(200).json({ success: true, status: "ok" })
})

app.get("/health/ready", (_req, res) => {
  res.setHeader("cache-control", "no-store")
  const checks = {
    database: database.isReady(),
    rateLimitStore: redis.isReady(),
    media: !env.isProduction || isCloudinaryConfigured(),
  }
  const ready = !isShuttingDown && Object.values(checks).every(Boolean)
  return res.status(ready ? 200 : 503).json({
    success: ready,
    status: ready ? "ready" : "not_ready",
    checks,
  })
})

app.get("/", (_req, res) =>
  res.json({
    success: true,
    message: "Your server is up and running ...",
  })
)

// Razorpay signs the exact request bytes. This endpoint must be mounted before
// express.json() so signature verification never sees a re-serialized object.
// It has an independent high-burst limiter and is not counted against browser
// API traffic.
app.post(
  "/api/v1/payment/webhook",
  webhookLimiter,
  express.raw({ type: "application/json", limit: "256kb" }),
  razorpayWebhook
)

app.use("/api/v1", apiLimiter)

app.use(express.json({ limit: env.jsonBodyLimit, strict: true }))
app.use(
  express.urlencoded({ extended: false, limit: env.formBodyLimit, parameterLimit: 100 })
)
app.use(cookieParser())
app.use("/api/v1", requireTrustedBrowserOrigin)

app.use("/api/v1/auth", userRoutes)
app.use("/api/v1/admin", adminRoutes)
app.use("/api/v1/profile", profileRoutes)
app.use("/api/v1/course", courseRoutes)
app.use("/api/v1/payment", paymentRoutes)
app.use("/api/v1/reach", contactUsRoutes)

app.use((_req, res) =>
  res.status(404).json({ success: false, message: "Route not found" })
)

app.use((error, req, res, next) => {
  if (res.headersSent) return next(error)

  if (error.code === "CORS_NOT_ALLOWED") {
    return res.status(403).json({ success: false, message: "Origin is not allowed" })
  }
  if (error.type === "entity.too.large" || error.status === 413) {
    return res.status(413).json({ success: false, message: "Request payload is too large" })
  }
  if (error instanceof SyntaxError && error.status === 400 && "body" in error) {
    return res.status(400).json({ success: false, message: "Invalid JSON payload" })
  }

  console.error(
    `Unhandled request error [${req.requestId || "unknown"}] ${req.method} ${req.path}:`,
    error.message
  )
  return res.status(500).json({ success: false, message: "Internal server error" })
})

const startServer = async () => {
  if (server?.listening) return server

  await database.connect()
  await redis.connect()
  cloudinaryConnect()

  server = app.listen(env.port, () => {
    console.log(`StudyNotion API listening on port ${env.port}`)
  })
  server.requestTimeout = env.requestTimeoutMs
  server.headersTimeout = Math.min(env.requestTimeoutMs, 60000)
  server.keepAliveTimeout = 5000
  server.maxRequestsPerSocket = 1000
  return server
}

const closeHttpServer = () =>
  new Promise((resolve, reject) => {
    if (!server?.listening) return resolve()
    server.close((error) => (error ? reject(error) : resolve()))
  })

const shutdown = async (reason, exitCode = 0) => {
  if (isShuttingDown) return
  isShuttingDown = true
  console.log(`Shutting down StudyNotion API (${reason})`)

  const forceExit = setTimeout(() => {
    console.error("Graceful shutdown timed out; closing remaining connections")
    server?.closeAllConnections?.()
    process.exit(1)
  }, env.shutdownTimeoutMs)
  forceExit.unref()

  try {
    await closeHttpServer()
    await redis.disconnect()
    await database.disconnect()
    process.exitCode = exitCode
  } catch (error) {
    console.error("Graceful shutdown failed:", error.message)
    process.exitCode = 1
  } finally {
    clearTimeout(forceExit)
  }
}

if (require.main === module) {
  startServer().catch((error) => {
    console.error("Server startup failed:", error.message)
    void shutdown("startup failure", 1)
  })

  process.once("SIGTERM", () => void shutdown("SIGTERM"))
  process.once("SIGINT", () => void shutdown("SIGINT"))
  process.once("uncaughtException", (error) => {
    console.error("Uncaught exception:", error.message)
    void shutdown("uncaughtException", 1)
  })
  process.once("unhandledRejection", (reason) => {
    const message = reason instanceof Error ? reason.message : String(reason)
    console.error("Unhandled rejection:", message)
    void shutdown("unhandledRejection", 1)
  })
}

module.exports = { app, shutdown, startServer }
