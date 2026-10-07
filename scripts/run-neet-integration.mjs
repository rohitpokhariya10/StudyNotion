import { spawn } from "node:child_process"
import { once } from "node:events"
import { mkdtemp } from "node:fs/promises"
import { createServer } from "node:net"
import { tmpdir } from "node:os"
import { join } from "node:path"

// Own a separate mongod process and empty directory. Never use the developer DB.
const directory = await mkdtemp(join(tmpdir(), "studynotion-neet-mongo-"))
const probe = createServer()
probe.listen(0, "127.0.0.1")
await once(probe, "listening")
const port = probe.address().port
await new Promise((resolve) => probe.close(resolve))
const mongo = spawn(
  process.env.MONGOD_BIN || "mongod",
  [
    "--dbpath",
    directory,
    "--port",
    String(port),
    "--bind_ip",
    "127.0.0.1",
    "--nounixsocket",
  ],
  { stdio: ["ignore", "pipe", "pipe"] }
)
let output = ""
try {
  await new Promise((resolve, reject) => {
    const deadline = setTimeout(
      () =>
        reject(new Error(`Mongo startup timed out: ${output.slice(-2000)}`)),
      20000
    )
    mongo.once("error", reject)
    mongo.once("exit", (code) => {
      clearTimeout(deadline)
      reject(new Error(`Mongo exited ${code}: ${output.slice(-2000)}`))
    })
    const read = (chunk) => {
      output += String(chunk)
      if (String(chunk).includes("Waiting for connections")) {
        clearTimeout(deadline)
        resolve()
      }
    }
    mongo.stdout.on("data", read)
    mongo.stderr.on("data", read)
  })
  const child = spawn(
    process.execPath,
    ["--test", "apps/api/test/project-neet.integration.test.js"],
    {
      stdio: "inherit",
      env: {
        ...process.env,
        STUDYNOTION_RUN_NEET_INTEGRATION: "1",
        NEET_TEST_MONGODB_URI: `mongodb://127.0.0.1:${port}/studynotion_neet_test_${Date.now()}`,
      },
    }
  )
  const [code] = await once(child, "exit")
  process.exitCode = code || 0
} finally {
  const ended = once(mongo, "exit")
  if (mongo.exitCode === null) {
    mongo.kill("SIGTERM")
    await ended
  }
  console.log(`Disposable Mongo stopped. Diagnostic directory: ${directory}`)
}
