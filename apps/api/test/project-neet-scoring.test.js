const assert = require("node:assert/strict")
const { test } = require("node:test")

const {
  applyKeyCorrections,
  buildPaperVersionContent,
  keysDigest,
} = require("../modules/project-neet/domain/paperVersion")
const {
  NeetScoringDataError,
  keysToMap,
  scoreAttempt,
  scoreQuestion,
} = require("../modules/project-neet/domain/scoring")

const marks = { correct: 4, incorrect: -1, unanswered: 0 }
const active = (...correctOptionKeys) => ({
  status: "ACTIVE",
  correctOptionKeys,
})

test("NTA NEET 2026 per-question rules: single, multiple, all-correct, dropped", () => {
  const cases = [
    // Single correct option: +4 / -1 / 0.
    [active("B"), "B", "CORRECT", 4],
    [active("B"), "C", "INCORRECT", -1],
    [active("B"), null, "UNANSWERED", 0],
    // More than one correct option: any listed option earns +4; another
    // option is still incorrect.
    [active("A", "C"), "A", "CORRECT", 4],
    [active("A", "C"), "C", "CORRECT", 4],
    [active("A", "C"), "D", "INCORRECT", -1],
    [active("A", "C"), null, "UNANSWERED", 0],
    // All options correct: any attempt earns +4; unanswered earns 0.
    [{ status: "ALL_CORRECT", correctOptionKeys: [] }, "D", "CORRECT", 4],
    [{ status: "ALL_CORRECT", correctOptionKeys: [] }, null, "UNANSWERED", 0],
    // Dropped/invalid: +4 to every appeared candidate, attempted or not.
    [{ status: "DROPPED", correctOptionKeys: [] }, "A", "DROPPED", 4],
    [{ status: "DROPPED", correctOptionKeys: [] }, null, "DROPPED", 4],
  ]
  for (const [key, selectedOption, outcome, marksAwarded] of cases) {
    assert.deepEqual(scoreQuestion({ key, marks, selectedOption }), {
      outcome,
      marksAwarded,
    })
  }
  // Legacy keys without a status are single/multiple ACTIVE keys.
  assert.equal(
    scoreQuestion({
      key: { correctOptionKeys: ["A"] },
      marks,
      selectedOption: "A",
    }).outcome,
    "CORRECT"
  )
})

test("a missing, empty, or unknown key aborts scoring instead of mis-scoring", () => {
  for (const key of [
    undefined,
    { status: "ACTIVE", correctOptionKeys: [] },
    { status: "BONUS", correctOptionKeys: ["A"] },
  ]) {
    assert.throws(
      () => scoreQuestion({ key, marks, selectedOption: "A" }),
      NeetScoringDataError
    )
  }
})

const paperOf = (count) => ({
  sections: [
    {
      key: "physics",
      title: "Physics",
      subjectKey: "physics",
      subjectLabel: "Physics",
    },
  ],
  questions: Array.from({ length: count }, (_, index) => ({
    questionId: `q${index}`,
    revision: 1,
    sectionKey: "physics",
    number: index + 1,
    marks,
  })),
})

test("a full 180-question paper keeps 720 maximum marks and the summary invariants", () => {
  const paper = paperOf(180)
  const keys = paper.questions.map((question, index) => ({
    questionId: question.questionId,
    ...(index === 0
      ? { status: "DROPPED", correctOptionKeys: [] }
      : index === 1
        ? { status: "ALL_CORRECT", correctOptionKeys: [] }
        : index === 2
          ? active("A", "B")
          : active("A")),
  }))
  // Q0 dropped & unanswered, Q1 all-correct & answered, Q2 multi & "B",
  // Q3 wrong, Q4 unanswered, the rest correct.
  const responses = paper.questions.map((question, index) => ({
    questionId: question.questionId,
    selectedOption:
      [null, "C", "B", "D", null][index] ?? (index > 4 ? "A" : null),
    markedForReview: index === 3,
  }))
  const result = scoreAttempt({
    answerKeyVersion: 3,
    answerKeys: keysToMap(keys),
    endedAt: new Date(10_000),
    paper,
    responses,
    startedAt: new Date(0),
  })
  const { summary } = result
  assert.equal(result.answerKeyVersion, 3)
  assert.equal(summary.maxScore, 720)
  assert.equal(summary.questionCount, 180)
  assert.equal(summary.dropped, 1)
  assert.equal(summary.unanswered, 1)
  assert.equal(summary.incorrect, 1)
  assert.equal(summary.correct, 177)
  assert.equal(summary.attempted, summary.correct + summary.incorrect)
  assert.equal(
    summary.attempted + summary.unanswered + summary.dropped,
    summary.questionCount
  )
  // 177 correct + 1 dropped award = 178 x 4, minus 1 incorrect.
  assert.equal(summary.score, 178 * 4 - 1)
  assert.equal(summary.positiveMarks, 712)
  assert.equal(summary.negativeMarks, -1)
  assert.equal(summary.markedForReview, 1)
  assert.equal(result.sections[0].dropped, 1)
  assert.equal(result.questions[0].keyStatus, "DROPPED")
})

