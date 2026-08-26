const assert = require("node:assert/strict")
const test = require("node:test")

const {
  AUDIT_ACTIONS,
  AUDIT_OUTCOME_CODES,
  AUDIT_STATUSES,
  ENTITLEMENT_CANCELLATION_REASONS,
  ENTITLEMENT_POLICY_ERROR_CODES,
  ENTITLEMENT_RECONCILIATION_CODES,
  ENTITLEMENT_REPLACEMENT_ABANDON_REASONS,
  ENTITLEMENT_REPLACEMENT_DECISIONS,
  ENTITLEMENT_REPLACEMENT_OUTCOMES,
  ENTITLEMENT_REVOCATION_REASONS,
  ENTITLEMENT_SOURCES,
  ENTITLEMENT_STATUSES,
  EntitlementPolicyError,
  assertAuditTransition,
  assertEntitlementMutation,
  assertEntitlementOperationAuditMutation,
  assertEntitlementOperationAuditState,
  assertEntitlementState,
  assertTransition,
  canTransition,
  canTransitionAudit,
  isAccessGranting,
  isTerminal,
} = require("../domains/entitlement/entitlementPolicy")

const ids = Object.freeze({
  actor: "64b000000000000000000001",
  course: "64b000000000000000000002",
  entitlement: "64b000000000000000000003",
  otherEntitlement: "64b000000000000000000004",
  purchase: "64b000000000000000000005",
  replacementPurchase: "64b000000000000000000006",
  student: "64b000000000000000000007",
})

const moments = Object.freeze({
  cancelled: new Date("2026-08-10T12:03:00.000Z"),
  completed: new Date("2026-08-10T12:05:00.000Z"),
  created: new Date("2026-08-10T12:00:00.000Z"),
  granted: new Date("2026-08-10T12:01:00.000Z"),
  lease: new Date("2026-08-10T12:02:00.000Z"),
  manual: new Date("2026-08-10T12:04:00.000Z"),
  requested: new Date("2026-08-10T12:00:30.000Z"),
  revoked: new Date("2026-08-10T12:03:00.000Z"),
  scheduled: new Date("2026-08-10T12:01:00.000Z"),
  updated: new Date("2026-08-10T12:00:10.000Z"),
})

const commonEntitlement = (overrides = {}) => ({
  _id: ids.entitlement,
  courseId: ids.course,
  createdAt: moments.created,
  isCurrent: true,
  purchaseId: ids.purchase,
  reconciliationAttempts: 0,
  revision: 0,
  schemaVersion: 1,
  source: "purchase",
  studentId: ids.student,
  updatedAt: moments.updated,
  ...overrides,
})

const provisioning = (overrides = {}) =>
  commonEntitlement({
    nextReconciliationAt: moments.scheduled,
    status: "provisioning",
    ...overrides,
  })

const active = (overrides = {}) =>
  commonEntitlement({
    grantedAt: moments.granted,
    status: "active",
    ...overrides,
  })

const revoked = (overrides = {}) =>
  commonEntitlement({
    grantedAt: moments.granted,
    isCurrent: false,
    revocationReason: "refund_completed",
    revokedAt: moments.revoked,
    status: "revoked",
    ...overrides,
  })

const cancelled = (overrides = {}) =>
  commonEntitlement({
    cancellationReason: "refund_completed_before_activation",
    cancelledAt: moments.cancelled,
    isCurrent: false,
    status: "cancelled",
    ...overrides,
  })

const requestedAudit = (overrides = {}) => ({
  _id: "64b000000000000000000008",
  action: "retry_activation",
  actorId: ids.actor,
  createdAt: moments.created,
  entitlementId: ids.entitlement,
  expectedRevision: 4,
  operationId: "operation-001",
  reason: "Retry verified captured-payment activation",
  requestedAt: moments.requested,
  schemaVersion: 1,
  status: "requested",
  updatedAt: moments.updated,
  ...overrides,
})

const terminalAudit = (status, outcomeCode, overrides = {}) =>
  requestedAudit({
    completedAt: moments.completed,
    outcomeCode,
    resultingRevision: 5,
    status,
    ...overrides,
  })

const expectPolicyError = (callback, code, messagePattern) => {
  assert.throws(callback, (error) => {
    assert.equal(error instanceof EntitlementPolicyError, true)
    assert.equal(error.code, code)
    if (messagePattern) assert.match(error.message, messagePattern)
    return true
  })
}

