const assert = require("node:assert/strict")
const test = require("node:test")

const {
  ENROLLMENT_DIVERGENCE_SCENARIOS,
  EnrollmentConsistencyInputError,
  INACTIVE_ACTIVE_COURSE_STATUSES,
  MAX_PAIR_COUNT,
  MIRROR_STATES,
  PURCHASE_STATUSES,
  QUALIFYING_COMMERCIAL_STATUSES,
  classifyEnrollmentPairState,
  mapEnrollmentConsistencyDryRun,
} = require("../domains/enrollment/enrollmentConsistency")

const userId = "64b000000000000000000001"
const courseId = "64b000000000000000000002"

const pairState = (overrides = {}) => ({
  activeCourseOutsideImmutablePurchaseCount: 0,
  activePurchaseStatusCounts: { fulfilled: 1 },
  activeRefundPendingOriginCounts: {},
  courseEnrollmentCount: 1,
  courseExists: true,
  courseId,
  courseReferenceState: "valid",
  duplicatePurchaseActiveCourseReferenceCount: 0,
  duplicatePurchaseCourseReferenceCount: 0,
  progressCount: 1,
  purchaseStatusCounts: { fulfilled: 1 },
  refundPendingOriginCounts: {},
  unknownActivePurchaseStatusCount: 0,
  unknownPurchaseStatusCount: 0,
  userAccountType: "Student",
  userActive: true,
  userApproved: true,
  userCourseCount: 1,
  userDeletionPending: false,
  userExists: true,
  userId,
  userReferenceState: "valid",
  userSecurityDefaultsPresent: true,
  ...overrides,
})

const issueCodes = (result) => result.issues.map(({ code }) => code)

