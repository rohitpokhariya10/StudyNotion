const assert = require("node:assert/strict")
const { spawnSync } = require("node:child_process")
const path = require("node:path")
const test = require("node:test")

const repositoryRoot = path.resolve(__dirname, "../../..")
const validEnvironment = {
  ...process.env,
  APP_URL: "https://app.studynotion.test",
  COOKIE_SAME_SITE: "lax",
  DEPLOYMENT_TIER: "staging",
  FRONTEND_ORIGINS: "https://app.studynotion.test",
  GOOGLE_CLIENT_ID: "",
  PUBLIC_API_URL: "https://app.studynotion.test",
  RAZORPAY_KEY_ID: "rzp_test_1234567890",
  SUPPORT_EMAIL: "support@studynotion.test",
  VITE_API_BASE_URL: "/api/v1",
  VITE_DEPLOYMENT_TIER: "staging",
  VITE_GOOGLE_CLIENT_ID: "",
  VITE_RAZORPAY_KEY_ID: "rzp_test_1234567890",
  VITE_SUPPORT_EMAIL: "support@studynotion.test",
}

const validatePair = (overrides = {}) =>
  spawnSync(process.execPath, ["scripts/validate-release-pair.mjs"], {
    cwd: repositoryRoot,
    encoding: "utf8",
    env: { ...validEnvironment, ...overrides },
  })

test("release pair accepts the matching same-origin staging contract", () => {
  const result = validatePair()
  assert.equal(result.status, 0, result.stderr)
  assert.match(result.stdout, /Release pair validated for staging/)
})

test("release pair preserves the supported separate-origin contract", () => {
  const result = validatePair({
    PUBLIC_API_URL: "https://api.studynotion.test",
    VITE_API_BASE_URL: "https://api.studynotion.test/api/v1",
  })
  assert.equal(result.status, 0, result.stderr)
})

test("release pair rejects tier, API origin, and public provider drift", () => {
  const cases = [
    [{ VITE_DEPLOYMENT_TIER: "production" }, /DEPLOYMENT_TIER/],
    [
      { VITE_API_BASE_URL: "https://other.studynotion.test/api/v1" },
      /PUBLIC_API_URL/,
    ],
    [{ VITE_RAZORPAY_KEY_ID: "rzp_test_different" }, /RAZORPAY_KEY_ID/],
    [{ VITE_SUPPORT_EMAIL: "other@studynotion.test" }, /SUPPORT_EMAIL/],
  ]

  for (const [overrides, message] of cases) {
    const result = validatePair(overrides)
    assert.notEqual(result.status, 0)
    assert.match(result.stderr, message)
  }
})

test("release pair independently enforces tier-specific provider contracts", () => {
  const invalidTier = validatePair({
    DEPLOYMENT_TIER: "preview",
    VITE_DEPLOYMENT_TIER: "preview",
  })
  assert.notEqual(invalidTier.status, 0)
  assert.match(invalidTier.stderr, /must be staging or production/)

  const stagingLiveKey = validatePair({
    RAZORPAY_KEY_ID: "rzp_live_1234567890",
    VITE_RAZORPAY_KEY_ID: "rzp_live_1234567890",
  })
  assert.notEqual(stagingLiveKey.status, 0)
  assert.match(stagingLiveKey.stderr, /rzp_test_/)

  const productionTestKey = validatePair({
    DEPLOYMENT_TIER: "production",
    GOOGLE_CLIENT_ID: "123-ci.apps.googleusercontent.com",
    VITE_DEPLOYMENT_TIER: "production",
    VITE_GOOGLE_CLIENT_ID: "123-ci.apps.googleusercontent.com",
    RAZORPAY_KEY_ID: "rzp_test_1234567890",
    VITE_RAZORPAY_KEY_ID: "rzp_test_1234567890",
  })
  assert.notEqual(productionTestKey.status, 0)
  assert.match(productionTestKey.stderr, /rzp_live_/)

  const invalidGoogle = validatePair({
    GOOGLE_CLIENT_ID: "not-a-google-client",
    VITE_GOOGLE_CLIENT_ID: "not-a-google-client",
  })
  assert.notEqual(invalidGoogle.status, 0)
  assert.match(invalidGoogle.stderr, /Google Web Client IDs/)
})

test("release pair requires Google to be disabled or identical on both sides", () => {
  const oneSided = validatePair({
    VITE_GOOGLE_CLIENT_ID: "123-ci.apps.googleusercontent.com",
  })
  assert.notEqual(oneSided.status, 0)
  assert.match(oneSided.stderr, /both be omitted or exactly match/)

  const matching = validatePair({
    GOOGLE_CLIENT_ID: "123-ci.apps.googleusercontent.com",
    VITE_GOOGLE_CLIENT_ID: "123-ci.apps.googleusercontent.com",
  })
  assert.equal(matching.status, 0, matching.stderr)
})

test("release pair rejects every cookie policy across registrable sites", () => {
  for (const value of ["lax", "strict", "none"]) {
    const result = validatePair({
      COOKIE_SAME_SITE: value,
      PUBLIC_API_URL: "https://api.other.test",
      VITE_API_BASE_URL: "https://api.other.test/api/v1",
    })
    assert.notEqual(result.status, 0)
    assert.match(result.stderr, /must share one registrable site/)
  }
})

test("release pair rejects non-canonical API paths and cross-site secondary origins", () => {
  const wrongPath = validatePair({
    PUBLIC_API_URL: "https://api.studynotion.test",
    VITE_API_BASE_URL: "https://api.studynotion.test/wrong/api/v1",
  })
  assert.notEqual(wrongPath.status, 0)
  assert.match(wrongPath.stderr, /canonical HTTPS \/api\/v1/)

  const crossSiteOrigin = validatePair({
    FRONTEND_ORIGINS: "https://app.studynotion.test,https://admin.other.test",
  })
  assert.notEqual(crossSiteOrigin.status, 0)
  assert.match(crossSiteOrigin.stderr, /must share one registrable site/)
})
