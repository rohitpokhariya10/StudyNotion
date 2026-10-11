const {
  ATTEMPT_STATUS,
  PRE_START_STATUSES,
  SUBMISSION_REASON,
  finalStatusForReason,
} = require("../domain/attemptStateMachine")
const { neetErrors } = require("../domain/errors")
const {
  NeetScoringDataError,
  keysToMap,
  scoreAttempt,
} = require("../domain/scoring")

const FINALIZE_ATTEMPTS = 3

const earliest = (...dates) =>
  new Date(
    Math.min(...dates.filter(Boolean).map((date) => new Date(date).getTime()))
  )

// Shared lifecycle operations. Finalization is a two-step state machine:
//   IN_PROGRESS --CAS--> SUBMITTING   (answers are frozen: every write
//                                      requires IN_PROGRESS)
//   SUBMITTING  --CAS--> SUBMITTED | AUTO_SUBMITTED (result written once)
// Any reader that finds SUBMITTING completes the second step, so a crash
// between the two steps is recovered by the next request.
const createLifecycle = ({ attempts, clock, logger, papers, tests }) => {
  // Versioned attempts score against the latest answer-key version of their
  // pinned paper (so a published correction applies to everyone). Legacy
  // attempts started before paper versions existed read live keys.
  const answerKeysFor = async (attempt) => {
    if (attempt.paperVersionId) {
      const key = await papers.findLatestAnswerKey(attempt.paperVersionId)
      if (!key) return { answerKeys: new Map(), answerKeyVersion: null }
      return { answerKeys: keysToMap(key.keys), answerKeyVersion: key.version }
    }
    const questionIds = attempt.paper.questions.map((entry) => entry.questionId)
    const keyDocuments = await tests.findAnswerKeys(questionIds)
    return {
      answerKeys: new Map(
        keyDocuments.map((document) => [
          String(document._id),
          document.answerKey,
        ])
      ),
      answerKeyVersion: null,
    }
  }

  const finalize = async (attemptId) => {
    for (let round = 0; round < FINALIZE_ATTEMPTS; round += 1) {
      const attempt = await attempts.findById({
        attemptId,
        projection: attempts.FINALIZE_PROJECTION,
      })
      if (!attempt) throw neetErrors.attemptNotFound()
      if (attempt.status !== ATTEMPT_STATUS.SUBMITTING) {
        return attempts.findById({ attemptId })
      }

      const { answerKeys, answerKeyVersion } = await answerKeysFor(attempt)
      const now = clock()
      const endedAt = earliest(
        attempt.submissionRequestedAt || now,
        attempt.expiresAt || now
      )

      let scored
      try {
        scored = scoreAttempt({
          answerKeyVersion,
          answerKeys,
          endedAt,
          paper: attempt.paper,
          responses: attempt.responses,
          startedAt: attempt.startedAt,
        })
      } catch (error) {
        if (error instanceof NeetScoringDataError) {
          logger.error("neet.attempt.finalization_failed", {
            attemptId: String(attemptId),
            reason: error.message,
          })
          throw neetErrors.submissionPending()
        }
        throw error
      }

      const set = {
        status: finalStatusForReason(attempt.submissionReason),
        submittedAt: now,
        endedAt,
        activeSessionId: null,
        result: { ...scored, scoredAt: now },
      }
      if (attempt.proctoring) {
        set["proctoring.status"] = "ENDED"
        set["proctoring.endedAt"] = now
      }
      const finalized = await attempts.casUpdate({
        filter: { _id: attemptId, status: ATTEMPT_STATUS.SUBMITTING },
        update: { $set: set, $unset: { isOpen: "" } },
      })
      if (finalized) {
        logger.info("neet.attempt.submitted", {
          attemptId: String(attemptId),
          reason: attempt.submissionReason,
          status: finalized.status,
          durationUsedSeconds: scored.summary.durationUsedSeconds,
        })
        return finalized
      }
    }
    return attempts.findById({ attemptId })
  }

  // IN_PROGRESS -> SUBMITTING. Returns the moved attempt or null when the
  // predicate no longer holds (someone else moved it first).
  const beginSubmission = ({
    attemptId,
    extraFilter = {},
    reason,
    requestedAt,
  }) =>
    attempts.casUpdate({
      filter: {
        _id: attemptId,
        status: ATTEMPT_STATUS.IN_PROGRESS,
        ...extraFilter,
      },
      update: {
        $set: {
          status: ATTEMPT_STATUS.SUBMITTING,
          submissionReason: reason,
          submissionRequestedAt: requestedAt,
        },
      },
    })

  // Applies time-based transitions lazily on read so correctness never depends
  // on a background worker: abandoned registrations expire, timed-out exams
  // are submitted with the answers frozen at the cutoff, and interrupted
  // finalizations are completed.
  const ensureFresh = async (attempt) => {
    if (!attempt) return attempt
    const now = clock()

    if (
      PRE_START_STATUSES.includes(attempt.status) &&
      attempt.registrationExpiresAt &&
      now >= new Date(attempt.registrationExpiresAt)
    ) {
      const expired = await attempts.casUpdate({
        filter: { _id: attempt._id, status: { $in: PRE_START_STATUSES } },
        update: {
          $set: { status: ATTEMPT_STATUS.EXPIRED },
          $unset: { isOpen: "" },
        },
      })
      if (expired) {
        logger.info("neet.attempt.registration_expired", {
          attemptId: String(attempt._id),
        })
        return expired
      }
      return attempts.findById({ attemptId: attempt._id })
    }

    if (
      attempt.status === ATTEMPT_STATUS.IN_PROGRESS &&
      attempt.expiresAt &&
      now >= new Date(attempt.expiresAt)
    ) {
      const moved = await beginSubmission({
        attemptId: attempt._id,
        reason: SUBMISSION_REASON.TIME_EXPIRED,
        requestedAt: attempt.expiresAt,
      })
      if (moved) {
        logger.info("neet.attempt.timer_expired", {
          attemptId: String(attempt._id),
        })
      }
      return finalize(attempt._id)
    }

    if (attempt.status === ATTEMPT_STATUS.SUBMITTING) {
      logger.info("neet.attempt.finalization_resumed", {
        attemptId: String(attempt._id),
      })
      return finalize(attempt._id)
    }

    return attempt
  }

  // Finalises abandoned attempts nobody reads: open attempts more than
  // `graceMs` past their deadline, or stuck mid-finalisation. Safe to run on
  // every replica at once; each transition is the same compare-and-set as
  // the request path, so an attempt is finalised exactly once.
  const sweep = async ({ graceMs = 30_000, limit = 100 } = {}) => {
    const rows = await attempts.findStaleOpen({
      expiredBefore: new Date(clock().getTime() - graceMs),
      limit,
    })
    let finalized = 0
    let failed = 0
    for (const row of rows) {
      try {
        const fresh = await ensureFresh(
          await attempts.findById({ attemptId: row._id })
        )
        if (fresh && fresh.status !== row.status) finalized += 1
      } catch (error) {
        failed += 1
        logger.warn("neet.sweep.attempt_failed", {
          attemptId: String(row._id),
          errorType: String(error?.name || "Error"),
        })
      }
    }
    if (rows.length) {
      logger.info("neet.sweep.completed", {
        scanned: rows.length,
        finalized,
        failed,
      })
    }
    return { scanned: rows.length, finalized, failed }
  }

  return { beginSubmission, ensureFresh, finalize, sweep }
}

module.exports = { createLifecycle }
