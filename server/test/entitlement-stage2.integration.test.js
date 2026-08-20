const assert = require("node:assert/strict")
const { spawnSync } = require("node:child_process")
const crypto = require("node:crypto")
const path = require("node:path")
const { test } = require("node:test")

const enabled =
  process.env.STUDYNOTION_RUN_ENTITLEMENT_STAGE2_INTEGRATION === "1"

const ALLOWED_MONGO_HOSTS = new Set([
  "127.0.0.1",
  "[::1]",
  "localhost",
  "mongo",
  "mongodb",
])
const DATABASE_PATTERN = /^studynotion_entitlement_stage2_test_[a-z0-9_-]+$/i
const serverRoot = path.resolve(__dirname, "..")

const assertDisposableMongoUri = (value, environment = process.env) => {
  if (environment.NODE_ENV === "production") {
    throw new Error("Entitlement Stage 2 integration cannot run in production")
  }
  if (typeof value !== "string" || !value) {
    throw new Error("ENTITLEMENT_STAGE2_TEST_MONGODB_URI is required")
  }
  if (/^mongodb\+srv:/i.test(value)) {
    throw new Error("Entitlement Stage 2 integration rejects SRV MongoDB URIs")
  }

  let url
  try {
    url = new URL(value)
  } catch {
    throw new Error(
      "ENTITLEMENT_STAGE2_TEST_MONGODB_URI must be a valid MongoDB URI"
    )
  }
  if (url.protocol !== "mongodb:") {
    throw new Error("Entitlement Stage 2 integration requires mongodb://")
  }

  const authority = value
    .slice("mongodb://".length)
    .split("/", 1)[0]
    .split("@")
    .at(-1)
  if (authority.includes(",") || !ALLOWED_MONGO_HOSTS.has(url.hostname)) {
    throw new Error(
      "Entitlement Stage 2 integration MongoDB must be a single local or CI host"
    )
  }

  let databaseName
  try {
    databaseName = decodeURIComponent(url.pathname.slice(1))
  } catch {
    throw new Error("Entitlement Stage 2 integration database name is invalid")
  }
  if (!DATABASE_PATTERN.test(databaseName)) {
    throw new Error(
      "The MongoDB database name must begin with studynotion_entitlement_stage2_test_"
    )
  }
  return Object.freeze({ databaseName, uri: value })
}

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

const findStage = (value, expectedStage) => {
  if (!value || typeof value !== "object") return null
  if (value.stage === expectedStage) return value
  for (const child of Object.values(value)) {
    const match = findStage(child, expectedStage)
    if (match) return match
  }
  return null
}

const winningPlanFromExplain = (explain) => {
  const cursor = explain.stages?.find((stage) => stage.$cursor)?.$cursor
  return cursor?.queryPlanner?.winningPlan || explain.queryPlanner?.winningPlan
}

const executionStatsFromExplain = (explain) =>
  explain.executionStats ||
  explain.stages?.find((stage) => stage.$cursor)?.$cursor?.executionStats

const assertQueryUsesIndex = async ({
  indexName,
  maximumDocumentsExamined,
  query,
}) => {
  const explain = await query.hint(indexName).explain("executionStats")
  assert.ok(
    findIndexScan(winningPlanFromExplain(explain), indexName),
    `${indexName} should be used by the winning plan`
  )
  const executionStats = executionStatsFromExplain(explain)
  assert.ok(executionStats, `${indexName} execution stats should exist`)
  assert.ok(
    executionStats.nReturned >= 1,
    `${indexName} should return fixture data`
  )
  assert.ok(
    executionStats.totalDocsExamined <= maximumDocumentsExamined,
    `${indexName} should examine at most ${maximumDocumentsExamined} documents`
  )
}

test("Entitlement Stage 2 integration MongoDB guard rejects unsafe targets", () => {
  assert.throws(() => assertDisposableMongoUri())
  assert.throws(() =>
    assertDisposableMongoUri(
      "mongodb://127.0.0.1:27017/studynotion_entitlement_stage2_test_prod",
      { NODE_ENV: "production" }
    )
  )
  assert.throws(() =>
    assertDisposableMongoUri(
      "mongodb+srv://localhost/studynotion_entitlement_stage2_test_ci"
    )
  )
  assert.throws(() =>
    assertDisposableMongoUri(
      "mongodb://production.example.com/studynotion_entitlement_stage2_test_ci"
    )
  )
  assert.throws(() =>
    assertDisposableMongoUri(
      "mongodb://localhost:27017,localhost:27018/studynotion_entitlement_stage2_test_ci"
    )
  )
  assert.throws(() =>
    assertDisposableMongoUri("mongodb://localhost:27017/studynotion")
  )
  assert.equal(
    assertDisposableMongoUri(
      "mongodb://127.0.0.1:27017/studynotion_entitlement_stage2_test_guard"
    ).databaseName,
    "studynotion_entitlement_stage2_test_guard"
  )
})

