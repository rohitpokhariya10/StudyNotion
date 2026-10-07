const NeetProctorEvent = require("../models/NeetProctorEvent")

// Idempotent insert keyed by (attemptId, clientEventId). Returns the subset of
// documents that were newly stored; retried events are reported as duplicates
// and never re-enter the policy engine.
const insertNew = async (documents) => {
  if (!documents.length) return []
  let result
  try {
    result = await NeetProctorEvent.bulkWrite(
      documents.map((document) => ({
        updateOne: {
          filter: {
            attemptId: document.attemptId,
            clientEventId: document.clientEventId,
          },
          update: { $setOnInsert: document },
          upsert: true,
        },
      })),
      { ordered: false }
    )
  } catch (error) {
    // Two concurrent retries can race on the unique upsert; the loser is a
    // duplicate. Any other bulk failure is a real error.
    const writeErrors = error?.writeErrors || []
    const onlyDuplicates =
      writeErrors.length > 0 &&
      writeErrors.every((item) => (item.code ?? item.err?.code) === 11000)
    if (!onlyDuplicates || !error.result) throw error
    result = error.result
  }
  const upserted = result?.upsertedIds || {}
  const insertedIndexes = new Set(Object.keys(upserted).map(Number))
  return documents.filter((_document, index) => insertedIndexes.has(index))
}

const listForAttempt = ({ attemptId, limit = 500 }) =>
  NeetProctorEvent.find({ attemptId })
    .select("type severity occurredAt receivedAt metadata source")
    .sort({ receivedAt: 1, _id: 1 })
    .limit(limit)
    .lean()

module.exports = { insertNew, listForAttempt }
