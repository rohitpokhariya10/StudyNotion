const assert = require("node:assert/strict")
const { EventEmitter } = require("node:events")
const test = require("node:test")

const {
  createHttpRequestLogger,
  createLogger,
  createRuntimeLogger,
  errorMetadata,
} = require("../utils/logger")

const metadata = {
  app: "logger-test-api",
  version: "9.8.7",
  environment: "test",
}
const fixedNow = () => new Date("2026-07-22T10:00:00.000Z")

test("runtime logger derives level and metadata from an explicit environment", () => {
  const lines = []
  const runtimeLogger = createRuntimeLogger({
    environment: { LOG_LEVEL: "warn", NODE_ENV: "production" },
    now: () => new Date("2026-08-26T00:00:00.000Z"),
    write: (line) => lines.push(JSON.parse(line)),
  })

  runtimeLogger.info("runtime.info")
  runtimeLogger.warn("runtime.warn")

  assert.equal(runtimeLogger.level, "warn")
  assert.deepEqual(lines, [
    {
      timestamp: "2026-08-26T00:00:00.000Z",
      level: "warn",
      event: "runtime.warn",
      app: "studynotion-api",
      version: "1.0.0",
      environment: "production",
    },
  ])
})

test("structured logger emits stable JSON metadata and respects levels", () => {
  const output = []
  const logger = createLogger({
    level: "warn",
    metadata,
    now: fixedNow,
    write: (line, level) => output.push({ line, level }),
  })

  logger.debug("debug.skipped")
  logger.info("info.skipped")
  logger.warn("dependency.degraded", { requestId: "req-123", app: "spoof" })
  logger.error("dependency.failed", { statusCode: 503 })

  assert.equal(output.length, 2)
  assert.deepEqual(
    output.map(({ level }) => level),
    ["warn", "error"]
  )

  const warning = JSON.parse(output[0].line)
  assert.deepEqual(warning, {
    requestId: "req-123",
    app: metadata.app,
    timestamp: "2026-07-22T10:00:00.000Z",
    level: "warn",
    event: "dependency.degraded",
    version: metadata.version,
    environment: metadata.environment,
  })
})

test("structured logger safely serializes errors and redacts secrets", () => {
  const output = []
  const logger = createLogger({
    level: "error",
    metadata,
    now: fixedNow,
    write: (line) => output.push(line),
  })
  const databaseUri = [
    "mongodb://",
    "fixture-user",
    ":",
    "fixture-database-secret",
    "@database.internal/study",
  ].join("")
  const redisUri = [
    "rediss://",
    "fixture-default",
    ":",
    "fixture-redis-secret",
    "@redis.internal:6379",
  ].join("")
  const signedMediaUrl = [
    "https://media.internal/",
    "s--fixture-media-signature--/asset",
    "?__cld_token__=fixture-cloudinary-token",
  ].join("")
  const error = new Error(
    `Connection ${databaseUri} failed for learner@example.com with Bearer bearer-value token=message-token signature=message-signature media=${signedMediaUrl}`
  )
  error.code = "DATABASE_AUTH_FAILED"

  logger.error("database.connection_failed", {
    error,
    password: "plain-password",
    nested: {
      authorization: "Bearer nested-token",
      otp: "123456",
      razorpay_signature: "provider-signature",
      redisUrl: redisUri,
      safeField: "retained",
      signedMediaUrl,
    },
  })

  assert.equal(output.length, 1)
  for (const secret of [
    "fixture-user",
    "fixture-database-secret",
    "learner@example.com",
    "bearer-value",
    "message-token",
    "message-signature",
    "plain-password",
    "nested-token",
    "provider-signature",
    "123456",
    "fixture-redis-secret",
    "fixture-media-signature",
    "fixture-cloudinary-token",
  ]) {
    assert.equal(output[0].includes(secret), false, `leaked ${secret}`)
  }

  const record = JSON.parse(output[0])
  assert.equal(record.password, "[REDACTED]")
  assert.equal(record.nested.authorization, "[REDACTED]")
  assert.equal(record.nested.otp, "[REDACTED]")
  assert.equal(record.nested.razorpay_signature, "[REDACTED]")
  assert.equal(record.nested.redisUrl, "[REDACTED]")
  assert.equal(record.nested.safeField, "retained")
  assert.equal(record.nested.signedMediaUrl, "[REDACTED]")
  assert.equal(record.error.name, "Error")
  assert.equal(record.error.code, "DATABASE_AUTH_FAILED")
  assert.equal(record.error.message, undefined)
  assert.equal(record.error.stack, undefined)
})

