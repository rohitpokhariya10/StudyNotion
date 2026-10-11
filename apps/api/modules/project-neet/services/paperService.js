const { neetErrors } = require("../domain/errors")
const {
  applyKeyCorrections,
  buildPaperVersionContent,
  keysDigest,
} = require("../domain/paperVersion")
const { keysToMap, scoreAttempt } = require("../domain/scoring")

const DUPLICATE_KEY = 11000
const CREATE_ROUNDS = 3
const MAX_RESULT_HISTORY = 5

const historyEntry = (result, supersededAt) => ({
  answerKeyVersion: result?.answerKeyVersion ?? null,
  scoringVersion: result?.scoringVersion,
  scoredAt: result?.scoredAt,
  supersededAt,
  score: result?.summary?.score,
  maxScore: result?.summary?.maxScore,
  correct: result?.summary?.correct,
  incorrect: result?.summary?.incorrect,
  unanswered: result?.summary?.unanswered,
  dropped: result?.summary?.dropped || 0,
})

// Publishing, answer-key correction and rescoring. Operator-facing only: no
// student route reaches this service.
const createPaperService = ({ attempts, clock, logger, papers, tests }) => {
  const createKeyVersion = async ({
    createdBy,
    keys,
    paperVersionId,
    reason,
  }) => {
    for (let round = 0; round < CREATE_ROUNDS; round += 1) {
      const latest = await papers.findLatestAnswerKey(paperVersionId)
      try {
        return await papers.createAnswerKeyVersion({
          paperVersionId,
          version: (latest?.version || 0) + 1,
          keys,
          reason,
          createdBy,
          createdAt: clock(),
        })
      } catch (error) {
        if (error?.code !== DUPLICATE_KEY) throw error
      }
    }
    throw neetErrors.conflict()
  }

  // Idempotent: republishing unchanged content returns the current version.
  // Changed content creates the next paper version plus answer-key v1 and
  // moves the test's pointer with a compare-and-set. Attempts already started
  // keep the version they pinned.
  const publishCurrentPaper = async ({ publishedBy = "system", testId }) => {
    const test = await tests.findTestById(testId)
    if (!test) throw neetErrors.testNotFound()
    const content = buildPaperVersionContent({
      questions: await tests.findPublishableQuestions(test._id),
      test,
    })

    if (test.currentPaperVersionId) {
      const current = await papers.findPaperVersion(test.currentPaperVersionId)
      if (current?.contentHash === content.contentHash) {
        const latestKey = await papers.findLatestAnswerKey(current._id)
        if (
          latestKey &&
          keysDigest(latestKey.keys) === keysDigest(content.keys)
        ) {
          return { paperVersion: current, answerKey: latestKey, created: false }
        }
        const answerKey = await createKeyVersion({
          createdBy: publishedBy,
          keys: content.keys,
          paperVersionId: current._id,
          reason: "Answer key updated from the question bank",
        })
        logger.info("neet.paper.answer_key_updated", {
          paperVersionId: String(current._id),
          answerKeyVersion: answerKey.version,
        })
        return { paperVersion: current, answerKey, created: false }
      }
    }

    for (let round = 0; round < CREATE_ROUNDS; round += 1) {
      let paperVersion
      try {
        paperVersion = await papers.createPaperVersion({
          testId: test._id,
          version: (await papers.latestPaperVersionNumber(test._id)) + 1,
          durationSeconds: content.durationSeconds,
          sections: content.sections,
          questions: content.questions,
          contentHash: content.contentHash,
          publishedAt: clock(),
          publishedBy,
        })
      } catch (error) {
        if (error?.code === DUPLICATE_KEY) continue
        throw error
      }
      const answerKey = await createKeyVersion({
        createdBy: publishedBy,
        keys: content.keys,
        paperVersionId: paperVersion._id,
        reason: "Initial answer key",
      })
      const swapped = await tests.setCurrentPaperVersion({
        expected: test.currentPaperVersionId,
        paperVersionId: paperVersion._id,
        testId: test._id,
      })
      if (!swapped) throw neetErrors.conflict()
      logger.info("neet.paper.published", {
        testId: String(test._id),
        paperVersionId: String(paperVersion._id),
        version: paperVersion.version,
      })
      return { paperVersion, answerKey, created: true }
    }
    throw neetErrors.conflict()
  }

  // Creates the next answer-key version from operator corrections, such as a
  // final key that drops a question or accepts several options.
  const correctAnswerKey = async ({
    changes,
    createdBy = "operator",
    paperVersionId,
    reason,
  }) => {
    if (!reason || String(reason).trim().length < 5) {
      throw new TypeError(
        "A correction reason of at least 5 characters is required"
      )
    }
    const paperVersion = await papers.findPaperVersion(paperVersionId)
    if (!paperVersion) throw neetErrors.testNotFound()
    const latest = await papers.findLatestAnswerKey(paperVersionId)
    if (!latest) throw neetErrors.testNotReady()
    const keys = applyKeyCorrections({
      changes,
      keys: latest.keys,
      paperVersion,
    })
    if (keysDigest(keys) === keysDigest(latest.keys)) {
      return { answerKey: latest, created: false }
    }
    const answerKey = await createKeyVersion({
      createdBy,
      keys,
      paperVersionId,
      reason: String(reason).trim(),
    })
    logger.info("neet.paper.answer_key_corrected", {
      paperVersionId: String(paperVersionId),
      answerKeyVersion: answerKey.version,
    })
    return { answerKey, created: true }
  }

  // Re-scores every scored attempt on a paper whose result predates the
  // latest key version. Each update is a compare-and-set on the result's key
  // version, so concurrent or repeated runs rescore each attempt once.
  const rescorePaper = async ({ batchSize = 100, paperVersionId }) => {
    const latest = await papers.findLatestAnswerKey(paperVersionId)
    if (!latest) throw neetErrors.testNotReady()
    const answerKeys = keysToMap(latest.keys)
    const seen = new Set()
    let rescored = 0
    for (;;) {
      const rows = (
        await attempts.findScoredBelowKeyVersion({
          answerKeyVersion: latest.version,
          limit: batchSize,
          paperVersionId,
        })
      ).filter((row) => !seen.has(String(row._id)))
      if (!rows.length) break
      for (const row of rows) {
        seen.add(String(row._id))
        const now = clock()
        const scored = scoreAttempt({
          answerKeyVersion: latest.version,
          answerKeys,
          endedAt: row.endedAt,
          paper: row.paper,
          responses: row.responses,
          startedAt: row.startedAt,
        })
        const updated = await attempts.casUpdate({
          filter: {
            _id: row._id,
            status: row.status,
            "result.answerKeyVersion": row.result?.answerKeyVersion ?? null,
          },
          update: {
            $set: { result: { ...scored, scoredAt: now } },
            $push: {
              resultHistory: {
                $each: [historyEntry(row.result, now)],
                $slice: -MAX_RESULT_HISTORY,
              },
            },
          },
          projection: { _id: 1 },
        })
        if (updated) rescored += 1
      }
    }
    const pendingFinalization = await attempts.countByPaperVersion({
      paperVersionId,
      status: "SUBMITTING",
    })
    logger.info("neet.paper.rescored", {
      paperVersionId: String(paperVersionId),
      answerKeyVersion: latest.version,
      rescored,
      pendingFinalization,
    })
    return { answerKeyVersion: latest.version, rescored, pendingFinalization }
  }

  return { correctAnswerKey, publishCurrentPaper, rescorePaper }
}

module.exports = { createPaperService }