test("publishes frozen allowlists from the approved ADR contract", () => {
  assert.deepEqual(ENTITLEMENT_STATUSES, [
    "provisioning",
    "active",
    "revoked",
    "cancelled",
  ])
  assert.deepEqual(ENTITLEMENT_SOURCES, ["purchase", "verified_backfill"])
  assert.deepEqual(ENTITLEMENT_REVOCATION_REASONS, [
    "refund_completed",
    "account_deleted",
  ])
  assert.deepEqual(ENTITLEMENT_CANCELLATION_REASONS, [
    "refund_completed_before_activation",
    "account_deleted_before_activation",
  ])
  assert.deepEqual(ENTITLEMENT_REPLACEMENT_DECISIONS, ["none", "selected"])
  assert.deepEqual(ENTITLEMENT_REPLACEMENT_OUTCOMES, [
    "not_required",
    "pending",
    "activated",
    "abandoned",
    "superseded",
  ])
  assert.deepEqual(ENTITLEMENT_REPLACEMENT_ABANDON_REASONS, [
    "financial_state_changed",
    "user_ineligible",
    "course_unavailable",
  ])
  assert.deepEqual(ENTITLEMENT_RECONCILIATION_CODES, [
    "activation_retry",
    "compatibility_write_failed",
    "current_pair_conflict",
    "purchase_cas_uncertain",
    "replacement_transfer",
  ])
  assert.deepEqual(AUDIT_STATUSES, [
    "requested",
    "succeeded",
    "failed",
    "conflict",
  ])
  assert.deepEqual(AUDIT_ACTIONS, [
    "retry_activation",
    "select_replacement",
    "resume_replacement_transfer",
    "abandon_replacement",
    "resolve_replacement_superseded",
  ])
  assert.deepEqual(AUDIT_OUTCOME_CODES, [
    "completed",
    "retry_failed",
    "state_conflict",
    "evidence_invalid",
    "lease_expired",
  ])

  for (const allowlist of [
    ENTITLEMENT_STATUSES,
    ENTITLEMENT_SOURCES,
    ENTITLEMENT_REVOCATION_REASONS,
    ENTITLEMENT_CANCELLATION_REASONS,
    ENTITLEMENT_REPLACEMENT_DECISIONS,
    ENTITLEMENT_REPLACEMENT_OUTCOMES,
    ENTITLEMENT_REPLACEMENT_ABANDON_REASONS,
    ENTITLEMENT_RECONCILIATION_CODES,
    AUDIT_STATUSES,
    AUDIT_ACTIONS,
    AUDIT_OUTCOME_CODES,
  ]) {
    assert.equal(Object.isFrozen(allowlist), true)
  }
})

test("implements the exhaustive Entitlement lifecycle matrix", () => {
  const legal = new Set([
    "provisioning->active",
    "provisioning->cancelled",
    "active->revoked",
  ])

  for (const fromStatus of ENTITLEMENT_STATUSES) {
    for (const toStatus of ENTITLEMENT_STATUSES) {
      const transition = `${fromStatus}->${toStatus}`
      assert.equal(canTransition(fromStatus, toStatus), legal.has(transition))
      if (legal.has(transition)) {
        assert.equal(assertTransition(fromStatus, toStatus), true)
      } else {
        expectPolicyError(
          () => assertTransition(fromStatus, toStatus),
          ENTITLEMENT_POLICY_ERROR_CODES.INVALID_TRANSITION,
          /illegal Entitlement transition/
        )
      }
    }
  }

  assert.equal(canTransition("unknown", "active"), false)
  assert.equal(isTerminal("revoked"), true)
  assert.equal(isTerminal("cancelled"), true)
  assert.equal(isTerminal("active"), false)
  assert.equal(isTerminal("unknown"), false)
})

test("accepts all four valid lifecycle state shapes and grants access only to valid active state", () => {
  const states = [
    provisioning(),
    active(),
    revoked(),
    cancelled(),
    active({
      migrationRunId: "entitlement-backfill-2026-08-10",
      source: "verified_backfill",
    }),
  ]

  for (const state of states) {
    assert.equal(assertEntitlementState(state), state)
  }

  assert.equal(isAccessGranting(provisioning()), false)
  assert.equal(isAccessGranting(active()), true)
  assert.equal(isAccessGranting(revoked()), false)
  assert.equal(isAccessGranting(cancelled()), false)
  assert.equal(isAccessGranting({ status: "active", isCurrent: true }), false)
  assert.equal(
    isAccessGranting(active({ isCurrent: false })),
    false,
    "an internally inconsistent active shape must fail closed"
  )
})

test("rejects invalid core provenance, concurrency, and lifecycle shapes", async (t) => {
  const invalidStates = [
    ["missing Student", provisioning({ studentId: undefined }), /studentId/],
    ["missing Course", provisioning({ courseId: null }), /courseId/],
    ["missing Purchase", provisioning({ purchaseId: "" }), /purchaseId/],
    ["unknown schema", provisioning({ schemaVersion: 2 }), /schemaVersion/],
    ["unknown source", provisioning({ source: "admin" }), /source/],
    ["negative revision", provisioning({ revision: -1 }), /revision/],
    ["fractional revision", provisioning({ revision: 1.5 }), /revision/],
    [
      "purchase source with migration run",
      provisioning({ migrationRunId: "migration-1" }),
      /migrationRunId is forbidden/,
    ],
    [
      "backfill source without migration run",
      provisioning({ source: "verified_backfill" }),
      /migrationRunId/,
    ],
    [
      "untrimmed migration run",
      provisioning({
        migrationRunId: " migration-1",
        source: "verified_backfill",
      }),
      /migrationRunId/,
    ],
    [
      "provisioning non-current",
      provisioning({ isCurrent: false }),
      /provisioning Entitlements must be current/,
    ],
    [
      "provisioning grant timestamp",
      provisioning({ grantedAt: moments.granted }),
      /grantedAt must be absent/,
    ],
    [
      "active non-current",
      active({ isCurrent: false }),
      /active Entitlements must be current/,
    ],
    ["active missing grant", active({ grantedAt: undefined }), /grantedAt/],
    [
      "active terminal field",
      active({ revokedAt: moments.revoked }),
      /revokedAt must be absent/,
    ],
    [
      "revoked current",
      revoked({ isCurrent: true }),
      /revoked Entitlements must not be current/,
    ],
    [
      "revoked missing reason",
      revoked({ revocationReason: undefined }),
      /revocationReason/,
    ],
    [
      "revoked bad reason",
      revoked({ revocationReason: "admin_action" }),
      /revocationReason/,
    ],
    [
      "revocation predates grant",
      revoked({ revokedAt: new Date("2026-08-10T11:59:00.000Z") }),
      /revokedAt must not be earlier/,
    ],
    [
      "cancelled current",
      cancelled({ isCurrent: true }),
      /cancelled Entitlements must not be current/,
    ],
    [
      "cancelled with grant",
      cancelled({ grantedAt: moments.granted }),
      /grantedAt must be absent/,
    ],
    [
      "cancelled bad reason",
      cancelled({ cancellationReason: "payment_failed" }),
      /cancellationReason/,
    ],
    [
      "invalid date",
      active({ grantedAt: new Date("invalid") }),
      /grantedAt must be a valid Date/,
    ],
  ]

  for (const [name, state, message] of invalidStates) {
    await t.test(name, () => {
      expectPolicyError(
        () => assertEntitlementState(state),
        ENTITLEMENT_POLICY_ERROR_CODES.INVALID_STATE,
        message
      )
    })
  }
})

