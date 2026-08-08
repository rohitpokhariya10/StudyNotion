const assert = require("node:assert/strict")
const { test } = require("node:test")

const enabled = process.env.STUDYNOTION_RUN_LEARNING_INTEGRATION === "1"

const findIndexScan = (value, expectedIndexName) => {
  if (!value || typeof value !== "object") return null
  if (value.stage === "IXSCAN" && value.indexName === expectedIndexName) {
    return value
  }
  for (const child of Object.values(value)) {
    const match = findIndexScan(child, expectedIndexName)
    if (match) return match
  }
  return null
}

const assertDisposableMongoUri = (value) => {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Learning integration tests cannot run in production")
  }
  if (!value || value.startsWith("mongodb+srv://")) {
    throw new Error(
      "LEARNING_TEST_MONGODB_URI must use a disposable local MongoDB"
    )
  }

  const url = new URL(value)
  const database = url.pathname.slice(1)
  if (!/^studynotion_learning_test_[a-z0-9_-]+$/i.test(database)) {
    throw new Error(
      "The MongoDB database name must begin with studynotion_learning_test_"
    )
  }
  if (!["127.0.0.1", "localhost", "mongo", "mongodb"].includes(url.hostname)) {
    throw new Error(
      "Learning integration MongoDB must be local or a CI service"
    )
  }
  return value
}

const assertDisposableRedisUri = (value) => {
  if (!value) throw new Error("LEARNING_TEST_REDIS_URL is required")
  const url = new URL(value)
  if (!["127.0.0.1", "localhost", "redis"].includes(url.hostname)) {
    throw new Error("Learning integration Redis must be local or a CI service")
  }
  if (!/^\/(?:1[4-5])$/.test(url.pathname)) {
    throw new Error(
      "Learning integration Redis must use disposable database 14 or 15"
    )
  }
  return value
}

