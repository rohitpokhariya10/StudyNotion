const assert = require("node:assert/strict")
const { after, before, test } = require("node:test")

const express = require("express")

const ids = {
  course: "64b000000000000000000001",
  lesson: "64b000000000000000000002",
  user: "64b000000000000000000003",
}
const serviceCalls = []

const installMock = (modulePath, exports) => {
  const filename = require.resolve(modulePath)
  require.cache[filename] = { id: filename, filename, loaded: true, exports }
}

installMock("../middleware/auth", {
  auth(req, res, next) {
    const identity = req.get("x-test-identity")
    if (!identity) {
      return res.status(401).json({ success: false, message: "Token Missing" })
    }
    req.user = { id: ids.user, accountType: identity }
    return next()
  },
  isStudent(req, res, next) {
    if (req.user?.accountType !== "Student") {
      return res.status(403).json({
        success: false,
        message: "This is a Protected Route for Students",
      })
    }
    return next()
  },
})

installMock("../domains/learning/learningService", {
  async getLearningCourse(input) {
    serviceCalls.push(["get", input])
    return {
      success: true,
      requestId: input.requestId,
      data: {
        course: { id: input.courseId, name: "Learning", thumbnailUrl: null },
        curriculum: [],
        progress: {
          courseId: input.courseId,
          completedLessonIds: [],
          completedCount: 0,
          totalLessons: 0,
          progressPercent: 0,
          updatedAt: null,
        },
      },
    }
  },
  async markLessonComplete(input) {
    serviceCalls.push(["put", input])
    return {
      success: true,
      requestId: input.requestId,
      data: {
        courseId: input.courseId,
        completedLessonIds: [input.lessonId],
        completedCount: 1,
        totalLessons: 1,
        progressPercent: 100,
        updatedAt: "2026-08-08T08:00:00.000Z",
      },
    }
  },
})

delete require.cache[require.resolve("../controllers/LearningV2")]
delete require.cache[require.resolve("../routes/LearningV2")]

const learningRoutes = require("../routes/LearningV2")
const { errorHandler } = require("../shared/http/errorHandler")
const { normalizeV2ErrorEnvelope } = require("../shared/http/v2ErrorEnvelope")

const app = express()
app.use((req, res, next) => {
  req.requestId = req.get("x-request-id") || "learning-http"
  res.setHeader("x-request-id", req.requestId)
  next()
})
app.use("/api/v2", normalizeV2ErrorEnvelope)
app.use(express.json({ strict: true }))
// This mount must precede the existing catalog router's generic v2 catch-all.
app.use("/api/v2/learning", learningRoutes)
app.use("/api/v2", (req, res) =>
  res
    .status(404)
    .json({ success: false, message: "Catalog v2 route not found" })
)
app.get("/api/v1/compatibility", (_req, res) =>
  res.status(404).json({ success: false, message: "Route not found" })
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

const requestJson = async (path, options = {}) => {
  const response = await fetch(`${baseUrl}${path}`, options)
  return { body: await response.json(), response }
}

const studentHeaders = (headers = {}) => ({
  "x-test-identity": "Student",
  ...headers,
})

test("learning v2 authenticates before parameter validation", async (t) => {
  if (!requireListener(t)) return
  const result = await requestJson("/api/v2/learning/courses/not-an-id")

  assert.equal(result.response.status, 401)
  assert.equal(result.body.error.code, "UNAUTHORIZED")
  assert.equal(result.body.error.requestId, "learning-http")
})

test("learning v2 rejects non-students and invalid route parameters", async (t) => {
  if (!requireListener(t)) return
  const roleDenied = await requestJson(
    `/api/v2/learning/courses/${ids.course}`,
    { headers: { "x-test-identity": "Instructor" } }
  )
  assert.equal(roleDenied.response.status, 403)
  assert.equal(roleDenied.body.error.code, "FORBIDDEN")

  const invalid = await requestJson("/api/v2/learning/courses/not-an-id", {
    headers: studentHeaders(),
  })
  assert.equal(invalid.response.status, 400)
  assert.equal(invalid.body.error.code, "INVALID_PARAMS")
})

test("learning v2 rejects unknown query fields and mutation bodies", async (t) => {
  if (!requireListener(t)) return
  const unknownQuery = await requestJson(
    `/api/v2/learning/courses/${ids.course}?userId=${ids.user}`,
    { headers: studentHeaders() }
  )
  assert.equal(unknownQuery.response.status, 400)
  assert.equal(unknownQuery.body.error.code, "INVALID_QUERY")

  const unknownMutationQuery = await requestJson(
    `/api/v2/learning/courses/${ids.course}/lessons/${ids.lesson}/progress?completed=false`,
    {
      body: "{}",
      headers: studentHeaders({ "content-type": "application/json" }),
      method: "PUT",
    }
  )
  assert.equal(unknownMutationQuery.response.status, 400)
  assert.equal(unknownMutationQuery.body.error.code, "INVALID_QUERY")

  const suppliedProgress = await requestJson(
    `/api/v2/learning/courses/${ids.course}/lessons/${ids.lesson}/progress`,
    {
      body: JSON.stringify({ progressPercent: 100 }),
      headers: studentHeaders({ "content-type": "application/json" }),
      method: "PUT",
    }
  )
  assert.equal(suppliedProgress.response.status, 400)
  assert.equal(suppliedProgress.body.error.code, "INVALID_BODY")
})

test("learning v2 routes reach the validated controller before the v2 catch-all", async (t) => {
  if (!requireListener(t)) return
  serviceCalls.length = 0
  const getResult = await requestJson(
    `/api/v2/learning/courses/${ids.course}`,
    {
      headers: studentHeaders({ "x-request-id": "learning-get" }),
    }
  )
  assert.equal(getResult.response.status, 200)
  assert.equal(getResult.body.requestId, "learning-get")
  assert.equal(getResult.body.data.course.id, ids.course)
  assert.equal(
    getResult.response.headers.get("cache-control"),
    "private, no-store"
  )
  assert.deepEqual(serviceCalls[0], [
    "get",
    {
      courseId: ids.course,
      requestId: "learning-get",
      userId: ids.user,
    },
  ])

  const putResult = await requestJson(
    `/api/v2/learning/courses/${ids.course}/lessons/${ids.lesson}/progress`,
    {
      body: "{}",
      headers: studentHeaders({
        "content-type": "application/json",
        "x-request-id": "learning-put",
      }),
      method: "PUT",
    }
  )
  assert.equal(putResult.response.status, 200)
  assert.deepEqual(putResult.body.data.completedLessonIds, [ids.lesson])
  assert.deepEqual(serviceCalls[1], [
    "put",
    {
      courseId: ids.course,
      lessonId: ids.lesson,
      requestId: "learning-put",
      userId: ids.user,
    },
  ])

  const missing = await requestJson("/api/v2/learning/not-a-route")
  assert.equal(missing.response.status, 404)
  assert.equal(missing.body.error.code, "ROUTE_NOT_FOUND")
})

test("learning v2 mounting leaves the v1 response byte-compatible", async (t) => {
  if (!requireListener(t)) return
  const result = await requestJson("/api/v1/compatibility")

  assert.equal(result.response.status, 404)
  assert.deepEqual(result.body, { success: false, message: "Route not found" })
})
