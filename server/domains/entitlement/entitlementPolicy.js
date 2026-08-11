const ENTITLEMENT_STATUSES = Object.freeze([
  "provisioning",
  "active",
  "revoked",
  "cancelled",
])

const ENTITLEMENT_SOURCES = Object.freeze(["purchase", "verified_backfill"])
const ENTITLEMENT_REVOCATION_REASONS = Object.freeze([
  "refund_completed",
  "account_deleted",
])
const ENTITLEMENT_CANCELLATION_REASONS = Object.freeze([
  "refund_completed_before_activation",
  "account_deleted_before_activation",
])
const ENTITLEMENT_REPLACEMENT_DECISIONS = Object.freeze(["none", "selected"])
const ENTITLEMENT_REPLACEMENT_OUTCOMES = Object.freeze([
  "not_required",
  "pending",
  "activated",
  "abandoned",
  "superseded",
])
const ENTITLEMENT_REPLACEMENT_ABANDON_REASONS = Object.freeze([
  "financial_state_changed",
  "user_ineligible",
  "course_unavailable",
])
const ENTITLEMENT_RECONCILIATION_CODES = Object.freeze([
  "activation_retry",
  "compatibility_write_failed",
  "current_pair_conflict",
  "purchase_cas_uncertain",
  "replacement_transfer",
])

const AUDIT_STATUSES = Object.freeze([
  "requested",
  "succeeded",
  "failed",
  "conflict",
])
const AUDIT_ACTIONS = Object.freeze([
  "retry_activation",
  "select_replacement",
  "resume_replacement_transfer",
  "abandon_replacement",
  "resolve_replacement_superseded",
])
const AUDIT_OUTCOME_CODES = Object.freeze([
  "completed",
  "retry_failed",
  "state_conflict",
  "evidence_invalid",
  "lease_expired",
])

const ENTITLEMENT_POLICY_ERROR_CODES = Object.freeze({
  INVALID_AUDIT_MUTATION: "INVALID_ENTITLEMENT_OPERATION_AUDIT_MUTATION",
  INVALID_AUDIT_STATE: "INVALID_ENTITLEMENT_OPERATION_AUDIT_STATE",
  INVALID_AUDIT_TRANSITION: "INVALID_ENTITLEMENT_OPERATION_AUDIT_TRANSITION",
  INVALID_MUTATION: "INVALID_ENTITLEMENT_MUTATION",
  INVALID_STATE: "INVALID_ENTITLEMENT_STATE",
  INVALID_TRANSITION: "INVALID_ENTITLEMENT_TRANSITION",
})

const ENTITLEMENT_TRANSITIONS = Object.freeze({
  active: Object.freeze(["revoked"]),
  cancelled: Object.freeze([]),
  provisioning: Object.freeze(["active", "cancelled"]),
  revoked: Object.freeze([]),
})

const AUDIT_TRANSITIONS = Object.freeze({
  conflict: Object.freeze([]),
  failed: Object.freeze([]),
  requested: Object.freeze(["succeeded", "failed", "conflict"]),
  succeeded: Object.freeze([]),
})

const REPLACEMENT_FIELDS = Object.freeze([
  "replacementDecision",
  "replacementPurchaseId",
  "replacementOutcome",
  "replacementAbandonReason",
  "supersededByEntitlementId",
])

const OPERATIONAL_FIELDS = Object.freeze([
  "reconciliationAttempts",
  "nextReconciliationAt",
  "reconciliationLeaseId",
  "reconciliationLeaseUntil",
  "manualReviewRequiredAt",
  "lastReconciliationCode",
  "lastManualOperationId",
])

const ENTITLEMENT_MUTABLE_FIELDS = Object.freeze([
  "status",
  "isCurrent",
  "grantedAt",
  "revokedAt",
  "revocationReason",
  "cancelledAt",
  "cancellationReason",
  ...REPLACEMENT_FIELDS,
  ...OPERATIONAL_FIELDS,
])

const ENTITLEMENT_IMMUTABLE_FIELDS = Object.freeze([
  "_id",
  "schemaVersion",
  "studentId",
  "courseId",
  "purchaseId",
  "source",
  "migrationRunId",
  "createdAt",
])

const ENTITLEMENT_WRITE_ONCE_FIELDS = Object.freeze([
  "grantedAt",
  "revokedAt",
  "revocationReason",
  "cancelledAt",
  "cancellationReason",
  "manualReviewRequiredAt",
])

