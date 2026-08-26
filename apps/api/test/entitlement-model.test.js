const assert = require("node:assert/strict")
const { test } = require("node:test")

const mongoose = require("mongoose")

const Entitlement = require("../models/Entitlement")
const EntitlementOperationAudit = require("../models/EntitlementOperationAudit")

const now = new Date("2026-08-11T12:00:00.000Z")

const ids = () => ({
  actorId: new mongoose.Types.ObjectId(),
  courseId: new mongoose.Types.ObjectId(),
  entitlementId: new mongoose.Types.ObjectId(),
  purchaseId: new mongoose.Types.ObjectId(),
  replacementPurchaseId: new mongoose.Types.ObjectId(),
  studentId: new mongoose.Types.ObjectId(),
  supersedingEntitlementId: new mongoose.Types.ObjectId(),
})

const provisioningState = (overrides = {}) => {
  const identity = ids()
  return {
    courseId: identity.courseId,
    nextReconciliationAt: new Date(now.getTime() + 60_000),
    purchaseId: identity.purchaseId,
    source: "purchase",
    studentId: identity.studentId,
    ...overrides,
  }
}

const auditRequest = (overrides = {}) => {
  const identity = ids()
  return {
    action: "retry_activation",
    actorId: identity.actorId,
    entitlementId: identity.entitlementId,
    expectedRevision: 0,
    operationId: `operation-${identity.entitlementId}`,
    reason: "Retry after verified financial and account checks",
    requestedAt: now,
    ...overrides,
  }
}

const expectValid = async (Model, value) => {
  await new Model(value).validate()
}

const expectInvalid = async (Model, value) => {
  await assert.rejects(new Model(value).validate())
}

const indexesByName = (Model) =>
  Object.fromEntries(
    Model.schema
      .indexes()
      .filter(([, options]) => options.name)
      .map(([keys, options]) => [options.name, { keys, options }])
  )

test("Entitlement declares the exact ADR identity, privacy, and schema options", () => {
  assert.equal(Entitlement.schema.options.strict, "throw")
  assert.equal(Entitlement.schema.options.versionKey, false)
  assert.ok(Entitlement.schema.path("createdAt"))
  assert.ok(Entitlement.schema.path("updatedAt"))

  for (const [path, ref] of [
    ["studentId", "user"],
    ["courseId", "Course"],
    ["purchaseId", "Purchase"],
    ["replacementPurchaseId", "Purchase"],
    ["supersededByEntitlementId", "Entitlement"],
  ]) {
    assert.equal(Entitlement.schema.path(path).options.ref, ref)
  }

  for (const path of [
    "schemaVersion",
    "studentId",
    "courseId",
    "purchaseId",
    "source",
    "migrationRunId",
  ]) {
    assert.equal(Entitlement.schema.path(path).options.immutable, true)
  }

  for (const path of [
    "replacementPurchaseId",
    "replacementDecision",
    "replacementOutcome",
    "replacementAbandonReason",
    "reconciliationAttempts",
    "nextReconciliationAt",
    "reconciliationLeaseId",
    "reconciliationLeaseUntil",
    "manualReviewRequiredAt",
    "lastReconciliationCode",
    "supersededByEntitlementId",
    "lastManualOperationId",
    "migrationRunId",
  ]) {
    assert.equal(Entitlement.schema.path(path).options.select, false)
  }
})

test("Entitlement declares only the seven approved named indexes", () => {
  const indexes = indexesByName(Entitlement)
  assert.deepEqual(Object.keys(indexes).sort(), [
    "entitlement_course_status_student",
    "entitlement_expired_reconciliation_lease",
    "entitlement_migration_run",
    "entitlement_stale_provisioning",
    "entitlement_student_status_course",
    "unique_current_entitlement_student_course",
    "unique_entitlement_purchase_course",
  ])

  assert.deepEqual(indexes.unique_entitlement_purchase_course.keys, {
    purchaseId: 1,
    courseId: 1,
  })
  assert.equal(indexes.unique_entitlement_purchase_course.options.unique, true)
  assert.deepEqual(indexes.unique_current_entitlement_student_course.keys, {
    studentId: 1,
    courseId: 1,
  })
  assert.equal(
    indexes.unique_current_entitlement_student_course.options.unique,
    true
  )
  assert.deepEqual(
    indexes.unique_current_entitlement_student_course.options
      .partialFilterExpression,
    { isCurrent: true }
  )
  assert.deepEqual(indexes.entitlement_student_status_course.keys, {
    studentId: 1,
    status: 1,
    courseId: 1,
  })
  assert.deepEqual(indexes.entitlement_course_status_student.keys, {
    courseId: 1,
    status: 1,
    studentId: 1,
  })
  assert.deepEqual(indexes.entitlement_stale_provisioning.keys, {
    status: 1,
    nextReconciliationAt: 1,
    _id: 1,
  })
  assert.deepEqual(
    indexes.entitlement_stale_provisioning.options.partialFilterExpression,
    { status: "provisioning" }
  )
  assert.deepEqual(indexes.entitlement_expired_reconciliation_lease.keys, {
    status: 1,
    reconciliationLeaseUntil: 1,
    _id: 1,
  })
  assert.deepEqual(
    indexes.entitlement_expired_reconciliation_lease.options
      .partialFilterExpression,
    { status: "provisioning" }
  )
  assert.deepEqual(indexes.entitlement_migration_run.keys, {
    migrationRunId: 1,
    _id: 1,
  })
  assert.deepEqual(
    indexes.entitlement_migration_run.options.partialFilterExpression,
    { migrationRunId: { $type: "string" } }
  )
})

