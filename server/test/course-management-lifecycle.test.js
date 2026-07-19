const assert = require("node:assert/strict")
const test = require("node:test")

const courseId = "64b000000000000000000001"
const oldCategoryId = "64b000000000000000000002"
const newCategoryId = "64b000000000000000000003"
const instructorId = "64b000000000000000000004"

let course
let categoryExists = true
let categoryOperations = []
let modelOperations = []
let purchaseExists = () => false
let uploadCalls = 0

const installMock = (modulePath, exports) => {
  const filename = require.resolve(modulePath)
  require.cache[filename] = { id: filename, filename, loaded: true, exports }
}

const queryForCourse = () => {
  const query = {
    exec: async () => course,
    populate: () => query,
    select: async () => course,
  }
  return query
}

const Course = {
  create: async () => {
    throw new Error("create should not be reached")
  },
  findByIdAndDelete: async () => modelOperations.push(["course-delete"]),
  findOne: () => queryForCourse(),
  updateOne: async (query, update) => {
    modelOperations.push(["course-update", query, update])
    return { matchedCount: 1 }
  },
}
const Category = {
  exists: async () => categoryExists,
  findByIdAndUpdate: async (_id, update) =>
    modelOperations.push(["category-cleanup", update]),
  updateOne: async (query, update) => {
    categoryOperations.push([query, update])
    return { matchedCount: 1 }
  },
}
const CourseProgress = {
  deleteMany: async () => modelOperations.push(["progress-delete"]),
  find: () => ({
    select: () => ({ lean: async () => [{ _id: "progress-1" }] }),
  }),
}
const Purchase = {
  deleteMany: async () => modelOperations.push(["failed-purchases-delete"]),
  exists: async (query) => purchaseExists(query),
  updateMany: async () => ({ modifiedCount: 0 }),
}
const RatingAndReview = {
  deleteMany: async () => modelOperations.push(["reviews-delete"]),
}
const User = {
  updateMany: async () => modelOperations.push(["users-cleanup"]),
}

class MediaUploadError extends Error {}
installMock("../config/env", {
  checkoutTtlSeconds: 900,
  isProduction: true,
  mediaUrlTtlSeconds: 3600,
})
installMock("../models/Category", Category)
installMock("../models/Course", Course)
installMock("../models/CourseProgress", CourseProgress)
installMock("../models/Purchase", Purchase)
installMock("../models/RatingandReview", RatingAndReview)
installMock("../models/Section", {})
installMock("../models/Subsection", {})
installMock("../models/User", User)
installMock("../utils/courseLifecycle", {
  isCoursePublishReady: async () => true,
})
installMock("../utils/imageUploader", {
  MediaUploadError,
  createPrivateMediaUrl: () => "signed-url",
  deleteAssetFromCloudinary: async () => true,
  uploadImageToCloudinary: async () => {
    uploadCalls += 1
    return {}
  },
})

delete require.cache[require.resolve("../controllers/Course")]
const controller = require("../controllers/Course")

