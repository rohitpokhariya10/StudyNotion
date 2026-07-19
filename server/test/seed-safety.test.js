const assert = require("node:assert/strict")
const path = require("node:path")
const { spawnSync } = require("node:child_process")
const test = require("node:test")

test("demo admin provisioning is disabled in production", () => {
  const serverDirectory = path.resolve(__dirname, "..")
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