test("enforces provisioning schedule, manual-review, lease, and attempt invariants", async (t) => {
  const validStates = [
    provisioning(),
    provisioning({
      nextReconciliationAt: undefined,
      reconciliationAttempts: 1,
      reconciliationLeaseId: "lease-1",
      reconciliationLeaseUntil: moments.lease,
    }),
    provisioning({
      manualReviewRequiredAt: moments.manual,
      nextReconciliationAt: undefined,
      reconciliationAttempts: 5,
    }),
    provisioning({
      lastManualOperationId: "operation-001",
      manualReviewRequiredAt: moments.manual,
      nextReconciliationAt: undefined,
      reconciliationAttempts: 5,
      reconciliationLeaseId: "operation-001",
      reconciliationLeaseUntil: moments.lease,
    }),
    active({
      lastReconciliationCode: "activation_retry",
      manualReviewRequiredAt: moments.manual,
      reconciliationAttempts: 5,
    }),
    revoked({
      lastReconciliationCode: "replacement_transfer",
      manualReviewRequiredAt: moments.manual,
      reconciliationAttempts: 5,
    }),
  ]

  for (const state of validStates)
    assert.doesNotThrow(() => assertEntitlementState(state))

  const invalidStates = [
    [
      "missing schedule and manual review",
      provisioning({ nextReconciliationAt: undefined }),
      /must be scheduled or in manual review/,
    ],
    [
      "schedule and manual review together",
      provisioning({ manualReviewRequiredAt: moments.manual }),
      /mutually exclusive/,
    ],
    [
      "lease ID without expiry",
      provisioning({
        nextReconciliationAt: undefined,
        reconciliationLeaseId: "lease-1",
      }),
      /present together/,
    ],
    [
      "lease expiry without ID",
      provisioning({
        nextReconciliationAt: undefined,
        reconciliationLeaseUntil: moments.lease,
      }),
      /present together/,
    ],
    [
      "schedule retained during claim",
      provisioning({
        reconciliationLeaseId: "lease-1",
        reconciliationLeaseUntil: moments.lease,
      }),
      /cannot remain scheduled/,
    ],
    [
      "manual review with an uncorrelated lease",
      provisioning({
        manualReviewRequiredAt: moments.manual,
        nextReconciliationAt: undefined,
        reconciliationAttempts: 5,
        reconciliationLeaseId: "lease-1",
        reconciliationLeaseUntil: moments.lease,
      }),
      /manual-review lease must match lastManualOperationId/,
    ],
    [
      "lease on active",
      active({
        reconciliationLeaseId: "lease-1",
        reconciliationLeaseUntil: moments.lease,
      }),
      /only provisioning/,
    ],
    [
      "schedule on terminal",
      cancelled({ nextReconciliationAt: moments.scheduled }),
      /only provisioning/,
    ],
    [
      "too many attempts",
      provisioning({ reconciliationAttempts: 6 }),
      /reconciliationAttempts/,
    ],
    [
      "unsafe attempt number",
      provisioning({ reconciliationAttempts: Number.MAX_SAFE_INTEGER + 1 }),
      /reconciliationAttempts/,
    ],
    [
      "unknown reconciliation code",
      provisioning({ lastReconciliationCode: "try_again" }),
      /lastReconciliationCode/,
    ],
    [
      "unbounded lease ID",
      provisioning({
        nextReconciliationAt: undefined,
        reconciliationLeaseId: "x".repeat(101),
        reconciliationLeaseUntil: moments.lease,
      }),
      /reconciliationLeaseId/,
    ],
  ]

  for (const [name, state, message] of invalidStates) {
    await t.test(name, () => {
      expectPolicyError(
        () => assertEntitlementState(state),
        ENTITLEMENT_POLICY_ERROR_CODES.INVALID_STATE,
        message
      )
    })
  }
})

