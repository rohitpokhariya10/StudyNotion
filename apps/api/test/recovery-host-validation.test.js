const assert = require("node:assert/strict")
const fs = require("node:fs")
const os = require("node:os")
const path = require("node:path")
const test = require("node:test")

const {
  parseEnvironmentFile,
  validateRecoveryHost,
} = require("../../../scripts/validate-recovery-host.cjs")

const validContents = [
  "MONGODB_URI=mongodb+srv://worker:secret@cluster.example.test/studynotion?w=majority",
  "ENTITLEMENT_SIDECAR_STARTED_AT=2026-08-24T00:00:00.000Z",
  "ENTITLEMENT_RECOVERY_CONFIRM=reconcile-entitlements",
  "MONGODB_OPERATION_TIMEOUT_MS=10000",
  "",
].join("\n")

test("recovery host validation accepts only a private least-privilege file", (context) => {
  const root = fs.realpathSync(
    fs.mkdtempSync(path.join(os.tmpdir(), "studynotion-recovery-host-"))
  )
  context.after(() => fs.rmSync(root, { force: true, recursive: true }))
  const environmentFile = path.join(root, "recovery.env")
  const stateDirectory = path.join(root, "state")
  fs.writeFileSync(environmentFile, validContents, { mode: 0o600 })
  fs.mkdirSync(stateDirectory, { mode: 0o700 })

  const result = validateRecoveryHost({
    environment: {
      STUDYNOTION_ENTITLEMENT_RECOVERY_ENV_FILE: environmentFile,
      STUDYNOTION_ENTITLEMENT_RECOVERY_STATE_DIR: stateDirectory,
    },
    expectedStateDirectory: stateDirectory,
    repositoryRoot: path.resolve(__dirname, "../../.."),
  })

  assert.deepEqual(result.variableNames, [
    "ENTITLEMENT_RECOVERY_CONFIRM",
    "ENTITLEMENT_SIDECAR_STARTED_AT",
    "MONGODB_OPERATION_TIMEOUT_MS",
    "MONGODB_URI",
  ])
})

test("recovery host validation rejects provider secrets and permissive files", (context) => {
  assert.throws(
    () =>
      parseEnvironmentFile(`${validContents}RAZORPAY_SECRET=fixture-secret\n`),
    /disallowed variable RAZORPAY_SECRET/
  )

  const root = fs.realpathSync(
    fs.mkdtempSync(path.join(os.tmpdir(), "studynotion-recovery-host-"))
  )
  context.after(() => fs.rmSync(root, { force: true, recursive: true }))
  const environmentFile = path.join(root, "recovery.env")
  const stateDirectory = path.join(root, "state")
  fs.writeFileSync(environmentFile, validContents, { mode: 0o644 })
  fs.mkdirSync(stateDirectory, { mode: 0o700 })

  assert.throws(
    () =>
      validateRecoveryHost({
        environment: {
          STUDYNOTION_ENTITLEMENT_RECOVERY_ENV_FILE: environmentFile,
          STUDYNOTION_ENTITLEMENT_RECOVERY_STATE_DIR: stateDirectory,
        },
        expectedStateDirectory: stateDirectory,
        platform: "linux",
        repositoryRoot: path.resolve(__dirname, "../../.."),
        uid: undefined,
      }),
    /owner-controlled mode 0600/
  )
})

test("recovery host validation mirrors the worker's exact MongoDB deadlines", () => {
  assert.throws(
    () =>
      parseEnvironmentFile(
        validContents.replace(
          "MONGODB_OPERATION_TIMEOUT_MS=10000",
          "MONGODB_OPERATION_TIMEOUT_MS=10001"
        )
      ),
    /MONGODB_OPERATION_TIMEOUT_MS.*10000/
  )
  assert.throws(
    () =>
      parseEnvironmentFile(
        `${validContents}MONGODB_CONNECT_TIMEOUT_MS=60001\n`
      ),
    /MONGODB_CONNECT_TIMEOUT_MS.*60000/
  )
})
