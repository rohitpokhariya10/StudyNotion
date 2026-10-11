const assert = require("node:assert/strict")
const { after, before, test } = require("node:test")

process.env.NODE_ENV = "test"
process.env.FRONTEND_ORIGINS = "http://localhost:3000"
process.env.MONGODB_URI =
  "mongodb://127.0.0.1:27017/studynotion-neet-resilience"
process.env.JWT_SECRET = "neet-resilience-jwt-secret-1234567890123"
process.env.OTP_SECRET = "neet-resilience-otp-secret-1234567890123"
process.env.REDIS_URL = ""

const express = require("express")
const { rateLimit } = require("express-rate-limit")

const database = require("../config/database")
const redis = require("../config/redis")
const { auth } = require("../middleware/auth")
const rateLimiters = require("../middleware/rateLimiters")
const User = require("../models/User")
const {
  evaluateProctorEvents,
  resolveProctorPolicy,
} = require("../modules/project-neet/domain/proctorPolicy")
const { issueSession } = require("../utils/auth")
const { createPolicyAcceptance } = require("../utils/policyAcceptance")

const { FailOpenStore } = rateLimiters._test

const listen = (app) =>
  new Promise((resolve, reject) => {
    const server = app.listen(0, "127.0.0.1", (error) =>
      error ? reject(error) : resolve(server)
    )
  })

// --- P-1: monitoring flags for human review and never submits -------------

test("policy never submits, even with an unsafe stored override; it flags for review", () => {
  const policy = resolveProctorPolicy({
    autoSubmit: { enabled: true, softSignalsCanSubmit: true },
    warnings: { maxWarnings: 1, cooldownSeconds: 0 },
  })
  assert.deepEqual(policy.autoSubmit, {
    enabled: false,
    softSignalsCanSubmit: false,
  })
  const evaluated = evaluateProctorEvents({
    policy,
    state: {},
    now: new Date(),
    events: Array.from({ length: 6 }, () => ({ type: "TAB_HIDDEN" })),
  })
  assert.equal(evaluated.autoSubmit, false)
  assert.equal(evaluated.flagForReview, true)
  assert.ok(evaluated.state.warningCount > policy.warnings.maxWarnings)
  const last = evaluated.newWarnings.at(-1)
  assert.match(last.message, /flagged for review by a person/)
  assert.doesNotMatch(
    evaluated.newWarnings.map((warning) => warning.message).join(" "),
    /submitted under|submit your attempt automatically|will submit/i
  )
})

test("below the threshold nothing is flagged", () => {
  const evaluated = evaluateProctorEvents({
    policy: resolveProctorPolicy(),
    state: {},
    now: new Date(),
    events: [{ type: "TAB_HIDDEN" }],
  })
  assert.equal(evaluated.flagForReview, false)
})

// --- X-1: exam limiters fail open to a local fallback ---------------------

const brokenStore = () => ({
  prefix: "broken:",
  init() {},
  async increment() {
    throw new Error("Redis is not ready")
  },
  async decrement() {
    throw new Error("Redis is not ready")
  },
  async resetKey() {
    throw new Error("Redis is not ready")
  },
  async get() {
    throw new Error("Redis is not ready")
  },
})

let limiterServer
let limiterBase
before(async () => {
  const app = express()
  app.use(
    "/exam",
    rateLimit({
      windowMs: 60_000,
      limit: 3,
      store: new FailOpenStore({ name: "test-exam", primary: brokenStore() }),
      passOnStoreError: false,
      standardHeaders: "draft-8",
      legacyHeaders: false,
    }),
    (_req, res) => res.json({ ok: true })
  )
  app.use(
    "/login",
    rateLimit({
      windowMs: 60_000,
      limit: 3,
      store: brokenStore(),
      passOnStoreError: false,
    }),
    (_req, res) => res.json({ ok: true })
  )
  app.use((error, _req, res, _next) => res.status(500).json({ error: true }))
  limiterServer = await listen(app)
  limiterBase = `http://127.0.0.1:${limiterServer.address().port}`
})
after(() => new Promise((resolve) => limiterServer.close(resolve)))

test("exam limiters keep serving during a Redis outage and still enforce limits locally", async () => {
  const statuses = []
  for (let index = 0; index < 4; index += 1) {
    statuses.push((await fetch(`${limiterBase}/exam`)).status)
  }
  assert.deepEqual(statuses, [200, 200, 200, 429])
})

test("security limiters remain fail-closed when Redis is down", async () => {
  assert.equal((await fetch(`${limiterBase}/login`)).status, 500)
})

test("NEET per-IP ceiling is a NAT-safe flood guard; per-student budgets unchanged", () => {
  const ipLimit = rateLimiters.neetAttemptIpLimiter
  const userLimit = rateLimiters.neetAttemptUserLimiter
  const attemptLimit = rateLimiters.neetAttemptSessionLimiter
  // express-rate-limit exposes the resolved options on the middleware.
  const limitOf = (middleware) => middleware.options?.limit
  const known = [ipLimit, userLimit, attemptLimit].every(
    (middleware) => typeof limitOf(middleware) === "number"
  )
  if (!known) {
    // Fall back to the source of truth when the library hides options.
    const source = require("node:fs").readFileSync(
      require.resolve("../middleware/rateLimiters"),
      "utf8"
    )
    assert.match(source, /name: "neet-attempt-ip",[\s\S]*?limit: 180_000/)
    assert.match(source, /name: "neet-attempt-user",[\s\S]*?limit: 240,/)
    assert.match(source, /name: "neet-attempt-session",[\s\S]*?limit: 120,/)
    return
  }
  assert.ok(limitOf(ipLimit) >= 180_000)
  assert.equal(limitOf(userLimit), 240)
  assert.equal(limitOf(attemptLimit), 120)
})

