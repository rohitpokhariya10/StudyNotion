const mongoose = require("mongoose")

const purchaseLineItemSchema = new mongoose.Schema(
  {
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: true,
      immutable: true,
    },
    courseName: {
      type: String,
      required: true,
      immutable: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
      immutable: true,
    },
  },
  { _id: false }
)

const purchaseSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
      immutable: true,
      index: true,
    },
    courses: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: "Course",
      required: true,
      immutable: true,
    },
    activeCourses: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: "Course",
      default: undefined,
    },
    checkoutKey: {
      type: String,
      maxlength: 700,
    },
    idempotencyKey: {
      type: String,
      maxlength: 100,
    },
    checkoutExpiresAt: {
      type: Date,
      index: true,
    },
    lineItems: {
      type: [purchaseLineItemSchema],
      required: true,
      immutable: true,
    },
    checkoutAcknowledgedAt: {
      type: Date,
      required: true,
      immutable: true,
    },
    checkoutPolicySource: {
      type: String,
      enum: ["web_checkout"],
      required: true,
      immutable: true,
    },
    checkoutTermsVersion: {
      type: String,
      required: true,
      immutable: true,
      maxlength: 40,
    },
    refundPolicyVersion: {
      type: String,
      required: true,
      immutable: true,
      maxlength: 40,
    },
    refundWindowDays: {
      type: Number,
      required: true,
      immutable: true,
      min: 0,
      max: 30,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
      immutable: true,
    },
    currency: {
      type: String,
      required: true,
      default: "INR",
      uppercase: true,
      immutable: true,
    },
    receipt: {
      type: String,
      required: true,
      unique: true,
      immutable: true,
    },
    razorpayOrderId: {
      type: String,
      unique: true,
      sparse: true,
    },
    razorpayPaymentId: {
      type: String,
      unique: true,
      sparse: true,
    },
    status: {
      type: String,
      enum: [
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
      ],
      default: "created",
      index: true,
    },
    failureReason: String,
    paidAt: Date,
    fulfilledAt: Date,
    expiredAt: Date,
    reconciliationRequiredAt: Date,
    reconciliationResolution: {
      type: String,
      enum: ["fulfilled", "refunded", "refund_rejected"],
    },
    reconciliationNote: { type: String, trim: true, maxlength: 1000 },
    reconciledAt: Date,
    reconciledBy: { type: mongoose.Schema.Types.ObjectId, ref: "user" },
    reconciliationLockId: { type: String, select: false },
    reconciliationLockUntil: { type: Date, select: false },
    refundId: { type: String, unique: true, sparse: true },
    refundOriginStatus: {
      type: String,
      enum: ["payment_review", "refund_requested"],
    },
    refundRequestNote: { type: String, trim: true, maxlength: 1000 },
    refundRequestedAt: Date,
    refundRejectedAt: Date,
    refundAttemptedAt: Date,
    refundEligibilityDeadline: Date,
    refundWindowOverride: { type: Boolean, default: false },
    refundWindowOverrideAt: Date,
    refundWindowOverrideBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
    },
    refundLastCheckedAt: Date,
    refundProcessedAt: Date,
    refundEntitlementsRevokedAt: Date,
    refundProviderStatus: {
      type: String,
      enum: ["pending", "processed", "failed"],
    },
    failedRefundIds: {
      type: [String],
      default: undefined,
    },
    refundedAt: Date,
  },
  { timestamps: true }
)

purchaseSchema.index({ user: 1, createdAt: -1 })
purchaseSchema.index({ status: 1, checkoutExpiresAt: 1 })
purchaseSchema.index(
  { user: 1, activeCourses: 1 },
  {
    name: "unique_active_purchase_per_user_course",
    partialFilterExpression: { "activeCourses.0": { $exists: true } },
    unique: true,
  }
)
purchaseSchema.index(
  { user: 1, checkoutKey: 1 },
  {
    name: "unique_active_checkout_set",
    partialFilterExpression: { checkoutKey: { $type: "string" } },
    unique: true,
  }
)
purchaseSchema.index(
  { user: 1, idempotencyKey: 1 },
  {
    name: "unique_checkout_idempotency_key",
    partialFilterExpression: { idempotencyKey: { $type: "string" } },
    unique: true,
  }
)

module.exports = mongoose.model("Purchase", purchaseSchema)
