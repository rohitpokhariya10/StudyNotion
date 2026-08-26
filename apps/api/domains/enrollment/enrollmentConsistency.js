const PURCHASE_STATUSES = Object.freeze([
  "created",
  "order_created",
  "paid",
  "fulfilled",
  "failed",
  "expired",
  "payment_review",
  "refund_pending",
  "refund_requested",
  "refunded",
])

const QUALIFYING_COMMERCIAL_STATUSES = Object.freeze([
  "fulfilled",
  "refund_requested",
])

const REFUND_PENDING_ORIGINS = Object.freeze([
  "payment_review",
  "refund_requested",
  "unknown",
])

const INACTIVE_ACTIVE_COURSE_STATUSES = Object.freeze([
  "failed",
  "expired",
  "payment_review",
  "refunded",
])

const MAX_PAIR_COUNT = 1_000_000
const OBJECT_ID_PATTERN = /^[a-f\d]{24}$/i
const SEVERITIES = Object.freeze({ BLOCKING: "blocking", WARNING: "warning" })
const REFERENCE_STATES = Object.freeze({ INVALID: "invalid", VALID: "valid" })
const USER_ACCOUNT_TYPES = new Set(["Admin", "Instructor", "Student"])

const PAIR_STATE_KEYS = new Set([
  "activeCourseOutsideImmutablePurchaseCount",
  "activePurchaseStatusCounts",
  "activeRefundPendingOriginCounts",
  "courseReferenceState",
  "courseEnrollmentCount",
  "courseExists",
  "courseId",
  "duplicatePurchaseActiveCourseReferenceCount",
  "duplicatePurchaseCourseReferenceCount",
  "progressCount",
  "purchaseStatusCounts",
  "refundPendingOriginCounts",
  "unknownActivePurchaseStatusCount",
  "unknownPurchaseStatusCount",
  "userAccountType",
  "userActive",
  "userApproved",
  "userCourseCount",
  "userDeletionPending",
  "userExists",
  "userId",
  "userReferenceState",
  "userSecurityDefaultsPresent",
])

const OPTIONAL_PAIR_STATE_KEYS = new Set([
  "courseReferenceState",
  "duplicatePurchaseActiveCourseReferenceCount",
  "duplicatePurchaseCourseReferenceCount",
  "userReferenceState",
])

const REQUIRED_PAIR_STATE_KEYS = Object.freeze(
  [...PAIR_STATE_KEYS].filter((key) => !OPTIONAL_PAIR_STATE_KEYS.has(key))
)

const MIRROR_STATES = Object.freeze({
  BOTH: "BOTH_MIRRORS_PRESENT",
  DASHBOARD_ONLY: "DASHBOARD_MIRROR_ONLY",
  NONE: "NO_MIRRORS_PRESENT",
  RUNTIME_ONLY: "RUNTIME_AUTHORITY_ONLY",
})

const ENROLLMENT_DIVERGENCE_SCENARIOS = Object.freeze({
  A: Object.freeze({
    code: "A",
    label: "DASHBOARD_MIRROR_WITHOUT_RUNTIME_AUTHORITY",
  }),
  B: Object.freeze({
    code: "B",
    label: "RUNTIME_AUTHORITY_WITHOUT_ACTIVE_PURCHASE_REFERENCE",
  }),
  C: Object.freeze({
    code: "C",
    label: "ACTIVE_PURCHASE_REFERENCE_WITHOUT_MIRRORS",
  }),
  D: Object.freeze({
    code: "D",
    label: "PROGRESS_WITHOUT_RUNTIME_AUTHORITY",
  }),
  E: Object.freeze({
    code: "E",
    label: "REFUNDED_PURCHASE_WITH_REMAINING_MIRROR",
  }),
  F: Object.freeze({
    code: "F",
    label: "QUALIFYING_PURCHASE_WITH_PARTIAL_MIRROR_WRITE",
  }),
})

class EnrollmentConsistencyInputError extends TypeError {
  constructor(message) {
    super(message)
    this.name = "EnrollmentConsistencyInputError"
    this.code = "INVALID_ENROLLMENT_PAIR_STATE"
  }
}

const isPlainObject = (value) => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false
  const prototype = Object.getPrototypeOf(value)
  return prototype === Object.prototype || prototype === null
}

const deepFreeze = (value) => {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) {
    return value
  }
  for (const child of Object.values(value)) deepFreeze(child)
  return Object.freeze(value)
}

const assertKnownKeys = (value, allowedKeys, path) => {
  for (const key of Object.keys(value)) {
    if (!allowedKeys.has(key)) {
      throw new EnrollmentConsistencyInputError(
        `${path} contains an unknown field: ${key}`
      )
    }
  }
}

const normalizeObjectId = (value, path) => {
  if (typeof value !== "string" || !OBJECT_ID_PATTERN.test(value)) {
    throw new EnrollmentConsistencyInputError(
      `${path} must be a 24-character hexadecimal identifier`
    )
  }
  return value.toLowerCase()
}