const AUDIT_IMMUTABLE_FIELDS = Object.freeze([
  "_id",
  "schemaVersion",
  "operationId",
  "entitlementId",
  "actorId",
  "action",
  "expectedRevision",
  "reason",
  "requestedAt",
  "createdAt",
])

class EntitlementPolicyError extends TypeError {
  constructor(message, code = ENTITLEMENT_POLICY_ERROR_CODES.INVALID_STATE) {
    super(message)
    this.name = "EntitlementPolicyError"
    this.code = code
  }
}

const fail = (message, code) => {
  throw new EntitlementPolicyError(message, code)
}

const isObject = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value)

const isPresent = (state, field) => state[field] !== undefined

const assertObject = (state, label, code) => {
  if (!isObject(state)) fail(`${label} must be an object`, code)
}

const assertEnum = (value, values, field, code) => {
  if (!values.includes(value)) {
    fail(`${field} must be one of: ${values.join(", ")}`, code)
  }
}

const assertAbsent = (state, fields, context, code) => {
  for (const field of fields) {
    if (isPresent(state, field)) {
      fail(`${field} must be absent ${context}`, code)
    }
  }
}

const assertPresent = (state, fields, context, code) => {
  for (const field of fields) {
    if (!isPresent(state, field)) {
      fail(`${field} is required ${context}`, code)
    }
  }
}

const assertDate = (value, field, code) => {
  if (!(value instanceof Date) || Number.isNaN(value.getTime())) {
    fail(`${field} must be a valid Date`, code)
  }
}

const assertDateWhenPresent = (state, field, code) => {
  if (isPresent(state, field)) assertDate(state[field], field, code)
}

const assertSafeInteger = (value, field, { max } = {}, code) => {
  if (
    !Number.isSafeInteger(value) ||
    value < 0 ||
    (max !== undefined && value > max)
  ) {
    const maximum = max === undefined ? "" : ` through ${max}`
    fail(`${field} must be a nonnegative safe integer${maximum}`, code)
  }
}

const assertTrimmedString = (value, field, maxLength, code) => {
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    value.length > maxLength ||
    value.trim() !== value
  ) {
    fail(`${field} must be a trimmed string of 1-${maxLength} characters`, code)
  }
}

const referenceKey = (value) => {
  if (value === undefined || value === null) return value
  if (typeof value === "object" && value._id !== undefined) {
    return String(value._id)
  }
  return String(value)
}

const comparableValue = (value) => {
  if (value instanceof Date) return `date:${value.getTime()}`
  if (value === undefined || value === null) return value
  if (typeof value === "object") return `reference:${referenceKey(value)}`
  return value
}

const valuesEqual = (left, right) =>
  comparableValue(left) === comparableValue(right)

const assertReference = (state, field, code) => {
  if (!isPresent(state, field) || state[field] === null) {
    fail(`${field} is required`, code)
  }
  if (typeof state[field] === "string" && state[field].length === 0) {
    fail(`${field} is required`, code)
  }
}

const assertTimestampsWhenPresent = (state, code) => {
  assertDateWhenPresent(state, "createdAt", code)
  assertDateWhenPresent(state, "updatedAt", code)
}

const assertLifecycleShape = (state, code) => {
  switch (state.status) {
    case "provisioning":
      if (state.isCurrent !== true) {
        fail("provisioning Entitlements must be current", code)
      }
      assertAbsent(
        state,
        [
          "grantedAt",
          "revokedAt",
          "revocationReason",
          "cancelledAt",
          "cancellationReason",
        ],
        "while status is provisioning",
        code
      )
      break
    case "active":
      if (state.isCurrent !== true) {
        fail("active Entitlements must be current", code)
      }
      assertPresent(state, ["grantedAt"], "while status is active", code)
      assertAbsent(
        state,
        ["revokedAt", "revocationReason", "cancelledAt", "cancellationReason"],
        "while status is active",
        code
      )
      break
    case "revoked":
      if (state.isCurrent !== false) {
        fail("revoked Entitlements must not be current", code)
      }
      assertPresent(
        state,
        ["grantedAt", "revokedAt", "revocationReason"],
        "while status is revoked",
        code
      )
      assertAbsent(
        state,
        ["cancelledAt", "cancellationReason"],
        "while status is revoked",
        code
      )
      assertEnum(
        state.revocationReason,
        ENTITLEMENT_REVOCATION_REASONS,
        "revocationReason",
        code
      )
      if (state.revokedAt.getTime() < state.grantedAt.getTime()) {
        fail("revokedAt must not be earlier than grantedAt", code)
      }
      break
    case "cancelled":
      if (state.isCurrent !== false) {
        fail("cancelled Entitlements must not be current", code)
      }
      assertPresent(
        state,
        ["cancelledAt", "cancellationReason"],
        "while status is cancelled",
        code
      )
      assertAbsent(
        state,
        ["grantedAt", "revokedAt", "revocationReason"],
        "while status is cancelled",
        code
      )
      assertEnum(
        state.cancellationReason,
        ENTITLEMENT_CANCELLATION_REASONS,
        "cancellationReason",
        code
      )
      break
  }
}

