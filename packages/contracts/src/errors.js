const { z } = require("zod")

const { requestIdSchema } = require("./common")

const containsNoControlCharacters = (value) => !/\p{C}/u.test(value)
const safePublicTextSchema = (minimum, maximum) => {
  let schema = z.string()
  if (minimum > 0) schema = schema.min(minimum)
  return schema
    .max(maximum)
    .refine(containsNoControlCharacters, "Control characters are not allowed")
}

const validationIssueSchema = z.strictObject({
  code: safePublicTextSchema(1, 100),
  message: safePublicTextSchema(1, 500),
  path: safePublicTextSchema(0, 500),
})

const validationErrorDetailsSchema = z.strictObject({
  fields: z.array(validationIssueSchema).min(1).max(100),
})

// Add an explicit safe details variant here when a future v2 slice needs one.
// Arbitrary records are intentionally rejected so a pre-shaped error cannot
// smuggle stacks, credentials, provider payloads, or internal documents.
const apiErrorDetailsSchema = validationErrorDetailsSchema

const apiErrorSchema = z.strictObject({
  code: z.string().regex(/^[A-Z][A-Z0-9_]{0,99}$/),
  message: safePublicTextSchema(1, 500),
  requestId: requestIdSchema,
  details: apiErrorDetailsSchema.optional(),
})

const apiErrorResponseSchema = z.strictObject({
  error: apiErrorSchema,
})

module.exports = {
  apiErrorDetailsSchema,
  apiErrorResponseSchema,
  apiErrorSchema,
  validationErrorDetailsSchema,
  validationIssueSchema,
}
