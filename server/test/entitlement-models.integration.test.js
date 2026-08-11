const assert = require("node:assert/strict")
const { spawnSync } = require("node:child_process")
const path = require("node:path")
const { test } = require("node:test")

const enabled = process.env.STUDYNOTION_RUN_ENTITLEMENT_INTEGRATION === "1"

const ALLOWED_MONGO_HOSTS = new Set([
  "127.0.0.1",
  "[::1]",
  "localhost",
  "mongo",
  "mongodb",
])
const DATABASE_PATTERN = /^studynotion_entitlement_test_[a-z0-9_-]+$/i
const serverRoot = path.resolve(__dirname, "..")

const assertDisposableMongoUri = (value, environment = process.env) => {
  if (environment.NODE_ENV === "production") {
    throw new Error("Entitlement integration tests cannot run in production")
  }
  if (typeof value !== "string" || !value) {
    throw new Error("ENTITLEMENT_TEST_MONGODB_URI is required")
  }
  if (/^mongodb\+srv:/i.test(value)) {
    throw new Error("Entitlement integration rejects SRV MongoDB URIs")
  }

  let url
  try {
    url = new URL(value)
  } catch {
    throw new Error("ENTITLEMENT_TEST_MONGODB_URI must be a valid MongoDB URI")
  }
  if (url.protocol !== "mongodb:") {
    throw new Error("Entitlement integration requires mongodb://")
  }

  const authority = value
    .slice("mongodb://".length)
    .split("/", 1)[0]
    .split("@")
    .at(-1)
  if (authority.includes(",") || !ALLOWED_MONGO_HOSTS.has(url.hostname)) {
    throw new Error(
      "Entitlement integration MongoDB must be a single local or CI host"
    )
  }

  let databaseName
  try {
    databaseName = decodeURIComponent(url.pathname.slice(1))
  } catch {
    throw new Error("Entitlement integration database name is invalid")
  }
  if (!DATABASE_PATTERN.test(databaseName)) {
    throw new Error(
      "The MongoDB database name must begin with studynotion_entitlement_test_"
    )
  }

  return Object.freeze({ databaseName, uri: value })
}

const expectDuplicateKey = async (operation, expectedKeys) => {
  await assert.rejects(operation, (error) => {
    assert.equal(error?.code, 11000)
    for (const expectedKey of expectedKeys) {
      assert.equal(error?.keyPattern?.[expectedKey], 1)
    }
    return true
  })
}

const normalizeIndexKey = (key) => Object.fromEntries(Object.entries(key))