const isRefundTerminal = (state) =>
  (state.status === "revoked" &&
    state.revocationReason === "refund_completed") ||
  (state.status === "cancelled" &&
    state.cancellationReason === "refund_completed_before_activation")

const assertReplacementShape = (state, code) => {
  const hasReplacementField = REPLACEMENT_FIELDS.some((field) =>
    isPresent(state, field)
  )

  if (!hasReplacementField) return
  if (!isRefundTerminal(state)) {
    fail("replacement state is allowed only on a refund-terminal episode", code)
  }

  assertEnum(
    state.replacementDecision,
    ENTITLEMENT_REPLACEMENT_DECISIONS,
    "replacementDecision",
    code
  )

  if (state.replacementDecision === "none") {
    assertAbsent(
      state,
      [
        "replacementPurchaseId",
        "replacementAbandonReason",
        "supersededByEntitlementId",
      ],
      "when replacementDecision is none",
      code
    )
    if (state.replacementOutcome !== "not_required") {
      fail(
        "replacementOutcome must be not_required when replacementDecision is none",
        code
      )
    }
    return
  }

  assertReference(state, "replacementPurchaseId", code)
  if (valuesEqual(state.replacementPurchaseId, state.purchaseId)) {
    fail("replacementPurchaseId must differ from purchaseId", code)
  }
  assertEnum(
    state.replacementOutcome,
    ["pending", "activated", "abandoned", "superseded"],
    "replacementOutcome",
    code
  )

  if (state.replacementOutcome === "abandoned") {
    assertEnum(
      state.replacementAbandonReason,
      ENTITLEMENT_REPLACEMENT_ABANDON_REASONS,
      "replacementAbandonReason",
      code
    )
    assertAbsent(
      state,
      ["supersededByEntitlementId"],
      "when replacementOutcome is abandoned",
      code
    )
    assertPresent(
      state,
      ["lastManualOperationId"],
      "when replacementOutcome is abandoned",
      code
    )
    return
  }

  assertAbsent(
    state,
    ["replacementAbandonReason"],
    `when replacementOutcome is ${state.replacementOutcome}`,
    code
  )

  if (state.replacementOutcome === "superseded") {
    assertReference(state, "supersededByEntitlementId", code)
    if (
      isPresent(state, "_id") &&
      valuesEqual(state.supersededByEntitlementId, state._id)
    ) {
      fail("supersededByEntitlementId must identify a different episode", code)
    }
    assertPresent(
      state,
      ["lastManualOperationId"],
      "when replacementOutcome is superseded",
      code
    )
  } else {
    assertAbsent(
      state,
      ["supersededByEntitlementId"],
      `when replacementOutcome is ${state.replacementOutcome}`,
      code
    )
  }
}