test("accepts the approved refund-terminal replacement shapes", () => {
  const shapes = [
    revoked(),
    revoked({
      replacementDecision: "none",
      replacementOutcome: "not_required",
    }),
    cancelled({
      replacementDecision: "selected",
      replacementOutcome: "pending",
      replacementPurchaseId: ids.replacementPurchase,
    }),
    revoked({
      replacementDecision: "selected",
      replacementOutcome: "activated",
      replacementPurchaseId: ids.replacementPurchase,
    }),
    revoked({
      lastManualOperationId: "operation-abandon-1",
      replacementAbandonReason: "user_ineligible",
      replacementDecision: "selected",
      replacementOutcome: "abandoned",
      replacementPurchaseId: ids.replacementPurchase,
    }),
    revoked({
      lastManualOperationId: "operation-supersede-1",
      replacementDecision: "selected",
      replacementOutcome: "superseded",
      replacementPurchaseId: ids.replacementPurchase,
      supersededByEntitlementId: ids.otherEntitlement,
    }),
  ]

  for (const state of shapes) {
    assert.equal(assertEntitlementState(state), state)
  }
})

test("rejects incomplete, ineligible, or contradictory replacement state", async (t) => {
  const invalidStates = [
    [
      "active replacement",
      active({
        replacementDecision: "none",
        replacementOutcome: "not_required",
      }),
      /refund-terminal/,
    ],
    [
      "account deletion terminal replacement",
      revoked({
        replacementDecision: "none",
        replacementOutcome: "not_required",
        revocationReason: "account_deleted",
      }),
      /refund-terminal/,
    ],
    [
      "outcome without decision",
      revoked({ replacementOutcome: "pending" }),
      /replacementDecision/,
    ],
    [
      "none with Purchase",
      revoked({
        replacementDecision: "none",
        replacementOutcome: "not_required",
        replacementPurchaseId: ids.replacementPurchase,
      }),
      /replacementPurchaseId must be absent/,
    ],
    [
      "none with wrong outcome",
      revoked({
        replacementDecision: "none",
        replacementOutcome: "pending",
      }),
      /must be not_required/,
    ],
    [
      "selected missing Purchase",
      revoked({
        replacementDecision: "selected",
        replacementOutcome: "pending",
      }),
      /replacementPurchaseId/,
    ],
    [
      "selected same Purchase",
      revoked({
        replacementDecision: "selected",
        replacementOutcome: "pending",
        replacementPurchaseId: ids.purchase,
      }),
      /must differ/,
    ],
    [
      "selected not-required",
      revoked({
        replacementDecision: "selected",
        replacementOutcome: "not_required",
        replacementPurchaseId: ids.replacementPurchase,
      }),
      /replacementOutcome/,
    ],
    [
      "abandoned missing reason",
      revoked({
        lastManualOperationId: "operation-abandon-1",
        replacementDecision: "selected",
        replacementOutcome: "abandoned",
        replacementPurchaseId: ids.replacementPurchase,
      }),
      /replacementAbandonReason/,
    ],
    [
      "abandoned missing audit correlation",
      revoked({
        replacementAbandonReason: "course_unavailable",
        replacementDecision: "selected",
        replacementOutcome: "abandoned",
        replacementPurchaseId: ids.replacementPurchase,
      }),
      /lastManualOperationId/,
    ],
    [
      "activated with abandon reason",
      revoked({
        replacementAbandonReason: "course_unavailable",
        replacementDecision: "selected",
        replacementOutcome: "activated",
        replacementPurchaseId: ids.replacementPurchase,
      }),
      /replacementAbandonReason must be absent/,
    ],
    [
      "superseded missing pointer",
      revoked({
        lastManualOperationId: "operation-supersede-1",
        replacementDecision: "selected",
        replacementOutcome: "superseded",
        replacementPurchaseId: ids.replacementPurchase,
      }),
      /supersededByEntitlementId/,
    ],
    [
      "superseded self pointer",
      revoked({
        lastManualOperationId: "operation-supersede-1",
        replacementDecision: "selected",
        replacementOutcome: "superseded",
        replacementPurchaseId: ids.replacementPurchase,
        supersededByEntitlementId: ids.entitlement,
      }),
      /different episode/,
    ],
    [
      "pending with superseding pointer",
      revoked({
        replacementDecision: "selected",
        replacementOutcome: "pending",
        replacementPurchaseId: ids.replacementPurchase,
        supersededByEntitlementId: ids.otherEntitlement,
      }),
      /supersededByEntitlementId must be absent/,
    ],
  ]

  for (const [name, state, message] of invalidStates) {
    await t.test(name, () => {
      expectPolicyError(
        () => assertEntitlementState(state),
        ENTITLEMENT_POLICY_ERROR_CODES.INVALID_STATE,
        message
      )
    })
  }
})

