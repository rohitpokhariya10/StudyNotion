const assert = require("node:assert/strict")
const test = require("node:test")

const installMock = (modulePath, exports) => {
  const filename = require.resolve(modulePath)
  require.cache[filename] = { id: filename, filename, loaded: true, exports }
}

installMock("../models/Course", {})
installMock("../models/RatingandReview", {})
delete require.cache[require.resolve("../controllers/RatingandReview")]
const { getAverageRating } = require("../controllers/RatingandReview")

test("rating GET without a query or body courseId returns 400", async () => {
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

  await getAverageRating({ query: {} }, response)

  assert.equal(response.statusCode, 400)
  assert.equal(response.body.success, false)
})
