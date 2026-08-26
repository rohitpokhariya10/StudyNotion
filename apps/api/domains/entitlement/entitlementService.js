const logger = require("../../utils/logger")
const entitlementRepository = require("./entitlementRepository")
const { runWithEntitlementOperationSignal } = entitlementRepository
const { assertEntitlementState } = require("./entitlementPolicy")
const {
  MAX_PURCHASE_COURSES,
  analyzePurchaseCourseEvidence,
  purchaseAllowsActivation,
  purchaseFinancialState,
  purchaseHasVerifiedCapture,
  purchaseHasProcessedRefundEvidence,
  purchaseIsInSidecarCohort,
  referenceKey: idString,
  referencesEqual: idsEqual,
  validDate,
} = require("./entitlementPurchaseEvidence")

const MAX_DELETION_EPISODES = 1_000
const DEFAULT_CATCH_UP_LIMIT = 20
const MAX_CATCH_UP_LIMIT = 100
const FIRST_RECOVERY_DELAY_MS = 60 * 1000
const SIDECAR_OPERATION_BUDGET_MS = 5 * 1000

const ELIGIBLE_ACTIVATION_STATUSES = new Set([
  "fulfilled",
  "refund_requested",
  "refund_pending",
])
const RESERVABLE_PURCHASE_STATUSES = new Set([
  "paid",
  ...ELIGIBLE_ACTIVATION_STATUSES,
])
const SAFE_FLOWS = new Set([
  "purchase_reservation",
  "purchase_activation",
  "processed_refund",
  "account_deletion",
  "boundary_catch_up",
  "recovery",
])

class EntitlementSidecarError extends Error {
  constructor(code, message, options) {
    super(message, options)
    this.name = "EntitlementSidecarError"
    this.code = code
  }
}

const fail = (code, message, options) => {
  throw new EntitlementSidecarError(code, message, options)
}

const hasOwn = (value, field) =>
  Object.prototype.hasOwnProperty.call(value, field)

const parseSidecarStartedAt = (value) => {
  if (value === undefined || value === null || value === "") return null
  if (value instanceof Date) {
    if (!validDate(value)) {
      throw new TypeError("ENTITLEMENT_SIDECAR_STARTED_AT must be a valid date")
    }
    return new Date(value.getTime())
  }
  if (
    typeof value !== "string" ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value)
  ) {
    throw new TypeError(
      "ENTITLEMENT_SIDECAR_STARTED_AT must be a strict UTC ISO timestamp with milliseconds"
    )
  }
  const parsed = new Date(value)
  if (!validDate(parsed) || parsed.toISOString() !== value) {
    throw new TypeError(
      "ENTITLEMENT_SIDECAR_STARTED_AT must be a valid UTC ISO timestamp"
    )
  }
  return parsed
}

const resolveNow = (value, clock) => {
  if (value !== undefined) {
    if (!validDate(value)) fail("INVALID_TIME", "now must be a valid Date")
    return new Date(value.getTime())
  }
  const tick = clock()
  const date = tick instanceof Date ? tick : new Date(tick)
  if (!validDate(date)) fail("INVALID_TIME", "clock returned an invalid time")
  return date
}

const safeRequestId = (value) =>
  typeof value === "string" && /^[A-Za-z0-9._:-]{1,100}$/.test(value)
    ? value
    : "unknown"

const boundedDuration = (startedAt, finishedAt) =>
  Math.max(0, Math.min(60_000, Math.round(finishedAt - startedAt)))

const clockMilliseconds = (clock) => {
  const value = clock()
  const milliseconds = value instanceof Date ? value.getTime() : Number(value)
  return Number.isFinite(milliseconds) ? milliseconds : Date.now()
}

const boundedCount = (value, maximum = 1_000) =>
  Number.isSafeInteger(value) ? Math.max(0, Math.min(maximum, value)) : 0

const errorReason = (error) => {
  const value = String(error?.code || "UNCLASSIFIED_FAILURE")
  return /^[A-Z0-9_]{1,64}$/.test(value) ? value : "UNCLASSIFIED_FAILURE"
}

const emit = (targetLogger, level, event, fields) => {
  try {
    targetLogger[level](event, fields)
  } catch {
    // Observability must never affect a non-authoritative sidecar operation.
  }
}

const exactPurchaseCourseIds = (purchase) => {
  const evidence = analyzePurchaseCourseEvidence(purchase)
  if (evidence.ok) return [...evidence.courseIds]
  if (evidence.reason === "course_count_invalid") {
    fail(
      "PURCHASE_COURSE_COUNT_INVALID",
      `Purchase must contain 1-${MAX_PURCHASE_COURSES} Courses`
    )
  }
  if (
    [
      "identity_invalid",
      "course_reference_invalid",
      "line_items_missing",
    ].includes(evidence.reason)
  ) {
    fail("PURCHASE_EVIDENCE_INVALID", "Purchase contains an invalid Course")
  }
  fail(
    "PURCHASE_EVIDENCE_AMBIGUOUS",
    "Purchase Courses and immutable lines do not match exactly"
  )
}

const userIsEligible = (user, studentId) =>
  Boolean(
    user &&
    idsEqual(user._id, studentId) &&
    user.accountType === "Student" &&
    user.active === true &&
    user.approved === true &&
    user.deletionPending === false
  )

const isCompletedDeletionTombstone = (user, studentId) =>
  Boolean(
    user &&
    idsEqual(user._id, studentId) &&
    user.accountType === "Student" &&
    user.active === false &&
    user.approved === false &&
    user.deletionPending === false &&
    validDate(user.deletionStartedAt) &&
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
    user.email === `deleted-${idString(user._id)}@users.invalid` &&
    validDate(user.updatedAt) &&
    user.updatedAt >= user.deletionStartedAt
  )

const episodeMatches = (episode, { courseId, purchaseId, studentId }) =>
  episode?.source === "purchase" &&
  idsEqual(episode.courseId, courseId) &&
  idsEqual(episode.purchaseId, purchaseId) &&
  idsEqual(episode.studentId, studentId)

const validEpisodeState = (episode) => {
  try {
    assertEntitlementState(episode)
    return true
  } catch {
    return false
  }
}

