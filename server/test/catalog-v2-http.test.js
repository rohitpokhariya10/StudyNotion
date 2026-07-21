const assert = require("node:assert/strict")
const { after, before, test } = require("node:test")

process.env.NODE_ENV = "test"
process.env.FRONTEND_URL = "http://localhost:3000"
process.env.MONGODB_URL = "mongodb://127.0.0.1:27017/studynotion-catalog-http"
process.env.JWT_SECRET = "catalog-http-jwt-secret-123456789012345"
process.env.OTP_SECRET = "catalog-http-otp-secret-123456789012345"

const Course = require("../models/Course")
const originalAggregate = Course.aggregate
let aggregateDocuments = []
let aggregateError
let capturedPipeline

Course.aggregate = (pipeline) => {
  capturedPipeline = pipeline
  return {
    option() {
      return this
    },
    async exec() {
      if (aggregateError) throw aggregateError
      return aggregateDocuments
    },
  }
}

const { app } = require("../index")

let server
let baseUrl
let listenerUnavailable

before(async () => {
  try {
    await new Promise((resolve, reject) => {
      server = app.listen(0, "127.0.0.1", (error) =>
        error ? reject(error) : resolve()
      )
    })
    baseUrl = `http://127.0.0.1:${server.address().port}`
  } catch (error) {
    if (error?.code !== "EPERM") throw error
    listenerUnavailable = error
  }
})

after(async () => {
  Course.aggregate = originalAggregate
  if (!server?.listening) return
  await new Promise((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve()))
  )
})

const requireListener = (t) => {
  if (!listenerUnavailable) return true
  t.skip("loopback listeners are blocked by this sandbox")
  return false
}

const requestJson = async (path, options = {}) => {
  const response = await fetch(`${baseUrl}${path}`, options)
  return { response, body: await response.json() }
}

const document = {
  _id: "64b000000000000000000001",
  category: { _id: "64b000000000000000000010", name: "Engineering" },
  courseDescription: "Build secure Node services.",
  courseName: "Secure Node",
  createdAt: new Date("2026-03-01T00:00:00.000Z"),
  durationSeconds: 3600,
  enrollmentCount: 10,
  instructor: {
    _id: "64b000000000000000000020",
    firstName: "Ada",
    lastName: "Lovelace",
  },
  language: "en",
  level: "advanced",
  price: 1499,
  ratingAverage: 4.8,
  ratingCount: 20,
  searchScore: 3,
  thumbnail: "https://cdn.example.test/course.png",
}

test("v2 catalog returns the stable success and request-id envelope", async (t) => {
  if (!requireListener(t)) return
  aggregateError = undefined
  aggregateDocuments = [document]
  const result = await requestJson("/api/v2/courses?limit=1", {
    headers: { "x-request-id": "catalog-request-1" },
  })

  assert.equal(result.response.status, 200)
  assert.equal(result.body.success, true)
  assert.equal(result.body.requestId, "catalog-request-1")
  assert.equal(result.response.headers.get("x-request-id"), "catalog-request-1")
  assert.equal(
    result.response.headers.get("cache-control"),
    "private, no-store"
  )
  assert.equal(result.body.data.items[0].name, "Secure Node")
})

test("v2 catalog validates search, pagination, category, and sort", async (t) => {
  if (!requireListener(t)) return
  for (const path of [
    "/api/v2/courses?limit=51",
    "/api/v2/courses?sort=recommended",
    "/api/v2/courses?categoryId=invalid",
    "/api/v2/courses?unknown=value",
  ]) {
    const result = await requestJson(path)
    assert.equal(result.response.status, 400)
    assert.equal(result.body.error.code, "INVALID_QUERY")
    assert.equal(typeof result.body.error.requestId, "string")
  }

  aggregateDocuments = []
  const normalized = await requestJson(
    "/api/v2/courses?q=%20%20secure%20%20%20node%20%20"
  )
  assert.equal(normalized.response.status, 200)
  assert.deepEqual(normalized.body.data.items, [])
  assert.equal(capturedPipeline[0].$match.status, "Published")
  assert.deepEqual(capturedPipeline[0].$match.$text, {
    $search: "secure node",
  })
})

test("v2 catalog exposes standard 404 and internal error envelopes", async (t) => {
  if (!requireListener(t)) return
  const missing = await requestJson("/api/v2/not-a-route")
  assert.equal(missing.response.status, 404)
  assert.equal(missing.body.error.code, "ROUTE_NOT_FOUND")
  assert.equal(
    missing.response.headers.get("cache-control"),
    "private, no-store"
  )

  aggregateError = new Error("database detail that must not reach the client")
  const failed = await requestJson("/api/v2/courses")
  assert.equal(failed.response.status, 500)
  assert.equal(failed.body.error.code, "CATALOG_UNAVAILABLE")
  assert.equal(JSON.stringify(failed.body).includes("database detail"), false)
  aggregateError = undefined
})

test("v2 parser, CORS, and origin failures retain the standard envelope", async (t) => {
  if (!requireListener(t)) return

  const invalidJson = await requestJson("/api/v2/not-a-route", {
    body: "{",
    headers: { "content-type": "application/json" },
    method: "POST",
  })
  assert.equal(invalidJson.response.status, 400)
  assert.equal(invalidJson.body.error.code, "INVALID_REQUEST")
  assert.equal(
    invalidJson.response.headers.get("cache-control"),
    "private, no-store"
  )

  const tooLarge = await requestJson("/api/v2/not-a-route", {
    body: JSON.stringify({ value: "x".repeat(110_000) }),
    headers: { "content-type": "application/json" },
    method: "POST",
  })
  assert.equal(tooLarge.response.status, 413)
  assert.equal(tooLarge.body.error.code, "PAYLOAD_TOO_LARGE")

  const disallowedCors = await requestJson("/api/v2/courses", {
    headers: { origin: "https://attacker.example" },
  })
  assert.equal(disallowedCors.response.status, 403)
  assert.equal(disallowedCors.body.error.code, "CORS_NOT_ALLOWED")

  const crossSite = await requestJson("/api/v2/not-a-route", {
    headers: { "sec-fetch-site": "cross-site" },
    method: "POST",
  })
  assert.equal(crossSite.response.status, 403)
  assert.equal(crossSite.body.error.code, "FORBIDDEN")
})

test("v1 not-found response remains byte-compatible", async (t) => {
  if (!requireListener(t)) return
  const result = await requestJson("/api/v1/not-a-route")
  assert.equal(result.response.status, 404)
  assert.deepEqual(result.body, { success: false, message: "Route not found" })
})

test("v2 rate-limit failures retain the standard envelope", async (t) => {
  if (!requireListener(t)) return

  let limited
  for (let attempt = 0; attempt < 510; attempt += 1) {
    const result = await requestJson("/api/v2/courses")
    if (result.response.status === 429) {
      limited = result
      break
    }
  }

  assert.equal(limited?.response.status, 429)
  assert.equal(limited?.body.error.code, "RATE_LIMITED")
  assert.equal(typeof limited?.body.error.requestId, "string")
})
