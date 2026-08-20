const crypto = require("node:crypto")

const logger = require("../../utils/logger")
const { assertEntitlementMutation } = require("./entitlementPolicy")
const {
  purchaseAllowsActivation,
  purchaseFinancialState,
  purchaseHasProcessedRefundEvidence,
  purchaseMatchesEpisode,
} = require("./entitlementPurchaseEvidence")

const INITIAL_RECOVERY_DELAY_MS = 60 * 1000
const RECOVERY_LEASE_MS = 60 * 1000
const RECOVERY_MAX_AGE_MS = 24 * 60 * 60 * 1000
const RECOVERY_MAX_ATTEMPTS = 5
const RECOVERY_MAX_BATCH_SIZE = 100
const RECOVERY_DEFAULT_BATCH_SIZE = 25
const RECOVERY_BATCH_BUDGET_MS = 45 * 1000
const CONTINUATION_PATTERN = /^[0-9a-f]{24}$/
const RETRY_DELAYS_MS = Object.freeze({
  1: 5 * 60 * 1000,
  2: 30 * 60 * 1000,
  3: 2 * 60 * 60 * 1000,
  4: 12 * 60 * 60 * 1000,
})

const RECOVERY_CODES = Object.freeze({
  ACTIVATION_RETRY: "activation_retry",
  COMPATIBILITY_WRITE_FAILED: "compatibility_write_failed",
  PURCHASE_CAS_UNCERTAIN: "purchase_cas_uncertain",
})

const RECOVERY_OUTCOMES = Object.freeze({
  ACTIVATE: "activate",
  CANCEL_ACCOUNT_DELETION: "cancel_account_deletion",
  CANCEL_REFUND: "cancel_refund",
  RETRY: "retry",
  REVOKE_ACCOUNT_DELETION: "revoke_account_deletion",
})

const isDate = (value) =>
  value instanceof Date && Number.isFinite(value.getTime())

const hasOwn = (value, field) =>
  Boolean(value && Object.prototype.hasOwnProperty.call(value, field))

const asDate = (value, name) => {
  const date = value instanceof Date ? new Date(value) : new Date(value)
  if (!isDate(date)) throw new TypeError(`${name} must be a valid date`)
  return date
}

const asNow = (clock) => asDate(clock(), "clock result")

const validateBatchSize = (value) => {
  if (
    !Number.isSafeInteger(value) ||
    value < 1 ||
    value > RECOVERY_MAX_BATCH_SIZE
  ) {
    throw new TypeError(
      `limit must be an integer from 1 through ${RECOVERY_MAX_BATCH_SIZE}`
    )
  }
  return value
}

const validateContinuation = (value) => {
  if (value === undefined) return undefined
  if (typeof value !== "string" || !CONTINUATION_PATTERN.test(value)) {
    throw new TypeError(
      "continuation must be a canonical lowercase 24-hex Purchase ObjectId"
    )
  }
  return value
}

const referenceKey = (value) => {
  if (value === undefined || value === null) return null
  if (typeof value === "object" && value._id !== undefined) {
    return String(value._id)
  }
  return String(value)
}

const referenceMatches = (left, right) =>
  referenceKey(left) !== null && referenceKey(left) === referenceKey(right)

const referenceCount = (values, expected) =>
  Array.isArray(values)
    ? values.filter((value) => referenceMatches(value, expected)).length
    : 0

const userMatchesEpisode = (episode, user) =>
  Boolean(
    user &&
    referenceMatches(user._id, episode.studentId) &&
    user.accountType === "Student" &&
    user.active === true &&
    user.approved === true &&
    user.deletionPending === false
  )

const courseMatchesEpisode = (episode, course) =>
  Boolean(course && referenceMatches(course._id, episode.courseId))

const userIsCompletedDeletionTombstone = (episode, user) =>
  Boolean(
    user &&
    referenceMatches(user._id, episode.studentId) &&
    user.accountType === "Student" &&
    user.active === false &&
    user.approved === false &&
    user.deletionPending === false &&
    isDate(user.deletionStartedAt) &&
    !hasOwn(user, "deletionLockId") &&
    !hasOwn(user, "deletionLockUntil") &&
    Array.isArray(user.authProviders) &&
    user.authProviders.length === 0 &&
    Array.isArray(user.courses) &&
    user.courses.length === 0 &&
    Array.isArray(user.courseProgress) &&
    user.courseProgress.length === 0 &&
    user.firstName === "Deleted" &&
    user.lastName === "Account" &&
    user.image === "" &&
    user.instructorApprovalStatus === "NotApplicable" &&
    user.email === `deleted-${referenceKey(user._id)}@users.invalid` &&
    isDate(user.updatedAt) &&
    user.updatedAt >= user.deletionStartedAt
  )