const assertOperationalShape = (state, code) => {
  assertSafeInteger(
    state.reconciliationAttempts,
    "reconciliationAttempts",
    { max: 5 },
    code
  )
  assertDateWhenPresent(state, "nextReconciliationAt", code)
  assertDateWhenPresent(state, "reconciliationLeaseUntil", code)
  assertDateWhenPresent(state, "manualReviewRequiredAt", code)

  if (isPresent(state, "reconciliationLeaseId")) {
    assertTrimmedString(
      state.reconciliationLeaseId,
      "reconciliationLeaseId",
      100,
      code
    )
  }
  if (isPresent(state, "lastManualOperationId")) {
    assertTrimmedString(
      state.lastManualOperationId,
      "lastManualOperationId",
      100,
      code
    )
  }
  if (isPresent(state, "lastReconciliationCode")) {
    assertEnum(
      state.lastReconciliationCode,
      ENTITLEMENT_RECONCILIATION_CODES,
      "lastReconciliationCode",
      code
    )
  }

  const hasLeaseId = isPresent(state, "reconciliationLeaseId")
  const hasLeaseUntil = isPresent(state, "reconciliationLeaseUntil")
  if (hasLeaseId !== hasLeaseUntil) {
    fail("reconciliation lease ID and expiry must be present together", code)
  }

  const hasSchedule = isPresent(state, "nextReconciliationAt")
  const hasManualReview = isPresent(state, "manualReviewRequiredAt")
  if (hasSchedule && hasManualReview) {
    fail(
      "nextReconciliationAt and manualReviewRequiredAt are mutually exclusive",
      code
    )
  }

  if (state.status === "provisioning") {
    if (hasSchedule && hasLeaseId) {
      fail("a claimed provisioning Entitlement cannot remain scheduled", code)
    }
    if (
      hasLeaseId &&
      hasManualReview &&
      state.lastManualOperationId !== state.reconciliationLeaseId
    ) {
      fail("a manual-review lease must match lastManualOperationId", code)
    }
    if (!hasLeaseId && !hasSchedule && !hasManualReview) {
      fail(
        "an unclaimed provisioning Entitlement must be scheduled or in manual review",
        code
      )
    }
    return
  }

  if (hasSchedule || hasLeaseId) {
    fail(
      "only provisioning Entitlements may have a schedule or reconciliation lease",
      code
    )
  }
}

const assertEntitlementState = (state) => {
  const code = ENTITLEMENT_POLICY_ERROR_CODES.INVALID_STATE
  assertObject(state, "Entitlement state", code)

  if (state.schemaVersion !== 1) {
    fail("schemaVersion must be 1", code)
  }
  assertReference(state, "studentId", code)
  assertReference(state, "courseId", code)
  assertReference(state, "purchaseId", code)
  assertEnum(state.status, ENTITLEMENT_STATUSES, "status", code)
  assertEnum(state.source, ENTITLEMENT_SOURCES, "source", code)
  if (typeof state.isCurrent !== "boolean") {
    fail("isCurrent must be a boolean", code)
  }
  assertSafeInteger(state.revision, "revision", {}, code)

  if (state.source === "verified_backfill") {
    assertTrimmedString(state.migrationRunId, "migrationRunId", 100, code)
  } else if (isPresent(state, "migrationRunId")) {
    fail("migrationRunId is forbidden for purchase-sourced Entitlements", code)
  }

  for (const field of ["grantedAt", "revokedAt", "cancelledAt"]) {
    assertDateWhenPresent(state, field, code)
  }
  assertLifecycleShape(state, code)
  assertOperationalShape(state, code)
  assertReplacementShape(state, code)
  assertTimestampsWhenPresent(state, code)
  return state
}

const canTransition = (fromStatus, toStatus) =>
  ENTITLEMENT_TRANSITIONS[fromStatus]?.includes(toStatus) === true

const assertTransition = (fromStatus, toStatus) => {
  if (!canTransition(fromStatus, toStatus)) {
    fail(
      `illegal Entitlement transition: ${String(fromStatus)} -> ${String(toStatus)}`,
      ENTITLEMENT_POLICY_ERROR_CODES.INVALID_TRANSITION
    )
  }
  return true
}

const isTerminal = (status) => status === "revoked" || status === "cancelled"

const isAccessGranting = (state) => {
  try {
    assertEntitlementState(state)
  } catch {
    return false
  }
  return state.status === "active" && state.isCurrent === true
}

const changedFields = (previous, next, fields) =>
  fields.filter((field) => !valuesEqual(previous[field], next[field]))

const assertImmutableFields = (previous, next, fields, code) => {
  for (const field of fields) {
    if (!valuesEqual(previous[field], next[field])) {
      fail(`${field} is immutable`, code)
    }
  }
}

const assertWriteOnceFields = (previous, next, fields, code) => {
  for (const field of fields) {
    if (
      isPresent(previous, field) &&
      !valuesEqual(previous[field], next[field])
    ) {
      fail(`${field} is write-once`, code)
    }
  }
}

