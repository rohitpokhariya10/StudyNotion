const assert = require("node:assert/strict")
const { test } = require("node:test")

const enabled = process.env.STUDYNOTION_RUN_CATALOG_INTEGRATION === "1"

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

const winningPlanFromExplain = (explain) => {
  const cursor = explain.stages?.find((stage) => stage.$cursor)?.$cursor
  return cursor?.queryPlanner?.winningPlan || explain.queryPlanner?.winningPlan
}

const executionStatsFromExplain = (explain) => {
  const cursor = explain.stages?.find((stage) => stage.$cursor)?.$cursor
  return cursor?.executionStats || explain.executionStats
}

const assertDisposableMongoUri = (value) => {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Catalog integration tests cannot run in production")
  }
  if (!value || value.startsWith("mongodb+srv://")) {
    throw new Error(
      "CATALOG_TEST_MONGODB_URI must use a disposable local MongoDB"
    )
  }
  const url = new URL(value)
  const database = url.pathname.slice(1)
  if (!/^studynotion_catalog_test_[a-z0-9_-]+$/i.test(database)) {
    throw new Error(
      "The MongoDB database name must begin with studynotion_catalog_test_"
    )
  }
  if (!["127.0.0.1", "localhost", "mongo", "mongodb"].includes(url.hostname)) {
    throw new Error("Catalog integration MongoDB must be local or a CI service")
  }
  return value
}

const assertDisposableRedisUri = (value) => {
  if (!value) throw new Error("CATALOG_TEST_REDIS_URL is required")
  const url = new URL(value)
  if (!["127.0.0.1", "localhost", "redis"].includes(url.hostname)) {
    throw new Error("Catalog integration Redis must be local or a CI service")
  }
  if (!/^\/(?:1[4-5])$/.test(url.pathname)) {
    throw new Error(
      "Catalog integration Redis must use disposable database 14 or 15"
    )
  }
  return value
}