const normalizeReference = (value, referenceState, path) => {
  const state = referenceState ?? REFERENCE_STATES.VALID
  if (!Object.values(REFERENCE_STATES).includes(state)) {
    throw new EnrollmentConsistencyInputError(
      `${path}ReferenceState must be valid or invalid`
    )
  }
  if (state === REFERENCE_STATES.INVALID) {
    if (value !== null) {
      throw new EnrollmentConsistencyInputError(
        `${path} must be null when its reference state is invalid`
      )
    }
    return { id: null, state }
  }
  return { id: normalizeObjectId(value, path), state }
}

const normalizeCount = (value, path) => {
  if (!Number.isSafeInteger(value) || value < 0 || value > MAX_PAIR_COUNT) {
    throw new EnrollmentConsistencyInputError(
      `${path} must be an integer from 0 through ${MAX_PAIR_COUNT}`
    )
  }
  return value
}

const normalizeStatusCounts = (value, path) => {
  if (!isPlainObject(value)) {
    throw new EnrollmentConsistencyInputError(`${path} must be an object`)
  }
  assertKnownKeys(value, new Set(PURCHASE_STATUSES), path)
  return Object.fromEntries(
    PURCHASE_STATUSES.map((status) => [
      status,
      Object.hasOwn(value, status)
        ? normalizeCount(value[status], `${path}.${status}`)
        : 0,
    ])
  )
}

const normalizeRefundPendingOriginCounts = (value, path) => {
  if (!isPlainObject(value)) {
    throw new EnrollmentConsistencyInputError(`${path} must be an object`)
  }
  assertKnownKeys(value, new Set(REFUND_PENDING_ORIGINS), path)
  return Object.fromEntries(
    REFUND_PENDING_ORIGINS.map((origin) => [
      origin,
      Object.hasOwn(value, origin)
        ? normalizeCount(value[origin], `${path}.${origin}`)
        : 0,
    ])
  )
}

const normalizePairState = (input) => {
  if (!isPlainObject(input)) {
    throw new EnrollmentConsistencyInputError(
      "Enrollment pair state must be an object"
    )
  }
  assertKnownKeys(input, PAIR_STATE_KEYS, "Enrollment pair state")
  for (const key of REQUIRED_PAIR_STATE_KEYS) {
    if (!Object.hasOwn(input, key)) {
      throw new EnrollmentConsistencyInputError(
        `Enrollment pair state is missing required field: ${key}`
      )
    }
  }

  for (const key of [
    "courseExists",
    "userActive",
    "userApproved",
    "userDeletionPending",
    "userExists",
    "userSecurityDefaultsPresent",
  ]) {
    if (typeof input[key] !== "boolean") {
      throw new EnrollmentConsistencyInputError(`${key} must be a boolean`)
    }
  }

  if (input.userExists) {
    if (
      typeof input.userAccountType !== "string" ||
      !input.userAccountType ||
      input.userAccountType.length > 80 ||
      input.userAccountType.trim() !== input.userAccountType
    ) {
      throw new EnrollmentConsistencyInputError(
        "userAccountType must be a trimmed, non-empty string for an existing user"
      )
    }
  } else if (
    input.userAccountType !== null ||
    input.userActive ||
    input.userApproved ||
    input.userDeletionPending ||
    input.userSecurityDefaultsPresent
  ) {
    throw new EnrollmentConsistencyInputError(
      "A missing user must have a null account type and false account-state flags"
    )
  }

  const courseReference = normalizeReference(
    input.courseId,
    input.courseReferenceState,
    "courseId"
  )
  const userReference = normalizeReference(
    input.userId,
    input.userReferenceState,
    "userId"
  )
  const normalized = {
    activeCourseOutsideImmutablePurchaseCount: normalizeCount(
      input.activeCourseOutsideImmutablePurchaseCount,
      "activeCourseOutsideImmutablePurchaseCount"
    ),
    activePurchaseStatusCounts: normalizeStatusCounts(
      input.activePurchaseStatusCounts,
      "activePurchaseStatusCounts"
    ),
    activeRefundPendingOriginCounts: normalizeRefundPendingOriginCounts(
      input.activeRefundPendingOriginCounts,
      "activeRefundPendingOriginCounts"
    ),
    courseEnrollmentCount: normalizeCount(
      input.courseEnrollmentCount,
      "courseEnrollmentCount"
    ),
    courseExists: input.courseExists,
    courseId: courseReference.id,
    courseReferenceState: courseReference.state,
    duplicatePurchaseActiveCourseReferenceCount: normalizeCount(
      input.duplicatePurchaseActiveCourseReferenceCount ?? 0,
      "duplicatePurchaseActiveCourseReferenceCount"
    ),
    duplicatePurchaseCourseReferenceCount: normalizeCount(
      input.duplicatePurchaseCourseReferenceCount ?? 0,
      "duplicatePurchaseCourseReferenceCount"
    ),
    progressCount: normalizeCount(input.progressCount, "progressCount"),
    purchaseStatusCounts: normalizeStatusCounts(
      input.purchaseStatusCounts,
      "purchaseStatusCounts"
    ),
    refundPendingOriginCounts: normalizeRefundPendingOriginCounts(
      input.refundPendingOriginCounts,
      "refundPendingOriginCounts"
    ),
    unknownActivePurchaseStatusCount: normalizeCount(
      input.unknownActivePurchaseStatusCount,
      "unknownActivePurchaseStatusCount"
    ),
    unknownPurchaseStatusCount: normalizeCount(
      input.unknownPurchaseStatusCount,
      "unknownPurchaseStatusCount"
    ),
    userAccountType: input.userAccountType,
    userActive: input.userActive,
    userApproved: input.userApproved,
    userCourseCount: normalizeCount(input.userCourseCount, "userCourseCount"),
    userDeletionPending: input.userDeletionPending,
    userExists: input.userExists,
    userId: userReference.id,
    userReferenceState: userReference.state,
    userSecurityDefaultsPresent: input.userSecurityDefaultsPresent,
  }

  if (
    normalized.userReferenceState === REFERENCE_STATES.INVALID &&
    normalized.userExists
  ) {
    throw new EnrollmentConsistencyInputError(
      "An invalid user reference cannot resolve to an existing user"
    )
  }
  if (
    normalized.courseReferenceState === REFERENCE_STATES.INVALID &&
    normalized.courseExists
  ) {
    throw new EnrollmentConsistencyInputError(
      "An invalid course reference cannot resolve to an existing course"
    )
  }

  if (
    normalized.courseReferenceState === REFERENCE_STATES.VALID &&
    !normalized.courseExists &&
    normalized.courseEnrollmentCount > 0
  ) {
    throw new EnrollmentConsistencyInputError(
      "courseEnrollmentCount must be zero when the course does not exist"
    )
  }
  if (
    normalized.userReferenceState === REFERENCE_STATES.VALID &&
    !normalized.userExists &&
    normalized.userCourseCount > 0
  ) {
    throw new EnrollmentConsistencyInputError(
      "userCourseCount must be zero when the user does not exist"
    )
  }
  if (
    sumObjectCounts(normalized.refundPendingOriginCounts) !==
    normalized.purchaseStatusCounts.refund_pending
  ) {
    throw new EnrollmentConsistencyInputError(
      "refundPendingOriginCounts must equal purchaseStatusCounts.refund_pending"
    )
  }
  if (
    sumObjectCounts(normalized.activeRefundPendingOriginCounts) !==
    normalized.activePurchaseStatusCounts.refund_pending
  ) {
    throw new EnrollmentConsistencyInputError(
      "activeRefundPendingOriginCounts must equal activePurchaseStatusCounts.refund_pending"
    )
  }
  if (
    normalized.activeCourseOutsideImmutablePurchaseCount >
    sumCounts(normalized.activePurchaseStatusCounts) +
      normalized.unknownActivePurchaseStatusCount
  ) {
    throw new EnrollmentConsistencyInputError(
      "activeCourseOutsideImmutablePurchaseCount cannot exceed active Purchase source records"
    )
  }
  return normalized
}

