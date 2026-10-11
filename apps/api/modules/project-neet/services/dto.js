const { normalizeNeetCandidateName } = require("@studynotion/contracts/neet")

const { availabilityFor, computeTestTotals } = require("../domain/paper")
const {
  resolveProctorPolicy,
  toClientSignalConfig,
  toPublicProctorPolicy,
} = require("../domain/proctorPolicy")
const { isScoredStatus } = require("../domain/attemptStateMachine")

const id = (value) => String(value).toLowerCase()
const iso = (value) => (value ? new Date(value).toISOString() : null)

// Display name only; contact details are never copied onto attempts.
const normalizeCandidate = (candidate) => ({
  fullName: normalizeNeetCandidateName(candidate.fullName),
})

const toTestSummary = (test, now) => {
  const totals = computeTestTotals(test)
  const availability = availabilityFor(test, now)
  return {
    id: id(test._id),
    slug: test.slug,
    title: test.title,
    tagline: test.tagline || "",
    description: test.description || "",
    difficulty: test.difficulty,
    durationSeconds: test.durationSeconds,
    questionCount: totals.questionCount,
    totalMarks: totals.totalMarks,
    marking: {
      correct: test.marking?.correct ?? 4,
      incorrect: test.marking?.incorrect ?? -1,
      unanswered: test.marking?.unanswered ?? 0,
    },
    sections: totals.sections,
    modes: [...test.modes],
    availability: {
      state: availability.state,
      opensAt: iso(availability.opensAt),
      closesAt: iso(availability.closesAt),
    },
    isSample: test.isSample === true,
    patternNote: test.patternNote || null,
  }
}

const toTestDetail = (test, now) => ({
  ...toTestSummary(test, now),
  instructions: [...(test.instructions || [])],
  proctorPolicy: test.modes.includes("PROCTORED")
    ? toPublicProctorPolicy(resolveProctorPolicy(test.proctorPolicy))
    : null,
})

const toProctoringSummary = (attempt) => {
  const policy = attempt.proctoring?.policy
  if (attempt.mode !== "PROCTORED" || !policy) return null
  return {
    status: attempt.proctoring.status,
    warningCount: attempt.proctoring.warningCount || 0,
    softWarningCount: attempt.proctoring.softWarningCount || 0,
    maxWarnings: policy.warnings.maxWarnings,
    // Monitoring never submits an attempt, including legacy policy snapshots.
    autoSubmitEnabled: false,
    reviewStatus: attempt.review?.status || "NONE",
  }
}

const toAttempt = (attempt, now) => ({
  id: id(attempt._id),
  testId: id(attempt.testId),
  attemptNumber: attempt.attemptNumber,
  test: {
    title: attempt.testSnapshot.title,
    durationSeconds: attempt.testSnapshot.durationSeconds,
    questionCount: attempt.testSnapshot.questionCount,
    totalMarks: attempt.testSnapshot.totalMarks,
    isSample: attempt.testSnapshot.isSample === true,
  },
  status: attempt.status,
  mode: attempt.mode || null,
  candidate: { fullName: attempt.candidate.fullName },
  instructionsAcceptedAt: iso(attempt.instructionsAcceptedAt),
  proctorConsent: attempt.proctorConsent
    ? {
        version: attempt.proctorConsent.version,
        acceptedAt: iso(attempt.proctorConsent.acceptedAt),
        adultDeclaredAt: iso(attempt.proctorConsent.adultDeclaredAt),
      }
    : null,
  createdAt: iso(attempt.createdAt),
  registrationExpiresAt: iso(attempt.registrationExpiresAt),
  startedAt: iso(attempt.startedAt),
  expiresAt: iso(attempt.expiresAt),
  submittedAt: iso(attempt.submittedAt),
  submissionReason: attempt.submissionReason || null,
  proctoring: toProctoringSummary(attempt),
  hasResult: isScoredStatus(attempt.status) && Boolean(attempt.result),
  serverNow: now.toISOString(),
})

