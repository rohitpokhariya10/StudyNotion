const assert = require("node:assert/strict")
const test = require("node:test")

const {
  emptyLearningRequestSchema,
  learningCourseParamsSchema,
  learningCourseResponseSchema,
  learningLessonProgressParamsSchema,
  learningProgressResponseSchema,
  progressUpdateRequestSchema,
} = require("@studynotion/contracts/learning")

const ids = {
  course: "64b000000000000000000001",
  lesson: "64b000000000000000000002",
  lessonTwo: "64b000000000000000000003",
  section: "64b000000000000000000004",
  user: "64b000000000000000000005",
}
const timestamp = "2026-08-08T10:30:00.000Z"

const learningResponse = (overrides = {}) => ({
  success: true,
  requestId: "learning-request-1",
  data: {
    course: {
      id: ids.course,
      name: "Production APIs",
      thumbnailUrl: "https://cdn.example.test/course.webp",
    },
    curriculum: [
      {
        id: ids.section,
        name: "Foundations",
        lessons: [
          {
            id: ids.lesson,
            title: "Authorization",
            description: "Authorize every resource.",
            durationSeconds: 90,
          },
          {
            id: ids.lessonTwo,
            title: "Idempotency",
            description: "Make retries safe.",
            durationSeconds: 120,
          },
        ],
      },
    ],
    progress: {
      courseId: ids.course,
      completedLessonIds: [ids.lesson],
      completedCount: 1,
      totalLessons: 2,
      progressPercent: 50,
      updatedAt: timestamp,
    },
    ...overrides,
  },
})

test("learning v2 accepts canonical course state and direct progress responses", () => {
  const response = learningResponse()
  assert.equal(learningCourseResponseSchema.safeParse(response).success, true)
  assert.equal(
    learningProgressResponseSchema.safeParse({
      success: true,
      requestId: "learning-request-2",
      data: response.data.progress,
    }).success,
    true
  )

  const zeroLessonResponse = learningResponse({
    curriculum: [],
    progress: {
      courseId: ids.course,
      completedLessonIds: [],
      completedCount: 0,
      totalLessons: 0,
      progressPercent: 0,
      updatedAt: null,
    },
  })
  assert.equal(
    learningCourseResponseSchema.safeParse(zeroLessonResponse).success,
    true
  )
})

test("learning v2 rejects inconsistent curriculum and progress state", () => {
  for (const dataOverrides of [
    {
      progress: {
        ...learningResponse().data.progress,
        courseId: ids.lessonTwo,
      },
    },
    {
      progress: {
        ...learningResponse().data.progress,
        totalLessons: 3,
        progressPercent: 33.33,
      },
    },
    {
      curriculum: [
        learningResponse().data.curriculum[0],
        learningResponse().data.curriculum[0],
      ],
      progress: {
        ...learningResponse().data.progress,
        totalLessons: 4,
        progressPercent: 25,
      },
    },
    {
      curriculum: [
        {
          ...learningResponse().data.curriculum[0],
          lessons: [
            learningResponse().data.curriculum[0].lessons[0],
            learningResponse().data.curriculum[0].lessons[0],
          ],
        },
      ],
      progress: {
        ...learningResponse().data.progress,
        totalLessons: 2,
      },
    },
    {
      progress: {
        ...learningResponse().data.progress,
        completedLessonIds: [ids.user],
      },
    },
  ]) {
    assert.equal(
      learningCourseResponseSchema.safeParse(learningResponse(dataOverrides))
        .success,
      false
    )
  }
})

test("learning v2 DTOs reject identities and protected-media metadata", () => {
  const base = learningResponse()
  assert.equal(
    learningCourseResponseSchema.safeParse({
      ...base,
      data: { ...base.data, userId: ids.user },
    }).success,
    false
  )
  assert.equal(
    learningCourseResponseSchema.safeParse({
      ...base,
      data: {
        ...base.data,
        course: {
          ...base.data.course,
          studentsEnroled: [ids.user],
        },
      },
    }).success,
    false
  )
  for (const privateField of [
    ["videoUrl", "https://signed.example.test/private"],
    ["videoPublicId", "provider/private-id"],
    ["videoDeliveryType", "authenticated"],
  ]) {
    const lesson = {
      ...base.data.curriculum[0].lessons[0],
      [privateField[0]]: privateField[1],
    }
    assert.equal(
      learningCourseResponseSchema.safeParse({
        ...base,
        data: {
          ...base.data,
          curriculum: [
            {
              ...base.data.curriculum[0],
              lessons: [lesson, base.data.curriculum[0].lessons[1]],
            },
          ],
        },
      }).success,
      false
    )
  }
})

test("learning v2 route boundaries are strict and mark-only", () => {
  assert.deepEqual(learningCourseParamsSchema.parse({ courseId: ids.course }), {
    courseId: ids.course,
  })
  assert.deepEqual(
    learningLessonProgressParamsSchema.parse({
      courseId: ids.course,
      lessonId: ids.lesson,
    }),
    { courseId: ids.course, lessonId: ids.lesson }
  )
  assert.equal(
    learningLessonProgressParamsSchema.safeParse({
      courseId: ids.course,
      lessonId: "invalid",
    }).success,
    false
  )
  assert.equal(
    learningCourseParamsSchema.safeParse({
      courseId: ids.course,
      userId: ids.user,
    }).success,
    false
  )
  assert.deepEqual(emptyLearningRequestSchema.parse({}), {})
  assert.equal(
    emptyLearningRequestSchema.safeParse({ completed: true }).success,
    false
  )

  // Retain the pre-existing foundation contract without wiring its incomplete
  // operation into the new mark-only resource endpoint.
  assert.equal(
    progressUpdateRequestSchema.safeParse({
      lessonId: ids.lesson,
      completed: false,
    }).success,
    true
  )
})
