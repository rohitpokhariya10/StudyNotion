const assert = require("node:assert/strict")
const { test } = require("node:test")
const mongoose = require("mongoose")

const {
  RECOVERY_BATCH_BUDGET_MS,
  RECOVERY_LEASE_MS,
  RETRY_DELAYS_MS,
  accountDeletionCancellationPostState,
  accountDeletionRevocationPostState,
  activationPostState,
  ageHandoffPostState,
  classifyRecoveryEvidence,
  createEntitlementRecoveryService,
  failureReleasePostState,
  refundCancellationPostState,
  sanitizeCatchUpReport,
  sanitizeOperationalStatus,
} = require("../domains/entitlement/entitlementRecoveryService")

const BOUNDARY = new Date("2026-08-11T10:00:00.000Z")
const CREATED_AT = new Date("2026-08-11T10:01:00.000Z")
const FULFILLED_AT = new Date("2026-08-11T10:02:00.000Z")
const NOW = new Date("2026-08-11T12:00:00.000Z")
const LEASE_UNTIL = new Date(NOW.getTime() + RECOVERY_LEASE_MS)
const STUDENT_ID = new mongoose.Types.ObjectId("64b000000000000000000001")
const COURSE_ID = new mongoose.Types.ObjectId("64b000000000000000000002")
const PURCHASE_ID = new mongoose.Types.ObjectId("64b000000000000000000003")
const PURCHASE_CURSOR = PURCHASE_ID.toString()

const provisioningEpisode = (overrides = {}) => ({
  _id: "64b000000000000000000004",
  schemaVersion: 1,
  studentId: STUDENT_ID,
  courseId: COURSE_ID,
  purchaseId: PURCHASE_ID,
  isCurrent: true,
  status: "provisioning",
  source: "purchase",
  reconciliationAttempts: 0,
  nextReconciliationAt: new Date("2026-08-11T10:01:00.000Z"),
  revision: 0,
  createdAt: CREATED_AT,
  updatedAt: CREATED_AT,
  ...overrides,
})

const claimedEpisode = (overrides = {}) => {
  const episode = provisioningEpisode({
    reconciliationAttempts: 1,
    reconciliationLeaseId: "lease-0001",
    reconciliationLeaseUntil: LEASE_UNTIL,
    revision: 1,
    ...overrides,
  })
  delete episode.nextReconciliationAt
  return episode
}

const validEvidence = (overrides = {}) => ({
  purchase: {
    _id: PURCHASE_ID,
    user: STUDENT_ID,
    courses: [COURSE_ID],
    lineItems: [
      {
        amount: 49900,
        course: COURSE_ID,
        courseName: "Recovery fixture",
      },
    ],
    status: "fulfilled",
    createdAt: CREATED_AT,
    paidAt: new Date("2026-08-11T10:01:30.000Z"),
    fulfilledAt: FULFILLED_AT,
    razorpayPaymentId: "pay_recovery_fixture",
  },
  user: {
    _id: STUDENT_ID,
    accountType: "Student",
    active: true,
    approved: true,
    deletionPending: false,
    courses: [COURSE_ID],
  },
  course: {
    _id: COURSE_ID,
    studentsEnroled: [STUDENT_ID],
  },
  progressExists: true,
  ...overrides,
})

const completedDeletionUser = (overrides = {}) => ({
  _id: STUDENT_ID,
  accountType: "Student",
  active: false,
  approved: false,
  authProviders: [],
  courseProgress: [],
  courses: [],
  deletionPending: false,
  deletionStartedAt: new Date("2026-08-11T11:00:00.000Z"),
  email: `deleted-${STUDENT_ID}@users.invalid`,
  firstName: "Deleted",
  image: "",
  instructorApprovalStatus: "NotApplicable",
  lastName: "Account",
  updatedAt: new Date("2026-08-11T11:30:00.000Z"),
  ...overrides,
})

const quietLogger = Object.freeze({
  error() {},
  info() {},
  warn() {},
})

const withDatabaseTime = (repository, databaseClock = () => NOW) => ({
  ...repository,
  async readDatabaseTime() {
    return new Date(databaseClock())
  },
})

const idleSidecar = Object.freeze({
  async catchUpBoundaryPurchases() {
    return {
      activatedCount: 0,
      examinedCount: 0,
      failedCount: 0,
      hasMore: false,
      nextCursor: null,
      reservedCount: 0,
      terminalizedCount: 0,
    }
  },
})

