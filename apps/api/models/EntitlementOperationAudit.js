const mongoose = require("mongoose")

const {
  assertEntitlementOperationAuditState,
} = require("../domains/entitlement/entitlementPolicy")

const PRIVATE_FIELDS = Object.freeze(["actorId", "reason"])

const safeInteger = {
  message: "{PATH} must be a safe integer",
  validator: Number.isSafeInteger,
}

const entitlementOperationAuditSchema = new mongoose.Schema(
  {
    schemaVersion: {
      type: Number,
      enum: [1],
      default: 1,
      required: true,
      immutable: true,
    },
    operationId: {
      type: String,
      required: true,
      immutable: true,
      trim: true,
      maxlength: 100,
    },
    entitlementId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Entitlement",
      required: true,
      immutable: true,
    },
    actorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
      immutable: true,
      select: false,
    },
    action: {
      type: String,
      enum: [
        "retry_activation",
        "select_replacement",
        "resume_replacement_transfer",
        "abandon_replacement",
        "resolve_replacement_superseded",
      ],
      required: true,
      immutable: true,
    },
    expectedRevision: {
      type: Number,
      required: true,
      immutable: true,
      min: 0,
      validate: safeInteger,
    },
    reason: {
      type: String,
      required: true,
      immutable: true,
      trim: true,
      maxlength: 500,
      select: false,
    },
    status: {
      type: String,
      enum: ["requested", "succeeded", "failed", "conflict"],
      default: "requested",
      required: true,
    },
    outcomeCode: {
      type: String,
      enum: [
        "completed",
        "retry_failed",
        "state_conflict",
        "evidence_invalid",
        "lease_expired",
      ],
    },
    resultingRevision: {
      type: Number,
      min: 0,
      validate: safeInteger,
    },
    requestedAt: {
      type: Date,
      required: true,
      immutable: true,
    },
    completedAt: Date,
  },
  { strict: "throw", versionKey: false }
)

entitlementOperationAuditSchema.pre(
  "validate",
  function validateEntitlementOperationAuditState() {
    try {
      assertEntitlementOperationAuditState(this)
    } catch (error) {
      this.invalidate("status", error.message, this.status, error.code)
    }
  }
)

const redactPrivateFields = (_document, returnedObject) => {
  for (const field of PRIVATE_FIELDS) delete returnedObject[field]
  return returnedObject
}

entitlementOperationAuditSchema.set("toJSON", {
  transform: redactPrivateFields,
})
entitlementOperationAuditSchema.set("toObject", {
  transform: redactPrivateFields,
})

entitlementOperationAuditSchema.index(
  { operationId: 1 },
  { name: "unique_entitlement_operation_id", unique: true }
)
entitlementOperationAuditSchema.index(
  { entitlementId: 1, status: 1 },
  {
    name: "unique_open_entitlement_operation",
    unique: true,
    partialFilterExpression: { status: "requested" },
  }
)
entitlementOperationAuditSchema.index(
  { entitlementId: 1, requestedAt: -1 },
  { name: "entitlement_operation_history" }
)
entitlementOperationAuditSchema.index(
  { actorId: 1, requestedAt: -1 },
  { name: "entitlement_operator_history" }
)

module.exports = mongoose.model(
  "EntitlementOperationAudit",
  entitlementOperationAuditSchema
)
