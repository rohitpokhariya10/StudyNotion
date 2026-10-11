const NeetMockTest = require("../models/NeetMockTest")
const NeetQuestion = require("../models/NeetQuestion")

const TEST_PROJECTION =
  "_id slug title tagline description instructions difficulty status version isSample patternNote durationSeconds marking sections ordering modes availability timing proctorPolicy publishedAt displayOrder currentPaperVersionId"

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

// Bank questions with content and keys, used only to publish a paper version.
const findPublishableQuestions = (testId) =>
  NeetQuestion.find({ testId, status: "ACTIVE" })
    .select("_id sectionKey order revision marks text options media +answerKey")
    .lean()

const findTestById = (testId) =>
  NeetMockTest.findById(testId).select(TEST_PROJECTION).lean()

// Compare-and-set of the test's current paper version.
const setCurrentPaperVersion = ({ expected, paperVersionId, testId }) =>
  NeetMockTest.findOneAndUpdate(
    { _id: testId, currentPaperVersionId: expected ?? null },
    { $set: { currentPaperVersionId: paperVersionId } },
    {
      returnDocument: "after",
      projection: { _id: 1, currentPaperVersionId: 1 },
    }
  ).lean()

// Legacy read of live answer keys, used only to finish attempts started
// before paper versions existed.
const findAnswerKeys = (questionIds) =>
  NeetQuestion.find({ _id: { $in: questionIds } })
    .select("_id +answerKey")
    .lean()

module.exports = {
  countActiveQuestionsBySection,
  findAnswerKeys,
  findPaperCandidates,
  findPublishableQuestions,
  findPublishedTest,
  findStudentQuestions,
  findTestById,
  listPublishedTests,
  setCurrentPaperVersion,
}
