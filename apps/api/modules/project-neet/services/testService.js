const { neetErrors } = require("../domain/errors")
const { toTestDetail, toTestSummary } = require("./dto")

const createTestService = ({ clock, tests }) => ({
  async listTests() {
    const now = clock()
    const documents = await tests.listPublishedTests()
    return { tests: documents.map((test) => toTestSummary(test, now)) }
  },

  async getTest({ testId }) {
    const test = await tests.findPublishedTest(testId)
    if (!test) throw neetErrors.testNotFound()
    return toTestDetail(test, clock())
  },
})

module.exports = { createTestService }
