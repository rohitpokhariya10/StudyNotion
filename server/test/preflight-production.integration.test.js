const assert = require("node:assert/strict")
const { mkdtempSync, rmSync } = require("node:fs")
const { tmpdir } = require("node:os")
const { join } = require("node:path")
const { test } = require("node:test")

const enabled = process.env.STUDYNOTION_RUN_PREFLIGHT_INTEGRATION === "1"

const ALLOWED_MONGO_HOSTS = new Set([
  "127.0.0.1",
  "[::1]",
  "localhost",
  "mongo",
  "mongodb",
])
const DATABASE_PATTERN = /^studynotion_preflight_test_[a-z0-9_-]+$/i
const WRITE_COMMANDS = new Set([
  "applyOps",
  "bulkWrite",
  "cloneCollection",
  "collMod",
  "convertToCapped",
  "create",
  "createIndexes",
  "delete",
  "drop",
  "dropDatabase",
  "dropIndexes",
  "findAndModify",
  "insert",
  "mapReduce",
  "renameCollection",
  "update",
])

const assertDisposableMongoUri = (value, environment = process.env) => {
  if (environment.NODE_ENV === "production") {
    throw new Error("Production preflight integration cannot run in production")
  }
  if (typeof value !== "string" || !value) {
    throw new Error("PREFLIGHT_TEST_MONGODB_URI is required")
  }
  if (/^mongodb\+srv:/i.test(value)) {
    throw new Error("Production preflight integration rejects SRV MongoDB URIs")
  }

  let url
  try {
    url = new URL(value)
  } catch {
    throw new Error("PREFLIGHT_TEST_MONGODB_URI must be a valid MongoDB URI")
  }
  if (url.protocol !== "mongodb:") {
    throw new Error("Production preflight integration requires mongodb://")
  }

  const authority = value
    .slice("mongodb://".length)
    .split("/", 1)[0]
    .split("@")
    .at(-1)
  if (authority.includes(",") || !ALLOWED_MONGO_HOSTS.has(url.hostname)) {
    throw new Error(
      "Production preflight integration MongoDB must be a single local or CI host"
    )
  }

  let databaseName
  try {
    databaseName = decodeURIComponent(url.pathname.slice(1))
  } catch {
    throw new Error("Production preflight integration database name is invalid")
  }
  if (!DATABASE_PATTERN.test(databaseName)) {
    throw new Error(
      "The MongoDB database name must begin with studynotion_preflight_test_"
    )
  }

  return Object.freeze({ databaseName, uri: value })
}

const loadPreflightWithoutRepositoryEnvironment = () => {
  const originalCwd = process.cwd()
  const isolatedCwd = mkdtempSync(join(tmpdir(), "studynotion-preflight-test-"))
  try {
    process.chdir(isolatedCwd)
    return require("../scripts/preflight-production")
  } finally {
    process.chdir(originalCwd)
    rmSync(isolatedCwd, { force: true, recursive: true })
  }
}

const nonZeroCounts = (counts) =>
  Object.fromEntries(Object.entries(counts).filter(([, count]) => count !== 0))

test("production preflight integration MongoDB guard rejects unsafe targets", () => {
  assert.throws(() => assertDisposableMongoUri())
  assert.throws(() =>
    assertDisposableMongoUri(
      "mongodb://127.0.0.1:27017/studynotion_preflight_test_prod",
      { NODE_ENV: "production" }
    )
  )
  assert.throws(() =>
    assertDisposableMongoUri(
      "mongodb+srv://localhost/studynotion_preflight_test_ci"
    )
  )
  assert.throws(() =>
    assertDisposableMongoUri("mongodb://production.example.com/safe_name")
  )
  assert.throws(() =>
    assertDisposableMongoUri(
      "mongodb://localhost:27017,localhost:27018/studynotion_preflight_test_ci"
    )
  )
  assert.throws(() =>
    assertDisposableMongoUri("mongodb://localhost:27017/studynotion")
  )
  assert.equal(
    assertDisposableMongoUri(
      "mongodb://127.0.0.1:27017/studynotion_preflight_test_guard"
    ).databaseName,
    "studynotion_preflight_test_guard"
  )
})

