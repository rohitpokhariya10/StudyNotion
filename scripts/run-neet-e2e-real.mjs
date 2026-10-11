import { spawn } from "node:child_process"
import { once } from "node:events"

import { startNeetStack } from "./lib/neetStack.mjs"

// Boots a disposable real stack, runs the no-interception NEET browser suite
// against it, and tears everything down.
const stack = await startNeetStack({ students: 6, web: true })
let code = 1
try {
  const child = spawn(
    process.execPath,
    [
      "node_modules/@playwright/test/cli.js",
      "test",
      "--config",
      "playwright.neet-real.config.mjs",
      ...process.argv.slice(2),
    ],
    {
      stdio: "inherit",
      env: {
        ...process.env,
        NEET_REAL_WEB_BASE: stack.webBase,
        NEET_REAL_API_BASE: stack.apiBase,
        NEET_REAL_MONGODB_URI: stack.mongoUri,
        NEET_REAL_PASSWORD: stack.password,
        NEET_REAL_SEED: JSON.stringify(stack.seed),
      },
    }
  )
  ;[code] = await once(child, "exit")
} finally {
  await stack.stop()
}
process.exitCode = code || 0
