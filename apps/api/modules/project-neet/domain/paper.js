const crypto = require("node:crypto")

class NeetTestConfigurationError extends Error {
  constructor(message) {
    super(message)
    this.name = "NeetTestConfigurationError"
  }
}

const numberOr = (value, fallback) =>
  typeof value === "number" && Number.isFinite(value) ? value : fallback

const resolveMarking = (...candidates) => {
  const resolved = { correct: 4, incorrect: -1, unanswered: 0 }
  for (const candidate of candidates.reverse()) {
    if (!candidate) continue
    resolved.correct = numberOr(candidate.correct, resolved.correct)
    resolved.incorrect = numberOr(candidate.incorrect, resolved.incorrect)
    resolved.unanswered = numberOr(candidate.unanswered, resolved.unanswered)
  }
  return resolved
}

const sectionMarking = (test, section) =>
  resolveMarking(section.marking, test.marking)

const orderedSections = (test) =>
  [...(test.sections || [])].sort(
    (left, right) => (left.order || 0) - (right.order || 0)
  )

// Totals derive from configuration, never from a client or a stored counter,
// so a pattern change only requires editing the test document.
const computeTestTotals = (test) => {
  let questionCount = 0
  let totalMarks = 0
  const sections = orderedSections(test).map((section) => {
    const marking = sectionMarking(test, section)
    const maxMarks = section.questionCount * marking.correct
    questionCount += section.questionCount
    totalMarks += maxMarks
    return {
      key: section.key,
      title: section.title,
      subjectKey: section.subjectKey,
      subjectLabel: section.subjectLabel,
      questionCount: section.questionCount,
      maxMarks,
    }
  })
  return { questionCount, sections, totalMarks }
}

const availabilityFor = (test, now) => {
  const opensAt = test.availability?.opensAt
    ? new Date(test.availability.opensAt)
    : null
  const closesAt = test.availability?.closesAt
    ? new Date(test.availability.closesAt)
    : null
  let state = "OPEN"
  if (opensAt && now < opensAt) state = "UPCOMING"
  else if (closesAt && now >= closesAt) state = "CLOSED"
  return { state, opensAt, closesAt }
}

const seededRandom = (seed) => {
  const digest = crypto.createHash("sha256").update(String(seed)).digest()
  let value = digest.readUInt32BE(0)
  return () => {
    value = (value + 0x6d2b79f5) >>> 0
    let mixed = value
    mixed = Math.imul(mixed ^ (mixed >>> 15), mixed | 1)
    mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61)
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296
  }
}

const seededShuffle = (items, seed) => {
  const random = seededRandom(seed)
  const shuffled = [...items]
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1))
    ;[shuffled[index], shuffled[swapIndex]] = [
      shuffled[swapIndex],
      shuffled[index],
    ]
  }
  return shuffled
}

// Builds the immutable per-attempt paper snapshot: question order, numbering,
// marks, and question revisions. The configured question count per section is
// authoritative; extra active questions are ignored, too few is an error.
const buildPaper = ({ questions, seed, test }) => {
  const bySection = new Map()
  for (const question of questions) {
    const list = bySection.get(question.sectionKey) || []
    list.push(question)
    bySection.set(question.sectionKey, list)
  }

  const sections = []
  const paperQuestions = []
  let number = 0
  for (const section of orderedSections(test)) {
    const available = (bySection.get(section.key) || []).sort(
      (left, right) => left.order - right.order
    )
    if (available.length < section.questionCount) {
      throw new NeetTestConfigurationError(
        "The test does not have enough active questions for a section"
      )
    }
    let selected = available.slice(0, section.questionCount)
    if (test.ordering?.shuffleQuestionsWithinSection === true) {
      selected = seededShuffle(selected, `${seed}:${section.key}`)
    }
    const marking = sectionMarking(test, section)
    sections.push({
      key: section.key,
      title: section.title,
      subjectKey: section.subjectKey,
      subjectLabel: section.subjectLabel,
    })
    for (const question of selected) {
      number += 1
      paperQuestions.push({
        questionId: question._id,
        revision: question.revision || 1,
        sectionKey: section.key,
        number,
        marks: {
          correct: numberOr(question.marks?.correct, marking.correct),
          incorrect: numberOr(question.marks?.incorrect, marking.incorrect),
          unanswered: marking.unanswered,
        },
      })
    }
  }

  if (!paperQuestions.length) {
    throw new NeetTestConfigurationError("The test has no questions")
  }

  return {
    testVersion: test.version || 1,
    seed: String(seed),
    sections,
    questions: paperQuestions,
  }
}

const initialResponses = (paper) =>
  paper.questions.map((question) => ({
    questionId: question.questionId,
    selectedOption: null,
    markedForReview: false,
    visited: false,
    timeSpentMs: 0,
    seq: 0,
    updatedAt: null,
  }))

const paperTotals = (paper) => ({
  questionCount: paper.questions.length,
  totalMarks: paper.questions.reduce(
    (total, question) => total + question.marks.correct,
    0
  ),
})

module.exports = {
  NeetTestConfigurationError,
  availabilityFor,
  buildPaper,
  computeTestTotals,
  initialResponses,
  paperTotals,
  sectionMarking,
  seededShuffle,
}