const assertIndex = (
  indexes,
  name,
  { key, partialFilterExpression = null, unique = false }
) => {
  const index = indexes.find((candidate) => candidate.name === name)
  assert.ok(index, `${name} should exist`)
  assert.deepEqual(normalizeIndexKey(index.key), key, `${name} key`)
  assert.equal(index.unique === true, unique, `${name} unique`)
  assert.deepEqual(
    index.partialFilterExpression ?? null,
    partialFilterExpression,
    `${name} partial filter`
  )
  assert.equal(index.sparse === true, false, `${name} sparse`)
  assert.equal(index.expireAfterSeconds ?? null, null, `${name} TTL`)
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

const winningPlanFromExplain = (explain) => {
  const cursor = explain.stages?.find((stage) => stage.$cursor)?.$cursor
  return cursor?.queryPlanner?.winningPlan || explain.queryPlanner?.winningPlan
}

const assertQueryUsesIndex = async (
  query,
  expectedIndexName,
  maximumDocumentsExamined
) => {
  const explain = await query.hint(expectedIndexName).explain("executionStats")
  assert.ok(
    findIndexScan(winningPlanFromExplain(explain), expectedIndexName),
    `${expectedIndexName} should be used by the winning plan`
  )
  const executionStats =
    explain.executionStats ||
    explain.stages?.find((stage) => stage.$cursor)?.$cursor?.executionStats
  assert.ok(executionStats, `${expectedIndexName} execution stats`)
  assert.equal(
    executionStats.nReturned >= 1,
    true,
    `${expectedIndexName} should return fixture data`
  )
  assert.equal(
    executionStats.totalDocsExamined <= maximumDocumentsExamined,
    true,
    `${expectedIndexName} should remain bounded for the fixture`
  )
  return explain
}

test("Entitlement integration MongoDB guard rejects unsafe targets", () => {
  assert.throws(() => assertDisposableMongoUri())
  assert.throws(() =>
    assertDisposableMongoUri(
      "mongodb://127.0.0.1:27017/studynotion_entitlement_test_prod",
      { NODE_ENV: "production" }
    )
  )
  assert.throws(() =>
    assertDisposableMongoUri(
      "mongodb+srv://localhost/studynotion_entitlement_test_ci"
    )
  )
  assert.throws(() =>
    assertDisposableMongoUri(
      "mongodb://production.example.com/studynotion_entitlement_test_ci"
    )
  )
  assert.throws(() =>
    assertDisposableMongoUri(
      "mongodb://localhost:27017,localhost:27018/studynotion_entitlement_test_ci"
    )
  )
  assert.throws(() =>
    assertDisposableMongoUri("mongodb://localhost:27017/studynotion")
  )
  assert.equal(
    assertDisposableMongoUri(
      "mongodb://127.0.0.1:27017/studynotion_entitlement_test_guard"
    ).databaseName,
    "studynotion_entitlement_test_guard"
  )
})

test(
  "Entitlement persistence enforces lifecycle, privacy, indexes, and concurrency on MongoDB 8",
  { skip: !enabled, timeout: 180_000 },
  async () => {
    const target = assertDisposableMongoUri(
      process.env.ENTITLEMENT_TEST_MONGODB_URI
    )
    const mongoose = require("mongoose")
    const Entitlement = require("../models/Entitlement")
    const EntitlementOperationAudit = require("../models/EntitlementOperationAudit")

    const now = new Date("2026-08-11T10:00:00.000Z")
    const dueAt = new Date("2026-08-11T09:00:00.000Z")
    const leaseExpiredAt = new Date("2026-08-11T09:30:00.000Z")
    const leaseFutureAt = new Date("2026-08-11T10:01:00.000Z")
    const completedAt = new Date("2026-08-11T10:02:00.000Z")

    const episodeInput = ({
      courseId = new mongoose.Types.ObjectId(),
      purchaseId = new mongoose.Types.ObjectId(),
      source = "purchase",
      status = "provisioning",
      studentId = new mongoose.Types.ObjectId(),
      ...overrides
    } = {}) => {
      const input = { courseId, purchaseId, source, status, studentId }
      if (status === "provisioning") input.nextReconciliationAt = dueAt
      if (status === "active") input.grantedAt = now
      if (status === "revoked") {
        input.grantedAt = now
        input.isCurrent = false
        input.revocationReason = "account_deleted"
        input.revokedAt = completedAt
      }
      if (status === "cancelled") {
        input.cancellationReason = "account_deleted_before_activation"
        input.cancelledAt = completedAt
        input.isCurrent = false
      }
      return { ...input, ...overrides }
    }

    const dropGuardedDatabase = async () => {
      assert.equal(mongoose.connection.name, target.databaseName)
      assert.match(mongoose.connection.name, DATABASE_PATTERN)
      await mongoose.connection.dropDatabase()
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
        "Entitlement integration requires MongoDB 8"
      )

      runControlledIndexCreation()
      await Entitlement.collection.createIndex(
        { updatedAt: 1 },
        { name: "entitlement_test_additive_sentinel" }
      )
      runControlledIndexCreation()

      const entitlementIndexes = await Entitlement.collection.indexes()
      assert.ok(
        entitlementIndexes.some(
          ({ name }) => name === "entitlement_test_additive_sentinel"
        ),
        "controlled index creation must not drop unrelated indexes"
      )
      assertIndex(entitlementIndexes, "unique_entitlement_purchase_course", {
        key: { purchaseId: 1, courseId: 1 },
        unique: true,
      })
      assertIndex(
        entitlementIndexes,
        "unique_current_entitlement_student_course",
        {
          key: { studentId: 1, courseId: 1 },
          partialFilterExpression: { isCurrent: true },
          unique: true,
        }
      )
      assertIndex(entitlementIndexes, "entitlement_student_status_course", {
        key: { studentId: 1, status: 1, courseId: 1 },
      })
      assertIndex(entitlementIndexes, "entitlement_course_status_student", {
        key: { courseId: 1, status: 1, studentId: 1 },
      })
      assertIndex(entitlementIndexes, "entitlement_stale_provisioning", {
        key: { status: 1, nextReconciliationAt: 1, _id: 1 },
        partialFilterExpression: { status: "provisioning" },
      })
      assertIndex(
        entitlementIndexes,
        "entitlement_expired_reconciliation_lease",
        {
          key: { status: 1, reconciliationLeaseUntil: 1, _id: 1 },
          partialFilterExpression: { status: "provisioning" },
        }
      )
      assertIndex(entitlementIndexes, "entitlement_migration_run", {
        key: { migrationRunId: 1, _id: 1 },
        partialFilterExpression: { migrationRunId: { $type: "string" } },
      })

      const auditIndexes = await EntitlementOperationAudit.collection.indexes()
      assertIndex(auditIndexes, "unique_entitlement_operation_id", {
        key: { operationId: 1 },
        unique: true,
      })
      assertIndex(auditIndexes, "unique_open_entitlement_operation", {
        key: { entitlementId: 1, status: 1 },
        partialFilterExpression: { status: "requested" },
        unique: true,
      })
      assertIndex(auditIndexes, "entitlement_operation_history", {
        key: { entitlementId: 1, requestedAt: -1 },
      })
      assertIndex(auditIndexes, "entitlement_operator_history", {
        key: { actorId: 1, requestedAt: -1 },
      })

      const provisioning = await Entitlement.create(episodeInput())
      const active = await Entitlement.create(
        episodeInput({ status: "active" })
      )
      const revoked = await Entitlement.create(
        episodeInput({ status: "revoked" })
      )
      const cancelled = await Entitlement.create(
        episodeInput({ status: "cancelled" })
      )
      assert.equal(provisioning.status, "provisioning")
      assert.equal(provisioning.revision, 0)
      assert.equal(active.status, "active")
      assert.equal(revoked.status, "revoked")
      assert.equal(cancelled.status, "cancelled")
      assert.ok(provisioning.createdAt)
      assert.ok(provisioning.updatedAt)

      await assert.rejects(
        Entitlement.create(episodeInput({ status: "invalid" })),
        (error) => error?.name === "ValidationError"
      )
      const missingStudent = episodeInput()
      delete missingStudent.studentId
      await assert.rejects(
        Entitlement.create(missingStudent),
        (error) => error?.name === "ValidationError"
      )
      await assert.rejects(
        Entitlement.create(episodeInput({ reconciliationAttempts: -1 })),
        (error) => error?.name === "ValidationError"
      )
      await assert.rejects(
        Entitlement.create(episodeInput({ revision: -1 })),
        (error) => error?.name === "ValidationError"
      )

      await expectDuplicateKey(
        Entitlement.create(
          episodeInput({
            courseId: active.courseId,
            purchaseId: active.purchaseId,
            status: "active",
          })
        ),
        ["purchaseId", "courseId"]
      )
      assert.equal(
        await Entitlement.countDocuments({
          courseId: active.courseId,
          purchaseId: active.purchaseId,
        }),
        1
      )

      const historicalStudentId = new mongoose.Types.ObjectId()
      const historicalCourseId = new mongoose.Types.ObjectId()
      const historicalRevoked = await Entitlement.create(
        episodeInput({
          courseId: historicalCourseId,
          status: "revoked",
          studentId: historicalStudentId,
        })
      )
      const historicalCancelled = await Entitlement.create(
        episodeInput({
          courseId: historicalCourseId,
          status: "cancelled",
          studentId: historicalStudentId,
        })
      )
      const laterGrant = await Entitlement.create(
        episodeInput({
          courseId: historicalCourseId,
          status: "active",
          studentId: historicalStudentId,
        })
      )
      const historicalEpisodes = await Entitlement.find({
        courseId: historicalCourseId,
        isCurrent: false,
        studentId: historicalStudentId,
      })
        .sort({ _id: 1 })
        .lean()
      assert.deepEqual(
        historicalEpisodes.map((episode) => episode.status),
        [historicalRevoked.status, historicalCancelled.status]
      )
      assert.equal(laterGrant.isCurrent, true)

      const competingStudentId = new mongoose.Types.ObjectId()
      const competingCourseId = new mongoose.Types.ObjectId()
      const competingResults = await Promise.allSettled([
        Entitlement.create(
          episodeInput({
            courseId: competingCourseId,
            status: "active",
            studentId: competingStudentId,
          })
        ),
        Entitlement.create(
          episodeInput({
            courseId: competingCourseId,
            status: "active",
            studentId: competingStudentId,
          })
        ),
      ])
      assert.equal(
        competingResults.filter(({ status }) => status === "fulfilled").length,
        1
      )
      const competingFailure = competingResults.find(
        ({ status }) => status === "rejected"
      )
      assert.equal(competingFailure.reason?.code, 11000)
      assert.equal(competingFailure.reason?.keyPattern?.studentId, 1)
      assert.equal(competingFailure.reason?.keyPattern?.courseId, 1)

      const casTarget = await Entitlement.create(episodeInput())
      const activationUpdate = {
        $inc: { revision: 1 },
        $set: { grantedAt: completedAt, status: "active" },
        $unset: { nextReconciliationAt: "" },
      }
      const casResults = await Promise.all([
        Entitlement.findOneAndUpdate(
          {
            _id: casTarget._id,
            isCurrent: true,
            revision: 0,
            status: "provisioning",
          },
          activationUpdate,
          { returnDocument: "after", runValidators: true }
        ),
        Entitlement.findOneAndUpdate(
          {
            _id: casTarget._id,
            isCurrent: true,
            revision: 0,
            status: "provisioning",
          },
          activationUpdate,
          { returnDocument: "after", runValidators: true }
        ),
      ])
      assert.equal(casResults.filter(Boolean).length, 1)
      assert.equal(casResults.find(Boolean).status, "active")
      assert.equal(casResults.find(Boolean).revision, 1)
      assert.equal(
        casResults.find(Boolean).grantedAt.getTime(),
        completedAt.getTime()
      )
      const persistedActivation = await Entitlement.findById(casTarget._id)
        .select("+nextReconciliationAt")
        .lean()
      assert.equal(persistedActivation.status, "active")
      assert.equal(persistedActivation.revision, 1)
      assert.equal(
        persistedActivation.grantedAt.getTime(),
        completedAt.getTime()
      )
      assert.equal(persistedActivation.nextReconciliationAt, undefined)

      const privateEntitlement = await Entitlement.create(
        episodeInput({
          lastManualOperationId: "lease-private",
          lastReconciliationCode: "activation_retry",
          manualReviewRequiredAt: now,
          nextReconciliationAt: undefined,
          reconciliationAttempts: 5,
          reconciliationLeaseId: "lease-private",
          reconciliationLeaseUntil: leaseFutureAt,
        })
      )
      const defaultEntitlement = await Entitlement.findById(
        privateEntitlement._id
      ).lean()
      for (const field of [
        "lastManualOperationId",
        "lastReconciliationCode",
        "manualReviewRequiredAt",
        "nextReconciliationAt",
        "reconciliationAttempts",
        "reconciliationLeaseId",
        "reconciliationLeaseUntil",
      ]) {
        assert.equal(
          defaultEntitlement[field],
          undefined,
          `${field} is private`
        )
      }
      const selectedEntitlement = await Entitlement.findById(
        privateEntitlement._id
      ).select(
        "+lastManualOperationId +lastReconciliationCode +manualReviewRequiredAt +nextReconciliationAt +reconciliationAttempts +reconciliationLeaseId +reconciliationLeaseUntil"
      )
      assert.equal(selectedEntitlement.reconciliationAttempts, 5)
      assert.equal(selectedEntitlement.reconciliationLeaseId, "lease-private")
      assert.equal(selectedEntitlement.lastManualOperationId, "lease-private")
      const serializedEntitlement = selectedEntitlement.toJSON()
      assert.equal(serializedEntitlement.reconciliationAttempts, undefined)
      assert.equal(serializedEntitlement.reconciliationLeaseId, undefined)
      assert.equal(serializedEntitlement.lastManualOperationId, undefined)

      const migrationEntitlement = await Entitlement.create(
        episodeInput({
          migrationRunId: "entitlement-migration-fixture",
          source: "verified_backfill",
        })
      )
      const defaultMigration = await Entitlement.findById(
        migrationEntitlement._id
      ).lean()
      assert.equal(defaultMigration.migrationRunId, undefined)
      const selectedMigration = await Entitlement.findById(
        migrationEntitlement._id
      )
        .select("+migrationRunId")
        .lean()
      assert.equal(
        selectedMigration.migrationRunId,
        "entitlement-migration-fixture"
      )

      const actorId = new mongoose.Types.ObjectId()
      const requestedAudit = await EntitlementOperationAudit.create({
        action: "retry_activation",
        actorId,
        entitlementId: provisioning._id,
        expectedRevision: provisioning.revision,
        operationId: "entitlement-operation-0001",
        reason: "Retry the guarded activation after evidence review.",
        requestedAt: now,
      })
      const defaultAudit = await EntitlementOperationAudit.findById(
        requestedAudit._id
      ).lean()
      assert.equal(defaultAudit.actorId, undefined)
      assert.equal(defaultAudit.reason, undefined)
      const selectedAudit = await EntitlementOperationAudit.findById(
        requestedAudit._id
      ).select("+actorId +reason")
      assert.equal(String(selectedAudit.actorId), String(actorId))
      assert.equal(
        selectedAudit.reason,
        "Retry the guarded activation after evidence review."
      )
      assert.equal(selectedAudit.toJSON().actorId, undefined)
      assert.equal(selectedAudit.toJSON().reason, undefined)

      await expectDuplicateKey(
        EntitlementOperationAudit.create({
          action: "retry_activation",
          actorId,
          entitlementId: provisioning._id,
          expectedRevision: provisioning.revision,
          operationId: "entitlement-operation-open-conflict",
          reason: "This second open operation must be rejected.",
          requestedAt: new Date(now.getTime() + 1_000),
        }),
        ["entitlementId", "status"]
      )

      const auditFinalization = {
        $set: {
          completedAt,
          outcomeCode: "completed",
          resultingRevision: 1,
          status: "succeeded",
        },
      }
      const auditCasResults = await Promise.all([
        EntitlementOperationAudit.findOneAndUpdate(
          { _id: requestedAudit._id, status: "requested" },
          auditFinalization,
          { returnDocument: "after", runValidators: true }
        ),
        EntitlementOperationAudit.findOneAndUpdate(
          { _id: requestedAudit._id, status: "requested" },
          auditFinalization,
          { returnDocument: "after", runValidators: true }
        ),
      ])
      assert.equal(auditCasResults.filter(Boolean).length, 1)
      assert.equal(auditCasResults.find(Boolean).status, "succeeded")
      assert.equal(auditCasResults.find(Boolean).outcomeCode, "completed")
      assert.equal(auditCasResults.find(Boolean).resultingRevision, 1)
      assert.equal(
        auditCasResults.find(Boolean).completedAt.getTime(),
        completedAt.getTime()
      )
      assert.equal(
        await EntitlementOperationAudit.findOneAndUpdate(
          { _id: requestedAudit._id, status: "requested" },
          auditFinalization,
          { returnDocument: "after", runValidators: true }
        ),
        null
      )

      await expectDuplicateKey(
        EntitlementOperationAudit.create({
          action: "retry_activation",
          actorId,
          entitlementId: active._id,
          expectedRevision: active.revision,
          operationId: requestedAudit.operationId,
          reason: "The global operation identifier must be unique.",
          requestedAt: new Date(now.getTime() + 2_000),
        }),
        ["operationId"]
      )

      const secondAudit = await EntitlementOperationAudit.create({
        action: "retry_activation",
        actorId,
        entitlementId: provisioning._id,
        expectedRevision: provisioning.revision,
        operationId: "entitlement-operation-0002",
        reason: "A later request is allowed after the first is terminal.",
        requestedAt: new Date(now.getTime() + 3_000),
      })
      const auditHistory = await EntitlementOperationAudit.find({
        entitlementId: provisioning._id,
      })
        .sort({ requestedAt: -1 })
        .lean()
      assert.deepEqual(
        auditHistory.map((operation) => operation.operationId),
        [secondAudit.operationId, requestedAudit.operationId]
      )
      assert.deepEqual(
        auditHistory.map((operation) => operation.status),
        ["requested", "succeeded"]
      )

      await assertQueryUsesIndex(
        Entitlement.find({
          courseId: historicalCourseId,
          isCurrent: true,
          status: "active",
          studentId: historicalStudentId,
        }).limit(5),
        "unique_current_entitlement_student_course",
        5
      )
      await assertQueryUsesIndex(
        Entitlement.find({
          nextReconciliationAt: { $lte: now },
          status: "provisioning",
        })
          .sort({ nextReconciliationAt: 1, _id: 1 })
          .limit(10),
        "entitlement_stale_provisioning",
        10
      )
      const migrationCheckpoint = new mongoose.Types.ObjectId(
        "000000000000000000000000"
      )
      await assertQueryUsesIndex(
        Entitlement.find({
          _id: { $gt: migrationCheckpoint },
          migrationRunId: "entitlement-migration-fixture",
        })
          .sort({ _id: 1 })
          .limit(10),
        "entitlement_migration_run",
        10
      )
      await assertQueryUsesIndex(
        EntitlementOperationAudit.find({
          entitlementId: provisioning._id,
        })
          .sort({ requestedAt: -1 })
          .limit(10),
        "entitlement_operation_history",
        10
      )
      await assertQueryUsesIndex(
        EntitlementOperationAudit.find({ actorId })
          .sort({ requestedAt: -1 })
          .limit(10),
        "entitlement_operator_history",
        10
      )

      const recoveryLeaseResult = await Entitlement.collection.updateOne(
        { _id: privateEntitlement._id, status: "provisioning" },
        {
          $set: { reconciliationLeaseUntil: leaseExpiredAt },
        }
      )
      assert.equal(recoveryLeaseResult.modifiedCount, 1)
      await assertQueryUsesIndex(
        Entitlement.find({
          reconciliationLeaseUntil: { $lte: now },
          status: "provisioning",
        })
          .sort({ reconciliationLeaseUntil: 1, _id: 1 })
          .limit(10),
        "entitlement_expired_reconciliation_lease",
        10
      )
    } finally {
      if (connected && mongoose.connection.readyState !== 0) {
        await dropGuardedDatabase()
        await mongoose.disconnect()
      }
    }
  }
)

module.exports = { assertDisposableMongoUri }
