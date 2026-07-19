const assert = require("node:assert/strict")
const test = require("node:test")

const installMock = (modulePath, exports) => {
  const filename = require.resolve(modulePath)
  require.cache[filename] = { id: filename, filename, loaded: true, exports }
}

const review = {
  _id: "review-private-id",
  course: { _id: "course-private-id", courseName: "Public course" },
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  rating: 5,
  review: "Excellent",
  user: {
    _id: "learner-private-id",
    firstName: "Asha",
    image: "https://cdn.example.test/avatar.png",
    lastName: "Student",
  },
}

const query = {
  exec: async () => [review],
  limit: () => query,
  populate: () => query,
  sort: () => query,
}

installMock("../models/Course", {})
installMock("../models/RatingandReview", { find: () => query })
delete require.cache[require.resolve("../controllers/RatingandReview")]
const { getAllRatingReview } = require("../controllers/RatingandReview")

test("public review feed omits stable reviewer, review, and course IDs", async () => {
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

  await getAllRatingReview({ query: {} }, response)

  assert.equal(response.statusCode, 200)
  assert.equal(response.body.data[0].user._id, undefined)
  assert.equal(response.body.data[0].course._id, undefined)
  assert.equal(response.body.data[0]._id, undefined)
  assert.equal(response.body.data[0].user.firstName, "Asha")
})