const bankQuestion = (order, sectionKey = "physics") => ({
  _id: `${sectionKey}-${order}`,
  sectionKey,
  order,
  revision: 2,
  text: `Question ${order}`,
  options: ["A", "B", "C", "D"].map((key) => ({ key, text: `Option ${key}` })),
  media: [],
  answerKey: { correctOptionKeys: ["A"] },
})

const testConfig = {
  durationSeconds: 3600,
  marking: marks,
  sections: [
    {
      key: "physics",
      title: "Physics",
      subjectKey: "physics",
      subjectLabel: "Physics",
      order: 1,
      questionCount: 2,
    },
  ],
}

test("paper-version content is deterministic, ordered, and carries no keys", () => {
  const questions = [bankQuestion(3), bankQuestion(1), bankQuestion(2)]
  const first = buildPaperVersionContent({ questions, test: testConfig })
  const again = buildPaperVersionContent({
    questions: [...questions].reverse(),
    test: testConfig,
  })
  assert.equal(first.contentHash, again.contentHash)
  assert.deepEqual(
    first.questions.map((question) => question.order),
    [1, 2]
  )
  assert.doesNotMatch(
    JSON.stringify(first.questions),
    /answerKey|correctOptionKeys|explanation/
  )
  assert.equal(first.keys.length, 2)
  const edited = buildPaperVersionContent({
    questions: [{ ...bankQuestion(1), text: "Edited" }, bankQuestion(2)],
    test: testConfig,
  })
  assert.notEqual(edited.contentHash, first.contentHash)
  assert.throws(
    () =>
      buildPaperVersionContent({
        questions: [bankQuestion(1)],
        test: testConfig,
      }),
    /not have enough active questions/
  )
})

test("answer-key corrections validate questions and options", () => {
  const content = buildPaperVersionContent({
    questions: [bankQuestion(1), bankQuestion(2)],
    test: testConfig,
  })
  const paperVersion = { questions: content.questions }
  const dropped = applyKeyCorrections({
    changes: [{ questionId: "physics-1", status: "DROPPED" }],
    keys: content.keys,
    paperVersion,
  })
  assert.equal(dropped[0].status, "DROPPED")
  assert.deepEqual(dropped[0].correctOptionKeys, [])
  assert.equal(dropped[1].status, "ACTIVE")
  assert.notEqual(keysDigest(dropped), keysDigest(content.keys))
  const multiple = applyKeyCorrections({
    changes: [
      {
        questionId: "physics-2",
        status: "ACTIVE",
        correctOptionKeys: ["A", "C"],
      },
    ],
    keys: content.keys,
    paperVersion,
  })
  assert.deepEqual(multiple[1].correctOptionKeys, ["A", "C"])
  for (const change of [
    { questionId: "elsewhere", status: "DROPPED" },
    { questionId: "physics-1", status: "ACTIVE", correctOptionKeys: [] },
    { questionId: "physics-1", status: "ACTIVE", correctOptionKeys: ["E"] },
    { questionId: "physics-1", status: "BONUS" },
  ]) {
    assert.throws(() =>
      applyKeyCorrections({
        changes: [change],
        keys: content.keys,
        paperVersion,
      })
    )
  }
})
