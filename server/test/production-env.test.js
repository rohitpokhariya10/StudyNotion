const assert = require("node:assert/strict")
const { spawnSync } = require("node:child_process")
const path = require("node:path")
const test = require("node:test")

const serverRoot = path.resolve(__dirname, "..")
const validProductionEnv = {
  ...process.env,
  NODE_ENV: "production",
  FRONTEND_ORIGINS: "https://app.studynotion.test",
  APP_URL: "https://app.studynotion.test",
  BRAND_NAME: "StudyNotion",
  BRAND_LOGO_URL: "https://cdn.studynotion.test/logo.png",
  SUPPORT_EMAIL: "support@studynotion.test",
  MONGODB_URI: "mongodb://database.internal/studynotion",
  REDIS_URL: "rediss://default:redis-secret@redis.studynotion.test:6379",
  JWT_SECRET: "jwt-secret-generated-independently-1234567890",
  OTP_SECRET: "otp-secret-generated-independently-0987654321",
  GOOGLE_CLIENT_ID: "123456789-ci.apps.googleusercontent.com",
  RESEND_API_KEY: "re_1234567890abcdef",
  EMAIL_FROM: "StudyNotion <noreply@studynotion.test>",
  EMAIL_REPLY_TO: "support@studynotion.test",
  CONTACT_RECIPIENT: "support@studynotion.test",
  RAZORPAY_KEY_ID: "rzp_live_1234567890",
  RAZORPAY_SECRET: "razorpay-secret-1234567890",
  RAZORPAY_WEBHOOK_SECRET: "webhook-secret-1234567890",
  REFUND_WINDOW_DAYS: "7",
  CLOUD_NAME: "studynotion-production",
  CLOUD_API_KEY: "123456789012345",
  CLOUD_API_SECRET: "cloudinary-secret-1234567890",
  COOKIE_DOMAIN: ".studynotion.test",
  COOKIE_SECURE: "true",
  COOKIE_SAME_SITE: "lax",
  ALLOW_DEV_OTP: "false",
}

const loadEnv = (overrides = {}, script = "require('./config/env')") =>
  spawnSync(process.execPath, ["-e", script], {
    cwd: serverRoot,
    encoding: "utf8",
    env: { ...validProductionEnv, ...overrides },
  })

test("production configuration accepts structurally valid provider settings", () => {
  const result = loadEnv()
  assert.equal(result.status, 0, result.stderr)
})

test("production configuration rejects copied example placeholders", () => {
  const result = loadEnv({ APP_URL: "https://app.example.com" })
  assert.notEqual(result.status, 0)
  assert.match(result.stderr, /placeholder values/)
})

test("production configuration requires independently generated secrets", () => {
  const result = loadEnv({ OTP_SECRET: validProductionEnv.JWT_SECRET })
  assert.notEqual(result.status, 0)
  assert.match(result.stderr, /independently generated/)
})

test("production Redis connections require TLS", () => {
  const result = loadEnv({
    REDIS_URL: "redis://default:redis-secret@redis.studynotion.test:6379",
  })
  assert.notEqual(result.status, 0)
  assert.match(result.stderr, /rediss:\/\/ TLS/)
})

test("APP_URL remains the canonical app when multiple origins are allowed", () => {
  const result = loadEnv(
    {
      FRONTEND_ORIGINS:
        "https://admin.studynotion.test,https://app.studynotion.test",
    },
    "console.log(require('./config/env').appUrl)"
  )
  assert.equal(result.status, 0, result.stderr)
  assert.equal(result.stdout.trim(), "https://app.studynotion.test")
})
