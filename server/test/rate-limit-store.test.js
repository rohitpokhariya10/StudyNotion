const assert = require("node:assert/strict")
const test = require("node:test")

process.env.NODE_ENV = "test"
process.env.FRONTEND_URL = "http://localhost:3000"
process.env.MONGODB_URL = "mongodb://127.0.0.1:27017/studynotion-limit-test"
process.env.JWT_SECRET = "limit-test-jwt-secret-123456789012345678"
process.env.OTP_SECRET = "limit-test-otp-secret-123456789012345678"
delete process.env.REDIS_URL

const {
  hashRateLimitIdentity,
} = require("../middleware/rateLimiters")

test("rate-limit keys never expose email, user, or IP identities", () => {
  const identity = "private.learner@example.com"
  const hashed = hashRateLimitIdentity(identity)

  assert.match(hashed, /^[a-f0-9]{64}$/)
  assert.equal(hashed.includes(identity), false)
  assert.equal(hashed, hashRateLimitIdentity(identity))
  assert.notEqual(hashed, hashRateLimitIdentity("another@example.com"))
})