test("accepts exact-CAS lifecycle mutations and their required post-images", () => {
  const scheduledProvisioning = provisioning()
  const activated = {
    ...scheduledProvisioning,
    grantedAt: moments.granted,
    nextReconciliationAt: undefined,
    revision: 1,
    status: "active",
  }
  assert.equal(
    assertEntitlementMutation(scheduledProvisioning, activated),
    activated
  )

  const claimedProvisioning = provisioning({
    nextReconciliationAt: undefined,
    reconciliationAttempts: 1,
    reconciliationLeaseId: "lease-1",
    reconciliationLeaseUntil: moments.lease,
    revision: 7,
  })
  const cancelledAfterClaim = {
    ...claimedProvisioning,
    cancellationReason: "refund_completed_before_activation",
    cancelledAt: moments.cancelled,
    isCurrent: false,
    reconciliationLeaseId: undefined,
    reconciliationLeaseUntil: undefined,
    replacementDecision: "none",
    replacementOutcome: "not_required",
    revision: 8,
    status: "cancelled",
  }
  assert.equal(
    assertEntitlementMutation(claimedProvisioning, cancelledAfterClaim),
    cancelledAfterClaim
  )

  const activeEpisode = active({ revision: 2 })
  const revokedEpisode = {
    ...activeEpisode,
    isCurrent: false,
    replacementDecision: "selected",
    replacementOutcome: "pending",
    replacementPurchaseId: ids.replacementPurchase,
    revocationReason: "refund_completed",
    revokedAt: moments.revoked,
    revision: 3,
    status: "revoked",
  }
  assert.equal(
    assertEntitlementMutation(activeEpisode, revokedEpisode),
    revokedEpisode
  )
})

test("lifecycle exits retain reconciliation evidence", () => {
  const reviewedProvisioning = provisioning({
    lastReconciliationCode: "activation_retry",
    manualReviewRequiredAt: moments.manual,
    nextReconciliationAt: undefined,
    reconciliationAttempts: 5,
    revision: 12,
  })

  const activated = {
    ...reviewedProvisioning,
    grantedAt: moments.granted,
    revision: 13,
    status: "active",
  }
  assert.equal(
    assertEntitlementMutation(reviewedProvisioning, activated),
    activated
  )
  expectPolicyError(
    () =>
      assertEntitlementMutation(reviewedProvisioning, {
        ...activated,
        lastReconciliationCode: "replacement_transfer",
      }),
    ENTITLEMENT_POLICY_ERROR_CODES.INVALID_MUTATION,
    /lastReconciliationCode/
  )

  const cancelled = {
    ...reviewedProvisioning,
    cancellationReason: "account_deleted_before_activation",
    cancelledAt: moments.cancelled,
    isCurrent: false,
    revision: 13,
    status: "cancelled",
  }
  assert.equal(
    assertEntitlementMutation(reviewedProvisioning, cancelled),
    cancelled
  )
  expectPolicyError(
    () =>
      assertEntitlementMutation(reviewedProvisioning, {
        ...cancelled,
        manualReviewRequiredAt: undefined,
      }),
    ENTITLEMENT_POLICY_ERROR_CODES.INVALID_MUTATION,
    /manualReviewRequiredAt/
  )
  expectPolicyError(
    () =>
      assertEntitlementMutation(reviewedProvisioning, {
        ...cancelled,
        reconciliationAttempts: 4,
      }),
    ENTITLEMENT_POLICY_ERROR_CODES.INVALID_MUTATION,
    /reconciliationAttempts/
  )
})

test("rejects mutation without exact revision, immutable provenance, or a legal predecessor", () => {
  const previous = provisioning()
  const activation = {
    ...previous,
    grantedAt: moments.granted,
    nextReconciliationAt: undefined,
    revision: 1,
    status: "active",
  }

  expectPolicyError(
    () => assertEntitlementMutation(previous, { ...activation, revision: 0 }),
    ENTITLEMENT_POLICY_ERROR_CODES.INVALID_MUTATION,
    /revision must increment/
  )
  expectPolicyError(
    () => assertEntitlementMutation(previous, { ...activation, revision: 2 }),
    ENTITLEMENT_POLICY_ERROR_CODES.INVALID_MUTATION,
    /revision must increment/
  )
  expectPolicyError(
    () =>
      assertEntitlementMutation(previous, {
        ...activation,
        purchaseId: ids.replacementPurchase,
      }),
    ENTITLEMENT_POLICY_ERROR_CODES.INVALID_MUTATION,
    /purchaseId is immutable/
  )
  expectPolicyError(
    () =>
      assertEntitlementMutation(previous, {
        ...previous,
        revision: 1,
      }),
    ENTITLEMENT_POLICY_ERROR_CODES.INVALID_MUTATION,
    /without a state mutation/
  )

  const terminalTarget = cancelled({
    cancellationReason: "account_deleted_before_activation",
    purchaseId: previous.purchaseId,
    revision: 1,
  })
  expectPolicyError(
    () => assertEntitlementMutation(active(), terminalTarget),
    ENTITLEMENT_POLICY_ERROR_CODES.INVALID_TRANSITION,
    /active -> cancelled/
  )

  const terminal = revoked({ revision: 4 })
  const withDecisionAndChangedGrant = {
    ...terminal,
    grantedAt: new Date("2026-08-10T12:02:00.000Z"),
    lastManualOperationId: "operation-select-1",
    replacementDecision: "selected",
    replacementOutcome: "pending",
    replacementPurchaseId: ids.replacementPurchase,
    revision: 5,
  }
  expectPolicyError(
    () => assertEntitlementMutation(terminal, withDecisionAndChangedGrant),
    ENTITLEMENT_POLICY_ERROR_CODES.INVALID_MUTATION,
    /grantedAt is write-once/
  )
})

