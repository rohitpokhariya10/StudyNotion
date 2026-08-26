const assert = require("node:assert/strict")
const test = require("node:test")

process.env.NODE_ENV = "test"
process.env.FRONTEND_ORIGINS = "http://localhost:3000"
process.env.MONGODB_URI = "mongodb://127.0.0.1:27017/studynotion-redis-test"
process.env.JWT_SECRET = "redis-test-jwt-secret-123456789012345678"
process.env.OTP_SECRET = "redis-test-otp-secret-123456789012345678"
process.env.REDIS_URL = "redis://127.0.0.1:6379/15"
process.env.REDIS_CONNECT_TIMEOUT_MS = "1000"
process.env.REDIS_COMMAND_TIMEOUT_MS = "1000"

const { withDeadline } = require("../utils/deadline")

test("Redis operations fail within their explicit deadline", async () => {
  await assert.rejects(
    withDeadline(new Promise(() => {}), 5, "Redis command deadline exceeded"),
    (error) =>
      error?.code === "DEPENDENCY_DEADLINE_EXCEEDED" &&
      error.message === "Redis command deadline exceeded"
  )
})

test(
  "Redis applies the configured deadline to every runtime command",
  {
    timeout: 3000,
  },
  async () => {
    const redisPackage = require("redis")
    const originalCreateClient = redisPackage.createClient
    let clientOptions
    let destroyCalls = 0
    let isOpen = false
    let quitCalls = 0

    const fakeClient = {
      get isOpen() {
        return isOpen
      },
      get isReady() {
        return isOpen
      },
      on() {},
      async connect() {
        isOpen = true
      },
      async ping() {
        return "PONG"
      },
      sendCommand() {
        return new Promise(() => {})
      },
      quit() {
        quitCalls += 1
        return new Promise(() => {})
      },
      destroy() {
        destroyCalls += 1
        isOpen = false
      },
    }

    redisPackage.createClient = (options) => {
      clientOptions = options
      return fakeClient
    }

    let redis
    try {
      redis = require("../config/redis")
    } finally {
      redisPackage.createClient = originalCreateClient
    }

    await redis.connect()
    assert.equal(clientOptions.commandOptions.timeout, 1000)

    await assert.rejects(
      redis.sendCommand("GET", "stalled"),
      (error) =>
        error?.code === "DEPENDENCY_DEADLINE_EXCEEDED" &&
        error.message === "Redis command deadline exceeded"
    )

    await redis.disconnect()
    assert.equal(quitCalls, 0)
    assert.equal(destroyCalls, 1)
    assert.equal(redis.isReady(), false)
  }
)