const legacyGrantIsComplete = (episode, { course, progressExists, user }) =>
  referenceCount(user?.courses, episode.courseId) >= 1 &&
  referenceCount(course?.studentsEnroled, episode.studentId) >= 1 &&
  progressExists === true

const classifyRecoveryEvidence = (
  episode,
  evidence = {},
  { sidecarStartedAt } = {}
) => {
  const purchase = evidence.purchase
  const purchaseMatches = purchaseMatchesEpisode(episode, purchase, {
    sidecarStartedAt,
  })

  if (!purchaseMatches) {
    return Object.freeze({
      outcome: RECOVERY_OUTCOMES.RETRY,
      code:
        episode.lastReconciliationCode === "current_pair_conflict"
          ? "current_pair_conflict"
          : RECOVERY_CODES.PURCHASE_CAS_UNCERTAIN,
    })
  }

  if (
    userIsCompletedDeletionTombstone(episode, evidence.user) &&
    ["activation", "processed_refund"].includes(
      purchaseFinancialState(purchase)
    ) &&
    evidence.user.deletionStartedAt >= purchase.paidAt &&
    (!isDate(purchase.fulfilledAt) ||
      evidence.user.deletionStartedAt >= purchase.fulfilledAt)
  ) {
    return Object.freeze({
      outcome: RECOVERY_OUTCOMES.CANCEL_ACCOUNT_DELETION,
      cancelledAt: new Date(evidence.user.deletionStartedAt),
    })
  }

  if (purchaseHasProcessedRefundEvidence(purchase)) {
    return Object.freeze({
      outcome: RECOVERY_OUTCOMES.CANCEL_REFUND,
      cancelledAt: new Date(purchase.refundProcessedAt),
      ...(purchase.refundOriginStatus === "payment_review"
        ? {
            replacementDecision: "none",
            replacementOutcome: "not_required",
          }
        : {}),
    })
  }

  if (!purchaseAllowsActivation(purchase) || !isDate(purchase.fulfilledAt)) {
    return Object.freeze({
      outcome: RECOVERY_OUTCOMES.RETRY,
      code:
        episode.lastReconciliationCode === "current_pair_conflict"
          ? "current_pair_conflict"
          : RECOVERY_CODES.PURCHASE_CAS_UNCERTAIN,
    })
  }

  if (
    !userMatchesEpisode(episode, evidence.user) ||
    !courseMatchesEpisode(episode, evidence.course)
  ) {
    return Object.freeze({
      outcome: RECOVERY_OUTCOMES.RETRY,
      code: RECOVERY_CODES.ACTIVATION_RETRY,
    })
  }

  if (!legacyGrantIsComplete(episode, evidence)) {
    return Object.freeze({
      outcome: RECOVERY_OUTCOMES.RETRY,
      code: RECOVERY_CODES.COMPATIBILITY_WRITE_FAILED,
    })
  }

  return Object.freeze({
    outcome: RECOVERY_OUTCOMES.ACTIVATE,
    grantedAt: new Date(purchase.fulfilledAt),
  })
}

const cloneEpisode = (episode) => ({ ...episode })

const advanceEpisode = (previous, updates, fieldsToRemove = []) => {
  const next = { ...cloneEpisode(previous), ...updates }
  for (const field of fieldsToRemove) delete next[field]
  next.revision = previous.revision + 1
  assertEntitlementMutation(previous, next)
  return next
}

const activationPostState = (previous, grantedAt) =>
  advanceEpisode(previous, { grantedAt, status: "active" }, [
    "nextReconciliationAt",
    "reconciliationLeaseId",
    "reconciliationLeaseUntil",
  ])