const classifyEvidence = (episode, evidence) =>
  classifyRecoveryEvidence(episode, evidence, {
    sidecarStartedAt: BOUNDARY,
  })

test("recovery evidence activates only complete trusted fulfillment at Purchase.fulfilledAt", () => {
  const episode = claimedEpisode()
  const decision = classifyEvidence(episode, validEvidence())
  assert.deepEqual(decision, {
    outcome: "activate",
    grantedAt: FULFILLED_AT,
  })

  const active = activationPostState(episode, decision.grantedAt)
  assert.equal(active.status, "active")
  assert.equal(active.revision, episode.revision + 1)
  assert.equal(active.grantedAt.getTime(), FULFILLED_AT.getTime())
  assert.equal(active.reconciliationLeaseId, undefined)
  assert.equal(active.reconciliationLeaseUntil, undefined)
})

test("recovery evidence keeps pending learner refunds active but rejects incomplete legacy mirrors", () => {
  const pendingEvidence = validEvidence()
  pendingEvidence.purchase.status = "refund_pending"
  pendingEvidence.purchase.refundOriginStatus = "refund_requested"
  pendingEvidence.purchase.refundProviderStatus = "pending"
  assert.equal(
    classifyEvidence(claimedEpisode(), pendingEvidence).outcome,
    "activate"
  )

  const missingMirror = validEvidence({ progressExists: false })
  assert.deepEqual(classifyEvidence(claimedEpisode(), missingMirror), {
    outcome: "retry",
    code: "compatibility_write_failed",
  })

  const paymentReview = validEvidence()
  paymentReview.purchase.status = "payment_review"
  assert.deepEqual(classifyEvidence(claimedEpisode(), paymentReview), {
    outcome: "retry",
    code: "purchase_cas_uncertain",
  })

  for (const purchaseOverrides of [
    {
      status: "refund_pending",
      refundOriginStatus: undefined,
      refundProviderStatus: "pending",
    },
    {
      status: "refund_pending",
      refundOriginStatus: undefined,
      refundProviderStatus: "processed",
      refundProcessedAt: new Date("2026-08-11T11:00:00.000Z"),
    },
    {
      status: "refund_pending",
      refundOriginStatus: "refund_requested",
      refundProviderStatus: "unknown",
    },
    {
      status: "refund_pending",
      refundOriginStatus: "refund_requested",
      refundProviderStatus: "processed",
      refundProcessedAt: undefined,
    },
    {
      status: "refund_pending",
      refundOriginStatus: "refund_requested",
      refundProviderStatus: "processed",
      refundProcessedAt: new Date("2026-08-11T10:01:00.000Z"),
    },
    {
      status: "refund_pending",
      refundOriginStatus: "refund_requested",
      refundProviderStatus: "processed",
      refundProcessedAt: new Date("2026-08-11T11:00:00.000Z"),
    },
    {
      status: "fulfilled",
      refundProviderStatus: "processed",
    },
  ]) {
    const ambiguousRefund = validEvidence()
    Object.assign(ambiguousRefund.purchase, purchaseOverrides)
    assert.deepEqual(classifyEvidence(claimedEpisode(), ambiguousRefund), {
      outcome: "retry",
      code: "purchase_cas_uncertain",
    })
  }
})

