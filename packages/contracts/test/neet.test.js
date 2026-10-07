const assert = require("node:assert/strict")
const { test } = require("node:test")
const { randomUUID } = require("node:crypto")
const {
  neetSaveResponsesRequestSchema,
  neetCandidateInputSchema,
  neetPaperQuestionSchema,
  neetProctorEventBatchRequestSchema,
  normalizeNeetPhone,
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
test("candidate input validates names and normalizes phone numbers", () => {
  assert.equal(normalizeNeetPhone("98765 43210"), "+919876543210")
  assert.equal(
    neetCandidateInputSchema.safeParse({
      fullName: "Asha Rao",
      email: "asha@example.test",
      phone: "9876543210",
    }).success,
    true
  )
  assert.equal(
    neetCandidateInputSchema.safeParse({
      fullName: "<img>",
      email: "not-email",
      phone: "123",
    }).success,
    false
  )
})