test("validates every supported provisioning lease and schedule mutation", () => {
  const due = provisioning({ reconciliationAttempts: 0, revision: 2 })
  const claimed = {
    ...due,
    nextReconciliationAt: undefined,
    reconciliationAttempts: 1,
    reconciliationLeaseId: "lease-auto-1",
    reconciliationLeaseUntil: moments.lease,
    revision: 3,
  }
  assert.equal(assertEntitlementMutation(due, claimed), claimed)

  const released = {
    ...claimed,
    lastReconciliationCode: "compatibility_write_failed",
    nextReconciliationAt: moments.completed,
    reconciliationLeaseId: undefined,
    reconciliationLeaseUntil: undefined,
    revision: 4,
  }
  assert.equal(assertEntitlementMutation(claimed, released), released)

  const exhaustedClaim = provisioning({
    nextReconciliationAt: undefined,
    reconciliationAttempts: 5,
    reconciliationLeaseId: "lease-auto-5",
    reconciliationLeaseUntil: moments.lease,
    revision: 10,
  })
  const handedToManual = {
    ...exhaustedClaim,
    lastReconciliationCode: "purchase_cas_uncertain",
    manualReviewRequiredAt: moments.manual,
    reconciliationLeaseId: undefined,
    reconciliationLeaseUntil: undefined,
    revision: 11,
  }
  assert.equal(
    assertEntitlementMutation(exhaustedClaim, handedToManual),
    handedToManual
  )

  const aged = {
    ...provisioning({ reconciliationAttempts: 3, revision: 20 }),
    manualReviewRequiredAt: moments.manual,
    nextReconciliationAt: undefined,
    revision: 21,
  }
  assert.equal(
    assertEntitlementMutation(
      provisioning({ reconciliationAttempts: 3, revision: 20 }),
      aged
    ),
    aged
  )

  const manualClaim = {
    ...handedToManual,
    lastManualOperationId: "manual-operation-1",
    reconciliationLeaseId: "manual-operation-1",
    reconciliationLeaseUntil: moments.lease,
    revision: 12,
  }
  assert.equal(
    assertEntitlementMutation(handedToManual, manualClaim),
    manualClaim
  )

  const manualFailure = {
    ...manualClaim,
    lastReconciliationCode: "activation_retry",
    reconciliationLeaseId: undefined,
    reconciliationLeaseUntil: undefined,
    revision: 13,
  }
  assert.equal(
    assertEntitlementMutation(manualClaim, manualFailure),
    manualFailure
  )
})

test("rejects unsafe provisioning operational mutations", async (t) => {
  const due = provisioning({ revision: 2 })
  const claimed = {
    ...due,
    nextReconciliationAt: undefined,
    reconciliationAttempts: 1,
    reconciliationLeaseId: "lease-auto-1",
    reconciliationLeaseUntil: moments.lease,
    revision: 3,
  }
  const manual = provisioning({
    manualReviewRequiredAt: moments.manual,
    nextReconciliationAt: undefined,
    reconciliationAttempts: 5,
    revision: 10,
  })

  const invalidMutations = [
    [
      "automatic claim without consuming attempt",
      due,
      { ...claimed, reconciliationAttempts: 0 },
      /must consume one attempt/,
    ],
    [
      "attempt jumps by two",
      due,
      { ...claimed, reconciliationAttempts: 2 },
      /at most one/,
    ],
    [
      "automatic claim cannot introduce manual correlation",
      due,
      {
        ...claimed,
        lastManualOperationId: "lease-auto-1",
        manualReviewRequiredAt: moments.manual,
      },
      /automatic claim cannot change/,
    ],
    [
      "lease renewal",
      claimed,
      {
        ...claimed,
        reconciliationLeaseUntil: moments.completed,
        revision: 4,
      },
      /cannot be renewed/,
    ],
    [
      "manual claim consumes automatic attempt",
      manual,
      {
        ...manual,
        lastManualOperationId: "manual-operation-1",
        reconciliationAttempts: 6,
        reconciliationLeaseId: "manual-operation-1",
        reconciliationLeaseUntil: moments.lease,
        revision: 11,
      },
      /reconciliationAttempts/,
    ],
    [
      "manual claim lacks matching correlation",
      manual,
      {
        ...manual,
        lastManualOperationId: "manual-operation-other",
        reconciliationLeaseId: "manual-operation-1",
        reconciliationLeaseUntil: moments.lease,
        revision: 11,
      },
      /manual-review lease must match lastManualOperationId/,
    ],
    [
      "reschedule without a claim",
      due,
      { ...due, nextReconciliationAt: moments.completed, revision: 3 },
      /unsupported provisioning/,
    ],
    [
      "automatic release cannot introduce manual correlation",
      claimed,
      {
        ...claimed,
        lastManualOperationId: "operation-unrelated",
        lastReconciliationCode: "activation_retry",
        nextReconciliationAt: moments.completed,
        reconciliationLeaseId: undefined,
        reconciliationLeaseUntil: undefined,
        revision: 4,
      },
      /retain lastManualOperationId/,
    ],
    [
      "manual release cannot clear its correlation",
      {
        ...manual,
        lastManualOperationId: "manual-operation-1",
        reconciliationLeaseId: "manual-operation-1",
        reconciliationLeaseUntil: moments.lease,
        revision: 11,
      },
      {
        ...manual,
        lastReconciliationCode: "activation_retry",
        revision: 12,
      },
      /retain lastManualOperationId/,
    ],
  ]

  for (const [name, previous, next, message] of invalidMutations) {
    await t.test(name, () => {
      expectPolicyError(
        () => assertEntitlementMutation(previous, next),
        [
          "manual claim consumes automatic attempt",
          "manual claim lacks matching correlation",
        ].includes(name)
          ? ENTITLEMENT_POLICY_ERROR_CODES.INVALID_STATE
          : ENTITLEMENT_POLICY_ERROR_CODES.INVALID_MUTATION,
        message
      )
    })
  }
})