const response = () => ({
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

const freshCourse = (overrides = {}) => ({
  _id: courseId,
  category: oldCategoryId,
  courseContent: [],
  courseDescription: "A complete course description",
  courseName: "Lifecycle Course",
  instructor: instructorId,
  instructions: ["Practice each lesson"],
  price: 999,
  ratingAndReviews: [],
  status: "Draft",
  studentsEnroled: [],
  tag: ["Lifecycle"],
  thumbnail: "https://cdn.example.test/thumbnail.jpg",
  whatYouWillLearn: "A complete learning outcome",
  save: async () => undefined,
  ...overrides,
})

test("new courses cannot bypass curriculum validation by starting Published", async () => {
  uploadCalls = 0
  const res = response()
  await controller.createCourse(
    {
      body: {
        category: oldCategoryId,
        courseDescription: "Description",
        courseName: "Course",
        instructions: ["Practice"],
        price: 100,
        status: "Published",
        tag: ["Tag"],
        whatYouWillLearn: "Learn",
      },
      files: { thumbnailImage: { name: "thumbnail.png" } },
      user: { id: instructorId },
    },
    res
  )

  assert.equal(res.statusCode, 409)
  assert.equal(uploadCalls, 0)
})

test("editing a category moves the denormalized course reference", async () => {
  categoryExists = true
  categoryOperations = []
  course = freshCourse()
  const res = response()
  await controller.editCourse(
    {
      body: { category: newCategoryId, courseId },
      user: { id: instructorId },
    },
    res
  )

  assert.equal(res.statusCode, 200)
  assert.equal(course.category, newCategoryId)
  assert.deepEqual(categoryOperations[0], [
    { _id: newCategoryId },
    { $addToSet: { courses: courseId } },
  ])
  assert.deepEqual(categoryOperations[1], [
    { _id: oldCategoryId },
    { $pull: { courses: courseId } },
  ])
})

test("a failed course save rolls category membership back", async () => {
  categoryOperations = []
  course = freshCourse({
    save: async () => {
      throw new Error("simulated save failure")
    },
  })
  const res = response()
  await controller.editCourse(
    {
      body: { category: newCategoryId, courseId },
      user: { id: instructorId },
    },
    res
  )

  assert.equal(res.statusCode, 500)
  assert.deepEqual(categoryOperations.at(-2), [
    { _id: oldCategoryId },
    { $addToSet: { courses: courseId } },
  ])
  assert.deepEqual(categoryOperations.at(-1), [
    { _id: newCategoryId },
    { $pull: { courses: courseId } },
  ])
})

test("course edits cannot publish incomplete or zero-priced metadata", async () => {
  course = freshCourse()
  const missingName = response()
  await controller.editCourse(
    {
      body: { courseId, courseName: " ", status: "Published" },
      user: { id: instructorId },
    },
    missingName
  )
  assert.equal(missingName.statusCode, 400)

  course = freshCourse()
  const zeroPrice = response()
  await controller.editCourse(
    {
      body: { courseId, price: 0 },
      user: { id: instructorId },
    },
    zeroPrice
  )
  assert.equal(zeroPrice.statusCode, 400)
})

test("deleting a Published course atomically archives it", async () => {
  modelOperations = []
  purchaseExists = () => false
  course = freshCourse({ status: "Published" })
  const res = response()
  await controller.deleteCourse(
    {
      body: { confirmationCourseName: course.courseName, courseId },
      user: { id: instructorId },
    },
    res
  )

  assert.equal(res.statusCode, 200)
  assert.equal(res.body.archived, true)
  const archive = modelOperations.find(([name]) => name === "course-update")
  assert.equal(archive[2].$set.status, "Archived")
  assert.equal(modelOperations.some(([name]) => name === "course-delete"), false)
})

test("a previously Published Draft is archive-only", async () => {
  modelOperations = []
  purchaseExists = () => false
  course = freshCourse({ everPublishedAt: new Date("2026-01-01T00:00:00Z") })
  const res = response()
  await controller.deleteCourse(
    {
      body: { confirmationCourseName: course.courseName, courseId },
      user: { id: instructorId },
    },
    res
  )

  assert.equal(res.statusCode, 200)
  assert.equal(res.body.archived, true)
  assert.equal(modelOperations.some(([name]) => name === "course-delete"), false)
})

test("demoting a legacy Published course records its permanent lifecycle marker", async () => {
  course = freshCourse({ status: "Published" })
  const res = response()
  await controller.editCourse(
    {
      body: { courseId, status: "Draft" },
      user: { id: instructorId },
    },
    res
  )

  assert.equal(res.statusCode, 200)
  assert.equal(course.everPublishedAt instanceof Date, true)
})

test("true deletion is limited to confirmed unsold drafts and cleans dependants", async () => {
  modelOperations = []
  purchaseExists = () => false
  course = freshCourse()
  const res = response()
  await controller.deleteCourse(
    {
      body: { confirmationCourseName: course.courseName, courseId },
      user: { id: instructorId },
    },
    res
  )

  assert.equal(res.statusCode, 200)
  assert.equal(res.body.archived, false)
  for (const operation of [
    "course-delete",
    "progress-delete",
    "reviews-delete",
    "failed-purchases-delete",
    "users-cleanup",
  ]) {
    assert.equal(
      modelOperations.some(([name]) => name === operation),
      true,
      `${operation} should run`
    )
  }
})

test("course deletion requires the exact course name", async () => {
  modelOperations = []
  course = freshCourse()
  const res = response()
  await controller.deleteCourse(
    {
      body: { confirmationCourseName: "Wrong name", courseId },
      user: { id: instructorId },
    },
    res
  )

  assert.equal(res.statusCode, 400)
  assert.equal(modelOperations.length, 0)
})
