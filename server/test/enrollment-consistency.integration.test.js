const assert = require("node:assert/strict")
const { test } = require("node:test")

const enabled = process.env.STUDYNOTION_RUN_ENROLLMENT_INTEGRATION === "1"

const ALLOWED_MONGO_HOSTS = new Set([
  "127.0.0.1",
  "[::1]",
  "localhost",
  "mongo",
  "mongodb",
])
const DATABASE_PATTERN = /^studynotion_enrollment_test_[a-z0-9_-]+$/i
const DECOY_PAIR_COUNT = 300

const EXPECTED_ISSUE_COUNTS = Object.freeze({
  ACTIVE_COURSE_OUTSIDE_IMMUTABLE_PURCHASE: 1,
  CAPTURED_PAYMENT_REQUIRES_RECONCILIATION: 1,
  COMMERCIAL_ENTITLEMENT_WITHOUT_MIRRORS: 1,
  DASHBOARD_MIRROR_MISSING: 1,
  DUPLICATE_COURSE_ENROLLMENT_REFERENCES: 1,
  DUPLICATE_PROGRESS_RECORDS: 1,
  DUPLICATE_PURCHASE_ACTIVE_COURSE_REFERENCES: 1,
  DUPLICATE_PURCHASE_COURSE_REFERENCES: 1,
  DUPLICATE_USER_COURSE_REFERENCES: 1,
  INACTIVE_PURCHASE_ACTIVE_COURSE_RESIDUAL: 1,
  INELIGIBLE_USER_STATE_RESIDUAL: 1,
  INVALID_USER_ROLE: 1,
  MALFORMED_COURSE_REFERENCE: 2,
  MALFORMED_USER_REFERENCE: 1,
  MIRRORS_WITHOUT_QUALIFYING_LEDGER: 2,
  MISSING_COURSE_REFERENCE: 1,
  MISSING_PROGRESS_RECORD: 1,
  MISSING_USER_REFERENCE: 1,
  MULTIPLE_QUALIFYING_PURCHASES: 1,
  PAYMENT_REVIEW_REFUND_ACTIVE_COURSE_RESIDUAL: 1,
  PROGRESS_WITHOUT_RUNTIME_ENTITLEMENT: 1,
  REFUND_PENDING_ORIGIN_UNKNOWN: 1,
  REFUNDED_PURCHASE_STATE_RESIDUAL: 1,
  RESERVATION_ACTIVE_COURSE_MISSING: 2,
  RUNTIME_AUTHORITY_MISSING: 1,
  UNKNOWN_PURCHASE_STATUS: 1,
})

const WRITE_COMMANDS = new Set([
  "bulkWrite",
  "collMod",
  "create",
  "createIndexes",
  "delete",
  "drop",
  "dropDatabase",
  "dropIndexes",
  "findAndModify",
  "insert",
  "renameCollection",
  "update",
])

const assertDisposableMongoUri = (value, environment = process.env) => {
  if (environment.NODE_ENV === "production") {
    throw new Error("Enrollment integration tests cannot run in production")
  }
  if (typeof value !== "string" || !value) {
    throw new Error("ENROLLMENT_TEST_MONGODB_URI is required")
  }
  if (/^mongodb\+srv:/i.test(value)) {
    throw new Error("Enrollment integration tests reject SRV MongoDB URIs")
  }

  let url
  try {
    url = new URL(value)
  } catch {
    throw new Error("ENROLLMENT_TEST_MONGODB_URI must be a valid MongoDB URI")
  }
  if (url.protocol !== "mongodb:") {
    throw new Error("Enrollment integration tests require mongodb://")
  }

  const authority = value
    .slice("mongodb://".length)
    .split("/", 1)[0]
    .split("@")
    .at(-1)
  if (authority.includes(",") || !ALLOWED_MONGO_HOSTS.has(url.hostname)) {
    throw new Error(
      "Enrollment integration MongoDB must be a single local or CI host"
    )
  }

  let databaseName
  try {
    databaseName = decodeURIComponent(url.pathname.slice(1))
  } catch {
    throw new Error("Enrollment integration database name is invalid")
  }
  if (!DATABASE_PATTERN.test(databaseName)) {
    throw new Error(
      "The MongoDB database name must begin with studynotion_enrollment_test_"
    )
  }

  return Object.freeze({ databaseName, uri: value })
}