function sumObjectCounts(counts) {
  return Object.values(counts).reduce((total, count) => total + count, 0)
}

const sumCounts = (counts, statuses = PURCHASE_STATUSES) =>
  statuses.reduce((total, status) => total + counts[status], 0)

const selectMirrorState = ({
  dashboardMirrorPresent,
  runtimeAuthorityPresent,
}) => {
  if (runtimeAuthorityPresent && dashboardMirrorPresent) {
    return MIRROR_STATES.BOTH
  }
  if (runtimeAuthorityPresent) return MIRROR_STATES.RUNTIME_ONLY
  if (dashboardMirrorPresent) return MIRROR_STATES.DASHBOARD_ONLY
  return MIRROR_STATES.NONE
}

const selectScenarios = ({
  commercialJustificationPresent,
  dashboardMirrorPresent,
  pairReferencesValid,
  progressRecordPresent,
  refundedPurchaseCount,
  runtimeAuthorityPresent,
  totalActivePurchaseReferenceCount,
  userEligible,
}) => {
  const scenarios = []
  if (dashboardMirrorPresent && !runtimeAuthorityPresent) {
    scenarios.push(ENROLLMENT_DIVERGENCE_SCENARIOS.A)
  }
  if (runtimeAuthorityPresent && totalActivePurchaseReferenceCount === 0) {
    scenarios.push(ENROLLMENT_DIVERGENCE_SCENARIOS.B)
  }
  if (
    pairReferencesValid &&
    userEligible &&
    totalActivePurchaseReferenceCount > 0 &&
    !runtimeAuthorityPresent &&
    !dashboardMirrorPresent
  ) {
    scenarios.push(ENROLLMENT_DIVERGENCE_SCENARIOS.C)
  }
  if (progressRecordPresent && !runtimeAuthorityPresent) {
    scenarios.push(ENROLLMENT_DIVERGENCE_SCENARIOS.D)
  }
  if (
    refundedPurchaseCount > 0 &&
    !commercialJustificationPresent &&
    (runtimeAuthorityPresent || dashboardMirrorPresent)
  ) {
    scenarios.push(ENROLLMENT_DIVERGENCE_SCENARIOS.E)
  }
  if (
    commercialJustificationPresent &&
    runtimeAuthorityPresent !== dashboardMirrorPresent
  ) {
    scenarios.push(ENROLLMENT_DIVERGENCE_SCENARIOS.F)
  }
  return scenarios
}

const issue = (code, severity, reason) => ({ code, reason, severity })