const refundCancellationPostState = (
  previous,
  cancelledAt,
  { replacementDecision, replacementOutcome } = {}
) => {
  const hasReplacementState =
    replacementDecision !== undefined || replacementOutcome !== undefined
  if (
    hasReplacementState &&
    (replacementDecision !== "none" || replacementOutcome !== "not_required")
  ) {
    throw new TypeError(
      "payment-review refund cancellation requires none/not_required replacement state"
    )
  }
  return advanceEpisode(
    previous,
    {
      cancellationReason: "refund_completed_before_activation",
      cancelledAt,
      isCurrent: false,
      ...(hasReplacementState
        ? { replacementDecision, replacementOutcome }
        : {}),
      status: "cancelled",
    },
    [
      "nextReconciliationAt",
      "reconciliationLeaseId",
      "reconciliationLeaseUntil",
    ]
  )
}

const accountDeletionCancellationPostState = (previous, cancelledAt) =>
  advanceEpisode(
    previous,
    {
      cancellationReason: "account_deleted_before_activation",
      cancelledAt,
      isCurrent: false,
      status: "cancelled",
    },
    [
      "nextReconciliationAt",
      "reconciliationLeaseId",
      "reconciliationLeaseUntil",
    ]
  )

const accountDeletionRevocationPostState = (previous, revokedAt) =>
  advanceEpisode(previous, {
    isCurrent: false,
    revocationReason: "account_deleted",
    revokedAt,
    status: "revoked",
  })

const ageHandoffPostState = (previous, now) =>
  advanceEpisode(previous, { manualReviewRequiredAt: now }, [
    "nextReconciliationAt",
  ])

const retryDelayForAttempt = (attempt) => {
  if (!Number.isSafeInteger(attempt) || attempt < 1) {
    throw new TypeError("a claimed recovery attempt must be a positive integer")
  }
  return RETRY_DELAYS_MS[attempt]
}

const failureReleasePostState = (previous, { code, now }) => {
  if (previous.reconciliationAttempts >= RECOVERY_MAX_ATTEMPTS) {
    return advanceEpisode(
      previous,
      {
        lastReconciliationCode: code,
        manualReviewRequiredAt: now,
      },
      ["reconciliationLeaseId", "reconciliationLeaseUntil"]
    )
  }

  const retryDelay = retryDelayForAttempt(previous.reconciliationAttempts)
  if (retryDelay === undefined) {
    throw new TypeError("the recovery retry schedule is undefined")
  }
  return advanceEpisode(
    previous,
    {
      lastReconciliationCode: code,
      nextReconciliationAt: new Date(now.getTime() + retryDelay),
    },
    ["reconciliationLeaseId", "reconciliationLeaseUntil"]
  )
}

const safeLog = (targetLogger, level, event, fields) => {
  try {
    targetLogger[level](event, fields)
  } catch {
    // Recovery evidence is durable in MongoDB. Telemetry is deliberately
    // best-effort and cannot change a lease or lifecycle result.
  }
}

const validateCount = (value, name) => {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new TypeError(`${name} must be a nonnegative safe integer`)
  }
  return value
}

const sanitizeCatchUpReport = (report) => {
  if (!report || typeof report !== "object" || Array.isArray(report)) {
    throw new TypeError("boundary catch-up returned an invalid report")
  }
  return Object.freeze({
    examinedCount: validateCount(report.examinedCount, "examinedCount"),
    reservedCount: validateCount(report.reservedCount, "reservedCount"),
    activatedCount: validateCount(report.activatedCount, "activatedCount"),
    terminalizedCount: validateCount(
      report.terminalizedCount,
      "terminalizedCount"
    ),
    failedCount: validateCount(report.failedCount, "failedCount"),
    hasMore: report.hasMore === true,
  })
}

const emptyCatchUpCounts = () => ({
  activatedCount: 0,
  examinedCount: 0,
  failedCount: 0,
  reservedCount: 0,
  terminalizedCount: 0,
})

