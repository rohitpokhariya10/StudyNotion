const crypto = require("node:crypto")

const { NEET_OPTION_KEYS } = require("@studynotion/contracts/neet")

const {
  NeetTestConfigurationError,
  numberOr,
  orderedSections,
  sectionMarking,
} = require("./paper")

const id = (value) => String(value)

// Stable JSON for hashing: object keys sorted, arrays kept in order.
const canonical = (value) => {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`
  if (value && typeof value === "object" && !(value instanceof Date)) {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`)
      .join(",")}}`
  }
  return JSON.stringify(value instanceof Date ? value.toISOString() : value)
}

const sha256 = (value) =>
  crypto.createHash("sha256").update(canonical(value)).digest("hex")

// Selects the configured number of active questions per section, in bank
// order. This is the same rule the legacy per-attempt builder used, so a
// migrated test publishes exactly the paper its attempts already saw.
const selectSectionQuestions = ({ questions, test }) => {
  const bySection = new Map()
  for (const question of questions) {
    const list = bySection.get(question.sectionKey) || []
    list.push(question)
    bySection.set(question.sectionKey, list)
  }
  return orderedSections(test).map((section) => {
    const available = (bySection.get(section.key) || []).sort(
      (left, right) => left.order - right.order
    )
    if (available.length < section.questionCount) {
      throw new NeetTestConfigurationError(
        "The test does not have enough active questions for a section"
      )
    }
    return { section, selected: available.slice(0, section.questionCount) }
  })
}

// Pure: builds the immutable content snapshot and the initial answer keys for
// a test from its active bank questions (which must include `answerKey`).
const buildPaperVersionContent = ({ questions, test }) => {
  const sections = []
  const paperQuestions = []
  const keys = []
  for (const { section, selected } of selectSectionQuestions({
    questions,
    test,
  })) {
    const marking = sectionMarking(test, section)
    sections.push({
      key: section.key,
      title: section.title,
      subjectKey: section.subjectKey,
      subjectLabel: section.subjectLabel,
      order: section.order,
      questionCount: section.questionCount,
    })
    for (const question of selected) {
      const correctOptionKeys = [
        ...(question.answerKey?.correctOptionKeys || []),
      ]
      if (!correctOptionKeys.length) {
        throw new NeetTestConfigurationError(
          "A question in the paper has no answer key"
        )
      }
      paperQuestions.push({
        questionId: question._id,
        revision: question.revision || 1,
        sectionKey: section.key,
        order: question.order,
        marks: {
          correct: numberOr(question.marks?.correct, marking.correct),
          incorrect: numberOr(question.marks?.incorrect, marking.incorrect),
          unanswered: marking.unanswered,
        },
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
      })
      keys.push({
        questionId: question._id,
        status: "ACTIVE",
        correctOptionKeys,
      })
    }
  }
  if (!paperQuestions.length) {
    throw new NeetTestConfigurationError("The test has no questions")
  }
  const durationSeconds = test.durationSeconds
  const contentHash = sha256({
    durationSeconds,
    sections,
    questions: paperQuestions.map((question) => ({
      ...question,
      questionId: id(question.questionId),
    })),
  })
  return {
    contentHash,
    durationSeconds,
    keys,
    questions: paperQuestions,
    sections,
  }
}

const keysDigest = (keys) =>
  sha256(
    keys.map((key) => ({
      questionId: id(key.questionId),
      status: key.status || "ACTIVE",
      correctOptionKeys: [...(key.correctOptionKeys || [])].sort(),
    }))
  )

// Validates and applies operator corrections to the latest key list. Each
// change targets one paper question. Returns a new list; nothing is mutated.
const applyKeyCorrections = ({ changes, keys, paperVersion }) => {
  if (!Array.isArray(changes) || !changes.length) {
    throw new NeetTestConfigurationError("No answer-key changes were given")
  }
  const optionsByQuestion = new Map(
    paperVersion.questions.map((question) => [
      id(question.questionId),
      new Set(question.options.map((option) => option.key)),
    ])
  )
  const next = new Map(keys.map((key) => [id(key.questionId), { ...key }]))
  for (const change of changes) {
    const questionId = id(change.questionId)
    const options = optionsByQuestion.get(questionId)
    if (!options) {
      throw new NeetTestConfigurationError(
        "An answer-key change references a question outside the paper"
      )
    }
    const status = change.status || "ACTIVE"
    if (!["ACTIVE", "ALL_CORRECT", "DROPPED"].includes(status)) {
      throw new NeetTestConfigurationError("Unknown answer-key status")
    }
    const correctOptionKeys =
      status === "ACTIVE" ? [...new Set(change.correctOptionKeys || [])] : []
    if (
      status === "ACTIVE" &&
      (!correctOptionKeys.length ||
        correctOptionKeys.some(
          (key) => !NEET_OPTION_KEYS.includes(key) || !options.has(key)
        ))
    ) {
      throw new NeetTestConfigurationError(
        "An active answer key must list existing options"
      )
    }
    next.set(questionId, {
      questionId: change.questionId,
      status,
      correctOptionKeys,
    })
  }
  return paperVersion.questions.map((question) =>
    next.get(id(question.questionId))
  )
}

module.exports = {
  applyKeyCorrections,
  buildPaperVersionContent,
  keysDigest,
  selectSectionQuestions,
}