test("processed refund and exact completed-deletion tombstone cancel provisioning without inference", () => {
  const refundEvidence = validEvidence()
  refundEvidence.purchase.status = "refund_pending"
  refundEvidence.purchase.refundOriginStatus = "refund_requested"
  refundEvidence.purchase.refundProviderStatus = "processed"
  refundEvidence.purchase.refundProcessedAt = new Date(
    "2026-08-11T11:00:00.000Z"
  )
  refundEvidence.purchase.refundEntitlementsRevokedAt = new Date(
    "2026-08-11T11:01:00.000Z"
  )
  const refundDecision = classifyEvidence(claimedEpisode(), refundEvidence)
  assert.equal(refundDecision.outcome, "cancel_refund")
  const refunded = refundCancellationPostState(
    claimedEpisode(),
    refundDecision.cancelledAt
  )
  assert.equal(refunded.status, "cancelled")
  assert.equal(
    refunded.cancellationReason,
    "refund_completed_before_activation"
  )
  assert.equal(refunded.replacementDecision, undefined)
  assert.equal(refunded.replacementOutcome, undefined)

  const paymentReviewRefund = validEvidence()
  paymentReviewRefund.purchase.status = "refund_pending"
  paymentReviewRefund.purchase.refundOriginStatus = "payment_review"
  paymentReviewRefund.purchase.refundProviderStatus = "processed"
  paymentReviewRefund.purchase.refundProcessedAt = new Date(
    "2026-08-11T11:00:00.000Z"
  )
  paymentReviewRefund.purchase.refundEntitlementsRevokedAt = new Date(
    "2026-08-11T11:01:00.000Z"
  )
  delete paymentReviewRefund.purchase.fulfilledAt
  const paymentReviewDecision = classifyEvidence(
    claimedEpisode(),
    paymentReviewRefund
  )
  assert.deepEqual(paymentReviewDecision, {
    outcome: "cancel_refund",
    cancelledAt: paymentReviewRefund.purchase.refundProcessedAt,
    replacementDecision: "none",
    replacementOutcome: "not_required",
  })
  const heldRefundCancellation = refundCancellationPostState(
    claimedEpisode(),
    paymentReviewDecision.cancelledAt,
    paymentReviewDecision
  )
  assert.equal(heldRefundCancellation.replacementDecision, "none")
  assert.equal(heldRefundCancellation.replacementOutcome, "not_required")
  assert.throws(
    () =>
      refundCancellationPostState(claimedEpisode(), NOW, {
        replacementDecision: "selected",
        replacementOutcome: "pending",
      }),
    /none\/not_required/
  )

  const deletionEvidence = validEvidence({ user: completedDeletionUser() })
  const deletionDecision = classifyEvidence(claimedEpisode(), deletionEvidence)
  assert.equal(deletionDecision.outcome, "cancel_account_deletion")
  const cancelled = accountDeletionCancellationPostState(
    claimedEpisode(),
    deletionDecision.cancelledAt
  )
  assert.equal(cancelled.status, "cancelled")
  assert.equal(
    cancelled.cancellationReason,
    "account_deleted_before_activation"
  )

  const almostTombstone = validEvidence({
    user: completedDeletionUser({ authProviders: ["local"] }),
  })
  assert.equal(
    classifyEvidence(claimedEpisode(), almostTombstone).outcome,
    "retry"
  )

  const unfulfilledDeletion = validEvidence({ user: completedDeletionUser() })
  unfulfilledDeletion.purchase.status = "paid"
  delete unfulfilledDeletion.purchase.fulfilledAt
  assert.equal(
    classifyEvidence(claimedEpisode(), unfulfilledDeletion).outcome,
    "retry"
  )

  for (const tombstoneOverrides of [
    { deletionPending: true },
    { deletionPending: undefined },
    { deletionStartedAt: undefined },
    { image: "legacy-avatar" },
    { instructorApprovalStatus: "Approved" },
    { updatedAt: new Date("2026-08-11T10:59:59.999Z") },
    { deletionLockId: "unfinished-deletion" },
    { deletionLockUntil: new Date("2026-08-11T12:30:00.000Z") },
  ]) {
    const incompleteDeletion = validEvidence({
      user: completedDeletionUser(tombstoneOverrides),
    })
    assert.equal(
      classifyEvidence(claimedEpisode(), incompleteDeletion).outcome,
      "retry"
    )
  }

  const unrelatedPurchaseDeletion = validEvidence({
    user: completedDeletionUser(),
  })
  unrelatedPurchaseDeletion.purchase._id = new mongoose.Types.ObjectId(
    "64b000000000000000000098"
  )
  assert.deepEqual(
    classifyEvidence(claimedEpisode(), unrelatedPurchaseDeletion),
    {
      outcome: "retry",
      code: "purchase_cas_uncertain",
    }
  )

  const malformedBundle = validEvidence()
  malformedBundle.purchase.lineItems.push({
    amount: 49900,
    course: new mongoose.Types.ObjectId("64b000000000000000000099"),
    courseName: "Unexpected fixture",
  })
  assert.deepEqual(classifyEvidence(claimedEpisode(), malformedBundle), {
    outcome: "retry",
    code: "purchase_cas_uncertain",
  })
})

test("completed deletion revokes an active episode and retains its grant timestamp", () => {
  const active = {
    ...provisioningEpisode(),
    status: "active",
    grantedAt: FULFILLED_AT,
  }
  delete active.nextReconciliationAt
  const terminalAt = completedDeletionUser().deletionStartedAt
  const revoked = accountDeletionRevocationPostState(active, terminalAt)
  assert.equal(revoked.status, "revoked")
  assert.equal(revoked.isCurrent, false)
  assert.equal(revoked.revocationReason, "account_deleted")
  assert.equal(revoked.grantedAt.getTime(), FULFILLED_AT.getTime())
  assert.equal(revoked.revokedAt.getTime(), terminalAt.getTime())
})

