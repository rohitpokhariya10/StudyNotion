import { spawn } from "node:child_process"
import { randomBytes } from "node:crypto"
import { once } from "node:events"
import { fileURLToPath } from "node:url"

import { freePort, startDisposableMongo } from "./disposableMongo.mjs"

// A complete, disposable NEET stack for real end-to-end and smoke runs:
// single-node replica-set Mongo, seeded sample mocks and students, the real
// API process (no Redis: per-process limits), and optionally a real web
// build served by `vite preview`. Nothing is intercepted or mocked, and no
// developer database or external provider is used.

const root = fileURLToPath(new URL("../..", import.meta.url))
const npm = process.platform === "win32" ? "npm.cmd" : "npm"

const run = (command, args, env, { capture = false } = {}) =>
  new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: root,
      env,
      stdio: ["ignore", capture ? "pipe" : "inherit", "pipe"],
    })
    let stdout = ""
    let stderr = ""
    child.stdout?.on("data", (chunk) => {
      stdout += chunk
    })
    child.stderr.on("data", (chunk) => {
      stderr += chunk
    })
    child.once("error", reject)
    child.once("exit", (code) =>
      code === 0
        ? resolve(stdout)
        : reject(
            new Error(
              `${args.join(" ")} exited ${code}: ${stderr.slice(-1500)}`
            )
          )
    )
  })

const waitForHttp = async (url, timeoutMs) => {
  const deadline = Date.now() + timeoutMs
  for (;;) {
    try {
      const response = await fetch(url)
      if (response.ok) return
    } catch {
      // not up yet
    }
    if (Date.now() > deadline) throw new Error(`Timed out waiting for ${url}`)
    await new Promise((resolve) => setTimeout(resolve, 250))
  }
}

const startProcess = (command, args, env, label) => {
  const child = spawn(command, args, {
    cwd: root,
    env,
    stdio: ["ignore", "pipe", "pipe"],
  })
  let tail = ""
  const keep = (chunk) => {
    tail = (tail + chunk).slice(-4000)
  }
  child.stdout.on("data", keep)
  child.stderr.on("data", keep)
  return {
    child,
    label,
    tail: () => tail,
    async stop() {
      if (child.exitCode !== null) return
      const ended = once(child, "exit")
      child.kill("SIGTERM")
      await Promise.race([
        ended,
        new Promise((resolve) => setTimeout(resolve, 8000)),
      ])
      if (child.exitCode === null) child.kill("SIGKILL")
    },
  }
}

// CI runners have no mongod binary, so CI starts a single-node replica set in
// Docker and passes NEET_STACK_MONGODB_HOST (loopback only). Each run still
// uses a fresh studynotion_neet_e2e_* database, which the seed enforces.
const externalMongo = (host) => {
  const url = new URL(`mongodb://${host}`)
  if (!["127.0.0.1", "localhost"].includes(url.hostname) || !url.port) {
    throw new Error("NEET_STACK_MONGODB_HOST must be a loopback host:port")
  }
  return { port: Number(url.port), stop: async () => {} }
}

export const startNeetStack = async ({ students = 1, web = false } = {}) => {
  const mongo = process.env.NEET_STACK_MONGODB_HOST
    ? externalMongo(process.env.NEET_STACK_MONGODB_HOST)
    : await startDisposableMongo({ replicaSet: "neet-e2e" })
  const processes = []
  const stop = async () => {
    for (const item of processes.reverse()) await item.stop()
    await mongo.stop()
  }
  try {
    const apiPort = await freePort()
    const webPort = web ? await freePort() : null
    const webOrigin = `http://127.0.0.1:${webPort || 3999}`
    const database = `studynotion_neet_e2e_${Date.now()}`
    const secrets = {
      JWT_SECRET: randomBytes(32).toString("hex"),
      OTP_SECRET: randomBytes(32).toString("hex"),
    }
    const password = `Neet-${randomBytes(8).toString("hex")}`
    // Every setting that matters is explicit; dotenv never overrides them.
    const apiEnv = {
      ...process.env,
      NODE_ENV: "development",
      LOG_LEVEL: "warn",
      PORT: String(apiPort),
      MONGODB_URI: `mongodb://127.0.0.1:${mongo.port}/${database}`,
      REDIS_URL: "",
      FRONTEND_ORIGINS: webOrigin,
      COOKIE_SECURE: "false",
      ...secrets,
    }

    const seedOutput = await run(
      process.execPath,
      ["scripts/neet-e2e-seed.cjs"],
      {
        ...apiEnv,
        NEET_E2E_STUDENTS: String(students),
        NEET_E2E_PASSWORD: password,
      },
      { capture: true }
    )
    const seed = JSON.parse(seedOutput.trim().split("\n").at(-1))

    const api = startProcess(
      process.execPath,
      ["apps/api/index.js"],
      apiEnv,
      "api"
    )
    processes.push(api)
    await waitForHttp(`http://127.0.0.1:${apiPort}/health/ready`, 30000).catch(
      (error) => {
        throw new Error(`${error.message}\n${api.tail()}`)
      }
    )

    if (web) {
      await run(npm, ["run", "build:local"], {
        ...process.env,
        VITE_API_BASE_URL: `http://127.0.0.1:${apiPort}/api/v1`,
      })
      const preview = startProcess(
        npm,
        [
          "run",
          "preview",
          "--workspace",
          "studynotion-web",
          "--",
          "--host",
          "127.0.0.1",
          "--port",
          String(webPort),
          "--strictPort",
        ],
        process.env,
        "web"
      )
      processes.push(preview)
      await waitForHttp(webOrigin, 60000)
    }

    return {
      apiBase: `http://127.0.0.1:${apiPort}`,
      webBase: web ? webOrigin : null,
      mongoUri: apiEnv.MONGODB_URI,
      password,
      secrets,
      seed,
      stop,
    }
  } catch (error) {
    await stop().catch(() => {})
    throw error
  }
}