test("Entitlement accepts each lifecycle state and provisioning work mode", async () => {
  const identity = ids()
  await expectValid(Entitlement, provisioningState())
  await expectValid(
    Entitlement,
    provisioningState({
      nextReconciliationAt: undefined,
      reconciliationLeaseId: "lease-1",
      reconciliationLeaseUntil: new Date(now.getTime() + 60_000),
    })
  )
  await expectValid(
    Entitlement,
    provisioningState({
      manualReviewRequiredAt: now,
      nextReconciliationAt: undefined,
      reconciliationAttempts: 5,
    })
  )
  await expectValid(
    Entitlement,
    provisioningState({
      grantedAt: now,
      nextReconciliationAt: undefined,
      status: "active",
    })
  )
  await expectValid(
    Entitlement,
    provisioningState({
      grantedAt: now,
      isCurrent: false,
      nextReconciliationAt: undefined,
      revokedAt: new Date(now.getTime() + 60_000),
      revocationReason: "refund_completed",
      status: "revoked",
    })
  )
  await expectValid(
    Entitlement,
    provisioningState({
      cancelledAt: now,
      cancellationReason: "account_deleted_before_activation",
      isCurrent: false,
      nextReconciliationAt: undefined,
      status: "cancelled",
    })
  )
  await expectValid(
    Entitlement,
    provisioningState({
      grantedAt: now,
      migrationRunId: "migration-2026-08",
      nextReconciliationAt: undefined,
      purchaseId: identity.purchaseId,
      source: "verified_backfill",
      status: "active",
    })
  )
})

test("Entitlement rejects invalid lifecycle, provenance, recovery, and numeric shapes", async () => {
  const identity = ids()
  const invalidStates = [
    provisioningState({ nextReconciliationAt: undefined }),
    provisioningState({ manualReviewRequiredAt: now }),
    provisioningState({
      nextReconciliationAt: undefined,
      reconciliationLeaseId: "lease-without-expiry",
    }),
    provisioningState({
      nextReconciliationAt: undefined,
      reconciliationLeaseUntil: now,
    }),
    provisioningState({
      nextReconciliationAt: undefined,
      reconciliationLeaseId: "lease-1",
      reconciliationLeaseUntil: now,
      manualReviewRequiredAt: now,
    }),
    provisioningState({ grantedAt: now }),
    provisioningState({
      grantedAt: now,
      isCurrent: false,
      nextReconciliationAt: undefined,
      status: "active",
    }),
    provisioningState({
      isCurrent: false,
      nextReconciliationAt: undefined,
      revokedAt: now,
      revocationReason: "refund_completed",
      status: "revoked",
    }),
    provisioningState({
      cancelledAt: now,
      cancellationReason: "account_deleted_before_activation",
      grantedAt: now,
      isCurrent: false,
      nextReconciliationAt: undefined,
      status: "cancelled",
    }),
    provisioningState({ migrationRunId: "not-allowed-for-live-source" }),
    provisioningState({ source: "verified_backfill" }),
    provisioningState({ reconciliationAttempts: -1 }),
    provisioningState({ reconciliationAttempts: 6 }),
    provisioningState({ reconciliationAttempts: 1.5 }),
    provisioningState({ revision: -1 }),
    provisioningState({ revision: 0.5 }),
    provisioningState({ revision: Number.MAX_SAFE_INTEGER + 1 }),
    provisioningState({ status: "paused" }),
    provisioningState({
      grantedAt: now,
      nextReconciliationAt: undefined,
      replacementDecision: "none",
      replacementOutcome: "not_required",
      status: "active",
    }),
    provisioningState({
      grantedAt: now,
      isCurrent: false,
      nextReconciliationAt: undefined,
      replacementDecision: "none",
      replacementOutcome: "not_required",
      replacementPurchaseId: identity.replacementPurchaseId,
      revokedAt: now,
      revocationReason: "refund_completed",
      status: "revoked",
    }),
    provisioningState({
      grantedAt: now,
      isCurrent: false,
      nextReconciliationAt: undefined,
      replacementDecision: "selected",
      replacementOutcome: "pending",
      replacementPurchaseId: identity.purchaseId,
      purchaseId: identity.purchaseId,
      revokedAt: now,
      revocationReason: "refund_completed",
      status: "revoked",
    }),
    provisioningState({
      grantedAt: now,
      isCurrent: false,
      nextReconciliationAt: undefined,
      replacementDecision: "selected",
      replacementOutcome: "abandoned",
      replacementPurchaseId: identity.replacementPurchaseId,
      revokedAt: now,
      revocationReason: "refund_completed",
      status: "revoked",
    }),
    provisioningState({
      grantedAt: now,
      isCurrent: false,
      nextReconciliationAt: undefined,
      replacementAbandonReason: "user_ineligible",
      replacementDecision: "selected",
      replacementOutcome: "activated",
      replacementPurchaseId: identity.replacementPurchaseId,
      revokedAt: now,
      revocationReason: "refund_completed",
      status: "revoked",
    }),
    provisioningState({
      grantedAt: now,
      isCurrent: false,
      nextReconciliationAt: undefined,
      replacementDecision: "selected",
      replacementOutcome: "superseded",
      replacementPurchaseId: identity.replacementPurchaseId,
      revokedAt: now,
      revocationReason: "refund_completed",
      status: "revoked",
    }),
  ]

  for (const [index, state] of invalidStates.entries()) {
    await assert.rejects(
      new Entitlement(state).validate(),
      `invalid Entitlement state ${index} must be rejected`
    )
  }

  assert.throws(
    () => new Entitlement({ ...provisioningState(), unexpected: true }),
    (error) => error?.name === "StrictModeError"
  )
})

