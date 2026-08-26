const assert = require("node:assert/strict")
const test = require("node:test")

const { LearningApiError } = require("../domains/learning/learningErrors")
const {
  getLearningCourse,
  markLessonComplete,
} = require("../domains/learning/learningService")

const ids = {
  course: "64b000000000000000000001",
  section: "64b000000000000000000002",
  lesson: "64b000000000000000000003",
  otherLesson: "64b000000000000000000004",
  user: "64b000000000000000000005",
}

const course = (overrides = {}) => ({
  _id: ids.course,
  courseName: "Production Learning",
  thumbnail: "data:image/svg+xml,learning",
  courseContent: [ids.section],
  ...overrides,
})

const curriculum = () => ({
  sections: [
    {
      _id: ids.section,
      sectionName: "Start",
      subSection: [ids.lesson],
    },
  ],
  lessons: [
    {
      _id: ids.lesson,
      title: "Introduction",
      description: "Start here.",
      timeDuration: "120",
    },
  ],
})

const repository = (overrides = {}) => ({
  courseExists: async () => true,
  findCourseProgress: async () => null,
  findCurriculum: async () => curriculum(),
  findEntitledCourse: async () => course(),
  markLessonComplete: async () => ({
    completedVideos: [ids.lesson],
    updatedAt: new Date("2026-08-08T08:00:00.000Z"),
  }),
  ...overrides,
})

const request = (overrides = {}) => ({
  courseId: ids.course,
  requestId: "learning-service",
  userId: ids.user,
  ...overrides,
})

test("learning service distinguishes a missing course from denied enrollment", async () => {
  await assert.rejects(
    getLearningCourse(request(), {
      repository: repository({
        courseExists: async () => false,
        findEntitledCourse: async () => null,
      }),
    }),
    (error) => {
      assert.equal(error instanceof LearningApiError, true)
      assert.equal(error.code, "LEARNING_COURSE_NOT_FOUND")
      assert.equal(error.statusCode, 404)
      return true
    }
  )

  await assert.rejects(
    getLearningCourse(request(), {
      repository: repository({ findEntitledCourse: async () => null }),
    }),
    (error) => {
      assert.equal(error instanceof LearningApiError, true)
      assert.equal(error.code, "LEARNING_ACCESS_DENIED")
      assert.equal(error.statusCode, 403)
      return true
    }
  )
})

test("learning service returns only canonical current progress", async () => {
  const result = await getLearningCourse(request(), {
    repository: repository({
      findCourseProgress: async () => ({
        completedVideos: [ids.lesson, ids.lesson, ids.otherLesson],
        updatedAt: new Date("2026-08-08T08:00:00.000Z"),
      }),
    }),
  })

  assert.equal(result.success, true)
  assert.equal(result.requestId, "learning-service")
  assert.deepEqual(result.data.progress.completedLessonIds, [ids.lesson])
  assert.equal(result.data.progress.completedCount, 1)
  assert.equal(result.data.progress.totalLessons, 1)
  assert.equal(result.data.progress.progressPercent, 100)
  const serialized = JSON.stringify(result)
  assert.equal(serialized.includes(ids.user), false)
  assert.equal(serialized.includes("videoUrl"), false)
  assert.equal(serialized.includes("videoPublicId"), false)
})

test("learning completion is repeat-safe and normalizes uppercase ObjectIds", async () => {
  const completed = new Set()
  let updates = 0
  const fakeRepository = repository({
    markLessonComplete: async ({ lessonId }) => {
      updates += 1
      completed.add(lessonId)
      return {
        completedVideos: [...completed],
        updatedAt: new Date("2026-08-08T08:00:00.000Z"),
      }
    },
  })
  const upperCaseLessonId = ids.lesson.toUpperCase()

  const first = await markLessonComplete(
    request({ lessonId: upperCaseLessonId }),
    { repository: fakeRepository }
  )
  const repeated = await markLessonComplete(
    request({ lessonId: upperCaseLessonId }),
    { repository: fakeRepository }
  )

  assert.equal(updates, 2)
  assert.equal(completed.size, 1)
  assert.deepEqual(first.data.completedLessonIds, [ids.lesson])
  assert.deepEqual(repeated.data.completedLessonIds, [ids.lesson])
  assert.equal(repeated.data.progressPercent, 100)
})

test("learning completion rejects a lesson from another course before persistence", async () => {
  let updateCalled = false
  await assert.rejects(
    markLessonComplete(request({ lessonId: ids.otherLesson }), {
      repository: repository({
        markLessonComplete: async () => {
          updateCalled = true
        },
      }),
    }),
    (error) => {
      assert.equal(error.code, "LEARNING_LESSON_NOT_FOUND")
      assert.equal(error.statusCode, 404)
      return true
    }
  )
  assert.equal(updateCalled, false)
})

test("learning service fails closed when mapped source data violates the response contract", async () => {
  await assert.rejects(
    getLearningCourse(request(), {
      repository: repository({
        findEntitledCourse: async () => course({ courseName: "x".repeat(201) }),
      }),
    }),
    (error) => {
      assert.equal(error.code, "LEARNING_RESPONSE_INVALID")
      assert.equal(error.statusCode, 500)
      return true
    }
  )
})
