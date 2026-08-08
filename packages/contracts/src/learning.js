const { z } = require("zod")

const {
  createSuccessResponseSchema,
  httpUrlSchema,
  isoDateTimeSchema,
  objectIdSchema,
  percentageSchema,
} = require("./common")

const emptyLearningRequestSchema = z.strictObject({})

const learningCourseParamsSchema = z.strictObject({
  courseId: objectIdSchema,
})

const learningLessonProgressParamsSchema = z.strictObject({
  courseId: objectIdSchema,
  lessonId: objectIdSchema,
})

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

const learningLessonSchema = z.strictObject({
  id: objectIdSchema,
  title: z.string().min(1).max(200),
  description: z.string().max(5000),
  durationSeconds: z.number().int().min(0).max(31_536_000),
})

const learningSectionSchema = z.strictObject({
  id: objectIdSchema,
  name: z.string().min(1).max(200),
  lessons: z.array(learningLessonSchema).max(500),
})

const learningCourseSummarySchema = z.strictObject({
  id: objectIdSchema,
  name: z.string().min(1).max(200),
  thumbnailUrl: z.string().min(1).max(4096).nullable(),
})

const learningCourseStateSchema = z
  .strictObject({
    course: learningCourseSummarySchema,
    curriculum: z.array(learningSectionSchema).max(200),
    progress: courseProgressSchema,
  })
  .superRefine((value, context) => {
    if (value.progress.courseId !== value.course.id) {
      context.addIssue({
        code: "custom",
        message: "Progress must belong to the learning course",
        path: ["progress", "courseId"],
      })
    }

    const sectionIds = value.curriculum.map((section) => section.id)
    if (new Set(sectionIds).size !== sectionIds.length) {
      context.addIssue({
        code: "custom",
        message: "Curriculum section IDs must be unique",
        path: ["curriculum"],
      })
    }

    const lessonIds = value.curriculum.flatMap((section) =>
      section.lessons.map((lesson) => lesson.id)
    )
    const validLessonIds = new Set(lessonIds)
    if (validLessonIds.size !== lessonIds.length) {
      context.addIssue({
        code: "custom",
        message: "Curriculum lesson IDs must be unique",
        path: ["curriculum"],
      })
    }
    if (value.progress.totalLessons !== lessonIds.length) {
      context.addIssue({
        code: "custom",
        message: "Progress total must match the curriculum",
        path: ["progress", "totalLessons"],
      })
    }
    if (
      value.progress.completedLessonIds.some(
        (lessonId) => !validLessonIds.has(lessonId)
      )
    ) {
      context.addIssue({
        code: "custom",
        message: "Completed lessons must belong to the curriculum",
        path: ["progress", "completedLessonIds"],
      })
    }
  })

const learningCourseResponseSchema = createSuccessResponseSchema(
  learningCourseStateSchema
)
const learningProgressResponseSchema =
  createSuccessResponseSchema(courseProgressSchema)

module.exports = {
  courseProgressSchema,
  emptyLearningRequestSchema,
  learningCourseParamsSchema,
  learningCourseResponseSchema,
  learningCourseStateSchema,
  learningCourseSummarySchema,
  learningLessonProgressParamsSchema,
  learningLessonSchema,
  learningProgressResponseSchema,
  learningSectionSchema,
  lessonPlaybackSchema,
  progressUpdateRequestSchema,
}
