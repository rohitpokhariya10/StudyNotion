export const neetIds = {
  test: "507f1f77bcf86cd799439011",
  attempt: "507f1f77bcf86cd799439012",
  question: "507f1f77bcf86cd799439013",
  user: "507f1f77bcf86cd799439014",
}
export const candidate = {
  fullName: "Asha Rao",
  email: "asha@example.test",
  phone: "+919876543210",
}
export function neetFixture({
  now = Date.now(),
  duration = 600,
  mode = "NON_PROCTORED",
  status = "IN_PROGRESS",
} = {}) {
  const iso = (value) => new Date(value).toISOString()
  const policy = {
    version: 1,
    consentVersion: "2026-10-05",
    requirements: {
      camera: true,
      microphone: true,
      fullscreen: true,
      screenShare: false,
    },
    monitoring: {
      visibility: true,
      focus: true,
      clipboard: true,
      network: true,
      faceSignals: true,
      audioSignals: true,
      duplicateSessions: true,
    },
    signals: {
      faceAbsentSeconds: 8,
      multipleFacesSeconds: 4,
      headAwaySeconds: 10,
      audioActivitySeconds: 6,
      sampleIntervalMs: 1000,
    },
    warnings: { maxWarnings: 3, cooldownSeconds: 20 },
    autoSubmit: { enabled: true, softSignalsCanSubmit: false },
    mediaStorage: "NONE",
  }
  const test = {
    id: neetIds.test,
    slug: "sample-physics",
    title: "Physics sample",
    tagline: "A focused beginning",
    description: "Original sample questions for practice.",
    difficulty: "FOUNDATION",
    durationSeconds: Math.max(60, duration),
    questionCount: 1,
    totalMarks: 4,
    marking: { correct: 4, incorrect: -1, unanswered: 0 },
    sections: [
      {
        key: "physics",
        title: "Physics",
        subjectKey: "physics",
        subjectLabel: "Physics",
        questionCount: 1,
        maxMarks: 4,
      },
    ],
    modes: ["NON_PROCTORED", "PROCTORED"],
    availability: { state: "OPEN", opensAt: null, closesAt: null },
    isSample: true,
    patternNote: null,
    instructions: ["Choose one answer."],
    proctorPolicy: policy,
  }
  const attempt = {
    id: neetIds.attempt,
    testId: test.id,
    attemptNumber: 1,
    test: {
      title: test.title,
      durationSeconds: test.durationSeconds,
      questionCount: 1,
      totalMarks: 4,
      isSample: true,
    },
    status,
    mode,
    candidate,
    instructionsAcceptedAt: iso(now),
    proctorConsent:
      mode === "PROCTORED"
        ? { version: policy.consentVersion, acceptedAt: iso(now) }
        : null,
    createdAt: iso(now - 60000),
    registrationExpiresAt: iso(now + 86400000),
    startedAt: iso(now),
    expiresAt: iso(now + duration * 1000),
    submittedAt: null,
    submissionReason: null,
    proctoring:
      mode === "PROCTORED"
        ? {
            status: "ACTIVE",
            warningCount: 0,
            softWarningCount: 0,
            maxWarnings: 3,
            autoSubmitEnabled: true,
          }
        : null,
    hasResult: false,
    serverNow: iso(now),
  }
  const session = {
    attempt,
    sessionId: "9a6e30c1-1eca-4c94-b14a-b94133a29bf5",
    heartbeatIntervalSeconds: 45,
    networkGraceSeconds: 0,
    paper: {
      sections: [
        {
          key: "physics",
          title: "Physics",
          subjectKey: "physics",
          subjectLabel: "Physics",
          questionIds: [neetIds.question],
        },
      ],
      questions: [
        {
          id: neetIds.question,
          number: 1,
          sectionKey: "physics",
          text: "What is the SI unit of force?",
          options: [
            { key: "A", text: "Newton" },
            { key: "B", text: "Joule" },
            { key: "C", text: "Watt" },
            { key: "D", text: "Pascal" },
          ],
          media: [],
          marks: { correct: 4, incorrect: -1 },
        },
      ],
    },
    responses: [
      {
        questionId: neetIds.question,
        selectedOption: null,
        markedForReview: false,
        visited: false,
        timeSpentMs: 0,
        seq: 0,
      },
    ],
    lastSeq: 0,
    proctorPolicy: mode === "PROCTORED" ? policy : null,
    signalConfig: mode === "PROCTORED" ? policy.signals : null,
  }
  const result = {
    attempt: {
      ...attempt,
      status: "SUBMITTED",
      hasResult: true,
      submittedAt: iso(now + 20000),
      submissionReason: "MANUAL_SUBMIT",
    },
    summary: {
      score: 4,
      maxScore: 4,
      questionCount: 1,
      attempted: 1,
      correct: 1,
      incorrect: 0,
      unanswered: 0,
      markedForReview: 0,
      accuracyPercent: 100,
      durationUsedSeconds: 20,
      positiveMarks: 4,
      negativeMarks: 0,
    },
    sections: [
      {
        ...test.sections[0],
        attempted: 1,
        correct: 1,
        incorrect: 0,
        unanswered: 0,
        score: 4,
        maxScore: 4,
      },
    ],
    proctoring: null,
  }
  delete result.sections[0].maxMarks
  return { test, attempt, session, result, policy }
}
