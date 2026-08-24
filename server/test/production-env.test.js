const assert = require("node:assert/strict")
const { spawnSync } = require("node:child_process")
const path = require("node:path")
const test = require("node:test")

const serverRoot = path.resolve(__dirname, "..")
const validProductionEnv = {
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
  ENTITLEMENT_SIDECAR_STARTED_AT: "2026-08-11T12:00:00.000Z",
  CLOUD_NAME: "studynotion-production",
  CLOUD_API_KEY: "123456789012345",
  CLOUD_API_SECRET: "cloudinary-secret-1234567890",
  FOLDER_NAME: "studynotion-production",
  MONGODB_AUTO_INDEX: "false",
  TRUST_PROXY: "1",
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

test("runtime mode rejects NODE_ENV typos instead of disabling production safeguards", () => {
  for (const value of ["prod", " production ", ""]) {
    const result = loadEnv({ NODE_ENV: value })
    assert.notEqual(result.status, 0)
    assert.match(
      result.stderr,
      /NODE_ENV must be development, test, or production/
    )
  }
})

test("production runtimes require an explicit deployment tier", () => {
  const missing = loadEnv({ DEPLOYMENT_TIER: "" })
  assert.notEqual(missing.status, 0)
  assert.match(missing.stderr, /DEPLOYMENT_TIER is required/)

  const invalid = loadEnv({ DEPLOYMENT_TIER: "preview" })
  assert.notEqual(invalid.status, 0)
  assert.match(invalid.stderr, /DEPLOYMENT_TIER must be staging or production/)

  const developmentRuntime = loadEnv({
    NODE_ENV: "development",
    DEPLOYMENT_TIER: "staging",
  })
  assert.notEqual(developmentRuntime.status, 0)
  assert.match(developmentRuntime.stderr, /requires NODE_ENV=production/)
})

test("staging requires Razorpay test mode and may disable Google sign-in", () => {
  const accepted = loadEnv({
    DEPLOYMENT_TIER: "staging",
    GOOGLE_CLIENT_ID: "",
    RAZORPAY_KEY_ID: "rzp_test_1234567890",
  })
  assert.equal(accepted.status, 0, accepted.stderr)

  const liveKey = loadEnv({
    DEPLOYMENT_TIER: "staging",
    GOOGLE_CLIENT_ID: "",
    RAZORPAY_KEY_ID: "rzp_live_1234567890",
  })
  assert.notEqual(liveKey.status, 0)
  assert.match(liveKey.stderr, /rzp_test_.*staging/)
})

test("production requires matching live Razorpay and Google identifiers", () => {
  const testKey = loadEnv({ RAZORPAY_KEY_ID: "rzp_test_1234567890" })
  assert.notEqual(testKey.status, 0)
  assert.match(testKey.stderr, /rzp_live_.*production/)

  const missingGoogle = loadEnv({ GOOGLE_CLIENT_ID: "" })
  assert.notEqual(missingGoogle.status, 0)
  assert.match(missingGoogle.stderr, /GOOGLE_CLIENT_ID/)

  const sharedSecret = loadEnv({
    RAZORPAY_WEBHOOK_SECRET: validProductionEnv.RAZORPAY_SECRET,
  })
  assert.notEqual(sharedSecret.status, 0)
  assert.match(sharedSecret.stderr, /must be independent/)
})

test("production configuration rejects copied example placeholders", () => {
  const result = loadEnv({ APP_URL: "https://app.example.com" })
  assert.notEqual(result.status, 0)
  assert.match(result.stderr, /placeholder values/)
})

test("production public origins reject loopback and development hosts", () => {
  for (const origin of [
    "https://localhost",
    "https://127.0.0.1",
    "https://host.docker.internal",
    "https://[::ffff:127.0.0.1]",
    "https://localhost.",
  ]) {
    const result = loadEnv({ APP_URL: origin, FRONTEND_ORIGINS: origin })
    assert.notEqual(result.status, 0)
    assert.match(result.stderr, /loopback or development host/)
  }
})

test("frontend-origin validation never prints credential-bearing input", () => {
  const sentinel = "SHOULD_NOT_LEAK"
  const result = loadEnv({
    FRONTEND_ORIGINS: `https://operator:${sentinel}@admin.studynotion.test`,
  })

  assert.notEqual(result.status, 0)
  assert.match(result.stderr, /must not contain paths or credentials/)
  assert.doesNotMatch(result.stderr, /operator/)
  assert.doesNotMatch(result.stderr, new RegExp(sentinel))
})

test("production configuration requires independently generated secrets", () => {
  const result = loadEnv({ OTP_SECRET: validProductionEnv.JWT_SECRET })
  assert.notEqual(result.status, 0)
  assert.match(result.stderr, /independently generated/)
})

test("production configuration requires an immutable Entitlement rollout boundary", () => {
  const missing = loadEnv({ ENTITLEMENT_SIDECAR_STARTED_AT: "" })
  assert.notEqual(missing.status, 0)
  assert.match(missing.stderr, /ENTITLEMENT_SIDECAR_STARTED_AT/)

  const malformed = loadEnv({
    ENTITLEMENT_SIDECAR_STARTED_AT: "2026-08-11T12:00:00Z",
  })
  assert.notEqual(malformed.status, 0)
  assert.match(malformed.stderr, /exact UTC ISO timestamp/)

  const future = loadEnv({
    ENTITLEMENT_SIDECAR_STARTED_AT: "2999-01-01T00:00:00.000Z",
  })
  assert.notEqual(future.status, 0)
  assert.match(future.stderr, /cannot be in the future/)
})

test("production Redis connections require TLS", () => {
  const result = loadEnv({
    REDIS_URL: "redis://default:redis-secret@redis.studynotion.test:6379",
  })
  assert.notEqual(result.status, 0)
  assert.match(result.stderr, /rediss:\/\/ TLS/)
})

test("production Redis URLs reject ambiguous query parameters and fragments", () => {
  for (const suffix of ["?tls=false", "#tls=false"]) {
    const result = loadEnv({
      REDIS_URL: `${validProductionEnv.REDIS_URL}${suffix}`,
    })
    assert.notEqual(result.status, 0)
    assert.match(result.stderr, /query parameters or fragments/)
  }
})

test("production data services require authentication, TLS, and non-loopback hosts", () => {
  for (const mongoUrl of [
    "mongodb+srv://database.studynotion.test/studynotion",
    "mongodb://application:secret@database.studynotion.test/studynotion",
    "mongodb://application:secret@127.0.0.1/studynotion?tls=true&w=majority",
    "mongodb+srv://application:secret@localhost./studynotion?w=majority",
  ]) {
    const result = loadEnv({ MONGODB_URI: mongoUrl })
    assert.notEqual(result.status, 0)
    assert.match(result.stderr, /MONGODB_URI/)
  }

  const redisWithoutAuthentication = loadEnv({
    REDIS_URL: "rediss://redis.studynotion.test:6379",
  })
  assert.notEqual(redisWithoutAuthentication.status, 0)
  assert.match(redisWithoutAuthentication.stderr, /include authentication/)

  const trailingDotRedis = loadEnv({
    REDIS_URL: "rediss://default:redis-secret@localhost.:6379",
  })
  assert.notEqual(trailingDotRedis.status, 0)
  assert.match(trailingDotRedis.stderr, /loopback or development host/)
})

test("production trust proxy accepts only bounded hop counts", () => {
  for (const trustProxy of [
    "false",
    "0",
    "true",
    "loopback",
    "0.0.0.0/1,128.0.0.0/1",
    "11",
  ]) {
    const result = loadEnv({ TRUST_PROXY: trustProxy })
    assert.notEqual(result.status, 0)
    assert.match(result.stderr, /TRUST_PROXY/)
  }

  for (const trustProxy of ["1", "10"]) {
    const result = loadEnv({ TRUST_PROXY: trustProxy })
    assert.equal(result.status, 0, result.stderr)
  }
})

test("production network, cookie, and index posture must be explicit", () => {
  for (const name of [
    "TRUST_PROXY",
    "COOKIE_SAME_SITE",
    "COOKIE_SECURE",
    "MONGODB_AUTO_INDEX",
  ]) {
    const result = loadEnv({ [name]: "" })
    assert.notEqual(result.status, 0)
    assert.match(result.stderr, new RegExp(name))
  }
})

test("production cookies require valid names, domains, and secure delivery", () => {
  const invalidName = loadEnv({ COOKIE_NAME: "bad cookie" })
  assert.notEqual(invalidName.status, 0)
  assert.match(invalidName.stderr, /valid HTTP cookie name/)

  const invalidDomain = loadEnv({ COOKIE_DOMAIN: "bad domain" })
  assert.notEqual(invalidDomain.status, 0)
  assert.match(invalidDomain.stderr, /valid DNS domain/)

  for (const publicSuffix of ["com", "co.uk"]) {
    const result = loadEnv({
      APP_URL: `https://app.${publicSuffix}`,
      FRONTEND_ORIGINS: `https://app.${publicSuffix}`,
      PUBLIC_API_URL: `https://app.${publicSuffix}`,
      COOKIE_DOMAIN: publicSuffix,
    })
    assert.notEqual(result.status, 0)
    assert.match(result.stderr, /must not be a public suffix/)
  }

  const unrelatedDomain = loadEnv({ COOKIE_DOMAIN: ".unrelated.test" })
  assert.notEqual(unrelatedDomain.status, 0)
  assert.match(
    unrelatedDomain.stderr,
    /parent of both APP_URL and PUBLIC_API_URL/
  )

  const frontendOnlyDomain = loadEnv({ COOKIE_DOMAIN: ".app.studynotion.test" })
  assert.notEqual(frontendOnlyDomain.status, 0)
  assert.match(
    frontendOnlyDomain.stderr,
    /parent of both APP_URL and PUBLIC_API_URL/
  )

  const insecure = loadEnv({ COOKIE_SECURE: "false" })
  assert.notEqual(insecure.status, 0)
  assert.match(insecure.stderr, /COOKIE_SECURE must be true/)

  const hostPrefixWithDomain = loadEnv({
    COOKIE_DOMAIN: ".studynotion.test",
    COOKIE_NAME: "__Host-studynotion_session",
  })
  assert.notEqual(hostPrefixWithDomain.status, 0)
  assert.match(hostPrefixWithDomain.stderr, /cannot set COOKIE_DOMAIN/)

  const insecureHostPrefix = loadEnv({
    NODE_ENV: "development",
    DEPLOYMENT_TIER: "",
    APP_URL: "http://localhost:3000",
    FRONTEND_ORIGINS: "http://localhost:3000",
    COOKIE_DOMAIN: "",
    COOKIE_NAME: "__Host-studynotion_session",
    COOKIE_SECURE: "false",
  })
  assert.notEqual(insecureHostPrefix.status, 0)
  assert.match(insecureHostPrefix.stderr, /Prefixed cookies require/)
})

test("production refuses automatic indexes and invalid shared media folders", () => {
  const automaticIndexes = loadEnv({ MONGODB_AUTO_INDEX: "true" })
  assert.notEqual(automaticIndexes.status, 0)
  assert.match(automaticIndexes.stderr, /MONGODB_AUTO_INDEX must be false/)

  const invalidFolder = loadEnv({ FOLDER_NAME: "../shared media" })
  assert.notEqual(invalidFolder.status, 0)
  assert.match(invalidFolder.stderr, /valid isolated media folder/)
})

test("configuration rejects unsupported structured log levels", () => {
  const result = loadEnv({ LOG_LEVEL: "verbose" })
  assert.notEqual(result.status, 0)
  assert.match(result.stderr, /LOG_LEVEL must be debug, info, warn, or error/)
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

test("production rejects cross-site API and secondary frontend origins", () => {
  const crossSiteApi = loadEnv({
    COOKIE_SAME_SITE: "none",
    PUBLIC_API_URL: "https://api.other.test",
  })
  assert.notEqual(crossSiteApi.status, 0)
  assert.match(crossSiteApi.stderr, /must share one registrable site/)

  const crossSiteSecondaryOrigin = loadEnv({
    COOKIE_SAME_SITE: "none",
    FRONTEND_ORIGINS: "https://app.studynotion.test,https://admin.other.test",
  })
  assert.notEqual(crossSiteSecondaryOrigin.status, 0)
  assert.match(
    crossSiteSecondaryOrigin.stderr,
    /must share one registrable site/
  )
})
