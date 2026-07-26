const { z } = require("zod")

const {
  httpUrlSchema,
  isoDateTimeSchema,
  objectIdSchema,
  percentageSchema,
} = require("./common")

const progressUpdateRequestSchema = z.strictObject({
  lessonId: objectIdSchema,
  completed: z.boolean(),
})

const courseProgressSchema = z
  .strictObject({
    courseId: objectIdSchema,
    completedLessonIds: z
      .array(objectIdSchema)
      .refine(
        (lessonIds) => new Set(lessonIds).size === lessonIds.length,
        "Completed lesson IDs must be unique"
      )
      .meta({ uniqueItems: true }),
    completedCount: z.number().int().min(0),
    totalLessons: z.number().int().min(0),
    progressPercent: percentageSchema,
    updatedAt: isoDateTimeSchema.nullable(),
  })
  .superRefine((value, context) => {
    if (value.completedCount !== value.completedLessonIds.length) {
      context.addIssue({
        code: "custom",
        message: "Completed count must match completed lesson IDs",
        path: ["completedCount"],
      })
    }
    if (value.completedCount > value.totalLessons) {
      context.addIssue({
        code: "custom",
        message: "Completed count cannot exceed total lessons",
        path: ["completedCount"],
      })
    }
    const expectedProgress = value.totalLessons
      ? Math.round((value.completedCount / value.totalLessons) * 10_000) / 100
      : 0
    if (value.progressPercent !== expectedProgress) {
      context.addIssue({
        code: "custom",
        message: "Progress percent must match the completed lesson count",
        path: ["progressPercent"],
      })
    }
  })
  .describe(
    "Course progress with unique lesson IDs and internally consistent counts and percentage."
  )

const lessonPlaybackSchema = z.strictObject({
  lessonId: objectIdSchema,
  url: httpUrlSchema,
  expiresAt: isoDateTimeSchema.nullable(),
})

module.exports = {
  courseProgressSchema,
  lessonPlaybackSchema,
  progressUpdateRequestSchema,
}
