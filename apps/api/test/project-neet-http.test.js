const assert = require("node:assert/strict")
const { randomUUID } = require("node:crypto")
const { after, before, test } = require("node:test")
process.env.NODE_ENV = "test"
process.env.FRONTEND_ORIGINS = "http://localhost:3000"
process.env.MONGODB_URI = "mongodb://127.0.0.1:27029/studynotion_neet_test_http"
process.env.JWT_SECRET = "neet-http-test-signing-secret-1234567890"
process.env.OTP_SECRET = "neet-http-test-independent-secret-1234567890"
process.env.REDIS_URL = ""

const express = require("express")
const {
  createProjectNeetRouter,
  isProjectNeetAttemptPath,
} = require("../modules/project-neet/http/routes")
const {
  createNeetController,
} = require("../modules/project-neet/http/controller")
const {
  createAttemptService,
} = require("../modules/project-neet/services/attemptService")
const { neetErrors } = require("../modules/project-neet/domain/errors")
const {
  resolveProctorPolicy,
  evaluateProctorEvents,
} = require("../modules/project-neet/domain/proctorPolicy")
const { v2ApiLimiter } = require("../app/registerRoutes")
const { auth, isStudent } = require("../middleware/auth")
const limits = require("../middleware/rateLimiters")
const logger = { info() {}, warn() {}, error() {} }
const id = "507f1f77bcf86cd799439011"
let calls = []
const gate = (name) => (req, res, next) => {
  calls.push(name)
  req.user = { id: "student" }
  next()
}
const attempts = createAttemptService({
  attempts: { findOwned: async () => null },
  lifecycle: {},
  clock: () => new Date(),
  logger,
})
const controller = createNeetController({
  logger,
  services: {
    attempts: {
      ...attempts,
      saveResponses: async ({ responses }) => {
        calls.push("save")
        return {
          responses,
          lastSeq: responses[0].seq,
          expiresAt: new Date().toISOString(),
          serverNow: new Date().toISOString(),
        }
      },
    },
    tests: {
      listTests: async () => ({ tests: [] }),
      getTest: async () => {
        throw neetErrors.testNotFound()
      },
    },
    proctor: {},
  },
})
const app = express()
app.use(express.json())
app.use(
  "/api/v2/project-neet",
  createProjectNeetRouter({
    controller,
    gates: {
      attemptGate: [
        gate("ip"),
        gate("auth"),
        gate("role"),
        gate("user"),
        gate("attempt"),
      ],
      registrationGate: [gate("registration")],
    },
  })
)
let server, base
before(async () => {
  server = await new Promise((resolve, reject) => {
    const listener = app.listen(0, "127.0.0.1", (error) =>
      error ? reject(error) : resolve(listener)
    )
    listener.once("error", reject)
  })
  base = `http://127.0.0.1:${server.address().port}/api/v2/project-neet`
})
after(async () => {
  if (server) await new Promise((resolve) => server.close(resolve))
})
const request = async (path, method = "GET", body) => {
  calls = []
  const res = await fetch(`${base}${path}`, {
    method,
    headers: { "content-type": "application/json" },
    ...(body ? { body: JSON.stringify(body) } : {}),
  })
  return { status: res.status, body: await res.json() }
}

test("ownership denial returns 404 for another student's attempt and result", async () => {
  for (const suffix of ["", "/result"]) {
    const response = await request(`/attempts/${id}${suffix}`)
    assert.equal(response.status, 404)
    assert.equal(response.body.error.code, "NEET_ATTEMPT_NOT_FOUND")
    assert.deepEqual(calls, ["ip", "auth", "role", "user", "attempt"])
  }
})
test("strict HTTP schemas reject unknown fields before saving", async () => {
  const response = await request(`/attempts/${id}/responses`, "PUT", {
    sessionId: randomUUID(),
    responses: [],
    answerKey: "A",
  })
  assert.equal(response.status, 400)
  assert.equal(response.body.error.code, "INVALID_BODY")
  assert.ok(!calls.includes("save"))
})
test("answer writes reach the service after the complete limiter and auth chain", async () => {
  const responses = [
    {
      questionId: id,
      selectedOption: "C",
      visited: true,
      markedForReview: false,
      seq: 11,
      timeSpentMs: 0,
    },
  ]
  const response = await request(`/attempts/${id}/responses`, "PUT", {
    sessionId: randomUUID(),
    responses,
  })
  assert.equal(response.status, 200)
  assert.equal(response.body.data.responses[0].seq, 11)
  assert.deepEqual(calls, ["ip", "auth", "role", "user", "attempt", "save"])
})
test("actual attempt middleware authenticates before per-user and per-attempt budgets", () => {
  const router = createProjectNeetRouter({ controller })
  const handlers = router.stack
    .filter((layer) => !layer.route)
    .map((layer) => layer.handle)
  assert.deepEqual(handlers.slice(0, 5), [
    limits.neetAttemptIpLimiter,
    auth,
    isStudent,
    limits.neetAttemptUserLimiter,
    limits.neetAttemptSessionLimiter,
  ])
})
test("only bounded attempt paths bypass the legacy shared-IP limiter", () => {
  assert.equal(isProjectNeetAttemptPath("/project-neet/attempts"), true)
  assert.equal(isProjectNeetAttemptPath(`/PROJECT-NEET/ATTEMPTS/${id}`), true)
  for (const path of [
    "/project-neet/tests",
    "/project-neet/attempts-other",
    "/courses",
  ])
    assert.equal(isProjectNeetAttemptPath(path), false)
  let called = false
  v2ApiLimiter({ path: `/project-neet/attempts/${id}` }, {}, () => {
    called = true
  })
  assert.equal(called, true)
})
test("unknown attempt paths terminate inside the protected module", async () => {
  const response = await request(`/attempts/${id}/not-real`)
  assert.equal(response.status, 404)
  assert.deepEqual(calls, ["ip", "auth", "role", "user", "attempt"])
})
test("camera/audio uncertainty cannot auto-submit even with unsafe stored overrides", () => {
  const policy = resolveProctorPolicy({
    autoSubmit: { enabled: true, softSignalsCanSubmit: true },
    warnings: { maxWarnings: 1, cooldownSeconds: 0 },
    rules: {
      CAMERA_OBSTRUCTION: { counted: true, warnEvery: 1 },
      AUDIO_ACTIVITY: { counted: true, warnEvery: 1 },
    },
  })
  const evaluated = evaluateProctorEvents({
    policy,
    state: {},
    now: new Date(),
    events: Array.from({ length: 20 }, (_, i) => ({
      type: i % 2 ? "CAMERA_OBSTRUCTION" : "AUDIO_ACTIVITY",
    })),
  })
  assert.equal(evaluated.autoSubmit, false)
  assert.equal(evaluated.state.warningCount, 0)
  assert.ok(evaluated.state.softWarningCount > 0)
})
test("hard-signal warnings require repeated evidence and respect cooldown", () => {
  const policy = resolveProctorPolicy()
  const evaluated = evaluateProctorEvents({
    policy,
    state: {},
    now: new Date(),
    events: Array.from({ length: 30 }, () => ({ type: "WINDOW_BLUR" })),
  })
  assert.equal(evaluated.state.warningCount, 1)
  assert.equal(evaluated.autoSubmit, false)
})
