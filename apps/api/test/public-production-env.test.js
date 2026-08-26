const assert = require("node:assert/strict")
const { spawnSync } = require("node:child_process")
const fs = require("node:fs")
const path = require("node:path")
const test = require("node:test")

const repositoryRoot = path.resolve(__dirname, "../../..")
const validPublicProductionEnv = {
  ...process.env,
  VITE_DEPLOYMENT_TIER: "production",
  VITE_API_BASE_URL: "https://api.studynotion.test/api/v1",
  VITE_GOOGLE_CLIENT_ID: "123456789-ci.apps.googleusercontent.com",
  VITE_RAZORPAY_KEY_ID: "rzp_live_1234567890",
  VITE_SUPPORT_EMAIL: "support@studynotion.test",
  VITE_LEGAL_ENTITY_NAME: "StudyNotion Private Limited",
  VITE_LEGAL_ADDRESS: "Deployment test office",
  VITE_LEGAL_JURISDICTION: "India",
}

const validatePublicEnv = (overrides = {}) =>
  spawnSync(process.execPath, ["apps/web/scripts/validate-public-env.mjs"], {
    cwd: repositoryRoot,
    encoding: "utf8",
    env: { ...validPublicProductionEnv, ...overrides },
  })

const readExampleEnv = (relativePath) => {
  const contents = fs.readFileSync(
    path.join(repositoryRoot, relativePath),
    "utf8"
  )
  return Object.fromEntries(
    contents
      .split(/\r?\n/)
      .filter((line) => line && !line.startsWith("#"))
      .map((line) => {
        const separator = line.indexOf("=")
        return [line.slice(0, separator), line.slice(separator + 1)]
      })
  )
}

test("public production configuration accepts HTTPS and live provider identifiers", () => {
  const result = validatePublicEnv()
  assert.equal(result.status, 0, result.stderr)
  assert.match(result.stdout, /Public production environment validated/)
})

test("public staging configuration requires a test key and can hide Google sign-in", () => {
  const accepted = validatePublicEnv({
    VITE_DEPLOYMENT_TIER: "staging",
    VITE_GOOGLE_CLIENT_ID: "",
    VITE_RAZORPAY_KEY_ID: "rzp_test_1234567890",
  })
  assert.equal(accepted.status, 0, accepted.stderr)
  assert.match(accepted.stdout, /Public staging environment validated/)

  const liveKey = validatePublicEnv({
    VITE_DEPLOYMENT_TIER: "staging",
    VITE_GOOGLE_CLIENT_ID: "",
    VITE_RAZORPAY_KEY_ID: "rzp_live_1234567890",
  })
  assert.notEqual(liveKey.status, 0)
  assert.match(liveKey.stderr, /rzp_test_.*staging/)
})

test("public production configuration requires Google and a live payment key", () => {
  const missingGoogle = validatePublicEnv({ VITE_GOOGLE_CLIENT_ID: "" })
  assert.notEqual(missingGoogle.status, 0)
  assert.match(missingGoogle.stderr, /VITE_GOOGLE_CLIENT_ID/)

  const testKey = validatePublicEnv({
    VITE_RAZORPAY_KEY_ID: "rzp_test_1234567890",
  })
  assert.notEqual(testKey.status, 0)
  assert.match(testKey.stderr, /rzp_live_.*production/)
})

test("public deployment tier is explicit and enumerated", () => {
  const missing = validatePublicEnv({ VITE_DEPLOYMENT_TIER: "" })
  assert.notEqual(missing.status, 0)
  assert.match(missing.stderr, /VITE_DEPLOYMENT_TIER is required/)

  const invalid = validatePublicEnv({ VITE_DEPLOYMENT_TIER: "preview" })
  assert.notEqual(invalid.status, 0)
  assert.match(
    invalid.stderr,
    /VITE_DEPLOYMENT_TIER must be staging or production/
  )
})

test("public API configuration rejects loopback and development hosts", () => {
  for (const hostname of [
    "localhost",
    "127.0.0.1",
    "host.docker.internal",
    "[::1]",
    "[::ffff:127.0.0.1]",
    "localhost.",
  ]) {
    const result = validatePublicEnv({
      VITE_API_BASE_URL: `https://${hostname}:4000/api/v1`,
    })
    assert.notEqual(result.status, 0)
    assert.match(result.stderr, /loopback or development host/)
  }
})

test("public API configuration requires the canonical /api/v1 path", () => {
  const result = validatePublicEnv({
    VITE_API_BASE_URL: "https://api.studynotion.test/wrong/api/v1",
  })
  assert.notEqual(result.status, 0)
  assert.match(result.stderr, /ending in \/api\/v1/)
})

test("optional staging Google configuration is still validated when supplied", () => {
  const result = validatePublicEnv({
    VITE_DEPLOYMENT_TIER: "staging",
    VITE_GOOGLE_CLIENT_ID: "not-a-google-client",
    VITE_RAZORPAY_KEY_ID: "rzp_test_1234567890",
  })
  assert.notEqual(result.status, 0)
  assert.match(result.stderr, /must be a Google Web Client ID/)
})

test("checked-in staging examples preserve the isolated test-mode contract", () => {
  const publicExample = readExampleEnv("apps/web/.env.staging.example")
  assert.equal(publicExample.VITE_DEPLOYMENT_TIER, "staging")
  assert.match(publicExample.VITE_API_BASE_URL, /^https:\/\//)
  assert.equal(publicExample.VITE_GOOGLE_CLIENT_ID, "")
  assert.match(publicExample.VITE_RAZORPAY_KEY_ID, /^rzp_test_/)

  const serverExample = readExampleEnv("apps/api/.env.staging.example")
  assert.equal(serverExample.NODE_ENV, "production")
  assert.equal(serverExample.DEPLOYMENT_TIER, "staging")
  assert.equal(serverExample.MONGODB_AUTO_INDEX, "false")
  assert.equal(serverExample.COOKIE_SECURE, "true")
  assert.equal(serverExample.GOOGLE_CLIENT_ID, "")
  assert.match(serverExample.RAZORPAY_KEY_ID, /^rzp_test_/)
  assert.match(serverExample.FOLDER_NAME, /staging/i)
  assert.equal(
    Object.keys(serverExample).some((name) =>
      name.startsWith("STUDYNOTION_DEMO_")
    ),
    false
  )
  assert.equal(
    Object.hasOwn(serverExample, "STUDYNOTION_DISPOSABLE_SEED_CONFIRM"),
    false
  )

  const seedExample = readExampleEnv("apps/api/.env.staging.seed.example")
  assert.equal(seedExample.STUDYNOTION_DEMO_SEED_MODE, "staging")
  assert.equal(seedExample.STUDYNOTION_DISPOSABLE_SEED_CONFIRM, "")
  assert.equal(seedExample.STUDYNOTION_DEMO_VIDEO_PUBLIC_ID, "")
  assert.equal(seedExample.STUDYNOTION_DEMO_VIDEO_FORMAT, "mp4")
})