test("automatic failure releases use the exact ADR delay sequence and fifth-attempt handoff", () => {
  const expectedDelays = [
    RETRY_DELAYS_MS[1],
    RETRY_DELAYS_MS[2],
    RETRY_DELAYS_MS[3],
    RETRY_DELAYS_MS[4],
  ]
  for (let attempt = 1; attempt <= 4; attempt += 1) {
    const previous = claimedEpisode({
      reconciliationAttempts: attempt,
      revision: attempt,
    })
    const next = failureReleasePostState(previous, {
      code: "activation_retry",
      now: NOW,
    })
    assert.equal(next.reconciliationAttempts, attempt)
    assert.equal(next.revision, attempt + 1)
    assert.equal(
      next.nextReconciliationAt.getTime(),
      NOW.getTime() + expectedDelays[attempt - 1]
    )
    assert.equal(next.manualReviewRequiredAt, undefined)
    assert.equal(next.reconciliationLeaseId, undefined)
  }

  const fifth = claimedEpisode({ reconciliationAttempts: 5, revision: 5 })
  const manual = failureReleasePostState(fifth, {
    code: "activation_retry",
    now: NOW,
  })
  assert.equal(manual.reconciliationAttempts, 5)
  assert.equal(manual.nextReconciliationAt, undefined)
  assert.equal(manual.manualReviewRequiredAt.getTime(), NOW.getTime())
})

test("24-hour handoff does not consume a recovery attempt", () => {
  const previous = provisioningEpisode({
    reconciliationAttempts: 3,
    lastReconciliationCode: "activation_retry",
    revision: 7,
  })
  const next = ageHandoffPostState(previous, NOW)
  assert.equal(next.reconciliationAttempts, 3)
  assert.equal(next.revision, 8)
  assert.equal(next.nextReconciliationAt, undefined)
  assert.equal(next.manualReviewRequiredAt.getTime(), NOW.getTime())
})

test("automatic recovery rejects a persisted fifth attempt that remains scheduled", async () => {
  let transitionCount = 0
  const agedNow = new Date("2026-08-13T12:00:00.000Z")
  const service = createEntitlementRecoveryService({
    clock: () => agedNow,
    repository: withDatabaseTime(
      {
        async findAgedProvisioning() {
          return provisioningEpisode({
            reconciliationAttempts: 5,
            revision: 9,
          })
        },
        async transitionEpisode() {
          transitionCount += 1
        },
      },
      () => agedNow
    ),
    sidecarService: idleSidecar,
    sidecarStartedAt: BOUNDARY,
    targetLogger: quietLogger,
  })

  await assert.rejects(
    service.handoffAgedProvisioning(),
    /fifth-attempt provisioning Entitlement cannot remain scheduled/
  )
  assert.equal(transitionCount, 0)
})

test("age handoff uses MongoDB time for selection and the final server-age CAS", async () => {
  const databaseNow = new Date("2026-08-13T12:00:00.000Z")
  const previous = provisioningEpisode({
    reconciliationAttempts: 3,
    lastReconciliationCode: "activation_retry",
    revision: 7,
  })
  const transitions = []
  const service = createEntitlementRecoveryService({
    clock: () => new Date("2026-08-11T12:00:00.000Z"),
    repository: withDatabaseTime(
      {
        async findAgedProvisioning(input) {
          assert.equal(input.createdAfter.getTime(), BOUNDARY.getTime())
          assert.equal(
            input.createdBefore.getTime(),
            databaseNow.getTime() - 24 * 60 * 60 * 1000
          )
          return previous
        },
        async transitionEpisode(input) {
          transitions.push(input)
          return input.next
        },
      },
      () => databaseNow
    ),
    sidecarService: idleSidecar,
    sidecarStartedAt: BOUNDARY,
    targetLogger: quietLogger,
  })

  assert.deepEqual(await service.handoffAgedProvisioning(), {
    outcome: "manual_review",
  })
  assert.equal(transitions.length, 1)
  assert.equal(
    transitions[0].ageExpiredAt.getTime(),
    databaseNow.getTime() - 24 * 60 * 60 * 1000
  )
  assert.equal(
    transitions[0].next.manualReviewRequiredAt.getTime(),
    databaseNow.getTime()
  )
})