const financialEvidence = (state) => ({
  activeCourseOutsideImmutablePurchaseCount:
    state.activeCourseOutsideImmutablePurchaseCount,
  activePurchaseStatusCounts: state.activePurchaseStatusCounts,
  activeRefundPendingOriginCounts: state.activeRefundPendingOriginCounts,
  duplicatePurchaseActiveCourseReferenceCount:
    state.duplicatePurchaseActiveCourseReferenceCount,
  duplicatePurchaseCourseReferenceCount:
    state.duplicatePurchaseCourseReferenceCount,
  purchaseStatusCounts: state.purchaseStatusCounts,
  refundPendingOriginCounts: state.refundPendingOriginCounts,
  unknownActivePurchaseStatusCount: state.unknownActivePurchaseStatusCount,
  unknownPurchaseStatusCount: state.unknownPurchaseStatusCount,
})

const evaluatePairState = (input) => {
  const state = normalizePairState(input)
  const qualifyingPurchaseCount =
    sumCounts(state.purchaseStatusCounts, QUALIFYING_COMMERCIAL_STATUSES) +
    state.refundPendingOriginCounts.refund_requested
  const refundedPurchaseCount = state.purchaseStatusCounts.refunded
  const totalPurchaseCount = sumCounts(state.purchaseStatusCounts)
  const totalActivePurchaseReferenceCount =
    sumCounts(state.activePurchaseStatusCounts) +
    state.unknownActivePurchaseStatusCount
  const inactiveActiveCourseStatuses = INACTIVE_ACTIVE_COURSE_STATUSES.filter(
    (status) => state.activePurchaseStatusCounts[status] > 0
  )
  const inactiveActiveCourseReferenceCount = sumCounts(
    state.activePurchaseStatusCounts,
    INACTIVE_ACTIVE_COURSE_STATUSES
  )
  const unknownRefundPendingOriginCount =
    state.refundPendingOriginCounts.unknown
  const unknownActiveRefundPendingOriginCount =
    state.activeRefundPendingOriginCounts.unknown
  const nonEntitlementRefundActiveCourseReferenceCount =
    state.activeRefundPendingOriginCounts.payment_review
  const unknownPurchaseStatusSourceCount = state.unknownPurchaseStatusCount
  const unknownActivePurchaseStatusSourceCount =
    state.unknownActivePurchaseStatusCount
  const activeCourseOutsideImmutablePurchaseCount =
    state.activeCourseOutsideImmutablePurchaseCount
  const duplicatePurchaseActiveCourseReferenceCount =
    state.duplicatePurchaseActiveCourseReferenceCount
  const duplicatePurchaseCourseReferenceCount =
    state.duplicatePurchaseCourseReferenceCount
  const capturedPaymentReconciliationCount = state.purchaseStatusCounts.paid
  const reservationActiveCourseMissingCount =
    Math.max(
      0,
      state.purchaseStatusCounts.created -
        state.activePurchaseStatusCounts.created
    ) +
    Math.max(
      0,
      state.purchaseStatusCounts.order_created -
        state.activePurchaseStatusCounts.order_created
    )
  const pairReferencesValid =
    state.userReferenceState === REFERENCE_STATES.VALID &&
    state.courseReferenceState === REFERENCE_STATES.VALID
  const commercialJustificationPresent = qualifyingPurchaseCount > 0
  const runtimeAuthorityPresent =
    pairReferencesValid && state.courseEnrollmentCount > 0
  const dashboardMirrorPresent =
    pairReferencesValid &&
    state.userAccountType === "Student" &&
    state.userCourseCount > 0
  const progressRecordPresent = pairReferencesValid && state.progressCount > 0
  const userEligible =
    state.userExists &&
    state.userSecurityDefaultsPresent &&
    state.userAccountType === "Student" &&
    state.userActive &&
    state.userApproved &&
    !state.userDeletionPending
  const userAccountTypeRecognized =
    state.userExists && USER_ACCOUNT_TYPES.has(state.userAccountType)
  const expectedMirrors =
    commercialJustificationPresent && userEligible && state.courseExists
  const mirrorState = selectMirrorState({
    dashboardMirrorPresent,
    runtimeAuthorityPresent,
  })
  const scenarios = selectScenarios({
    commercialJustificationPresent,
    dashboardMirrorPresent,
    pairReferencesValid,
    progressRecordPresent,
    refundedPurchaseCount,
    runtimeAuthorityPresent,
    totalActivePurchaseReferenceCount,
    userEligible,
  })
  const canonicalState = {
    activeCourseOutsideImmutablePurchaseCount,
    capturedPaymentReconciliationCount,
    commercialJustificationPresent,
    courseExists: state.courseExists,
    courseReferenceState: state.courseReferenceState,
    dashboardMirrorPresent,
    expectedDashboardMirror: expectedMirrors,
    expectedMirrors,
    expectedProgressRecord: expectedMirrors,
    expectedRuntimeAuthority: expectedMirrors,
    duplicatePurchaseActiveCourseReferenceCount,
    duplicatePurchaseCourseReferenceCount,
    inactiveActiveCourseReferenceCount,
    mirrorState,
    pairReferencesValid,
    progressRecordPresent,
    qualifyingPurchaseCount,
    reservationActiveCourseMissingCount,
    nonEntitlementRefundActiveCourseReferenceCount,
    refundedPurchaseCount,
    runtimeAuthorityPresent,
    scenarios,
    unknownActiveRefundPendingOriginCount,
    unknownRefundPendingOriginCount,
    unknownActivePurchaseStatusSourceCount,
    unknownPurchaseStatusSourceCount,
    userAccountTypeRecognized,
    userCourseReferenceCount: state.userCourseCount,
    userEligible,
    userReferenceState: state.userReferenceState,
    userSecurityDefaultsPresent: state.userSecurityDefaultsPresent,
  }
  const issues = []
  const pairEvidencePresent =
    state.courseEnrollmentCount > 0 ||
    state.userCourseCount > 0 ||
    state.progressCount > 0 ||
    totalPurchaseCount > 0 ||
    totalActivePurchaseReferenceCount > 0 ||
    unknownPurchaseStatusSourceCount > 0 ||
    activeCourseOutsideImmutablePurchaseCount > 0 ||
    duplicatePurchaseActiveCourseReferenceCount > 0 ||
    duplicatePurchaseCourseReferenceCount > 0

  if (
    state.userReferenceState === REFERENCE_STATES.INVALID &&
    pairEvidencePresent
  ) {
    issues.push(
      issue(
        "MALFORMED_USER_REFERENCE",
        SEVERITIES.BLOCKING,
        "Pair evidence contains a non-ObjectId user reference; its raw value is suppressed and the pair requires manual review."
      )
    )
  }
  if (
    state.courseReferenceState === REFERENCE_STATES.INVALID &&
    pairEvidencePresent
  ) {
    issues.push(
      issue(
        "MALFORMED_COURSE_REFERENCE",
        SEVERITIES.BLOCKING,
        "Pair evidence contains a non-ObjectId course reference; its raw value is suppressed and the pair requires manual review."
      )
    )
  }
  if (
    state.userReferenceState === REFERENCE_STATES.VALID &&
    !state.userExists &&
    pairEvidencePresent
  ) {
    issues.push(
      issue(
        "MISSING_USER_REFERENCE",
        SEVERITIES.BLOCKING,
        "Pair evidence references a user that does not exist; purchase history must be preserved and must not recreate enrollment."
      )
    )
  }
  if (
    state.courseReferenceState === REFERENCE_STATES.VALID &&
    !state.courseExists &&
    pairEvidencePresent
  ) {
    issues.push(
      issue(
        "MISSING_COURSE_REFERENCE",
        SEVERITIES.BLOCKING,
        "Pair evidence references a course that does not exist; the financial record cannot justify a runtime entitlement to a missing course."
      )
    )
  }
  if (
    state.userExists &&
    !state.userSecurityDefaultsPresent &&
    pairEvidencePresent
  ) {
    issues.push(
      issue(
        "USER_SECURITY_DEFAULTS_MISSING",
        SEVERITIES.BLOCKING,
        "The persisted User is missing active, approved, or deletionPending security state; enrollment restoration must wait for the existing security backfill."
      )
    )
  }
  if (
    unknownPurchaseStatusSourceCount > 0 ||
    unknownActivePurchaseStatusSourceCount > 0
  ) {
    issues.push(
      issue(
        "UNKNOWN_PURCHASE_STATUS",
        SEVERITIES.BLOCKING,
        `Persisted Purchase evidence has an unknown or missing status (${unknownPurchaseStatusSourceCount} immutable-course source record(s), ${unknownActivePurchaseStatusSourceCount} active-course source record(s)); entitlement changes require financial review.`
      )
    )
  }
  if (capturedPaymentReconciliationCount > 0) {
    issues.push(
      issue(
        "CAPTURED_PAYMENT_REQUIRES_RECONCILIATION",
        SEVERITIES.BLOCKING,
        `${capturedPaymentReconciliationCount} captured paid Purchase record(s) require reconciliation before enrollment changes may be proposed.`
      )
    )
  }
  if (reservationActiveCourseMissingCount > 0) {
    issues.push(
      issue(
        "RESERVATION_ACTIVE_COURSE_MISSING",
        SEVERITIES.BLOCKING,
        `${reservationActiveCourseMissingCount} created or order_created Purchase reservation(s) are missing the matching activeCourses reference and require reconciliation.`
      )
    )
  }
  if (activeCourseOutsideImmutablePurchaseCount > 0) {
    issues.push(
      issue(
        "ACTIVE_COURSE_OUTSIDE_IMMUTABLE_PURCHASE",
        SEVERITIES.BLOCKING,
        `${activeCourseOutsideImmutablePurchaseCount} Purchase record(s) reference this course in activeCourses without containing it in the same Purchase.courses history.`
      )
    )
  }

  const learnerStatePresent =
    runtimeAuthorityPresent || dashboardMirrorPresent || progressRecordPresent
  if (
    state.userExists &&
    state.userSecurityDefaultsPresent &&
    state.userAccountType !== "Student" &&
    pairEvidencePresent
  ) {
    issues.push(
      issue(
        "INVALID_USER_ROLE",
        learnerStatePresent ? SEVERITIES.BLOCKING : SEVERITIES.WARNING,
        "The referenced user has a non-Student account type; only an eligible Student may hold learner mirrors."
      )
    )
  }
  if (
    state.userExists &&
    state.userSecurityDefaultsPresent &&
    state.userAccountType === "Student" &&
    !userEligible &&
    learnerStatePresent
  ) {
    issues.push(
      issue(
        "INELIGIBLE_USER_STATE_RESIDUAL",
        runtimeAuthorityPresent || dashboardMirrorPresent
          ? SEVERITIES.BLOCKING
          : SEVERITIES.WARNING,
        "An inactive, unapproved, or deletion-pending Student retains learner state that must not be treated as current entitlement."
      )
    )
  }

  if (pairReferencesValid && state.courseEnrollmentCount > 1) {
    issues.push(
      issue(
        "DUPLICATE_COURSE_ENROLLMENT_REFERENCES",
        SEVERITIES.BLOCKING,
        `Course.studentsEnroled contains ${state.courseEnrollmentCount} raw references for this user-course pair.`
      )
    )
  }
  if (pairReferencesValid && state.userCourseCount > 1) {
    issues.push(
      issue(
        "DUPLICATE_USER_COURSE_REFERENCES",
        SEVERITIES.BLOCKING,
        `User.courses contains ${state.userCourseCount} raw references for this user-course pair.`
      )
    )
  }
  if (pairReferencesValid && state.progressCount > 1) {
    issues.push(
      issue(
        "DUPLICATE_PROGRESS_RECORDS",
        SEVERITIES.BLOCKING,
        `The pair has ${state.progressCount} progress records; progress must be unique per user and course.`
      )
    )
  }
  if (duplicatePurchaseCourseReferenceCount > 0) {
    issues.push(
      issue(
        "DUPLICATE_PURCHASE_COURSE_REFERENCES",
        SEVERITIES.BLOCKING,
        `Purchase.courses contains ${duplicatePurchaseCourseReferenceCount} excess raw reference(s) for this purchase pair; immutable financial evidence requires manual review.`
      )
    )
  }
  if (duplicatePurchaseActiveCourseReferenceCount > 0) {
    issues.push(
      issue(
        "DUPLICATE_PURCHASE_ACTIVE_COURSE_REFERENCES",
        SEVERITIES.BLOCKING,
        `Purchase.activeCourses contains ${duplicatePurchaseActiveCourseReferenceCount} excess raw reference(s) for this purchase pair.`
      )
    )
  }
  if (pairReferencesValid && qualifyingPurchaseCount > 1) {
    issues.push(
      issue(
        "MULTIPLE_QUALIFYING_PURCHASES",
        SEVERITIES.BLOCKING,
        `The pair has ${qualifyingPurchaseCount} purchases in qualifying commercial statuses and requires financial review.`
      )
    )
  }
  if (inactiveActiveCourseReferenceCount > 0) {
    issues.push(
      issue(
        "INACTIVE_PURCHASE_ACTIVE_COURSE_RESIDUAL",
        SEVERITIES.BLOCKING,
        `Purchase.activeCourses retains ${inactiveActiveCourseReferenceCount} reference(s) in inactive status(es): ${inactiveActiveCourseStatuses.join(", ")}.`
      )
    )
  }
  if (
    unknownRefundPendingOriginCount > 0 ||
    unknownActiveRefundPendingOriginCount > 0
  ) {
    issues.push(
      issue(
        "REFUND_PENDING_ORIGIN_UNKNOWN",
        SEVERITIES.BLOCKING,
        `${unknownRefundPendingOriginCount} immutable-course and ${unknownActiveRefundPendingOriginCount} active-course refund_pending reference(s) have no trusted refund origin; entitlement changes require manual review.`
      )
    )
  }
  if (nonEntitlementRefundActiveCourseReferenceCount > 0) {
    issues.push(
      issue(
        "PAYMENT_REVIEW_REFUND_ACTIVE_COURSE_RESIDUAL",
        SEVERITIES.BLOCKING,
        "A refund_pending purchase originating from payment_review retains Purchase.activeCourses even though that flow did not establish entitlement."
      )
    )
  }

  if (expectedMirrors && runtimeAuthorityPresent && !dashboardMirrorPresent) {
    issues.push(
      issue(
        "DASHBOARD_MIRROR_MISSING",
        SEVERITIES.BLOCKING,
        "Course.studentsEnroled grants runtime access and a qualifying purchase exists, but User.courses is missing the dashboard mirror."
      )
    )
  }
  if (expectedMirrors && !runtimeAuthorityPresent && dashboardMirrorPresent) {
    issues.push(
      issue(
        "RUNTIME_AUTHORITY_MISSING",
        SEVERITIES.BLOCKING,
        "User.courses and a qualifying purchase exist, but Course.studentsEnroled is missing the runtime entitlement authority."
      )
    )
  }
  if (expectedMirrors && !runtimeAuthorityPresent && !dashboardMirrorPresent) {
    issues.push(
      issue(
        "COMMERCIAL_ENTITLEMENT_WITHOUT_MIRRORS",
        SEVERITIES.BLOCKING,
        "A qualifying purchase exists for an eligible Student and existing course, but both enrollment mirrors are absent."
      )
    )
  }
  if (
    !commercialJustificationPresent &&
    unknownPurchaseStatusSourceCount === 0 &&
    (runtimeAuthorityPresent || dashboardMirrorPresent)
  ) {
    issues.push(
      issue(
        "MIRRORS_WITHOUT_QUALIFYING_LEDGER",
        SEVERITIES.BLOCKING,
        "Learner mirrors exist without a fulfilled or refund-requested entitlement purchase; refund_pending qualifies only when its persisted origin is refund_requested."
      )
    )
  }

  if (
    !commercialJustificationPresent &&
    unknownPurchaseStatusSourceCount === 0 &&
    refundedPurchaseCount > 0 &&
    learnerStatePresent
  ) {
    issues.push(
      issue(
        "REFUNDED_PURCHASE_STATE_RESIDUAL",
        runtimeAuthorityPresent || dashboardMirrorPresent
          ? SEVERITIES.BLOCKING
          : SEVERITIES.WARNING,
        "Refunded purchase history does not justify remaining learner mirrors or progress state."
      )
    )
  }
  if (progressRecordPresent && !runtimeAuthorityPresent) {
    issues.push(
      issue(
        "PROGRESS_WITHOUT_RUNTIME_ENTITLEMENT",
        SEVERITIES.WARNING,
        "Progress is historical learning state and does not confer access when Course.studentsEnroled is absent."
      )
    )
  }
  if (expectedMirrors && runtimeAuthorityPresent && !progressRecordPresent) {
    issues.push(
      issue(
        "MISSING_PROGRESS_RECORD",
        SEVERITIES.WARNING,
        "A commercially justified runtime entitlement exists without a progress record."
      )
    )
  }

  return { canonicalState, issues, state }
}

