const { z } = require("zod")

const {
  createSuccessResponseSchema,
  isoDateTimeSchema,
  nullableImageUrlSchema,
  objectIdSchema,
} = require("./common")
const { createOffsetPageSchema } = require("./pagination")
const {
  checkoutPolicySchema,
  purchaseFinancialsSchema,
  refundProviderStatusSchema,
} = require("./commerce")

const reconciliationQueueStatusSchema = z.enum([
  "payment_review",
  "refund_pending",
  "refund_requested",
])

const adminLearnerSummarySchema = z.strictObject({
  id: objectIdSchema,
  firstName: z.string().min(1).max(80),
  lastName: z.string().max(80),
  email: z.email().max(254),
  accountType: z.literal("Student"),
  active: z.boolean(),
  approved: z.boolean(),
})

const instructorApprovalQueueItemSchema = z.strictObject({
  id: objectIdSchema,
  firstName: z.string().min(1).max(80),
  lastName: z.string().max(80),
  email: z.email().max(254),
  imageUrl: nullableImageUrlSchema,
  about: z.string().max(1000).nullable(),
  contactNumber: z
    .string()
    .regex(/^\+?[1-9]\d{7,14}$/)
    .nullable(),
  status: z.literal("Pending"),
  active: z.literal(true),
  approved: z.literal(false),
  submittedAt: isoDateTimeSchema,
  reviewedAt: z.null(),
})

const reconciliationQueueItemSchema = purchaseFinancialsSchema.safeExtend({
  purchaseId: objectIdSchema,
  learner: adminLearnerSummarySchema,
  status: reconciliationQueueStatusSchema,
  policy: checkoutPolicySchema,
  queuedAt: isoDateTimeSchema,
  refundRequestedAt: isoDateTimeSchema.nullable(),
  refundProviderStatus: refundProviderStatusSchema.nullable(),
})

const instructorApprovalQueueResponseSchema = createSuccessResponseSchema(
  createOffsetPageSchema(instructorApprovalQueueItemSchema)
)
const reconciliationQueueResponseSchema = createSuccessResponseSchema(
  createOffsetPageSchema(reconciliationQueueItemSchema)
)

module.exports = {
  adminLearnerSummarySchema,
  instructorApprovalQueueItemSchema,
  instructorApprovalQueueResponseSchema,
  reconciliationQueueItemSchema,
  reconciliationQueueResponseSchema,
  reconciliationQueueStatusSchema,
}