test("Entitlement accepts every valid replacement decision shape", async () => {
  const identity = ids()
  const refunded = {
    grantedAt: now,
    isCurrent: false,
    nextReconciliationAt: undefined,
    purchaseId: identity.purchaseId,
    revokedAt: new Date(now.getTime() + 60_000),
    revocationReason: "refund_completed",
    status: "revoked",
  }

  await expectValid(
    Entitlement,
    provisioningState({
      ...refunded,
      replacementDecision: "none",
      replacementOutcome: "not_required",
    })
  )
  await expectValid(
    Entitlement,
    provisioningState({
      ...refunded,
      replacementDecision: "selected",
      replacementOutcome: "pending",
      replacementPurchaseId: identity.replacementPurchaseId,
    })
  )
  await expectValid(
    Entitlement,
    provisioningState({
      ...refunded,
      replacementDecision: "selected",
      replacementOutcome: "activated",
      replacementPurchaseId: identity.replacementPurchaseId,
    })
  )
  await expectValid(
    Entitlement,
    provisioningState({
      ...refunded,
      lastManualOperationId: "operation-abandon-replacement",
      replacementAbandonReason: "financial_state_changed",
      replacementDecision: "selected",
      replacementOutcome: "abandoned",
      replacementPurchaseId: identity.replacementPurchaseId,
    })
  )
  await expectValid(
    Entitlement,
    provisioningState({
      ...refunded,
      lastManualOperationId: "operation-resolve-superseded",
      replacementDecision: "selected",
      replacementOutcome: "superseded",
      replacementPurchaseId: identity.replacementPurchaseId,
      supersededByEntitlementId: identity.supersedingEntitlementId,
    })
  )
})

test("Entitlement JSON and object serialization remove every private field", () => {
  const identity = ids()
  const privateState = new Entitlement(
    provisioningState({
      grantedAt: now,
      isCurrent: false,
      lastManualOperationId: "operation-private",
      lastReconciliationCode: "replacement_transfer",
      manualReviewRequiredAt: now,
      migrationRunId: "migration-private",
      nextReconciliationAt: undefined,
      purchaseId: identity.purchaseId,
      reconciliationAttempts: 5,
      replacementDecision: "selected",
      replacementOutcome: "superseded",
      replacementPurchaseId: identity.replacementPurchaseId,
      revokedAt: now,
      revocationReason: "refund_completed",
      source: "verified_backfill",
      status: "revoked",
      supersededByEntitlementId: identity.supersedingEntitlementId,
    })
  )
  const leasedState = new Entitlement(
    provisioningState({
      nextReconciliationAt: undefined,
      reconciliationLeaseId: "lease-private",
      reconciliationLeaseUntil: now,
    })
  )

  for (const serialized of [
    privateState.toJSON(),
    privateState.toObject(),
    leasedState.toJSON(),
    leasedState.toObject(),
  ]) {
    for (const path of [
      "replacementPurchaseId",
      "replacementDecision",
      "replacementOutcome",
      "replacementAbandonReason",
      "reconciliationAttempts",
      "nextReconciliationAt",
      "reconciliationLeaseId",
      "reconciliationLeaseUntil",
      "manualReviewRequiredAt",
      "lastReconciliationCode",
      "supersededByEntitlementId",
      "lastManualOperationId",
      "migrationRunId",
    ]) {
      assert.equal(serialized[path], undefined)
    }
  }
})

