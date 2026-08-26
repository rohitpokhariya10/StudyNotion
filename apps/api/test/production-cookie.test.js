const assert = require("node:assert/strict")
const { spawnSync } = require("node:child_process")
const path = require("node:path")
const test = require("node:test")

const serverRoot = path.resolve(__dirname, "..")
const runtimeEnvironment = {
  ...process.env,
  NODE_ENV: "production",
  DEPLOYMENT_TIER: "production",
  FRONTEND_ORIGINS: "https://app.studynotion.test",
  APP_URL: "https://app.studynotion.test",
  PUBLIC_API_URL: "https://api.studynotion.test",
  BRAND_NAME: "StudyNotion",
  BRAND_LOGO_URL: "https://cdn.studynotion.test/logo.png",
  SUPPORT_EMAIL: "support@studynotion.test",
  MONGODB_URI:
    "mongodb+srv://application:database-secret@database.studynotion.test/studynotion?w=majority",
  REDIS_URL: "rediss://default:fixture-secret@redis.studynotion.test:6379",
  JWT_SECRET: "jwt-secret-generated-independently-1234567890",
  OTP_SECRET: "otp-secret-generated-independently-0987654321",
  GOOGLE_CLIENT_ID: "123456789-cookie.apps.googleusercontent.com",
  RESEND_API_KEY: "re_cookie_contract_123456",
  EMAIL_FROM: "StudyNotion <noreply@studynotion.test>",
  CONTACT_RECIPIENT: "support@studynotion.test",
  RAZORPAY_KEY_ID: "rzp_live_COOKIE123",
  RAZORPAY_SECRET: "razorpay-cookie-secret",
  RAZORPAY_WEBHOOK_SECRET: "razorpay-cookie-webhook-secret",
  REFUND_WINDOW_DAYS: "7",
  ENTITLEMENT_SIDECAR_STARTED_AT: "2026-08-11T12:00:00.000Z",
  CLOUD_NAME: "studynotion-production",
  CLOUD_API_KEY: "123456789012345",
  CLOUD_API_SECRET: "cloudinary-cookie-secret",
  FOLDER_NAME: "studynotion-production",
  MONGODB_AUTO_INDEX: "false",
  TRUST_PROXY: "1",
  COOKIE_NAME: "studynotion_session",
  COOKIE_DOMAIN: "",
  COOKIE_SECURE: "true",
  COOKIE_SAME_SITE: "lax",
  ALLOW_DEV_OTP: "false",
}

test("production session issue and clearing preserve the hardened cookie contract", () => {
  const script = `
    const { issueSession, clearSession } = require('./utils/auth')
    const events = []
    const response = {
      cookie(name, _value, options) { events.push({ action: 'set', name, options }) },
      clearCookie(name, options) { events.push({ action: 'clear', name, options }) },
    }
    issueSession(response, {
      _id: { toString: () => '507f1f77bcf86cd799439011' },
      email: 'student@studynotion.test',
      accountType: 'Student',
      sessionVersion: 0,
    })
    clearSession(response)
    process.stdout.write(JSON.stringify(events))
  `
  const result = spawnSync(process.execPath, ["-e", script], {
    cwd: serverRoot,
    encoding: "utf8",
    env: runtimeEnvironment,
  })

  assert.equal(result.status, 0, result.stderr)
  const events = JSON.parse(result.stdout)
  const issued = events.find(
    ({ action, name }) => action === "set" && name === "studynotion_session"
  )
  assert.deepEqual(issued.options, {
    httpOnly: true,
    maxAge: 12 * 60 * 60 * 1000,
    path: "/",
    sameSite: "lax",
    secure: true,
  })

  const clearedNames = events
    .filter(({ action }) => action === "clear")
    .map(({ name }) => name)
  assert.deepEqual(clearedNames, ["token", "studynotion_session", "token"])
  for (const { action, options } of events) {
    if (action !== "clear") continue
    assert.deepEqual(options, {
      httpOnly: true,
      path: "/",
      sameSite: "lax",
      secure: true,
    })
  }
})
