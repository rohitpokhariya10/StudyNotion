const { z } = require("zod")

const { createSuccessResponseSchema, objectIdSchema } = require("./common")
const { canonicalLanguageCodeSchema, courseLevelSchema } = require("./courses")
const { cursorPageInfoSchema, opaqueCursorSchema } = require("./pagination")

const catalogLevelSchema = courseLevelSchema

const catalogSortSchema = z.enum([
  "relevance",
  "newest",
  "price_asc",
  "price_desc",
  "rating_desc",
  "popular",
])

const languageCodePattern = /^[A-Za-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/
const catalogCursorSchema = opaqueCursorSchema
const catalogPriceMajorSchema = z
  .number()
  .finite()
  .min(0.01)
  .max(10_000_000)
  .describe(
    "Compatibility price in INR major units; new commerce contracts use integer minor units."
  )
const nullableCatalogImageSchema = z.string().min(1).max(4096).nullable()

const blankAsUndefined = (value) =>
  typeof value === "string" && value.trim() === "" ? undefined : value

const optionalSearchText = z.preprocess(
  blankAsUndefined,
  z
    .string()
    .trim()
    .min(1)
    .max(120)
    .transform((value) => value.replace(/\s+/gu, " "))
    .optional()
)

const optionalQueryNumber = (schema) =>
  z.preprocess((value) => {
    if (value === undefined) return undefined
    if (typeof value !== "string" || !value.trim()) return value
    return Number(value)
  }, schema.optional())

const languageCodeWireSchema = z
  .string()
  .trim()
  .min(2)
  .max(35)
  .regex(languageCodePattern, "Invalid language code")

const languageCodeSchema = languageCodeWireSchema.transform((value) =>
  value.toLowerCase()
)

const catalogQueryBaseSchema = z.strictObject({
  q: optionalSearchText,
  categoryId: z.preprocess(blankAsUndefined, objectIdSchema.optional()),
  level: z.preprocess(blankAsUndefined, catalogLevelSchema.optional()),
  language: z.preprocess(blankAsUndefined, languageCodeSchema.optional()),
  minPrice: optionalQueryNumber(z.number().finite().min(0).max(10_000_000)),
  maxPrice: optionalQueryNumber(z.number().finite().min(0).max(10_000_000)),
  minRating: optionalQueryNumber(z.number().finite().min(0).max(5)),
  minDurationSeconds: optionalQueryNumber(
    z.number().int().min(0).max(31_536_000)
  ),
  maxDurationSeconds: optionalQueryNumber(
    z.number().int().min(0).max(31_536_000)
  ),
  sort: z.preprocess(blankAsUndefined, catalogSortSchema.optional()),
  limit: optionalQueryNumber(z.number().int().min(1).max(50)),
  cursor: z.preprocess(blankAsUndefined, catalogCursorSchema.optional()),
})

const catalogCourseListQuerySchema = catalogQueryBaseSchema
  .superRefine((value, context) => {
    if (
      value.minPrice !== undefined &&
      value.maxPrice !== undefined &&
      value.minPrice > value.maxPrice
    ) {
      context.addIssue({
        code: "custom",
        message: "minPrice cannot exceed maxPrice",
        path: ["minPrice"],
      })
    }
    if (
      value.minDurationSeconds !== undefined &&
      value.maxDurationSeconds !== undefined &&
      value.minDurationSeconds > value.maxDurationSeconds
    ) {
      context.addIssue({
        code: "custom",
        message: "minDurationSeconds cannot exceed maxDurationSeconds",
        path: ["minDurationSeconds"],
      })
    }
    if (value.sort === "relevance" && !value.q) {
      context.addIssue({
        code: "custom",
        message: "relevance sorting requires q",
        path: ["sort"],
      })
    }
  })
  .transform((value) => ({
    ...value,
    limit: value.limit ?? 12,
    sort: value.sort ?? (value.q ? "relevance" : "newest"),
  }))

const catalogQueryOpenApiSchema = z.strictObject({
  q: z.string().trim().min(1).max(120).optional(),
  categoryId: objectIdSchema.optional(),
  level: catalogLevelSchema.optional(),
  language: languageCodeWireSchema.optional(),
  minPrice: z.number().min(0).max(10_000_000).optional(),
  maxPrice: z.number().min(0).max(10_000_000).optional(),
  minRating: z.number().min(0).max(5).optional(),
  minDurationSeconds: z.number().int().min(0).max(31_536_000).optional(),
  maxDurationSeconds: z.number().int().min(0).max(31_536_000).optional(),
  sort: catalogSortSchema.optional(),
  limit: z.number().int().min(1).max(50).optional().meta({ default: 12 }),
  cursor: catalogCursorSchema.optional(),
})

const catalogCourseSchema = z.strictObject({
  id: objectIdSchema,
  name: z.string().min(1).max(200),
  description: z.string().min(1).max(10_000),
  thumbnailUrl: z.string().min(1).max(4096),
  // Catalog v2 shipped before the common minor-unit money contract. Keep this
  // major-unit field stable until a separately versioned catalog migration.
  price: catalogPriceMajorSchema,
  currency: z.literal("INR"),
  instructor: z
    .strictObject({
      id: objectIdSchema,
      name: z.string().min(1).max(161),
      // Preserve the already-shipped catalog contract, which allows legacy
      // relative/provider image strings as well as absolute URLs.
      imageUrl: nullableCatalogImageSchema,
    })
    .nullable(),
  category: z
    .strictObject({
      id: objectIdSchema,
      name: z.string().min(1).max(120),
    })
    .nullable(),
  rating: z.strictObject({
    average: z.number().finite().min(0).max(5),
    count: z.number().int().min(0),
  }),
  durationSeconds: z.number().int().min(0),
  level: catalogLevelSchema.nullable(),
  language: canonicalLanguageCodeSchema.nullable(),
  enrollmentCount: z.number().int().min(0),
  createdAt: z.iso.datetime(),
})

const catalogCourseListResponseSchema = createSuccessResponseSchema(
  z.strictObject({
    items: z.array(catalogCourseSchema),
    pageInfo: cursorPageInfoSchema,
  })
)

module.exports = {
  catalogCourseListQuerySchema,
  catalogCourseListResponseSchema,
  catalogCourseSchema,
  catalogLevelSchema,
  catalogPriceMajorSchema,
  catalogQueryOpenApiSchema,
  catalogSortSchema,
  objectIdSchema,
}
