const mongoose = require("mongoose")

const {
  NEET_SESSION_LIVENESS_SECONDS,
  NEET_TIMING_DEFAULTS,
} = require("../config/defaults")
const {
  ATTEMPT_STATUS,
  PRE_START_STATUSES,
  SUBMISSION_REASON,
  isPreStartStatus,
  isScoredStatus,
} = require("../domain/attemptStateMachine")
const { neetErrors } = require("../domain/errors")
const {
  NeetTestConfigurationError,
  availabilityFor,
  buildPaperFromVersion,
  computeTestTotals,
  initialResponses,
  paperTotals,
} = require("../domain/paper")
const { resolveProctorPolicy } = require("../domain/proctorPolicy")
const {
  normalizeCandidate,
  toAttempt,
  toAttemptListItem,
  toExamSession,
  toResponseState,
  toResult,
} = require("./dto")

const HOUR_MS = 60 * 60 * 1000
const SUBMIT_ROUNDS = 4
const REQUIRED_DEVICE_CHECKS = Object.freeze({
  camera: "camera",
  microphone: "microphone",
  fullscreen: "fullscreen",
  screenShare: "screenShare",
})

const timingFor = (test) => ({
  networkGraceSeconds:
    test.timing?.networkGraceSeconds ??
    NEET_TIMING_DEFAULTS.networkGraceSeconds,
  registrationWindowHours:
    test.timing?.registrationWindowHours ??
    NEET_TIMING_DEFAULTS.registrationWindowHours,
})