test("claim is boundary and age fenced, uses a 60-second lease, and crash-after-claim leaves it durable", async () => {
  const calls = []
  const repository = withDatabaseTime({
    async claimDueProvisioning(input) {
      calls.push(input)
      return claimedEpisode({
        reconciliationLeaseId: input.leaseId,
        reconciliationLeaseUntil: input.leaseUntil,
      })
    },
  })
  const service = createEntitlementRecoveryService({
    clock: () => new Date(NOW.getTime() - 60 * 60 * 1000),
    createLeaseId: () => "lease-generated",
    failpoint: async (name) => {
      if (name === "after_claim") throw new Error("simulated process stop")
    },
    repository,
    sidecarService: idleSidecar,
    sidecarStartedAt: BOUNDARY,
    targetLogger: quietLogger,
  })

  await assert.rejects(service.claimDueProvisioning(), /simulated process stop/)
  assert.equal(calls.length, 1)
  assert.equal(calls[0].createdAfter.getTime(), BOUNDARY.getTime())
  assert.equal(
    calls[0].createdAfterAge.getTime(),
    NOW.getTime() - 24 * 60 * 60 * 1000
  )
  assert.equal(calls[0].leaseId, "lease-generated")
  assert.equal(calls[0].leaseUntil.getTime(), NOW.getTime() + RECOVERY_LEASE_MS)
})

test("successful worker finalization uses the exact live-lease fence", async () => {
  const transitions = []
  const repository = withDatabaseTime({
    async loadGrantEvidence() {
      return validEvidence()
    },
    async transitionEpisode(input) {
      transitions.push(input)
      return input.next
    },
  })
  const service = createEntitlementRecoveryService({
    clock: () => NOW,
    repository,
    sidecarService: idleSidecar,
    sidecarStartedAt: BOUNDARY,
    targetLogger: quietLogger,
  })
  const result = await service.processClaimedEpisode(claimedEpisode())
  assert.deepEqual(result, { outcome: "activated" })
  assert.equal(transitions.length, 1)
  assert.equal(transitions[0].leaseValidAt.getTime(), NOW.getTime())
  assert.equal(transitions[0].createdAtGte.getTime(), BOUNDARY.getTime())
  assert.equal(
    transitions[0].createdAtGt.getTime(),
    NOW.getTime() - 24 * 60 * 60 * 1000
  )
  assert.equal(transitions[0].next.grantedAt.getTime(), FULFILLED_AT.getTime())
})

test("worker refuses manual-review, aged, and malformed lease shapes before reading evidence", async () => {
  let evidenceReadCount = 0
  const repository = withDatabaseTime({
    async loadGrantEvidence() {
      evidenceReadCount += 1
      return validEvidence()
    },
  })
  const service = createEntitlementRecoveryService({
    clock: () => NOW,
    repository,
    sidecarService: idleSidecar,
    sidecarStartedAt: BOUNDARY,
    targetLogger: quietLogger,
  })

  await assert.rejects(
    service.processClaimedEpisode(
      claimedEpisode({ manualReviewRequiredAt: NOW })
    ),
    /manual review/
  )
  await assert.rejects(
    service.processClaimedEpisode(
      claimedEpisode({ reconciliationLeaseUntil: "not-a-date" })
    ),
    /exact lease/
  )
  await assert.rejects(
    service.processClaimedEpisode({
      ...claimedEpisode(),
      nextReconciliationAt: new Date(NOW),
    }),
    /exact lease/
  )

  const agedService = createEntitlementRecoveryService({
    clock: () => new Date("2026-08-13T12:00:00.000Z"),
    repository: withDatabaseTime(
      repository,
      () => new Date("2026-08-13T12:00:00.000Z")
    ),
    sidecarService: idleSidecar,
    sidecarStartedAt: BOUNDARY,
    targetLogger: quietLogger,
  })
  await assert.rejects(
    agedService.processClaimedEpisode(claimedEpisode()),
    /aged 24 hours/
  )
  assert.equal(evidenceReadCount, 0)
})

