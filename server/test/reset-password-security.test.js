const assert = require("node:assert/strict")
const crypto = require("node:crypto")
const test = require("node:test")

process.env.NODE_ENV = "test"
process.env.FRONTEND_URL = "http://localhost:3000"
process.env.MONGODB_URL = "mongodb://127.0.0.1:27017/studynotion-reset-test"
process.env.JWT_SECRET = "reset-test-jwt-secret-123456789012345678"
process.env.OTP_SECRET = "reset-test-otp-secret-123456789012345678"

const updates = []
const deliveries = []

const queryFor = (value) => ({
  select: async () => value,
})

const User = {
  findOne: ({ email }) =>
    queryFor(
      email === "learner@example.com"
        ? { _id: "64b000000000000000000001", email }
        : null
    ),
  updateOne: async (filter, update) => {
    updates.push({ filter, update })
    return { acknowledged: true }
  },
}

const installMock = (modulePath, exports) => {
  const filename = require.resolve(modulePath)
  require.cache[filename] = {
    id: filename,
    filename,
    loaded: true,
    exports,
  }
}

installMock("../models/User", User)
installMock("../utils/mailSender", async (...args) => {
  deliveries.push(args)
  return { id: "delivery-1" }
})

const controllerPath = require.resolve("../controllers/resetPassword")
delete require.cache[controllerPath]
const { resetPasswordToken } = require(controllerPath)

const createResponse = () => ({
  statusCode: 200,
  body: undefined,
  status(code) {
    this.statusCode = code
    return this
  },
  json(body) {
    this.body = body
    return this
  },
})

test("reset links keep the bearer token out of request paths and logs", async () => {
  const startedAt = Date.now()
  const response = createResponse()

  await resetPasswordToken(
    { body: { email: " Learner@Example.com " } },
    response
  )

  assert.equal(response.statusCode, 200)
  assert.equal(response.body.success, true)
  assert.equal(deliveries.length, 1)
  assert.equal(updates.length, 1)

  const html = deliveries[0][2]
  const linkMatch = html.match(
    /href="(http:\/\/localhost:3000\/update-password#token=([a-f0-9]{64}))"/
  )
  assert.ok(linkMatch, "email should contain a fragment-based reset URL")
  assert.equal(html.includes("/update-password/"), false)
  assert.equal(html.includes("?token="), false)

  const rawToken = linkMatch[2]
  const storedHash = updates[0].update.$set.resetPasswordTokenHash
  assert.notEqual(storedHash, rawToken)
  assert.equal(
    storedHash,
    crypto.createHash("sha256").update(rawToken).digest("hex")
  )

  const expiresAt = updates[0].update.$set.resetPasswordExpires.getTime()
  assert.ok(expiresAt >= startedAt + 29 * 60 * 1000)
  assert.ok(expiresAt <= Date.now() + 31 * 60 * 1000)
})

test("unknown reset emails receive the same generic success response", async () => {
  const response = createResponse()
  await resetPasswordToken({ body: { email: "absent@example.com" } }, response)

  assert.equal(response.statusCode, 200)
  assert.equal(response.body.success, true)
  assert.match(response.body.message, /If an account exists/)
  assert.equal(deliveries.length, 1)
})
