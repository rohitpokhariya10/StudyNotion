const { z } = require("zod")

const {
  isoDateTimeSchema,
  nullableImageUrlSchema,
  objectIdSchema,
} = require("./common")

const ratingSchema = z.number().int().min(1).max(5)

const createReviewRequestSchema = z.strictObject({
  courseId: objectIdSchema,
  rating: ratingSchema,
  review: z.string().trim().min(1).max(2000),
})

const publicReviewSchema = z.strictObject({
  createdAt: isoDateTimeSchema,
  course: z
    .strictObject({
      name: z.string().min(1).max(200),
    })
    .nullable(),
  rating: ratingSchema,
  review: z.string().min(1).max(2000),
  reviewer: z
    .strictObject({
      firstName: z.string().min(1).max(80),
      lastName: z.string().max(80),
      imageUrl: nullableImageUrlSchema,
    })
    .nullable(),
})

module.exports = {
  createReviewRequestSchema,
  publicReviewSchema,
  ratingSchema,
}