test("structured logger omits error causes and redacts common payment and identity fields", () => {
  const output = []
  const logger = createLogger({
    level: "error",
    metadata,
    now: fixedNow,
    write: (line) => output.push(line),
  })
  const error = new Error("outer provider failure", {
    cause: {
      cardNumber: "4111111111111111",
      fullName: "Private Learner",
      passwordHash: "private-password-hash",
    },
  })

  logger.error("provider.failed", {
    error,
    cardNumber: "5555555555554444",
    fullName: "Another Learner",
    passwordHash: "another-private-hash",
  })

  const serialized = output[0]
  for (const secret of [
    "4111111111111111",
    "Private Learner",
    "private-password-hash",
    "5555555555554444",
    "Another Learner",
    "another-private-hash",
  ]) {
    assert.equal(serialized.includes(secret), false)
  }

  const record = JSON.parse(serialized)
  assert.deepEqual(record.error, { name: "Error" })
  assert.equal(record.cardNumber, "[REDACTED]")
  assert.equal(record.fullName, "[REDACTED]")
  assert.equal(record.passwordHash, "[REDACTED]")
})

test("error metadata omits messages, stacks, and provider payloads", () => {
  const error = new Error("provider payload must stay private")
  error.code = "PROVIDER_UNAVAILABLE"
  error.response = { signature: "private-provider-value" }

  assert.deepEqual(errorMetadata(error), {
    name: "Error",
    code: "PROVIDER_UNAVAILABLE",
  })
})

test("HTTP request logger records correlation, status, and duration once", () => {
  const output = []
  const logger = createLogger({
    level: "info",
    metadata,
    now: fixedNow,
    write: (line) => output.push(JSON.parse(line)),
  })
  const times = [10_000_000n, 14_250_000n]
  const middleware = createHttpRequestLogger(logger, () => times.shift())
  const request = {
    requestId: "request-correlation-id",
    method: "GET",
    baseUrl: "/api/v1/admin",
    originalUrl:
      "/api/v1/admin/instructors/private-user-id/approve?token=must-not-be-logged",
    route: { path: "/instructors/:instructorId/approve" },
  }
  const response = new EventEmitter()
  response.statusCode = 204
  response.writableEnded = true

  let nextCalled = false
  middleware(request, response, () => {
    nextCalled = true
  })
  response.emit("finish")
  response.emit("close")

  assert.equal(nextCalled, true)
  assert.equal(output.length, 1)
  assert.deepEqual(
    {
      event: output[0].event,
      requestId: output[0].requestId,
      method: output[0].method,
      path: output[0].path,
      statusCode: output[0].statusCode,
      durationMs: output[0].durationMs,
      aborted: output[0].aborted,
    },
    {
      event: "http.request.completed",
      requestId: "request-correlation-id",
      method: "GET",
      path: "/api/v1/admin/instructors/:instructorId/approve",
      statusCode: 204,
      durationMs: 4.25,
      aborted: false,
    }
  )
  assert.equal(JSON.stringify(output[0]).includes("must-not-be-logged"), false)
  assert.equal(JSON.stringify(output[0]).includes("private-user-id"), false)
})

test("structured logger rejects unsupported levels", () => {
  assert.throws(
    () => createLogger({ level: "verbose" }),
    /Unsupported log level/
  )
})
