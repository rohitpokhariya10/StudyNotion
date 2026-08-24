const assert = require("node:assert/strict")
const test = require("node:test")

const {
  validateRuntimeConfiguration,
  verifyPreflightIndexes,
} = require("../scripts/preflight-production")

test("production preflight validates the complete runtime contract before data checks", () => {
  let loads = 0

  validateRuntimeConfiguration({
    environment: { NODE_ENV: "production" },
    loadConfiguration: () => {
      loads += 1
      return {}
    },
  })

  assert.equal(loads, 1)
})

test("disposable preflight fixtures do not require production provider credentials", () => {
  let loads = 0

  validateRuntimeConfiguration({
    environment: {
      NODE_ENV: "test",
      STUDYNOTION_RUN_PREFLIGHT_INTEGRATION: "1",
    },
    loadConfiguration: () => {
      loads += 1
      return {}
    },
  })

  assert.equal(loads, 0)
})

test("production preflight cannot silently run with an omitted or mistyped runtime", () => {
  for (const environment of [{}, { NODE_ENV: "prod" }, { NODE_ENV: "test" }]) {
    assert.throws(
      () => validateRuntimeConfiguration({ environment }),
      /requires NODE_ENV=production/
    )
  }
})

test("production preflight index verification is read only and reports missing indexes", async () => {
  let createCalls = 0
  const registeredModels = [
    {
      modelName: "User",
      createIndexes: async () => {
        createCalls += 1
      },
      diffIndexes: async () => ({
        toCreate: [{ key: { email: 1 }, unique: true }],
        toDrop: [],
      }),
    },
  ]

  const result = await verifyPreflightIndexes({ registeredModels })

  assert.equal(createCalls, 0)
  assert.equal(result.modelCount, 1)
  assert.equal(result.missingIndexCount, 1)
  assert.deepEqual(result.reports, [
    { modelName: "User", missing: 1, extra: 0 },
  ])
})