const assertReplacementMutation = (previous, next, code) => {
  const previousDecision = previous.replacementDecision
  const nextDecision = next.replacementDecision

  if (previousDecision !== undefined) {
    if (previousDecision !== nextDecision) {
      fail("replacementDecision is write-once", code)
    }
    if (
      !valuesEqual(previous.replacementPurchaseId, next.replacementPurchaseId)
    ) {
      fail("replacementPurchaseId is write-once", code)
    }
  }

  if (previousDecision === "none") {
    if (previous.replacementOutcome !== next.replacementOutcome) {
      fail("a no-replacement decision is terminal", code)
    }
    return
  }

  if (previousDecision === "selected") {
    const previousOutcome = previous.replacementOutcome
    const nextOutcome = next.replacementOutcome
    if (previousOutcome === "pending") {
      if (
        !["pending", "activated", "abandoned", "superseded"].includes(
          nextOutcome
        )
      ) {
        fail("a pending replacement has an illegal outcome transition", code)
      }
      return
    }
    if (previousOutcome !== nextOutcome) {
      fail("a completed replacement outcome is terminal", code)
    }
    return
  }

  if (nextDecision === "selected" && next.replacementOutcome !== "pending") {
    fail("a selected replacement must start pending", code)
  }
  if (nextDecision === "none" && next.replacementOutcome !== "not_required") {
    fail("a no-replacement decision must start not_required", code)
  }
}

const assertProvisioningOperationalMutation = (
  previous,
  next,
  changed,
  code
) => {
  const allowed = new Set(OPERATIONAL_FIELDS)
  const forbidden = changed.filter((field) => !allowed.has(field))
  if (forbidden.length > 0) {
    fail(
      `provisioning operational mutation cannot change: ${forbidden.join(", ")}`,
      code
    )
  }

  const previousAttempts = previous.reconciliationAttempts
  const nextAttempts = next.reconciliationAttempts
  if (nextAttempts < previousAttempts || nextAttempts > previousAttempts + 1) {
    fail("reconciliationAttempts may advance by at most one", code)
  }

  const previousHasLease = isPresent(previous, "reconciliationLeaseId")
  const nextHasLease = isPresent(next, "reconciliationLeaseId")
  if (previousHasLease && nextHasLease) {
    fail("a reconciliation lease cannot be renewed or replaced in place", code)
  }

  if (!previousHasLease && nextHasLease) {
    if (isPresent(previous, "nextReconciliationAt")) {
      const automaticClaimFields = new Set([
        "reconciliationAttempts",
        "nextReconciliationAt",
        "reconciliationLeaseId",
        "reconciliationLeaseUntil",
      ])
      const extraChanges = changed.filter(
        (field) => !automaticClaimFields.has(field)
      )
      if (extraChanges.length > 0) {
        fail(
          `an automatic claim cannot change: ${extraChanges.join(", ")}`,
          code
        )
      }
      if (nextAttempts !== previousAttempts + 1) {
        fail("an automatic reconciliation claim must consume one attempt", code)
      }
    } else {
      const manualClaimFields = new Set([
        "reconciliationLeaseId",
        "reconciliationLeaseUntil",
        "lastManualOperationId",
      ])
      const extraChanges = changed.filter(
        (field) => !manualClaimFields.has(field)
      )
      if (extraChanges.length > 0) {
        fail(`a manual claim cannot change: ${extraChanges.join(", ")}`, code)
      }
      if (!isPresent(previous, "manualReviewRequiredAt")) {
        fail("a manual claim requires existing manual-review state", code)
      }
      if (nextAttempts !== previousAttempts) {
        fail("a manual reconciliation claim must not consume an attempt", code)
      }
      if (
        next.lastManualOperationId !== next.reconciliationLeaseId ||
        valuesEqual(previous.lastManualOperationId, next.lastManualOperationId)
      ) {
        fail(
          "a manual claim must use a new operation ID as its lease and correlation pointer",
          code
        )
      }
    }
    return
  }

  if (previousHasLease && !nextHasLease) {
    if (
      !valuesEqual(previous.lastManualOperationId, next.lastManualOperationId)
    ) {
      fail("releasing a lease must retain lastManualOperationId", code)
    }
    if (nextAttempts !== previousAttempts) {
      fail("releasing a reconciliation lease must not consume an attempt", code)
    }
    if (!isPresent(next, "lastReconciliationCode")) {
      fail("releasing a reconciliation lease requires a result code", code)
    }
    if (isPresent(previous, "manualReviewRequiredAt")) {
      if (
        !valuesEqual(
          previous.manualReviewRequiredAt,
          next.manualReviewRequiredAt
        )
      ) {
        fail("a manual release must retain manualReviewRequiredAt", code)
      }
    } else if (nextAttempts === 5) {
      if (!isPresent(next, "manualReviewRequiredAt")) {
        fail("a fifth automatic failure must enter manual review", code)
      }
    } else if (!isPresent(next, "nextReconciliationAt")) {
      fail("an automatic failure before attempt five must be rescheduled", code)
    }
    return
  }

  if (
    isPresent(previous, "nextReconciliationAt") &&
    isPresent(next, "manualReviewRequiredAt") &&
    nextAttempts === previousAttempts
  ) {
    if (
      !valuesEqual(
        previous.lastManualOperationId,
        next.lastManualOperationId
      ) ||
      !valuesEqual(previous.lastReconciliationCode, next.lastReconciliationCode)
    ) {
      fail("an age handoff must retain reconciliation evidence", code)
    }
    return
  }

  fail("unsupported provisioning operational mutation", code)
}

