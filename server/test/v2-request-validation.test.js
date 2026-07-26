const assert = require("node:assert/strict")
const { after, before, test } = require("node:test")

const express = require("express")
const {
  apiErrorResponseSchema,
  offsetPaginationQuerySchema,
  progressUpdateRequestSchema,
  resourceIdParamsSchema,
} = require("@studynotion/contracts")

const {
  createV2ErrorEnvelope,
  normalizeV2ErrorEnvelope,
  statusCodeToErrorCode,
} = require("../shared/http/v2ErrorEnvelope")
const { errorHandler } = require("../shared/http/errorHandler")
const {
  validateV2Request,
  validationDetails,
} = require("../shared/http/validateV2Request")

const courseId = "64b000000000000000000001"
const lessonId = "64b000000000000000000002"
const requestValidator = validateV2Request({
  params: resourceIdParamsSchema,
  query: offsetPaginationQuerySchema,
  body: progressUpdateRequestSchema,
})

const app = express()
app.use((req, res, next) => {
  req.requestId = "validation-request"
  res.setHeader("x-request-id", req.requestId)
  next()
})
app.use(express.json({ strict: true }))

const respondWithValidatedInput = (req, res) =>
  res.status(200).json({
    success: true,
    requestId: req.requestId,
    data: {
      rawQuery: req.query,
      validated: res.locals.v2Input,
    },
  })

app.post(
  "/api/v2/resources/:resourceId",
  requestValidator,
  respondWithValidatedInput
)
app.post(
  "/api/v2/resources/:resourceId/:unexpected",
  requestValidator,
  respondWithValidatedInput
)
app.use(errorHandler)

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

const requestJson = async (path, body) => {
  const response = await fetch(`${baseUrl}${path}`, {
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
    method: "POST",
  })
  return { response, body: await response.json() }
}

test("route-local validation parses into locals without mutating Express query input", async (t) => {
  if (!requireListener(t)) return
  const result = await requestJson(
    `/api/v2/resources/${courseId}?page=2&limit=5`,
    {
      lessonId,
      completed: true,
    }
  )

  assert.equal(result.response.status, 200)
  assert.deepEqual(result.body.data.rawQuery, { page: "2", limit: "5" })
  assert.deepEqual(result.body.data.validated, {
    params: { resourceId: courseId },
    query: { page: 2, limit: 5 },
    body: { lessonId, completed: true },
  })
})

test("strict v2 validation rejects unknown and invalid params, query, and body fields", async (t) => {
  if (!requireListener(t)) return
  const cases = [
    {
      path: `/api/v2/resources/not-an-id`,
      body: { lessonId, completed: true },
      code: "INVALID_PARAMS",
    },
    {
      path: `/api/v2/resources/${courseId}/unexpected`,
      body: { lessonId, completed: true },
      code: "INVALID_PARAMS",
    },
    {
      path: `/api/v2/resources/${courseId}?unknown=value`,
      body: { lessonId, completed: true },
      code: "INVALID_QUERY",
    },
    {
      path: `/api/v2/resources/${courseId}?limit=5&limit=10`,
      body: { lessonId, completed: true },
      code: "INVALID_QUERY",
    },
    {
      path: `/api/v2/resources/${courseId}`,
      body: { lessonId, completed: true, userId: courseId },
      code: "INVALID_BODY",
    },
    {
      path: `/api/v2/resources/${courseId}`,
      body: [],
      code: "INVALID_BODY",
    },
  ]

  for (const testCase of cases) {
    const result = await requestJson(testCase.path, testCase.body)
    assert.equal(result.response.status, 400)
    assert.equal(result.body.error.code, testCase.code)
    assert.equal(apiErrorResponseSchema.safeParse(result.body).success, true)
  }
})

test("malformed encoded route parameters use the stable v2 envelope", async (t) => {
  if (!requireListener(t)) return
  const result = await requestJson("/api/v2/resources/%E0%A4%A", {
    lessonId,
    completed: true,
  })

  assert.equal(result.response.status, 400)
  assert.equal(result.body.error.code, "INVALID_PARAMS")
  assert.equal(apiErrorResponseSchema.safeParse(result.body).success, true)
})

test("validation issue details are bounded and strip control characters", () => {
  const details = validationDetails([
    {
      code: "custom",
      message: `Unsafe\u0000message\u202Egpj.exe${"x".repeat(600)}`,
      path: ["field\u0007\u2066name"],
    },
  ])

  assert.equal(details.fields[0].message.includes("\u0000"), false)
  assert.equal(details.fields[0].message.includes("\u202E"), false)
  assert.equal(details.fields[0].message.length, 500)
  assert.equal(details.fields[0].path, "fieldname")
})

test("the v2 normalizer replaces malformed error-shaped payloads", () => {
  const response = {
    body: undefined,
    headers: {},
    statusCode: 400,
    json(body) {
      this.body = body
      return this
    },
    setHeader(name, value) {
      this.headers[name.toLowerCase()] = value
    },
  }
  normalizeV2ErrorEnvelope(
    { requestId: "normalizer-request" },
    response,
    () => {}
  )

  response.json({
    error: "not-an-envelope",
    debug: "private detail",
  })

  assert.deepEqual(response.body, {
    error: {
      code: "INVALID_REQUEST",
      message: "The request could not be completed",
      requestId: "normalizer-request",
    },
  })
  assert.equal(response.headers["cache-control"], "private, no-store")
})

test("the v2 normalizer replaces envelopes with a mismatched request ID", () => {
  const response = {
    body: undefined,
    headers: {},
    statusCode: 409,
    json(body) {
      this.body = body
      return this
    },
    setHeader(name, value) {
      this.headers[name.toLowerCase()] = value
    },
  }
  normalizeV2ErrorEnvelope({ requestId: "current-request" }, response, () => {})

  response.json({
    error: {
      code: "CONFLICT",
      message: "Safe conflict",
      requestId: "different-request",
    },
  })

  assert.deepEqual(response.body, {
    error: {
      code: "CONFLICT",
      message: "The request could not be completed",
      requestId: "current-request",
    },
  })
})

test("the v2 error-envelope factory fails closed on malformed internal input", () => {
  assert.deepEqual(
    createV2ErrorEnvelope(
      { requestId: "safe-request" },
      "",
      "must not escape",
      null
    ),
    {
      error: {
        code: "INTERNAL_ERROR",
        message: "Internal server error",
        requestId: "safe-request",
      },
    }
  )
  assert.equal(
    createV2ErrorEnvelope(
      { requestId: "unsafe request id" },
      "",
      "must not escape"
    ).error.requestId,
    "unknown"
  )
})

test("the v2 validator rejects unknown or missing source configuration", () => {
  assert.throws(
    () =>
      validateV2Request({
        body: progressUpdateRequestSchema,
        param: resourceIdParamsSchema,
      }),
    /Unsupported v2 validation source: param/
  )
  assert.throws(() => validateV2Request({}), /At least one v2 request schema/)
  assert.throws(
    () => validateV2Request(null),
    /V2 validation sources must be an object/
  )
})

test("status mapping covers reusable v2 client error classes", () => {
  assert.equal(statusCodeToErrorCode(409), "CONFLICT")
  assert.equal(statusCodeToErrorCode(415), "UNSUPPORTED_MEDIA_TYPE")
  assert.equal(statusCodeToErrorCode(422), "UNPROCESSABLE_CONTENT")
  assert.equal(statusCodeToErrorCode(423), "ACCOUNT_LOCKED")
  assert.equal(statusCodeToErrorCode(428), "PRECONDITION_REQUIRED")
})