const toAttemptListItem = (attempt) => ({
  id: id(attempt._id),
  testId: id(attempt.testId),
  testTitle: attempt.testSnapshot.title,
  attemptNumber: attempt.attemptNumber,
  status: attempt.status,
  mode: attempt.mode || null,
  createdAt: iso(attempt.createdAt),
  startedAt: iso(attempt.startedAt),
  expiresAt: iso(attempt.expiresAt),
  submittedAt: iso(attempt.submittedAt),
  score: isScoredStatus(attempt.status)
    ? (attempt.result?.summary?.score ?? null)
    : null,
  maxScore: isScoredStatus(attempt.status)
    ? (attempt.result?.summary?.maxScore ?? null)
    : null,
})

const toResponseState = (response) => ({
  questionId: id(response.questionId),
  selectedOption: response.selectedOption || null,
  markedForReview: response.markedForReview === true,
  visited: response.visited === true,
  timeSpentMs: response.timeSpentMs || 0,
  seq: response.seq || 0,
})

// Maps question documents into the exam paper strictly by allowlisted fields.
const toExamSession = ({
  attempt,
  heartbeatIntervalSeconds,
  now,
  questions,
  sessionId,
}) => {
  const byId = new Map(
    questions.map((question) => [id(question._id), question])
  )
  const paperQuestions = attempt.paper.questions.map((entry) => {
    const question = byId.get(id(entry.questionId))
    if (!question) throw new Error("A paper question could not be loaded")
    return {
      id: id(entry.questionId),
      number: entry.number,
      sectionKey: entry.sectionKey,
      text: question.text,
      options: question.options.map((option) => ({
        key: option.key,
        text: option.text,
      })),
      media: (question.media || []).map((media) => ({
        kind: media.kind,
        url: media.url,
        alt: media.alt,
        width: media.width ?? null,
        height: media.height ?? null,
      })),
      marks: {
        correct: entry.marks.correct,
        incorrect: entry.marks.incorrect,
      },
    }
  })
  const sections = attempt.paper.sections.map((section) => ({
    key: section.key,
    title: section.title,
    subjectKey: section.subjectKey,
    subjectLabel: section.subjectLabel,
    questionIds: attempt.paper.questions
      .filter((entry) => entry.sectionKey === section.key)
      .map((entry) => id(entry.questionId)),
  }))
  const policy =
    attempt.mode === "PROCTORED" ? attempt.proctoring?.policy : null

  return {
    attempt: toAttempt(attempt, now),
    sessionId,
    heartbeatIntervalSeconds,
    networkGraceSeconds: attempt.networkGraceSeconds || 0,
    paper: { sections, questions: paperQuestions },
    responses: (attempt.responses || []).map(toResponseState),
    lastSeq: attempt.lastSeq || 0,
    proctorPolicy: policy ? toPublicProctorPolicy(policy) : null,
    signalConfig: policy ? toClientSignalConfig(policy) : null,
  }
}

const toWarning = (warning) => ({
  id: warning.id,
  level: warning.level,
  counted: warning.counted === true,
  ruleType: warning.ruleType,
  severity: warning.severity,
  message: warning.message,
  issuedAt: iso(warning.issuedAt),
})

const toResult = (attempt, now) => {
  const policy =
    attempt.mode === "PROCTORED" ? attempt.proctoring?.policy : null
  return {
    attempt: toAttempt(attempt, now),
    // Results scored before dropped questions existed default to zero.
    summary: {
      ...attempt.result.summary,
      dropped: attempt.result.summary.dropped || 0,
    },
    sections: attempt.result.sections.map((section) => ({
      key: section.key,
      title: section.title,
      subjectKey: section.subjectKey,
      subjectLabel: section.subjectLabel,
      questionCount: section.questionCount,
      attempted: section.attempted,
      correct: section.correct,
      incorrect: section.incorrect,
      unanswered: section.unanswered,
      dropped: section.dropped || 0,
      score: section.score,
      maxScore: section.maxScore,
    })),
    answerKeyVersion: attempt.result.answerKeyVersion ?? null,
    proctoring: policy
      ? {
          warningCount: attempt.proctoring.warningCount || 0,
          softWarningCount: attempt.proctoring.softWarningCount || 0,
          maxWarnings: policy.warnings.maxWarnings,
          warnings: (attempt.proctoring.warnings || []).map(toWarning),
        }
      : null,
  }
}

module.exports = {
  normalizeCandidate,
  toAttempt,
  toAttemptListItem,
  toExamSession,
  toResponseState,
  toResult,
  toTestDetail,
  toTestSummary,
  toWarning,
}