test(
  "v2 catalog runs through real MongoDB indexes and Redis-backed middleware",
  { skip: !enabled },
  async () => {
    const mongoUri = assertDisposableMongoUri(
      process.env.CATALOG_TEST_MONGODB_URI
    )
    const redisUri = assertDisposableRedisUri(
      process.env.CATALOG_TEST_REDIS_URL
    )

    process.env.NODE_ENV = "test"
    process.env.FRONTEND_URL = "http://localhost:3000"
    process.env.MONGODB_URL = mongoUri
    process.env.REDIS_URL = redisUri
    process.env.JWT_SECRET = "catalog-integration-jwt-secret-1234567890"
    process.env.OTP_SECRET = "catalog-integration-otp-secret-1234567890"

    const mongoose = require("mongoose")
    const redis = require("../config/redis")
    const { catalogCourseListQuerySchema } = require("@studynotion/contracts")
    const Course = require("../models/Course")
    const Category = require("../models/Category")
    const RatingAndReview = require("../models/RatingandReview")
    const Section = require("../models/Section")
    const SubSection = require("../models/Subsection")
    const User = require("../models/User")
    const {
      buildCatalogPipeline,
    } = require("../domains/catalog/catalogRepository")
    const { app } = require("../index")

    let server
    try {
      await mongoose.connect(mongoUri, { autoIndex: false })
      await redis.connect()
      await redis.sendCommand("FLUSHDB")
      await Promise.all([
        Course.createIndexes(),
        Category.createIndexes(),
        RatingAndReview.createIndexes(),
      ])

      const ids = {
        category: new mongoose.Types.ObjectId(),
        categoryOther: new mongoose.Types.ObjectId(),
        draft: new mongoose.Types.ObjectId(),
        instructor: new mongoose.Types.ObjectId(),
        lesson: new mongoose.Types.ObjectId(),
        published: new mongoose.Types.ObjectId(),
        publishedSecond: new mongoose.Types.ObjectId(),
        rating: new mongoose.Types.ObjectId(),
        section: new mongoose.Types.ObjectId(),
        student: new mongoose.Types.ObjectId(),
      }

      await Category.collection.insertMany([
        {
          _id: ids.category,
          name: "Engineering",
          description: "Engineering courses",
        },
        {
          _id: ids.categoryOther,
          name: "Design",
          description: "Design courses",
        },
      ])
      await User.collection.insertMany([
        {
          _id: ids.instructor,
          firstName: "Ada",
          lastName: "Lovelace",
          email: "catalog-instructor@example.test",
          accountType: "Instructor",
        },
        {
          _id: ids.student,
          firstName: "Learner",
          lastName: "Private",
          email: "private-learner@example.test",
          accountType: "Student",
        },
      ])
      await SubSection.collection.insertOne({
        _id: ids.lesson,
        title: "API security",
        timeDuration: "3600",
        videoUrl: "https://private.example.test/video.mp4",
        videoPublicId: "private-provider-id",
      })
      await Section.collection.insertOne({
        _id: ids.section,
        sectionName: "Security",
        subSection: [ids.lesson],
      })
      await Course.collection.insertMany([
        {
          _id: ids.published,
          courseName: "Secure Node APIs",
          courseDescription: "Build secure Node APIs.",
          instructor: ids.instructor,
          whatYouWillLearn: "Security",
          courseContent: [ids.section],
          ratingAndReviews: [ids.rating],
          price: 1499,
          thumbnail: "https://cdn.example.test/course.png",
          tag: ["node", "security"],
          category: ids.category,
          level: "advanced",
          language: "en",
          studentsEnroled: [ids.student],
          instructions: ["Practice"],
          status: "Published",
          createdAt: new Date("2026-03-01T00:00:00.000Z"),
          updatedAt: new Date("2026-03-01T00:00:00.000Z"),
        },
        {
          _id: ids.draft,
          courseName: "Draft Node Course",
          courseDescription: "Must stay private.",
          instructor: ids.instructor,
          whatYouWillLearn: "Draft",
          courseContent: [],
          ratingAndReviews: [],
          price: 10,
          thumbnail: "https://cdn.example.test/draft.png",
          tag: ["node"],
          category: ids.category,
          studentsEnroled: [],
          instructions: ["Draft"],
          status: "Draft",
          createdAt: new Date("2026-03-02T00:00:00.000Z"),
          updatedAt: new Date("2026-03-02T00:00:00.000Z"),
        },
        {
          _id: ids.publishedSecond,
          courseName: "Reliable Node Services",
          courseDescription: "Build observable Node services.",
          instructor: ids.instructor,
          whatYouWillLearn: "Reliability",
          courseContent: [],
          ratingAndReviews: [],
          price: 999,
          thumbnail: "https://cdn.example.test/reliable.png",
          tag: ["node", "reliability"],
          category: ids.category,
          level: "intermediate",
          language: "en",
          studentsEnroled: [],
          instructions: ["Measure"],
          status: "Published",
          createdAt: new Date("2026-03-03T00:00:00.000Z"),
          updatedAt: new Date("2026-03-03T00:00:00.000Z"),
        },
      ])
      await RatingAndReview.collection.insertOne({
        _id: ids.rating,
        course: ids.published,
        user: ids.student,
        rating: 5,
        review: "Private review body",
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      await new Promise((resolve, reject) => {
        server = app.listen(0, "127.0.0.1", (error) =>
          error ? reject(error) : resolve()
        )
      })
      const baseUrl = `http://127.0.0.1:${server.address().port}`
      const response = await fetch(
        `${baseUrl}/api/v2/courses?q=secure&level=advanced&language=en&minRating=4&minDurationSeconds=3000`
      )
      const body = await response.json()

      assert.equal(response.status, 200)
      assert.equal(body.data.items.length, 1)
      assert.equal(body.data.items[0].name, "Secure Node APIs")
      assert.equal(body.data.items[0].durationSeconds, 3600)
      assert.deepEqual(body.data.items[0].rating, { average: 5, count: 1 })
      const serialized = JSON.stringify(body)
      assert.equal(serialized.includes("Draft Node Course"), false)
      assert.equal(serialized.includes("private-learner"), false)
      assert.equal(serialized.includes("Private review body"), false)
      assert.equal(serialized.includes("private-provider-id"), false)

      const firstPageResponse = await fetch(
        `${baseUrl}/api/v2/courses?categoryId=${ids.category}&limit=1&sort=newest`
      )
      const firstPage = await firstPageResponse.json()
      assert.equal(firstPageResponse.status, 200)
      assert.equal(firstPage.data.items.length, 1)
      assert.equal(firstPage.data.items[0].name, "Reliable Node Services")
      assert.equal(firstPage.data.pageInfo.hasNextPage, true)
      assert.equal(typeof firstPage.data.pageInfo.endCursor, "string")

      const nextPageResponse = await fetch(
        `${baseUrl}/api/v2/courses?categoryId=${ids.category}&limit=1&sort=newest&cursor=${firstPage.data.pageInfo.endCursor}`
      )
      const nextPage = await nextPageResponse.json()
      assert.equal(nextPageResponse.status, 200)
      assert.equal(nextPage.data.items.length, 1)
      assert.equal(nextPage.data.items[0].name, "Secure Node APIs")
      assert.notEqual(nextPage.data.items[0].id, firstPage.data.items[0].id)

      const emptyResponse = await fetch(
        `${baseUrl}/api/v2/courses?categoryId=${ids.categoryOther}`
      )
      const empty = await emptyResponse.json()
      assert.equal(emptyResponse.status, 200)
      assert.deepEqual(empty.data.items, [])

      const indexes = await Course.collection.indexes()
      for (const indexName of [
        "catalog_category_newest",
        "catalog_published_newest",
        "catalog_published_text",
      ]) {
        assert.equal(
          indexes.some((index) => index.name === indexName),
          true,
          `${indexName} should exist`
        )
      }

      const explainQuery = catalogCourseListQuerySchema.parse({
        categoryId: ids.category.toString(),
        limit: "1",
        sort: "newest",
      })
      const explain = await Course.collection
        .aggregate(
          buildCatalogPipeline(explainQuery, null, explainQuery.limit + 1),
          { hint: "catalog_category_newest" }
        )
        .explain("executionStats")
      assert.ok(
        findIndexScan(
          winningPlanFromExplain(explain),
          "catalog_category_newest"
        ),
        "category/newest should use the catalog_category_newest IXSCAN"
      )
      assert.equal(
        executionStatsFromExplain(explain).totalDocsExamined <=
          explainQuery.limit + 1,
        true,
        "the indexed cursor stage must not examine beyond the bounded page"
      )

      const searchExplainQuery = catalogCourseListQuerySchema.parse({
        q: "secure",
      })
      const searchExplain = await Course.collection
        .aggregate(
          buildCatalogPipeline(
            searchExplainQuery,
            null,
            searchExplainQuery.limit + 1
          )
        )
        .explain("executionStats")
      assert.ok(
        findIndexScan(
          winningPlanFromExplain(searchExplain),
          "catalog_published_text"
        ),
        "full-text search should use the catalog_published_text IXSCAN"
      )

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
      // Both destructive cleanup targets are isolated by the URI guards above.
      if (mongoose.connection.readyState !== 0) {
        await mongoose.connection.dropDatabase()
      }
      if (redis.isReady()) await redis.sendCommand("FLUSHDB")
      await redis.disconnect()
      if (mongoose.connection.readyState !== 0) await mongoose.disconnect()
    }
  }
)

test("integration URI guards reject production-looking targets", () => {
  assert.throws(() =>
    assertDisposableMongoUri("mongodb+srv://cluster.mongodb.net/production")
  )
  assert.throws(() =>
    assertDisposableMongoUri("mongodb://example.com/studynotion_catalog_test_x")
  )
  assert.throws(() =>
    assertDisposableRedisUri("rediss://managed.example.com/0")
  )
})
