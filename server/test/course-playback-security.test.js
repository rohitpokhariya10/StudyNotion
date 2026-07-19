const assert = require("node:assert/strict")
const test = require("node:test")

const courseId = "64b000000000000000000001"
const sectionId = "64b000000000000000000002"
const lessonId = "64b000000000000000000003"
const userId = "64b000000000000000000004"

let enrolled = true
let lessonBelongs = true
let lesson = {
  _id: lessonId,
  videoDeliveryType: "authenticated",
  videoFormat: "mp4",
  videoPublicId: "courses/private-lesson",
  videoUrl: "https://public.example.invalid/should-not-leak.mp4",
}

const installMock = (modulePath, exports) => {
  const filename = require.resolve(modulePath)
  require.cache[filename] = { id: filename, filename, loaded: true, exports }
}

const Course = {
  findById: () => ({
    select: async () => ({
      _id: courseId,
      courseContent: [sectionId],
      instructor: "64b000000000000000000099",
      studentsEnroled: enrolled ? [userId] : [],
    }),
  }),
}
const User = {
  findById: () => ({
    select: async () => ({ accountType: "Student", active: true, approved: true }),
  }),
}
const Section = { exists: async () => lessonBelongs }
const SubSection = {
  findById: () => ({ select: async () => lesson }),
}

class MediaUploadError extends Error {}
installMock("../config/env", {
  isProduction: true,
  mediaUrlTtlSeconds: 3600,
})
installMock("../models/Category", {})
installMock("../models/Course", Course)
installMock("../models/CourseProgress", {})
installMock("../models/Purchase", {})
installMock("../models/RatingandReview", {})
installMock("../models/Section", Section)
installMock("../models/Subsection", SubSection)
installMock("../models/User", User)
installMock("../utils/courseLifecycle", { isCoursePublishReady: async () => true })
installMock("../utils/imageUploader", {
  MediaUploadError,
  createPrivateMediaUrl: () => "https://signed.example.test/private-lesson",
  deleteAssetFromCloudinary: async () => true,
  uploadImageToCloudinary: async () => ({}),
})

delete require.cache[require.resolve("../controllers/Course")]
const controller = require("../controllers/Course")

const createResponse = () => ({
  body: undefined,
  statusCode: 200,
  json(body) {
    this.body = body
    return this
  },
  status(statusCode) {
    this.statusCode = statusCode
    return this
  },
})

const request = () => ({
  body: { courseId, subSectionId: lessonId },
  user: { id: userId },
})

test("an enrolled learner receives a fresh minimal signed playback response", async () => {
  enrolled = true
  lessonBelongs = true
  lesson = {
    _id: lessonId,
    videoDeliveryType: "authenticated",
    videoFormat: "mp4",
    videoPublicId: "courses/private-lesson",
    videoUrl: "https://public.example.invalid/should-not-leak.mp4",
  }
  const response = createResponse()
  await controller.getLessonPlaybackUrl(request(), response)

  assert.equal(response.statusCode, 200)
  assert.equal(response.body.data.url, "https://signed.example.test/private-lesson")
  assert.equal(typeof response.body.data.expiresAt, "string")
  assert.deepEqual(Object.keys(response.body.data).sort(), [
    "expiresAt",
    "subSectionId",
    "url",
  ])
})

test("playback rejects non-entitled users and cross-course lesson IDs", async () => {
  enrolled = false
  const denied = createResponse()
  await controller.getLessonPlaybackUrl(request(), denied)
  assert.equal(denied.statusCode, 403)

  enrolled = true
  lessonBelongs = false
  const mismatched = createResponse()
  await controller.getLessonPlaybackUrl(request(), mismatched)
  assert.equal(mismatched.statusCode, 404)
})

test("production playback never returns a legacy public media URL", async () => {
  enrolled = true
  lessonBelongs = true
  lesson = {
    _id: lessonId,
    videoDeliveryType: "upload",
    videoUrl: "https://public.example.test/legacy.mp4",
  }
  const response = createResponse()
  await controller.getLessonPlaybackUrl(request(), response)

  assert.equal(response.statusCode, 409)
  assert.equal(JSON.stringify(response.body).includes("public.example.test"), false)
})

test("entitled course DTOs expose enrollment counts but no learner IDs", () => {
  const dto = controller._test.sanitizeEntitledCourse({
    _id: courseId,
    archivedBy: "64b000000000000000000088",
    category: {
      _id: "category-1",
      courses: [courseId],
      description: "Description",
      name: "Category",
    },
    ratingAndReviews: [
      {
        _id: "review-1",
        course: courseId,
        rating: 5,
        review: "Useful",
        user: userId,
      },
    ],
    studentsEnroled: [userId, "64b000000000000000000005"],
  })

  assert.equal(dto.totalStudentsEnrolled, 2)
  assert.equal("studentsEnroled" in dto, false)
  assert.equal("archivedBy" in dto, false)
  assert.equal("courses" in dto.category, false)
  assert.equal("user" in dto.ratingAndReviews[0], false)
  assert.equal("course" in dto.ratingAndReviews[0], false)
})

test("instructor course DTOs never expose learner IDs", () => {
  const dto = controller._test.sanitizeInstructorCourse({
    _id: courseId,
    studentsEnroled: [userId, "64b000000000000000000005"],
    thumbnailPublicId: "private-thumbnail-id",
  })

  assert.equal(dto.totalStudentsEnrolled, 2)
  assert.equal("studentsEnroled" in dto, false)
  assert.equal("thumbnailPublicId" in dto, false)
})
