// Student-facing presentation for API failures. Raw browser or server details
// are never shown; codes map to specific, calm guidance.
const MESSAGES = Object.freeze({
  NETWORK_ERROR: {
    title: "You appear to be offline",
    message: "Check your internet connection and try again.",
  },
  NETWORK_TIMEOUT: {
    title: "The server is taking too long",
    message: "Your connection may be slow. Please try again in a moment.",
  },
  NEET_SERVICE_UNAVAILABLE: {
    title: "NEET Mocks are briefly unavailable",
    message: "We are reconnecting to our servers. Please retry in a moment.",
  },
  NEET_TEST_NOT_FOUND: {
    title: "This mock isn't available",
    message: "It may have been withdrawn. Pick another mock to continue.",
  },
  NEET_TEST_UNAVAILABLE: {
    title: "This mock isn't open right now",
    message: "Check its availability window or choose another mock.",
  },
  NEET_TEST_NOT_READY: {
    title: "This mock is still being prepared",
    message: "Its questions aren't ready yet. Please try another mock.",
  },
  NEET_ATTEMPT_NOT_FOUND: {
    title: "We couldn't find this attempt",
    message: "It may belong to a different account. Start from the mock list.",
  },
  NEET_ATTEMPT_EXPIRED: {
    title: "This registration has expired",
    message:
      "Registrations close if the exam isn't started in time. Register again to begin.",
  },
  NEET_ATTEMPT_SUBMITTED: {
    title: "This attempt is already submitted",
    message: "Your result is ready to view.",
  },
  NEET_SESSION_SUPERSEDED: {
    title: "This exam is open somewhere else",
    message: "The attempt moved to another tab or window.",
  },
  RATE_LIMITED: {
    title: "Too many requests",
    message: "Please wait a few seconds and try again.",
  },
  UNAUTHORIZED: {
    title: "Please sign in again",
    message: "Your Prahit session has ended.",
  },
  FORBIDDEN: {
    title: "NEET Mocks need a student account",
    message: "Sign in with a Prahit student account to attempt mocks.",
  },
  RESPONSE_CONTRACT_MISMATCH: {
    title: "Something didn't load correctly",
    message: "Please refresh the page. If this continues, contact support.",
  },
})

export const describeNeetError = (error, fallback = {}) => {
  const preset =
    MESSAGES[error?.code] ||
    (error?.status === 401 ? MESSAGES.UNAUTHORIZED : null) ||
    (error?.status === 403 ? MESSAGES.FORBIDDEN : null) ||
    (error?.status === 429 ? MESSAGES.RATE_LIMITED : null)
  return {
    title: preset?.title || fallback.title || "We couldn't complete that",
    message:
      preset?.message ||
      (error?.status && error.status < 500 && error?.message) ||
      fallback.message ||
      "Please try again in a moment.",
    requestId: error?.requestId || null,
    code: error?.code || null,
  }
}
