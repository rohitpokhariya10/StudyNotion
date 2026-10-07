const crypto = require("node:crypto")

const {
  NEET_MAX_STORED_PROCTOR_EVENTS,
  NEET_MAX_STORED_WARNINGS,
  NEET_PROCTOR_EVENT_RETENTION_DAYS,
} = require("../config/defaults")
const {
  ATTEMPT_STATUS,
  SUBMISSION_REASON,
} = require("../domain/attemptStateMachine")
const { neetErrors } = require("../domain/errors")
const {
  evaluateProctorEvents,
  severityFor,
} = require("../domain/proctorPolicy")
const { toWarning } = require("./dto")

const POLICY_CAS_ROUNDS = 5
const CLIENT_CLOCK_TOLERANCE_MS = 60_000
const DAY_MS = 24 * 60 * 60 * 1000

const counterTotal = (proctoring, type) => {
  const counters = proctoring?.counters
  if (!counters) return 0
  const counter = counters instanceof Map ? counters.get(type) : counters[type]
  return counter?.total || 0
}

// Client timestamps are hints. Values outside the attempt window or beyond a
// small skew tolerance are replaced with the server receive time.
const clampOccurredAt = (value, { now, startedAt }) => {
  const candidate = new Date(value)
  const earliest = new Date(startedAt).getTime() - CLIENT_CLOCK_TOLERANCE_MS
  const latest = now.getTime() + CLIENT_CLOCK_TOLERANCE_MS
  if (
    Number.isNaN(candidate.getTime()) ||
    candidate.getTime() < earliest ||
    candidate.getTime() > latest
  ) {
    return now
  }
  return candidate
}