test("EntitlementOperationAudit declares exact privacy, immutability, and indexes", () => {
  assert.equal(EntitlementOperationAudit.schema.options.strict, "throw")
  assert.equal(EntitlementOperationAudit.schema.options.versionKey, false)
  assert.equal(EntitlementOperationAudit.schema.path("createdAt"), undefined)
  assert.equal(EntitlementOperationAudit.schema.path("updatedAt"), undefined)
  assert.equal(
    EntitlementOperationAudit.schema.path("entitlementId").options.ref,
    "Entitlement"
  )
  assert.equal(
    EntitlementOperationAudit.schema.path("actorId").options.ref,
    "user"
  )

  for (const path of [
    "schemaVersion",
    "operationId",
    "entitlementId",
    "actorId",
    "action",
    "expectedRevision",
    "reason",
    "requestedAt",
  ]) {
    assert.equal(
      EntitlementOperationAudit.schema.path(path).options.immutable,
      true
    )
  }
  for (const path of ["actorId", "reason"]) {
    assert.equal(
      EntitlementOperationAudit.schema.path(path).options.select,
      false
    )
  }

  const indexes = indexesByName(EntitlementOperationAudit)
  assert.deepEqual(Object.keys(indexes).sort(), [
    "entitlement_operation_history",
    "entitlement_operator_history",
    "unique_entitlement_operation_id",
    "unique_open_entitlement_operation",
  ])
  assert.deepEqual(indexes.unique_entitlement_operation_id.keys, {
    operationId: 1,
  })
  assert.equal(indexes.unique_entitlement_operation_id.options.unique, true)
  assert.deepEqual(indexes.unique_open_entitlement_operation.keys, {
    entitlementId: 1,
    status: 1,
  })
  assert.deepEqual(
    indexes.unique_open_entitlement_operation.options.partialFilterExpression,
    { status: "requested" }
  )
  assert.equal(indexes.unique_open_entitlement_operation.options.unique, true)
  assert.deepEqual(indexes.entitlement_operation_history.keys, {
    entitlementId: 1,
    requestedAt: -1,
  })
  assert.deepEqual(indexes.entitlement_operator_history.keys, {
    actorId: 1,
    requestedAt: -1,
  })
})

test("EntitlementOperationAudit validates requested and terminal states", async () => {
  await expectValid(EntitlementOperationAudit, auditRequest())
  for (const [status, outcomeCode] of [
    ["succeeded", "completed"],
    ["conflict", "state_conflict"],
    ["failed", "retry_failed"],
    ["failed", "evidence_invalid"],
    ["failed", "lease_expired"],
  ]) {
    await expectValid(
      EntitlementOperationAudit,
      auditRequest({
        completedAt: new Date(now.getTime() + 1000),
        outcomeCode,
        resultingRevision: 1,
        status,
      })
    )
  }

  for (const value of [
    auditRequest({ outcomeCode: "completed" }),
    auditRequest({ status: "succeeded" }),
    auditRequest({
      completedAt: now,
      outcomeCode: "state_conflict",
      resultingRevision: 0,
      status: "succeeded",
    }),
    auditRequest({
      completedAt: now,
      outcomeCode: "completed",
      resultingRevision: 0,
      status: "failed",
    }),
    auditRequest({ expectedRevision: 0.5 }),
    auditRequest({
      completedAt: now,
      outcomeCode: "completed",
      resultingRevision: 0.5,
      status: "succeeded",
    }),
  ]) {
    await expectInvalid(EntitlementOperationAudit, value)
  }

  assert.throws(
    () =>
      new EntitlementOperationAudit({
        ...auditRequest(),
        unboundedPayload: { secret: true },
      }),
    (error) => error?.name === "StrictModeError"
  )
})

test("EntitlementOperationAudit serialization always redacts actor and reason", () => {
  const audit = new EntitlementOperationAudit(auditRequest())
  assert.equal(audit.actorId == null, false)
  assert.equal(typeof audit.reason, "string")

  for (const serialized of [audit.toJSON(), audit.toObject()]) {
    assert.equal(serialized.actorId, undefined)
    assert.equal(serialized.reason, undefined)
    assert.equal(serialized.operationId, audit.operationId)
  }
})
