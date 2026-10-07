const { NEET_SCORING_VERSION } = require("../config/defaults")

class NeetScoringDataError extends Error {
  constructor(message) {
    super(message)
    this.name = "NeetScoringDataError"
  }
}

const round2 = (value) => Math.round(value * 100) / 100

const idOf = (value) => String(value)

// Scores frozen responses against server-held answer keys. Every input comes
// from the attempt snapshot or the database; nothing here trusts the client.
// A question whose key is missing aborts scoring so an attempt can never be
// finalized with a silently wrong result.
const scoreAttempt = ({ answerKeys, endedAt, paper, responses, startedAt }) => {
  const responseByQuestion = new Map(
    (responses || []).map((response) => [idOf(response.questionId), response])
  )
  const sectionTotals = new Map(
    paper.sections.map((section) => [
      section.key,
      {
        key: section.key,
        title: section.title,
        subjectKey: section.subjectKey,
        subjectLabel: section.subjectLabel,
        questionCount: 0,
        attempted: 0,
        correct: 0,
        incorrect: 0,
        unanswered: 0,
        score: 0,
        maxScore: 0,
      },
    ])
  )

  const totals = {
    score: 0,
    maxScore: 0,
    questionCount: 0,
    attempted: 0,
    correct: 0,
    incorrect: 0,
    unanswered: 0,
    markedForReview: 0,
    positiveMarks: 0,
    negativeMarks: 0,
  }
  const questions = []

  for (const question of paper.questions) {
    const questionId = idOf(question.questionId)
    const key = answerKeys.get(questionId)
    if (
      !key ||
      !Array.isArray(key.correctOptionKeys) ||
      !key.correctOptionKeys.length
    ) {
      throw new NeetScoringDataError("An answer key is missing for the paper")
    }
    const section = sectionTotals.get(question.sectionKey)
    if (!section) {
      throw new NeetScoringDataError("A paper question has an unknown section")
    }
    const response = responseByQuestion.get(questionId)
    const selectedOption = response?.selectedOption || null
    const markedForReview = response?.markedForReview === true
    const correctMarks = Number(question.marks.correct)
    const incorrectMarks = Number(question.marks.incorrect)
    const unansweredMarks = Number(question.marks.unanswered || 0)

    let outcome
    let marksAwarded
    if (!selectedOption) {
      outcome = "UNANSWERED"
      marksAwarded = unansweredMarks
    } else if (key.correctOptionKeys.includes(selectedOption)) {
      outcome = "CORRECT"
      marksAwarded = correctMarks
    } else {
      outcome = "INCORRECT"
      marksAwarded = incorrectMarks
    }

    totals.questionCount += 1
    totals.maxScore += correctMarks
    totals.score += marksAwarded
    if (marksAwarded > 0) totals.positiveMarks += marksAwarded
    if (marksAwarded < 0) totals.negativeMarks += marksAwarded
    if (markedForReview) totals.markedForReview += 1
    section.questionCount += 1
    section.maxScore += correctMarks
    section.score += marksAwarded

    if (outcome === "UNANSWERED") {
      totals.unanswered += 1
      section.unanswered += 1
    } else {
      totals.attempted += 1
      section.attempted += 1
      if (outcome === "CORRECT") {
        totals.correct += 1
        section.correct += 1
      } else {
        totals.incorrect += 1
        section.incorrect += 1
      }
    }

    questions.push({
      questionId: question.questionId,
      revision: question.revision,
      sectionKey: question.sectionKey,
      number: question.number,
      selectedOption,
      correctOptionKeys: [...key.correctOptionKeys],
      outcome,
      marksAwarded: round2(marksAwarded),
      markedForReview,
      timeSpentMs: response?.timeSpentMs || 0,
    })
  }

  const durationUsedSeconds =
    startedAt && endedAt
      ? Math.max(
          0,
          Math.round((new Date(endedAt) - new Date(startedAt)) / 1000)
        )
      : 0

  return {
    scoringVersion: NEET_SCORING_VERSION,
    summary: {
      score: round2(totals.score),
      maxScore: round2(totals.maxScore),
      questionCount: totals.questionCount,
      attempted: totals.attempted,
      correct: totals.correct,
      incorrect: totals.incorrect,
      unanswered: totals.unanswered,
      markedForReview: totals.markedForReview,
      accuracyPercent: totals.attempted
        ? round2((totals.correct / totals.attempted) * 100)
        : 0,
      durationUsedSeconds,
      positiveMarks: round2(totals.positiveMarks),
      negativeMarks: round2(totals.negativeMarks),
    },
    sections: [...sectionTotals.values()].map((section) => ({
      ...section,
      score: round2(section.score),
      maxScore: round2(section.maxScore),
    })),
    questions,
  }
}

module.exports = { NeetScoringDataError, scoreAttempt }
