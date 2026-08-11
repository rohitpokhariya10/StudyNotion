const mongoose = require("mongoose")

const {
  assertEntitlementState,
} = require("../domains/entitlement/entitlementPolicy")

const PRIVATE_FIELDS = Object.freeze([
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
])

const safeInteger = {
  message: "{PATH} must be a safe integer",
  validator: Number.isSafeInteger,
}

const entitlementSchema = new mongoose.Schema(
  {
    schemaVersion: {
      type: Number,
      enum: [1],
      default: 1,
      required: true,
      immutable: true,
    },
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
      immutable: true,
    },
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: true,
      immutable: true,
    },
    purchaseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Purchase",
      required: true,
      immutable: true,
    },
    isCurrent: {
      type: Boolean,
      required: true,
      default: true,
    },
    status: {
      type: String,
      enum: ["provisioning", "active", "revoked", "cancelled"],
      required: true,
      default: "provisioning",
    },
    source: {
      type: String,
      enum: ["purchase", "verified_backfill"],
      required: true,
      immutable: true,
    },
    grantedAt: Date,
    revokedAt: Date,
    revocationReason: {
      type: String,
      enum: ["refund_completed", "account_deleted"],
    },
    cancelledAt: Date,
    cancellationReason: {
      type: String,
      enum: [
        "refund_completed_before_activation",
        "account_deleted_before_activation",
      ],
    },
    replacementPurchaseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Purchase",
      select: false,
    },
    replacementDecision: {
      type: String,
      enum: ["none", "selected"],
      select: false,
    },
    replacementOutcome: {
      type: String,
      enum: ["not_required", "pending", "activated", "abandoned", "superseded"],
      select: false,
    },
    replacementAbandonReason: {
      type: String,
      enum: [
        "financial_state_changed",
        "user_ineligible",
        "course_unavailable",
      ],
      select: false,
    },
    reconciliationAttempts: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
      required: true,
      select: false,
      validate: safeInteger,
    },
    nextReconciliationAt: {
      type: Date,
      select: false,
    },
    reconciliationLeaseId: {
      type: String,
      maxlength: 100,
      select: false,
    },
    reconciliationLeaseUntil: {
      type: Date,
      select: false,
    },
    manualReviewRequiredAt: {
      type: Date,
      select: false,
    },
    lastReconciliationCode: {
      type: String,
      enum: [
        "activation_retry",
        "compatibility_write_failed",
        "current_pair_conflict",
        "purchase_cas_uncertain",
        "replacement_transfer",
      ],
      select: false,
    },
    supersededByEntitlementId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Entitlement",
      select: false,
    },
    lastManualOperationId: {
      type: String,
      maxlength: 100,
      select: false,
    },
    migrationRunId: {
      type: String,
      trim: true,
      maxlength: 100,
      immutable: true,
      select: false,
    },
    revision: {
      type: Number,
      default: 0,
      min: 0,
      required: true,
      validate: safeInteger,
    },
  },
  { timestamps: true, strict: "throw", versionKey: false }
)

entitlementSchema.pre("validate", function validateEntitlementState() {
  try {
    assertEntitlementState(this)
  } catch (error) {
    this.invalidate("status", error.message, this.status, error.code)
  }
})

const redactPrivateFields = (_document, returnedObject) => {
  for (const field of PRIVATE_FIELDS) delete returnedObject[field]
  return returnedObject
}

entitlementSchema.set("toJSON", { transform: redactPrivateFields })
entitlementSchema.set("toObject", { transform: redactPrivateFields })

entitlementSchema.index(
  { purchaseId: 1, courseId: 1 },
  { name: "unique_entitlement_purchase_course", unique: true }
)
entitlementSchema.index(
  { studentId: 1, courseId: 1 },
  {
    name: "unique_current_entitlement_student_course",
    unique: true,
    partialFilterExpression: { isCurrent: true },
  }
)
entitlementSchema.index(
  { studentId: 1, status: 1, courseId: 1 },
  { name: "entitlement_student_status_course" }
)
entitlementSchema.index(
  { courseId: 1, status: 1, studentId: 1 },
  { name: "entitlement_course_status_student" }
)
entitlementSchema.index(
  { status: 1, nextReconciliationAt: 1, _id: 1 },
  {
    name: "entitlement_stale_provisioning",
    partialFilterExpression: { status: "provisioning" },
  }
)
entitlementSchema.index(
  { status: 1, reconciliationLeaseUntil: 1, _id: 1 },
  {
    name: "entitlement_expired_reconciliation_lease",
    partialFilterExpression: { status: "provisioning" },
  }
)
entitlementSchema.index(
  { migrationRunId: 1, _id: 1 },
  {
    name: "entitlement_migration_run",
    partialFilterExpression: { migrationRunId: { $type: "string" } },
  }
)

module.exports = mongoose.model("Entitlement", entitlementSchema)
