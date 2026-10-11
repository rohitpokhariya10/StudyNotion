import { spawn } from "node:child_process"
import { once } from "node:events"

import { startDisposableMongo } from "./lib/disposableMongo.mjs"

// Runs the NEET real-Mongo integration suite against its own disposable
// single-node replica set. Never uses the developer database.
const mongo = await startDisposableMongo({ replicaSet: "neet-integration" })
let code = 1
try {
  const child = spawn(
    process.execPath,
    ["--test", "apps/api/test/project-neet.integration.test.js"],
    {
      stdio: "inherit",
      env: {
        ...process.env,
        STUDYNOTION_RUN_NEET_INTEGRATION: "1",
        NEET_TEST_MONGODB_URI: mongo.uri(`studynotion_neet_test_${Date.now()}`),
      },
    }
  )
  ;[code] = await once(child, "exit")
} finally {
  await mongo.stop({ keepDirectory: code !== 0 })
  console.log(
    code === 0
      ? "Disposable Mongo replica set stopped and removed."
      : `Disposable Mongo stopped. Diagnostic directory: ${mongo.directory}`
  )
}
process.exitCode = code || 0