test("finalization failpoint leaves the claimed lease untouched for expiry recovery", async () => {
  let transitionCount = 0
  const service = createEntitlementRecoveryService({
    clock: () => NOW,
    failpoint: async (name) => {
      if (name === "before_finalization") {
        throw new Error("simulated finalization crash")
      }
    },
    repository: withDatabaseTime({
      async loadGrantEvidence() {
        return validEvidence()
      },
      async transitionEpisode() {
        transitionCount += 1
      },
    }),
    sidecarService: idleSidecar,
    sidecarStartedAt: BOUNDARY,
    targetLogger: quietLogger,
  })
  await assert.rejects(
    service.processClaimedEpisode(claimedEpisode()),
    /simulated finalization crash/
  )
  assert.equal(transitionCount, 0)
})

test("expired claim consumes its existing attempt behind an exact expired-lease fence", async () => {
  const expired = claimedEpisode({
    reconciliationLeaseUntil: new Date(NOW.getTime() - 1),
  })
  const transitions = []
  const repository = withDatabaseTime({
    async findExpiredProvisioningLease(input) {
      assert.equal(input.createdAfter.getTime(), BOUNDARY.getTime())
      return expired
    },
    async transitionEpisode(input) {
      transitions.push(input)
      return input.next
    },
  })
  const service = createEntitlementRecoveryService({
    clock: () => NOW,
    repository,
    sidecarService: idleSidecar,
    sidecarStartedAt: BOUNDARY,
    targetLogger: quietLogger,
  })
  const result = await service.sweepExpiredLease()
  assert.deepEqual(result, { outcome: "expired_lease_released" })
  assert.equal(transitions[0].leaseValidAt, undefined)
  assert.equal(transitions[0].leaseExpiredAt.getTime(), NOW.getTime())
  assert.equal(transitions[0].createdAtGte.getTime(), BOUNDARY.getTime())
  assert.equal(transitions[0].next.reconciliationAttempts, 1)
  assert.equal(
    transitions[0].next.nextReconciliationAt.getTime(),
    NOW.getTime() + RETRY_DELAYS_MS[1]
  )
})

test("operational and catch-up reports are strict aggregates and omit cursors", () => {
  const catchUp = sanitizeCatchUpReport({
    activatedCount: 1,
    examinedCount: 2,
    failedCount: 0,
    hasMore: true,
    nextCursor: PURCHASE_CURSOR,
    reservedCount: 1,
    terminalizedCount: 0,
  })
  assert.deepEqual(catchUp, {
    activatedCount: 1,
    examinedCount: 2,
    failedCount: 0,
    hasMore: true,
    reservedCount: 1,
    terminalizedCount: 0,
  })
  assert.equal(JSON.stringify(catchUp).includes(PURCHASE_CURSOR), false)

  const status = sanitizeOperationalStatus(
    {
      activeMissingLegacyCount: 0,
      ageHandoffRequiredCount: 0,
      boundaryExaminedCount: 25,
      boundaryLifecycleMismatchCount: 0,
      boundaryMissingEpisodeCount: 0,
      completedDeletionCurrentCount: 0,
      dueCount: 0,
      expiredLeaseCount: 0,
      manualReviewCount: 0,
      malformedEpisodeCount: 0,
      terminalLegacyConflictCount: 0,
      truncated: {
        boundary: false,
        ageHandoff: false,
        completedDeletion: false,
        due: false,
        expiredLease: false,
        lifecycle: false,
        manualReview: false,
      },
    },
    NOW
  )
  assert.equal(status.status, "healthy")
  assert.equal(status.boundaryExaminedCount, 25)
  assert.equal(status.truncated.boundary, false)

  const lifecycleBlocking = sanitizeOperationalStatus(
    {
      activeMissingLegacyCount: 0,
      ageHandoffRequiredCount: 0,
      boundaryExaminedCount: 0,
      boundaryLifecycleMismatchCount: 1,
      boundaryMissingEpisodeCount: 0,
      completedDeletionCurrentCount: 0,
      dueCount: 0,
      expiredLeaseCount: 0,
      manualReviewCount: 0,
      malformedEpisodeCount: 0,
      terminalLegacyConflictCount: 0,
      truncated: {
        boundary: false,
        ageHandoff: false,
        completedDeletion: false,
        due: false,
        expiredLease: false,
        lifecycle: false,
        manualReview: false,
      },
    },
    NOW
  )
  assert.equal(lifecycleBlocking.status, "blocking")

  const warning = sanitizeOperationalStatus(
    {
      activeMissingLegacyCount: 0,
      ageHandoffRequiredCount: 0,
      boundaryExaminedCount: 0,
      boundaryLifecycleMismatchCount: 0,
      boundaryMissingEpisodeCount: 0,
      completedDeletionCurrentCount: 0,
      dueCount: 1,
      expiredLeaseCount: 0,
      manualReviewCount: 0,
      malformedEpisodeCount: 0,
      terminalLegacyConflictCount: 0,
      truncated: {
        boundary: false,
        ageHandoff: false,
        completedDeletion: false,
        due: false,
        expiredLease: false,
        lifecycle: false,
        manualReview: false,
      },
    },
    NOW
  )
  assert.equal(warning.status, "warning")

  const blocking = sanitizeOperationalStatus(
    {
      activeMissingLegacyCount: 0,
      ageHandoffRequiredCount: 0,
      boundaryExaminedCount: 0,
      boundaryLifecycleMismatchCount: 0,
      boundaryMissingEpisodeCount: 0,
      completedDeletionCurrentCount: 1,
      dueCount: 0,
      expiredLeaseCount: 0,
      manualReviewCount: 0,
      malformedEpisodeCount: 0,
      terminalLegacyConflictCount: 0,
      truncated: {
        boundary: false,
        ageHandoff: false,
        completedDeletion: false,
        due: false,
        expiredLease: false,
        lifecycle: false,
        manualReview: false,
      },
    },
    NOW
  )
  assert.equal(blocking.status, "blocking")

  for (const key of [
    "boundary",
    "ageHandoff",
    "completedDeletion",
    "due",
    "expiredLease",
    "lifecycle",
    "manualReview",
  ]) {
    const inconclusive = sanitizeOperationalStatus(
      {
        activeMissingLegacyCount: 0,
        ageHandoffRequiredCount: 0,
        boundaryExaminedCount: 0,
        boundaryLifecycleMismatchCount: 0,
        boundaryMissingEpisodeCount: 0,
        completedDeletionCurrentCount: 0,
        dueCount: 0,
        expiredLeaseCount: 0,
        manualReviewCount: 0,
        malformedEpisodeCount: 0,
        terminalLegacyConflictCount: 0,
        truncated: {
          boundary: false,
          ageHandoff: false,
          completedDeletion: false,
          due: false,
          expiredLease: false,
          lifecycle: false,
          manualReview: false,
          [key]: true,
        },
      },
      NOW
    )
    assert.equal(inconclusive.status, "blocking")
  }
})

