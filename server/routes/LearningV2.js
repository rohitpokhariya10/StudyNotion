const express = require("express")
const {
  emptyLearningRequestSchema,
  learningCourseParamsSchema,
  learningLessonProgressParamsSchema,
} = require("@studynotion/contracts/learning")

const {
  getLearningCourse,
  markLessonComplete,
} = require("../controllers/LearningV2")
const { sendV2Error } = require("../domains/learning/learningErrors")
const { auth, isStudent } = require("../middleware/auth")
const { validateV2Request } = require("../shared/http/validateV2Request")

const router = express.Router()

router.get(
  "/courses/:courseId",
  auth,
  isStudent,
  validateV2Request({
    params: learningCourseParamsSchema,
    query: emptyLearningRequestSchema,
  }),
  getLearningCourse
)

router.put(
  "/courses/:courseId/lessons/:lessonId/progress",
  auth,
  isStudent,
  validateV2Request({
    params: learningLessonProgressParamsSchema,
    query: emptyLearningRequestSchema,
    body: emptyLearningRequestSchema,
  }),
  markLessonComplete
)

router.use((req, res) =>
  sendV2Error(req, res, {
    code: "ROUTE_NOT_FOUND",
    message: "Route not found",
    statusCode: 404,
  })
)

module.exports = router
