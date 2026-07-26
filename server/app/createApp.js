const crypto = require("crypto")

const cors = require("cors")
const express = require("express")
const helmet = require("helmet")

const { isCloudinaryConfigured } = require("../config/cloudinary")
const database = require("../config/database")
const env = require("../config/env")
const redis = require("../config/redis")
const { registerRoutes } = require("./registerRoutes")
const { errorHandler } = require("../shared/http/errorHandler")
const { notFoundHandler } = require("../shared/http/notFoundHandler")
const logger = require("../utils/logger")

const { applicationMetadata, createHttpRequestLogger } = logger

const createApp = ({ isShuttingDown = () => false } = {}) => {
  const app = express()

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
  app.use(createHttpRequestLogger(logger))

  const operationalMetadata = () => ({
    ...applicationMetadata,
    uptimeSeconds: Math.floor(process.uptime()),
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
    return res.status(200).json({
      success: true,
      status: "ok",
      ...operationalMetadata(),
    })
  })

  app.get("/health/ready", (_req, res) => {
    res.setHeader("cache-control", "no-store")
    const checks = {
      database: database.isReady(),
      rateLimitStore: redis.isReady(),
      media: !env.isProduction || isCloudinaryConfigured(),
    }
    const ready = !isShuttingDown() && Object.values(checks).every(Boolean)
    return res.status(ready ? 200 : 503).json({
      success: ready,
      status: ready ? "ready" : "not_ready",
      checks,
      ...operationalMetadata(),
    })
  })

  app.get("/", (_req, res) =>
    res.json({
      success: true,
      message: "Your server is up and running ...",
    })
  )

  registerRoutes(app)
  app.use(notFoundHandler)
  app.use(errorHandler)

  return app
}

module.exports = { createApp }
