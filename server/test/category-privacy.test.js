const assert = require("node:assert/strict")
const test = require("node:test")

const firstCategoryId = "64b000000000000000000001"
const secondCategoryId = "64b000000000000000000002"

const installMock = (modulePath, exports) => {
  const filename = require.resolve(modulePath)
  require.cache[filename] = { id: filename, filename, loaded: true, exports }
}

const categoryQuery = {
  lean: async () => [
    { _id: firstCategoryId, name: "Published", description: "Visible" },
    { _id: secondCategoryId, name: "Draft only", description: "Hidden count" },
  ],
  select() {
    return this
  },
  sort() {
    return this
  },
}
installMock("../models/Category", { find: () => categoryQuery })
installMock("../models/Course", {
  aggregate: async () => [{ _id: firstCategoryId, count: 2 }],
})

delete require.cache[require.resolve("../controllers/Category")]
const controller = require("../controllers/Category")

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

test("public categories expose published counts without course IDs", async () => {
  const res = response()
  await controller.showAllCategories({}, res)

  assert.equal(res.statusCode, 200)
  assert.equal(res.body.data[0].publishedCourseCount, 2)
  assert.equal(res.body.data[1].publishedCourseCount, 0)
  assert.equal("courses" in res.body.data[0], false)
})

test("catalog course DTOs remove enrollment and reviewer identities", () => {
  const dto = controller._test.publicCourse({
    _id: "course-1",
    archivedBy: "admin-1",
    ratingAndReviews: [
      {
        _id: "review-1",
        course: "course-1",
        rating: 5,
        review: "Strong",
        user: "student-1",
      },
    ],
    studentsEnroled: ["student-1", "student-2"],
  })

  assert.equal(dto.totalStudentsEnrolled, 2)
  assert.equal("studentsEnroled" in dto, false)
  assert.equal("archivedBy" in dto, false)
  assert.equal("user" in dto.ratingAndReviews[0], false)
  assert.equal("course" in dto.ratingAndReviews[0], false)
})

test("top-selling catalog ranking is bounded inside MongoDB", () => {
  assert.deepEqual(controller._test.topSellingPipeline.at(-1), { $limit: 10 })
  assert.deepEqual(controller._test.topSellingPipeline[0], {
    $match: { status: "Published" },
  })
})
