const { z } = require("zod")

const { objectIdSchema } = require("./common")

const opaqueCursorSchema = z
  .string()
  .min(1)
  .max(2048)
  .regex(/^[A-Za-z0-9_-]+$/, "Invalid cursor")

const blankAsUndefined = (value) =>
  typeof value === "string" && value.trim() === "" ? undefined : value

const optionalQueryInteger = (schema) =>
  z.preprocess((value) => {
    if (value === undefined) return undefined
    if (typeof value !== "string" || !value.trim()) return value
    return Number(value)
  }, schema.optional())

const cursorPaginationQuerySchema = z
  .strictObject({
    cursor: z.preprocess(blankAsUndefined, opaqueCursorSchema.optional()),
    limit: optionalQueryInteger(z.number().int().min(1).max(100)),
  })
  .transform((value) => ({ ...value, limit: value.limit ?? 20 }))

const cursorPaginationOpenApiSchema = z.strictObject({
  cursor: opaqueCursorSchema.optional(),
  limit: z.number().int().min(1).max(100).optional().meta({ default: 20 }),
})

const offsetPaginationQuerySchema = z
  .strictObject({
    page: optionalQueryInteger(z.number().int().min(1).max(1_000_000)),
    limit: optionalQueryInteger(z.number().int().min(1).max(100)),
  })
  .transform((value) => ({
    limit: value.limit ?? 20,
    page: value.page ?? 1,
  }))

const offsetPaginationOpenApiSchema = z.strictObject({
  page: z.number().int().min(1).max(1_000_000).optional().meta({ default: 1 }),
  limit: z.number().int().min(1).max(100).optional().meta({ default: 20 }),
})

const cursorPageInfoSchema = z
  .strictObject({
    endCursor: opaqueCursorSchema.nullable(),
    hasNextPage: z.boolean(),
  })
  .superRefine((value, context) => {
    if (value.hasNextPage && value.endCursor === null) {
      context.addIssue({
        code: "custom",
        message: "A next page requires an end cursor",
        path: ["endCursor"],
      })
    }
  })
  .describe(
    "Cursor metadata with a required end cursor when a next page exists."
  )

const offsetPageInfoSchema = z.strictObject({
  page: z.number().int().min(1),
  limit: z.number().int().min(1).max(100),
  total: z.number().int().min(0),
  pages: z.number().int().min(0),
})

const createCursorPageSchema = (itemSchema) =>
  z.strictObject({
    items: z.array(itemSchema),
    pageInfo: cursorPageInfoSchema,
  })

const createOffsetPageSchema = (itemSchema) =>
  z.strictObject({
    items: z.array(itemSchema),
    pageInfo: offsetPageInfoSchema,
  })

const resourceIdParamsSchema = z.strictObject({
  resourceId: objectIdSchema,
})

module.exports = {
  createCursorPageSchema,
  createOffsetPageSchema,
  cursorPageInfoSchema,
  cursorPaginationOpenApiSchema,
  cursorPaginationQuerySchema,
  offsetPageInfoSchema,
  offsetPaginationOpenApiSchema,
  offsetPaginationQuerySchema,
  opaqueCursorSchema,
  resourceIdParamsSchema,
}
