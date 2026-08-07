const assert = require("node:assert/strict")
const test = require("node:test")

const mongoose = require("mongoose")
const Category = require("../models/Category")
const Course = require("../models/Course")
const CourseProgress = require("../models/CourseProgress")
const OTP = require("../models/OTP")
const Purchase = require("../models/Purchase")
const RatingAndReview = require("../models/RatingandReview")
const User = require("../models/User")
const { updateCourseProgress } = require("../controllers/courseProgress")

const validObjectId = "64b000000000000000000001"

test("Mongoose 9 rejects numeric ObjectIds while preserving valid identifiers", () => {
  assert.equal(mongoose.version.startsWith("9."), true)
  assert.equal(mongoose.isValidObjectId(validObjectId), true)
  assert.equal(mongoose.isValidObjectId(new mongoose.Types.ObjectId()), true)
  assert.equal(mongoose.isValidObjectId(6), false)
  assert.equal(mongoose.isObjectIdOrHexString(Buffer.alloc(12)), false)
  assert.throws(() => new mongoose.Types.ObjectId(6))
})

test("numeric public course identifiers retain the generic 400 response", async () => {
  const response = {
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
  }

  await updateCourseProgress(
    {
      body: { courseId: 6, subsectionId: validObjectId },
      user: { id: validObjectId },
    },
    response
  )

  assert.equal(response.statusCode, 400)
  assert.deepEqual(response.body, {
    success: false,
    message: "A valid course and subsection are required",
  })
})

test("Mongoose 9 index declarations preserve semantics without background", () => {
  for (const model of [
    User,
    OTP,
    Category,
    Course,
    CourseProgress,
    RatingAndReview,
    Purchase,
  ]) {
    for (const [, options] of model.schema.indexes()) {
      assert.equal(Object.hasOwn(options, "background"), false)
    }
  }
})