test(
  "production preflight reports enrollment states without mutating MongoDB",
  { skip: !enabled, timeout: 120_000 },
  async (testContext) => {
    const target = assertDisposableMongoUri(
      process.env.PREFLIGHT_TEST_MONGODB_URI
    )
    const environmentKeys = [
      "LOG_LEVEL",
      "MONGODB_URI",
      "MONGODB_URL",
      "NODE_ENV",
      "ENTITLEMENT_SIDECAR_STARTED_AT",
    ]
    const originalEnvironment = Object.fromEntries(
      environmentKeys.map((key) => [
        key,
        {
          present: Object.hasOwn(process.env, key),
          value: process.env[key],
        },
      ])
    )
    const restoreEnvironment = () => {
      for (const [key, { present, value }] of Object.entries(
        originalEnvironment
      )) {
        if (present) process.env[key] = value
        else delete process.env[key]
      }
    }
    testContext.after(restoreEnvironment)

    process.env.MONGODB_URI = target.uri
    delete process.env.MONGODB_URL
    process.env.NODE_ENV = "test"
    process.env.LOG_LEVEL = "info"
    process.env.ENTITLEMENT_SIDECAR_STARTED_AT = "2026-08-10T00:00:00.000Z"

    const mongoose = require("mongoose")
    const Category = require("../models/Category")
    const Course = require("../models/Course")
    const CourseProgress = require("../models/CourseProgress")
    const Entitlement = require("../models/Entitlement")
    const EntitlementOperationAudit = require("../models/EntitlementOperationAudit")
    const OTP = require("../models/OTP")
    const Profile = require("../models/Profile")
    const Purchase = require("../models/Purchase")
    const RatingAndReview = require("../models/RatingandReview")
    const Section = require("../models/Section")
    const SubSection = require("../models/Subsection")
    const User = require("../models/User")
    const { models: indexModels } = require("../scripts/create-indexes")
    const { main, run } = loadPreflightWithoutRepositoryEnvironment()

    const now = new Date("2026-08-09T12:00:00.000Z")
    const instructorProfileId = new mongoose.Types.ObjectId()
    const studentProfileId = new mongoose.Types.ObjectId()
    const instructorId = new mongoose.Types.ObjectId()
    const studentId = new mongoose.Types.ObjectId()
    const categoryId = new mongoose.Types.ObjectId()
    const courseId = new mongoose.Types.ObjectId()
    const sectionId = new mongoose.Types.ObjectId()
    const lessonId = new mongoose.Types.ObjectId()
    const purchaseId = new mongoose.Types.ObjectId()
    const progressId = new mongoose.Types.ObjectId()

    const collections = () => ({
      Category: Category.collection,
      Course: Course.collection,
      CourseProgress: CourseProgress.collection,
      Entitlement: Entitlement.collection,
      EntitlementOperationAudit: EntitlementOperationAudit.collection,
      OTP: OTP.collection,
      Profile: Profile.collection,
      Purchase: Purchase.collection,
      RatingAndReview: RatingAndReview.collection,
      Section: Section.collection,
      SubSection: SubSection.collection,
      User: User.collection,
    })

    const snapshotCollections = async () => {
      const snapshot = {}
      for (const [name, collection] of Object.entries(collections())) {
        snapshot[name] = await collection.find({}).sort({ _id: 1 }).toArray()
      }
      return Buffer.from(
        mongoose.mongo.BSON.EJSON.stringify(snapshot, { relaxed: false })
      )
    }

    const documents = {
      categories: [
        {
          _id: categoryId,
          courses: [courseId],
          createdAt: now,
          description: "Disposable production preflight fixture",
          name: "Preflight integration",
          updatedAt: now,
        },
      ],
      courses: [
        {
          _id: courseId,
          category: categoryId,
          courseContent: [sectionId],
          courseDescription: "A complete disposable preflight course.",
          courseName: "Production preflight fixture",
          createdAt: now,
          everPublishedAt: now,
          instructor: instructorId,
          instructions: ["Use only in the disposable integration database."],
          price: 1000,
          ratingAndReviews: [],
          status: "Published",
          studentsEnroled: [studentId],
          tag: ["integration"],
          thumbnail: "https://media.example.test/preflight-thumbnail.jpg",
          updatedAt: now,
          whatYouWillLearn: "How preflight verifies enrollment consistency.",
        },
      ],
      profiles: [
        {
          _id: instructorProfileId,
          about: "Disposable instructor profile",
        },
        {
          _id: studentProfileId,
          about: "Disposable student profile",
        },
      ],
      progress: [
        {
          _id: progressId,
          completedVideos: [],
          courseID: courseId,
          createdAt: now,
          updatedAt: now,
          userId: studentId,
        },
      ],
      purchases: [
        {
          _id: purchaseId,
          activeCourses: [courseId],
          amount: 1000,
          checkoutAcknowledgedAt: now,
          checkoutPolicySource: "web_checkout",
          checkoutTermsVersion: "2026-07",
          courses: [courseId],
          createdAt: now,
          currency: "INR",
          fulfilledAt: now,
          lineItems: [
            {
              amount: 1000,
              course: courseId,
              courseName: "Production preflight fixture",
            },
          ],
          razorpayOrderId: "order_preflight_integration_0001",
          razorpayPaymentId: "pay_preflight_integration_0001",
          receipt: "preflight-integration-0001",
          refundPolicyVersion: "2026-07",
          refundWindowDays: 7,
          status: "fulfilled",
          updatedAt: now,
          user: studentId,
        },
      ],
      sections: [
        {
          _id: sectionId,
          createdAt: now,
          sectionName: "Preflight section",
          subSection: [lessonId],
          updatedAt: now,
        },
      ],
      subsections: [
        {
          _id: lessonId,
          createdAt: now,
          description: "A complete authenticated lesson.",
          timeDuration: "180",
          title: "Preflight lesson",
          updatedAt: now,
          videoDeliveryType: "authenticated",
          videoFormat: "mp4",
          videoPublicId: "courses/preflight/lesson-1",
          videoUrl: "https://media.example.test/authenticated-video.mp4",
        },
      ],
      users: [
        {
          _id: instructorId,
          accountType: "Instructor",
          active: true,
          additionalDetails: instructorProfileId,
          approved: true,
          authProviders: ["google"],
          courses: [],
          createdAt: now,
          deletionPending: false,
          email: "preflight-instructor@example.test",
          firstName: "Preflight",
          instructorApprovalStatus: "Approved",
          lastName: "Instructor",
          sessionVersion: 0,
          updatedAt: now,
        },
        {
          _id: studentId,
          accountType: "Student",
          active: true,
          additionalDetails: studentProfileId,
          approved: true,
          authProviders: ["google"],
          courses: [courseId],
          createdAt: now,
          deletionPending: false,
          email: "preflight-student@example.test",
          firstName: "Preflight",
          instructorApprovalStatus: "NotApplicable",
          lastName: "Student",
          sessionVersion: 0,
          updatedAt: now,
        },
      ],
    }

    let connected = false
    const observedCommands = []
    const clientListener = (event) => observedCommands.push(event)

    const dropGuardedDatabase = async () => {
      assert.equal(mongoose.connection.name, target.databaseName)
      assert.match(mongoose.connection.name, DATABASE_PATTERN)
      await mongoose.connection.dropDatabase()
    }

    const runScenario = async ({
      expectedEnrollmentIssues = {},
      expectedEnrollmentStatus,
      expectedEntitlementCounts = {},
      expectedEntitlementStatus = "healthy",
      expectedLegacyFindings = {},
      expectedStatus,
      forbiddenOutputValues = [],
      name,
    }) => {
      const before = await snapshotCollections()
      const commandStart = observedCommands.length
      const stdout = []
      const stderr = []
      const mainErrors = []
      let observedExitCode
      const originalConsoleLog = console.log
      const originalStderrWrite = process.stderr.write
      let result

      console.log = (...values) => stdout.push(values.join(" "))
      process.stderr.write = (value) => {
        stderr.push(String(value))
        return true
      }
      try {
        result = await main({
          disconnect: async () => {},
          runPreflight: run,
          setExitCode: (exitCode) => {
            observedExitCode = exitCode
          },
          targetLogger: {
            error: (event, fields) => mainErrors.push({ event, fields }),
          },
        })
      } finally {
        console.log = originalConsoleLog
        process.stderr.write = originalStderrWrite
      }
      const scenarioCommands = observedCommands.slice(commandStart)
      const after = await snapshotCollections()

      assert.ok(result, `${name}: preflight returned no result`)
      assert.equal(result.database, target.databaseName, `${name}: database`)
      assert.equal(result.status, expectedStatus, `${name}: status`)
      assert.equal(
        result.exitCode,
        { blocking: 2, healthy: 0, warning: 1 }[expectedStatus],
        `${name}: result exit code`
      )
      assert.equal(observedExitCode, result.exitCode, `${name}: main exit code`)
      assert.deepEqual(mainErrors, [], `${name}: operational errors`)
      assert.deepEqual(
        nonZeroCounts(result.findings),
        expectedLegacyFindings,
        `${name}: unrelated production findings`
      )
      assert.deepEqual(
        result.indexes,
        { modelsChecked: indexModels.length, missingRequiredIndexes: 0 },
        `${name}: declared indexes`
      )
      assert.deepEqual(
        result.enrollmentConsistency.summary.issueCounts,
        expectedEnrollmentIssues,
        `${name}: enrollment issues`
      )
      assert.equal(
        result.enrollmentConsistency.status,
        expectedEnrollmentStatus ||
          (Object.keys(expectedEnrollmentIssues).length === 0
            ? "healthy"
            : expectedStatus),
        `${name}: enrollment status`
      )
      assert.equal(
        result.entitlementRecovery.status,
        expectedEntitlementStatus,
        `${name}: Entitlement recovery status`
      )
      assert.deepEqual(
        nonZeroCounts(result.entitlementRecovery.counts),
        expectedEntitlementCounts,
        `${name}: Entitlement recovery counts`
      )
      assert.ok(stdout[0]?.includes(`"status": "${expectedStatus}"`))
      const serializedOutput = stdout.join("\n")
      for (const value of forbiddenOutputValues) {
        assert.equal(
          serializedOutput.includes(String(value)),
          false,
          `${name}: preflight output exposed a protected identifier`
        )
      }
      assert.ok(stderr.length > 0, `${name}: lifecycle telemetry is missing`)
      assert.equal(
        before.compare(after),
        0,
        `${name}: production preflight mutated an audited collection`
      )
      assert.equal(
        scenarioCommands.some(({ commandName }) =>
          WRITE_COMMANDS.has(commandName)
        ),
        false,
        `${name}: production preflight issued a write command`
      )
      for (const { command, commandName } of scenarioCommands) {
        if (commandName !== "aggregate") continue
        const pipeline = JSON.stringify(command.pipeline || [])
        assert.equal(pipeline.includes('"$merge"'), false)
        assert.equal(pipeline.includes('"$out"'), false)
      }

      return result
    }

    try {
      await mongoose.connect(target.uri, {
        autoIndex: false,
        monitorCommands: true,
        serverSelectionTimeoutMS: 10_000,
      })
      connected = true
      mongoose.connection.getClient().on("commandStarted", clientListener)
      await dropGuardedDatabase()

      await Promise.all([
        Category.collection.insertMany(documents.categories),
        Course.collection.insertMany(documents.courses),
        CourseProgress.collection.insertMany(documents.progress),
        Profile.collection.insertMany(documents.profiles),
        Purchase.collection.insertMany(documents.purchases),
        Section.collection.insertMany(documents.sections),
        SubSection.collection.insertMany(documents.subsections),
        User.collection.insertMany(documents.users),
      ])
      await Promise.all(indexModels.map((model) => model.createIndexes()))

      const buildInfo = await mongoose.connection.db
        .admin()
        .command({ buildInfo: 1 })
      assert.equal(
        Number.parseInt(buildInfo.version.split(".", 1)[0], 10),
        8,
        "production preflight integration requires MongoDB 8"
      )

      await runScenario({
        expectedStatus: "healthy",
        name: "healthy production-shaped dataset",
      })

      const stage2At = new Date(Date.now() - 10 * 60 * 1000)
      const stage2PurchaseId = new mongoose.Types.ObjectId()
      const stage2EpisodeId = new mongoose.Types.ObjectId()
      const stage2Purchase = {
        ...documents.purchases[0],
        _id: stage2PurchaseId,
        activeCourses: [],
        createdAt: stage2At,
        paidAt: stage2At,
        razorpayOrderId: "order_preflight_stage2_0001",
        razorpayPaymentId: "pay_preflight_stage2_0001",
        receipt: "preflight-stage2-0001",
        status: "paid",
        updatedAt: stage2At,
      }
      delete stage2Purchase.fulfilledAt
      await Promise.all([
        Purchase.collection.insertOne(stage2Purchase),
        Entitlement.collection.insertOne({
          _id: stage2EpisodeId,
          schemaVersion: 1,
          studentId,
          courseId,
          purchaseId: stage2PurchaseId,
          isCurrent: true,
          status: "provisioning",
          source: "purchase",
          reconciliationAttempts: 0,
          nextReconciliationAt: new Date(stage2At.getTime() + 60_000),
          revision: 0,
          createdAt: stage2At,
          updatedAt: stage2At,
        }),
      ])

      await runScenario({
        expectedEnrollmentIssues: {
          CAPTURED_PAYMENT_REQUIRES_RECONCILIATION: 1,
        },
        expectedEnrollmentStatus: "blocking",
        expectedEntitlementCounts: { dueProvisioning: 1 },
        expectedEntitlementStatus: "warning",
        expectedStatus: "blocking",
        forbiddenOutputValues: [stage2PurchaseId, stage2EpisodeId],
        name: "recoverable Stage 2 provisioning work",
      })

      await Entitlement.collection.updateOne(
        { _id: stage2EpisodeId },
        {
          $set: {
            manualReviewRequiredAt: new Date(stage2At.getTime() + 120_000),
            reconciliationAttempts: 5,
            updatedAt: new Date(stage2At.getTime() + 120_000),
          },
          $unset: { nextReconciliationAt: "" },
        }
      )
      await runScenario({
        expectedEnrollmentIssues: {
          CAPTURED_PAYMENT_REQUIRES_RECONCILIATION: 1,
        },
        expectedEnrollmentStatus: "blocking",
        expectedEntitlementCounts: { manualReview: 1 },
        expectedEntitlementStatus: "blocking",
        expectedStatus: "blocking",
        forbiddenOutputValues: [stage2PurchaseId, stage2EpisodeId],
        name: "Stage 2 manual-review blocker",
      })

      await Entitlement.collection.updateOne(
        { _id: stage2EpisodeId },
        {
          $set: { reconciliationAttempts: 0, updatedAt: stage2At },
          $unset: { manualReviewRequiredAt: "" },
        }
      )
      await runScenario({
        expectedEnrollmentIssues: {
          CAPTURED_PAYMENT_REQUIRES_RECONCILIATION: 1,
        },
        expectedEnrollmentStatus: "blocking",
        expectedEntitlementCounts: {
          boundaryLifecycleMismatches: 1,
          malformedEpisodes: 1,
        },
        expectedEntitlementStatus: "blocking",
        expectedStatus: "blocking",
        forbiddenOutputValues: [stage2PurchaseId, stage2EpisodeId],
        name: "malformed Stage 2 lifecycle evidence",
      })

      await Promise.all([
        Entitlement.collection.deleteOne({ _id: stage2EpisodeId }),
        Purchase.collection.deleteOne({ _id: stage2PurchaseId }),
      ])

      const malformedPurchaseId = new mongoose.Types.ObjectId()
      await Purchase.collection.insertOne({
        ...stage2Purchase,
        _id: malformedPurchaseId,
        lineItems: [
          {
            course: courseId,
            courseName: "Malformed immutable price snapshot",
          },
        ],
        razorpayOrderId: "order_preflight_stage2_malformed_0001",
        razorpayPaymentId: "pay_preflight_stage2_malformed_0001",
        receipt: "preflight-stage2-malformed-0001",
      })
      await runScenario({
        expectedEnrollmentIssues: {
          CAPTURED_PAYMENT_REQUIRES_RECONCILIATION: 1,
        },
        expectedEnrollmentStatus: "blocking",
        expectedEntitlementCounts: { boundaryLifecycleMismatches: 1 },
        expectedEntitlementStatus: "blocking",
        expectedStatus: "blocking",
        forbiddenOutputValues: [malformedPurchaseId],
        name: "malformed post-boundary Purchase evidence",
      })
      await Purchase.collection.deleteOne({ _id: malformedPurchaseId })

      const truncatedEpisodeIds = Array.from(
        { length: 101 },
        () => new mongoose.Types.ObjectId()
      )
      await Entitlement.collection.insertMany(
        truncatedEpisodeIds.map((_id, index) => ({
          _id,
          schemaVersion: 1,
          studentId: new mongoose.Types.ObjectId(),
          courseId: new mongoose.Types.ObjectId(),
          purchaseId: new mongoose.Types.ObjectId(),
          isCurrent: true,
          status: "provisioning",
          source: "purchase",
          reconciliationAttempts: 0,
          nextReconciliationAt: new Date(stage2At.getTime() - index - 1),
          revision: 0,
          createdAt: stage2At,
          updatedAt: stage2At,
        }))
      )
      const truncatedPreflight = await runScenario({
        expectedEntitlementCounts: {
          dueProvisioning: 100,
          malformedEpisodes: 101,
        },
        expectedEntitlementStatus: "blocking",
        expectedStatus: "blocking",
        forbiddenOutputValues: truncatedEpisodeIds,
        name: "bounded due-work truncation",
      })
      assert.equal(truncatedPreflight.entitlementRecovery.truncated.due, true)
      await Entitlement.collection.deleteMany({
        _id: { $in: truncatedEpisodeIds },
      })

      const activePurchaseId = new mongoose.Types.ObjectId()
      const activeEpisodeId = new mongoose.Types.ObjectId()
      const fulfilledAt = new Date(stage2At.getTime() + 10 * 60_000)
      const activePurchase = {
        ...documents.purchases[0],
        _id: activePurchaseId,
        createdAt: stage2At,
        fulfilledAt,
        paidAt: stage2At,
        razorpayOrderId: "order_preflight_stage2_active_0001",
        razorpayPaymentId: "pay_preflight_stage2_active_0001",
        receipt: "preflight-stage2-active-0001",
        updatedAt: fulfilledAt,
      }
      await Purchase.collection.deleteOne({ _id: purchaseId })
      await Promise.all([
        Purchase.collection.insertOne(activePurchase),
        Entitlement.collection.insertOne({
          _id: activeEpisodeId,
          schemaVersion: 1,
          studentId,
          courseId,
          purchaseId: activePurchaseId,
          isCurrent: true,
          status: "active",
          source: "purchase",
          grantedAt: fulfilledAt,
          reconciliationAttempts: 0,
          revision: 1,
          createdAt: stage2At,
          updatedAt: fulfilledAt,
        }),
      ])
      await runScenario({
        expectedStatus: "healthy",
        forbiddenOutputValues: [activePurchaseId, activeEpisodeId],
        name: "consistent active Stage 2 episode",
      })

      await CourseProgress.collection.deleteOne({ _id: progressId })
      await runScenario({
        expectedEnrollmentIssues: { MISSING_PROGRESS_RECORD: 1 },
        expectedEnrollmentStatus: "warning",
        expectedEntitlementCounts: { activeMissingLegacy: 1 },
        expectedEntitlementStatus: "blocking",
        expectedStatus: "blocking",
        forbiddenOutputValues: [activePurchaseId, activeEpisodeId],
        name: "active Stage 2 episode without legacy progress",
      })
      await CourseProgress.collection.insertOne(documents.progress[0])
      await Promise.all([
        Entitlement.collection.deleteOne({ _id: activeEpisodeId }),
        Purchase.collection.deleteOne({ _id: activePurchaseId }),
      ])
      await Purchase.collection.insertOne(documents.purchases[0])

      await User.collection.updateOne(
        { _id: studentId },
        { $set: { courses: [] } }
      )
      await runScenario({
        expectedEnrollmentIssues: { DASHBOARD_MIRROR_MISSING: 1 },
        expectedLegacyFindings: { courseEnrollmentsMissingUserMirror: 1 },
        expectedStatus: "blocking",
        name: "one missing dashboard mirror",
      })

      await User.collection.updateOne(
        { _id: studentId },
        { $set: { courses: [courseId] } }
      )
      await CourseProgress.collection.deleteOne({ _id: progressId })
      await runScenario({
        expectedEnrollmentIssues: { MISSING_PROGRESS_RECORD: 1 },
        expectedStatus: "warning",
        name: "missing progress warning",
      })

      await CourseProgress.collection.insertOne(documents.progress[0])
      await Purchase.collection.updateOne(
        { _id: purchaseId },
        { $set: { status: "legacy_unknown" } }
      )
      await runScenario({
        expectedEnrollmentIssues: { UNKNOWN_PURCHASE_STATUS: 1 },
        expectedLegacyFindings: {
          enrollmentsWithoutPurchaseLedger: 1,
          userEntitlementsWithoutPurchaseLedger: 1,
        },
        expectedStatus: "blocking",
        name: "raw unknown purchase status",
      })

      await Promise.all([
        User.collection.updateOne(
          { _id: studentId },
          { $set: { courses: [] } }
        ),
        Course.collection.updateOne(
          { _id: courseId },
          { $set: { studentsEnroled: [] } }
        ),
        CourseProgress.collection.deleteOne({ _id: progressId }),
        Purchase.collection.updateOne(
          { _id: purchaseId },
          {
            $set: { status: "refund_pending" },
            $unset: { refundOriginStatus: "" },
          }
        ),
      ])
      await runScenario({
        expectedEnrollmentIssues: { REFUND_PENDING_ORIGIN_UNKNOWN: 1 },
        expectedStatus: "blocking",
        name: "refund pending with unknown origin",
      })

      await Promise.all([
        User.collection.updateOne(
          { _id: studentId },
          {
            $set: {
              active: false,
              approved: false,
              courses: [],
              deletionPending: false,
              email: "deleted-preflight-student@example.invalid",
              firstName: "Deleted",
              lastName: "Account",
            },
          }
        ),
        Purchase.collection.updateOne(
          { _id: purchaseId },
          {
            $set: { status: "fulfilled" },
            $unset: { refundOriginStatus: "" },
          }
        ),
      ])
      const inactiveHistory = await runScenario({
        expectedStatus: "healthy",
        name: "conservative inactive account history without mirrors",
      })
      assert.equal(inactiveHistory.enrollmentConsistency.summary.pairCount, 1)
      assert.equal(
        inactiveHistory.enrollmentConsistency.summary.totalFindings,
        0
      )
      assert.equal(
        inactiveHistory.enrollmentConsistency.summary.scenarioPairs,
        0
      )
    } finally {
      if (connected) {
        mongoose.connection.getClient().off("commandStarted", clientListener)
        await dropGuardedDatabase()
        await mongoose.disconnect()
      }
    }
  }
)

module.exports = { assertDisposableMongoUri }
