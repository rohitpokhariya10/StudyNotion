const assert = require("node:assert/strict")
const test = require("node:test")

const courseId = "64b000000000000000000001"
const sectionId = "64b000000000000000000002"
const lessonId = "64b000000000000000000003"
const userId = "64b000000000000000000004"

let enrolled = true
let lessonBelongs = true
let completedVideos = []
let updateCalls = []

const installMock = (modulePath, exports) => {
  const filename = require.resolve(modulePath)
  require.cache[filename] = { id: filename, filename, loaded: true, exports }
}

const Course = {
  findOne(filter) {
    return {
      select(selection) {
        return {
          async lean() {
            assert.deepEqual(filter, {
              _id: courseId,
              studentsEnroled: userId,
            })
            assert.equal(selection, "courseContent")
            return enrolled
              ? { _id: courseId, courseContent: [sectionId] }
              : null
          },
        }
      },
    }
  },
}

const Section = {
  async exists(filter) {
    assert.deepEqual(filter, {
      _id: { $in: [sectionId] },
      subSection: lessonId,
    })
    return lessonBelongs
  },
}

const CourseProgress = {
  async findOneAndUpdate(filter, update, options) {
    updateCalls.push({ filter, options, update })
    if (!completedVideos.includes(lessonId)) completedVideos.push(lessonId)
    return {
      courseID: courseId,
      userId,
      completedVideos: [...completedVideos],
    }
  },
}

installMock("../models/Course", Course)
installMock("../models/CourseProgress", CourseProgress)
installMock("../models/Section", Section)

delete require.cache[require.resolve("../controllers/courseProgress")]
const { updateCourseProgress } = require("../controllers/courseProgress")

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

const createRequest = (overrides = {}) => ({
  body: { courseId, subsectionId: lessonId },
  user: { id: userId },
  ...overrides,
})

test.beforeEach(() => {
  enrolled = true
  lessonBelongs = true
  completedVideos = []
  updateCalls = []
})

test("v1 progress retains its response and idempotent add-to-set behavior", async () => {
  const first = createResponse()
  await updateCourseProgress(createRequest(), first)

  assert.equal(first.statusCode, 200)
  assert.deepEqual(first.body, {
    success: true,
    message: "Course progress updated",
    data: {
      courseID: courseId,
      userId,
      completedVideos: [lessonId],
    },
  })

  const repeated = createResponse()
  await updateCourseProgress(createRequest(), repeated)

  assert.equal(repeated.statusCode, 200)
  assert.deepEqual(repeated.body.data.completedVideos, [lessonId])
  assert.equal(updateCalls.length, 2)
  assert.deepEqual(updateCalls[0], {
    filter: { courseID: courseId, userId },
    update: { $addToSet: { completedVideos: lessonId } },
    options: {
      returnDocument: "after",
      upsert: true,
      setDefaultsOnInsert: true,
    },
  })
})

test("v1 progress rejects a non-enrolled learner before writing", async () => {
  enrolled = false
  const response = createResponse()

  await updateCourseProgress(createRequest(), response)

  assert.equal(response.statusCode, 403)
  assert.deepEqual(response.body, {
    success: false,
    message: "You are not enrolled in this course",
  })
  assert.equal(updateCalls.length, 0)
})

test("v1 progress rejects a lesson outside the enrolled course before writing", async () => {
  lessonBelongs = false
  const response = createResponse()

  await updateCourseProgress(createRequest(), response)

  assert.equal(response.statusCode, 404)
  assert.deepEqual(response.body, {
    success: false,
    message: "Subsection does not belong to this course",
  })
  assert.equal(updateCalls.length, 0)
})
