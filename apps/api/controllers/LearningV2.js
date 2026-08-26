const {
  LearningApiError,
  sendV2Error,
} = require("../domains/learning/learningErrors")
const {
  getLearningCourse,
  markLessonComplete,
} = require("../domains/learning/learningService")
const logger = require("../utils/logger")

const LEARNING_SLOW_REQUEST_MS = 1_000

const executeLearningRequest = async ({ event, operation, req, res }) => {
  const startedAt = performance.now()
  try {
    const response = await operation()
    const durationMs = Math.round(performance.now() - startedAt)
    if (durationMs >= LEARNING_SLOW_REQUEST_MS) {
      logger.warn(`${event}.slow`, {
        requestId: req.requestId || "unknown",
        durationMs,
      })
    }
    res.setHeader("Cache-Control", "private, no-store")
    return res.status(200).json(response)
  } catch (error) {
    if (error instanceof LearningApiError) {
      return sendV2Error(req, res, error)
    }
    logger.error(`${event}.failed`, {
      requestId: req.requestId || "unknown",
      error: logger.errorMetadata(error),
    })
    return sendV2Error(req, res, {
      code: "LEARNING_UNAVAILABLE",
      message: "The learning request could not be completed",
      statusCode: 500,
    })
  }
}

exports.getLearningCourse = (req, res) =>
  executeLearningRequest({
    event: "learning.v2.course_lookup",
    operation: () =>
      getLearningCourse({
        courseId: res.locals.v2Input.params.courseId,
        requestId: req.requestId || "unknown",
        userId: req.user.id,
      }),
    req,
    res,
  })

exports.markLessonComplete = (req, res) =>
  executeLearningRequest({
    event: "learning.v2.progress_update",
    operation: () =>
      markLessonComplete({
        courseId: res.locals.v2Input.params.courseId,
        lessonId: res.locals.v2Input.params.lessonId,
        requestId: req.requestId || "unknown",
        userId: req.user.id,
      }),
    req,
    res,
  })