const summarizeIssues = (issues) => ({
  blocking: issues.filter(({ severity }) => severity === SEVERITIES.BLOCKING)
    .length,
  total: issues.length,
  warning: issues.filter(({ severity }) => severity === SEVERITIES.WARNING)
    .length,
})

const classifyEnrollmentPairState = (input) => {
  const { canonicalState, issues, state } = evaluatePairState(input)
  return deepFreeze({
    canonicalState,
    financialEvidence: financialEvidence(state),
    issues,
    pair: { courseId: state.courseId, userId: state.userId },
    summary: summarizeIssues(issues),
  })
}

const addCourseMirror = (state) => ({
  action: "add_unique_reference",
  target: "Course.studentsEnroled",
  value: state.userId,
})

const addUserMirror = (state) => ({
  action: "add_unique_reference",
  target: "User.courses",
  value: state.courseId,
})

const removeCourseMirror = (state) => ({
  action: "remove_reference",
  target: "Course.studentsEnroled",
  value: state.userId,
})

const removeUserMirror = (state) => ({
  action: "remove_reference",
  target: "User.courses",
  value: state.courseId,
})

const removeProgress = () => ({
  action: "delete_pair_records",
  target: "CourseProgress",
})

const removeProgressMirror = () => ({
  action: "reconcile_pair_references",
  target: "User.courseProgress",
})