test("operational status samples MongoDB server time when no explicit time is supplied", async () => {
  const databaseNow = new Date(NOW.getTime() + 30 * 60 * 1000)
  let observedNow
  const service = createEntitlementRecoveryService({
    clock: () => new Date(NOW.getTime() - 30 * 60 * 1000),
    repository: withDatabaseTime(
      {
        async getRecoveryOperationalStatus({ now }) {
          observedNow = now
          return {
            activeMissingLegacyCount: 0,
            ageHandoffRequiredCount: 0,
            boundaryExaminedCount: 0,
            boundaryLifecycleMismatchCount: 0,
            boundaryMissingEpisodeCount: 0,
            completedDeletionCurrentCount: 0,
            dueCount: 0,
            expiredLeaseCount: 0,
            malformedEpisodeCount: 0,
            manualReviewCount: 0,
            terminalLegacyConflictCount: 0,
            truncated: {
              ageHandoff: false,
              boundary: false,
              completedDeletion: false,
              due: false,
              expiredLease: false,
              lifecycle: false,
              manualReview: false,
            },
          }
        },
      },
      () => databaseNow
    ),
    sidecarService: idleSidecar,
    sidecarStartedAt: BOUNDARY,
    targetLogger: quietLogger,
  })

  const status = await service.getOperationalStatus()

  assert.equal(observedNow.getTime(), databaseNow.getTime())
  assert.equal(status.observedAt, databaseNow.toISOString())
})

test("bounded catch-up keeps its canonical factory boundary and reports remaining pages", async () => {
  const catchUpCalls = []
  const service = createEntitlementRecoveryService({
    clock: () => NOW,
    createLeaseId: () => "batch-request-id",
    repository: withDatabaseTime({
      async claimDueProvisioning() {
        return null
      },
      async findAgedProvisioning() {
        return null
      },
      async findExpiredProvisioningLease() {
        return null
      },
    }),
    sidecarService: {
      async catchUpBoundaryPurchases(options) {
        catchUpCalls.push(options)
        return {
          activatedCount: 0,
          examinedCount: 1,
          failedCount: 0,
          hasMore: true,
          nextCursor: PURCHASE_CURSOR,
          reservedCount: 1,
          terminalizedCount: 0,
        }
      },
    },
    sidecarStartedAt: BOUNDARY,
    targetLogger: quietLogger,
  })

  const report = await service.runBatch({
    continuation: "64b000000000000000000005",
    limit: 1,
  })

  assert.equal(report.status, "warning")
  assert.equal(report.catchUp.hasMore, true)
  assert.equal(report.catchUp.continuation, PURCHASE_CURSOR)
  assert.deepEqual(catchUpCalls, [
    {
      afterId: "64b000000000000000000005",
      deadlineAt: new Date(NOW.getTime() + RECOVERY_BATCH_BUDGET_MS),
      limit: 1,
    },
  ])
  await assert.rejects(
    service.runBatch({ continuation: "64B000000000000000000005" }),
    /canonical lowercase/
  )
})