const createAttemptService = ({
  attempts,
  clock,
  lifecycle,
  logger,
  papers,
  proctor,
  tests,
}) => {
  const closedError = (status) => {
    if (status === ATTEMPT_STATUS.EXPIRED) return neetErrors.attemptExpired()
    if (isPreStartStatus(status)) return neetErrors.attemptNotStarted()
    return neetErrors.attemptSubmitted()
  }

  const loadOwnedFresh = async ({ attemptId, userId }) => {
    const attempt = await attempts.findOwned({ attemptId, userId })
    if (!attempt) throw neetErrors.attemptNotFound()
    return lifecycle.ensureFresh(attempt)
  }

  const loadPublishedOpenTest = async (testId) => {
    const test = await tests.findPublishedTest(testId)
    if (!test) throw neetErrors.testNotFound()
    if (availabilityFor(test, clock()).state !== "OPEN") {
      throw neetErrors.testUnavailable()
    }
    return test
  }

  // New attempts need a published, immutable paper version.
  const loadCurrentPaperVersion = async (test) => {
    const paperVersion = test.currentPaperVersionId
      ? await papers.findPaperVersion(test.currentPaperVersionId)
      : null
    if (!paperVersion) {
      logger.error("neet.test.misconfigured", {
        testId: String(test._id),
        reason: "no_published_paper_version",
      })
      throw neetErrors.testNotReady()
    }
    return paperVersion
  }

  // Content comes from the pinned paper version, never the live bank, so an
  // edit after start cannot change what the student sees on resume.
  const sessionQuestions = async (attempt) => {
    if (attempt.paperVersionId) {
      const paperVersion = await papers.findPaperVersion(attempt.paperVersionId)
      if (!paperVersion) throw new Error("A pinned paper version is missing")
      return paperVersion.questions.map((question) => ({
        _id: question.questionId,
        text: question.text,
        options: question.options,
        media: question.media,
      }))
    }
    // Legacy attempt started before paper versions existed.
    return tests.findStudentQuestions(
      attempt.paper.questions.map((entry) => entry.questionId)
    )
  }

  const buildSession = async ({ attempt, sessionId }) => {
    const questions = await sessionQuestions(attempt)
    return toExamSession({
      attempt,
      heartbeatIntervalSeconds: NEET_TIMING_DEFAULTS.heartbeatIntervalSeconds,
      now: clock(),
      questions,
      sessionId,
    })
  }

  const register = async ({ candidate, testId, userId }) => {
    const test = await loadPublishedOpenTest(testId)
    await loadCurrentPaperVersion(test)
    const normalizedCandidate = normalizeCandidate(candidate)

    const existing = await lifecycle.ensureFresh(
      await attempts.findOpen({ testId: test._id, userId })
    )
    if (existing?.isOpen) {
      if (isPreStartStatus(existing.status)) {
        const updated = await attempts.casUpdate({
          filter: {
            _id: existing._id,
            userId,
            status: { $in: PRE_START_STATUSES },
          },
          update: { $set: { candidate: normalizedCandidate } },
        })
        return {
          attempt: toAttempt(updated || existing, clock()),
          created: false,
        }
      }
      return { attempt: toAttempt(existing, clock()), created: false }
    }

    const now = clock()
    const totals = computeTestTotals(test)
    const { registrationWindowHours } = timingFor(test)
    const attemptNumber =
      (await attempts.countForTest({ testId: test._id, userId })) + 1
    try {
      const created = await attempts.create({
        userId,
        testId: test._id,
        attemptNumber,
        isOpen: true,
        status: ATTEMPT_STATUS.REGISTERED,
        mode: null,
        candidate: normalizedCandidate,
        testSnapshot: {
          title: test.title,
          version: test.version || 1,
          durationSeconds: test.durationSeconds,
          questionCount: totals.questionCount,
          totalMarks: totals.totalMarks,
          isSample: test.isSample === true,
        },
        registrationExpiresAt: new Date(
          now.getTime() + registrationWindowHours * HOUR_MS
        ),
      })
      logger.info("neet.attempt.created", {
        attemptId: String(created._id),
        testId: String(test._id),
      })
      return { attempt: toAttempt(created, clock()), created: true }
    } catch (error) {
      // A concurrent registration won the one-open-attempt unique index.
      if (error?.code !== 11000) throw error
      const winner = await attempts.findOpen({ testId: test._id, userId })
      if (!winner) throw neetErrors.conflict()
      return { attempt: toAttempt(winner, clock()), created: false }
    }
  }

  const getAttempt = async ({ attemptId, userId }) =>
    toAttempt(await loadOwnedFresh({ attemptId, userId }), clock())

  const listAttempts = async ({ testId, userId }) => {
    const rows = await attempts.listRecent({ limit: 20, testId, userId })
    const refreshed = []
    for (const row of rows) {
      const needsRefresh =
        row.isOpen &&
        ((isPreStartStatus(row.status) &&
          clock() >= new Date(row.registrationExpiresAt)) ||
          (row.status === ATTEMPT_STATUS.IN_PROGRESS &&
            row.expiresAt &&
            clock() >= new Date(row.expiresAt)) ||
          row.status === ATTEMPT_STATUS.SUBMITTING)
      if (!needsRefresh) {
        refreshed.push(row)
        continue
      }
      await lifecycle.ensureFresh(
        await attempts.findById({ attemptId: row._id })
      )
      refreshed.push(
        await attempts.findById({
          attemptId: row._id,
          projection: attempts.LIST_PROJECTION,
        })
      )
    }
    return { attempts: refreshed.filter(Boolean).map(toAttemptListItem) }
  }

  const update = async ({ attemptId, candidate, mode, userId }) => {
    const attempt = await loadOwnedFresh({ attemptId, userId })
    if (!isPreStartStatus(attempt.status)) {
      if (attempt.status === ATTEMPT_STATUS.EXPIRED)
        throw neetErrors.attemptExpired()
      throw neetErrors.attemptLocked()
    }

    const set = {}
    const unset = {}
    if (candidate) set.candidate = normalizeCandidate(candidate)
    if (mode && mode !== attempt.mode) {
      const test = await tests.findPublishedTest(attempt.testId)
      if (!test) throw neetErrors.testNotFound()
      if (!test.modes.includes(mode)) throw neetErrors.modeUnavailable()
      // A different mode needs fresh instructions, consent, and checks.
      set.mode = mode
      set.status = ATTEMPT_STATUS.REGISTERED
      set.instructionsAcceptedAt = null
      set.proctorConsent = null
      set.systemCheck = null
    }
    if (!Object.keys(set).length) return toAttempt(attempt, clock())

    const updated = await attempts.casUpdate({
      filter: { _id: attempt._id, userId, status: { $in: PRE_START_STATUSES } },
      update: {
        $set: set,
        ...(Object.keys(unset).length ? { $unset: unset } : {}),
      },
    })
    if (!updated) throw neetErrors.attemptLocked()
    return toAttempt(updated, clock())
  }

  const markReady = async ({
    attemptId,
    proctorConsent,
    systemCheck,
    userId,
  }) => {
    const attempt = await loadOwnedFresh({ attemptId, userId })
    if (!isPreStartStatus(attempt.status)) throw closedError(attempt.status)
    if (!attempt.mode) throw neetErrors.modeRequired()

    const test = await loadPublishedOpenTest(attempt.testId)
    if (!test.modes.includes(attempt.mode)) throw neetErrors.modeUnavailable()

    const now = clock()
    const set = {
      status: ATTEMPT_STATUS.READY,
      instructionsAcceptedAt: now,
      proctorConsent: null,
      systemCheck: systemCheck ? { ...systemCheck, checkedAt: now } : null,
    }
    if (attempt.mode === "PROCTORED") {
      const policy = resolveProctorPolicy(test.proctorPolicy)
      if (!proctorConsent || proctorConsent.version !== policy.consentVersion) {
        throw neetErrors.consentRequired()
      }
      // Monitored mode is adults-only until a legally reviewed approach for
      // minors exists. This is a recorded self-declaration, not verification.
      if (proctorConsent.adultConfirmed !== true) {
        throw neetErrors.adultConfirmationRequired()
      }
      // System checks are client observations; the server only requires that
      // every device the policy needs was reported ready.
      const incomplete = Object.entries(REQUIRED_DEVICE_CHECKS).some(
        ([requirement, checkKey]) =>
          policy.requirements[requirement] === true &&
          systemCheck?.[checkKey] !== "READY"
      )
      if (incomplete) throw neetErrors.systemCheckIncomplete()
      set.proctorConsent = {
        version: policy.consentVersion,
        acceptedAt: now,
        adultDeclaredAt: now,
      }
    }

    const updated = await attempts.casUpdate({
      filter: {
        _id: attempt._id,
        userId,
        status: { $in: PRE_START_STATUSES },
        mode: attempt.mode,
      },
      update: { $set: set },
    })
    if (!updated) throw neetErrors.conflict()
    return toAttempt(updated, clock())
  }

  const claimSession = async ({ attempt, sessionId, userId }) => {
    const now = clock()
    const previous = attempt.activeSessionId
    const takeover = Boolean(previous && previous !== sessionId)
    const previousAlive =
      takeover &&
      attempt.lastActivityAt &&
      now.getTime() - new Date(attempt.lastActivityAt).getTime() <
        NEET_SESSION_LIVENESS_SECONDS * 1000

    const claimed = await attempts.casUpdate({
      filter: {
        _id: attempt._id,
        userId,
        status: ATTEMPT_STATUS.IN_PROGRESS,
        expiresAt: { $gt: now },
      },
      update: {
        $set: {
          activeSessionId: sessionId,
          sessionClaimedAt: now,
          lastActivityAt: now,
        },
        ...(takeover ? { $inc: { sessionClaims: 1 } } : {}),
      },
      projection: attempts.SESSION_PROJECTION,
    })
    if (!claimed) {
      const fresh = await loadOwnedFresh({ attemptId: attempt._id, userId })
      throw closedError(fresh.status)
    }

    if (takeover) {
      logger.info("neet.attempt.session_takeover", {
        attemptId: String(attempt._id),
        previousSessionAlive: Boolean(previousAlive),
      })
    } else {
      logger.info("neet.attempt.resumed", { attemptId: String(attempt._id) })
    }

    if (takeover && previousAlive && claimed.mode === "PROCTORED") {
      const outcome = await proctor.recordServerSignal({
        attempt: claimed,
        type: "DUPLICATE_SESSION",
      })
      if (outcome?.autoSubmitted) throw neetErrors.attemptSubmitted()
      if (outcome) {
        const reloaded = await attempts.findOwned({
          attemptId: attempt._id,
          projection: attempts.SESSION_PROJECTION,
          userId,
        })
        return buildSession({ attempt: reloaded, sessionId })
      }
    }
    return buildSession({ attempt: claimed, sessionId })
  }

  const resume = async ({ attemptId, sessionId, userId }) => {
    const attempt = await loadOwnedFresh({ attemptId, userId })
    if (attempt.status !== ATTEMPT_STATUS.IN_PROGRESS)
      throw closedError(attempt.status)
    return claimSession({ attempt, sessionId, userId })
  }

  const start = async ({ attemptId, sessionId, userId }) => {
    const attempt = await loadOwnedFresh({ attemptId, userId })
    if (attempt.status === ATTEMPT_STATUS.IN_PROGRESS) {
      return claimSession({ attempt, sessionId, userId })
    }
    if (attempt.status === ATTEMPT_STATUS.REGISTERED)
      throw neetErrors.attemptNotReady()
    if (attempt.status !== ATTEMPT_STATUS.READY)
      throw closedError(attempt.status)

    const test = await loadPublishedOpenTest(attempt.testId)
    if (!test.modes.includes(attempt.mode)) throw neetErrors.modeUnavailable()
    const policy =
      attempt.mode === "PROCTORED"
        ? resolveProctorPolicy(test.proctorPolicy)
        : null
    if (policy && attempt.proctorConsent?.version !== policy.consentVersion) {
      throw neetErrors.consentRequired()
    }

    const paperVersion = await loadCurrentPaperVersion(test)
    let paper
    try {
      paper = buildPaperFromVersion({
        paperVersion,
        seed: String(attempt._id),
        test,
      })
    } catch (error) {
      if (error instanceof NeetTestConfigurationError) {
        logger.error("neet.test.misconfigured", { testId: String(test._id) })
        throw neetErrors.testNotReady()
      }
      throw error
    }

    const now = clock()
    const networkGraceSeconds = 0
    // The duration is frozen with the published paper version.
    const durationSeconds = paperVersion.durationSeconds
    const expiresAt = new Date(now.getTime() + durationSeconds * 1000)
    const totals = paperTotals(paper)
    const started = await attempts.casUpdate({
      filter: { _id: attempt._id, userId, status: ATTEMPT_STATUS.READY },
      update: {
        $set: {
          status: ATTEMPT_STATUS.IN_PROGRESS,
          startedAt: now,
          expiresAt,
          networkGraceSeconds,
          writesCloseAt: new Date(
            expiresAt.getTime() + networkGraceSeconds * 1000
          ),
          activeSessionId: sessionId,
          sessionClaimedAt: now,
          sessionClaims: 1,
          lastActivityAt: now,
          paperVersionId: paperVersion._id,
          paper,
          responses: initialResponses(paper),
          lastSeq: 0,
          "testSnapshot.title": test.title,
          "testSnapshot.version": test.version || 1,
          "testSnapshot.durationSeconds": durationSeconds,
          "testSnapshot.questionCount": totals.questionCount,
          "testSnapshot.totalMarks": totals.totalMarks,
          "testSnapshot.isSample": test.isSample === true,
          proctoring: policy
            ? {
                status: "ACTIVE",
                policy,
                revision: 0,
                counters: {},
                warningCount: 0,
                softWarningCount: 0,
                warningSequence: 0,
                warnings: [],
                eventCount: 0,
                startedAt: now,
              }
            : null,
        },
      },
      projection: attempts.SESSION_PROJECTION,
    })
    if (!started) {
      // A concurrent start (double click, retry, second tab) won; resume it.
      const current = await loadOwnedFresh({ attemptId, userId })
      if (current.status === ATTEMPT_STATUS.IN_PROGRESS) {
        return claimSession({ attempt: current, sessionId, userId })
      }
      throw closedError(current.status)
    }

    logger.info("neet.attempt.started", {
      attemptId: String(attempt._id),
      mode: attempt.mode,
      durationSeconds,
      paperVersion: paperVersion.version,
    })
    return buildSession({ attempt: started, sessionId })
  }

  // Sequenced autosave. Each element is applied only when its sequence is
  // newer than the stored one, so retries are idempotent and a delayed older
  // write can never overwrite a newer answer. The whole batch is one atomic
  // update guarded by status, session ownership, and the write cutoff.
  const saveResponses = async ({ attemptId, responses, sessionId, userId }) => {
    const now = clock()
    const set = { lastActivityAt: now }
    const arrayFilters = []
    let maxSeq = 0
    const questionIds = []
    responses.forEach((write, index) => {
      const identifier = `r${index}`
      const questionId = new mongoose.Types.ObjectId(write.questionId)
      questionIds.push(questionId)
      set[`responses.$[${identifier}].selectedOption`] = write.selectedOption
      set[`responses.$[${identifier}].markedForReview`] = write.markedForReview
      set[`responses.$[${identifier}].visited`] = true
      set[`responses.$[${identifier}].timeSpentMs`] = write.timeSpentMs
      set[`responses.$[${identifier}].seq`] = write.seq
      set[`responses.$[${identifier}].updatedAt`] = now
      arrayFilters.push({
        [`${identifier}.questionId`]: questionId,
        [`${identifier}.seq`]: { $lt: write.seq },
      })
      maxSeq = Math.max(maxSeq, write.seq)
    })

    const updated = await attempts.casUpdate({
      filter: {
        _id: attemptId,
        userId,
        status: ATTEMPT_STATUS.IN_PROGRESS,
        activeSessionId: sessionId,
        expiresAt: { $gt: now },
        "responses.questionId": { $all: questionIds },
      },
      update: { $set: set, $max: { lastSeq: maxSeq } },
      arrayFilters,
      // Return only the written questions, not the whole paper's responses.
      projection: {
        lastSeq: 1,
        expiresAt: 1,
        status: 1,
        responses: {
          $filter: {
            input: "$responses",
            as: "response",
            cond: { $in: ["$$response.questionId", questionIds] },
          },
        },
      },
    })

    if (!updated) {
      const current = await attempts.findOwned({ attemptId, userId })
      if (!current) throw neetErrors.attemptNotFound()
      if (current.status === ATTEMPT_STATUS.IN_PROGRESS) {
        if (current.expiresAt && now >= new Date(current.expiresAt)) {
          await lifecycle.ensureFresh(current)
          throw neetErrors.attemptSubmitted()
        }
        if (current.activeSessionId !== sessionId)
          throw neetErrors.sessionSuperseded()
        throw neetErrors.questionNotInPaper()
      }
      const fresh = await lifecycle.ensureFresh(current)
      throw closedError(fresh.status)
    }

    const written = new Set(questionIds.map(String))
    return {
      responses: updated.responses
        .filter((response) => written.has(String(response.questionId)))
        .map(toResponseState),
      lastSeq: updated.lastSeq || 0,
      expiresAt: new Date(updated.expiresAt).toISOString(),
      serverNow: clock().toISOString(),
    }
  }

  const heartbeat = async ({ attemptId, sessionId, userId }) => {
    const now = clock()
    const updated = await attempts.casUpdate({
      filter: {
        _id: attemptId,
        userId,
        status: ATTEMPT_STATUS.IN_PROGRESS,
        activeSessionId: sessionId,
        expiresAt: { $gt: now },
      },
      update: { $set: { lastActivityAt: now } },
    })
    const attempt = updated || (await loadOwnedFresh({ attemptId, userId }))
    return {
      status: attempt.status,
      sessionActive: Boolean(updated),
      expiresAt: attempt.expiresAt
        ? new Date(attempt.expiresAt).toISOString()
        : null,
      serverNow: clock().toISOString(),
      warningCount: attempt.proctoring?.warningCount || 0,
    }
  }

  const resultFor = async ({ attemptId, userId }) => {
    const attempt = await attempts.findOwned({
      attemptId,
      projection: attempts.RESULT_PROJECTION,
      userId,
    })
    if (!attempt) throw neetErrors.attemptNotFound()
    if (!isScoredStatus(attempt.status) || !attempt.result) {
      throw neetErrors.resultUnavailable()
    }
    return toResult(attempt, clock())
  }

  // Idempotent submission. Manual submit, timer expiry, policy submission,
  // concurrent tabs, and network retries all converge on the same CAS chain;
  // whichever request moves IN_PROGRESS -> SUBMITTING first defines the
  // reason, and the scored result is written exactly once.
  const submit = async ({ attemptId, reason, sessionId, userId }) => {
    for (let round = 0; round < SUBMIT_ROUNDS; round += 1) {
      const attempt = await attempts.findOwned({ attemptId, userId })
      if (!attempt) throw neetErrors.attemptNotFound()
      if (isScoredStatus(attempt.status))
        return resultFor({ attemptId, userId })
      if (attempt.status === ATTEMPT_STATUS.SUBMITTING) {
        await lifecycle.finalize(attempt._id)
        continue
      }
      if (attempt.status !== ATTEMPT_STATUS.IN_PROGRESS) {
        throw closedError(attempt.status)
      }

      const now = clock()
      let moved
      if (now >= new Date(attempt.expiresAt)) {
        // The server clock decides expiry regardless of what the client sent.
        moved = await lifecycle.beginSubmission({
          attemptId: attempt._id,
          reason: SUBMISSION_REASON.TIME_EXPIRED,
          requestedAt: attempt.expiresAt,
        })
      } else if (reason === SUBMISSION_REASON.TIME_EXPIRED) {
        throw neetErrors.attemptNotExpired()
      } else {
        if (attempt.activeSessionId !== sessionId)
          throw neetErrors.sessionSuperseded()
        moved = await lifecycle.beginSubmission({
          attemptId: attempt._id,
          extraFilter: { activeSessionId: sessionId, userId },
          reason: SUBMISSION_REASON.MANUAL_SUBMIT,
          requestedAt: now,
        })
      }
      if (moved) {
        logger.info("neet.attempt.submission_requested", {
          attemptId: String(attempt._id),
          reason: moved.submissionReason,
        })
        await lifecycle.finalize(attempt._id)
      }
    }
    const final = await attempts.findOwned({ attemptId, userId })
    if (final && isScoredStatus(final.status))
      return resultFor({ attemptId, userId })
    throw neetErrors.submissionPending()
  }

  const getResult = async ({ attemptId, userId }) => {
    const attempt = await loadOwnedFresh({ attemptId, userId })
    if (attempt.status === ATTEMPT_STATUS.SUBMITTING)
      throw neetErrors.submissionPending()
    return resultFor({ attemptId, userId })
  }

  return {
    getAttempt,
    getResult,
    heartbeat,
    listAttempts,
    markReady,
    register,
    resume,
    saveResponses,
    start,
    submit,
    update,
  }
}

module.exports = { createAttemptService }
