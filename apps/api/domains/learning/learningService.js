const {
  learningCourseResponseSchema,
  learningProgressResponseSchema,
} = require("@studynotion/contracts/learning")

const { LearningApiError } = require("./learningErrors")
const {
  curriculumLessonIds,
  mapLearningCourseState,
  mapLearningCurriculum,
  mapLearningProgress,
} = require("./learningMapper")
const learningRepository = require("./learningRepository")

const resolveEntitledCourse = async (repository, { courseId, userId }) => {
  const course = await repository.findEntitledCourse({ courseId, userId })
  if (course) return course

  if (await repository.courseExists({ courseId })) {
    throw new LearningApiError(
      "LEARNING_ACCESS_DENIED",
      "You are not enrolled in this course",
      403
    )
  }
  throw new LearningApiError(
    "LEARNING_COURSE_NOT_FOUND",
    "Course not found",
    404
  )
}

const parseResponse = (schema, response) => {
  const parsed = schema.safeParse(response)
  if (!parsed.success) {
    throw new LearningApiError(
      "LEARNING_RESPONSE_INVALID",
      "The learning response could not be produced",
      500
    )
  }
  return parsed.data
}

const getLearningCourse = async (
  { courseId, requestId, userId },
  dependencies = {}
) => {
  const repository = dependencies.repository || learningRepository
  const course = await resolveEntitledCourse(repository, { courseId, userId })
  const [curriculumDocuments, progress] = await Promise.all([
    repository.findCurriculum({ sectionIds: course.courseContent }),
    repository.findCourseProgress({ courseId, userId }),
  ])
  const curriculum = mapLearningCurriculum({
    course,
    ...curriculumDocuments,
  })
  const response = {
    success: true,
    requestId,
    data: mapLearningCourseState({ course, curriculum, progress }),
  }

  return parseResponse(learningCourseResponseSchema, response)
}

const markLessonComplete = async (
  { courseId, lessonId, requestId, userId },
  dependencies = {}
) => {
  const repository = dependencies.repository || learningRepository
  const course = await resolveEntitledCourse(repository, { courseId, userId })
  const curriculumDocuments = await repository.findCurriculum({
    sectionIds: course.courseContent,
  })
  const curriculum = mapLearningCurriculum({
    course,
    ...curriculumDocuments,
  })
  const normalizedLessonId = lessonId.toLowerCase()

  if (!new Set(curriculumLessonIds(curriculum)).has(normalizedLessonId)) {
    throw new LearningApiError(
      "LEARNING_LESSON_NOT_FOUND",
      "Lesson not found in this course",
      404
    )
  }

  const progress = await repository.markLessonComplete({
    courseId,
    lessonId: normalizedLessonId,
    userId,
  })
  if (!progress) {
    throw new LearningApiError(
      "LEARNING_PROGRESS_UNAVAILABLE",
      "Course progress could not be updated",
      500
    )
  }

  const response = {
    success: true,
    requestId,
    data: mapLearningProgress({ courseId, curriculum, progress }),
  }
  return parseResponse(learningProgressResponseSchema, response)
}

module.exports = { getLearningCourse, markLessonComplete }
