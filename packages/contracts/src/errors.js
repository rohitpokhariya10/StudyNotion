const { z } = require("zod")

const apiErrorDetailsSchema = z.record(z.string(), z.unknown())

const apiErrorSchema = z.strictObject({
  code: z.string().min(1).max(100),
  message: z.string().min(1).max(500),
  requestId: z.string().min(1).max(100),
  details: apiErrorDetailsSchema.optional(),
})

const apiErrorResponseSchema = z.strictObject({
  error: apiErrorSchema,
})

module.exports = {
  apiErrorDetailsSchema,
  apiErrorResponseSchema,
  apiErrorSchema,
}
