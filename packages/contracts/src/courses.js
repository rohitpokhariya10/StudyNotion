const { z } = require("zod")

const {
  imageUrlSchema,
  isoDateTimeSchema,
  objectIdSchema,
  positiveMinorMoneySchema,
} = require("./common")
const { publicInstructorSchema } = require("./users")

const courseLevelSchema = z.enum(["beginner", "intermediate", "advanced"])
const courseLifecycleStatusSchema = z.enum(["Archived", "Draft", "Published"])
const canonicalLanguageCodeSchema = z
  .string()
  .min(2)
  .max(35)
  .regex(/^[a-z]{2,3}(?:-[a-z0-9]{2,8})*$/)

const courseCategorySchema = z.strictObject({
  id: objectIdSchema,
  name: z.string().min(1).max(120),
})

const courseRatingSummarySchema = z.strictObject({
  average: z.number().finite().min(0).max(5),
  count: z.number().int().min(0),
})

const lessonPreviewSchema = z.strictObject({
  id: objectIdSchema,
  title: z.string().min(1).max(200),
  description: z.string().max(10_000),
  durationSeconds: z.number().int().min(0).max(31_536_000),
  previewAvailable: z.boolean(),
})

const curriculumSectionSchema = z.strictObject({
  id: objectIdSchema,
  name: z.string().min(1).max(200),
  lessons: z.array(lessonPreviewSchema).max(500),
})

const courseDetailSchema = z.strictObject({
  id: objectIdSchema,
  name: z.string().min(1).max(200),
  description: z.string().min(1).max(10_000),
  whatYouWillLearn: z.string().min(1).max(10_000),
  thumbnailUrl: imageUrlSchema,
  price: positiveMinorMoneySchema,
  status: courseLifecycleStatusSchema,
  tags: z.array(z.string().min(1).max(80)).min(1).max(50),
  instructions: z.array(z.string().min(1).max(1000)).min(1).max(100),
  level: courseLevelSchema.nullable(),
  language: canonicalLanguageCodeSchema.nullable(),
  category: courseCategorySchema,
  instructor: publicInstructorSchema,
  rating: courseRatingSummarySchema,
  enrollmentCount: z.number().int().min(0),
  curriculum: z.array(curriculumSectionSchema).max(200),
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
})

const courseIdParamsSchema = z.strictObject({
  courseId: objectIdSchema,
})

module.exports = {
  canonicalLanguageCodeSchema,
  courseCategorySchema,
  courseDetailSchema,
  courseIdParamsSchema,
  courseLevelSchema,
  courseLifecycleStatusSchema,
  courseRatingSummarySchema,
  curriculumSectionSchema,
  lessonPreviewSchema,
}