test(
  "Entitlement Stage 2 sidecars and recovery converge safely on MongoDB 8",
  { skip: !enabled, timeout: 240_000 },
  async () => {
    const target = assertDisposableMongoUri(
      process.env.ENTITLEMENT_STAGE2_TEST_MONGODB_URI
    )
    const mongoose = require("mongoose")
    const Course = require("../models/Course")
    const CourseProgress = require("../models/CourseProgress")
    const Entitlement = require("../models/Entitlement")
    const EntitlementOperationAudit = require("../models/EntitlementOperationAudit")
    const Purchase = require("../models/Purchase")
    const User = require("../models/User")
    const {
      createEntitlementRecoveryService,
    } = require("../domains/entitlement/entitlementRecoveryService")
    const {
      createEntitlementRepository,
    } = require("../domains/entitlement/entitlementRepository")
    const {
      createEntitlementService,
    } = require("../domains/entitlement/entitlementService")

    const wallClock = new Date()
    const boundary = new Date(wallClock.getTime() - 60 * 60 * 1000)
    const operationNow = new Date(wallClock.getTime() - 10 * 60 * 1000)
    const quietLogger = Object.freeze({
      error() {},
      errorMetadata(error) {
        return { name: error?.name || "Error" }
      },
      info() {},
      warn() {},
    })
    let fixtureSequence = 0
    let leaseSequence = 0

    const nextFixtureName = (prefix) => {
      fixtureSequence += 1
      return `${prefix}-${fixtureSequence}`
    }

    const purchaseDocument = ({
      courseIds,
      paidAt = new Date(boundary.getTime() + 60_000),
      status = "paid",
      studentId,
      ...overrides
    }) => {
      const name = nextFixtureName("purchase")
      return {
        _id: new mongoose.Types.ObjectId(),
        user: studentId,
        courses: courseIds,
        lineItems: courseIds.map((courseId, index) => ({
          amount: 1000 + index,
          course: courseId,
          courseName: `Stage 2 Course ${index + 1}`,
        })),
        status,
        paidAt,
        razorpayPaymentId: `pay_${name}`,
        receipt: `receipt_${name}`,
        createdAt: paidAt,
        updatedAt: paidAt,
        ...overrides,
      }
    }

    const insertStudent = async (overrides = {}) => {
      const _id = overrides._id || new mongoose.Types.ObjectId()
      const name = nextFixtureName("student")
      const document = {
        _id,
        firstName: "Stage",
        lastName: "Student",
        email: `${name}@example.test`,
        accountType: "Student",
        active: true,
        approved: true,
        authProviders: ["local"],
        courses: [],
        courseProgress: [],
        deletionPending: false,
        createdAt: wallClock,
        updatedAt: wallClock,
        ...overrides,
      }
      await User.collection.insertOne(document)
      return document
    }

    const insertCourse = async (overrides = {}) => {
      const document = {
        _id: overrides._id || new mongoose.Types.ObjectId(),
        status: "Published",
        studentsEnroled: [],
        createdAt: wallClock,
        updatedAt: wallClock,
        ...overrides,
      }
      await Course.collection.insertOne(document)
      return document
    }

    const insertPurchase = async (document) => {
      await Purchase.collection.insertOne(document)
      return document
    }

    const grantLegacy = async ({ courseId, studentId }) => {
      const progressId = new mongoose.Types.ObjectId()
      await CourseProgress.collection.updateOne(
        { courseID: courseId, userId: studentId },
        {
          $setOnInsert: {
            _id: progressId,
            completedVideos: [],
            courseID: courseId,
            createdAt: wallClock,
            updatedAt: wallClock,
            userId: studentId,
          },
        },
        { upsert: true }
      )
      await User.collection.updateOne(
        { _id: studentId },
        { $addToSet: { courseProgress: progressId, courses: courseId } }
      )
      await Course.collection.updateOne(
        { _id: courseId },
        { $addToSet: { studentsEnroled: studentId } }
      )
    }

    const setPurchaseFulfilled = async (purchase, fulfilledAt) => {
      await Purchase.collection.updateOne(
        { _id: purchase._id },
        { $set: { fulfilledAt, status: "fulfilled", updatedAt: fulfilledAt } }
      )
      purchase.fulfilledAt = fulfilledAt
      purchase.status = "fulfilled"
      return purchase
    }

    const runControlledIndexCreation = () => {
      const result = spawnSync(
        process.execPath,
        ["scripts/create-indexes.js"],
        {
          cwd: serverRoot,
          encoding: "utf8",
          env: {
            ...process.env,
            MONGODB_URI: target.uri,
            NODE_ENV: "test",
          },
          timeout: 120_000,
        }
      )
      assert.equal(
        result.status,
        0,
        [result.error?.message, result.stdout, result.stderr]
          .filter(Boolean)
          .join("\n")
      )
      assert.match(result.stdout, /Indexes ready: Entitlement\b/)
      assert.match(result.stdout, /Indexes ready: EntitlementOperationAudit\b/)
    }

    const dropGuardedDatabase = async () => {
      assert.equal(mongoose.connection.name, target.databaseName)
      assert.match(mongoose.connection.name, DATABASE_PATTERN)
      await mongoose.connection.dropDatabase()
    }

    let connected = false
    try {
      await mongoose.connect(target.uri, {
        autoIndex: false,
        serverSelectionTimeoutMS: 10_000,
      })
      connected = true
      await dropGuardedDatabase()

      const buildInfo = await mongoose.connection.db
        .admin()
        .command({ buildInfo: 1 })
      assert.equal(
        Number.parseInt(buildInfo.version.split(".", 1)[0], 10),
        8,
        "Entitlement Stage 2 integration requires MongoDB major 8"
      )

      runControlledIndexCreation()
      await Entitlement.collection.createIndex(
        { updatedAt: 1 },
        { name: "entitlement_stage2_additive_sentinel" }
      )
      runControlledIndexCreation()
      assert.ok(
        (await Entitlement.collection.indexes()).some(
          ({ name }) => name === "entitlement_stage2_additive_sentinel"
        ),
        "the real index script must be idempotent and preserve additive indexes"
      )

      const repository = createEntitlementRepository()
      const sidecar = createEntitlementService({
        clock: () => operationNow,
        repository,
        sidecarStartedAt: boundary,
        targetLogger: quietLogger,
      })
      const recovery = (clock, options = {}) =>
        createEntitlementRecoveryService({
          clock,
          createLeaseId:
            options.createLeaseId ||
            (() => {
              leaseSequence += 1
              return `stage2-lease-${leaseSequence}`
            }),
          failpoint: options.failpoint,
          repository,
          sidecarService: options.sidecarService || sidecar,
          sidecarStartedAt: boundary,
          targetLogger: quietLogger,
        })

      // Raw Purchase pagination is deliberately bounded before the lookup.
      // Historical rows therefore consume scan capacity, but a continuation
      // advances deterministically without causing historical writes.
      const boundaryStudent = await insertStudent()
      const boundaryCourses = []
      for (let index = 0; index < 12; index += 1) {
        boundaryCourses.push(await insertCourse())
      }
      const preBoundaryPurchases = []
      for (let index = 0; index < 15; index += 1) {
        preBoundaryPurchases.push(
          await insertPurchase(
            purchaseDocument({
              courseIds: [boundaryCourses[0]._id],
              paidAt: new Date(boundary.getTime() - 60_000 - index),
              studentId: boundaryStudent._id,
            })
          )
        )
      }
      const preBoundaryInFlightPurchase = await insertPurchase(
        purchaseDocument({
          courseIds: [boundaryCourses[0]._id],
          createdAt: new Date(boundary.getTime() - 1),
          paidAt: new Date(boundary.getTime() + 1),
          studentId: boundaryStudent._id,
        })
      )
      const boundaryPurchases = []
      for (const [index, course] of boundaryCourses.entries()) {
        boundaryPurchases.push(
          await insertPurchase(
            purchaseDocument({
              courseIds: [course._id],
              paidAt: new Date(boundary.getTime() + 60_000 + index),
              studentId: boundaryStudent._id,
            })
          )
        )
      }

      const boundarySidecar = createEntitlementService({
        // Recovery passes one absolute batch deadline into catch-up, so the
        // sidecar and runner must share the same wall-clock domain.
        clock: () => wallClock,
        repository,
        sidecarStartedAt: boundary,
        targetLogger: quietLogger,
      })
      const firstBoundaryReport = await recovery(() => wallClock, {
        sidecarService: boundarySidecar,
      }).runBatch({ limit: 12 })
      assert.equal(firstBoundaryReport.catchUp.examinedCount, 12)
      assert.equal(firstBoundaryReport.catchUp.reservedCount, 0)
      assert.equal(firstBoundaryReport.catchUp.hasMore, true)
      assert.equal(
        firstBoundaryReport.catchUp.continuation.toString(),
        preBoundaryPurchases[11]._id.toString()
      )
      assert.equal(firstBoundaryReport.status, "warning")

      const secondBoundaryReport = await recovery(() => wallClock, {
        sidecarService: boundarySidecar,
      }).runBatch({
        continuation: firstBoundaryReport.catchUp.continuation,
        limit: 12,
      })
      assert.equal(secondBoundaryReport.catchUp.examinedCount, 12)
      assert.equal(secondBoundaryReport.catchUp.reservedCount, 8)
      assert.equal(secondBoundaryReport.catchUp.hasMore, true)
      assert.equal(
        secondBoundaryReport.catchUp.continuation.toString(),
        boundaryPurchases[7]._id.toString()
      )
      assert.equal(secondBoundaryReport.status, "warning")

      const boundaryReport = await recovery(() => wallClock, {
        sidecarService: boundarySidecar,
      }).runBatch({
        continuation: secondBoundaryReport.catchUp.continuation,
        limit: 12,
      })
      assert.equal(boundaryReport.catchUp.examinedCount, 4)
      assert.equal(boundaryReport.catchUp.reservedCount, 4)
      assert.equal(boundaryReport.catchUp.hasMore, false)
      assert.equal(boundaryReport.catchUp.continuation, undefined)
      assert.equal(boundaryReport.status, "completed")
      assert.equal(
        JSON.stringify(boundaryReport).includes(
          boundaryPurchases[0]._id.toString()
        ),
        false,
        "aggregate recovery reports must not expose identifiers"
      )
      assert.equal(
        await Entitlement.countDocuments({
          purchaseId: {
            $in: [
              ...preBoundaryPurchases.map(({ _id }) => _id),
              preBoundaryInFlightPurchase._id,
            ],
          },
        }),
        0
      )
      await assert.rejects(
        sidecar.reserveForPurchase({ purchase: preBoundaryPurchases[0] }),
        (error) => error?.code === "PURCHASE_BEFORE_SIDECAR_BOUNDARY"
      )
      await assert.rejects(
        sidecar.reserveForPurchase({ purchase: preBoundaryInFlightPurchase }),
        (error) => error?.code === "PURCHASE_BEFORE_SIDECAR_BOUNDARY"
      )

      // The real browser-verification and signed-webhook controllers can hold
      // the same stale order_created view concurrently. Let the webhook win
      // while the browser provider fetch is in flight, then prove the browser
      // replay preserves both exact API contracts and every legacy/sidecar
      // singleton on real MongoDB. Only the external provider and email
      // transports are replaced; controllers, models, and sidecars stay real.
      const controllerStudent = await insertStudent()
      const controllerCourse = await insertCourse({
        courseName: "Stage 2 controller race",
      })
      const controllerRaceAt = new Date()
      const controllerOrderId = "order_stage2_controller_race"
      const controllerPaymentId = "pay_stage2_controller_race"
      const controllerPurchase = purchaseDocument({
        amount: 1000,
        checkoutAcknowledgedAt: controllerRaceAt,
        checkoutExpiresAt: new Date(controllerRaceAt.getTime() + 10 * 60_000),
        checkoutPolicySource: "web_checkout",
        checkoutTermsVersion: "2026-07",
        courseIds: [controllerCourse._id],
        createdAt: controllerRaceAt,
        currency: "INR",
        paidAt: controllerRaceAt,
        razorpayOrderId: controllerOrderId,
        refundPolicyVersion: "2026-07",
        refundWindowDays: 7,
        status: "order_created",
        studentId: controllerStudent._id,
        updatedAt: controllerRaceAt,
      })
      delete controllerPurchase.paidAt
      delete controllerPurchase.razorpayPaymentId
      await insertPurchase(controllerPurchase)

      const controllerEnvironment = {
        ENTITLEMENT_SIDECAR_STARTED_AT:
          process.env.ENTITLEMENT_SIDECAR_STARTED_AT,
        FRONTEND_ORIGINS: process.env.FRONTEND_ORIGINS,
        JWT_SECRET: process.env.JWT_SECRET,
        LOG_LEVEL: process.env.LOG_LEVEL,
        MONGODB_URI: process.env.MONGODB_URI,
        NODE_ENV: process.env.NODE_ENV,
        OTP_SECRET: process.env.OTP_SECRET,
        RAZORPAY_SECRET: process.env.RAZORPAY_SECRET,
        RAZORPAY_WEBHOOK_SECRET: process.env.RAZORPAY_WEBHOOK_SECRET,
      }
      const restoreControllerEnvironment = () => {
        for (const [key, value] of Object.entries(controllerEnvironment)) {
          if (value === undefined) delete process.env[key]
          else process.env[key] = value
        }
      }
      process.env.ENTITLEMENT_SIDECAR_STARTED_AT = boundary.toISOString()
      process.env.FRONTEND_ORIGINS = "http://localhost:3000"
      process.env.JWT_SECRET = "stage2-controller-jwt-secret-00000001"
      process.env.LOG_LEVEL = "error"
      process.env.MONGODB_URI = target.uri
      process.env.NODE_ENV = "test"
      process.env.OTP_SECRET = "stage2-controller-otp-secret-00000002"
      process.env.RAZORPAY_SECRET = "stage2-controller-browser-secret"
      process.env.RAZORPAY_WEBHOOK_SECRET = "stage2-controller-webhook-secret"

      let browserFetchEnteredResolve
      let browserFetchReleaseResolve
      const browserFetchEntered = new Promise((resolve) => {
        browserFetchEnteredResolve = resolve
      })
      const browserFetchRelease = new Promise((resolve) => {
        browserFetchReleaseResolve = resolve
      })
      const deliveredEnrollmentEmails = []
      const provider = {
        payments: {
          fetch: async (paymentId) => {
            assert.equal(paymentId, controllerPaymentId)
            browserFetchEnteredResolve()
            await browserFetchRelease
            return {
              amount: controllerPurchase.amount,
              currency: controllerPurchase.currency,
              order_id: controllerOrderId,
              status: "captured",
            }
          },
          fetchMultipleRefund: async () => ({ items: [] }),
          refund: async (_paymentId, options) => ({
            amount: options.amount,
            id: "rfnd_stage2_controller_race",
            status: "processed",
          }),
        },
      }
      const installMock = (request, exports) => {
        const filename = require.resolve(request)
        const previous = require.cache[filename]
        require.cache[filename] = {
          id: filename,
          filename,
          loaded: true,
          exports,
        }
        return () => {
          if (previous) require.cache[filename] = previous
          else delete require.cache[filename]
        }
      }
      const restoreRazorpay = installMock("../config/razorpay", {
        instance: provider,
      })
      const restoreMailSender = installMock(
        "../utils/mailSender",
        async (...args) => {
          deliveredEnrollmentEmails.push(args)
          return { response: "stage2-controller-email" }
        }
      )
      const paymentsControllerPath = require.resolve("../controllers/payments")
      const previousPaymentsController = require.cache[paymentsControllerPath]
      delete require.cache[paymentsControllerPath]

      const createControllerResponse = () => ({
        body: undefined,
        statusCode: 200,
        json(body) {
          this.body = body
          return this
        },
        status(statusCode) {
          this.statusCode = statusCode
          return this
        },
      })

      try {
        const paymentsController = require(paymentsControllerPath)
        const browserSignature = crypto
          .createHmac("sha256", process.env.RAZORPAY_SECRET)
          .update(`${controllerOrderId}|${controllerPaymentId}`)
          .digest("hex")
        const browserResponse = createControllerResponse()
        const browserRequest = {
          body: {
            razorpay_order_id: controllerOrderId,
            razorpay_payment_id: controllerPaymentId,
            razorpay_signature: browserSignature,
          },
          requestId: "stage2-browser-race",
          user: { id: controllerStudent._id.toString() },
        }
        const browserVerification = paymentsController.verifyPayment(
          browserRequest,
          browserResponse
        )
        await browserFetchEntered

        const webhookPayload = Buffer.from(
          JSON.stringify({
            event: "payment.captured",
            payload: {
              payment: {
                entity: {
                  amount: controllerPurchase.amount,
                  currency: controllerPurchase.currency,
                  id: controllerPaymentId,
                  order_id: controllerOrderId,
                  status: "captured",
                },
              },
            },
          })
        )
        const webhookSignature = crypto
          .createHmac("sha256", process.env.RAZORPAY_WEBHOOK_SECRET)
          .update(webhookPayload)
          .digest("hex")
        const webhookResponse = createControllerResponse()
        await paymentsController.razorpayWebhook(
          {
            body: webhookPayload,
            get: (name) =>
              name.toLowerCase() === "x-razorpay-signature"
                ? webhookSignature
                : undefined,
            requestId: "stage2-webhook-race",
          },
          webhookResponse
        )
        browserFetchReleaseResolve()
        await browserVerification

        assert.equal(webhookResponse.statusCode, 200)
        assert.deepEqual(webhookResponse.body, {
          success: true,
          message: "Payment webhook processed",
        })
        assert.equal(browserResponse.statusCode, 200)
        assert.deepEqual(browserResponse.body, {
          success: true,
          message: "Payment Verified",
        })

        const [persistedControllerPurchase, persistedControllerStudent] =
          await Promise.all([
            Purchase.findById(controllerPurchase._id).lean(),
            User.findById(controllerStudent._id).lean(),
          ])
        assert.equal(persistedControllerPurchase.status, "fulfilled")
        assert.equal(
          persistedControllerPurchase.razorpayPaymentId,
          controllerPaymentId
        )
        assert.ok(persistedControllerPurchase.fulfilledAt instanceof Date)
        assert.equal(
          persistedControllerStudent.courses.filter(
            (courseId) =>
              courseId.toString() === controllerCourse._id.toString()
          ).length,
          1
        )
        assert.equal(
          (
            await Course.findById(controllerCourse._id).lean()
          ).studentsEnroled.filter(
            (studentId) =>
              studentId.toString() === controllerStudent._id.toString()
          ).length,
          1
        )
        const controllerProgress = await CourseProgress.find({
          courseID: controllerCourse._id,
          userId: controllerStudent._id,
        }).lean()
        assert.equal(controllerProgress.length, 1)
        assert.equal(
          persistedControllerStudent.courseProgress.filter(
            (progressId) =>
              progressId.toString() === controllerProgress[0]._id.toString()
          ).length,
          1
        )
        const controllerEpisodes = await Entitlement.find({
          courseId: controllerCourse._id,
          purchaseId: controllerPurchase._id,
          studentId: controllerStudent._id,
        }).lean()
        assert.equal(controllerEpisodes.length, 1)
        assert.equal(controllerEpisodes[0].status, "active")
        assert.equal(controllerEpisodes[0].isCurrent, true)
        assert.equal(controllerEpisodes[0].revision, 1)
        assert.equal(
          controllerEpisodes[0].grantedAt.getTime(),
          persistedControllerPurchase.fulfilledAt.getTime()
        )
        assert.equal(deliveredEnrollmentEmails.length, 1)
        assert.equal(deliveredEnrollmentEmails[0][0], controllerStudent.email)
        assert.equal(
          deliveredEnrollmentEmails[0][1],
          "Successfully Enrolled into Stage 2 controller race"
        )

        const duplicateWebhookResponse = createControllerResponse()
        await paymentsController.razorpayWebhook(
          {
            body: webhookPayload,
            get: (name) =>
              name.toLowerCase() === "x-razorpay-signature"
                ? webhookSignature
                : undefined,
            requestId: "stage2-webhook-replay",
          },
          duplicateWebhookResponse
        )
        const duplicateBrowserResponse = createControllerResponse()
        await paymentsController.verifyPayment(
          { ...browserRequest, requestId: "stage2-browser-replay" },
          duplicateBrowserResponse
        )
        assert.deepEqual(duplicateWebhookResponse.body, {
          success: true,
          message: "Payment webhook processed",
        })
        assert.deepEqual(duplicateBrowserResponse.body, {
          success: true,
          message: "Payment Verified",
        })
        assert.equal(deliveredEnrollmentEmails.length, 1)

        // Hold a real repurchase after its Purchase is captured/paid and its
        // first legacy writes have begun, then finish the older refund. The
        // refund cleanup must recognize the paid replacement, preserve the
        // shared mirrors/progress, and let B finish with the sole current
        // Entitlement after A is terminal.
        const repurchaseOrderId = "order_stage2_refund_repurchase"
        const repurchasePaymentId = "pay_stage2_refund_repurchase"
        const repurchaseAt = new Date()
        const repurchase = purchaseDocument({
          amount: controllerPurchase.amount,
          checkoutAcknowledgedAt: repurchaseAt,
          checkoutExpiresAt: new Date(repurchaseAt.getTime() + 10 * 60_000),
          checkoutPolicySource: "web_checkout",
          checkoutTermsVersion: "2026-07",
          courseIds: [controllerCourse._id],
          createdAt: repurchaseAt,
          currency: "INR",
          paidAt: repurchaseAt,
          razorpayOrderId: repurchaseOrderId,
          refundPolicyVersion: "2026-07",
          refundWindowDays: 7,
          status: "order_created",
          studentId: controllerStudent._id,
          updatedAt: repurchaseAt,
        })
        delete repurchase.paidAt
        delete repurchase.razorpayPaymentId
        await insertPurchase(repurchase)
        const refundRequestedAt = new Date()
        await Purchase.collection.updateOne(
          { _id: controllerPurchase._id },
          {
            $set: {
              refundRequestedAt,
              status: "refund_requested",
              updatedAt: refundRequestedAt,
            },
          }
        )

        let repurchaseLegacyEnteredResolve
        let repurchaseLegacyReleaseResolve
        const repurchaseLegacyEntered = new Promise((resolve) => {
          repurchaseLegacyEnteredResolve = resolve
        })
        const repurchaseLegacyRelease = new Promise((resolve) => {
          repurchaseLegacyReleaseResolve = resolve
        })
        const originalCourseUpdateMany = Course.updateMany
        let pauseRepurchaseMirror = true
        Course.updateMany = async function (filter, update, options) {
          if (
            pauseRepurchaseMirror &&
            update?.$addToSet?.studentsEnroled?.toString() ===
              controllerStudent._id.toString()
          ) {
            pauseRepurchaseMirror = false
            repurchaseLegacyEnteredResolve()
            await repurchaseLegacyRelease
          }
          return originalCourseUpdateMany.call(this, filter, update, options)
        }

        try {
          const repurchasePayload = Buffer.from(
            JSON.stringify({
              event: "payment.captured",
              payload: {
                payment: {
                  entity: {
                    amount: repurchase.amount,
                    currency: repurchase.currency,
                    id: repurchasePaymentId,
                    order_id: repurchaseOrderId,
                    status: "captured",
                  },
                },
              },
            })
          )
          const repurchaseSignature = crypto
            .createHmac("sha256", process.env.RAZORPAY_WEBHOOK_SECRET)
            .update(repurchasePayload)
            .digest("hex")
          const repurchaseResponse = createControllerResponse()
          const repurchaseFulfillment = paymentsController.razorpayWebhook(
            {
              body: repurchasePayload,
              get: (name) =>
                name.toLowerCase() === "x-razorpay-signature"
                  ? repurchaseSignature
                  : undefined,
              requestId: "stage2-repurchase-race",
            },
            repurchaseResponse
          )
          await repurchaseLegacyEntered
          assert.equal(
            (await Purchase.findById(repurchase._id).lean()).status,
            "paid"
          )

          const refundResponse = createControllerResponse()
          await paymentsController.resolvePaymentReview(
            {
              body: {
                action: "refund",
                confirmation: "REFUND PAYMENT",
                note: "Refund A while captured repurchase B is fulfilling.",
              },
              params: { purchaseId: controllerPurchase._id.toString() },
              requestId: "stage2-stale-refund-race",
              user: { id: new mongoose.Types.ObjectId().toString() },
            },
            refundResponse
          )
          assert.equal(refundResponse.statusCode, 200)
          assert.deepEqual(refundResponse.body, {
            success: true,
            data: {
              purchaseId: controllerPurchase._id.toString(),
              refundId: "rfnd_stage2_controller_race",
              resolution: "refunded",
            },
            message: "Payment refunded and reconciliation closed",
          })

          repurchaseLegacyReleaseResolve()
          await repurchaseFulfillment
          assert.equal(repurchaseResponse.statusCode, 200)
          assert.deepEqual(repurchaseResponse.body, {
            success: true,
            message: "Payment webhook processed",
          })
        } finally {
          repurchaseLegacyReleaseResolve()
          Course.updateMany = originalCourseUpdateMany
        }

        const [refundedA, fulfilledB, raceStudent, raceCourse, raceEpisodes] =
          await Promise.all([
            Purchase.findById(controllerPurchase._id).lean(),
            Purchase.findById(repurchase._id).lean(),
            User.findById(controllerStudent._id).lean(),
            Course.findById(controllerCourse._id).lean(),
            Entitlement.find({
              courseId: controllerCourse._id,
              studentId: controllerStudent._id,
            }).lean(),
          ])
        assert.equal(refundedA.status, "refunded")
        assert.equal(fulfilledB.status, "fulfilled")
        assert.equal(
          raceStudent.courses.filter(
            (courseId) =>
              courseId.toString() === controllerCourse._id.toString()
          ).length,
          1
        )
        assert.equal(
          raceCourse.studentsEnroled.filter(
            (studentId) =>
              studentId.toString() === controllerStudent._id.toString()
          ).length,
          1
        )
        assert.equal(
          await CourseProgress.countDocuments({
            courseID: controllerCourse._id,
            userId: controllerStudent._id,
          }),
          1
        )
        assert.deepEqual(raceEpisodes.map(({ status }) => status).sort(), [
          "active",
          "revoked",
        ])
        assert.equal(
          raceEpisodes.filter(
            ({ isCurrent, purchaseId, status }) =>
              isCurrent === true &&
              purchaseId.toString() === repurchase._id.toString() &&
              status === "active"
          ).length,
          1
        )
      } finally {
        browserFetchReleaseResolve()
        delete require.cache[paymentsControllerPath]
        if (previousPaymentsController) {
          require.cache[paymentsControllerPath] = previousPaymentsController
        }
        restoreMailSender()
        restoreRazorpay()
        restoreControllerEnvironment()
      }

      // Duplicate payment-style handlers converge on one natural-key episode,
      // and concurrent activation advances its exact revision once.
      const studentA = await insertStudent()
      const courseA = await insertCourse()
      const purchaseA = await insertPurchase(
        purchaseDocument({
          courseIds: [courseA._id],
          studentId: studentA._id,
        })
      )
      const duplicateReservations = await Promise.allSettled([
        sidecar.reserveForPurchase({ now: operationNow, purchase: purchaseA }),
        sidecar.reserveForPurchase({ now: operationNow, purchase: purchaseA }),
      ])
      assert.equal(
        duplicateReservations.filter(({ status }) => status === "fulfilled")
          .length,
        2
      )
      assert.equal(
        await Entitlement.countDocuments({
          courseId: courseA._id,
          purchaseId: purchaseA._id,
        }),
        1
      )
      let episodeA = await Entitlement.findOne({ purchaseId: purchaseA._id })
        .select("+nextReconciliationAt +reconciliationAttempts")
        .lean()
      assert.equal(episodeA.status, "provisioning")
      assert.equal(episodeA.revision, 0)
      assert.equal(episodeA.reconciliationAttempts, 0)

      const fulfilledAAt = new Date(boundary.getTime() + 20 * 60 * 1000)
      await grantLegacy({ courseId: courseA._id, studentId: studentA._id })
      await setPurchaseFulfilled(purchaseA, fulfilledAAt)
      const duplicateActivations = await Promise.allSettled([
        sidecar.activateForPurchase({ purchaseId: purchaseA._id }),
        sidecar.activateForPurchase({ purchaseId: purchaseA._id }),
      ])
      assert.equal(
        duplicateActivations.filter(({ status }) => status === "fulfilled")
          .length,
        2
      )
      episodeA = await Entitlement.findOne({ purchaseId: purchaseA._id })
        .select("+nextReconciliationAt")
        .lean()
      assert.equal(episodeA.status, "active")
      assert.equal(episodeA.revision, 1)
      assert.equal(episodeA.grantedAt.getTime(), fulfilledAAt.getTime())
      assert.equal(episodeA.nextReconciliationAt, undefined)

      // A processed refund may race a repurchase reservation. Retrying the
      // repurchase after A is terminal converges, and replaying A cannot touch B.
      const purchaseB = await insertPurchase(
        purchaseDocument({
          courseIds: [courseA._id],
          paidAt: new Date(boundary.getTime() + 30 * 60 * 1000),
          studentId: studentA._id,
        })
      )
      const refundProcessedAt = new Date(boundary.getTime() + 40 * 60 * 1000)
      const refundRevokedAt = new Date(boundary.getTime() + 41 * 60 * 1000)
      await Purchase.collection.updateOne(
        { _id: purchaseA._id },
        {
          $set: {
            refundEntitlementsRevokedAt: refundRevokedAt,
            refundOriginStatus: "refund_requested",
            refundProcessedAt,
            refundProviderStatus: "processed",
            status: "refund_pending",
          },
        }
      )
      await Promise.allSettled([
        sidecar.terminalizeProcessedRefund({ purchaseId: purchaseA._id }),
        sidecar.reserveForPurchase({ purchase: purchaseB }),
      ])
      await sidecar.reserveForPurchase({ purchase: purchaseB })
      const fulfilledBAt = new Date(boundary.getTime() + 42 * 60 * 1000)
      await setPurchaseFulfilled(purchaseB, fulfilledBAt)
      await sidecar.activateForPurchase({ purchaseId: purchaseB._id })
      await sidecar.terminalizeProcessedRefund({ purchaseId: purchaseA._id })

      const [terminalA, activeB] = await Promise.all([
        Entitlement.findOne({ purchaseId: purchaseA._id })
          .select(
            "+replacementDecision +replacementOutcome +replacementPurchaseId +supersededByEntitlementId"
          )
          .lean(),
        Entitlement.findOne({ purchaseId: purchaseB._id }).lean(),
      ])
      assert.equal(terminalA.status, "revoked")
      assert.equal(terminalA.isCurrent, false)
      assert.equal(terminalA.revision, 2)
      assert.equal(terminalA.revokedAt.getTime(), refundRevokedAt.getTime())
      assert.equal(terminalA.replacementDecision, undefined)
      assert.equal(terminalA.replacementOutcome, undefined)
      assert.equal(terminalA.replacementPurchaseId, undefined)
      assert.equal(terminalA.supersededByEntitlementId, undefined)
      assert.equal(activeB.status, "active")
      assert.equal(activeB.isCurrent, true)
      assert.equal(activeB.revision, 1)
      assert.equal(activeB.grantedAt.getTime(), fulfilledBAt.getTime())

      await Purchase.collection.updateOne(
        { _id: purchaseB._id },
        {
          $set: {
            refundOriginStatus: "refund_requested",
            refundProviderStatus: "pending",
            status: "refund_pending",
          },
        }
      )
      const pendingRefundReplay = await sidecar.activateForPurchase({
        purchaseId: purchaseB._id,
      })
      assert.equal(pendingRefundReplay.activatedCount, 0)
      await assert.rejects(
        sidecar.terminalizeProcessedRefund({ purchaseId: purchaseB._id }),
        (error) => error?.code === "REFUND_EVIDENCE_INVALID"
      )
      assert.equal(
        (await Entitlement.findOne({ purchaseId: purchaseB._id }).lean())
          .status,
        "active"
      )
      await Purchase.collection.updateOne(
        { _id: purchaseB._id },
        {
          $set: { status: "fulfilled" },
          $unset: { refundOriginStatus: "", refundProviderStatus: "" },
        }
      )

      // Different Purchases racing for one current pair cannot both reserve.
      const conflictStudent = await insertStudent()
      const conflictCourse = await insertCourse()
      const conflictingPurchases = await Promise.all([
        insertPurchase(
          purchaseDocument({
            courseIds: [conflictCourse._id],
            studentId: conflictStudent._id,
          })
        ),
        insertPurchase(
          purchaseDocument({
            courseIds: [conflictCourse._id],
            studentId: conflictStudent._id,
          })
        ),
      ])
      const currentPairRace = await Promise.allSettled(
        conflictingPurchases.map((purchase) =>
          sidecar.reserveForPurchase({ purchase })
        )
      )
      assert.equal(
        currentPairRace.filter(({ status }) => status === "fulfilled").length,
        1
      )
      assert.equal(
        currentPairRace.filter(
          ({ reason, status }) =>
            status === "rejected" && reason?.code === "CURRENT_PAIR_CONFLICT"
        ).length,
        1
      )
      assert.equal(
        await Entitlement.countDocuments({
          courseId: conflictCourse._id,
          isCurrent: true,
          studentId: conflictStudent._id,
        }),
        1
      )
      const conflictWinnerIndex = currentPairRace.findIndex(
        ({ status }) => status === "fulfilled"
      )
      const conflictWinnerPurchase = conflictingPurchases[conflictWinnerIndex]
      await grantLegacy({
        courseId: conflictCourse._id,
        studentId: conflictStudent._id,
      })
      await setPurchaseFulfilled(
        conflictWinnerPurchase,
        new Date(boundary.getTime() + 45 * 60 * 1000)
      )
      await sidecar.activateForPurchase({
        purchaseId: conflictWinnerPurchase._id,
      })

      // Two workers race the exact due CAS. A crashed winner consumes its
      // attempt; expiry release advances revision and fences the stale worker.
      const recoveryStudent = await insertStudent()
      const recoveryCourse = await insertCourse()
      const recoveryPurchase = await insertPurchase(
        purchaseDocument({
          courseIds: [recoveryCourse._id],
          studentId: recoveryStudent._id,
        })
      )
      await sidecar.reserveForPurchase({
        now: operationNow,
        purchase: recoveryPurchase,
      })
      const concurrentClaimDatabaseTime = await repository.readDatabaseTime()
      await Entitlement.collection.updateOne(
        { purchaseId: recoveryPurchase._id },
        {
          $set: {
            nextReconciliationAt: new Date(
              concurrentClaimDatabaseTime.getTime() - 1_000
            ),
          },
        }
      )
      const claimAt = new Date(wallClock.getTime() + 2 * 60 * 1000)
      const claimantOne = recovery(() => claimAt, {
        createLeaseId: () => "stage2-concurrent-lease-one",
      })
      const claimantTwo = recovery(() => claimAt, {
        createLeaseId: () => "stage2-concurrent-lease-two",
      })
      const claims = await Promise.all([
        claimantOne.claimDueProvisioning(),
        claimantTwo.claimDueProvisioning(),
      ])
      assert.equal(claims.filter(Boolean).length, 1)
      const staleClaim = claims.find(Boolean)
      assert.equal(staleClaim.reconciliationAttempts, 1)
      assert.equal(staleClaim.revision, 1)

      // Move only the persisted lease boundary behind MongoDB's own clock;
      // recovery scheduling never trusts the synthetic process clock.
      const expiryDatabaseTime = await repository.readDatabaseTime()
      await Entitlement.collection.updateOne(
        { _id: staleClaim._id, revision: staleClaim.revision },
        {
          $set: {
            reconciliationLeaseUntil: new Date(
              expiryDatabaseTime.getTime() - 1_000
            ),
          },
        }
      )
      const releaseStartedAt = await repository.readDatabaseTime()
      const expiryResult = await recovery(() => wallClock).sweepExpiredLease()
      const releaseCompletedAt = await repository.readDatabaseTime()
      assert.deepEqual(expiryResult, { outcome: "expired_lease_released" })
      let persistedRecovery = await Entitlement.findById(staleClaim._id)
        .select(
          "+nextReconciliationAt +reconciliationAttempts +reconciliationLeaseId +reconciliationLeaseUntil"
        )
        .lean()
      assert.equal(persistedRecovery.revision, 2)
      assert.equal(persistedRecovery.reconciliationAttempts, 1)
      assert.equal(persistedRecovery.reconciliationLeaseId, undefined)
      assert.ok(
        persistedRecovery.nextReconciliationAt >=
          new Date(releaseStartedAt.getTime() + 5 * 60 * 1000) &&
          persistedRecovery.nextReconciliationAt <=
            new Date(releaseCompletedAt.getTime() + 5 * 60 * 1000)
      )

      const recoveryFulfilledAt = new Date(boundary.getTime() + 50 * 60 * 1000)
      await grantLegacy({
        courseId: recoveryCourse._id,
        studentId: recoveryStudent._id,
      })
      await setPurchaseFulfilled(recoveryPurchase, recoveryFulfilledAt)
      const restartDatabaseTime = await repository.readDatabaseTime()
      await Entitlement.collection.updateOne(
        { _id: staleClaim._id, revision: persistedRecovery.revision },
        {
          $set: {
            nextReconciliationAt: new Date(
              restartDatabaseTime.getTime() - 1_000
            ),
          },
        }
      )
      const restartedWorker = recovery(() => wallClock)
      const restartedClaim = await restartedWorker.claimDueProvisioning()
      assert.equal(restartedClaim.reconciliationAttempts, 2)
      assert.equal(restartedClaim.revision, 3)
      const staleResult = await claimantOne.processClaimedEpisode(staleClaim)
      assert.deepEqual(staleResult, { outcome: "conflict" })
      persistedRecovery = await Entitlement.findById(staleClaim._id)
        .select(
          "+reconciliationAttempts +reconciliationLeaseId +reconciliationLeaseUntil"
        )
        .lean()
      assert.equal(persistedRecovery.status, "provisioning")
      assert.equal(persistedRecovery.revision, restartedClaim.revision)
      assert.equal(
        persistedRecovery.reconciliationLeaseId,
        restartedClaim.reconciliationLeaseId,
        "stale worker A must not disturb worker B's replacement lease"
      )
      assert.equal(
        persistedRecovery.reconciliationLeaseUntil.getTime(),
        restartedClaim.reconciliationLeaseUntil.getTime()
      )
      assert.deepEqual(
        await restartedWorker.processClaimedEpisode(restartedClaim),
        { outcome: "activated" }
      )
      persistedRecovery = await Entitlement.findById(staleClaim._id).lean()
      assert.equal(persistedRecovery.status, "active")
      assert.equal(persistedRecovery.revision, 4)
      assert.equal(
        persistedRecovery.grantedAt.getTime(),
        recoveryFulfilledAt.getTime()
      )

      // Retry state survives five independently constructed worker instances
      // and persists the exact 5m/30m/2h/12h schedule before manual review.
      const manualStudent = await insertStudent()
      const manualCourse = await insertCourse()
      const manualFulfilledAt = new Date(boundary.getTime() + 25 * 60 * 1000)
      const manualPurchase = await insertPurchase(
        purchaseDocument({
          courseIds: [manualCourse._id],
          fulfilledAt: manualFulfilledAt,
          status: "fulfilled",
          studentId: manualStudent._id,
        })
      )
      const manualAttemptStart = new Date(wallClock.getTime() - 2 * 60 * 1000)
      await sidecar.reserveForPurchase({
        now: manualAttemptStart,
        purchase: manualPurchase,
      })
      let manualEpisode = await Entitlement.findOne({
        purchaseId: manualPurchase._id,
      })
        .select("+nextReconciliationAt +reconciliationAttempts")
        .lean()
      const retryDelays = [
        5 * 60 * 1000,
        30 * 60 * 1000,
        2 * 60 * 60 * 1000,
        12 * 60 * 60 * 1000,
      ]
      for (let attempt = 1; attempt <= 5; attempt += 1) {
        const dueDatabaseTime = await repository.readDatabaseTime()
        await Entitlement.collection.updateOne(
          { _id: manualEpisode._id, revision: manualEpisode.revision },
          {
            $set: {
              nextReconciliationAt: new Date(dueDatabaseTime.getTime() - 1_000),
            },
          }
        )
        const restarted = recovery(() => wallClock)
        const claim = await restarted.claimDueProvisioning()
        assert.equal(claim.reconciliationAttempts, attempt)
        const attemptStartedAt = await repository.readDatabaseTime()
        const result = await restarted.processClaimedEpisode(claim)
        const attemptCompletedAt = await repository.readDatabaseTime()
        assert.equal(result.outcome, attempt === 5 ? "manual_review" : "retry")
        manualEpisode = await Entitlement.findById(claim._id)
          .select(
            "+lastReconciliationCode +manualReviewRequiredAt +nextReconciliationAt +reconciliationAttempts +reconciliationLeaseId"
          )
          .lean()
        assert.equal(manualEpisode.reconciliationAttempts, attempt)
        assert.equal(
          manualEpisode.lastReconciliationCode,
          "compatibility_write_failed"
        )
        assert.equal(manualEpisode.reconciliationLeaseId, undefined)
        if (attempt < 5) {
          assert.ok(
            manualEpisode.nextReconciliationAt >=
              new Date(attemptStartedAt.getTime() + retryDelays[attempt - 1]) &&
              manualEpisode.nextReconciliationAt <=
                new Date(
                  attemptCompletedAt.getTime() + retryDelays[attempt - 1]
                )
          )
        } else {
          assert.equal(manualEpisode.nextReconciliationAt, undefined)
          assert.ok(
            manualEpisode.manualReviewRequiredAt >= attemptStartedAt &&
              manualEpisode.manualReviewRequiredAt <= attemptCompletedAt
          )
        }
      }

      // Exact retained deletion tombstones terminalize Purchase-driven catch-up;
      // a replay has no work and uses deletionStartedAt as the event timestamp.
      const deletionStudentId = new mongoose.Types.ObjectId()
      const deletionTerminalAt = new Date(boundary.getTime() + 55 * 60 * 1000)
      const deletionUpdatedAt = new Date(deletionTerminalAt.getTime() + 30_000)
      await insertStudent({
        _id: deletionStudentId,
        active: false,
        approved: false,
        authProviders: [],
        courses: [],
        courseProgress: [],
        deletionPending: false,
        deletionStartedAt: deletionTerminalAt,
        email: `deleted-${deletionStudentId.toString()}@users.invalid`,
        firstName: "Deleted",
        image: "",
        instructorApprovalStatus: "NotApplicable",
        lastName: "Account",
        updatedAt: deletionUpdatedAt,
      })

      const deletedPurchaseCourse = await insertCourse()
      const deletedPurchase = await insertPurchase(
        purchaseDocument({
          courseIds: [deletedPurchaseCourse._id],
          fulfilledAt: new Date(deletionTerminalAt.getTime() - 2 * 60_000),
          paidAt: new Date(deletionTerminalAt.getTime() - 3 * 60_000),
          status: "fulfilled",
          studentId: deletionStudentId,
        })
      )
      const deletedCatchUp = await sidecar.catchUpBoundaryPurchases({
        afterId: manualPurchase._id.toString(),
        limit: 10,
      })
      assert.equal(deletedCatchUp.examinedCount, 1)
      assert.equal(deletedCatchUp.failedCount, 0)
      assert.equal(deletedCatchUp.terminalizedCount, 1)
      const deletedPurchaseEpisode = await Entitlement.findOne({
        purchaseId: deletedPurchase._id,
      }).lean()
      assert.equal(deletedPurchaseEpisode.status, "revoked")
      assert.equal(deletedPurchaseEpisode.isCurrent, false)
      assert.equal(deletedPurchaseEpisode.revocationReason, "account_deleted")
      assert.equal(
        deletedPurchaseEpisode.revokedAt.getTime(),
        deletionTerminalAt.getTime()
      )
      assert.notEqual(
        deletedPurchaseEpisode.revokedAt.getTime(),
        deletionUpdatedAt.getTime()
      )
      const replayedDeletedCatchUp = await sidecar.catchUpBoundaryPurchases({
        afterId: manualPurchase._id.toString(),
        limit: 10,
      })
      assert.equal(replayedDeletedCatchUp.examinedCount, 1)
      assert.equal(replayedDeletedCatchUp.reservedCount, 0)
      assert.equal(replayedDeletedCatchUp.activatedCount, 0)
      assert.equal(replayedDeletedCatchUp.terminalizedCount, 0)
      assert.equal(replayedDeletedCatchUp.failedCount, 0)
      assert.equal(
        await Entitlement.countDocuments({ purchaseId: deletedPurchase._id }),
        1,
        "completed-deletion replay may rescan the raw Purchase but must not write"
      )

      const deletionCourses = [await insertCourse(), await insertCourse()]
      const activeDeletionPurchase = await insertPurchase(
        purchaseDocument({
          courseIds: [deletionCourses[0]._id],
          fulfilledAt: new Date(deletionTerminalAt.getTime() - 60_000),
          paidAt: new Date(deletionTerminalAt.getTime() - 2 * 60_000),
          status: "fulfilled",
          studentId: deletionStudentId,
        })
      )
      const provisioningDeletionPurchase = await insertPurchase(
        purchaseDocument({
          courseIds: [deletionCourses[1]._id],
          fulfilledAt: new Date(deletionTerminalAt.getTime() - 30_000),
          paidAt: new Date(deletionTerminalAt.getTime() - 90_000),
          status: "fulfilled",
          studentId: deletionStudentId,
        })
      )
      const deletionEpisodes = await Entitlement.create([
        {
          courseId: deletionCourses[0]._id,
          createdAt: activeDeletionPurchase.paidAt,
          grantedAt: activeDeletionPurchase.fulfilledAt,
          purchaseId: activeDeletionPurchase._id,
          source: "purchase",
          status: "active",
          studentId: deletionStudentId,
          updatedAt: activeDeletionPurchase.fulfilledAt,
        },
        {
          courseId: deletionCourses[1]._id,
          createdAt: provisioningDeletionPurchase.paidAt,
          nextReconciliationAt: new Date(wallClock.getTime() + 60_000),
          purchaseId: provisioningDeletionPurchase._id,
          source: "purchase",
          status: "provisioning",
          studentId: deletionStudentId,
          updatedAt: provisioningDeletionPurchase.paidAt,
        },
      ])
      const currentDeletionCatchUp = await sidecar.catchUpBoundaryPurchases({
        afterId: deletedPurchase._id.toString(),
        limit: 2,
      })
      assert.equal(currentDeletionCatchUp.examinedCount, 2)
      assert.equal(currentDeletionCatchUp.failedCount, 0)
      assert.equal(currentDeletionCatchUp.hasMore, false)
      const persistedDeletionEpisodes = await Entitlement.find({
        _id: { $in: deletionEpisodes.map(({ _id }) => _id) },
      }).lean()
      assert.deepEqual(
        persistedDeletionEpisodes.map(({ status }) => status).sort(),
        ["cancelled", "revoked"]
      )
      for (const episode of persistedDeletionEpisodes) {
        assert.equal(episode.isCurrent, false)
        assert.equal(episode.revision, 1)
        const terminalAt = episode.revokedAt || episode.cancelledAt
        assert.equal(terminalAt.getTime(), deletionTerminalAt.getTime())
        assert.notEqual(terminalAt.getTime(), deletionUpdatedAt.getTime())
      }
      const currentDeletionReplay = await sidecar.catchUpBoundaryPurchases({
        afterId: deletedPurchase._id.toString(),
        limit: 2,
      })
      assert.equal(currentDeletionReplay.examinedCount, 2)
      assert.equal(currentDeletionReplay.failedCount, 0)
      assert.equal(currentDeletionReplay.reservedCount, 0)
      assert.equal(currentDeletionReplay.terminalizedCount, 0)
      assert.equal(
        await Entitlement.countDocuments({
          purchaseId: {
            $in: [activeDeletionPurchase._id, provisioningDeletionPurchase._id],
          },
        }),
        2,
        "completed-deletion continuation replay must not duplicate episodes"
      )

      // A full raw page of coherent, already-resolved Purchases cannot starve
      // completed-deletion work. The protected continuation advances past the
      // healthy page and the following invocation terminalizes the tombstone.
      const deletionPaginationAnchor = await Purchase.findOne()
        .sort({ _id: -1 })
        .select({ _id: 1 })
        .lean()
      const poisonedDeletionCourse = await insertCourse()
      const poisonedDeletionEpisode = await Entitlement.create({
        courseId: poisonedDeletionCourse._id,
        createdAt: new Date(boundary.getTime() + 50 * 60 * 1000),
        grantedAt: new Date(boundary.getTime() + 51 * 60 * 1000),
        purchaseId: new mongoose.Types.ObjectId(),
        source: "purchase",
        status: "active",
        studentId: deletionStudentId,
        updatedAt: new Date(boundary.getTime() + 51 * 60 * 1000),
      })
      const ignoredPaginationCourse = await insertCourse()
      const ignoredPaginationPurchases = Array.from({ length: 101 }, () => {
        const purchase = purchaseDocument({
          courseIds: [ignoredPaginationCourse._id],
          paidAt: new Date(boundary.getTime() + 59 * 60 * 1000),
          status: "failed",
          studentId: boundaryStudent._id,
        })
        delete purchase.paidAt
        delete purchase.razorpayPaymentId
        return purchase
      })
      await Purchase.collection.insertMany(ignoredPaginationPurchases)
      const paginatedDeletionCourse = await insertCourse()
      const paginatedDeletionPurchase = await insertPurchase(
        purchaseDocument({
          courseIds: [paginatedDeletionCourse._id],
          fulfilledAt: new Date(deletionTerminalAt.getTime() - 20_000),
          paidAt: new Date(deletionTerminalAt.getTime() - 40_000),
          status: "fulfilled",
          studentId: deletionStudentId,
        })
      )
      const healthyDeletionPage = await sidecar.catchUpBoundaryPurchases({
        afterId: deletionPaginationAnchor._id.toString(),
        limit: 100,
      })
      assert.equal(healthyDeletionPage.examinedCount, 100)
      assert.equal(healthyDeletionPage.failedCount, 0)
      assert.equal(healthyDeletionPage.terminalizedCount, 0)
      assert.equal(healthyDeletionPage.hasMore, true)
      const continuedDeletionPage = await sidecar.catchUpBoundaryPurchases({
        afterId: healthyDeletionPage.nextCursor,
        limit: 100,
      })
      assert.equal(continuedDeletionPage.examinedCount, 2)
      assert.equal(continuedDeletionPage.failedCount, 0)
      assert.equal(continuedDeletionPage.terminalizedCount, 1)
      assert.equal(continuedDeletionPage.hasMore, false)
      const paginatedDeletionEpisode = await Entitlement.findOne({
        purchaseId: paginatedDeletionPurchase._id,
      }).lean()
      assert.equal(paginatedDeletionEpisode.status, "revoked")
      assert.equal(paginatedDeletionEpisode.isCurrent, false)
      assert.equal(
        paginatedDeletionEpisode.revokedAt.getTime(),
        deletionTerminalAt.getTime()
      )
      const persistedPoisonedDeletionEpisode = await Entitlement.findById(
        poisonedDeletionEpisode._id
      ).lean()
      assert.equal(persistedPoisonedDeletionEpisode.status, "active")
      assert.equal(persistedPoisonedDeletionEpisode.isCurrent, true)

      const mismatchBeforeMalformed = (
        await recovery(() => wallClock).getOperationalStatus()
      ).counts.boundaryLifecycleMismatches
      const malformedFinancialStudent = await insertStudent()
      const malformedFinancialCourse = await insertCourse()
      const malformedFinancialPurchase = await insertPurchase(
        purchaseDocument({
          courseIds: [malformedFinancialCourse._id],
          refundOriginStatus: "refund_requested",
          refundProviderStatus: "provider_unknown",
          status: "refund_pending",
          studentId: malformedFinancialStudent._id,
        })
      )
      const malformedFinancialStatus = await recovery(
        () => wallClock
      ).getOperationalStatus()
      assert.equal(malformedFinancialStatus.status, "blocking")
      assert.ok(
        malformedFinancialStatus.counts.boundaryLifecycleMismatches >=
          mismatchBeforeMalformed + 1
      )
      assert.equal(
        await Entitlement.countDocuments({
          purchaseId: malformedFinancialPurchase._id,
        }),
        0
      )
      const malformedActivationEpisode = await Entitlement.create({
        courseId: malformedFinancialCourse._id,
        createdAt: malformedFinancialPurchase.paidAt,
        nextReconciliationAt: new Date(wallClock.getTime() + 60_000),
        purchaseId: malformedFinancialPurchase._id,
        source: "purchase",
        status: "provisioning",
        studentId: malformedFinancialStudent._id,
        updatedAt: malformedFinancialPurchase.paidAt,
      })
      await assert.rejects(
        sidecar.activateForPurchase({
          purchaseId: malformedFinancialPurchase._id,
        }),
        (error) => error?.code === "PURCHASE_NOT_ACTIVATABLE"
      )
      assert.equal(
        (await Entitlement.findById(malformedActivationEpisode._id).lean())
          .status,
        "provisioning"
      )
      await Promise.all([
        Entitlement.collection.deleteOne({
          _id: malformedActivationEpisode._id,
        }),
        Purchase.collection.deleteOne({
          _id: malformedFinancialPurchase._id,
        }),
      ])

      // A full first page of permanently failing unresolved Purchases cannot
      // hide later work: bounded status pagination reaches beyond the first
      // page, and an explicit private continuation advances recovery too.
      const failingCourse = await insertCourse()
      const missingStudentId = new mongoose.Types.ObjectId()
      const permanentlyFailingPurchases = Array.from(
        { length: 101 },
        (_, index) =>
          purchaseDocument({
            courseIds: [failingCourse._id],
            paidAt: new Date(boundary.getTime() + 57 * 60 * 1000 + index),
            studentId: missingStudentId,
          })
      )
      await Purchase.collection.insertMany(permanentlyFailingPurchases)
      const laterStudent = await insertStudent()
      const laterCourse = await insertCourse()
      const laterPurchase = await insertPurchase(
        purchaseDocument({
          courseIds: [laterCourse._id],
          paidAt: new Date(boundary.getTime() + 58 * 60 * 1000),
          studentId: laterStudent._id,
        })
      )

      const inconclusiveStatus = await recovery(
        () => wallClock
      ).getOperationalStatus()
      assert.equal(inconclusiveStatus.status, "blocking")
      assert.equal(inconclusiveStatus.truncated.boundary, false)
      assert.ok(inconclusiveStatus.counts.boundaryMissingEpisodes >= 101)

      const stalledCatchUp = await recovery(() => wallClock).runBatch({
        continuation: paginatedDeletionPurchase._id.toString(),
        limit: 100,
      })
      assert.equal(stalledCatchUp.catchUp.examinedCount, 100)
      assert.equal(stalledCatchUp.catchUp.failedCount, 100)
      assert.equal(stalledCatchUp.catchUp.hasMore, true)
      assert.equal(stalledCatchUp.status, "warning")
      assert.equal(
        stalledCatchUp.catchUp.continuation,
        permanentlyFailingPurchases[99]._id.toString()
      )
      assert.equal(JSON.stringify(stalledCatchUp).includes("nextCursor"), false)
      assert.equal(
        await Entitlement.countDocuments({ purchaseId: laterPurchase._id }),
        0
      )

      const continuedCatchUp = await recovery(() => wallClock).runBatch({
        continuation: stalledCatchUp.catchUp.continuation,
        limit: 2,
      })
      assert.equal(continuedCatchUp.catchUp.examinedCount, 2)
      assert.equal(continuedCatchUp.catchUp.failedCount, 1)
      assert.equal(continuedCatchUp.catchUp.reservedCount, 1)
      assert.equal(continuedCatchUp.catchUp.hasMore, false)
      assert.equal(continuedCatchUp.catchUp.continuation, undefined)
      assert.equal(
        await Entitlement.countDocuments({ purchaseId: laterPurchase._id }),
        1,
        "the supplied continuation must reach work after a permanently failing page"
      )

      assert.equal(
        await EntitlementOperationAudit.countDocuments(),
        0,
        "automatic sidecar and recovery work must not fabricate a system audit actor"
      )

      // Leave explicit due/expired fixtures for exact execution-plan checks.
      const expiredPlanEpisode = await Entitlement.create({
        courseId: new mongoose.Types.ObjectId(),
        purchaseId: new mongoose.Types.ObjectId(),
        reconciliationAttempts: 1,
        reconciliationLeaseId: "stage2-plan-expired",
        reconciliationLeaseUntil: new Date(wallClock.getTime() - 60_000),
        revision: 1,
        source: "purchase",
        status: "provisioning",
        studentId: new mongoose.Types.ObjectId(),
      })
      const agedPlanCreatedAfter = new Date(
        wallClock.getTime() - 48 * 60 * 60 * 1000
      )
      const agedPlanCreatedBefore = new Date(
        wallClock.getTime() - 24 * 60 * 60 * 1000
      )
      await Entitlement.create({
        _id: mongoose.Types.ObjectId.createFromTime(
          Math.floor(
            new Date(wallClock.getTime() - 25 * 60 * 60 * 1000).getTime() /
              1_000
          )
        ),
        courseId: new mongoose.Types.ObjectId(),
        createdAt: new Date(wallClock.getTime() - 25 * 60 * 60 * 1000),
        nextReconciliationAt: new Date(wallClock.getTime() - 60_000),
        purchaseId: new mongoose.Types.ObjectId(),
        source: "purchase",
        status: "provisioning",
        studentId: new mongoose.Types.ObjectId(),
        updatedAt: wallClock,
      })
      const expiredPrevious = await Entitlement.findById(expiredPlanEpisode._id)
        .select(
          "+reconciliationAttempts +reconciliationLeaseId +reconciliationLeaseUntil"
        )
        .lean()
      const expiredNext = {
        ...expiredPrevious,
        grantedAt: new Date(),
        revision: expiredPrevious.revision + 1,
        status: "active",
      }
      delete expiredNext.reconciliationLeaseId
      delete expiredNext.reconciliationLeaseUntil
      const staleClientClock = new Date(
        expiredPrevious.reconciliationLeaseUntil.getTime() - 60_000
      )
      assert.equal(
        await repository.transitionEpisode({
          createdAtGte: boundary,
          leaseValidAt: staleClientClock,
          next: expiredNext,
          previous: expiredPrevious,
        }),
        null,
        "server $$NOW must reject finalization after the persisted lease expired even when the worker clock is stale"
      )
      const stillExpired = await Entitlement.findById(expiredPlanEpisode._id)
        .select("+reconciliationLeaseId +reconciliationLeaseUntil")
        .lean()
      assert.equal(stillExpired.status, "provisioning")
      assert.equal(stillExpired.revision, 1)
      assert.equal(stillExpired.reconciliationLeaseId, "stage2-plan-expired")
      await EntitlementOperationAudit.create({
        action: "retry_activation",
        actorId: new mongoose.Types.ObjectId(),
        entitlementId: expiredPlanEpisode._id,
        expectedRevision: expiredPlanEpisode.revision,
        operationId: "stage2-plan-operation",
        reason: "Guarded query-plan fixture for the private audit index.",
        requestedAt: wallClock,
      })

      const queryNow = new Date(wallClock.getTime() + 5 * 60 * 1000)
      const boundaryObjectId = mongoose.Types.ObjectId.createFromTime(
        Math.floor(boundary.getTime() / 1_000)
      )
      const purchaseBoundaryRangeCardinality = await Purchase.countDocuments({
        _id: { $gte: boundaryObjectId },
      })
      const catchUpExplain = await repository.explainBoundaryPurchaseCandidates(
        {
          limit: 1,
          startedAt: boundary,
        }
      )
      assert.ok(
        findIndexScan(winningPlanFromExplain(catchUpExplain), "_id_"),
        "boundary catch-up must use the bounded Purchase ObjectId range"
      )
      assert.equal(
        findStage(catchUpExplain, "COLLSCAN"),
        null,
        "boundary catch-up fixture must not use a collection scan"
      )
      const catchUpExecution = executionStatsFromExplain(catchUpExplain)
      assert.ok(catchUpExecution.nReturned >= 1)
      assert.ok(
        catchUpExecution.nReturned <= 2,
        "the Purchase cursor must return at most the raw limit + 1 page"
      )
      assert.ok(
        catchUpExecution.totalDocsExamined <= 2,
        "the Purchase cursor must examine at most the raw limit + 1 page"
      )
      assert.ok(
        catchUpExecution.totalKeysExamined <= 2,
        "the Purchase cursor must examine at most the raw limit + 1 index keys"
      )
      assert.ok(
        catchUpExecution.totalDocsExamined <= purchaseBoundaryRangeCardinality,
        "examined documents must remain within the post-boundary ObjectId cohort"
      )
      assert.ok(
        catchUpExplain.stages.at(-1).nReturned >= 1 &&
          catchUpExplain.stages.at(-1).nReturned <= 2,
        "the hinted aggregate must keep the raw Purchase page at limit + 1"
      )
      const entitlementLookupExplain = catchUpExplain.stages.find(
        (stage) => stage.$lookup?.as === "entitlementEpisodes"
      )
      assert.ok(
        entitlementLookupExplain,
        "Entitlement lookup explain is missing"
      )
      assert.ok(
        entitlementLookupExplain.indexesUsed?.includes(
          "unique_entitlement_purchase_course"
        ),
        "the bounded foreign lookup must use the Purchase/Course natural key"
      )
      assert.equal(entitlementLookupExplain.collectionScans, 0)
      assert.ok(
        entitlementLookupExplain.totalDocsExamined <= 42,
        "two raw Purchases may examine at most 2 * (20 + overflow sentinel) Entitlements"
      )
      assert.ok(
        entitlementLookupExplain.totalKeysExamined <= 42,
        "the bounded foreign lookup must examine at most the Entitlement overflow-sentinel key budget"
      )
      const userLookupExplain = catchUpExplain.stages.find(
        (stage) => stage.$lookup?.as === "entitlementUser"
      )
      assert.ok(userLookupExplain, "User lookup explain is missing")
      assert.ok(
        userLookupExplain.indexesUsed?.includes("_id_"),
        "the trusted-User lookup must use the User primary key"
      )
      assert.equal(userLookupExplain.collectionScans, 0)
      assert.ok(
        userLookupExplain.totalDocsExamined <= 2,
        "the User lookup must examine at most one identity per raw Purchase"
      )
      assert.ok(
        userLookupExplain.totalKeysExamined <= 2,
        "the User lookup must examine at most one primary-key entry per raw Purchase"
      )

      await assertQueryUsesIndex({
        indexName: "unique_entitlement_purchase_course",
        maximumDocumentsExamined: 1,
        query: Entitlement.find({
          courseId: activeB.courseId,
          purchaseId: activeB.purchaseId,
        }).limit(1),
      })
      await assertQueryUsesIndex({
        indexName: "unique_current_entitlement_student_course",
        maximumDocumentsExamined: 1,
        query: Entitlement.find({
          courseId: activeB.courseId,
          isCurrent: true,
          studentId: activeB.studentId,
        }).limit(1),
      })
      await assertQueryUsesIndex({
        indexName: "entitlement_stale_provisioning",
        maximumDocumentsExamined: 10,
        query: Entitlement.find({
          nextReconciliationAt: { $lte: queryNow },
          status: "provisioning",
        })
          .sort({ nextReconciliationAt: 1, _id: 1 })
          .limit(10),
      })
      await assertQueryUsesIndex({
        indexName: "entitlement_expired_reconciliation_lease",
        maximumDocumentsExamined: 10,
        query: Entitlement.find({
          reconciliationLeaseUntil: { $lte: queryNow },
          status: "provisioning",
        })
          .sort({ reconciliationLeaseUntil: 1, _id: 1 })
          .limit(10),
      })
      const agedLowerObjectId = mongoose.Types.ObjectId.createFromTime(
        Math.floor(agedPlanCreatedAfter.getTime() / 1_000)
      )
      const agedUpperObjectId = mongoose.Types.ObjectId.createFromTime(
        Math.floor(agedPlanCreatedBefore.getTime() / 1_000) + 1
      )
      await assertQueryUsesIndex({
        indexName: "_id_",
        maximumDocumentsExamined: 1,
        query: Entitlement.find({
          $expr: {
            $lte: [
              "$createdAt",
              {
                $dateSubtract: {
                  amount: 24,
                  startDate: "$$NOW",
                  unit: "hour",
                },
              },
            ],
          },
          _id: { $gte: agedLowerObjectId, $lt: agedUpperObjectId },
          createdAt: {
            $gte: agedPlanCreatedAfter,
            $lte: agedPlanCreatedBefore,
          },
          isCurrent: true,
          manualReviewRequiredAt: { $exists: false },
          nextReconciliationAt: { $exists: true },
          reconciliationLeaseId: { $exists: false },
          reconciliationLeaseUntil: { $exists: false },
          source: "purchase",
          status: "provisioning",
        })
          .sort({ _id: 1 })
          .limit(1),
      })
      await assertQueryUsesIndex({
        indexName: "unique_entitlement_operation_id",
        maximumDocumentsExamined: 1,
        query: EntitlementOperationAudit.find({
          operationId: "stage2-plan-operation",
        }).limit(1),
      })
      await assertQueryUsesIndex({
        indexName: "entitlement_operation_history",
        maximumDocumentsExamined: 1,
        query: EntitlementOperationAudit.find({
          entitlementId: expiredPlanEpisode._id,
        })
          .sort({ requestedAt: -1 })
          .limit(10),
      })
    } finally {
      if (connected) {
        await dropGuardedDatabase()
        await mongoose.disconnect()
      }
    }
  }
)

module.exports = { assertDisposableMongoUri }