const walk = (value, visitor, path = []) => {
  if (!value || typeof value !== "object") return
  visitor(value, path)
  if (Array.isArray(value)) {
    value.forEach((child, index) => walk(child, visitor, [...path, index]))
    return
  }
  for (const [key, child] of Object.entries(value)) {
    walk(child, visitor, [...path, key])
  }
}

const explainEvidence = (explain) => {
  const cursors = []
  const lookups = []
  walk(explain, (value) => {
    if (value.$cursor) {
      const cursor = value.$cursor
      cursors.push({
        namespace:
          cursor.queryPlanner?.namespace ||
          cursor.executionStats?.executionStages?.namespace ||
          null,
        nReturned: cursor.executionStats?.nReturned ?? null,
        totalDocsExamined: cursor.executionStats?.totalDocsExamined ?? null,
        totalKeysExamined: cursor.executionStats?.totalKeysExamined ?? null,
      })
    }
    if (value.$lookup) {
      lookups.push({
        collectionScans: value.collectionScans ?? null,
        from: value.$lookup.from,
        indexesUsed: Array.isArray(value.indexesUsed)
          ? [...value.indexesUsed]
          : null,
        nReturned: value.nReturned ?? null,
        totalDocsExamined: value.totalDocsExamined ?? null,
        totalKeysExamined: value.totalKeysExamined ?? null,
      })
    }
  })
  return { cursors, lookups }
}

const createCapturingLogger = () => {
  const events = []
  const record = (level) => (event, fields) =>
    events.push({ event, fields, level })
  return {
    events,
    logger: {
      error: record("error"),
      info: record("info"),
      warn: record("warn"),
    },
  }
}

test("enrollment integration MongoDB guard rejects unsafe targets", () => {
  assert.throws(() => assertDisposableMongoUri())
  assert.throws(() =>
    assertDisposableMongoUri(
      "mongodb://127.0.0.1:27017/studynotion_enrollment_test_prod",
      { NODE_ENV: "production" }
    )
  )
  assert.throws(() =>
    assertDisposableMongoUri(
      "mongodb+srv://localhost/studynotion_enrollment_test_ci"
    )
  )
  assert.throws(() =>
    assertDisposableMongoUri("mongodb://production.example.com/safe_name")
  )
  assert.throws(() =>
    assertDisposableMongoUri(
      "mongodb://localhost:27017,localhost:27018/studynotion_enrollment_test_ci"
    )
  )
  assert.throws(() =>
    assertDisposableMongoUri("mongodb://localhost:27017/studynotion")
  )
  assert.equal(
    assertDisposableMongoUri(
      "mongodb://127.0.0.1:27017/studynotion_enrollment_test_guard"
    ).databaseName,
    "studynotion_enrollment_test_guard"
  )
})

