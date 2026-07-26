const cookieParser = require("cookie-parser")
const express = require("express")

const env = require("../config/env")
// Keep legacy handlers and routers eager during this seam extraction. Deferring
// them would change initialization side effects and hide startup-time failures.
const { razorpayWebhook } = require("../controllers/payments")
const { apiLimiter, webhookLimiter } = require("../middleware/rateLimiters")
const { requireTrustedBrowserOrigin } = require("../middleware/trustedOrigin")
const adminRoutes = require("../routes/Admin")
const catalogV2Routes = require("../routes/CatalogV2")
const contactUsRoutes = require("../routes/Contact")
const courseRoutes = require("../routes/Course")
const paymentRoutes = require("../routes/Payments")
const profileRoutes = require("../routes/profile")
const userRoutes = require("../routes/user")
const { normalizeV2ErrorEnvelope } = require("../shared/http/v2ErrorEnvelope")

// This order is a security and compatibility contract. In particular, the
// signed webhook receives raw bytes before the shared JSON parser, and v2
// response normalization wraps the existing singleton API limiter.
const registerRoutes = (app) => {
  app.post(
    "/api/v1/payment/webhook",
    webhookLimiter,
    express.raw({ type: "application/json", limit: "256kb" }),
    razorpayWebhook
  )

  app.use("/api/v1", apiLimiter)
  app.use("/api/v2", normalizeV2ErrorEnvelope, apiLimiter)

  app.use(express.json({ limit: env.jsonBodyLimit, strict: true }))
  app.use(
    express.urlencoded({
      extended: false,
      limit: env.formBodyLimit,
      parameterLimit: 100,
    })
  )
  app.use(cookieParser())
  app.use("/api/v1", requireTrustedBrowserOrigin)
  app.use("/api/v2", requireTrustedBrowserOrigin)

  app.use("/api/v2", catalogV2Routes)
  app.use("/api/v1/auth", userRoutes)
  app.use("/api/v1/admin", adminRoutes)
  app.use("/api/v1/profile", profileRoutes)
  app.use("/api/v1/course", courseRoutes)
  app.use("/api/v1/payment", paymentRoutes)
  app.use("/api/v1/reach", contactUsRoutes)
}

module.exports = { registerRoutes }