const residualLearnerStateWrites = (state) => {
  const writes = []
  if (state.courseEnrollmentCount > 0) writes.push(removeCourseMirror(state))
  if (state.userCourseCount > 0) writes.push(removeUserMirror(state))
  if (state.progressCount > 0) {
    writes.push(removeProgress(), removeProgressMirror())
  }
  return writes
}

const residualRuntimeLearnerStateWrites = (state) => {
  const writes = []
  if (state.courseEnrollmentCount > 0) writes.push(removeCourseMirror(state))
  if (state.progressCount > 0) {
    writes.push(removeProgress(), removeProgressMirror())
  }
  return writes
}

const proposalForIssue = ({ canonicalState, issue: foundIssue, state }) => {
  let confidence = "low"
  let proposedWrites = []

  if (
    state.userReferenceState === REFERENCE_STATES.INVALID ||
    state.courseReferenceState === REFERENCE_STATES.INVALID ||
    !state.userExists ||
    !state.courseExists ||
    (state.userExists && !state.userSecurityDefaultsPresent) ||
    (state.userExists && !canonicalState.userAccountTypeRecognized) ||
    state.unknownPurchaseStatusCount > 0 ||
    state.unknownActivePurchaseStatusCount > 0 ||
    canonicalState.capturedPaymentReconciliationCount > 0 ||
    canonicalState.reservationActiveCourseMissingCount > 0 ||
    state.refundPendingOriginCounts.unknown > 0 ||
    state.activeRefundPendingOriginCounts.unknown > 0 ||
    state.activeCourseOutsideImmutablePurchaseCount > 0 ||
    state.duplicatePurchaseCourseReferenceCount > 0 ||
    state.duplicatePurchaseActiveCourseReferenceCount > 0 ||
    canonicalState.qualifyingPurchaseCount > 1
  ) {
    return {
      canonicalState,
      confidence,
      courseId: state.courseId,
      issueCode: foundIssue.code,
      proposedWrites,
      reason: foundIssue.reason,
      safeForAutomaticRepair: false,
      userId: state.userId,
    }
  }

  switch (foundIssue.code) {
    case "INVALID_USER_ROLE":
      proposedWrites = residualRuntimeLearnerStateWrites(state)
      confidence = "medium"
      break
    case "INELIGIBLE_USER_STATE_RESIDUAL":
    case "REFUNDED_PURCHASE_STATE_RESIDUAL":
      proposedWrites = residualLearnerStateWrites(state)
      confidence = "medium"
      break
    case "DUPLICATE_COURSE_ENROLLMENT_REFERENCES":
      proposedWrites = [
        {
          action: "deduplicate_references",
          target: "Course.studentsEnroled",
          value: state.userId,
        },
      ]
      confidence = "high"
      break
    case "DUPLICATE_USER_COURSE_REFERENCES":
      proposedWrites = [
        {
          action: "deduplicate_references",
          target: "User.courses",
          value: state.courseId,
        },
      ]
      confidence = "high"
      break
    case "DUPLICATE_PROGRESS_RECORDS":
      proposedWrites = [
        {
          action: "merge_pair_records_after_review",
          target: "CourseProgress",
        },
        removeProgressMirror(),
      ]
      confidence = "low"
      break
    case "INACTIVE_PURCHASE_ACTIVE_COURSE_RESIDUAL":
      proposedWrites = [
        {
          action: "remove_course_from_inactive_purchase_references",
          statuses: INACTIVE_ACTIVE_COURSE_STATUSES.filter(
            (status) => state.activePurchaseStatusCounts[status] > 0
          ),
          target: "Purchase.activeCourses",
          value: state.courseId,
        },
      ]
      confidence = state.activePurchaseStatusCounts.payment_review
        ? "low"
        : "medium"
      break
    case "DASHBOARD_MIRROR_MISSING":
      proposedWrites = [addUserMirror(state)]
      confidence = "high"
      break
    case "PAYMENT_REVIEW_REFUND_ACTIVE_COURSE_RESIDUAL":
      proposedWrites = [
        {
          action: "remove_course_from_non_entitled_refund",
          refundOriginStatus: "payment_review",
          status: "refund_pending",
          target: "Purchase.activeCourses",
          value: state.courseId,
        },
      ]
      confidence = "high"
      break
    case "RUNTIME_AUTHORITY_MISSING":
      proposedWrites = [addCourseMirror(state)]
      if (state.progressCount === 0) {
        proposedWrites.push(
          { action: "upsert_empty_pair_record", target: "CourseProgress" },
          { action: "reconcile_pair_reference", target: "User.courseProgress" }
        )
      }
      confidence = "medium"
      break
    case "COMMERCIAL_ENTITLEMENT_WITHOUT_MIRRORS":
      proposedWrites = [addCourseMirror(state), addUserMirror(state)]
      if (state.progressCount === 0) {
        proposedWrites.push(
          { action: "upsert_empty_pair_record", target: "CourseProgress" },
          { action: "reconcile_pair_reference", target: "User.courseProgress" }
        )
      }
      confidence = "medium"
      break
    case "MIRRORS_WITHOUT_QUALIFYING_LEDGER":
      proposedWrites = residualLearnerStateWrites(state)
      confidence = "low"
      break
    case "PROGRESS_WITHOUT_RUNTIME_ENTITLEMENT":
      proposedWrites = [removeProgress(), removeProgressMirror()]
      confidence = "medium"
      break
    case "MISSING_PROGRESS_RECORD":
      proposedWrites = [
        { action: "upsert_empty_pair_record", target: "CourseProgress" },
        { action: "reconcile_pair_reference", target: "User.courseProgress" },
      ]
      confidence = "high"
      break
    default:
      // Missing references and financial ambiguity require an operator to
      // establish intent before even a candidate data write is described.
      break
  }

  if (state.userAccountType !== "Student") {
    proposedWrites = proposedWrites.filter(
      ({ target }) => target !== "User.courses"
    )
  }

  return {
    canonicalState,
    confidence,
    courseId: state.courseId,
    issueCode: foundIssue.code,
    proposedWrites,
    reason: foundIssue.reason,
    safeForAutomaticRepair: false,
    userId: state.userId,
  }
}

const mapEnrollmentConsistencyDryRun = (input) => {
  const evaluated = evaluatePairState(input)
  const proposals = evaluated.issues.map((foundIssue) =>
    proposalForIssue({ ...evaluated, issue: foundIssue })
  )
  return deepFreeze({
    canonicalState: evaluated.canonicalState,
    financialEvidence: financialEvidence(evaluated.state),
    issues: evaluated.issues,
    mode: "dry_run",
    pair: {
      courseId: evaluated.state.courseId,
      userId: evaluated.state.userId,
    },
    proposals,
    schemaVersion: 1,
    summary: summarizeIssues(evaluated.issues),
  })
}

module.exports = {
  ENROLLMENT_DIVERGENCE_SCENARIOS,
  EnrollmentConsistencyInputError,
  INACTIVE_ACTIVE_COURSE_STATUSES,
  MAX_PAIR_COUNT,
  MIRROR_STATES,
  PURCHASE_STATUSES,
  QUALIFYING_COMMERCIAL_STATUSES,
  REFUND_PENDING_ORIGINS,
  REFERENCE_STATES,
  classifyEnrollmentPairState,
  mapEnrollmentConsistencyDryRun,
}