test("allows only write-once one-way replacement mutations on terminal episodes", () => {
  const undecided = revoked({ revision: 4 })
  const selected = {
    ...undecided,
    lastManualOperationId: "operation-select-1",
    replacementDecision: "selected",
    replacementOutcome: "pending",
    replacementPurchaseId: ids.replacementPurchase,
    revision: 5,
  }
  assert.equal(assertEntitlementMutation(undecided, selected), selected)

  const resumed = {
    ...selected,
    lastManualOperationId: "operation-resume-1",
    revision: 6,
  }
  assert.equal(assertEntitlementMutation(selected, resumed), resumed)

  const activatedReplacement = {
    ...resumed,
    replacementOutcome: "activated",
    revision: 7,
  }
  assert.equal(
    assertEntitlementMutation(resumed, activatedReplacement),
    activatedReplacement
  )

  const abandoned = {
    ...selected,
    lastManualOperationId: "operation-abandon-1",
    replacementAbandonReason: "financial_state_changed",
    replacementOutcome: "abandoned",
    revision: 6,
  }
  assert.equal(assertEntitlementMutation(selected, abandoned), abandoned)

  const superseded = {
    ...selected,
    lastManualOperationId: "operation-supersede-1",
    replacementOutcome: "superseded",
    revision: 6,
    supersededByEntitlementId: ids.otherEntitlement,
  }
  assert.equal(assertEntitlementMutation(selected, superseded), superseded)
})

test("rejects replacement reselection, terminal outcome rewrites, and unaudited late decisions", () => {
  const none = revoked({
    replacementDecision: "none",
    replacementOutcome: "not_required",
    revision: 3,
  })
  const selected = revoked({
    lastManualOperationId: "operation-select-1",
    replacementDecision: "selected",
    replacementOutcome: "pending",
    replacementPurchaseId: ids.replacementPurchase,
    revision: 3,
  })
  const activatedReplacement = {
    ...selected,
    replacementOutcome: "activated",
    revision: 4,
  }

  expectPolicyError(
    () =>
      assertEntitlementMutation(none, {
        ...none,
        lastManualOperationId: "operation-select-2",
        replacementDecision: "selected",
        replacementOutcome: "pending",
        replacementPurchaseId: ids.replacementPurchase,
        revision: 4,
      }),
    ENTITLEMENT_POLICY_ERROR_CODES.INVALID_MUTATION,
    /replacementDecision is write-once/
  )
  expectPolicyError(
    () =>
      assertEntitlementMutation(selected, {
        ...selected,
        replacementPurchaseId: "64b000000000000000000009",
        revision: 4,
      }),
    ENTITLEMENT_POLICY_ERROR_CODES.INVALID_MUTATION,
    /replacementPurchaseId is write-once/
  )
  expectPolicyError(
    () =>
      assertEntitlementMutation(activatedReplacement, {
        ...activatedReplacement,
        lastManualOperationId: "operation-after-completion",
        revision: 5,
      }),
    ENTITLEMENT_POLICY_ERROR_CODES.INVALID_MUTATION,
    /completed replacement outcome/
  )
  expectPolicyError(
    () =>
      assertEntitlementMutation(selected, {
        ...selected,
        replacementAbandonReason: "financial_state_changed",
        replacementOutcome: "abandoned",
        revision: 4,
      }),
    ENTITLEMENT_POLICY_ERROR_CODES.INVALID_MUTATION,
    /abandoned requires a new audited operation ID/
  )
  expectPolicyError(
    () =>
      assertEntitlementMutation(selected, {
        ...selected,
        replacementOutcome: "superseded",
        revision: 4,
        supersededByEntitlementId: ids.otherEntitlement,
      }),
    ENTITLEMENT_POLICY_ERROR_CODES.INVALID_MUTATION,
    /superseded requires a new audited operation ID/
  )
  expectPolicyError(
    () =>
      assertEntitlementMutation(selected, {
        ...selected,
        lastManualOperationId: undefined,
        replacementOutcome: "activated",
        revision: 4,
      }),
    ENTITLEMENT_POLICY_ERROR_CODES.INVALID_MUTATION,
    /retain its operation ID/
  )
  expectPolicyError(
    () =>
      assertEntitlementMutation(revoked({ revision: 3 }), {
        ...revoked({ revision: 3 }),
        replacementDecision: "selected",
        replacementOutcome: "pending",
        replacementPurchaseId: ids.replacementPurchase,
        revision: 4,
      }),
    ENTITLEMENT_POLICY_ERROR_CODES.INVALID_MUTATION,
    /audited selected\/pending decision/
  )
  expectPolicyError(
    () =>
      assertEntitlementMutation(revoked({ revision: 3 }), {
        ...revoked({ revision: 3 }),
        lastManualOperationId: "operation-none-1",
        replacementDecision: "none",
        replacementOutcome: "not_required",
        revision: 4,
      }),
    ENTITLEMENT_POLICY_ERROR_CODES.INVALID_MUTATION,
    /may only receive an audited selected\/pending decision/
  )
})