const sanitizeOperationalStatus = (status, observedAt) => {
  if (!status || typeof status !== "object" || Array.isArray(status)) {
    throw new TypeError("recovery repository returned an invalid status")
  }
  const counts = Object.freeze({
    ageHandoffRequired: validateCount(
      status.ageHandoffRequiredCount,
      "ageHandoffRequiredCount"
    ),
    dueProvisioning: validateCount(status.dueCount, "dueCount"),
    expiredLeases: validateCount(status.expiredLeaseCount, "expiredLeaseCount"),
    manualReview: validateCount(status.manualReviewCount, "manualReviewCount"),
    malformedEpisodes: validateCount(
      status.malformedEpisodeCount,
      "malformedEpisodeCount"
    ),
    boundaryMissingEpisodes: validateCount(
      status.boundaryMissingEpisodeCount,
      "boundaryMissingEpisodeCount"
    ),
    boundaryLifecycleMismatches: validateCount(
      status.boundaryLifecycleMismatchCount,
      "boundaryLifecycleMismatchCount"
    ),
    activeMissingLegacy: validateCount(
      status.activeMissingLegacyCount,
      "activeMissingLegacyCount"
    ),
    terminalLegacyConflicts: validateCount(
      status.terminalLegacyConflictCount,
      "terminalLegacyConflictCount"
    ),
    completedDeletionCurrent: validateCount(
      status.completedDeletionCurrentCount,
      "completedDeletionCurrentCount"
    ),
  })
  const boundaryExaminedCount = validateCount(
    status.boundaryExaminedCount,
    "boundaryExaminedCount"
  )
  const truncatedKeys = [
    "ageHandoff",
    "boundary",
    "completedDeletion",
    "due",
    "expiredLease",
    "lifecycle",
    "manualReview",
  ]
  if (!status.truncated || typeof status.truncated !== "object") {
    throw new TypeError("truncated status is required")
  }
  const truncated = Object.freeze(
    Object.fromEntries(
      truncatedKeys.map((key) => {
        if (typeof status.truncated[key] !== "boolean") {
          throw new TypeError(`truncated.${key} must be a boolean`)
        }
        return [key, status.truncated[key]]
      })
    )
  )
  const blockingTotal =
    counts.ageHandoffRequired +
    counts.manualReview +
    counts.malformedEpisodes +
    counts.boundaryMissingEpisodes +
    counts.boundaryLifecycleMismatches +
    counts.activeMissingLegacy +
    counts.terminalLegacyConflicts +
    counts.completedDeletionCurrent
  const warningTotal = counts.dueProvisioning + counts.expiredLeases
  const isInconclusive = Object.values(truncated).some(Boolean)
  return Object.freeze({
    schemaVersion: 1,
    status:
      blockingTotal > 0 || isInconclusive
        ? "blocking"
        : warningTotal > 0
          ? "warning"
          : "healthy",
    observedAt: observedAt.toISOString(),
    counts,
    boundaryExaminedCount,
    truncated,
  })
}

const createDefaultDependencies = (sidecarStartedAt) => {
  const { createEntitlementRepository } = require("./entitlementRepository")
  const { createEntitlementService } = require("./entitlementService")
  const repository = createEntitlementRepository()
  return {
    repository,
    sidecarService: createEntitlementService({
      repository,
      sidecarStartedAt,
    }),
  }
}