const createProctorService = ({
  attempts,
  clock,
  events,
  lifecycle,
  logger,
}) => {
  const closedError = (status) => {
    if (status === ATTEMPT_STATUS.EXPIRED) return neetErrors.attemptExpired()
    if (
      status === ATTEMPT_STATUS.REGISTERED ||
      status === ATTEMPT_STATUS.READY
    ) {
      return neetErrors.attemptNotStarted()
    }
    return neetErrors.attemptSubmitted()
  }

  const responseFor = (attempt, extra) => ({
    accepted: 0,
    duplicates: 0,
    newWarnings: [],
    warningCount: attempt.proctoring?.warningCount || 0,
    softWarningCount: attempt.proctoring?.softWarningCount || 0,
    maxWarnings: attempt.proctoring?.policy?.warnings?.maxWarnings || 1,
    status: attempt.status,
    autoSubmitted: false,
    serverNow: clock().toISOString(),
    ...extra,
  })

  const recordServerEvents = async ({
    attempt,
    autoSubmit,
    now,
    thresholdExceeded,
    warnings,
  }) => {
    const base = {
      attemptId: attempt._id,
      userId: attempt.userId,
      source: "SERVER",
      occurredAt: now,
      receivedAt: now,
      expiresAt: new Date(
        now.getTime() + NEET_PROCTOR_EVENT_RETENTION_DAYS * DAY_MS
      ),
    }
    const documents = warnings.map((warning) => ({
      ...base,
      clientEventId: `srv:warning:${warning.id}`,
      type: "WARNING_ISSUED",
      severity: warning.severity,
      metadata: { warningId: warning.id, level: warning.level },
    }))
    if (thresholdExceeded) {
      documents.push({
        ...base,
        clientEventId: "srv:threshold-exceeded",
        type: "POLICY_THRESHOLD_EXCEEDED",
        severity: "HIGH",
      })
    }
    if (autoSubmit) {
      documents.push({
        ...base,
        clientEventId: "srv:auto-submit",
        type: "AUTO_SUBMIT",
        severity: "HIGH",
      })
    }
    try {
      await events.insertNew(documents)
    } catch (error) {
      // The authoritative warning state is already on the attempt; the
      // timeline entry is best effort.
      logger.warn("neet.proctor.server_event_failed", {
        attemptId: String(attempt._id),
        error: logger.errorMetadata(error),
      })
    }
  }

  // Applies newly stored events to the attempt's policy state with a
  // revision compare-and-set, retrying when concurrent batches interleave.
  const applyPolicy = async ({ attemptId, duplicates, newEvents, userId }) => {
    for (let round = 0; round < POLICY_CAS_ROUNDS; round += 1) {
      const attempt = await attempts.findOwned({
        attemptId,
        projection: attempts.PROCTOR_PROJECTION,
        userId,
      })
      if (!attempt) throw neetErrors.attemptNotFound()
      if (attempt.status !== ATTEMPT_STATUS.IN_PROGRESS) {
        return responseFor(attempt, { accepted: newEvents.length, duplicates })
      }

      const now = clock()
      const policy = attempt.proctoring.policy
      const evaluation = evaluateProctorEvents({
        events: newEvents,
        now,
        policy,
        state: attempt.proctoring,
      })
      const set = {
        "proctoring.counters": evaluation.state.counters,
        "proctoring.warningCount": evaluation.state.warningCount,
        "proctoring.softWarningCount": evaluation.state.softWarningCount,
        "proctoring.warningSequence": evaluation.state.warningSequence,
      }
      const firstThreshold =
        evaluation.state.thresholdExceeded &&
        !attempt.proctoring.thresholdExceededAt
      if (firstThreshold) set["proctoring.thresholdExceededAt"] = now
      if (evaluation.autoSubmit) {
        set.status = ATTEMPT_STATUS.SUBMITTING
        set.submissionReason = SUBMISSION_REASON.PROCTOR_POLICY
        set.submissionRequestedAt = now
      }
      const update = {
        $set: set,
        $inc: {
          "proctoring.revision": 1,
          "proctoring.eventCount": newEvents.length,
        },
      }
      if (evaluation.newWarnings.length) {
        update.$push = {
          "proctoring.warnings": {
            $each: evaluation.newWarnings,
            $slice: -NEET_MAX_STORED_WARNINGS,
          },
        }
      }

      const updated = await attempts.casUpdate({
        filter: {
          _id: attemptId,
          userId,
          status: ATTEMPT_STATUS.IN_PROGRESS,
          "proctoring.revision": attempt.proctoring.revision || 0,
        },
        update,
      })
      if (!updated) continue

      for (const warning of evaluation.newWarnings) {
        logger.info("neet.proctor.warning_issued", {
          attemptId: String(attemptId),
          ruleType: warning.ruleType,
          level: warning.level,
          counted: warning.counted,
        })
      }
      await recordServerEvents({
        attempt,
        autoSubmit: evaluation.autoSubmit,
        now,
        thresholdExceeded: firstThreshold,
        warnings: evaluation.newWarnings,
      })

      let finalState = updated
      if (evaluation.autoSubmit) {
        logger.warn("neet.proctor.policy_auto_submit", {
          attemptId: String(attemptId),
          warningCount: evaluation.state.warningCount,
        })
        finalState = (await lifecycle.finalize(attemptId)) || updated
      }

      return responseFor(finalState, {
        accepted: newEvents.length,
        duplicates,
        newWarnings: evaluation.newWarnings.map(toWarning),
        warningCount: evaluation.state.warningCount,
        softWarningCount: evaluation.state.softWarningCount,
        maxWarnings: policy.warnings.maxWarnings,
        status: finalState.status,
        autoSubmitted: evaluation.autoSubmit,
      })
    }
    throw neetErrors.conflict()
  }

  const buildDocuments = ({ attempt, inputs, now }) => {
    const policy = attempt.proctoring.policy
    const pendingTotals = new Map()
    return inputs.map((input) => {
      const total =
        counterTotal(attempt.proctoring, input.type) +
        (pendingTotals.get(input.type) || 0) +
        1
      pendingTotals.set(input.type, (pendingTotals.get(input.type) || 0) + 1)
      return {
        attemptId: attempt._id,
        userId: attempt.userId,
        clientEventId: input.clientEventId,
        source: input.source || "CLIENT",
        type: input.type,
        severity: severityFor(policy, input.type, total),
        occurredAt: input.occurredAt
          ? clampOccurredAt(input.occurredAt, {
              now,
              startedAt: attempt.startedAt,
            })
          : now,
        receivedAt: now,
        metadata: input.metadata || {},
        expiresAt: new Date(
          now.getTime() + NEET_PROCTOR_EVENT_RETENTION_DAYS * DAY_MS
        ),
      }
    })
  }

  const recordEvents = async ({
    attemptId,
    events: inputs,
    sessionId,
    userId,
  }) => {
    let attempt = await attempts.findOwned({
      attemptId,
      projection: attempts.PROCTOR_PROJECTION,
      userId,
    })
    if (!attempt) throw neetErrors.attemptNotFound()
    if (attempt.mode !== "PROCTORED") throw neetErrors.notProctored()

    const now = clock()
    if (
      attempt.status !== ATTEMPT_STATUS.IN_PROGRESS ||
      (attempt.expiresAt && now >= new Date(attempt.expiresAt))
    ) {
      attempt = await lifecycle.ensureFresh(attempt)
      throw closedError(attempt.status)
    }
    if (attempt.activeSessionId !== sessionId)
      throw neetErrors.sessionSuperseded()

    if (
      (attempt.proctoring.eventCount || 0) >= NEET_MAX_STORED_PROCTOR_EVENTS
    ) {
      logger.warn("neet.proctor.event_cap_reached", {
        attemptId: String(attemptId),
      })
      return responseFor(attempt, { duplicates: inputs.length })
    }

    const documents = buildDocuments({ attempt, inputs, now })
    const inserted = await events.insertNew(documents)
    const duplicates = documents.length - inserted.length
    if (!inserted.length) return responseFor(attempt, { duplicates })

    return applyPolicy({
      attemptId,
      duplicates,
      newEvents: inserted.map((document) => ({
        type: document.type,
        occurredAt: document.occurredAt,
      })),
      userId,
    })
  }

  // Server-detected signals (for example a live session takeover).
  const recordServerSignal = async ({ attempt, type }) => {
    if (attempt.mode !== "PROCTORED" || !attempt.proctoring?.policy) return null
    const now = clock()
    const documents = buildDocuments({
      attempt,
      inputs: [
        {
          clientEventId: `srv:${type.toLowerCase()}:${crypto.randomUUID()}`,
          source: "SERVER",
          type,
        },
      ],
      now,
    })
    const inserted = await events.insertNew(documents)
    if (!inserted.length) return null
    return applyPolicy({
      attemptId: attempt._id,
      duplicates: 0,
      newEvents: [{ type, occurredAt: now }],
      userId: attempt.userId,
    })
  }

  return { recordEvents, recordServerSignal }
}

module.exports = { clampOccurredAt, createProctorService }