test("commercial statuses are centralized and exclude in-flight and refunded purchases", () => {
  assert.deepEqual(PURCHASE_STATUSES, [
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
  assert.deepEqual(QUALIFYING_COMMERCIAL_STATUSES, [
    "fulfilled",
    "refund_requested",
  ])
  assert.deepEqual(INACTIVE_ACTIVE_COURSE_STATUSES, [
    "failed",
    "expired",
    "payment_review",
    "refunded",
  ])
  assert.equal(Object.isFrozen(QUALIFYING_COMMERCIAL_STATUSES), true)
})

test("classifies mirror presence independently from commercial justification", async (t) => {
  const cases = [
    {
      mirrorState: MIRROR_STATES.BOTH,
      name: "both",
      overrides: {},
      issues: [],
    },
    {
      mirrorState: MIRROR_STATES.RUNTIME_ONLY,
      name: "runtime only",
      overrides: { userCourseCount: 0 },
      issues: ["DASHBOARD_MIRROR_MISSING"],
    },
    {
      mirrorState: MIRROR_STATES.DASHBOARD_ONLY,
      name: "dashboard only",
      overrides: { courseEnrollmentCount: 0, progressCount: 0 },
      issues: ["RUNTIME_AUTHORITY_MISSING"],
    },
    {
      mirrorState: MIRROR_STATES.NONE,
      name: "none",
      overrides: {
        courseEnrollmentCount: 0,
        progressCount: 0,
        userCourseCount: 0,
      },
      issues: ["COMMERCIAL_ENTITLEMENT_WITHOUT_MIRRORS"],
    },
  ]

  for (const entry of cases) {
    await t.test(entry.name, () => {
      const result = classifyEnrollmentPairState(pairState(entry.overrides))
      assert.equal(result.canonicalState.mirrorState, entry.mirrorState)
      assert.deepEqual(issueCodes(result), entry.issues)
    })
  }
})

test("characterizes the documented A-F scenarios without treating every scenario as entitlement", async (t) => {
  const cases = [
    {
      name: "A user dashboard mirror without course runtime authority",
      overrides: {
        activePurchaseStatusCounts: {},
        courseEnrollmentCount: 0,
        progressCount: 0,
        purchaseStatusCounts: {},
      },
      scenarios: ["A"],
    },
    {
      name: "B runtime authority without activeCourses",
      overrides: { activePurchaseStatusCounts: {} },
      scenarios: ["B"],
    },
    {
      name: "C active purchase reference without mirrors",
      overrides: {
        activePurchaseStatusCounts: { created: 1 },
        courseEnrollmentCount: 0,
        progressCount: 0,
        purchaseStatusCounts: { created: 1 },
        userCourseCount: 0,
      },
      scenarios: ["C"],
    },
    {
      name: "D progress without runtime authority",
      overrides: {
        activePurchaseStatusCounts: {},
        courseEnrollmentCount: 0,
        purchaseStatusCounts: {},
        userCourseCount: 0,
      },
      scenarios: ["D"],
    },
    {
      name: "E refunded purchase with a remaining dashboard mirror",
      overrides: {
        activePurchaseStatusCounts: {},
        courseEnrollmentCount: 0,
        progressCount: 0,
        purchaseStatusCounts: { refunded: 1 },
      },
      scenarios: ["A", "E"],
    },
    {
      name: "F qualifying purchase with one mirror missing",
      overrides: { userCourseCount: 0 },
      scenarios: ["F"],
    },
  ]

  for (const entry of cases) {
    await t.test(entry.name, () => {
      const result = classifyEnrollmentPairState(pairState(entry.overrides))
      assert.deepEqual(
        result.canonicalState.scenarios.map(({ code }) => code),
        entry.scenarios
      )
    })
  }

  assert.equal(ENROLLMENT_DIVERGENCE_SCENARIOS.B.code, "B")
  assert.equal(Object.isFrozen(ENROLLMENT_DIVERGENCE_SCENARIOS), true)
})

test("all and only qualifying immutable purchase histories justify mirrors", () => {
  for (const status of QUALIFYING_COMMERCIAL_STATUSES) {
    const result = classifyEnrollmentPairState(
      pairState({
        activePurchaseStatusCounts: { [status]: 1 },
        purchaseStatusCounts: { [status]: 1 },
      })
    )
    assert.equal(result.canonicalState.commercialJustificationPresent, true)
    assert.equal(result.canonicalState.mirrorState, MIRROR_STATES.BOTH)
  }

  for (const status of [
    "created",
    "order_created",
    "paid",
    "failed",
    "expired",
    "payment_review",
    "refunded",
  ]) {
    const result = classifyEnrollmentPairState(
      pairState({
        activePurchaseStatusCounts: {},
        courseEnrollmentCount: 0,
        progressCount: 0,
        purchaseStatusCounts: { [status]: 1 },
        userCourseCount: 0,
      })
    )
    assert.equal(result.canonicalState.commercialJustificationPresent, false)
    assert.equal(result.canonicalState.mirrorState, MIRROR_STATES.NONE)
  }
})

test("refund_pending justification follows its persisted origin", () => {
  const entitledRefund = classifyEnrollmentPairState(
    pairState({
      activePurchaseStatusCounts: { refund_pending: 1 },
      activeRefundPendingOriginCounts: { refund_requested: 1 },
      purchaseStatusCounts: { refund_pending: 1 },
      refundPendingOriginCounts: { refund_requested: 1 },
    })
  )
  assert.equal(
    entitledRefund.canonicalState.commercialJustificationPresent,
    true
  )
  assert.deepEqual(issueCodes(entitledRefund), [])

  const paymentReviewRefund = classifyEnrollmentPairState(
    pairState({
      activePurchaseStatusCounts: {},
      activeRefundPendingOriginCounts: {},
      courseEnrollmentCount: 0,
      progressCount: 0,
      purchaseStatusCounts: { refund_pending: 1 },
      refundPendingOriginCounts: { payment_review: 1 },
      userCourseCount: 0,
    })
  )
  assert.equal(
    paymentReviewRefund.canonicalState.commercialJustificationPresent,
    false
  )
  assert.deepEqual(issueCodes(paymentReviewRefund), [])

  const unknownOrigin = classifyEnrollmentPairState(
    pairState({
      activePurchaseStatusCounts: {},
      activeRefundPendingOriginCounts: {},
      courseEnrollmentCount: 0,
      progressCount: 0,
      purchaseStatusCounts: { refund_pending: 1 },
      refundPendingOriginCounts: { unknown: 1 },
      userCourseCount: 0,
    })
  )
  assert.deepEqual(issueCodes(unknownOrigin), ["REFUND_PENDING_ORIGIN_UNKNOWN"])
  assert.equal(unknownOrigin.issues[0].severity, "blocking")
})

test("payment-review refunds cannot retain active course locks", () => {
  const result = mapEnrollmentConsistencyDryRun(
    pairState({
      activePurchaseStatusCounts: { refund_pending: 1 },
      activeRefundPendingOriginCounts: { payment_review: 1 },
      courseEnrollmentCount: 0,
      progressCount: 0,
      purchaseStatusCounts: { refund_pending: 1 },
      refundPendingOriginCounts: { payment_review: 1 },
      userCourseCount: 0,
    })
  )

  assert.deepEqual(issueCodes(result), [
    "PAYMENT_REVIEW_REFUND_ACTIVE_COURSE_RESIDUAL",
  ])
  assert.deepEqual(result.proposals[0].proposedWrites, [
    {
      action: "remove_course_from_non_entitled_refund",
      refundOriginStatus: "payment_review",
      status: "refund_pending",
      target: "Purchase.activeCourses",
      value: courseId,
    },
  ])
  assert.equal(result.proposals[0].safeForAutomaticRepair, false)
})

test("activeCourses is not required for fulfilled enrollment or manual fulfillment", () => {
  const result = classifyEnrollmentPairState(
    pairState({
      activePurchaseStatusCounts: {},
      purchaseStatusCounts: { fulfilled: 1 },
      userCourseCount: 0,
    })
  )

  assert.deepEqual(issueCodes(result), ["DASHBOARD_MIRROR_MISSING"])
  assert.equal(result.canonicalState.commercialJustificationPresent, true)
  assert.equal(result.canonicalState.inactiveActiveCourseReferenceCount, 0)
})

test("reservation activeCourses references remain valid for in-flight statuses", () => {
  for (const status of ["created", "order_created"]) {
    const result = classifyEnrollmentPairState(
      pairState({
        activePurchaseStatusCounts: { [status]: 1 },
        courseEnrollmentCount: 0,
        progressCount: 0,
        purchaseStatusCounts: { [status]: 1 },
        userCourseCount: 0,
      })
    )
    assert.deepEqual(issueCodes(result), [])
  }
})

test("missing reservation locks block every dry-run write", async (t) => {
  for (const status of ["created", "order_created"]) {
    await t.test(status, () => {
      const result = mapEnrollmentConsistencyDryRun(
        pairState({
          activePurchaseStatusCounts: {},
          courseEnrollmentCount: 0,
          progressCount: 0,
          purchaseStatusCounts: { [status]: 1 },
          userCourseCount: 0,
        })
      )
      assert.deepEqual(issueCodes(result), [
        "RESERVATION_ACTIVE_COURSE_MISSING",
      ])
      assert.equal(result.canonicalState.reservationActiveCourseMissingCount, 1)
      assert.deepEqual(result.proposals[0].proposedWrites, [])
    })
  }

  const withMirrors = mapEnrollmentConsistencyDryRun(
    pairState({
      activePurchaseStatusCounts: {},
      purchaseStatusCounts: { created: 1 },
    })
  )
  assert.deepEqual(issueCodes(withMirrors), [
    "RESERVATION_ACTIVE_COURSE_MISSING",
    "MIRRORS_WITHOUT_QUALIFYING_LEDGER",
  ])
  assert.equal(
    withMirrors.proposals.every(
      ({ proposedWrites }) => proposedWrites.length === 0
    ),
    true
  )
})

test("captured paid purchases always block for manual reconciliation", async (t) => {
  const cases = [
    {
      name: "no mirrors or active reservation",
      overrides: {
        activePurchaseStatusCounts: {},
        courseEnrollmentCount: 0,
        progressCount: 0,
        purchaseStatusCounts: { paid: 1 },
        userCourseCount: 0,
      },
    },
    {
      name: "partial mirrors",
      overrides: {
        activePurchaseStatusCounts: { paid: 1 },
        progressCount: 0,
        purchaseStatusCounts: { paid: 1 },
        userCourseCount: 0,
      },
    },
    {
      name: "both mirrors",
      overrides: {
        activePurchaseStatusCounts: { paid: 1 },
        purchaseStatusCounts: { paid: 1 },
      },
    },
  ]

  for (const entry of cases) {
    await t.test(entry.name, () => {
      const result = mapEnrollmentConsistencyDryRun(pairState(entry.overrides))
      assert.equal(
        issueCodes(result).includes("CAPTURED_PAYMENT_REQUIRES_RECONCILIATION"),
        true
      )
      assert.equal(result.canonicalState.capturedPaymentReconciliationCount, 1)
      assert.equal(result.summary.blocking > 0, true)
      assert.equal(
        result.proposals.every(
          ({ proposedWrites }) => proposedWrites.length === 0
        ),
        true
      )
    })
  }
})

test("activeCourses references on inactive purchases are blocking residuals", () => {
  const result = mapEnrollmentConsistencyDryRun(
    pairState({
      activePurchaseStatusCounts: {
        expired: 2,
        payment_review: 1,
        refunded: 1,
      },
      courseEnrollmentCount: 0,
      progressCount: 0,
      purchaseStatusCounts: { expired: 2, payment_review: 1, refunded: 1 },
      userCourseCount: 0,
    })
  )

  assert.deepEqual(issueCodes(result), [
    "INACTIVE_PURCHASE_ACTIVE_COURSE_RESIDUAL",
  ])
  assert.equal(result.issues[0].severity, "blocking")
  assert.deepEqual(result.proposals[0].proposedWrites, [
    {
      action: "remove_course_from_inactive_purchase_references",
      statuses: ["expired", "payment_review", "refunded"],
      target: "Purchase.activeCourses",
      value: courseId,
    },
  ])
  assert.equal(result.proposals[0].confidence, "low")
  assert.equal(result.proposals[0].safeForAutomaticRepair, false)
})

test("completed account deletion does not turn fulfilled history into a restoration proposal", () => {
  const result = mapEnrollmentConsistencyDryRun(
    pairState({
      courseEnrollmentCount: 0,
      progressCount: 0,
      userActive: false,
      userApproved: false,
      userCourseCount: 0,
    })
  )

  assert.equal(result.canonicalState.mirrorState, MIRROR_STATES.NONE)
  assert.equal(result.canonicalState.commercialJustificationPresent, true)
  assert.equal(result.canonicalState.expectedMirrors, false)
  assert.equal(result.canonicalState.expectedRuntimeAuthority, false)
  assert.equal(result.canonicalState.expectedDashboardMirror, false)
  assert.equal(result.canonicalState.expectedProgressRecord, false)
  assert.deepEqual(result.issues, [])
  assert.deepEqual(result.proposals, [])
  assert.deepEqual(result.canonicalState.scenarios, [])
})

test("missing references are blocking and cannot propose restoring historical enrollment", () => {
  const missingUser = mapEnrollmentConsistencyDryRun(
    pairState({
      courseEnrollmentCount: 0,
      progressCount: 0,
      userAccountType: null,
      userActive: false,
      userApproved: false,
      userCourseCount: 0,
      userDeletionPending: false,
      userExists: false,
      userSecurityDefaultsPresent: false,
    })
  )
  assert.deepEqual(issueCodes(missingUser), ["MISSING_USER_REFERENCE"])
  assert.equal(missingUser.issues[0].severity, "blocking")
  assert.deepEqual(missingUser.proposals[0].proposedWrites, [])

  const missingCourse = mapEnrollmentConsistencyDryRun(
    pairState({
      courseEnrollmentCount: 0,
      courseExists: false,
      progressCount: 0,
      userCourseCount: 1,
    })
  )
  assert.deepEqual(issueCodes(missingCourse), ["MISSING_COURSE_REFERENCE"])
  assert.deepEqual(missingCourse.proposals[0].proposedWrites, [])

  for (const proposal of [
    ...missingUser.proposals,
    ...missingCourse.proposals,
  ]) {
    assert.equal(
      proposal.proposedWrites.some(({ action }) =>
        action.startsWith("add_unique")
      ),
      false
    )
  }
})

test("invalid roles never action User.courses ownership evidence", () => {
  const invalidRole = mapEnrollmentConsistencyDryRun(
    pairState({ userAccountType: "Instructor" })
  )
  assert.deepEqual(issueCodes(invalidRole), ["INVALID_USER_ROLE"])
  assert.deepEqual(
    invalidRole.proposals[0].proposedWrites.map(({ action }) => action),
    ["remove_reference", "delete_pair_records", "reconcile_pair_references"]
  )
  assert.equal(
    invalidRole.proposals.some(({ proposedWrites }) =>
      proposedWrites.some(({ target }) => target === "User.courses")
    ),
    false
  )
  assert.equal(invalidRole.canonicalState.dashboardMirrorPresent, false)
  assert.equal(invalidRole.canonicalState.userCourseReferenceCount, 1)

  const contextualOwnership = mapEnrollmentConsistencyDryRun(
    pairState({
      courseEnrollmentCount: 0,
      progressCount: 0,
      userAccountType: "Instructor",
    })
  )
  assert.deepEqual(issueCodes(contextualOwnership), ["INVALID_USER_ROLE"])
  assert.equal(contextualOwnership.issues[0].severity, "warning")
  assert.equal(contextualOwnership.proposals[0].proposedWrites.length, 0)
})

test("ineligible Students never receive entitlement proposals", () => {
  const pendingDeletion = mapEnrollmentConsistencyDryRun(
    pairState({ userDeletionPending: true })
  )
  assert.deepEqual(issueCodes(pendingDeletion), [
    "INELIGIBLE_USER_STATE_RESIDUAL",
  ])
  assert.equal(pendingDeletion.canonicalState.expectedMirrors, false)
  assert.equal(
    pendingDeletion.proposals[0].proposedWrites.some(
      ({ action }) => action === "add_unique_reference"
    ),
    false
  )
})

test("missing persisted security defaults block restoration proposals", () => {
  const result = mapEnrollmentConsistencyDryRun(
    pairState({
      userActive: false,
      userApproved: false,
      userSecurityDefaultsPresent: false,
    })
  )

  assert.deepEqual(issueCodes(result), ["USER_SECURITY_DEFAULTS_MISSING"])
  assert.equal(result.canonicalState.userEligible, false)
  assert.equal(result.canonicalState.expectedMirrors, false)
  assert.equal(
    result.proposals.every(({ proposedWrites }) => proposedWrites.length === 0),
    true
  )
})

test("unknown Purchase statuses block without inferring restoration or removal", () => {
  const withMirrors = mapEnrollmentConsistencyDryRun(
    pairState({
      activePurchaseStatusCounts: {},
      purchaseStatusCounts: {},
      unknownPurchaseStatusCount: 2,
    })
  )
  assert.deepEqual(issueCodes(withMirrors), ["UNKNOWN_PURCHASE_STATUS"])
  assert.deepEqual(withMirrors.proposals[0].proposedWrites, [])
  assert.deepEqual(withMirrors.financialEvidence, {
    activeCourseOutsideImmutablePurchaseCount: 0,
    activePurchaseStatusCounts: Object.fromEntries(
      PURCHASE_STATUSES.map((status) => [status, 0])
    ),
    activeRefundPendingOriginCounts: {
      payment_review: 0,
      refund_requested: 0,
      unknown: 0,
    },
    duplicatePurchaseActiveCourseReferenceCount: 0,
    duplicatePurchaseCourseReferenceCount: 0,
    purchaseStatusCounts: Object.fromEntries(
      PURCHASE_STATUSES.map((status) => [status, 0])
    ),
    refundPendingOriginCounts: {
      payment_review: 0,
      refund_requested: 0,
      unknown: 0,
    },
    unknownActivePurchaseStatusCount: 0,
    unknownPurchaseStatusCount: 2,
  })

  const withoutMirrors = mapEnrollmentConsistencyDryRun(
    pairState({
      activePurchaseStatusCounts: {},
      courseEnrollmentCount: 0,
      progressCount: 0,
      purchaseStatusCounts: {},
      unknownPurchaseStatusCount: 1,
      userCourseCount: 0,
    })
  )
  assert.deepEqual(issueCodes(withoutMirrors), ["UNKNOWN_PURCHASE_STATUS"])
  assert.deepEqual(withoutMirrors.proposals[0].proposedWrites, [])
})

test("activeCourses outside the same immutable Purchase history is blocking", () => {
  const result = mapEnrollmentConsistencyDryRun(
    pairState({
      activeCourseOutsideImmutablePurchaseCount: 1,
      activePurchaseStatusCounts: { created: 1 },
      courseEnrollmentCount: 0,
      progressCount: 0,
      purchaseStatusCounts: {},
      userCourseCount: 0,
    })
  )

  assert.deepEqual(issueCodes(result), [
    "ACTIVE_COURSE_OUTSIDE_IMMUTABLE_PURCHASE",
  ])
  assert.deepEqual(result.proposals[0].proposedWrites, [])
  assert.deepEqual(
    result.canonicalState.scenarios.map(({ code }) => code),
    ["C"]
  )
})

test("malformed references fail closed without exposing raw values", () => {
  const malformedUser = mapEnrollmentConsistencyDryRun(
    pairState({
      userAccountType: null,
      userActive: false,
      userApproved: false,
      userCourseCount: 0,
      userDeletionPending: false,
      userExists: false,
      userId: null,
      userReferenceState: "invalid",
      userSecurityDefaultsPresent: false,
    })
  )
  assert.deepEqual(issueCodes(malformedUser), ["MALFORMED_USER_REFERENCE"])
  assert.deepEqual(malformedUser.pair, { courseId, userId: null })
  assert.equal(malformedUser.canonicalState.userReferenceState, "invalid")
  assert.equal(malformedUser.canonicalState.pairReferencesValid, false)
  assert.equal(malformedUser.canonicalState.runtimeAuthorityPresent, false)
  assert.equal(malformedUser.canonicalState.progressRecordPresent, false)
  assert.equal(
    malformedUser.proposals.every(
      ({ proposedWrites }) => proposedWrites.length === 0
    ),
    true
  )

  const malformedCourse = mapEnrollmentConsistencyDryRun(
    pairState({
      activePurchaseStatusCounts: { fulfilled: 1 },
      courseEnrollmentCount: 0,
      courseExists: false,
      courseId: null,
      courseReferenceState: "invalid",
      progressCount: 0,
      userCourseCount: 0,
    })
  )
  assert.deepEqual(issueCodes(malformedCourse), ["MALFORMED_COURSE_REFERENCE"])
  assert.deepEqual(malformedCourse.pair, { courseId: null, userId })
  assert.equal(
    JSON.stringify(malformedCourse).includes("not-an-object-id"),
    false
  )
})

test("invalid account types are reported without interpolating persisted values", () => {
  const sensitiveAccountType = "private-role-marker@example.test"
  const result = mapEnrollmentConsistencyDryRun(
    pairState({ userAccountType: sensitiveAccountType })
  )

  assert.deepEqual(issueCodes(result), ["INVALID_USER_ROLE"])
  assert.equal(JSON.stringify(result).includes(sensitiveAccountType), false)
  assert.equal(
    result.issues[0].reason,
    "The referenced user has a non-Student account type; only an eligible Student may hold learner mirrors."
  )
  assert.equal(result.canonicalState.userAccountTypeRecognized, false)
  assert.equal(
    result.proposals.every(({ proposedWrites }) => proposedWrites.length === 0),
    true
  )
})

test("raw Purchase array duplicates are blocking financial ambiguity", () => {
  const result = mapEnrollmentConsistencyDryRun(
    pairState({
      courseEnrollmentCount: 0,
      duplicatePurchaseActiveCourseReferenceCount: 3,
      duplicatePurchaseCourseReferenceCount: 2,
      progressCount: 0,
      userCourseCount: 0,
    })
  )

  assert.deepEqual(issueCodes(result), [
    "DUPLICATE_PURCHASE_COURSE_REFERENCES",
    "DUPLICATE_PURCHASE_ACTIVE_COURSE_REFERENCES",
    "COMMERCIAL_ENTITLEMENT_WITHOUT_MIRRORS",
  ])
  assert.equal(
    result.proposals.every(({ proposedWrites }) => proposedWrites.length === 0),
    true
  )
  assert.deepEqual(
    result.canonicalState.scenarios.map(({ code }) => code),
    ["C"]
  )
})

test("pair-level ambiguity suppresses every otherwise concrete dry-run write", async (t) => {
  const cases = [
    {
      name: "unknown purchase status",
      overrides: {
        activePurchaseStatusCounts: {},
        courseEnrollmentCount: 2,
        purchaseStatusCounts: {},
        unknownPurchaseStatusCount: 1,
      },
    },
    {
      name: "unknown refund origin",
      overrides: {
        activePurchaseStatusCounts: { refund_pending: 1 },
        activeRefundPendingOriginCounts: { unknown: 1 },
        courseEnrollmentCount: 2,
        purchaseStatusCounts: { refund_pending: 1 },
        refundPendingOriginCounts: { unknown: 1 },
      },
    },
    {
      name: "missing security defaults",
      overrides: {
        courseEnrollmentCount: 2,
        userActive: false,
        userApproved: false,
        userSecurityDefaultsPresent: false,
      },
    },
    {
      name: "active course outside immutable history",
      overrides: {
        activeCourseOutsideImmutablePurchaseCount: 1,
        activePurchaseStatusCounts: { created: 1 },
        courseEnrollmentCount: 2,
        purchaseStatusCounts: {},
      },
    },
  ]

  for (const entry of cases) {
    await t.test(entry.name, () => {
      const result = mapEnrollmentConsistencyDryRun(pairState(entry.overrides))
      assert.equal(result.issues.length > 1, true)
      assert.equal(
        result.proposals.every(
          ({ proposedWrites }) => proposedWrites.length === 0
        ),
        true
      )
    })
  }
})

test("duplicates and multiple qualifying purchases are reported in deterministic order", () => {
  const result = mapEnrollmentConsistencyDryRun(
    pairState({
      courseEnrollmentCount: 3,
      progressCount: 2,
      purchaseStatusCounts: {
        fulfilled: 1,
        refund_pending: 1,
        refund_requested: 1,
      },
      refundPendingOriginCounts: { refund_requested: 1 },
      userCourseCount: 2,
    })
  )

  assert.deepEqual(issueCodes(result), [
    "DUPLICATE_COURSE_ENROLLMENT_REFERENCES",
    "DUPLICATE_USER_COURSE_REFERENCES",
    "DUPLICATE_PROGRESS_RECORDS",
    "MULTIPLE_QUALIFYING_PURCHASES",
  ])
  assert.deepEqual(result.summary, { blocking: 4, total: 4, warning: 0 })
  assert.equal(
    result.proposals.every(
      ({ safeForAutomaticRepair }) => safeForAutomaticRepair === false
    ),
    true
  )
  assert.deepEqual(
    result.proposals.map(({ issueCode }) => issueCode),
    issueCodes(result)
  )
  assert.deepEqual(
    result.proposals.find(
      ({ issueCode }) => issueCode === "MULTIPLE_QUALIFYING_PURCHASES"
    ).proposedWrites,
    []
  )
})

test("refunded residual state is separate from the missing-ledger mismatch", () => {
  const result = classifyEnrollmentPairState(
    pairState({
      activePurchaseStatusCounts: {},
      purchaseStatusCounts: { refunded: 1 },
    })
  )

  assert.deepEqual(issueCodes(result), [
    "MIRRORS_WITHOUT_QUALIFYING_LEDGER",
    "REFUNDED_PURCHASE_STATE_RESIDUAL",
  ])
  assert.deepEqual(result.summary, { blocking: 2, total: 2, warning: 0 })
})

test("progress never grants entitlement and missing progress is only a warning", () => {
  const orphanProgress = classifyEnrollmentPairState(
    pairState({
      activePurchaseStatusCounts: {},
      courseEnrollmentCount: 0,
      purchaseStatusCounts: {},
      userCourseCount: 0,
    })
  )
  assert.equal(orphanProgress.canonicalState.runtimeAuthorityPresent, false)
  assert.equal(
    orphanProgress.canonicalState.commercialJustificationPresent,
    false
  )
  assert.deepEqual(issueCodes(orphanProgress), [
    "PROGRESS_WITHOUT_RUNTIME_ENTITLEMENT",
  ])
  assert.equal(orphanProgress.issues[0].severity, "warning")

  const missingProgress = classifyEnrollmentPairState(
    pairState({ progressCount: 0 })
  )
  assert.deepEqual(issueCodes(missingProgress), ["MISSING_PROGRESS_RECORD"])
  assert.equal(missingProgress.issues[0].severity, "warning")
})

test("dry-run proposals are deterministic, bounded, immutable, and never automatic", () => {
  const input = pairState({
    courseEnrollmentCount: 0,
    courseId: courseId.toUpperCase(),
    progressCount: 0,
    userCourseCount: 0,
    userId: userId.toUpperCase(),
  })
  const before = structuredClone(input)
  const first = mapEnrollmentConsistencyDryRun(input)
  const second = mapEnrollmentConsistencyDryRun(input)

  assert.deepEqual(first, second)
  assert.deepEqual(input, before)
  assert.equal(first.mode, "dry_run")
  assert.equal(first.schemaVersion, 1)
  assert.deepEqual(first.pair, { courseId, userId })
  assert.equal(first.proposals.length, first.issues.length)
  assert.equal(
    first.proposals.every(
      (proposal) =>
        proposal.userId === userId &&
        proposal.courseId === courseId &&
        proposal.canonicalState === first.canonicalState &&
        proposal.safeForAutomaticRepair === false
    ),
    true
  )
  assert.equal(Object.isFrozen(first), true)
  assert.equal(Object.isFrozen(first.canonicalState), true)
  assert.equal(Object.isFrozen(first.proposals[0].proposedWrites), true)
})

test("strict pair-state validation rejects ambiguous and unbounded input", async (t) => {
  const invalidStates = [
    ["non-object", null],
    ["unknown top-level field", pairState({ surprise: true })],
    ["bad identifier", pairState({ userId: "not-an-object-id" })],
    [
      "invalid reference retaining a raw value",
      pairState({ userId: "not-an-object-id", userReferenceState: "invalid" }),
    ],
    [
      "unknown reference discriminator",
      pairState({ userReferenceState: "untrusted" }),
    ],
    ["negative count", pairState({ progressCount: -1 })],
    [
      "explicitly undefined status count",
      pairState({ purchaseStatusCounts: { fulfilled: undefined } }),
    ],
    ["unbounded count", pairState({ progressCount: MAX_PAIR_COUNT + 1 })],
    [
      "unknown purchase status",
      pairState({ purchaseStatusCounts: { charged_back: 1 } }),
    ],
    [
      "unknown active-purchase status",
      pairState({ activePurchaseStatusCounts: { abandoned: 1 } }),
    ],
    [
      "mismatched refund origin counts",
      pairState({
        purchaseStatusCounts: { refund_pending: 1 },
        refundPendingOriginCounts: {},
      }),
    ],
    [
      "missing-user flags",
      pairState({
        courseEnrollmentCount: 0,
        progressCount: 0,
        userAccountType: null,
        userActive: true,
        userApproved: false,
        userCourseCount: 0,
        userExists: false,
      }),
    ],
    ["missing course with source count", pairState({ courseExists: false })],
    [
      "outside immutable count larger than active source records",
      pairState({
        activeCourseOutsideImmutablePurchaseCount: 2,
        activePurchaseStatusCounts: { created: 1 },
      }),
    ],
  ]
  const missingRequired = pairState()
  delete missingRequired.progressCount
  invalidStates.push(["missing required field", missingRequired])

  for (const [name, input] of invalidStates) {
    await t.test(name, () => {
      assert.throws(
        () => classifyEnrollmentPairState(input),
        (error) =>
          error instanceof EnrollmentConsistencyInputError &&
          error.code === "INVALID_ENROLLMENT_PAIR_STATE"
      )
    })
  }
})

test("the maximum supported raw count remains accepted", () => {
  const result = classifyEnrollmentPairState(
    pairState({
      courseEnrollmentCount: MAX_PAIR_COUNT,
      progressCount: MAX_PAIR_COUNT,
      userCourseCount: MAX_PAIR_COUNT,
    })
  )
  assert.equal(result.summary.blocking, 3)
})