// --- X-1: readiness and reconnect -----------------------------------------

test("readiness does not depend on Redis; it still requires the database", async () => {
  const { createApp } = require("../app/createApp")
  const originalDatabase = database.isReady
  const originalRedis = redis.isReady
  const app = createApp({ isShuttingDown: () => false })
  const server = await listen(app)
  const base = `http://127.0.0.1:${server.address().port}`
  try {
    database.isReady = () => true
    redis.isReady = () => false
    const degraded = await fetch(`${base}/health/ready`)
    const body = await degraded.json()
    assert.equal(degraded.status, 200)
    assert.equal(body.checks.rateLimitStore, false)
    database.isReady = () => false
    assert.equal((await fetch(`${base}/health/ready`)).status, 503)
  } finally {
    database.isReady = originalDatabase
    redis.isReady = originalRedis
    await new Promise((resolve) => server.close(resolve))
  }
})

test("Redis reconnect strategy never gives up and stays bounded", () => {
  const redisPackage = require("redis")
  const original = redisPackage.createClient
  let options
  redisPackage.createClient = (value) => {
    options = value
    return { on() {} }
  }
  const previousUrl = process.env.REDIS_URL
  try {
    delete require.cache[require.resolve("../config/redis")]
    delete require.cache[require.resolve("../config/env")]
    process.env.REDIS_URL = "redis://127.0.0.1:6399/15"
    const fresh = require("../config/redis")
    // getClient is internal; isReady() builds nothing, so trigger via connect
    // indirectly by reading the factory through sendCommand's guard.
    void fresh.sendCommand("PING").catch(() => {})
    assert.ok(options, "client options were captured")
    for (const retries of [0, 1, 10, 11, 50, 10_000]) {
      const delay = options.socket.reconnectStrategy(retries)
      assert.equal(typeof delay, "number", `retry ${retries} must reconnect`)
      assert.ok(delay > 0 && delay <= 5_250)
    }
  } finally {
    redisPackage.createClient = original
    process.env.REDIS_URL = previousUrl
    delete require.cache[require.resolve("../config/redis")]
    delete require.cache[require.resolve("../config/env")]
  }
})

// --- T-3: the policy gate lets an in-progress exam continue ----------------

test("a policy-version bump does not block in-progress exam operations", async () => {
  const userId = "507f1f77bcf86cd799439099"
  const stale = {
    _id: userId,
    email: "student@example.test",
    accountType: "Student",
    active: true,
    approved: true,
    sessionVersion: 0,
    deletionPending: false,
    // Accepted an older policy version only.
    policyAcceptances: [
      {
        ...createPolicyAcceptance("test", new Date()),
        termsVersion: "2000-01-01",
      },
    ],
  }
  let token
  issueSession(
    {
      cookie: (_name, value) => {
        token = value
      },
      clearCookie() {},
    },
    stale
  )
  const originalFindById = User.findById
  User.findById = () => ({ select: async () => stale })
  const attempt = "507f1f77bcf86cd799439012"
  const run = (method, path) =>
    new Promise((resolve) => {
      const req = {
        method,
        originalUrl: path,
        cookies: {},
        get: (name) =>
          name.toLowerCase() === "authorization"
            ? `Bearer ${token}`
            : undefined,
      }
      const res = {
        statusCode: 200,
        setHeader() {},
        status(code) {
          this.statusCode = code
          return this
        },
        json() {
          resolve({ status: this.statusCode, req })
        },
      }
      auth(req, res, () => resolve({ status: "next", req }))
    })
  try {
    for (const [method, suffix] of [
      ["PUT", "responses"],
      ["POST", "heartbeat"],
      ["POST", "session"],
      ["POST", "submit"],
      ["POST", "proctor-events"],
    ]) {
      const outcome = await run(
        method,
        `/api/v2/project-neet/attempts/${attempt}/${suffix}`
      )
      assert.equal(outcome.status, "next", `${suffix} must not require 428`)
      assert.ok(outcome.req.sessionExpiresAt instanceof Date)
      assert.equal(outcome.req.sessionVersion, 0)
    }
    for (const [method, path] of [
      ["POST", "/api/v2/project-neet/attempts"],
      ["GET", "/api/v2/project-neet/attempts"],
      ["POST", `/api/v2/project-neet/attempts/${attempt}/ready`],
      ["POST", `/api/v2/project-neet/attempts/${attempt}/start`],
      ["GET", `/api/v2/project-neet/attempts/${attempt}/result`],
      ["GET", "/api/v1/profile/getEnrolledCourses"],
    ]) {
      assert.equal((await run(method, path)).status, 428, path)
    }
  } finally {
    User.findById = originalFindById
  }
})