test(
  "enrollment audit characterizes real MongoDB divergence without writes",
  { skip: !enabled, timeout: 120_000 },
  async () => {
    const target = assertDisposableMongoUri(
      process.env.ENROLLMENT_TEST_MONGODB_URI
    )

    process.env.NODE_ENV = "test"
    const mongoose = require("mongoose")
    const Course = require("../models/Course")
    const CourseProgress = require("../models/CourseProgress")
    const Purchase = require("../models/Purchase")
    const User = require("../models/User")
    const {
      classifyEnrollmentPairState,
      mapEnrollmentConsistencyDryRun,
    } = require("../domains/enrollment/enrollmentConsistency")
    const {
      AUDIT_QUERY_COMMENT,
      buildEnrollmentConsistencyPipeline,
      createEnrollmentConsistencyRepository,
    } = require("../domains/enrollment/enrollmentConsistencyRepository")
    const {
      createEnrollmentConsistencyService,
    } = require("../domains/enrollment/enrollmentConsistencyService")

    const now = new Date("2026-08-08T12:00:00.000Z")
    const instructorId = new mongoose.Types.ObjectId()
    const categoryId = new mongoose.Types.ObjectId()
    const documents = {
      courses: [],
      progress: [],
      purchases: [],
      users: [
        {
          _id: instructorId,
          accountType: "Instructor",
          active: true,
          approved: true,
          authProviders: ["google"],
          courses: [],
          createdAt: now,
          email: "enrollment-fixture-instructor@example.test",
          firstName: "Fixture",
          lastName: "Instructor",
          updatedAt: now,
        },
      ],
    }
    const fixtures = new Map()
    let purchaseSequence = 0

    const addPair = (
      name,
      {
        courseEnrollmentCount = 1,
        courseExists = true,
        progressCount = 1,
        purchases = [{ activeCourses: true, status: "fulfilled" }],
        userCourseCount = 1,
        userExists = true,
        userState = {},
      } = {}
    ) => {
      const userId = new mongoose.Types.ObjectId()
      const courseId = new mongoose.Types.ObjectId()
      const pair = Object.freeze({ courseId, userId })
      fixtures.set(name, pair)

      if (userExists) {
        documents.users.push({
          _id: userId,
          accountType: "Student",
          active: true,
          approved: true,
          authProviders: ["google"],
          courses: Array.from({ length: userCourseCount }, () => courseId),
          createdAt: now,
          deletionPending: false,
          email: `enrollment-fixture-${name}@example.test`,
          firstName: "Fixture",
          lastName: name,
          sessionVersion: 0,
          updatedAt: now,
          ...userState,
        })
      }

      if (courseExists) {
        documents.courses.push({
          _id: courseId,
          category: categoryId,
          courseContent: [],
          courseDescription: `Enrollment fixture ${name}`,
          courseName: `Enrollment fixture ${name}`,
          createdAt: now,
          instructor: instructorId,
          instructions: ["Use only in the disposable integration database."],
          price: 1000,
          ratingAndReviews: [],
          status: "Published",
          studentsEnroled: Array.from(
            { length: courseEnrollmentCount },
            () => userId
          ),
          tag: ["integration"],
          thumbnail: `https://private-media.example.test/${name}.png`,
          updatedAt: now,
          whatYouWillLearn: "Enrollment consistency",
        })
      }

      for (let index = 0; index < progressCount; index += 1) {
        documents.progress.push({
          _id: new mongoose.Types.ObjectId(),
          completedVideos: [],
          courseID: courseId,
          createdAt: now,
          updatedAt: now,
          userId,
        })
      }

      for (const purchaseFixture of purchases) {
        purchaseSequence += 1
        const purchase = {
          _id: new mongoose.Types.ObjectId(),
          amount: 1000,
          checkoutAcknowledgedAt: now,
          checkoutPolicySource: "web_checkout",
          checkoutTermsVersion: "2026-07",
          courses: Array.from(
            { length: purchaseFixture.courseOccurrences ?? 1 },
            () => purchaseFixture.courseReference ?? courseId
          ),
          createdAt: now,
          currency: "INR",
          fulfilledAt: purchaseFixture.status === "fulfilled" ? now : undefined,
          lineItems: [
            {
              amount: 1000,
              course: courseId,
              courseName: `Enrollment fixture ${name}`,
            },
          ],
          razorpayOrderId: `order_enrollment_fixture_${purchaseSequence}`,
          receipt: `enrollment-fixture-${purchaseSequence}`,
          refundPolicyVersion: "2026-07",
          refundWindowDays: 7,
          status: purchaseFixture.status,
          updatedAt: now,
          user: purchaseFixture.userReference ?? userId,
        }
        if (
          purchaseFixture.activeCourses === true ||
          purchaseFixture.activeCourseOccurrences !== undefined
        ) {
          purchase.activeCourses = Array.from(
            {
              length:
                purchaseFixture.activeCourseOccurrences ??
                (purchaseFixture.activeCourses ? 1 : 0),
            },
            () => courseId
          )
        } else if (purchaseFixture.activeCourses === false) {
          purchase.activeCourses = []
        }
        if (purchaseFixture.refundOriginStatus) {
          purchase.refundOriginStatus = purchaseFixture.refundOriginStatus
        }
        documents.purchases.push(purchase)
      }

      return pair
    }

    for (let index = 0; index < DECOY_PAIR_COUNT; index += 1) {
      addPair(`clean-decoy-${String(index).padStart(3, "0")}`)
    }

    addPair("consistent")
    addPair("dashboard-mirror-missing", { userCourseCount: 0 })
    addPair("runtime-authority-missing", {
      courseEnrollmentCount: 0,
      progressCount: 0,
    })
    addPair("commercial-entitlement-without-mirrors", {
      courseEnrollmentCount: 0,
      progressCount: 0,
      userCourseCount: 0,
    })
    addPair("mirrors-without-qualifying-ledger", { purchases: [] })
    addPair("missing-progress", { progressCount: 0 })
    addPair("progress-without-runtime-entitlement", {
      courseEnrollmentCount: 0,
      purchases: [],
      userCourseCount: 0,
    })
    addPair("refunded-residual", {
      purchases: [{ activeCourses: false, status: "refunded" }],
    })
    addPair("inactive-account-residual", {
      userState: { active: false, approved: false },
    })
    addPair("duplicate-user-reference", { userCourseCount: 2 })
    addPair("duplicate-course-reference", { courseEnrollmentCount: 2 })
    addPair("duplicate-progress", { progressCount: 2 })
    addPair("missing-user", {
      courseEnrollmentCount: 0,
      progressCount: 0,
      userCourseCount: 0,
      userExists: false,
    })
    addPair("missing-course", {
      courseEnrollmentCount: 0,
      courseExists: false,
      progressCount: 0,
      userCourseCount: 0,
    })
    addPair("multiple-qualifying-purchases", {
      purchases: [
        { activeCourses: true, status: "fulfilled" },
        { status: "fulfilled" },
      ],
    })
    addPair("manual-fulfilled-without-active-courses", {
      purchases: [{ status: "fulfilled" }],
    })
    addPair("terminal-active-course-residual", {
      courseEnrollmentCount: 0,
      progressCount: 0,
      purchases: [{ activeCourses: true, status: "refunded" }],
      userCourseCount: 0,
    })
    addPair("deleted-account-history", {
      courseEnrollmentCount: 0,
      progressCount: 0,
      userCourseCount: 0,
      userState: {
        active: false,
        approved: false,
        email: "deleted-enrollment-fixture@example.invalid",
        firstName: "Deleted",
        lastName: "Account",
      },
    })
    addPair("refund-requested-origin-retains-entitlement", {
      purchases: [
        {
          activeCourses: true,
          refundOriginStatus: "refund_requested",
          status: "refund_pending",
        },
      ],
    })
    addPair("payment-review-origin-without-entitlement", {
      courseEnrollmentCount: 0,
      progressCount: 0,
      purchases: [
        {
          activeCourses: false,
          refundOriginStatus: "payment_review",
          status: "refund_pending",
        },
      ],
      userCourseCount: 0,
    })
    addPair("payment-review-origin-active-course-residual", {
      courseEnrollmentCount: 0,
      progressCount: 0,
      purchases: [
        {
          activeCourses: true,
          refundOriginStatus: "payment_review",
          status: "refund_pending",
        },
      ],
      userCourseCount: 0,
    })
    addPair("unknown-refund-pending-origin", {
      courseEnrollmentCount: 0,
      progressCount: 0,
      purchases: [{ activeCourses: false, status: "refund_pending" }],
      userCourseCount: 0,
    })
    addPair("unknown-purchase-status", {
      courseEnrollmentCount: 0,
      progressCount: 0,
      purchases: [{ activeCourses: false, status: "legacy_unknown" }],
      userCourseCount: 0,
    })
    addPair("active-course-outside-immutable-purchase", {
      courseEnrollmentCount: 0,
      progressCount: 0,
      purchases: [
        {
          activeCourses: true,
          courseOccurrences: 0,
          status: "created",
        },
      ],
      userCourseCount: 0,
    })
    addPair("duplicate-purchase-course-reference", {
      purchases: [
        {
          activeCourses: true,
          courseOccurrences: 2,
          status: "fulfilled",
        },
      ],
    })
    addPair("duplicate-purchase-active-course-reference", {
      purchases: [
        {
          activeCourseOccurrences: 2,
          courseOccurrences: 1,
          status: "fulfilled",
        },
      ],
    })
    addPair("malformed-purchase-user-reference", {
      courseEnrollmentCount: 0,
      progressCount: 0,
      purchases: [
        {
          activeCourses: false,
          status: "fulfilled",
          userReference: "suppressed-malformed-user-reference",
        },
      ],
      userCourseCount: 0,
    })
    addPair("malformed-purchase-course-reference", {
      courseEnrollmentCount: 0,
      progressCount: 0,
      purchases: [
        {
          activeCourses: false,
          courseReference: "suppressed-malformed-course-reference",
          status: "fulfilled",
        },
      ],
      userCourseCount: 0,
    })
    const instructorOwnedOnlyPair = addPair("instructor-owned-user-only", {
      courseEnrollmentCount: 0,
      progressCount: 0,
      purchases: [],
      userState: { accountType: "Instructor" },
    })
    addPair("invalid-role-with-independent-evidence", {
      userState: { accountType: "Instructor" },
    })
    addPair("captured-paid-without-entitlement", {
      courseEnrollmentCount: 0,
      progressCount: 0,
      purchases: [{ activeCourses: false, status: "paid" }],
      userCourseCount: 0,
    })
    addPair("order-created-missing-active-course", {
      courseEnrollmentCount: 0,
      progressCount: 0,
      purchases: [{ activeCourses: false, status: "order_created" }],
      userCourseCount: 0,
    })

    let connected = false
    const observedCommands = []
    const observedPipelines = []
    const clientListener = (event) => observedCommands.push(event)

    const dropGuardedDatabase = async () => {
      assert.equal(mongoose.connection.name, target.databaseName)
      assert.match(mongoose.connection.name, DATABASE_PATTERN)
      await mongoose.connection.dropDatabase()
    }

    const collections = () => ({
      Course: Course.collection,
      CourseProgress: CourseProgress.collection,
      Purchase: Purchase.collection,
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

    const assertSnapshotEqual = (actual, expected, message) => {
      assert.equal(actual.compare(expected), 0, message)
    }

    const observedPurchaseModel = {
      aggregate(pipeline) {
        observedPipelines.push(pipeline)
        return Purchase.aggregate(pipeline)
      },
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
        User.collection.insertMany(documents.users),
        Course.collection.insertMany(documents.courses),
        Purchase.collection.insertMany(documents.purchases),
        CourseProgress.collection.insertMany(documents.progress),
      ])

      const fixtureCounts = {
        Course: documents.courses.length,
        CourseProgress: documents.progress.length,
        Purchase: documents.purchases.length,
        User: documents.users.length,
      }
      assert.deepEqual(fixtureCounts, {
        Course: 331,
        CourseProgress: 316,
        Purchase: 330,
        User: 332,
      })
      for (const [name, collection] of Object.entries(collections())) {
        assert.equal(await collection.countDocuments(), fixtureCounts[name])
      }

      assert.deepEqual(
        (await CourseProgress.collection.indexes()).map(({ name }) => name),
        ["_id_"],
        "legacy duplicate progress must be inserted before the unique pair index"
      )

      const repository = createEnrollmentConsistencyRepository({
        PurchaseModel: observedPurchaseModel,
      })
      const captured = createCapturingLogger()
      const service = createEnrollmentConsistencyService({
        repository,
        targetLogger: captured.logger,
      })
      const before = await snapshotCollections()

      let commandStart = observedCommands.length
      const readOnlyReport = await service.audit({
        mode: "read_only",
        requestId: "enrollment-integration-read-only",
        sampleLimit: 5,
      })
      const readOnlyCommands = observedCommands.slice(commandStart)
      assert.equal(observedPipelines.length, 1)
      assert.equal(
        readOnlyCommands.filter(
          ({ commandName }) => commandName === "aggregate"
        ).length,
        1,
        "one aggregate must serve the full read-only audit"
      )
      assert.equal(
        readOnlyCommands.some(({ commandName }) =>
          WRITE_COMMANDS.has(commandName)
        ),
        false
      )

      const afterReadOnly = await snapshotCollections()
      assertSnapshotEqual(
        afterReadOnly,
        before,
        "read_only changed an audited collection"
      )

      commandStart = observedCommands.length
      const dryRunReport = await service.audit({
        mode: "dry_run",
        requestId: "enrollment-integration-dry-run",
        sampleLimit: 3,
      })
      const dryRunCommands = observedCommands.slice(commandStart)
      assert.equal(observedPipelines.length, 2)
      assert.equal(
        dryRunCommands.filter(({ commandName }) => commandName === "aggregate")
          .length,
        1,
        "one aggregate must serve the full dry-run audit"
      )
      assert.equal(
        dryRunCommands.some(({ commandName }) =>
          WRITE_COMMANDS.has(commandName)
        ),
        false
      )

      const afterDryRun = await snapshotCollections()
      assertSnapshotEqual(
        afterDryRun,
        before,
        "dry_run changed an audited collection"
      )

      for (const report of [readOnlyReport, dryRunReport]) {
        assert.equal(report.status, "blocking")
        assert.deepEqual(report.summary, {
          affectedPairs: 27,
          blockingFindings: 27,
          classifiedPairs: 28,
          issueCounts: EXPECTED_ISSUE_COUNTS,
          pairCount: 332,
          scenarioCounts: { A: 1, B: 3, C: 5, D: 1, E: 1, F: 3 },
          scenarioPairs: 12,
          totalFindings: 29,
          warningFindings: 2,
        })
        assert.equal(report.truncated, true)
      }
      assert.equal(readOnlyReport.samples.length, 5)
      assert.equal(dryRunReport.samples.length, 3)
      assert.equal(
        dryRunReport.samples.every(
          ({ mode, proposals }) =>
            mode === "dry_run" &&
            proposals.every(
              ({ safeForAutomaticRepair }) => safeForAutomaticRepair === false
            )
        ),
        true
      )

      const selectedStates = new Map()
      const selectedKeys = new Map(
        [
          "deleted-account-history",
          "captured-paid-without-entitlement",
          "duplicate-purchase-active-course-reference",
          "duplicate-purchase-course-reference",
          "duplicate-course-reference",
          "duplicate-progress",
          "duplicate-user-reference",
          "invalid-role-with-independent-evidence",
          "manual-fulfilled-without-active-courses",
          "active-course-outside-immutable-purchase",
          "order-created-missing-active-course",
          "payment-review-origin-active-course-residual",
          "payment-review-origin-without-entitlement",
          "refund-requested-origin-retains-entitlement",
          "terminal-active-course-residual",
          "unknown-purchase-status",
          "unknown-refund-pending-origin",
        ].map((name) => {
          const pair = fixtures.get(name)
          return [`${pair.userId}:${pair.courseId}`, name]
        })
      )
      commandStart = observedCommands.length
      const allPairStates = []
      for await (const pair of repository.streamPairStates()) {
        allPairStates.push(pair)
        const name = selectedKeys.get(`${pair.userId}:${pair.courseId}`)
        if (name) selectedStates.set(name, pair)
      }
      const directReadCommands = observedCommands.slice(commandStart)
      assert.equal(observedPipelines.length, 3)
      assert.equal(
        directReadCommands.filter(
          ({ commandName }) => commandName === "aggregate"
        ).length,
        1,
        "one aggregate must serve the direct characterization scan"
      )
      assert.equal(selectedStates.size, selectedKeys.size)
      assert.equal(allPairStates.length, 332)
      assert.equal(
        allPairStates.some(
          ({ courseId, userId }) =>
            courseId === String(instructorOwnedOnlyPair.courseId) &&
            userId === String(instructorOwnedOnlyPair.userId)
        ),
        false,
        "an Instructor-owned User.courses-only pair must not become learner evidence"
      )

      assert.equal(
        selectedStates.get("duplicate-user-reference").userCourseCount,
        2
      )
      assert.equal(
        selectedStates.get("duplicate-course-reference").courseEnrollmentCount,
        2
      )
      assert.equal(selectedStates.get("duplicate-progress").progressCount, 2)

      const invalidRoleState = selectedStates.get(
        "invalid-role-with-independent-evidence"
      )
      assert.equal(invalidRoleState.userAccountType, "Instructor")
      assert.equal(invalidRoleState.userCourseCount, 1)
      assert.deepEqual(
        classifyEnrollmentPairState(invalidRoleState).issues.map(
          ({ code }) => code
        ),
        ["INVALID_USER_ROLE"]
      )
      assert.equal(
        classifyEnrollmentPairState(invalidRoleState).canonicalState
          .dashboardMirrorPresent,
        false
      )

      const paidState = selectedStates.get("captured-paid-without-entitlement")
      assert.deepEqual(
        classifyEnrollmentPairState(paidState).issues.map(({ code }) => code),
        ["CAPTURED_PAYMENT_REQUIRES_RECONCILIATION"]
      )
      assert.equal(
        mapEnrollmentConsistencyDryRun(paidState).proposals.every(
          ({ proposedWrites }) => proposedWrites.length === 0
        ),
        true
      )

      const missingReservationState = selectedStates.get(
        "order-created-missing-active-course"
      )
      assert.deepEqual(
        classifyEnrollmentPairState(missingReservationState).issues.map(
          ({ code }) => code
        ),
        ["RESERVATION_ACTIVE_COURSE_MISSING"]
      )

      const duplicatePurchaseCourseState = selectedStates.get(
        "duplicate-purchase-course-reference"
      )
      assert.equal(
        duplicatePurchaseCourseState.duplicatePurchaseCourseReferenceCount,
        1
      )
      assert.deepEqual(
        classifyEnrollmentPairState(duplicatePurchaseCourseState).issues.map(
          ({ code }) => code
        ),
        ["DUPLICATE_PURCHASE_COURSE_REFERENCES"]
      )

      const duplicatePurchaseActiveState = selectedStates.get(
        "duplicate-purchase-active-course-reference"
      )
      assert.equal(
        duplicatePurchaseActiveState.duplicatePurchaseActiveCourseReferenceCount,
        1
      )
      assert.deepEqual(
        classifyEnrollmentPairState(duplicatePurchaseActiveState).issues.map(
          ({ code }) => code
        ),
        ["DUPLICATE_PURCHASE_ACTIVE_COURSE_REFERENCES"]
      )

      const malformedUserState = allPairStates.find(
        ({ userReferenceState }) => userReferenceState === "invalid"
      )
      assert.ok(malformedUserState)
      assert.equal(malformedUserState.userId, null)
      assert.deepEqual(
        classifyEnrollmentPairState(malformedUserState).issues.map(
          ({ code }) => code
        ),
        ["MALFORMED_USER_REFERENCE"]
      )
      const malformedCourseFixture = fixtures.get(
        "malformed-purchase-course-reference"
      )
      const malformedCourseState = allPairStates.find(
        ({ courseReferenceState, userId }) =>
          courseReferenceState === "invalid" &&
          userId === String(malformedCourseFixture.userId)
      )
      assert.ok(malformedCourseState)
      assert.equal(malformedCourseState.courseId, null)
      assert.deepEqual(
        classifyEnrollmentPairState(malformedCourseState).issues.map(
          ({ code }) => code
        ),
        ["MALFORMED_COURSE_REFERENCE"]
      )

      const unknownStatusState = selectedStates.get("unknown-purchase-status")
      assert.equal(unknownStatusState.unknownPurchaseStatusCount, 1)
      assert.deepEqual(
        classifyEnrollmentPairState(unknownStatusState).issues.map(
          ({ code }) => code
        ),
        ["UNKNOWN_PURCHASE_STATUS"]
      )
      const outsideImmutableState = selectedStates.get(
        "active-course-outside-immutable-purchase"
      )
      assert.equal(
        outsideImmutableState.activeCourseOutsideImmutablePurchaseCount,
        1
      )
      assert.deepEqual(
        classifyEnrollmentPairState(outsideImmutableState).issues.map(
          ({ code }) => code
        ),
        ["ACTIVE_COURSE_OUTSIDE_IMMUTABLE_PURCHASE"]
      )

      const manualState = selectedStates.get(
        "manual-fulfilled-without-active-courses"
      )
      assert.equal(manualState.purchaseStatusCounts.fulfilled, 1)
      assert.equal(manualState.activePurchaseStatusCounts.fulfilled, 0)
      assert.deepEqual(classifyEnrollmentPairState(manualState).issues, [])

      const terminalState = selectedStates.get(
        "terminal-active-course-residual"
      )
      assert.equal(terminalState.activePurchaseStatusCounts.refunded, 1)
      assert.deepEqual(
        classifyEnrollmentPairState(terminalState).issues.map(
          ({ code }) => code
        ),
        ["INACTIVE_PURCHASE_ACTIVE_COURSE_RESIDUAL"]
      )

      const deletedState = selectedStates.get("deleted-account-history")
      assert.equal(deletedState.userActive, false)
      assert.equal(deletedState.purchaseStatusCounts.fulfilled, 1)
      assert.equal(deletedState.activePurchaseStatusCounts.fulfilled, 1)
      assert.deepEqual(classifyEnrollmentPairState(deletedState).issues, [])
      assert.deepEqual(
        mapEnrollmentConsistencyDryRun(deletedState).proposals,
        []
      )

      const requestedRefundState = selectedStates.get(
        "refund-requested-origin-retains-entitlement"
      )
      assert.equal(
        requestedRefundState.refundPendingOriginCounts.refund_requested,
        1
      )
      assert.equal(
        classifyEnrollmentPairState(requestedRefundState).canonicalState
          .qualifyingPurchaseCount,
        1
      )
      assert.deepEqual(
        classifyEnrollmentPairState(requestedRefundState).issues,
        []
      )

      const reviewRefundState = selectedStates.get(
        "payment-review-origin-without-entitlement"
      )
      assert.equal(
        reviewRefundState.refundPendingOriginCounts.payment_review,
        1
      )
      assert.equal(
        classifyEnrollmentPairState(reviewRefundState).canonicalState
          .qualifyingPurchaseCount,
        0
      )
      assert.deepEqual(
        classifyEnrollmentPairState(reviewRefundState).issues,
        []
      )
      assert.deepEqual(
        mapEnrollmentConsistencyDryRun(reviewRefundState).proposals,
        []
      )

      const reviewActiveState = selectedStates.get(
        "payment-review-origin-active-course-residual"
      )
      assert.equal(
        reviewActiveState.activeRefundPendingOriginCounts.payment_review,
        1
      )
      assert.deepEqual(
        classifyEnrollmentPairState(reviewActiveState).issues.map(
          ({ code }) => code
        ),
        ["PAYMENT_REVIEW_REFUND_ACTIVE_COURSE_RESIDUAL"]
      )

      const unknownOriginState = selectedStates.get(
        "unknown-refund-pending-origin"
      )
      assert.equal(unknownOriginState.refundPendingOriginCounts.unknown, 1)
      assert.deepEqual(
        classifyEnrollmentPairState(unknownOriginState).issues.map(
          ({ code }) => code
        ),
        ["REFUND_PENDING_ORIGIN_UNKNOWN"]
      )

      const serializedPipeline = JSON.stringify(
        buildEnrollmentConsistencyPipeline()
      )
      assert.equal((serializedPipeline.match(/\$unionWith/g) || []).length, 4)
      assert.equal((serializedPipeline.match(/\$lookup/g) || []).length, 2)
      assert.equal(serializedPipeline.includes('"$out"'), false)
      assert.equal(serializedPipeline.includes('"$merge"'), false)
      assert.equal(serializedPipeline.includes("refundOriginStatus"), true)

      for (const pipeline of observedPipelines) {
        assert.deepEqual(pipeline, buildEnrollmentConsistencyPipeline())
      }
      for (const commands of [
        readOnlyCommands,
        dryRunCommands,
        directReadCommands,
      ]) {
        const command = commands.find(
          ({ commandName }) => commandName === "aggregate"
        ).command
        assert.equal(command.allowDiskUse, true)
        assert.equal(command.comment, AUDIT_QUERY_COMMENT)
        assert.equal(command.maxTimeMS, 15_000)
        assert.equal(command.readConcern?.level, "majority")
      }

      const exposed = JSON.stringify({
        events: captured.events,
        reports: [readOnlyReport, dryRunReport],
        states: [...selectedStates.values()],
      })
      for (const forbidden of [
        "@example.test",
        "@example.invalid",
        "courseName",
        "lineItems",
        "private-media.example.test",
        "razorpayOrderId",
        "suppressed-malformed-course-reference",
        "suppressed-malformed-user-reference",
      ]) {
        assert.equal(exposed.includes(forbidden), false)
      }
      const serializedEvents = JSON.stringify(captured.events)
      for (const pair of fixtures.values()) {
        assert.equal(serializedEvents.includes(String(pair.userId)), false)
        assert.equal(serializedEvents.includes(String(pair.courseId)), false)
      }

      const buildInfo = await mongoose.connection.db
        .admin()
        .command({ buildInfo: 1 })
      assert.equal(
        Number.parseInt(buildInfo.version.split(".", 1)[0], 10),
        8,
        "query-plan evidence must be collected against MongoDB 8"
      )

      const explainStartedAt = process.hrtime.bigint()
      const explain = await repository.explain()
      const explainDurationMs = Number(
        (process.hrtime.bigint() - explainStartedAt) / 1_000_000n
      )
      assert.equal(observedPipelines.length, 4)
      const evidence = explainEvidence(explain)
      for (const collectionName of [
        User.collection.name,
        Course.collection.name,
      ]) {
        const lookup = evidence.lookups.find(
          ({ from, indexesUsed }) =>
            from === collectionName && indexesUsed?.includes("_id_")
        )
        assert.ok(
          lookup,
          `MongoDB 8 explain must expose _id_ lookup use for ${collectionName}`
        )
      }

      const finalSnapshot = await snapshotCollections()
      assertSnapshotEqual(
        finalSnapshot,
        before,
        "characterization or explain changed an audited collection"
      )

      const measurements = {
        audit: {
          dryRunDurationMs: dryRunReport.durationMs,
          readOnlyDurationMs: readOnlyReport.durationMs,
        },
        explainDurationMs,
        fixture: {
          ...fixtureCounts,
          affectedPairs: readOnlyReport.summary.affectedPairs,
          cleanDecoyPairs: DECOY_PAIR_COUNT,
          pairCount: readOnlyReport.summary.pairCount,
        },
        mongoVersion: buildInfo.version,
        query: evidence,
      }
      process.stdout.write(
        `ENROLLMENT_CONSISTENCY_MEASUREMENTS ${JSON.stringify(measurements)}\n`
      )
    } finally {
      if (connected) {
        mongoose.connection
          .getClient()
          .removeListener("commandStarted", clientListener)
        if (
          mongoose.connection.name === target.databaseName &&
          DATABASE_PATTERN.test(mongoose.connection.name)
        ) {
          await dropGuardedDatabase()
        }
        await mongoose.disconnect()
      }
    }
  }
)
