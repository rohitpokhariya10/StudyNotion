const assert = require("node:assert/strict")
const path = require("node:path")
const { spawnSync } = require("node:child_process")
const test = require("node:test")

const {
  assertSafeSeedTarget,
  DISPOSABLE_SEED_CONFIRMATION,
} = require("../utils/seedSafety")

const serverDirectory = path.resolve(__dirname, "..")

test("demo admin provisioning is disabled in production", () => {
  const result = spawnSync(process.execPath, ["seed"], {
    cwd: serverDirectory,
    encoding: "utf8",
    env: {
      ...process.env,
      NODE_ENV: "production",
      MONGODB_URI: "mongodb://127.0.0.1:1/must-not-connect",
    },
    timeout: 5000,
  })

  assert.equal(result.status, 1)
  assert.match(
    `${result.stdout}\n${result.stderr}`,
    /Demo seed data is disabled in production/
  )
  assert.doesNotMatch(`${result.stdout}\n${result.stderr}`, /ECONNREFUSED/)
})

test("normal local MongoDB seed targets remain allowed", () => {
  for (const mongoUrl of [
    "mongodb://localhost:27017/studynotion",
    "mongodb://127.0.0.1:27017/studynotion-local",
    "mongodb://[::1]:27017/studynotion_test",
  ]) {
    assert.equal(
      assertSafeSeedTarget({ mongoUrl, nodeEnv: "development" }),
      mongoUrl
    )
  }
})

test("non-loopback targets are rejected without the exact disposable guard", () => {
  const remoteUrl =
    "mongodb://seed-user:seed-password@database.example.test/studynotion_seed_disposable_ci"

  assert.throws(
    () => assertSafeSeedTarget({ mongoUrl: remoteUrl, nodeEnv: "test" }),
    /exact disposable-seed confirmation/
  )
  assert.throws(
    () =>
      assertSafeSeedTarget({
        disposableConfirmation: DISPOSABLE_SEED_CONFIRMATION,
        mongoUrl: "mongodb://database.example.test/studynotion",
        nodeEnv: "test",
      }),
    /studynotion_seed_disposable_/
  )

  try {
    assertSafeSeedTarget({ mongoUrl: remoteUrl, nodeEnv: "test" })
    assert.fail("unsafe seed target was accepted")
  } catch (error) {
    assert.doesNotMatch(error.message, /seed-user|seed-password/)
  }

  const result = spawnSync(process.execPath, ["seed"], {
    cwd: serverDirectory,
    encoding: "utf8",
    env: {
      ...process.env,
      NODE_ENV: "development",
      MONGODB_URI: remoteUrl,
    },
    timeout: 5000,
  })
  const output = `${result.stdout}\n${result.stderr}`
  assert.equal(result.status, 1)
  assert.match(output, /exact disposable-seed confirmation/)
  assert.doesNotMatch(output, /seed-user|seed-password|ENOTFOUND/)
})

test("an explicitly confirmed disposable database can use a non-loopback host", () => {
  const mongoUrl =
    "mongodb+srv://temporary.example.test/studynotion_seed_disposable_preview_42"

  assert.equal(
    assertSafeSeedTarget({
      disposableConfirmation: DISPOSABLE_SEED_CONFIRMATION,
      mongoUrl,
      nodeEnv: "test",
    }),
    mongoUrl
  )
})

test("malformed and database-less MongoDB targets fail before connecting", () => {
  assert.throws(
    () =>
      assertSafeSeedTarget({ mongoUrl: "not-a-uri", nodeEnv: "development" }),
    /URI is invalid/
  )
  assert.throws(
    () =>
      assertSafeSeedTarget({
        mongoUrl: "mongodb://127.0.0.1:27017/",
        nodeEnv: "development",
      }),
    /must name one non-system MongoDB database/
  )
  assert.throws(
    () =>
      assertSafeSeedTarget({
        mongoUrl: "mongodb://127.0.0.1:27017/admin",
        nodeEnv: "development",
      }),
    /must name one non-system MongoDB database/
  )
})
