const { z } = require("zod")

const REQUEST_ID_PATTERN = /^[A-Za-z0-9._:-]{1,100}$/
const OBJECT_ID_PATTERN = /^[A-Fa-f\d]{24}$/
const IDEMPOTENCY_KEY_PATTERN = /^[A-Za-z0-9._:-]{8,100}$/
// JSON Schema has no portable regex flags, so case-insensitivity is expressed
// in the pattern itself to keep runtime and generated OpenAPI behavior aligned.
const HTTP_URL_PATTERN = /^[Hh][Tt][Tt][Pp][Ss]?:\/\//

const requestIdSchema = z
  .string()
  .regex(REQUEST_ID_PATTERN, "Invalid request ID")

const objectIdSchema = z.string().regex(OBJECT_ID_PATTERN, "Invalid ID")
const isoDateSchema = z.iso.date()
const isoDateTimeSchema = z.iso.datetime()
const currencySchema = z.literal("INR")
const amountMinorSchema = z.number().int().min(0).max(Number.MAX_SAFE_INTEGER)
const positiveAmountMinorSchema = z
  .number()
  .int()
  .min(1)
  .max(Number.MAX_SAFE_INTEGER)
const minorMoneySchema = z.strictObject({
  amountMinor: amountMinorSchema,
  currency: currencySchema,
})
const positiveMinorMoneySchema = z
  .strictObject({
    amountMinor: positiveAmountMinorSchema,
    currency: currencySchema,
  })
  .describe("A positive monetary amount in integer INR minor units.")
const httpUrlSchema = z
  .string()
  .max(4096)
  .regex(HTTP_URL_PATTERN, "Only HTTP(S) URLs are allowed")
  .url()
const imageUrlSchema = httpUrlSchema
const nullableImageUrlSchema = imageUrlSchema.nullable()
const policyVersionSchema = z.string().min(1).max(40)
const idempotencyKeySchema = z
  .string()
  .regex(IDEMPOTENCY_KEY_PATTERN, "Invalid idempotency key")
const percentageSchema = z.number().finite().min(0).max(100)

const createSuccessResponseSchema = (dataSchema) =>
  z.strictObject({
    success: z.literal(true),
    requestId: requestIdSchema,
    data: dataSchema,
  })

module.exports = {
  amountMinorSchema,
  createSuccessResponseSchema,
  currencySchema,
  httpUrlSchema,
  idempotencyKeySchema,
  imageUrlSchema,
  isoDateSchema,
  isoDateTimeSchema,
  minorMoneySchema,
  nullableImageUrlSchema,
  objectIdSchema,
  percentageSchema,
  policyVersionSchema,
  positiveAmountMinorSchema,
  positiveMinorMoneySchema,
  requestIdSchema,
}
