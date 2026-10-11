class NeetApiError extends Error {
  constructor(code, message, statusCode = 500) {
    super(message)
    this.name = "NeetApiError"
    this.code = code
    this.statusCode = statusCode
  }
}

// Stable, student-safe error vocabulary. Ownership failures intentionally use
// the same not-found response as missing attempts so IDs cannot be probed.
const neetErrors = Object.freeze({
  testNotFound: () =>
    new NeetApiError(
      "NEET_TEST_NOT_FOUND",
      "This mock test is not available",
      404
    ),
  testUnavailable: () =>
    new NeetApiError(
      "NEET_TEST_UNAVAILABLE",
      "This mock test is not open for attempts right now",
      409
    ),
  testNotReady: () =>
    new NeetApiError(
      "NEET_TEST_NOT_READY",
      "This mock test is still being prepared. Please try another mock.",
      409
    ),
  attemptNotFound: () =>
    new NeetApiError(
      "NEET_ATTEMPT_NOT_FOUND",
      "This attempt was not found",
      404
    ),
  attemptLocked: () =>
    new NeetApiError(
      "NEET_ATTEMPT_LOCKED",
      "Candidate details and mode cannot change after the exam has started",
      409
    ),
  attemptNotReady: () =>
    new NeetApiError(
      "NEET_ATTEMPT_NOT_READY",
      "Complete the instructions and system check before starting",
      409
    ),
  attemptNotStarted: () =>
    new NeetApiError(
      "NEET_ATTEMPT_NOT_STARTED",
      "This exam has not started yet",
      409
    ),
  attemptSubmitted: () =>
    new NeetApiError(
      "NEET_ATTEMPT_SUBMITTED",
      "This attempt has already been submitted",
      409
    ),
  attemptExpired: () =>
    new NeetApiError(
      "NEET_ATTEMPT_EXPIRED",
      "This registration expired before the exam was started",
      409
    ),
  attemptNotExpired: () =>
    new NeetApiError(
      "NEET_ATTEMPT_NOT_EXPIRED",
      "The exam timer has not finished on the server yet",
      409
    ),
  modeRequired: () =>
    new NeetApiError("NEET_MODE_REQUIRED", "Choose an exam mode first", 409),
  modeUnavailable: () =>
    new NeetApiError(
      "NEET_MODE_UNAVAILABLE",
      "This exam mode is not available for this mock",
      409
    ),
  consentRequired: () =>
    new NeetApiError(
      "NEET_CONSENT_REQUIRED",
      "Proctored mode requires consent to the current monitoring notice",
      409
    ),
  adultConfirmationRequired: () =>
    new NeetApiError(
      "NEET_ADULT_CONFIRMATION_REQUIRED",
      "Monitored mode is available only to candidates aged 18 or over. Practice mode is open to everyone.",
      409
    ),
  systemCheckIncomplete: () =>
    new NeetApiError(
      "NEET_SYSTEM_CHECK_INCOMPLETE",
      "Complete the required system checks before continuing",
      409
    ),
  notProctored: () =>
    new NeetApiError(
      "NEET_NOT_PROCTORED",
      "Proctoring events apply only to proctored attempts",
      409
    ),
  sessionSuperseded: () =>
    new NeetApiError(
      "NEET_SESSION_SUPERSEDED",
      "This exam is open in another tab or window",
      409
    ),
  questionNotInPaper: () =>
    new NeetApiError(
      "NEET_QUESTION_NOT_IN_PAPER",
      "A response referenced a question outside this paper",
      400
    ),
  resultUnavailable: () =>
    new NeetApiError(
      "NEET_RESULT_UNAVAILABLE",
      "A result is not available for this attempt yet",
      409
    ),
  submissionPending: () =>
    new NeetApiError(
      "NEET_SUBMISSION_PENDING",
      "Your submission is being finalized. Please retry in a moment.",
      503
    ),
  conflict: () =>
    new NeetApiError(
      "NEET_ATTEMPT_CONFLICT",
      "The attempt changed while this request was processed. Please retry.",
      409
    ),
})

module.exports = { NeetApiError, neetErrors }
