export const QUESTION_STATE = Object.freeze({
  NOT_VISITED: "NOT_VISITED",
  NOT_ANSWERED: "NOT_ANSWERED",
  ANSWERED: "ANSWERED",
  MARKED_FOR_REVIEW: "MARKED_FOR_REVIEW",
  ANSWERED_AND_MARKED: "ANSWERED_AND_MARKED",
})

export const QUESTION_STATE_LABELS = Object.freeze({
  NOT_VISITED: "Not visited",
  NOT_ANSWERED: "Not answered",
  ANSWERED: "Answered",
  MARKED_FOR_REVIEW: "Marked for review",
  ANSWERED_AND_MARKED: "Answered & marked for review",
})

export const deriveQuestionState = (response) => {
  if (!response) return QUESTION_STATE.NOT_VISITED
  const answered = Boolean(response.selectedOption)
  if (answered && response.markedForReview)
    return QUESTION_STATE.ANSWERED_AND_MARKED
  if (response.markedForReview) return QUESTION_STATE.MARKED_FOR_REVIEW
  if (answered) return QUESTION_STATE.ANSWERED
  if (response.visited) return QUESTION_STATE.NOT_ANSWERED
  return QUESTION_STATE.NOT_VISITED
}

export const summarizeResponses = (questionIds, responsesById) => {
  const counts = {
    NOT_VISITED: 0,
    NOT_ANSWERED: 0,
    ANSWERED: 0,
    MARKED_FOR_REVIEW: 0,
    ANSWERED_AND_MARKED: 0,
  }
  for (const questionId of questionIds) {
    counts[deriveQuestionState(responsesById[questionId])] += 1
  }
  return {
    counts,
    total: questionIds.length,
    answered: counts.ANSWERED + counts.ANSWERED_AND_MARKED,
    unanswered:
      counts.NOT_VISITED + counts.NOT_ANSWERED + counts.MARKED_FOR_REVIEW,
    markedForReview: counts.MARKED_FOR_REVIEW + counts.ANSWERED_AND_MARKED,
  }
}
