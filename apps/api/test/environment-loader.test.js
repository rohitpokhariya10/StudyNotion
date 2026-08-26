const assert = require("node:assert/strict")
const path = require("node:path")
const test = require("node:test")

const {
  apiEnvironmentPath,
  loadEnvironment,
} = require("../config/loadEnvironment")

test("environment loading uses the API-owned environment file", () => {
  assert.equal(apiEnvironmentPath, path.resolve(__dirname, "../.env"))
})

test("environment loading delegates one quiet load without inspecting values", () => {
  const calls = []
  const result = loadEnvironment({
    configure(options) {
      calls.push(options)
      return { parsed: {} }
    },
  })

  assert.deepEqual(calls, [{ path: apiEnvironmentPath, quiet: true }])
  assert.deepEqual(result, { parsed: {} })
})

test("importing operational modules does not load a repository environment", () => {
  const loaderPath = require.resolve("../config/loadEnvironment")
  const loaderModule = require.cache[loaderPath]
  const originalLoadEnvironment = loaderModule.exports.loadEnvironment
  const operationalModules = [
    "../scripts/create-indexes",
    "../scripts/preflight-production",
  ]
  let loadCount = 0

  try {
    loaderModule.exports.loadEnvironment = () => {
      loadCount += 1
    }
    for (const modulePath of operationalModules) {
      delete require.cache[require.resolve(modulePath)]
      require(modulePath)
    }
  } finally {
    loaderModule.exports.loadEnvironment = originalLoadEnvironment
    for (const modulePath of operationalModules) {
      delete require.cache[require.resolve(modulePath)]
    }
  }

  assert.equal(loadCount, 0)
})

test("operational CLI entry points load runtime logging after their environment", async () => {
  for (const modulePath of [
    "../scripts/create-indexes",
    "../scripts/preflight-production",
  ]) {
    const { startCli } = require(modulePath)
    const calls = []
    const environment = {}
    const targetLogger = Object.freeze({ error() {} })

    await startCli({
      environment,
      loadRuntimeEnvironment: () => {
        environment.NODE_ENV = "production"
        environment.LOG_LEVEL = "warn"
        calls.push("environment")
      },
      createTargetLogger: ({ environment: loadedEnvironment }) => {
        calls.push(
          `logger:${loadedEnvironment.NODE_ENV}:${loadedEnvironment.LOG_LEVEL}`
        )
        return targetLogger
      },
      runMain: async (runtime) => {
        assert.equal(runtime.targetLogger, targetLogger)
        if (modulePath.endsWith("preflight-production")) {
          assert.equal(runtime.lifecycleLogger, targetLogger)
        }
        calls.push("main")
      },
    })

    assert.deepEqual(calls, ["environment", "logger:production:warn", "main"])
  }
})