const exactActiveEpisode = (episode, fulfilledAt) =>
  validEpisodeState(episode) &&
  episode.status === "active" &&
  episode.isCurrent === true &&
  validDate(episode.grantedAt) &&
  episode.grantedAt.getTime() === fulfilledAt.getTime()

const exactAccountDeletionEpisode = (episode, purchase, user) =>
  validEpisodeState(episode) &&
  isCompletedDeletionTombstone(user, purchase.user) &&
  ((episode.status === "revoked" &&
    episode.revocationReason === "account_deleted" &&
    validDate(episode.grantedAt) &&
    validDate(purchase.fulfilledAt) &&
    episode.grantedAt.getTime() === purchase.fulfilledAt.getTime() &&
    validDate(episode.revokedAt) &&
    episode.revokedAt.getTime() === user.deletionStartedAt.getTime()) ||
    (episode.status === "cancelled" &&
      episode.cancellationReason === "account_deleted_before_activation" &&
      validDate(episode.cancelledAt) &&
      episode.cancelledAt.getTime() === user.deletionStartedAt.getTime()))

const episodeByCourse = (episodes) =>
  new Map(episodes.map((episode) => [idString(episode.courseId), episode]))

const includesId = (values, expected) =>
  Array.isArray(values) && values.some((value) => idsEqual(value, expected))

const without = (state, fields) => {
  const next = { ...state, revision: state.revision + 1 }
  for (const field of fields) delete next[field]
  return next
}

const provisioningEpisode = ({ courseId, now, purchaseId, studentId }) => ({
  schemaVersion: 1,
  studentId,
  courseId,
  purchaseId,
  isCurrent: true,
  status: "provisioning",
  source: "purchase",
  reconciliationAttempts: 0,
  nextReconciliationAt: new Date(now.getTime() + FIRST_RECOVERY_DELAY_MS),
  revision: 0,
  createdAt: new Date(now),
  updatedAt: new Date(now),
})

const refundTerminalEpisode = ({ courseId, purchase, studentId }) => {
  const common = {
    schemaVersion: 1,
    studentId,
    courseId,
    purchaseId: purchase._id,
    isCurrent: false,
    source: "purchase",
    reconciliationAttempts: 0,
    revision: 0,
  }
  if (purchase.refundOriginStatus === "payment_review") {
    return {
      ...common,
      cancelledAt: purchase.refundProcessedAt,
      cancellationReason: "refund_completed_before_activation",
      replacementDecision: "none",
      replacementOutcome: "not_required",
      status: "cancelled",
    }
  }
  return {
    ...common,
    grantedAt: purchase.fulfilledAt,
    revokedAt: purchase.refundEntitlementsRevokedAt,
    revocationReason: "refund_completed",
    status: "revoked",
  }
}

const accountDeletionTerminalEpisode = ({ courseId, purchase, user }) => {
  const common = {
    schemaVersion: 1,
    studentId: purchase.user,
    courseId,
    purchaseId: purchase._id,
    isCurrent: false,
    source: "purchase",
    reconciliationAttempts: 0,
    revision: 0,
  }
  if (validDate(purchase.fulfilledAt)) {
    if (user.deletionStartedAt.getTime() < purchase.fulfilledAt.getTime()) {
      fail(
        "DELETION_EVIDENCE_INVALID",
        "Completed deletion predates Purchase fulfillment"
      )
    }
    return {
      ...common,
      grantedAt: purchase.fulfilledAt,
      revokedAt: user.deletionStartedAt,
      revocationReason: "account_deleted",
      status: "revoked",
    }
  }
  return {
    ...common,
    cancelledAt: user.deletionStartedAt,
    cancellationReason: "account_deleted_before_activation",
    status: "cancelled",
  }
}