test("implements the exhaustive private operation-audit transition matrix", () => {
  const legal = new Set([
    "requested->succeeded",
    "requested->failed",
    "requested->conflict",
  ])

  for (const fromStatus of AUDIT_STATUSES) {
    for (const toStatus of AUDIT_STATUSES) {
      const transition = `${fromStatus}->${toStatus}`
      assert.equal(
        canTransitionAudit(fromStatus, toStatus),
        legal.has(transition)
      )
      if (legal.has(transition)) {
        assert.equal(assertAuditTransition(fromStatus, toStatus), true)
      } else {
        expectPolicyError(
          () => assertAuditTransition(fromStatus, toStatus),
          ENTITLEMENT_POLICY_ERROR_CODES.INVALID_AUDIT_TRANSITION,
          /illegal Entitlement operation audit transition/
        )
      }
    }
  }
})

test("accepts requested and correctly paired terminal audit states", () => {
  const states = [
    requestedAudit(),
    terminalAudit("succeeded", "completed"),
    terminalAudit("conflict", "state_conflict"),
    terminalAudit("failed", "retry_failed"),
    terminalAudit("failed", "evidence_invalid"),
    terminalAudit("failed", "lease_expired"),
  ]

  for (const state of states) {
    assert.equal(assertEntitlementOperationAuditState(state), state)
  }
})

test("rejects malformed audit request and terminal outcome shapes", async (t) => {
  const invalidStates = [
    ["unknown schema", requestedAudit({ schemaVersion: 2 }), /schemaVersion/],
    ["blank operation ID", requestedAudit({ operationId: "" }), /operationId/],
    [
      "untrimmed operation ID",
      requestedAudit({ operationId: " operation-1" }),
      /operationId/,
    ],
    [
      "missing Entitlement",
      requestedAudit({ entitlementId: null }),
      /entitlementId/,
    ],
    ["missing actor", requestedAudit({ actorId: undefined }), /actorId/],
    ["unknown action", requestedAudit({ action: "grant" }), /action/],
    [
      "invalid expected revision",
      requestedAudit({ expectedRevision: -1 }),
      /expectedRevision/,
    ],
    ["blank reason", requestedAudit({ reason: "" }), /reason/],
    ["oversized reason", requestedAudit({ reason: "x".repeat(501) }), /reason/],
    [
      "requested with outcome",
      requestedAudit({ outcomeCode: "completed" }),
      /outcomeCode must be absent/,
    ],
    [
      "terminal without resulting revision",
      terminalAudit("succeeded", "completed", { resultingRevision: undefined }),
      /resultingRevision/,
    ],
    [
      "completion before request",
      terminalAudit("succeeded", "completed", { completedAt: moments.created }),
      /completedAt must not be earlier/,
    ],
    [
      "success with failure code",
      terminalAudit("succeeded", "retry_failed"),
      /succeeded audits require/,
    ],
    [
      "conflict with completed code",
      terminalAudit("conflict", "completed"),
      /conflict audits require/,
    ],
    [
      "failure with conflict code",
      terminalAudit("failed", "state_conflict"),
      /failed audits require/,
    ],
    [
      "failure with completed code",
      terminalAudit("failed", "completed"),
      /failed audits require/,
    ],
  ]

  for (const [name, state, message] of invalidStates) {
    await t.test(name, () => {
      expectPolicyError(
        () => assertEntitlementOperationAuditState(state),
        ENTITLEMENT_POLICY_ERROR_CODES.INVALID_AUDIT_STATE,
        message
      )
    })
  }
})

test("allows one exact requested-to-terminal audit finalization", () => {
  const requested = requestedAudit()
  for (const [status, outcomeCode] of [
    ["succeeded", "completed"],
    ["failed", "retry_failed"],
    ["conflict", "state_conflict"],
  ]) {
    const terminal = terminalAudit(status, outcomeCode)
    assert.equal(
      assertEntitlementOperationAuditMutation(requested, terminal),
      terminal
    )
  }
})

test("audit request evidence is immutable and terminal rows cannot reopen or change", () => {
  const requested = requestedAudit()
  const succeeded = terminalAudit("succeeded", "completed")

  expectPolicyError(
    () =>
      assertEntitlementOperationAuditMutation(requested, {
        ...succeeded,
        actorId: "64b000000000000000000009",
      }),
    ENTITLEMENT_POLICY_ERROR_CODES.INVALID_AUDIT_MUTATION,
    /actorId is immutable/
  )
  expectPolicyError(
    () =>
      assertEntitlementOperationAuditMutation(requested, {
        ...succeeded,
        reason: "A rewritten operator reason",
      }),
    ENTITLEMENT_POLICY_ERROR_CODES.INVALID_AUDIT_MUTATION,
    /reason is immutable/
  )
  expectPolicyError(
    () => assertEntitlementOperationAuditMutation(succeeded, requested),
    ENTITLEMENT_POLICY_ERROR_CODES.INVALID_AUDIT_TRANSITION,
    /succeeded -> requested/
  )
  expectPolicyError(
    () =>
      assertEntitlementOperationAuditMutation(
        succeeded,
        terminalAudit("failed", "retry_failed")
      ),
    ENTITLEMENT_POLICY_ERROR_CODES.INVALID_AUDIT_TRANSITION,
    /succeeded -> failed/
  )
})
