const NeetMockTest = require("../models/NeetMockTest")
const NeetQuestion = require("../models/NeetQuestion")

const TEST_PROJECTION =
  "_id slug title tagline description instructions difficulty status version isSample patternNote durationSeconds marking sections ordering modes availability timing proctorPolicy publishedAt displayOrder"

const listPublishedTests = () =>
  NeetMockTest.find({ status: "PUBLISHED" })
    .select(TEST_PROJECTION)
    .sort({ displayOrder: 1, publishedAt: -1, _id: 1 })
    .limit(50)
    .lean()

const findPublishedTest = (testId) =>
  NeetMockTest.findOne({ _id: testId, status: "PUBLISHED" })
    .select(TEST_PROJECTION)
    .lean()

const countActiveQuestionsBySection = async (testId) => {
  const rows = await NeetQuestion.aggregate([
    { $match: { testId, status: "ACTIVE" } },
    { $group: { _id: "$sectionKey", count: { $sum: 1 } } },
  ])
  return new Map(rows.map((row) => [row._id, row.count]))
}

// Paper construction needs ordering and marking metadata only.
const findPaperCandidates = (testId) =>
  NeetQuestion.find({ testId, status: "ACTIVE" })
    .select("_id sectionKey order revision marks")
    .lean()

// Student-safe projection. answerKey/explanation are also select:false.
const findStudentQuestions = (questionIds) =>
  NeetQuestion.find({ _id: { $in: questionIds } })
    .select("_id text options media")
    .lean()

// The only read of answer material, used exclusively by server scoring.
const findAnswerKeys = (questionIds) =>
  NeetQuestion.find({ _id: { $in: questionIds } })
    .select("_id +answerKey")
    .lean()

module.exports = {
  countActiveQuestionsBySection,
  findAnswerKeys,
  findPaperCandidates,
  findPublishedTest,
  findStudentQuestions,
  listPublishedTests,
}