const createEntitlementService = ({
  clock = Date.now,
  failpoint = async () => undefined,
  repository = entitlementRepository,
  sidecarStartedAt,
  targetLogger = logger,
} = {}) => {
  if (typeof failpoint !== "function") {
    throw new TypeError("failpoint must be a function")
  }
  let boundaryParsed = false
  let canonicalStartedAt

  const configuredBoundary = () => {
    if (boundaryParsed) return canonicalStartedAt
    boundaryParsed = true
    try {
      canonicalStartedAt = parseSidecarStartedAt(
        sidecarStartedAt === undefined
          ? process.env.ENTITLEMENT_SIDECAR_STARTED_AT
          : sidecarStartedAt
      )
    } catch (error) {
      fail(
        "SIDECAR_BOUNDARY_INVALID",
        "ENTITLEMENT_SIDECAR_STARTED_AT is invalid",
        { cause: error }
      )
    }
    return canonicalStartedAt
  }

  const requireBoundary = () => {
    const configured = configuredBoundary()
    if (!configured) {
      fail(
        "SIDECAR_BOUNDARY_REQUIRED",
        "ENTITLEMENT_SIDECAR_STARTED_AT is required for bounded catch-up"
      )
    }
    return configured
  }

  const isBoundaryPurchase = (purchase) => {
    return purchaseIsInSidecarCohort(purchase, requireBoundary())
  }

  const assertWithinDeadline = (deadlineAt) => {
    if (deadlineAt === undefined) return
    const deadlineMilliseconds =
      deadlineAt instanceof Date ? deadlineAt.getTime() : Number(deadlineAt)
    if (!Number.isFinite(deadlineMilliseconds)) {
      fail("SIDECAR_DEADLINE_INVALID", "deadlineAt must be a valid time")
    }
    if (clockMilliseconds(clock) >= deadlineMilliseconds) {
      fail(
        "SIDECAR_BUDGET_EXHAUSTED",
        "Entitlement sidecar operation exhausted its bounded time budget"
      )
    }
  }

  const repositoryCall = (deadlineAt, operation) => {
    assertWithinDeadline(deadlineAt)
    return operation()
  }

  const reserveForPurchase = async ({ deadlineAt, now, purchase }) => {
    assertWithinDeadline(deadlineAt)
    if (now !== undefined) resolveNow(now, clock)
    const operationNow = await repositoryCall(deadlineAt, () =>
      repository.readDatabaseTime()
    )
    await failpoint("before_reservation")
    const courseIds = exactPurchaseCourseIds(purchase)
    if (!isBoundaryPurchase(purchase)) {
      fail(
        "PURCHASE_BEFORE_SIDECAR_BOUNDARY",
        "Purchase predates the Entitlement sidecar boundary"
      )
    }
    if (!purchaseHasVerifiedCapture(purchase)) {
      fail(
        "PURCHASE_CAPTURE_EVIDENCE_INVALID",
        "Purchase capture evidence is incomplete"
      )
    }
    const financialState = purchaseFinancialState(purchase)
    if (
      !RESERVABLE_PURCHASE_STATUSES.has(purchase.status) ||
      !["paid", "activation"].includes(financialState)
    ) {
      fail(
        "PURCHASE_NOT_RESERVABLE",
        "Purchase is not in an access-granting financial state"
      )
    }

    const evidence = await repositoryCall(deadlineAt, () =>
      repository.loadReservationEvidence({
        courseIds,
        studentId: purchase.user,
      })
    )
    if (!userIsEligible(evidence.user, purchase.user)) {
      fail("STUDENT_INELIGIBLE", "Student is not eligible for access")
    }
    const existingCourseIds = new Set(
      (evidence.courses || []).map((course) => idString(course._id))
    )
    if (courseIds.some((courseId) => !existingCourseIds.has(courseId))) {
      fail("COURSE_UNAVAILABLE", "A purchased Course no longer exists")
    }

    let episodes = await repositoryCall(deadlineAt, () =>
      repository.findPurchaseEpisodes({
        courseIds,
        purchaseId: purchase._id,
      })
    )
    const existingByCourse = episodeByCourse(episodes)
    for (const courseId of courseIds) {
      const existing = existingByCourse.get(courseId)
      if (
        existing &&
        !episodeMatches(existing, {
          courseId,
          purchaseId: purchase._id,
          studentId: purchase.user,
        })
      ) {
        fail("EPISODE_IDENTITY_CONFLICT", "Entitlement identity conflicts")
      }
    }

    const currentPairs = await repositoryCall(deadlineAt, () =>
      repository.findCurrentPairEpisodes({
        courseIds,
        studentId: purchase.user,
      })
    )
    for (const current of currentPairs) {
      if (!idsEqual(current.purchaseId, purchase._id)) {
        fail(
          "CURRENT_PAIR_CONFLICT",
          "Another current Entitlement owns this Student/Course pair"
        )
      }
    }

    const missing = courseIds
      .filter((courseId) => !existingByCourse.has(courseId))
      .map((courseId) =>
        provisioningEpisode({
          courseId,
          now: operationNow,
          purchaseId: purchase._id,
          studentId: purchase.user,
        })
      )
    let insertError
    if (missing.length) {
      try {
        await repositoryCall(deadlineAt, () =>
          repository.insertEntitlementEpisodes(missing)
        )
      } catch (error) {
        insertError = error
      }
      episodes = await repositoryCall(deadlineAt, () =>
        repository.findPurchaseEpisodes({
          courseIds,
          purchaseId: purchase._id,
        })
      )
    }

    const convergedByCourse = episodeByCourse(episodes)
    for (const courseId of courseIds) {
      const episode = convergedByCourse.get(courseId)
      if (
        !episode ||
        !episodeMatches(episode, {
          courseId,
          purchaseId: purchase._id,
          studentId: purchase.user,
        })
      ) {
        const competing = await repositoryCall(deadlineAt, () =>
          repository.findCurrentPairEpisode({
            courseId,
            studentId: purchase.user,
          })
        )
        if (competing && !idsEqual(competing.purchaseId, purchase._id)) {
          fail(
            "CURRENT_PAIR_CONFLICT",
            "Another current Entitlement won the reservation race",
            { cause: insertError }
          )
        }
        fail(
          "RESERVATION_NOT_DURABLE",
          "Entitlement reservation did not converge",
          { cause: insertError }
        )
      }
      if (!["provisioning", "active"].includes(episode.status)) {
        fail("EPISODE_TERMINAL", "A terminal episode cannot be reserved again")
      }
    }

    await failpoint("after_reservation")
    emit(targetLogger, "info", "entitlement.sidecar.reserved", {
      courseCount: boundedCount(courseIds.length, MAX_PURCHASE_COURSES),
      createdCount: boundedCount(missing.length, MAX_PURCHASE_COURSES),
      outcome: missing.length ? "created" : "replayed",
    })
    return Object.freeze({
      activeCount: episodes.filter((episode) => episode.status === "active")
        .length,
      courseCount: courseIds.length,
      createdCount: missing.length,
      outcome: missing.length ? "reserved" : "replayed",
      provisioningCount: episodes.filter(
        (episode) => episode.status === "provisioning"
      ).length,
    })
  }

  const activateForPurchase = async ({ deadlineAt, now, purchaseId }) => {
    if (now !== undefined) resolveNow(now, clock)
    const operationNow = await repositoryCall(deadlineAt, () =>
      repository.readDatabaseTime()
    )
    const purchase = await repositoryCall(deadlineAt, () =>
      repository.loadPurchaseEvidence({ purchaseId })
    )
    const courseIds = exactPurchaseCourseIds(purchase)
    if (!isBoundaryPurchase(purchase)) {
      fail(
        "PURCHASE_BEFORE_SIDECAR_BOUNDARY",
        "Purchase predates the Entitlement sidecar boundary"
      )
    }
    if (!purchaseHasVerifiedCapture(purchase)) {
      fail(
        "PURCHASE_CAPTURE_EVIDENCE_INVALID",
        "Purchase capture evidence is incomplete"
      )
    }
    if (!purchaseAllowsActivation(purchase)) {
      fail(
        "PURCHASE_NOT_ACTIVATABLE",
        "Purchase is not in an activation-eligible financial state"
      )
    }
    if (!validDate(purchase.fulfilledAt)) {
      fail(
        "FULFILLMENT_EVIDENCE_INVALID",
        "Purchase fulfillment time is missing"
      )
    }
    const episodes = await repositoryCall(deadlineAt, () =>
      repository.findPurchaseEpisodes({
        courseIds,
        purchaseId,
      })
    )
    const byCourse = episodeByCourse(episodes)
    if (courseIds.some((courseId) => !byCourse.has(courseId))) {
      fail("ENTITLEMENT_EPISODE_MISSING", "A Purchase episode is missing")
    }

    const evidence = await repositoryCall(deadlineAt, () =>
      repository.loadActivationEvidence({
        courseIds,
        purchaseId,
        studentId: purchase.user,
      })
    )
    let refreshedCourseIds
    try {
      refreshedCourseIds = exactPurchaseCourseIds(evidence.purchase)
    } catch (error) {
      fail("PURCHASE_EVIDENCE_INVALID", "Purchase evidence changed", {
        cause: error,
      })
    }
    if (
      !idsEqual(evidence.purchase?._id, purchaseId) ||
      !idsEqual(evidence.purchase?.user, purchase.user) ||
      refreshedCourseIds.length !== courseIds.length ||
      refreshedCourseIds.some(
        (courseId, index) => courseId !== courseIds[index]
      ) ||
      !isBoundaryPurchase(evidence.purchase) ||
      !purchaseHasVerifiedCapture(evidence.purchase) ||
      evidence.purchase.paidAt.getTime() !== purchase.paidAt.getTime() ||
      evidence.purchase.razorpayPaymentId !== purchase.razorpayPaymentId ||
      !validDate(evidence.purchase.fulfilledAt) ||
      evidence.purchase.fulfilledAt.getTime() !== purchase.fulfilledAt.getTime()
    ) {
      fail("PURCHASE_EVIDENCE_INVALID", "Purchase evidence changed")
    }
    if (!purchaseAllowsActivation(evidence.purchase)) {
      fail("PURCHASE_NOT_ACTIVATABLE", "Purchase financial state changed")
    }
    if (!userIsEligible(evidence.user, purchase.user)) {
      fail("STUDENT_INELIGIBLE", "Student is not eligible for activation")
    }
    const coursesById = new Map(
      (evidence.courses || []).map((course) => [idString(course._id), course])
    )
    const progressCourseIds = new Set(
      (evidence.progress || []).map((progress) => idString(progress.courseID))
    )
    for (const courseId of courseIds) {
      const course = coursesById.get(courseId)
      if (!course) fail("COURSE_UNAVAILABLE", "A purchased Course is missing")
      if (
        !includesId(evidence.user.courses, courseId) ||
        !includesId(course.studentsEnroled, purchase.user) ||
        !progressCourseIds.has(courseId)
      ) {
        fail(
          "LEGACY_ENROLLMENT_INCOMPLETE",
          "Legacy enrollment evidence is incomplete"
        )
      }
    }

    await failpoint("before_activation")
    let activatedCount = 0
    for (const courseId of courseIds) {
      assertWithinDeadline(deadlineAt)
      const previous = byCourse.get(courseId)
      if (
        !episodeMatches(previous, {
          courseId,
          purchaseId,
          studentId: purchase.user,
        })
      ) {
        fail("EPISODE_IDENTITY_CONFLICT", "Entitlement identity conflicts")
      }
      if (previous.status === "active") {
        if (!exactActiveEpisode(previous, evidence.purchase.fulfilledAt)) {
          fail(
            "ACTIVATION_REPLAY_CONFLICT",
            "Active Entitlement evidence does not match Purchase fulfillment"
          )
        }
        continue
      }
      if (previous.status !== "provisioning") {
        fail("EPISODE_TERMINAL", "A terminal Entitlement cannot be activated")
      }
      if (hasOwn(previous, "reconciliationLeaseId")) {
        fail("ENTITLEMENT_LEASED", "Entitlement is owned by recovery")
      }
      if (
        hasOwn(previous, "manualReviewRequiredAt") ||
        !validDate(previous.createdAt) ||
        previous.createdAt <=
          new Date(operationNow.getTime() - 24 * 60 * 60 * 1000)
      ) {
        fail(
          "ENTITLEMENT_REQUIRES_MANUAL_REVIEW",
          "Automatic activation cannot bypass recovery handoff"
        )
      }

      await failpoint("during_activation")
      const next = without(previous, [
        "nextReconciliationAt",
        "reconciliationLeaseId",
        "reconciliationLeaseUntil",
      ])
      next.status = "active"
      next.grantedAt = evidence.purchase.fulfilledAt
      const transitioned = await repositoryCall(deadlineAt, () =>
        repository.transitionEpisode({
          ageValidAt: new Date(operationNow.getTime() - 24 * 60 * 60 * 1000),
          next,
          previous,
        })
      )
      if (transitioned) activatedCount += 1
    }

    const converged = await repositoryCall(deadlineAt, () =>
      repository.findPurchaseEpisodes({
        courseIds,
        purchaseId,
      })
    )
    if (
      converged.length !== courseIds.length ||
      converged.some(
        (episode) => !exactActiveEpisode(episode, evidence.purchase.fulfilledAt)
      )
    ) {
      fail("ACTIVATION_CAS_CONFLICT", "Entitlement activation did not converge")
    }
    emit(targetLogger, "info", "entitlement.sidecar.activated", {
      activatedCount: boundedCount(activatedCount, MAX_PURCHASE_COURSES),
      courseCount: boundedCount(courseIds.length, MAX_PURCHASE_COURSES),
      outcome: activatedCount ? "activated" : "replayed",
    })
    return Object.freeze({
      activatedCount,
      courseCount: courseIds.length,
      outcome: activatedCount ? "activated" : "replayed",
    })
  }

  const terminalizeProcessedRefund = async ({
    allowCreateMissing = false,
    deadlineAt,
    purchaseId,
  }) => {
    const purchase = await repositoryCall(deadlineAt, () =>
      repository.loadPurchaseEvidence({ purchaseId })
    )
    const courseIds = exactPurchaseCourseIds(purchase)
    if (!isBoundaryPurchase(purchase)) {
      fail(
        "PURCHASE_BEFORE_SIDECAR_BOUNDARY",
        "Purchase predates the Entitlement sidecar boundary"
      )
    }
    if (!purchaseHasVerifiedCapture(purchase)) {
      fail(
        "PURCHASE_CAPTURE_EVIDENCE_INVALID",
        "Purchase capture evidence is incomplete"
      )
    }
    if (!purchaseHasProcessedRefundEvidence(purchase)) {
      fail("REFUND_EVIDENCE_INVALID", "Processed refund evidence is incomplete")
    }

    let episodes = await repositoryCall(deadlineAt, () =>
      repository.findPurchaseEpisodes({
        courseIds,
        purchaseId,
      })
    )
    let byCourse = episodeByCourse(episodes)
    const missingCourseIds = courseIds.filter(
      (courseId) => !byCourse.has(courseId)
    )
    const canCreateMissing = allowCreateMissing
    if (missingCourseIds.length && canCreateMissing) {
      await failpoint("during_replacement_decision")
      let insertError
      try {
        await repositoryCall(deadlineAt, () =>
          repository.insertEntitlementEpisodes(
            missingCourseIds.map((courseId) =>
              refundTerminalEpisode({
                courseId,
                purchase,
                studentId: purchase.user,
              })
            )
          )
        )
      } catch (error) {
        insertError = error
      }
      episodes = await repositoryCall(deadlineAt, () =>
        repository.findPurchaseEpisodes({
          courseIds,
          purchaseId,
        })
      )
      byCourse = episodeByCourse(episodes)
      if (courseIds.some((courseId) => !byCourse.has(courseId))) {
        fail(
          "REFUND_TERMINALIZATION_NOT_DURABLE",
          "Missing refund episodes did not converge",
          { cause: insertError }
        )
      }
    }

    const loadCompletedDeletionEvidence = async (candidateEpisodes) => {
      const hasAccountDeletionTerminal = candidateEpisodes.some(
        (episode) =>
          (episode.status === "revoked" &&
            episode.revocationReason === "account_deleted") ||
          (episode.status === "cancelled" &&
            episode.cancellationReason === "account_deleted_before_activation")
      )
      if (!hasAccountDeletionTerminal) return null
      const user = await repositoryCall(deadlineAt, () =>
        repository.loadDeletionEvidence({ studentId: purchase.user })
      )
      return isCompletedDeletionTombstone(user, purchase.user) ? user : null
    }
    let completedDeletionUser = await loadCompletedDeletionEvidence(episodes)

    let terminalizedCount = 0
    for (const courseId of courseIds) {
      assertWithinDeadline(deadlineAt)
      const previous = byCourse.get(courseId)
      if (!previous) continue
      if (
        !episodeMatches(previous, {
          courseId,
          purchaseId,
          studentId: purchase.user,
        })
      ) {
        fail("EPISODE_IDENTITY_CONFLICT", "Entitlement identity conflicts")
      }
      const exactRefundTerminal =
        validEpisodeState(previous) &&
        ((previous.status === "revoked" &&
          previous.revocationReason === "refund_completed" &&
          validDate(previous.grantedAt) &&
          previous.grantedAt.getTime() === purchase.fulfilledAt?.getTime() &&
          validDate(previous.revokedAt) &&
          previous.revokedAt.getTime() ===
            purchase.refundEntitlementsRevokedAt.getTime()) ||
          (previous.status === "cancelled" &&
            previous.cancellationReason ===
              "refund_completed_before_activation" &&
            validDate(previous.cancelledAt) &&
            previous.cancelledAt.getTime() ===
              purchase.refundProcessedAt.getTime() &&
            (purchase.refundOriginStatus !== "payment_review" ||
              (previous.replacementDecision === "none" &&
                previous.replacementOutcome === "not_required"))))
      const accountDeletionTerminal = exactAccountDeletionEpisode(
        previous,
        purchase,
        completedDeletionUser
      )
      if (exactRefundTerminal || accountDeletionTerminal) {
        continue
      }

      await failpoint("during_refund_terminalization")
      if (previous.status === "active") {
        const next = without(previous, [])
        next.status = "revoked"
        next.isCurrent = false
        next.revokedAt = purchase.refundEntitlementsRevokedAt
        next.revocationReason = "refund_completed"
        if (
          !(await repositoryCall(deadlineAt, () =>
            repository.transitionEpisode({ next, previous })
          ))
        ) {
          fail("REFUND_CAS_CONFLICT", "Refund revocation lost its CAS")
        }
        terminalizedCount += 1
      } else if (previous.status === "provisioning") {
        const next = without(previous, [
          "nextReconciliationAt",
          "reconciliationLeaseId",
          "reconciliationLeaseUntil",
        ])
        next.status = "cancelled"
        next.isCurrent = false
        next.cancelledAt = purchase.refundProcessedAt
        next.cancellationReason = "refund_completed_before_activation"
        if (purchase.refundOriginStatus === "payment_review") {
          next.replacementDecision = "none"
          next.replacementOutcome = "not_required"
        }
        if (
          !(await repositoryCall(deadlineAt, () =>
            repository.transitionEpisode({ next, previous })
          ))
        ) {
          fail("REFUND_CAS_CONFLICT", "Refund cancellation lost its CAS")
        }
        terminalizedCount += 1
      } else {
        fail("REFUND_STATE_CONFLICT", "Refund episode has a conflicting state")
      }
    }

    const finalEpisodes = await repositoryCall(deadlineAt, () =>
      repository.findPurchaseEpisodes({
        courseIds,
        purchaseId,
      })
    )
    const finalByCourse = episodeByCourse(finalEpisodes)
    completedDeletionUser = await loadCompletedDeletionEvidence(finalEpisodes)
    const unresolvedCount = courseIds.filter((courseId) => {
      const episode = finalByCourse.get(courseId)
      if (!episode || !validEpisodeState(episode)) return true
      const refundTerminal =
        (episode.status === "revoked" &&
          episode.revocationReason === "refund_completed" &&
          episode.grantedAt?.getTime() === purchase.fulfilledAt?.getTime() &&
          episode.revokedAt?.getTime() ===
            purchase.refundEntitlementsRevokedAt.getTime()) ||
        (episode.status === "cancelled" &&
          episode.cancellationReason === "refund_completed_before_activation" &&
          episode.cancelledAt?.getTime() ===
            purchase.refundProcessedAt.getTime() &&
          (purchase.refundOriginStatus !== "payment_review" ||
            (episode.replacementDecision === "none" &&
              episode.replacementOutcome === "not_required")))
      const accountDeletionTerminal = exactAccountDeletionEpisode(
        episode,
        purchase,
        completedDeletionUser
      )
      return !refundTerminal && !accountDeletionTerminal
    }).length
    if (unresolvedCount && canCreateMissing) {
      fail(
        "REFUND_TERMINALIZATION_NOT_DURABLE",
        "Processed refund terminalization did not converge"
      )
    }
    emit(targetLogger, "info", "entitlement.sidecar.refund_terminalized", {
      courseCount: boundedCount(courseIds.length, MAX_PURCHASE_COURSES),
      missingCount: boundedCount(unresolvedCount, MAX_PURCHASE_COURSES),
      outcome: unresolvedCount ? "partial" : "terminal",
      terminalizedCount: boundedCount(terminalizedCount, MAX_PURCHASE_COURSES),
    })
    return Object.freeze({
      courseCount: courseIds.length,
      missingCount: unresolvedCount,
      outcome: unresolvedCount ? "partial" : "terminalized",
      terminalizedCount,
    })
  }

  const terminalizeAccountDeletion = async ({
    deadlineAt,
    deletionLockId,
    studentId,
  }) => {
    const user = await repositoryCall(deadlineAt, () =>
      repository.loadDeletionEvidence({ studentId })
    )
    const pendingDeletion =
      Boolean(user && idsEqual(user._id, studentId)) &&
      user.deletionPending === true &&
      validDate(user.deletionStartedAt) &&
      typeof user.deletionLockId === "string" &&
      user.deletionLockId.length > 0 &&
      typeof deletionLockId === "string" &&
      user.deletionLockId === deletionLockId &&
      validDate(user.deletionLockUntil) &&
      user.deletionLockUntil > resolveNow(undefined, clock)
    const completedDeletion = isCompletedDeletionTombstone(user, studentId)
    if (!pendingDeletion && !completedDeletion) {
      fail(
        "DELETION_EVIDENCE_INVALID",
        "Account deletion has neither pending nor exact tombstone evidence"
      )
    }
    const operationAt = completedDeletion
      ? new Date(user.deletionStartedAt.getTime())
      : new Date(user.deletionStartedAt.getTime())
    const createdAfter = requireBoundary()

    let terminalizedCount = 0
    let failedCount = 0
    let afterId
    let hasMore = false
    for (let pass = 0; pass < 2; pass += 1) {
      assertWithinDeadline(deadlineAt)
      const episodes = await repositoryCall(deadlineAt, () =>
        repository.findCurrentStudentEpisodes({
          afterId,
          createdAfter,
          limit: MAX_DELETION_EPISODES,
          studentId,
        })
      )
      if (!episodes.length) break
      for (const previous of episodes) {
        afterId = previous._id
        assertWithinDeadline(deadlineAt)
        const purchase = await repositoryCall(deadlineAt, () =>
          repository.loadPurchaseEvidence({ purchaseId: previous.purchaseId })
        )
        const purchaseCourses = analyzePurchaseCourseEvidence(purchase)
        if (
          !purchaseCourses.ok ||
          !isBoundaryPurchase(purchase) ||
          !purchaseHasVerifiedCapture(purchase) ||
          !idsEqual(purchase._id, previous.purchaseId) ||
          !idsEqual(purchase.user, previous.studentId) ||
          !purchaseCourses.courseIds.includes(idString(previous.courseId)) ||
          !["activation", "processed_refund"].includes(
            purchaseFinancialState(purchase)
          )
        ) {
          failedCount += 1
          continue
        }
        await failpoint("during_account_deletion")
        const next = without(previous, [
          "nextReconciliationAt",
          "reconciliationLeaseId",
          "reconciliationLeaseUntil",
        ])
        next.isCurrent = false
        if (previous.status === "active") {
          next.status = "revoked"
          next.revokedAt = operationAt
          next.revocationReason = "account_deleted"
        } else if (previous.status === "provisioning") {
          next.status = "cancelled"
          next.cancelledAt = operationAt
          next.cancellationReason = "account_deleted_before_activation"
        } else {
          fail("DELETION_STATE_CONFLICT", "Deletion episode is not current")
        }
        if (
          await repositoryCall(deadlineAt, () =>
            repository.transitionEpisode({
              createdAtGte: createdAfter,
              next,
              previous,
            })
          )
        ) {
          terminalizedCount += 1
        }
      }
      if (episodes.length < MAX_DELETION_EPISODES) break
      hasMore = pass === 1
    }
    const partial = failedCount > 0 || hasMore
    emit(targetLogger, "info", "entitlement.sidecar.account_terminalized", {
      failedCount: boundedCount(failedCount, MAX_DELETION_EPISODES),
      hasMore,
      outcome: partial
        ? "partial"
        : terminalizedCount
          ? "terminalized"
          : "replayed",
      terminalizedCount: boundedCount(terminalizedCount, MAX_DELETION_EPISODES),
    })
    return Object.freeze({
      failedCount,
      hasMore,
      outcome: partial
        ? "partial"
        : terminalizedCount
          ? "terminalized"
          : "replayed",
      terminalizedCount,
    })
  }

  const terminalizeDeletedPurchase = async ({ deadlineAt, purchaseId }) => {
    const purchase = await repositoryCall(deadlineAt, () =>
      repository.loadPurchaseEvidence({ purchaseId })
    )
    const courseIds = exactPurchaseCourseIds(purchase)
    if (!isBoundaryPurchase(purchase)) {
      fail(
        "PURCHASE_BEFORE_SIDECAR_BOUNDARY",
        "Purchase predates the Entitlement sidecar boundary"
      )
    }
    if (
      !purchaseHasVerifiedCapture(purchase) ||
      !["activation", "processed_refund"].includes(
        purchaseFinancialState(purchase)
      )
    ) {
      fail(
        "DELETION_PURCHASE_EVIDENCE_INVALID",
        "Completed deletion Purchase evidence is invalid"
      )
    }
    const user = await repositoryCall(deadlineAt, () =>
      repository.loadDeletionEvidence({ studentId: purchase.user })
    )
    if (!isCompletedDeletionTombstone(user, purchase.user)) {
      fail(
        "DELETION_EVIDENCE_INVALID",
        "Completed account-deletion evidence changed"
      )
    }
    let episodes = await repositoryCall(deadlineAt, () =>
      repository.findPurchaseEpisodes({ courseIds, purchaseId })
    )
    let byCourse = episodeByCourse(episodes)
    let transitionedCount = 0
    for (const courseId of courseIds) {
      const previous = byCourse.get(courseId)
      if (!previous || previous.isCurrent !== true) continue
      if (
        !episodeMatches(previous, {
          courseId,
          purchaseId,
          studentId: purchase.user,
        }) ||
        !validEpisodeState(previous) ||
        !["active", "provisioning"].includes(previous.status)
      ) {
        fail(
          "DELETION_STATE_CONFLICT",
          "Purchase Entitlement has invalid current deletion state"
        )
      }
      await failpoint("during_account_deletion")
      const next = without(previous, [
        "nextReconciliationAt",
        "reconciliationLeaseId",
        "reconciliationLeaseUntil",
      ])
      next.isCurrent = false
      if (previous.status === "active") {
        next.status = "revoked"
        next.revokedAt = user.deletionStartedAt
        next.revocationReason = "account_deleted"
      } else {
        next.status = "cancelled"
        next.cancelledAt = user.deletionStartedAt
        next.cancellationReason = "account_deleted_before_activation"
      }
      if (
        await repositoryCall(deadlineAt, () =>
          repository.transitionEpisode({
            createdAtGte: requireBoundary(),
            next,
            previous,
          })
        )
      ) {
        transitionedCount += 1
      }
    }
    if (transitionedCount) {
      episodes = await repositoryCall(deadlineAt, () =>
        repository.findPurchaseEpisodes({ courseIds, purchaseId })
      )
      byCourse = episodeByCourse(episodes)
    }
    const missingCourseIds = courseIds.filter(
      (courseId) => !byCourse.has(courseId)
    )
    if (missingCourseIds.length) {
      await failpoint("during_account_deletion")
      let insertError
      try {
        await repositoryCall(deadlineAt, () =>
          repository.insertEntitlementEpisodes(
            missingCourseIds.map((courseId) =>
              accountDeletionTerminalEpisode({ courseId, purchase, user })
            )
          )
        )
      } catch (error) {
        insertError = error
      }
      episodes = await repositoryCall(deadlineAt, () =>
        repository.findPurchaseEpisodes({ courseIds, purchaseId })
      )
      byCourse = episodeByCourse(episodes)
      if (courseIds.some((courseId) => !byCourse.has(courseId))) {
        fail(
          "DELETION_TERMINALIZATION_NOT_DURABLE",
          "Completed-deletion audit episodes did not converge",
          { cause: insertError }
        )
      }
    }

    for (const courseId of courseIds) {
      const episode = byCourse.get(courseId)
      if (
        !episodeMatches(episode, {
          courseId,
          purchaseId,
          studentId: purchase.user,
        }) ||
        !validEpisodeState(episode)
      ) {
        fail(
          "DELETION_STATE_CONFLICT",
          "Purchase Entitlement did not converge to account deletion"
        )
      }
      const exactAccountTerminal =
        (episode.status === "revoked" &&
          episode.revocationReason === "account_deleted" &&
          episode.grantedAt?.getTime() === purchase.fulfilledAt?.getTime() &&
          episode.revokedAt?.getTime() === user.deletionStartedAt.getTime()) ||
        (episode.status === "cancelled" &&
          episode.cancellationReason === "account_deleted_before_activation" &&
          episode.cancelledAt?.getTime() === user.deletionStartedAt.getTime())
      const exactRefundTerminal =
        purchaseFinancialState(purchase) === "processed_refund" &&
        ((episode.status === "revoked" &&
          episode.revocationReason === "refund_completed" &&
          episode.grantedAt?.getTime() === purchase.fulfilledAt?.getTime() &&
          episode.revokedAt?.getTime() ===
            purchase.refundEntitlementsRevokedAt.getTime()) ||
          (episode.status === "cancelled" &&
            episode.cancellationReason ===
              "refund_completed_before_activation" &&
            episode.cancelledAt?.getTime() ===
              purchase.refundProcessedAt.getTime()))
      if (!exactAccountTerminal && !exactRefundTerminal) {
        fail(
          "DELETION_STATE_CONFLICT",
          "Purchase Entitlement has conflicting terminal provenance"
        )
      }
    }
    return Object.freeze({
      courseCount: courseIds.length,
      terminalizedCount: transitionedCount + missingCourseIds.length,
    })
  }

  const catchUpBoundaryPurchases = async ({
    afterId,
    deadlineAt,
    limit = DEFAULT_CATCH_UP_LIMIT,
  } = {}) => {
    const startedAt = requireBoundary()
    if (
      !Number.isSafeInteger(limit) ||
      limit < 1 ||
      limit > MAX_CATCH_UP_LIMIT
    ) {
      fail(
        "CATCH_UP_LIMIT_INVALID",
        `catch-up limit must be 1-${MAX_CATCH_UP_LIMIT}`
      )
    }
    const page = await repositoryCall(deadlineAt, () =>
      repository.findBoundaryPurchaseCandidates({
        afterId,
        limit,
        startedAt,
      })
    )
    const counts = {
      activatedCount: 0,
      failedCount: 0,
      reservedCount: 0,
      terminalizedCount: 0,
    }
    let deadlineExhausted = false
    let examinedCandidateCount = 0
    let lastExaminedCandidateId
    for (const { financialEvidenceMalformed, purchase } of page.candidates) {
      try {
        assertWithinDeadline(deadlineAt)
        if (financialEvidenceMalformed) {
          counts.failedCount += 1
          emit(
            targetLogger,
            "warn",
            "entitlement.sidecar.catch_up_item_failed",
            {
              outcome: "failed",
              reasonCode: "PURCHASE_EVIDENCE_INVALID",
            }
          )
          continue
        }
        const processedRefund =
          purchase.refundProviderStatus === "processed" &&
          ["refund_pending", "refunded"].includes(purchase.status)
        if (processedRefund || purchase.status === "refunded") {
          const result = await terminalizeProcessedRefund({
            allowCreateMissing: true,
            deadlineAt,
            purchaseId: purchase._id,
          })
          counts.terminalizedCount += result.terminalizedCount
          continue
        }
        if (
          purchase.status === "refund_pending" &&
          purchase.refundOriginStatus !== "refund_requested"
        ) {
          continue
        }
        const reservation = await reserveForPurchase({ deadlineAt, purchase })
        counts.reservedCount += reservation.createdCount
        // Catch-up repairs missing reservations only. Existing provisioning
        // work belongs exclusively to the due/lease/attempt recovery state
        // machine; this scanner must not become an unmetered second worker.
        if (purchase.status !== "paid" && reservation.createdCount > 0) {
          const activation = await activateForPurchase({
            deadlineAt,
            purchaseId: purchase._id,
          })
          counts.activatedCount += activation.activatedCount
        }
      } catch (error) {
        if (error?.code === "SIDECAR_BUDGET_EXHAUSTED") {
          counts.failedCount += 1
          deadlineExhausted = true
          emit(
            targetLogger,
            "warn",
            "entitlement.sidecar.catch_up_item_failed",
            {
              outcome: "failed",
              reasonCode: "SIDECAR_BUDGET_EXHAUSTED",
            }
          )
          break
        }
        let reportedError = error
        if (error?.code === "STUDENT_INELIGIBLE") {
          try {
            const deletion = await terminalizeDeletedPurchase({
              deadlineAt,
              purchaseId: purchase._id,
            })
            counts.terminalizedCount += deletion.terminalizedCount
            continue
          } catch (deletionError) {
            reportedError = deletionError
          }
        }
        counts.failedCount += 1
        emit(targetLogger, "warn", "entitlement.sidecar.catch_up_item_failed", {
          outcome: "failed",
          reasonCode: errorReason(reportedError),
        })
      } finally {
        examinedCandidateCount += 1
        lastExaminedCandidateId = idString(purchase._id)
      }
    }
    const lastPurchase = page.candidates.at(-1)?.purchase
    const pageCompleted = !deadlineExhausted
    const report = Object.freeze({
      ...counts,
      examinedCount: pageCompleted ? page.scannedCount : examinedCandidateCount,
      failedCount: counts.failedCount,
      hasMore: deadlineExhausted || page.hasMore,
      nextCursor:
        !pageCompleted && lastExaminedCandidateId
          ? lastExaminedCandidateId
          : page.nextCursor === null || page.nextCursor === undefined
            ? lastPurchase
              ? idString(lastPurchase._id)
              : null
            : idString(page.nextCursor),
    })
    emit(targetLogger, "info", "entitlement.sidecar.catch_up_completed", {
      activatedCount: boundedCount(report.activatedCount),
      examinedCount: boundedCount(report.examinedCount),
      failedCount: boundedCount(report.failedCount),
      hasMore: report.hasMore,
      outcome: report.failedCount ? "partial" : "completed",
      reservedCount: boundedCount(report.reservedCount),
      terminalizedCount: boundedCount(report.terminalizedCount),
    })
    return report
  }

  const runNonAuthoritativeSidecar = async ({
    deadlineAt: outerDeadlineAt,
    flow,
    operation,
    requestId,
  }) => {
    const startedAt = clockMilliseconds(clock)
    const localDeadlineMilliseconds = startedAt + SIDECAR_OPERATION_BUDGET_MS
    const safeFlow = SAFE_FLOWS.has(flow) ? flow : "unknown"
    const abortController = new AbortController()
    let completedAt
    let timeout
    try {
      if (typeof operation !== "function") {
        throw new TypeError("operation must be a function")
      }
      const outerDeadlineMilliseconds =
        outerDeadlineAt === undefined
          ? localDeadlineMilliseconds
          : outerDeadlineAt instanceof Date
            ? outerDeadlineAt.getTime()
            : Number(outerDeadlineAt)
      if (!Number.isFinite(outerDeadlineMilliseconds)) {
        fail("SIDECAR_DEADLINE_INVALID", "deadlineAt must be a valid time")
      }
      const deadlineMilliseconds = Math.min(
        localDeadlineMilliseconds,
        outerDeadlineMilliseconds
      )
      const remainingMilliseconds = deadlineMilliseconds - startedAt
      if (remainingMilliseconds <= 0) {
        fail(
          "SIDECAR_BUDGET_EXHAUSTED",
          "Entitlement sidecar operation exhausted its bounded time budget"
        )
      }

      const deadlineAt = new Date(deadlineMilliseconds)
      timeout = setTimeout(
        () =>
          abortController.abort(
            new EntitlementSidecarError(
              "SIDECAR_BUDGET_EXHAUSTED",
              "Entitlement sidecar operation exhausted its bounded time budget"
            )
          ),
        remainingMilliseconds
      )
      const result = await runWithEntitlementOperationSignal(
        abortController.signal,
        () =>
          operation({
            deadlineAt,
            signal: abortController.signal,
          })
      )
      if (abortController.signal.aborted) {
        throw abortController.signal.reason
      }
      completedAt = clockMilliseconds(clock)
      if (completedAt >= deadlineMilliseconds) {
        abortController.abort(
          new EntitlementSidecarError(
            "SIDECAR_BUDGET_EXHAUSTED",
            "Entitlement sidecar operation exhausted its bounded time budget"
          )
        )
        throw abortController.signal.reason
      }
      emit(targetLogger, "info", "entitlement.sidecar.completed", {
        durationMs: boundedDuration(startedAt, completedAt),
        flow: safeFlow,
        outcome: "succeeded",
        requestId: safeRequestId(requestId),
      })
      return { ok: true, result }
    } catch (error) {
      const failure = abortController.signal.aborted
        ? abortController.signal.reason
        : error
      completedAt ??= clockMilliseconds(clock)
      emit(targetLogger, "warn", "entitlement.sidecar.failed", {
        durationMs: boundedDuration(startedAt, completedAt),
        error:
          typeof targetLogger.errorMetadata === "function"
            ? targetLogger.errorMetadata(failure)
            : logger.errorMetadata(failure),
        flow: safeFlow,
        outcome: "failed",
        reasonCode: errorReason(failure),
        requestId: safeRequestId(requestId),
      })
      return { ok: false }
    } finally {
      clearTimeout(timeout)
    }
  }

  return Object.freeze({
    activateForPurchase,
    catchUpBoundaryPurchases,
    reserveForPurchase,
    runNonAuthoritativeSidecar,
    terminalizeAccountDeletion,
    terminalizeProcessedRefund,
  })
}

const service = createEntitlementService()

module.exports = Object.freeze({
  DEFAULT_CATCH_UP_LIMIT,
  EntitlementSidecarError,
  FIRST_RECOVERY_DELAY_MS,
  MAX_CATCH_UP_LIMIT,
  MAX_PURCHASE_COURSES,
  SIDECAR_OPERATION_BUDGET_MS,
  createEntitlementService,
  isCompletedDeletionTombstone,
  parseSidecarStartedAt,
  ...service,
})