const assertTerminalOperationalMutation = (previous, next, changed, code) => {
  const allowed = new Set([...REPLACEMENT_FIELDS, "lastManualOperationId"])
  const forbidden = changed.filter((field) => !allowed.has(field))
  if (forbidden.length > 0) {
    fail(
      `terminal operational mutation cannot change: ${forbidden.join(", ")}`,
      code
    )
  }

  assertReplacementMutation(previous, next, code)
  const previousDecision = previous.replacementDecision
  const nextDecision = next.replacementDecision
  const outcomeChanged = previous.replacementOutcome !== next.replacementOutcome
  const operationChanged =
    previous.lastManualOperationId !== next.lastManualOperationId

  if (operationChanged && !isPresent(next, "lastManualOperationId")) {
    fail("a terminal manual operation must retain its operation ID", code)
  }

  if (previousDecision === undefined) {
    if (nextDecision !== "selected" || !operationChanged) {
      fail(
        "a terminal episode without a decision may only receive an audited selected/pending decision",
        code
      )
    }
    return
  }

  if (previousDecision === "none") {
    fail("a no-replacement terminal episode cannot be mutated", code)
  }

  if (previous.replacementOutcome !== "pending") {
    fail("a completed replacement outcome cannot be mutated", code)
  }

  if (
    ["abandoned", "superseded"].includes(next.replacementOutcome) &&
    !operationChanged
  ) {
    fail(`${next.replacementOutcome} requires a new audited operation ID`, code)
  }

  if (!outcomeChanged && !operationChanged) {
    fail(
      "a replacement mutation must advance outcome or operation evidence",
      code
    )
  }
}

const TRANSITION_ALLOWED_FIELDS = Object.freeze({
  "active->revoked": Object.freeze([
    "status",
    "isCurrent",
    "revokedAt",
    "revocationReason",
    ...REPLACEMENT_FIELDS,
  ]),
  "provisioning->active": Object.freeze([
    "status",
    "grantedAt",
    "nextReconciliationAt",
    "reconciliationLeaseId",
    "reconciliationLeaseUntil",
  ]),
  "provisioning->cancelled": Object.freeze([
    "status",
    "isCurrent",
    "cancelledAt",
    "cancellationReason",
    "nextReconciliationAt",
    "reconciliationLeaseId",
    "reconciliationLeaseUntil",
    ...REPLACEMENT_FIELDS,
  ]),
})

const assertLifecycleMutation = (previous, next, changed, code) => {
  const transition = `${previous.status}->${next.status}`
  const allowed = new Set(TRANSITION_ALLOWED_FIELDS[transition])
  const forbidden = changed.filter((field) => !allowed.has(field))
  if (forbidden.length > 0) {
    fail(`${transition} cannot change: ${forbidden.join(", ")}`, code)
  }
  if (next.reconciliationAttempts !== previous.reconciliationAttempts) {
    fail("a lifecycle transition must retain reconciliationAttempts", code)
  }
  assertReplacementMutation(previous, next, code)
}

