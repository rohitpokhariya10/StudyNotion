const assert = require("node:assert/strict")
const test = require("node:test")

process.env.NODE_ENV = "test"
process.env.FRONTEND_URL = "http://localhost:3000"
process.env.MONGODB_URL = "mongodb://127.0.0.1:27017/studynotion-contract"
process.env.JWT_SECRET = "session-jwt-secret-123456789012345678901"
process.env.OTP_SECRET = "session-otp-secret-123456789012345678901"
process.env.COOKIE_NAME = "studynotion_session"

const currentUser = {
  _id: { toString: () => "64b000000000000000000003" },
  email: "student@example.com",
  accountType: "Student",
  active: true,
  approved: true,
  sessionVersion: 4,
  policyAcceptances: [
    {
      acceptedAt: new Date(),
      eligibilityConfirmedAt: new Date(),
      privacyNoticeVersion: "2026-07-18",
      source: "email_signup",
      termsVersion: "2026-07-18",
    },
  ],
}

const User = {
  db: {
    base: {
      isValidObjectId: (value) => /^[a-f0-9]{24}$/i.test(value),
    },
  },
  findById: () => ({
    select: async () => currentUser,
  }),
}

const userPath = require.resolve("../models/User")
require.cache[userPath] = {
  id: userPath,
  filename: userPath,
  loaded: true,
  exports: User,
}

const { auth } = require("../middleware/auth")
const { clearSession, issueSession, verifySessionToken } = require("../utils/auth")

const createResponse = () => ({
  statusCode: 200,
  body: undefined,
  cookies: [],
  clearedCookies: [],
  headers: {},
  cookie(name, value, options) {
    this.cookies.push({ name, value, options })
    return this
  },
  clearCookie(name, options) {
    this.clearedCookies.push({ name, options })
    return this
  },
  setHeader(name, value) {
    this.headers[name.toLowerCase()] = value
    return this
  },
  status(code) {
    this.statusCode = code
    return this
  },
  json(body) {
    this.body = body
    return this
  },
})

test("session tokens carry a revocable version and use hardened cookies", () => {
  const res = createResponse()
  const token = issueSession(res, currentUser)
  const decoded = verifySessionToken(token)

  assert.equal(decoded.sessionVersion, 4)
  assert.equal(res.cookies[0].name, "studynotion_session")
  assert.equal(res.cookies[0].options.httpOnly, true)
  assert.equal(res.cookies[0].options.sameSite, "lax")
  assert.equal(res.cookies[0].options.path, "/")
  assert.ok(res.clearedCookies.some(({ name }) => name === "token"))
})

test("auth accepts the current session version and rejects it after revocation", async () => {
  const issued = createResponse()
  const token = issueSession(issued, currentUser)
  const req = {
    cookies: { studynotion_session: token },
    get: () => undefined,
    originalUrl: "/api/v1/course/getFullCourseDetails",
  }

  let nextCalled = false
  const accepted = createResponse()
  await auth(req, accepted, () => {
    nextCalled = true
  })
  assert.equal(nextCalled, true)
  assert.equal(req.user.id, "64b000000000000000000003")
  assert.equal(accepted.headers["cache-control"], "private, no-store, max-age=0")

  currentUser.sessionVersion += 1
  const rejected = createResponse()
  await auth(req, rejected, () => assert.fail("revoked session reached next"))
  assert.equal(rejected.statusCode, 401)
  assert.equal(rejected.body.success, false)
})

test("logout cleanup clears both current and legacy cookie names", () => {
  const res = createResponse()
  clearSession(res)
  assert.deepEqual(
    new Set(res.clearedCookies.map(({ name }) => name)),
    new Set(["studynotion_session", "token"])
  )
})

test("a pending deletion restricts the account while allowing a safe retry", async () => {
  currentUser.deletionPending = true
  const issued = createResponse()
  const token = issueSession(issued, currentUser)

  try {
    const blocked = createResponse()
    await auth(
      {
        cookies: { studynotion_session: token },
        get: () => undefined,
        originalUrl: "/api/v1/course/getFullCourseDetails",
      },
      blocked,
      () => assert.fail("pending deletion reached a normal controller")
    )
    assert.equal(blocked.statusCode, 423)
    assert.equal(blocked.body.code, "ACCOUNT_DELETION_PENDING")

    let retryReached = false
    await auth(
      {
        cookies: { studynotion_session: token },
        get: () => undefined,
        originalUrl: "/api/v1/profile/deleteProfile",
      },
      createResponse(),
      () => {
        retryReached = true
      }
    )
    assert.equal(retryReached, true)

    let recoveryLookupReached = false
    await auth(
      {
        cookies: { studynotion_session: token },
        get: () => undefined,
        originalUrl: "/api/v1/profile/getUserDetails",
      },
      createResponse(),
      () => {
        recoveryLookupReached = true
      }
    )
    assert.equal(recoveryLookupReached, true)
  } finally {
    currentUser.deletionPending = false
  }
})

test("sessions without the current policy acceptance are gated except for recovery routes", async () => {
  const priorAcceptances = currentUser.policyAcceptances
  currentUser.policyAcceptances = []
  const issued = createResponse()
  const token = issueSession(issued, currentUser)

  try {
    const protectedResponse = createResponse()
    await auth(
      {
        cookies: { studynotion_session: token },
        get: () => undefined,
        originalUrl: "/api/v1/course/getFullCourseDetails",
      },
      protectedResponse,
      () => assert.fail("pending policy session reached a protected controller")
    )
    assert.equal(protectedResponse.statusCode, 428)
    assert.equal(protectedResponse.body.code, "POLICY_ACCEPTANCE_REQUIRED")

    let recoveryReached = false
    await auth(
      {
        cookies: { studynotion_session: token },
        get: () => undefined,
        originalUrl: "/api/v1/auth/accept-policies",
      },
      createResponse(),
      () => {
        recoveryReached = true
      }
    )
    assert.equal(recoveryReached, true)
  } finally {
    currentUser.policyAcceptances = priorAcceptances
  }
})