test(
  "learning v2 enforces entitlement and idempotent progress with real services",
  { skip: !enabled, timeout: 120_000 },
  async () => {
    const mongoUri = assertDisposableMongoUri(
      process.env.LEARNING_TEST_MONGODB_URI
    )
    const redisUri = assertDisposableRedisUri(
      process.env.LEARNING_TEST_REDIS_URL
    )

    process.env.NODE_ENV = "test"
    process.env.FRONTEND_URL = "http://localhost:3000"
    process.env.MONGODB_URL = mongoUri
    process.env.REDIS_URL = redisUri
    process.env.JWT_SECRET = "learning-integration-jwt-secret-1234567890"
    process.env.OTP_SECRET = "learning-integration-otp-secret-1234567890"

    const mongoose = require("mongoose")
    const redis = require("../config/redis")
    const env = require("../config/env")
    const Course = require("../models/Course")
    const CourseProgress = require("../models/CourseProgress")
    const Section = require("../models/Section")
    const SubSection = require("../models/Subsection")
    const User = require("../models/User")
    const { app } = require("../index")
    const { issueSession } = require("../utils/auth")
    const { createPolicyAcceptance } = require("../utils/policyAcceptance")

    const ids = Object.fromEntries(
      [
        "concurrentCourse",
        "concurrentLessonOne",
        "concurrentLessonTwo",
        "concurrentSection",
        "course",
        "hiddenLearner",
        "instructor",
        "lessonOne",
        "lessonTwo",
        "lessonThree",
        "missingCourse",
        "otherCourse",
        "otherLesson",
        "otherSection",
        "outsider",
        "sectionOne",
        "sectionTwo",
        "staleLesson",
        "staleSection",
        "student",
        "zeroCourse",
      ].map((name) => [name, new mongoose.Types.ObjectId()])
    )

    const acceptedAt = new Date("2026-08-08T00:00:00.000Z")
    const userDocument = ({ accountType = "Student", id, name }) => ({
      _id: id,
      firstName: name,
      lastName: "Integration",
      email: `${name.toLowerCase()}-${id}@example.test`,
      accountType,
      active: true,
      approved: true,
      deletionPending: false,
      sessionVersion: 0,
      policyAcceptances: [createPolicyAcceptance("local_seed", acceptedAt)],
    })
    const student = userDocument({ id: ids.student, name: "Learner" })
    const outsider = userDocument({ id: ids.outsider, name: "Outsider" })
    const hiddenLearner = userDocument({
      id: ids.hiddenLearner,
      name: "HiddenLearner",
    })
    const instructor = userDocument({
      accountType: "Instructor",
      id: ids.instructor,
      name: "Instructor",
    })

    const sessionCookieFor = (user) => {
      let token
      issueSession(
        {
          clearCookie() {},
          cookie(name, value) {
            if (name === env.cookie.name) token = value
          },
        },
        user
      )
      assert.equal(typeof token, "string")
      return `${env.cookie.name}=${encodeURIComponent(token)}`
    }

    let requestSequence = 0
    let server
    let baseUrl
    const requestJson = async (
      path,
      { body, cookie, method = "GET", requestId } = {}
    ) => {
      requestSequence += 1
      const correlationId =
        requestId || `learning-integration-${requestSequence}`
      const headers = {
        accept: "application/json",
        origin: "http://localhost:3000",
        "x-request-id": correlationId,
      }
      if (cookie) headers.cookie = cookie

      const options = { headers, method }
      if (body !== undefined) {
        headers["content-type"] = "application/json"
        options.body = JSON.stringify(body)
      }

      const response = await fetch(`${baseUrl}${path}`, options)
      return {
        body: await response.json(),
        requestId: correlationId,
        response,
      }
    }

    try {
      await mongoose.connect(mongoUri, { autoIndex: false })
      await redis.connect()
      await redis.sendCommand("FLUSHDB")
      await CourseProgress.createIndexes()

      await User.collection.insertMany([
        student,
        outsider,
        hiddenLearner,
        instructor,
      ])
      await SubSection.collection.insertMany([
        {
          _id: ids.lessonOne,
          title: "Introduction",
          description: "Begin the course.",
          timeDuration: "60",
          videoUrl: "https://private.example.test/introduction.mp4",
          videoPublicId: "learning/private-introduction",
          videoFormat: "mp4",
          videoDeliveryType: "authenticated",
        },
        {
          _id: ids.lessonTwo,
          title: "Authorization",
          description: "Protect a resource.",
          timeDuration: "120",
          videoUrl: "https://private.example.test/authorization.mp4",
          videoPublicId: "learning/private-authorization",
          videoFormat: "mp4",
          videoDeliveryType: "authenticated",
        },
        {
          _id: ids.lessonThree,
          title: "Idempotency",
          description: "Safely retry writes.",
          timeDuration: "180",
          videoUrl: "https://private.example.test/idempotency.mp4",
          videoPublicId: "learning/private-idempotency",
          videoFormat: "mp4",
          videoDeliveryType: "authenticated",
        },
        {
          _id: ids.concurrentLessonOne,
          title: "Concurrent one",
          description: "First concurrent completion.",
          timeDuration: "30",
        },
        {
          _id: ids.concurrentLessonTwo,
          title: "Concurrent two",
          description: "Second concurrent completion.",
          timeDuration: "45",
        },
        {
          _id: ids.otherLesson,
          title: "Another course lesson",
          description: "Must not cross course boundaries.",
          timeDuration: "90",
        },
      ])
      await Section.collection.insertMany([
        {
          _id: ids.sectionOne,
          sectionName: "Foundations",
          subSection: [
            ids.lessonOne,
            ids.lessonTwo,
            ids.lessonOne,
            ids.staleLesson,
          ],
        },
        {
          _id: ids.sectionTwo,
          sectionName: "Reliability",
          subSection: [ids.lessonThree],
        },
        {
          _id: ids.concurrentSection,
          sectionName: "Concurrent progress",
          subSection: [ids.concurrentLessonOne, ids.concurrentLessonTwo],
        },
        {
          _id: ids.otherSection,
          sectionName: "Other course",
          subSection: [ids.otherLesson],
        },
      ])
      await Course.collection.insertMany([
        {
          _id: ids.course,
          courseName: "Secure learning",
          instructor: ids.instructor,
          thumbnail:
            "data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%2F%3E",
          courseContent: [
            ids.sectionOne,
            ids.sectionTwo,
            ids.sectionOne,
            ids.staleSection,
          ],
          studentsEnroled: [ids.student, ids.hiddenLearner],
          status: "Published",
        },
        {
          _id: ids.zeroCourse,
          courseName: "Empty learning course",
          instructor: ids.instructor,
          thumbnail: "https://cdn.example.test/empty.png",
          courseContent: [],
          studentsEnroled: [ids.student],
          status: "Published",
        },
        {
          _id: ids.concurrentCourse,
          courseName: "Concurrent learning",
          instructor: ids.instructor,
          thumbnail: "https://cdn.example.test/concurrent.png",
          courseContent: [ids.concurrentSection],
          studentsEnroled: [ids.student],
          status: "Published",
        },
        {
          _id: ids.otherCourse,
          courseName: "Other learning course",
          instructor: ids.instructor,
          thumbnail: "https://cdn.example.test/other.png",
          courseContent: [ids.otherSection],
          studentsEnroled: [ids.student],
          status: "Published",
        },
      ])
      await CourseProgress.collection.insertOne({
        courseID: ids.course,
        userId: ids.student,
        completedVideos: [ids.lessonOne, ids.lessonOne, ids.staleLesson],
        createdAt: acceptedAt,
        updatedAt: acceptedAt,
      })

      await new Promise((resolve, reject) => {
        server = app.listen(0, "127.0.0.1", (error) =>
          error ? reject(error) : resolve()
        )
      })
      baseUrl = `http://127.0.0.1:${server.address().port}`

      const studentCookie = sessionCookieFor(student)
      const outsiderCookie = sessionCookieFor(outsider)
      const learningPath = `/api/v2/learning/courses/${ids.course}`

      const enrolled = await requestJson(learningPath, {
        cookie: studentCookie,
        requestId: "learning-enrolled",
      })
      assert.equal(enrolled.response.status, 200)
      assert.equal(
        enrolled.response.headers.get("x-request-id"),
        enrolled.requestId
      )
      assert.equal(enrolled.body.requestId, enrolled.requestId)
      assert.equal(enrolled.body.data.course.id, ids.course.toString())
      assert.equal(enrolled.body.data.course.name, "Secure learning")
      assert.match(
        enrolled.body.data.course.thumbnailUrl,
        /^data:image\/svg\+xml/
      )
      assert.deepEqual(
        enrolled.body.data.curriculum.map((section) => section.id),
        [ids.sectionOne.toString(), ids.sectionTwo.toString()]
      )
      assert.deepEqual(
        enrolled.body.data.curriculum.flatMap((section) =>
          section.lessons.map((lesson) => lesson.id)
        ),
        [
          ids.lessonOne.toString(),
          ids.lessonTwo.toString(),
          ids.lessonThree.toString(),
        ]
      )
      assert.deepEqual(enrolled.body.data.progress, {
        courseId: ids.course.toString(),
        completedLessonIds: [ids.lessonOne.toString()],
        completedCount: 1,
        totalLessons: 3,
        progressPercent: 33.33,
        updatedAt: acceptedAt.toISOString(),
      })

      const serializedLearningState = JSON.stringify(enrolled.body)
      for (const privateValue of [
        ids.hiddenLearner.toString(),
        ids.instructor.toString(),
        hiddenLearner.email,
        "learning/private-introduction",
        "private.example.test",
        "studentsEnroled",
        "videoPublicId",
        "videoUrl",
        "userId",
      ]) {
        assert.equal(
          serializedLearningState.includes(privateValue),
          false,
          `learning response must not expose ${privateValue}`
        )
      }

      const unauthenticated = await requestJson(learningPath)
      assert.equal(unauthenticated.response.status, 401)
      assert.equal(unauthenticated.body.error.code, "UNAUTHORIZED")

      const notEnrolled = await requestJson(learningPath, {
        cookie: outsiderCookie,
      })
      assert.equal(notEnrolled.response.status, 403)
      assert.equal(notEnrolled.body.error.code, "LEARNING_ACCESS_DENIED")

      const missing = await requestJson(
        `/api/v2/learning/courses/${ids.missingCourse}`,
        { cookie: studentCookie }
      )
      assert.equal(missing.response.status, 404)
      assert.equal(missing.body.error.code, "LEARNING_COURSE_NOT_FOUND")

      const invalid = await requestJson(
        "/api/v2/learning/courses/not-an-object-id",
        { cookie: studentCookie }
      )
      assert.equal(invalid.response.status, 400)
      assert.equal(invalid.body.error.code, "INVALID_PARAMS")

      const zeroLessons = await requestJson(
        `/api/v2/learning/courses/${ids.zeroCourse}`,
        { cookie: studentCookie }
      )
      assert.equal(zeroLessons.response.status, 200)
      assert.deepEqual(zeroLessons.body.data.curriculum, [])
      assert.deepEqual(zeroLessons.body.data.progress, {
        courseId: ids.zeroCourse.toString(),
        completedLessonIds: [],
        completedCount: 0,
        totalLessons: 0,
        progressPercent: 0,
        updatedAt: null,
      })

      const unknownGetQuery = await requestJson(
        `${learningPath}?unexpected=1`,
        {
          cookie: studentCookie,
        }
      )
      assert.equal(unknownGetQuery.response.status, 400)
      assert.equal(unknownGetQuery.body.error.code, "INVALID_QUERY")

      const lessonTwoProgressPath = `${learningPath}/lessons/${ids.lessonTwo}/progress`
      const unknownPutBody = await requestJson(lessonTwoProgressPath, {
        body: { completed: true },
        cookie: studentCookie,
        method: "PUT",
      })
      assert.equal(unknownPutBody.response.status, 400)
      assert.equal(unknownPutBody.body.error.code, "INVALID_BODY")

      const unknownPutQuery = await requestJson(
        `${lessonTwoProgressPath}?completed=true`,
        { body: {}, cookie: studentCookie, method: "PUT" }
      )
      assert.equal(unknownPutQuery.response.status, 400)
      assert.equal(unknownPutQuery.body.error.code, "INVALID_QUERY")

      const invalidLesson = await requestJson(
        `${learningPath}/lessons/not-an-object-id/progress`,
        { body: {}, cookie: studentCookie, method: "PUT" }
      )
      assert.equal(invalidLesson.response.status, 400)
      assert.equal(invalidLesson.body.error.code, "INVALID_PARAMS")

      const notEnrolledProgress = await requestJson(lessonTwoProgressPath, {
        body: {},
        cookie: outsiderCookie,
        method: "PUT",
      })
      assert.equal(notEnrolledProgress.response.status, 403)
      assert.equal(
        notEnrolledProgress.body.error.code,
        "LEARNING_ACCESS_DENIED"
      )
      assert.equal(
        await CourseProgress.exists({
          courseID: ids.course,
          userId: ids.outsider,
        }),
        null
      )

      const crossCourse = await requestJson(
        `${learningPath}/lessons/${ids.otherLesson}/progress`,
        { body: {}, cookie: studentCookie, method: "PUT" }
      )
      assert.equal(crossCourse.response.status, 404)
      assert.equal(crossCourse.body.error.code, "LEARNING_LESSON_NOT_FOUND")
      assert.equal(
        await CourseProgress.exists({
          courseID: ids.course,
          completedVideos: ids.otherLesson,
          userId: ids.student,
        }),
        null
      )

      const completed = await requestJson(lessonTwoProgressPath, {
        body: {},
        cookie: studentCookie,
        method: "PUT",
      })
      assert.equal(completed.response.status, 200)
      assert.deepEqual(completed.body.data.completedLessonIds, [
        ids.lessonOne.toString(),
        ids.lessonTwo.toString(),
      ])
      assert.equal(completed.body.data.completedCount, 2)
      assert.equal(completed.body.data.totalLessons, 3)
      assert.equal(completed.body.data.progressPercent, 66.67)

      const repeated = await requestJson(lessonTwoProgressPath, {
        cookie: studentCookie,
        method: "PUT",
      })
      assert.equal(repeated.response.status, 200)
      assert.deepEqual(repeated.body.data.completedLessonIds, [
        ids.lessonOne.toString(),
        ids.lessonTwo.toString(),
      ])
      const storedLegacyProgress = await CourseProgress.collection.findOne({
        courseID: ids.course,
        userId: ids.student,
      })
      assert.equal(
        storedLegacyProgress.completedVideos.filter((lessonId) =>
          lessonId.equals(ids.lessonTwo)
        ).length,
        1
      )

      const concurrentBasePath = `/api/v2/learning/courses/${ids.concurrentCourse}`
      const concurrentResults = await Promise.all(
        [ids.concurrentLessonOne, ids.concurrentLessonTwo].map((lessonId) =>
          requestJson(`${concurrentBasePath}/lessons/${lessonId}/progress`, {
            cookie: studentCookie,
            method: "PUT",
          })
        )
      )
      assert.deepEqual(
        concurrentResults.map((result) => result.response.status),
        [200, 200]
      )

      const concurrentState = await requestJson(concurrentBasePath, {
        cookie: studentCookie,
      })
      assert.equal(concurrentState.response.status, 200)
      assert.deepEqual(concurrentState.body.data.progress.completedLessonIds, [
        ids.concurrentLessonOne.toString(),
        ids.concurrentLessonTwo.toString(),
      ])
      assert.equal(concurrentState.body.data.progress.progressPercent, 100)
      assert.equal(
        await CourseProgress.countDocuments({
          courseID: ids.concurrentCourse,
          userId: ids.student,
        }),
        1
      )

      const progressIndexes = await CourseProgress.collection.indexes()
      const compoundIndex = progressIndexes.find(
        (index) => index.key?.userId === 1 && index.key?.courseID === 1
      )
      assert.ok(compoundIndex, "course progress compound index must exist")
      assert.equal(compoundIndex.unique, true)

      const explain = await CourseProgress.collection
        .find({ courseID: ids.course, userId: ids.student })
        .explain("executionStats")
      assert.ok(
        findIndexScan(explain.queryPlanner?.winningPlan, compoundIndex.name),
        "course progress lookup should use its compound index"
      )
      assert.equal(explain.executionStats.totalDocsExamined <= 1, true)

      const scanResult = await redis.sendCommand(
        "SCAN",
        "0",
        "MATCH",
        "studynotion:rate-limit:api-ip:*",
        "COUNT",
        "100"
      )
      const rateLimitKeys = Array.isArray(scanResult)
        ? scanResult[1]
        : scanResult.keys
      assert.equal(rateLimitKeys.length > 0, true)
    } finally {
      if (server?.listening) {
        await new Promise((resolve) => server.close(() => resolve()))
      }
      if (mongoose.connection.readyState !== 0) {
        await mongoose.connection.dropDatabase()
      }
      if (redis.isReady()) await redis.sendCommand("FLUSHDB")
      await redis.disconnect()
      if (mongoose.connection.readyState !== 0) await mongoose.disconnect()
    }
  }
)

test("learning integration URI guards reject production-looking targets", () => {
  assert.throws(() =>
    assertDisposableMongoUri("mongodb+srv://cluster.mongodb.net/production")
  )
  assert.throws(() =>
    assertDisposableMongoUri(
      "mongodb://example.com/studynotion_learning_test_x"
    )
  )
  assert.throws(() =>
    assertDisposableMongoUri("mongodb://localhost/production")
  )
  assert.throws(() =>
    assertDisposableRedisUri("rediss://managed.example.com/15")
  )
  assert.throws(() => assertDisposableRedisUri("redis://127.0.0.1:6379/0"))
})