const assertEntitlementMutation = (previous, next) => {
  const code = ENTITLEMENT_POLICY_ERROR_CODES.INVALID_MUTATION
  assertEntitlementState(previous)
  assertEntitlementState(next)
  if (previous.status !== next.status) {
    assertTransition(previous.status, next.status)
  }
  assertImmutableFields(previous, next, ENTITLEMENT_IMMUTABLE_FIELDS, code)
  assertWriteOnceFields(previous, next, ENTITLEMENT_WRITE_ONCE_FIELDS, code)

  if (next.revision !== previous.revision + 1) {
    fail("revision must increment by exactly one", code)
  }

  const changed = changedFields(previous, next, ENTITLEMENT_MUTABLE_FIELDS)
  if (changed.length === 0) {
    fail("revision cannot advance without a state mutation", code)
  }

  if (previous.status !== next.status) {
    assertLifecycleMutation(previous, next, changed, code)
    return next
  }

  if (previous.status === "provisioning") {
    assertProvisioningOperationalMutation(previous, next, changed, code)
    return next
  }
  if (isTerminal(previous.status)) {
    assertTerminalOperationalMutation(previous, next, changed, code)
    return next
  }
  fail("active Entitlements have no same-status mutation", code)
}

const canTransitionAudit = (fromStatus, toStatus) =>
  AUDIT_TRANSITIONS[fromStatus]?.includes(toStatus) === true

const assertAuditTransition = (fromStatus, toStatus) => {
  if (!canTransitionAudit(fromStatus, toStatus)) {
    fail(
      `illegal Entitlement operation audit transition: ${String(fromStatus)} -> ${String(toStatus)}`,
      ENTITLEMENT_POLICY_ERROR_CODES.INVALID_AUDIT_TRANSITION
    )
  }
  return true
}

const assertEntitlementOperationAuditState = (state) => {
  const code = ENTITLEMENT_POLICY_ERROR_CODES.INVALID_AUDIT_STATE
  assertObject(state, "Entitlement operation audit state", code)
  if (state.schemaVersion !== 1) {
    fail("schemaVersion must be 1", code)
  }
  assertTrimmedString(state.operationId, "operationId", 100, code)
  assertReference(state, "entitlementId", code)
  assertReference(state, "actorId", code)
  assertEnum(state.action, AUDIT_ACTIONS, "action", code)
  assertSafeInteger(state.expectedRevision, "expectedRevision", {}, code)
  assertTrimmedString(state.reason, "reason", 500, code)
  assertEnum(state.status, AUDIT_STATUSES, "status", code)
  assertDate(state.requestedAt, "requestedAt", code)

  if (state.status === "requested") {
    assertAbsent(
      state,
      ["outcomeCode", "resultingRevision", "completedAt"],
      "while audit status is requested",
      code
    )
  } else {
    assertPresent(
      state,
      ["outcomeCode", "resultingRevision", "completedAt"],
      "for a terminal audit status",
      code
    )
    assertEnum(state.outcomeCode, AUDIT_OUTCOME_CODES, "outcomeCode", code)
    assertSafeInteger(state.resultingRevision, "resultingRevision", {}, code)
    assertDate(state.completedAt, "completedAt", code)
    if (state.completedAt.getTime() < state.requestedAt.getTime()) {
      fail("completedAt must not be earlier than requestedAt", code)
    }

    if (state.status === "succeeded" && state.outcomeCode !== "completed") {
      fail("succeeded audits require outcomeCode completed", code)
    }
    if (state.status === "conflict" && state.outcomeCode !== "state_conflict") {
      fail("conflict audits require outcomeCode state_conflict", code)
    }
    if (
      state.status === "failed" &&
      !["retry_failed", "evidence_invalid", "lease_expired"].includes(
        state.outcomeCode
      )
    ) {
      fail("failed audits require an allowlisted failure outcomeCode", code)
    }
  }

  assertTimestampsWhenPresent(state, code)
  return state
}

const assertEntitlementOperationAuditMutation = (previous, next) => {
  const code = ENTITLEMENT_POLICY_ERROR_CODES.INVALID_AUDIT_MUTATION
  assertEntitlementOperationAuditState(previous)
  assertEntitlementOperationAuditState(next)
  assertImmutableFields(previous, next, AUDIT_IMMUTABLE_FIELDS, code)
  assertAuditTransition(previous.status, next.status)
  return next
}

module.exports = {
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
}
