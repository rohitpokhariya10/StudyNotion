import { z } from "zod"

export const catalogLevelSchema = z.enum([
  "beginner",
  "intermediate",
  "advanced",
])

export const catalogSortSchema = z.enum([
  "relevance",
  "newest",
  "price_asc",
  "price_desc",
  "rating_desc",
  "popular",
])

const languageCodePattern = /^[A-Za-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/
const canonicalLanguageCodePattern = /^[a-z]{2,3}(?:-[a-z0-9]{2,8})*$/

export const objectIdSchema = z.string().regex(/^[A-Fa-f\d]{24}$/, "Invalid ID")

const catalogCursorSchema = z
  .string()
  .min(1)
  .max(2048)
  .regex(/^[A-Za-z0-9_-]+$/, "Invalid cursor")

const blankAsUndefined = (value: unknown) =>
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

const optionalQueryNumber = <T extends z.ZodNumber>(schema: T) =>
  z.preprocess((value) => {
    if (value === undefined) return undefined
    if (typeof value !== "string" || !value.trim()) return value
    return Number(value)
  }, schema.optional())

const languageCodeSchema = z
  .string()
  .trim()
  .min(2)
  .max(35)
  .regex(languageCodePattern, "Invalid language code")
  .transform((value) => value.toLowerCase())

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

export const catalogCourseListQuerySchema = catalogQueryBaseSchema
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
    sort:
      value.sort ?? (value.q ? ("relevance" as const) : ("newest" as const)),
  }))

export const catalogQueryOpenApiSchema = z.strictObject({
  q: z.string().trim().min(1).max(120).optional(),
  categoryId: objectIdSchema.optional(),
  level: catalogLevelSchema.optional(),
  language: z.string().min(2).max(35).regex(languageCodePattern).optional(),
  minPrice: z.number().min(0).max(10_000_000).optional(),
  maxPrice: z.number().min(0).max(10_000_000).optional(),
  minRating: z.number().min(0).max(5).optional(),
  minDurationSeconds: z.number().int().min(0).max(31_536_000).optional(),
  maxDurationSeconds: z.number().int().min(0).max(31_536_000).optional(),
  sort: catalogSortSchema.optional(),
  limit: z.number().int().min(1).max(50).default(12),
  cursor: catalogCursorSchema.optional(),
})

const nullableImageSchema = z.string().min(1).max(4096).nullable()

export const catalogCourseSchema = z.strictObject({
  id: objectIdSchema,
  name: z.string().min(1).max(200),
  description: z.string().min(1).max(10_000),
  thumbnailUrl: z.string().min(1).max(4096),
  price: z.number().finite().min(0.01).max(10_000_000),
  currency: z.literal("INR"),
  instructor: z
    .strictObject({
      id: objectIdSchema,
      name: z.string().min(1).max(161),
      imageUrl: nullableImageSchema,
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
  language: z
    .string()
    .min(2)
    .max(35)
    .regex(canonicalLanguageCodePattern)
    .nullable(),
  enrollmentCount: z.number().int().min(0),
  createdAt: z.iso.datetime(),
})

export const catalogCourseListResponseSchema = z.strictObject({
  success: z.literal(true),
  requestId: z.string().min(1).max(100),
  data: z.strictObject({
    items: z.array(catalogCourseSchema),
    pageInfo: z.strictObject({
      endCursor: catalogCursorSchema.nullable(),
      hasNextPage: z.boolean(),
    }),
  }),
})

export type CatalogCourseListQuery = z.output<
  typeof catalogCourseListQuerySchema
>
export type CatalogCourse = z.infer<typeof catalogCourseSchema>
export type CatalogCourseListResponse = z.infer<
  typeof catalogCourseListResponseSchema
>
