const NeetAnswerKeyVersion = require("../models/NeetAnswerKeyVersion")
const NeetPaperVersion = require("../models/NeetPaperVersion")

// Bounded LRU over a Map. Entries are immutable documents, so they never go
// stale: paper versions never change, and key versions are cached under their
// own version number (a correction is a new number, never an edit).
const createLru = (limit) => {
  const entries = new Map()
  return {
    get(key) {
      if (!entries.has(key)) return undefined
      const value = entries.get(key)
      entries.delete(key)
      entries.set(key, value)
      return value
    },
    set(key, value) {
      entries.delete(key)
      entries.set(key, value)
      if (entries.size > limit) entries.delete(entries.keys().next().value)
    },
    clear() {
      entries.clear()
    },
  }
}

const paperCache = createLru(64)
const keyCache = createLru(128)

const findPaperVersion = async (paperVersionId) => {
  const cacheKey = String(paperVersionId)
  const cached = paperCache.get(cacheKey)
  if (cached) return cached
  const document = await NeetPaperVersion.findById(paperVersionId).lean()
  if (document) paperCache.set(cacheKey, document)
  return document
}

const latestPaperVersionNumber = async (testId) => {
  const latest = await NeetPaperVersion.findOne({ testId })
    .sort({ version: -1 })
    .select({ version: 1 })
    .lean()
  return latest?.version || 0
}

const createPaperVersion = async (document) =>
  (await NeetPaperVersion.create(document)).toObject()

// The latest key version for a paper. One small indexed read per call; the
// key list itself is served from cache once loaded.
const findLatestAnswerKey = async (paperVersionId) => {
  const head = await NeetAnswerKeyVersion.findOne({ paperVersionId })
    .sort({ version: -1 })
    .select({ version: 1 })
    .lean()
  if (!head) return null
  const cacheKey = `${paperVersionId}:${head.version}`
  const cached = keyCache.get(cacheKey)
  if (cached) return cached
  const document = await NeetAnswerKeyVersion.findById(head._id).lean()
  if (document) keyCache.set(cacheKey, document)
  return document
}

const createAnswerKeyVersion = async (document) =>
  (await NeetAnswerKeyVersion.create(document)).toObject()

const clearCaches = () => {
  paperCache.clear()
  keyCache.clear()
}

module.exports = {
  clearCaches,
  createAnswerKeyVersion,
  createLru,
  createPaperVersion,
  findLatestAnswerKey,
  findPaperVersion,
  latestPaperVersionNumber,
}
