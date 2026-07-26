const { z } = require("zod")

const {
  createSuccessResponseSchema,
  idempotencyKeySchema,
  isoDateTimeSchema,
  objectIdSchema,
  policyVersionSchema,
  positiveMinorMoneySchema,
} = require("./common")

const purchaseStatusSchema = z.enum([
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
const refundProviderStatusSchema = z.enum(["pending", "processed", "failed"])
const reconciliationResolutionSchema = z.enum([
  "fulfilled",
  "refunded",
  "refund_rejected",
])

const checkoutPolicySchema = z.strictObject({
  termsVersion: policyVersionSchema,
  refundPolicyVersion: policyVersionSchema,
  refundWindowDays: z.number().int().min(0).max(30),
})

const checkoutRequestSchema = z
  .strictObject({
    courses: z
      .array(objectIdSchema)
      .min(1)
      .max(20)
      .refine((courses) => new Set(courses).size === courses.length, {
        message: "Course IDs must be unique",
      })
      .meta({ uniqueItems: true }),
    acknowledgeCheckoutPolicies: z.literal(true),
    ...checkoutPolicySchema.shape,
  })
  .describe(
    "A checkout request containing unique course IDs and an exact policy acknowledgement."
  )

const checkoutOrderSchema = z.strictObject({
  purchaseId: objectIdSchema,
  providerOrderId: z.string().min(1).max(128),
  amount: positiveMinorMoneySchema,
  reused: z.boolean(),
  checkoutExpiresAt: isoDateTimeSchema,
})

const checkoutOrderResponseSchema =
  createSuccessResponseSchema(checkoutOrderSchema)

const purchaseLineItemSchema = z.strictObject({
  courseId: objectIdSchema,
  courseName: z.string().min(1).max(200),
  amount: positiveMinorMoneySchema,
})

const purchaseFinancialsSchema = z
  .strictObject({
    amount: positiveMinorMoneySchema,
    lineItems: z
      .array(purchaseLineItemSchema)
      .min(1)
      .max(20)
      .refine(
        (lineItems) =>
          new Set(lineItems.map((lineItem) => lineItem.courseId)).size ===
          lineItems.length,
        "Purchase line-item course IDs must be unique"
      )
      .describe("One immutable price snapshot per unique course ID."),
  })
  .superRefine((value, context) => {
    const lineItemTotal = value.lineItems.reduce(
      (total, lineItem) => total + BigInt(lineItem.amount.amountMinor),
      0n
    )
    if (lineItemTotal !== BigInt(value.amount.amountMinor)) {
      context.addIssue({
        code: "custom",
        message: "Purchase amount must equal the line-item total",
        path: ["amount", "amountMinor"],
      })
    }
    if (
      value.lineItems.some(
        (lineItem) => lineItem.amount.currency !== value.amount.currency
      )
    ) {
      context.addIssue({
        code: "custom",
        message: "Purchase and line-item currencies must agree",
        path: ["amount", "currency"],
      })
    }
  })
  .describe(
    "Positive INR purchase totals whose amount equals the sum of all line items."
  )

const learnerPurchaseSchema = purchaseFinancialsSchema.safeExtend({
  id: objectIdSchema,
  status: purchaseStatusSchema,
  policy: checkoutPolicySchema,
  createdAt: isoDateTimeSchema,
  paidAt: isoDateTimeSchema.nullable(),
  fulfilledAt: isoDateTimeSchema.nullable(),
  refundRequestedAt: isoDateTimeSchema.nullable(),
  refundedAt: isoDateTimeSchema.nullable(),
  refundEligible: z.boolean(),
  refundEligibleUntil: isoDateTimeSchema.nullable(),
  refundProviderStatus: refundProviderStatusSchema.nullable(),
})

const refundRequestSchema = z.strictObject({
  confirmation: z.literal("REQUEST REFUND"),
  reason: z.string().trim().min(10).max(1000),
})

module.exports = {
  checkoutOrderResponseSchema,
  checkoutOrderSchema,
  checkoutPolicySchema,
  checkoutRequestSchema,
  idempotencyKeySchema,
  learnerPurchaseSchema,
  purchaseFinancialsSchema,
  purchaseLineItemSchema,
  purchaseStatusSchema,
  reconciliationResolutionSchema,
  refundProviderStatusSchema,
  refundRequestSchema,
}