const createEntitlementRecoveryService = (options = {}) => {
  const sidecarStartedAt = asDate(options.sidecarStartedAt, "sidecarStartedAt")
  const defaults = options.repository
    ? {}
    : createDefaultDependencies(sidecarStartedAt)
  const clock = options.clock || Date.now
  const createLeaseId = options.createLeaseId || crypto.randomUUID
  const failpoint = options.failpoint || (() => undefined)
  const repository = options.repository || defaults.repository
  const sidecarService =
    options.sidecarService ||
    defaults.sidecarService ||
    require("./entitlementService").createEntitlementService({
      repository,
      sidecarStartedAt,
    })
  const targetLogger = options.targetLogger || logger

  if (typeof clock !== "function") throw new TypeError("clock is required")
  if (typeof createLeaseId !== "function") {
    throw new TypeError("createLeaseId is required")
  }
  if (typeof failpoint !== "function") {
    throw new TypeError("failpoint must be a function")
  }
  if (typeof repository?.readDatabaseTime !== "function") {
    throw new TypeError("repository.readDatabaseTime is required")
  }

  const invokeFailpoint = async (name) => failpoint(name)
  const readDatabaseTime = async () =>
    asDate(await repository.readDatabaseTime(), "MongoDB server time")

  const assertBoundaryEpisode = (episode) => {
    if (
      episode?.source !== "purchase" ||
      !isDate(episode.createdAt) ||
      episode.createdAt < sidecarStartedAt
    ) {
      throw new TypeError(
        "automatic recovery may mutate only boundary-scoped purchase Entitlements"
      )
    }
    return episode
  }

  const assertProvisioningRecoveryShape = (episode) => {
    assertBoundaryEpisode(episode)
    if (
      episode.status !== "provisioning" ||
      episode.isCurrent !== true ||
      !Number.isSafeInteger(episode.reconciliationAttempts) ||
      episode.reconciliationAttempts < 0 ||
      episode.reconciliationAttempts > RECOVERY_MAX_ATTEMPTS
    ) {
      throw new TypeError(
        "automatic recovery requires an exact provisioning Entitlement"
      )
    }
    if (hasOwn(episode, "manualReviewRequiredAt")) {
      throw new TypeError(
        "automatic recovery cannot process an Entitlement in manual review"
      )
    }
    if (
      episode.reconciliationAttempts === RECOVERY_MAX_ATTEMPTS &&
      hasOwn(episode, "nextReconciliationAt")
    ) {
      throw new TypeError(
        "a fifth-attempt provisioning Entitlement cannot remain scheduled"
      )
    }
    return episode
  }

  const assertClaimedEpisode = (episode) => {
    assertProvisioningRecoveryShape(episode)
    if (
      episode.reconciliationAttempts < 1 ||
      typeof episode.reconciliationLeaseId !== "string" ||
      episode.reconciliationLeaseId.length < 1 ||
      episode.reconciliationLeaseId.length > 100 ||
      episode.reconciliationLeaseId.trim() !== episode.reconciliationLeaseId ||
      !isDate(episode.reconciliationLeaseUntil) ||
      hasOwn(episode, "nextReconciliationAt")
    ) {
      throw new TypeError(
        "a claimed provisioning Entitlement with an exact lease is required"
      )
    }
    return episode
  }

  const assertYoungClaimedEpisode = (episode, now) => {
    assertClaimedEpisode(episode)
    if (episode.createdAt <= new Date(now.getTime() - RECOVERY_MAX_AGE_MS)) {
      throw new TypeError(
        "automatic recovery cannot process an Entitlement aged 24 hours"
      )
    }
    return episode
  }

  const assertAgedProvisioningEpisode = (episode, now) => {
    assertProvisioningRecoveryShape(episode)
    if (
      episode.createdAt > new Date(now.getTime() - RECOVERY_MAX_AGE_MS) ||
      !isDate(episode.nextReconciliationAt) ||
      hasOwn(episode, "reconciliationLeaseId") ||
      hasOwn(episode, "reconciliationLeaseUntil")
    ) {
      throw new TypeError(
        "age handoff requires an exact unleased provisioning Entitlement"
      )
    }
    return episode
  }

  const transitionEpisode = async (
    previous,
    next,
    {
      ageExpiredAt,
      ageValidAt,
      createdAtGt,
      createdAtGte,
      leaseExpiredAt,
      leaseValidAt,
    } = {}
  ) =>
    repository.transitionEpisode({
      ageExpiredAt,
      ageValidAt,
      createdAtGt,
      createdAtGte,
      leaseExpiredAt,
      leaseValidAt,
      next,
      previous,
    })

  const deadlineReached = (deadlineAt) =>
    deadlineAt instanceof Date && asNow(clock) >= deadlineAt
  const deadlineOutcome = () => ({ outcome: "deadline_exhausted" })

  const releaseClaim = async (previous, code, now, deadlineAt) => {
    if (deadlineReached(deadlineAt)) return deadlineOutcome()
    await invokeFailpoint("before_failure_release")
    if (deadlineReached(deadlineAt)) return deadlineOutcome()
    const next = failureReleasePostState(previous, { code, now })
    const transitioned = await transitionEpisode(previous, next, {
      ageValidAt: new Date(now.getTime() - RECOVERY_MAX_AGE_MS),
      createdAtGt: new Date(now.getTime() - RECOVERY_MAX_AGE_MS),
      createdAtGte: sidecarStartedAt,
      leaseValidAt: now,
    })
    if (!transitioned) return { outcome: "conflict" }
    const manualReviewRequired = Boolean(transitioned.manualReviewRequiredAt)
    safeLog(
      targetLogger,
      manualReviewRequired ? "warn" : "info",
      manualReviewRequired
        ? "entitlement.manual_review_required"
        : "entitlement.recovery_retry",
      {
        attempt: transitioned.reconciliationAttempts,
        code,
      }
    )
    return {
      outcome: manualReviewRequired ? "manual_review" : "retry",
      code,
    }
  }

  const processClaimedEpisode = async (claimedEpisode, { deadlineAt } = {}) => {
    if (deadlineReached(deadlineAt)) return deadlineOutcome()
    assertYoungClaimedEpisode(claimedEpisode, await readDatabaseTime())
    if (deadlineReached(deadlineAt)) return deadlineOutcome()

    let evidence
    try {
      evidence = await repository.loadGrantEvidence({
        courseId: claimedEpisode.courseId,
        purchaseId: claimedEpisode.purchaseId,
        studentId: claimedEpisode.studentId,
      })
    } catch {
      const now = await readDatabaseTime()
      if (deadlineReached(deadlineAt)) return deadlineOutcome()
      safeLog(targetLogger, "warn", "entitlement.recovery_evidence_failed", {
        attempt: claimedEpisode.reconciliationAttempts,
        code: RECOVERY_CODES.PURCHASE_CAS_UNCERTAIN,
      })
      return releaseClaim(
        claimedEpisode,
        RECOVERY_CODES.PURCHASE_CAS_UNCERTAIN,
        now,
        deadlineAt
      )
    }

    const decision = classifyRecoveryEvidence(claimedEpisode, evidence, {
      sidecarStartedAt,
    })
    const now = await readDatabaseTime()
    if (deadlineReached(deadlineAt)) return deadlineOutcome()
    if (claimedEpisode.reconciliationLeaseUntil <= now) {
      return { outcome: "lease_expired" }
    }

    if (decision.outcome === RECOVERY_OUTCOMES.RETRY) {
      return releaseClaim(claimedEpisode, decision.code, now, deadlineAt)
    }

    await invokeFailpoint("before_finalization")
    if (deadlineReached(deadlineAt)) return deadlineOutcome()
    const next =
      decision.outcome === RECOVERY_OUTCOMES.ACTIVATE
        ? activationPostState(claimedEpisode, decision.grantedAt)
        : decision.outcome === RECOVERY_OUTCOMES.CANCEL_REFUND
          ? refundCancellationPostState(
              claimedEpisode,
              decision.cancelledAt,
              decision
            )
          : accountDeletionCancellationPostState(
              claimedEpisode,
              decision.cancelledAt
            )
    const transitioned = await transitionEpisode(claimedEpisode, next, {
      ageValidAt: new Date(now.getTime() - RECOVERY_MAX_AGE_MS),
      createdAtGt: new Date(now.getTime() - RECOVERY_MAX_AGE_MS),
      createdAtGte: sidecarStartedAt,
      leaseValidAt: now,
    })
    if (!transitioned) return { outcome: "conflict" }

    const outcome = transitioned.status === "active" ? "activated" : "cancelled"
    safeLog(targetLogger, "info", "entitlement.recovery_succeeded", {
      attempt: transitioned.reconciliationAttempts,
      outcome,
    })
    return { outcome }
  }

  const claimDueProvisioning = async ({ deadlineAt } = {}) => {
    if (deadlineReached(deadlineAt)) return null
    await invokeFailpoint("before_claim")
    if (deadlineReached(deadlineAt)) return null
    const now = await readDatabaseTime()
    if (deadlineReached(deadlineAt)) return null
    const leaseId = createLeaseId()
    if (
      typeof leaseId !== "string" ||
      !leaseId ||
      leaseId.length > 100 ||
      leaseId.trim() !== leaseId
    ) {
      throw new TypeError("createLeaseId returned an invalid lease ID")
    }
    const createdAfterAge = new Date(now.getTime() - RECOVERY_MAX_AGE_MS)
    const claimed = await repository.claimDueProvisioning({
      createdAfter: sidecarStartedAt,
      createdAfterAge,
      leaseId,
      leaseUntil: new Date(now.getTime() + RECOVERY_LEASE_MS),
      now,
    })
    if (!claimed) return null
    assertYoungClaimedEpisode(claimed, now)
    if (
      claimed.reconciliationLeaseId !== leaseId ||
      claimed.reconciliationLeaseUntil.getTime() !==
        now.getTime() + RECOVERY_LEASE_MS
    ) {
      throw new TypeError(
        "the repository returned an unexpected recovery lease"
      )
    }
    safeLog(targetLogger, "info", "entitlement.recovery_claimed", {
      attempt: claimed.reconciliationAttempts,
    })
    await invokeFailpoint("after_claim")
    return claimed
  }

  const sweepExpiredLease = async ({ deadlineAt } = {}) => {
    if (deadlineReached(deadlineAt)) return deadlineOutcome()
    const now = await readDatabaseTime()
    if (deadlineReached(deadlineAt)) return deadlineOutcome()
    const previous = await repository.findExpiredProvisioningLease({
      createdAfter: sidecarStartedAt,
      now,
    })
    if (!previous) return null
    if (deadlineReached(deadlineAt)) return deadlineOutcome()
    assertClaimedEpisode(previous)
    if (previous.reconciliationLeaseUntil > now) {
      throw new TypeError("expired-lease recovery requires an expired lease")
    }
    const code =
      previous.lastReconciliationCode || RECOVERY_CODES.ACTIVATION_RETRY
    await invokeFailpoint("before_failure_release")
    if (deadlineReached(deadlineAt)) return deadlineOutcome()
    const next = failureReleasePostState(previous, { code, now })
    const transitioned = await transitionEpisode(previous, next, {
      createdAtGte: sidecarStartedAt,
      leaseExpiredAt: now,
    })
    if (!transitioned) return { outcome: "conflict" }
    const outcome = transitioned.manualReviewRequiredAt
      ? "manual_review"
      : "expired_lease_released"
    safeLog(targetLogger, "warn", "entitlement.recovery_lease_expired", {
      attempt: transitioned.reconciliationAttempts,
      outcome,
    })
    return { outcome }
  }

  const handoffAgedProvisioning = async ({ deadlineAt } = {}) => {
    if (deadlineReached(deadlineAt)) return deadlineOutcome()
    const now = await readDatabaseTime()
    if (deadlineReached(deadlineAt)) return deadlineOutcome()
    const previous = await repository.findAgedProvisioning({
      createdAfter: sidecarStartedAt,
      createdBefore: new Date(now.getTime() - RECOVERY_MAX_AGE_MS),
      now,
    })
    if (!previous) return null
    if (deadlineReached(deadlineAt)) return deadlineOutcome()
    assertAgedProvisioningEpisode(previous, now)
    await invokeFailpoint("before_finalization")
    if (deadlineReached(deadlineAt)) return deadlineOutcome()
    const next = ageHandoffPostState(previous, now)
    const transitioned = await transitionEpisode(previous, next, {
      ageExpiredAt: new Date(now.getTime() - RECOVERY_MAX_AGE_MS),
      createdAtGte: sidecarStartedAt,
    })
    if (!transitioned) return { outcome: "conflict" }
    safeLog(targetLogger, "warn", "entitlement.manual_review_required", {
      attempt: transitioned.reconciliationAttempts,
      code: transitioned.lastReconciliationCode || "age_exhausted",
    })
    return { outcome: "manual_review" }
  }

  const runBoundaryCatchUp = async (limit, continuation, deadlineAt) => {
    const counts = emptyCatchUpCounts()
    let afterId = validateContinuation(continuation)
    let deadlineExhausted = false
    let hasMore = false
    let lastExaminedId
    while (counts.examinedCount < limit) {
      if (deadlineReached(deadlineAt)) {
        deadlineExhausted = true
        break
      }
      const pageLimit = Math.min(10, limit - counts.examinedCount)
      let page
      try {
        page = await sidecarService.catchUpBoundaryPurchases({
          afterId,
          deadlineAt,
          limit: pageLimit,
        })
      } catch (error) {
        if (error?.code !== "SIDECAR_BUDGET_EXHAUSTED") throw error
        deadlineExhausted = true
        break
      }
      const safePage = sanitizeCatchUpReport(page)
      for (const field of Object.keys(counts)) counts[field] += safePage[field]
      hasMore = safePage.hasMore
      if (safePage.examinedCount > 0) {
        lastExaminedId = validateContinuation(page.nextCursor)
      }
      if (!hasMore || safePage.examinedCount === 0) break
      if (!lastExaminedId) {
        throw new TypeError("boundary catch-up pagination did not advance")
      }
      afterId = lastExaminedId
    }
    if (hasMore && !lastExaminedId) {
      throw new TypeError("boundary catch-up continuation is unavailable")
    }
    return Object.freeze({
      catchUp: Object.freeze({
        ...counts,
        hasMore,
        ...(hasMore ? { continuation: lastExaminedId } : {}),
      }),
      deadlineExhausted,
    })
  }

  const getOperationalStatus = async ({ now } = {}) => {
    const observedAt = now ? asDate(now, "now") : await readDatabaseTime()
    const status = await repository.getRecoveryOperationalStatus({
      now: observedAt,
      sidecarStartedAt,
    })
    return sanitizeOperationalStatus(status, observedAt)
  }

  const runBatch = async ({
    continuation,
    limit = RECOVERY_DEFAULT_BATCH_SIZE,
  } = {}) => {
    validateBatchSize(limit)
    validateContinuation(continuation)
    const startedAt = asNow(clock)
    const deadlineAt = new Date(startedAt.getTime() + RECOVERY_BATCH_BUDGET_MS)
    const requestId = createLeaseId()
    const recovery = {
      activated: 0,
      cancelled: 0,
      conflicts: 0,
      expiredLeasesReleased: 0,
      manualReviewRequired: 0,
      retried: 0,
      revoked: 0,
    }

    safeLog(targetLogger, "info", "entitlement.recovery_started", {
      limit,
      requestId,
    })

    const catchUpResult = await runBoundaryCatchUp(
      limit,
      continuation,
      deadlineAt
    )
    const catchUp = catchUpResult.catchUp
    let deadlineExhausted = catchUpResult.deadlineExhausted

    for (let processed = 0; processed < limit; processed += 1) {
      if (deadlineReached(deadlineAt)) {
        deadlineExhausted = true
        break
      }
      const expired = await sweepExpiredLease({ deadlineAt })
      if (expired) {
        if (expired.outcome === "deadline_exhausted") {
          deadlineExhausted = true
          break
        }
        if (expired.outcome === "expired_lease_released") {
          recovery.expiredLeasesReleased += 1
        } else if (expired.outcome === "manual_review") {
          recovery.manualReviewRequired += 1
        } else recovery.conflicts += 1
        continue
      }

      const aged = await handoffAgedProvisioning({ deadlineAt })
      if (aged) {
        if (aged.outcome === "deadline_exhausted") {
          deadlineExhausted = true
          break
        }
        if (aged.outcome === "manual_review") {
          recovery.manualReviewRequired += 1
        } else recovery.conflicts += 1
        continue
      }

      const claimed = await claimDueProvisioning({ deadlineAt })
      if (!claimed) break
      if (deadlineReached(deadlineAt)) {
        deadlineExhausted = true
        break
      }
      const result = await processClaimedEpisode(claimed, { deadlineAt })
      if (result.outcome === "deadline_exhausted") {
        deadlineExhausted = true
        break
      }
      if (result.outcome === "activated") recovery.activated += 1
      else if (result.outcome === "cancelled") recovery.cancelled += 1
      else if (result.outcome === "retry") recovery.retried += 1
      else if (result.outcome === "manual_review") {
        recovery.manualReviewRequired += 1
      } else recovery.conflicts += 1
    }

    const completedAt = asNow(clock)
    const report = Object.freeze({
      schemaVersion: 1,
      status:
        deadlineExhausted ||
        catchUp.failedCount > 0 ||
        catchUp.hasMore ||
        recovery.conflicts > 0 ||
        recovery.manualReviewRequired > 0
          ? "warning"
          : "completed",
      startedAt: startedAt.toISOString(),
      completedAt: completedAt.toISOString(),
      durationMs: Math.max(0, completedAt.getTime() - startedAt.getTime()),
      limit,
      catchUp,
      recovery: Object.freeze(recovery),
    })
    safeLog(targetLogger, "info", "entitlement.recovery_completed", {
      requestId,
      status: report.status,
      activated: recovery.activated,
      cancelled: recovery.cancelled,
      retried: recovery.retried,
      manualReviewRequired: recovery.manualReviewRequired,
    })
    if (deadlineExhausted) {
      safeLog(targetLogger, "warn", "entitlement.recovery_deadline_exhausted", {
        requestId,
        status: report.status,
      })
    }
    return report
  }

  return Object.freeze({
    claimDueProvisioning,
    getOperationalStatus,
    handoffAgedProvisioning,
    processClaimedEpisode,
    runBatch,
    sweepExpiredLease,
  })
}

module.exports = {
  INITIAL_RECOVERY_DELAY_MS,
  RECOVERY_DEFAULT_BATCH_SIZE,
  RECOVERY_BATCH_BUDGET_MS,
  RECOVERY_LEASE_MS,
  RECOVERY_MAX_AGE_MS,
  RECOVERY_MAX_ATTEMPTS,
  RECOVERY_MAX_BATCH_SIZE,
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
  validateBatchSize,
  validateContinuation,
}