test("one deadline below the lease stops the batch safely with the existing warning schema", async () => {
  assert.ok(RECOVERY_BATCH_BUDGET_MS < RECOVERY_LEASE_MS)
  let current = new Date(NOW)
  let recoveryReadCount = 0
  let observedDeadline
  const warningEvents = []
  const service = createEntitlementRecoveryService({
    clock: () => current,
    createLeaseId: () => "batch-deadline-request",
    repository: withDatabaseTime({
      async claimDueProvisioning() {
        recoveryReadCount += 1
        return null
      },
      async findAgedProvisioning() {
        recoveryReadCount += 1
        return null
      },
      async findExpiredProvisioningLease() {
        recoveryReadCount += 1
        return null
      },
    }),
    sidecarService: {
      async catchUpBoundaryPurchases({ deadlineAt }) {
        observedDeadline = deadlineAt
        current = new Date(deadlineAt)
        return {
          activatedCount: 0,
          examinedCount: 0,
          failedCount: 0,
          hasMore: false,
          nextCursor: null,
          reservedCount: 0,
          terminalizedCount: 0,
        }
      },
    },
    sidecarStartedAt: BOUNDARY,
    targetLogger: {
      error() {},
      info() {},
      warn(event) {
        warningEvents.push(event)
      },
    },
  })

  const report = await service.runBatch({ limit: 3 })

  assert.equal(
    observedDeadline.getTime(),
    NOW.getTime() + RECOVERY_BATCH_BUDGET_MS
  )
  assert.equal(report.status, "warning")
  assert.equal(report.durationMs, RECOVERY_BATCH_BUDGET_MS)
  assert.equal(recoveryReadCount, 0)
  assert.deepEqual(Object.keys(report).sort(), [
    "catchUp",
    "completedAt",
    "durationMs",
    "limit",
    "recovery",
    "schemaVersion",
    "startedAt",
    "status",
  ])
  assert.deepEqual(Object.keys(report.catchUp).sort(), [
    "activatedCount",
    "examinedCount",
    "failedCount",
    "hasMore",
    "reservedCount",
    "terminalizedCount",
  ])
  assert.ok(warningEvents.includes("entitlement.recovery_deadline_exhausted"))
})

test("a deadline reached inside a recovery phase prevents every later mutation", async () => {
  let current = new Date(NOW)
  let transitionCount = 0
  let laterSelectorCount = 0
  const service = createEntitlementRecoveryService({
    clock: () => current,
    createLeaseId: () => "batch-mid-phase-deadline",
    repository: withDatabaseTime({
      async claimDueProvisioning() {
        laterSelectorCount += 1
        return null
      },
      async findAgedProvisioning() {
        laterSelectorCount += 1
        return null
      },
      async findExpiredProvisioningLease() {
        current = new Date(NOW.getTime() + RECOVERY_BATCH_BUDGET_MS)
        return claimedEpisode({
          reconciliationLeaseUntil: new Date(NOW.getTime() - 1),
        })
      },
      async transitionEpisode() {
        transitionCount += 1
        throw new Error("deadline-exhausted recovery must not mutate")
      },
    }),
    sidecarService: idleSidecar,
    sidecarStartedAt: BOUNDARY,
    targetLogger: quietLogger,
  })

  const report = await service.runBatch({ limit: 3 })

  assert.equal(report.status, "warning")
  assert.equal(transitionCount, 0)
  assert.equal(laterSelectorCount, 0)
  assert.deepEqual(report.recovery, {
    activated: 0,
    cancelled: 0,
    conflicts: 0,
    expiredLeasesReleased: 0,
    manualReviewRequired: 0,
    retried: 0,
    revoked: 0,
  })
})
