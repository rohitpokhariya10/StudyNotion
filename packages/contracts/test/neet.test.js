const assert = require("node:assert/strict")
const { test } = require("node:test")
const { randomUUID } = require("node:crypto")
const {
  neetSaveResponsesRequestSchema,
  neetCandidateInputSchema,
  neetPaperQuestionSchema,
  neetProctorEventBatchRequestSchema,
  neetReadyRequestSchema,
  neetResultSchema,
} = require("../src/neet")
const id = "507f1f77bcf86cd799439011"
test("NEET writes reject duplicate IDs, unknown fields, and invalid sequences", () => {
  const write = {
    questionId: id,
    seq: 1,
    selectedOption: "A",
    visited: true,
    markedForReview: false,
    timeSpentMs: 0,
  }
  const body = { sessionId: randomUUID(), responses: [write] }
  assert.equal(neetSaveResponsesRequestSchema.safeParse(body).success, true)
  for (const invalid of [
    { ...body, extra: 1 },
    { ...body, responses: [write, write] },
    { ...body, responses: [{ ...write, seq: 0 }] },
  ])
    assert.equal(
      neetSaveResponsesRequestSchema.safeParse(invalid).success,
      false
    )
})
test("student question contracts cannot represent answer keys or executable media URLs", () => {
  const question = {
    id,
    number: 1,
    sectionKey: "physics",
    text: "<script>plain text</script>",
    options: [
      { key: "A", text: "a" },
      { key: "B", text: "b" },
    ],
    media: [],
    marks: { correct: 4, incorrect: -1 },
  }
  assert.equal(neetPaperQuestionSchema.safeParse(question).success, true)
  assert.equal(
    neetPaperQuestionSchema.safeParse({
      ...question,
      answerKey: { correctOptionKeys: ["A"] },
    }).success,
    false
  )
  assert.equal(
    neetPaperQuestionSchema.safeParse({
      ...question,
      media: [
        {
          kind: "image",
          url: "javascript:alert(1)",
          alt: "bad",
          width: null,
          height: null,
        },
      ],
    }).success,
    false
  )
})
test("camera obstruction has a distinct strict event contract", () => {
  const body = {
    sessionId: randomUUID(),
    events: [
      {
        clientEventId: randomUUID(),
        type: "CAMERA_OBSTRUCTION",
        occurredAt: new Date().toISOString(),
        metadata: {
          reason: "CAMERA_OBSCURED",
          detector: "frame-obstruction",
          durationMs: 8000,
        },
      },
    ],
  }
  assert.equal(neetProctorEventBatchRequestSchema.safeParse(body).success, true)
  body.events[0].metadata.image = "private pixels"
  assert.equal(
    neetProctorEventBatchRequestSchema.safeParse(body).success,
    false
  )
})
test("candidate input is a display name only; contact details are rejected", () => {
  assert.equal(
    neetCandidateInputSchema.safeParse({ fullName: "Asha Rao" }).success,
    true
  )
  assert.equal(
    neetCandidateInputSchema.safeParse({ fullName: "<img>" }).success,
    false
  )
  // Phone and email must never be copied onto attempts (decision 3).
  for (const extra of [{ email: "asha@example.test" }, { phone: "9876543210" }])
    assert.equal(
      neetCandidateInputSchema.safeParse({ fullName: "Asha Rao", ...extra })
        .success,
      false
    )
})
test("monitored-mode consent accepts only an explicit adult confirmation", () => {
  const consent = { accepted: true, version: "2026-10-10" }
  const ready = (proctorConsent) =>
    neetReadyRequestSchema.safeParse({
      instructionsAccepted: true,
      proctorConsent,
    }).success
  assert.equal(ready({ ...consent, adultConfirmed: true }), true)
  // Omission is valid at the contract level; the server rejects it for
  // monitored mode with NEET_ADULT_CONFIRMATION_REQUIRED.
  assert.equal(ready(consent), true)
  assert.equal(ready({ ...consent, adultConfirmed: false }), false)
})
test("result invariants count dropped questions separately", () => {
  const at = "2026-10-10T00:00:00.000Z"
  const attempt = {
    id,
    testId: id,
    attemptNumber: 1,
    test: {
      title: "Sample",
      durationSeconds: 600,
      questionCount: 4,
      totalMarks: 16,
      isSample: true,
    },
    status: "SUBMITTED",
    mode: "NON_PROCTORED",
    candidate: { fullName: "Asha Rao" },
    instructionsAcceptedAt: at,
    proctorConsent: null,
    createdAt: at,
    registrationExpiresAt: at,
    startedAt: at,
    expiresAt: at,
    submittedAt: at,
    submissionReason: "MANUAL_SUBMIT",
    proctoring: null,
    hasResult: true,
    serverNow: at,
  }
  const summary = {
    score: 12,
    maxScore: 16,
    questionCount: 4,
    attempted: 2,
    correct: 1,
    incorrect: 1,
    unanswered: 1,
    dropped: 1,
    markedForReview: 0,
    accuracyPercent: 50,
    durationUsedSeconds: 10,
    positiveMarks: 8,
    negativeMarks: -1,
  }
  const issues = (value) =>
    neetResultSchema
      .safeParse({
        attempt,
        summary: value,
        sections: [],
        answerKeyVersion: 2,
        proctoring: null,
      })
      .error?.issues.map((issue) => issue.path.join("."))
  assert.equal(issues(summary), undefined)
  assert.ok(
    issues({ ...summary, dropped: 0 }).includes("summary.unanswered"),
    "attempted + unanswered + dropped must equal questionCount"
  )
})
