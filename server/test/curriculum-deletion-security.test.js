const assert = require("node:assert/strict")
const test = require("node:test")

const courseId = "64b000000000000000000001"
const sectionId = "64b000000000000000000002"
const subSectionId = "64b000000000000000000003"
const instructorId = "64b000000000000000000004"

let ownedCourse
let purchaseHistory = false
const operations = []

const installMock = (modulePath, exports) => {
  const filename = require.resolve(modulePath)
  require.cache[filename] = { id: filename, filename, loaded: true, exports }
}

const Course = {
  findById: () => {
    const query = { exec: async () => ownedCourse, populate: () => query }
    return query
  },
  findByIdAndUpdate: async () => ({}),
  findOneAndUpdate: (query, update) => {
    operations.push(["course-relation-update", query, update])
    const result = { ...ownedCourse, status: update.$set?.status || ownedCourse.status }
    const chainedQuery = {
      exec: async () => result,
      populate: () => chainedQuery,
    }
    return chainedQuery
  },
  findOne: () => ({ select: async () => ownedCourse }),
}
const Section = {
  create: async () => ({ _id: sectionId, sectionName: "New section" }),
  findById: () => ({ populate: async () => ({ _id: sectionId }) }),
  findByIdAndDelete: async () => operations.push("section-delete"),
  findByIdAndUpdate: async () => operations.push("section-update"),
  findOne: () => ({ select: async () => ({ _id: sectionId }) }),
}
const SubSection = {
  deleteMany: async () => operations.push("subsections-delete"),
  find: () => ({ select: async () => [] }),
  findById: () => ({
    select: async () => ({ _id: subSectionId, videoPublicId: undefined }),
  }),
  findByIdAndDelete: async () => operations.push("subsection-delete"),
}
const CourseProgress = {
  updateMany: async () => operations.push("progress-cleanup"),
}
const Purchase = { exists: async () => purchaseHistory }

installMock("../models/Course", Course)
installMock("../models/CourseProgress", CourseProgress)
installMock("../models/Purchase", Purchase)
installMock("../models/Section", Section)
installMock("../models/Subsection", SubSection)
installMock("../utils/courseLifecycle", {
  unpublishIfIncomplete: async () => operations.push("publish-check"),
})
installMock("../utils/imageUploader", {
  MediaUploadError: class extends Error {},
  deleteAssetFromCloudinary: async () => true,
  uploadImageToCloudinary: async () => ({}),
})

delete require.cache[require.resolve("../controllers/Section")]
delete require.cache[require.resolve("../controllers/Subsection")]
const sectionController = require("../controllers/Section")
const subSectionController = require("../controllers/Subsection")

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

test("published curriculum cannot be physically deleted during checkout", async () => {
  operations.length = 0
  purchaseHistory = false
  ownedCourse = {
    _id: courseId,
    status: "Published",
    studentsEnroled: [],
  }
  const sectionResponse = response()
  await sectionController.deleteSection(
    {
      body: { courseId, sectionId },
      user: { id: instructorId },
    },
    sectionResponse
  )
  const lessonResponse = response()
  await subSectionController.deleteSubSection(
    {
      body: { sectionId, subSectionId },
      user: { id: instructorId },
    },
    lessonResponse
  )

  assert.equal(sectionResponse.statusCode, 409)
  assert.equal(lessonResponse.statusCode, 409)
  assert.equal(operations.length, 0)
})

test("adding an empty section atomically moves a Published course to Draft", async () => {
  operations.length = 0
  ownedCourse = {
    _id: courseId,
    status: "Published",
    studentsEnroled: [],
  }
  const res = response()
  await sectionController.createSection(
    {
      body: { courseId, sectionName: "New section" },
      user: { id: instructorId },
    },
    res
  )

  assert.equal(res.statusCode, 200)
  const operation = operations.find(([name]) => name === "course-relation-update")
  assert.equal(operation[1].status.$ne, "Archived")
  assert.equal(operation[2].$set.status, "Draft")
  assert.equal(operation[2].$set.everPublishedAt instanceof Date, true)
})

test("archived courses reject section and lesson mutations", async () => {
  operations.length = 0
  ownedCourse = {
    _id: courseId,
    status: "Archived",
    studentsEnroled: [],
  }

  const createSectionResponse = response()
  await sectionController.createSection(
    {
      body: { courseId, sectionName: "Blocked section" },
      user: { id: instructorId },
    },
    createSectionResponse
  )
  const updateSectionResponse = response()
  await sectionController.updateSection(
    {
      body: { courseId, sectionId, sectionName: "Blocked rename" },
      user: { id: instructorId },
    },
    updateSectionResponse
  )
  const createLessonResponse = response()
  await subSectionController.createSubSection(
    {
      body: {
        sectionId,
        title: "Blocked lesson",
        description: "Archived content cannot change",
      },
      files: { video: { name: "lesson.mp4" } },
      user: { id: instructorId },
    },
    createLessonResponse
  )
  const updateLessonResponse = response()
  await subSectionController.updateSubSection(
    {
      body: { sectionId, subSectionId, title: "Blocked rename" },
      user: { id: instructorId },
    },
    updateLessonResponse
  )

  assert.deepEqual(
    [
      createSectionResponse.statusCode,
      updateSectionResponse.statusCode,
      createLessonResponse.statusCode,
      updateLessonResponse.statusCode,
    ],
    [409, 409, 409, 409]
  )
  assert.equal(operations.length, 0)
})

test("paid curriculum stays immutable even after it is moved to Draft", async () => {
  operations.length = 0
  purchaseHistory = true
  ownedCourse = { _id: courseId, status: "Draft", studentsEnroled: [] }
  const res = response()
  await subSectionController.deleteSubSection(
    {
      body: { sectionId, subSectionId },
      user: { id: instructorId },
    },
    res
  )

  assert.equal(res.statusCode, 409)
  assert.equal(operations.length, 0)
})

test("previously Published Draft curriculum cannot be destructively removed", async () => {
  operations.length = 0
  purchaseHistory = false
  ownedCourse = {
    _id: courseId,
    everPublishedAt: new Date("2026-01-01T00:00:00Z"),
    status: "Draft",
    studentsEnroled: [],
  }
  const res = response()
  await subSectionController.deleteSubSection(
    {
      body: { sectionId, subSectionId },
      user: { id: instructorId },
    },
    res
  )

  assert.equal(res.statusCode, 409)
  assert.equal(operations.length, 0)
})

test("unsold draft lesson deletion removes stale progress references", async () => {
  operations.length = 0
  purchaseHistory = false
  ownedCourse = { _id: courseId, status: "Draft", studentsEnroled: [] }
  const res = response()
  await subSectionController.deleteSubSection(
    {
      body: { sectionId, subSectionId },
      user: { id: instructorId },
    },
    res
  )

  assert.equal(res.statusCode, 200)
  assert.equal(operations.includes("subsection-delete"), true)
  assert.equal(operations.includes("progress-cleanup"), true)
  assert.equal(operations.includes("publish-check"), true)
})
