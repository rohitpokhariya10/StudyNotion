const NeetAttempt = require("../models/NeetAttempt")

// Attempt state without the heavy paper/response/result arrays.
const STATE_PROJECTION = Object.freeze({
  paper: 0,
  responses: 0,
  "result.questions": 0,
  "proctoring.counters": 0,
  "proctoring.warnings": 0,
})

const RESULT_PROJECTION = Object.freeze({
  paper: 0,
  responses: 0,
  "result.questions": 0,
  "proctoring.counters": 0,
})

const SESSION_PROJECTION = Object.freeze({
  "result.questions": 0,
  "proctoring.counters": 0,
  "proctoring.warnings": 0,
})

const FINALIZE_PROJECTION = Object.freeze({
  _id: 1,
  userId: 1,
  status: 1,
  mode: 1,
  paperVersionId: 1,
  paper: 1,
  responses: 1,
  startedAt: 1,
  expiresAt: 1,
  submissionReason: 1,
  submissionRequestedAt: 1,
  "proctoring.status": 1,
})

const PROCTOR_PROJECTION = Object.freeze({
  _id: 1,
  userId: 1,
  status: 1,
  mode: 1,
  startedAt: 1,
  expiresAt: 1,
  writesCloseAt: 1,
  activeSessionId: 1,
  registrationExpiresAt: 1,
  isOpen: 1,
  proctoring: 1,
  review: 1,
})

const LIST_PROJECTION = Object.freeze({
  _id: 1,
  testId: 1,
  attemptNumber: 1,
  status: 1,
  mode: 1,
  isOpen: 1,
  createdAt: 1,
  startedAt: 1,
  expiresAt: 1,
  writesCloseAt: 1,
  registrationExpiresAt: 1,
  submittedAt: 1,
  "testSnapshot.title": 1,
  "result.summary.score": 1,
  "result.summary.maxScore": 1,
})

const findOwned = ({ attemptId, projection = STATE_PROJECTION, userId }) =>
  NeetAttempt.findOne({ _id: attemptId, userId }).select(projection).lean()

const findById = ({ attemptId, projection = STATE_PROJECTION }) =>
  NeetAttempt.findById(attemptId).select(projection).lean()

const findOpen = ({ testId, userId }) =>
  NeetAttempt.findOne({ userId, testId, isOpen: true })
    .select(STATE_PROJECTION)
    .lean()

const countForTest = ({ testId, userId }) =>
  NeetAttempt.countDocuments({ userId, testId })

const listRecent = ({ limit = 20, testId, userId }) =>
  NeetAttempt.find({ userId, ...(testId ? { testId } : {}) })
    .select(LIST_PROJECTION)
    .sort({ createdAt: -1, _id: -1 })
    .limit(limit)
    .lean()

// Open attempts past their deadline (or stuck mid-finalisation) that nobody
// has read since. Served by the neet_attempt_sweep partial index.
const findStaleOpen = ({ expiredBefore, limit }) =>
  NeetAttempt.find({
    isOpen: true,
    $or: [
      { status: "IN_PROGRESS", expiresAt: { $lt: expiredBefore } },
      { status: "SUBMITTING", expiresAt: { $lt: expiredBefore } },
    ],
  })
    .select({ _id: 1, status: 1, expiresAt: 1, registrationExpiresAt: 1 })
    .limit(limit)
    .lean()

// Scored attempts on a paper whose result predates `answerKeyVersion`.
const findScoredBelowKeyVersion = ({
  answerKeyVersion,
  limit,
  paperVersionId,
}) =>
  NeetAttempt.find({
    paperVersionId,
    status: { $in: ["SUBMITTED", "AUTO_SUBMITTED"] },
    $or: [
      { "result.answerKeyVersion": { $lt: answerKeyVersion } },
      { "result.answerKeyVersion": null },
    ],
  })
    .select({ ...FINALIZE_PROJECTION, result: 1, endedAt: 1 })
    .limit(limit)
    .lean()

const countByPaperVersion = ({ paperVersionId, status }) =>
  NeetAttempt.countDocuments({ paperVersionId, status })

const create = async (document) => {
  const created = await NeetAttempt.create(document)
  return findById({ attemptId: created._id })
}

// Atomic compare-and-set. `filter` carries the state predicate; a null result
// means another request changed the attempt first.
const casUpdate = ({
  arrayFilters,
  filter,
  projection = STATE_PROJECTION,
  update,
}) =>
  NeetAttempt.findOneAndUpdate(filter, update, {
    ...(arrayFilters ? { arrayFilters } : {}),
    projection,
    returnDocument: "after",
  }).lean()

module.exports = {
  FINALIZE_PROJECTION,
  LIST_PROJECTION,
  PROCTOR_PROJECTION,
  RESULT_PROJECTION,
  SESSION_PROJECTION,
  STATE_PROJECTION,
  casUpdate,
  countByPaperVersion,
  countForTest,
  create,
  findScoredBelowKeyVersion,
  findStaleOpen,
  findById,
  findOpen,
  findOwned,
  listRecent,
}
