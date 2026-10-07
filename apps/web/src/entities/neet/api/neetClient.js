import { neetEndpoints } from "@/shared/api/endpoints"
import { signalSessionResponseError } from "@/shared/api/httpClient"
import {
  neetAttemptListResponseSchema,
  neetAttemptResponseSchema,
  neetExamSessionResponseSchema,
  neetHeartbeatResponseSchema,
  neetProctorEventResponseSchema,
  neetResultResponseSchema,
  neetSaveResponsesResponseSchema,
  neetTestDetailResponseSchema,
  neetTestListResponseSchema,
} from "@studynotion/contracts/neet"

export const NEET_REQUEST_TIMEOUT_MS = 15_000

const RETRYABLE_STATUSES = new Set([0, 408, 425, 429, 500, 502, 503, 504])

export class NeetRequestError extends Error {
  constructor({
    code,
    message,
    requestId = null,
    retryAfterMs = null,
    status,
  }) {
    super(message)
    this.name = "NeetRequestError"
    this.status = status
    this.code = code
    this.requestId = requestId
    this.retryAfterMs = retryAfterMs
    this.retryable = RETRYABLE_STATUSES.has(status)
  }
}

const parseRetryAfter = (value) => {
  if (!value) return null
  const seconds = Number(value)
  if (Number.isFinite(seconds) && seconds >= 0)
    return Math.min(seconds, 300) * 1000
  const date = Date.parse(value)
  return Number.isFinite(date) ? Math.max(0, date - Date.now()) : null
}

const now = () =>
  typeof performance !== "undefined" ? performance.now() : Date.now()

// One credentialed request with a deadline. Responses are validated against
// the shared contract so the UI only ever handles the documented shape.
// `signalSession: false` lets the exam keep its screen (and queued answers)
// on a 401 instead of triggering the app-wide sign-out redirect.
const request = async ({
  body,
  method = "GET",
  schema,
  signal,
  signalSession = true,
  timeoutMs = NEET_REQUEST_TIMEOUT_MS,
  url,
}) => {
  const controller = new AbortController()
  const abortFromCaller = () => controller.abort(signal.reason)
  if (signal) {
    if (signal.aborted) abortFromCaller()
    else signal.addEventListener("abort", abortFromCaller, { once: true })
  }
  const timeout = setTimeout(() => controller.abort("timeout"), timeoutMs)
  const sentAt = now()

  let response
  try {
    response = await fetch(url, {
      method,
      credentials: "include",
      cache: "no-store",
      headers:
        body === undefined
          ? { accept: "application/json" }
          : {
              accept: "application/json",
              "content-type": "application/json",
            },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    })
  } catch (error) {
    if (signal?.aborted) throw error
    const timedOut = controller.signal.aborted
    throw new NeetRequestError({
      status: 0,
      code: timedOut ? "NETWORK_TIMEOUT" : "NETWORK_ERROR",
      message: timedOut
        ? "The server took too long to respond."
        : "We could not reach the server.",
    })
  } finally {
    clearTimeout(timeout)
    signal?.removeEventListener?.("abort", abortFromCaller)
  }
  const receivedAt = now()

  let payload = null
  try {
    payload = await response.json()
  } catch {
    payload = null
  }

  if (!response.ok) {
    const envelope = payload?.error
    if (signalSession) {
      signalSessionResponseError({
        response: { status: response.status, data: { code: envelope?.code } },
      })
    }
    throw new NeetRequestError({
      status: response.status,
      code:
        typeof envelope?.code === "string" ? envelope.code : "REQUEST_FAILED",
      message:
        typeof envelope?.message === "string" && envelope.message
          ? envelope.message
          : "The request could not be completed.",
      requestId:
        typeof envelope?.requestId === "string" ? envelope.requestId : null,
      retryAfterMs: parseRetryAfter(response.headers.get("retry-after")),
    })
  }

  const parsed = schema.safeParse(payload)
  if (!parsed.success) {
    throw new NeetRequestError({
      status: 500,
      code: "RESPONSE_CONTRACT_MISMATCH",
      message: "The server response was not in the expected format.",
      requestId:
        typeof payload?.requestId === "string" ? payload.requestId : null,
    })
  }
  return { data: parsed.data.data, timing: { sentAt, receivedAt } }
}

const dataOnly = async (options) => (await request(options)).data
const action = (attemptId, name) =>
  neetEndpoints.ATTEMPT_ACTION_API(attemptId, name)

export const neetClient = Object.freeze({
  listTests: ({ signal } = {}) =>
    dataOnly({
      url: neetEndpoints.TESTS_API,
      schema: neetTestListResponseSchema,
      signal,
    }),
  getTest: (testId, { signal } = {}) =>
    dataOnly({
      url: neetEndpoints.TEST_API(testId),
      schema: neetTestDetailResponseSchema,
      signal,
    }),
  listAttempts: ({ signal, testId } = {}) =>
    dataOnly({
      url: testId
        ? `${neetEndpoints.ATTEMPTS_API}?testId=${encodeURIComponent(testId)}`
        : neetEndpoints.ATTEMPTS_API,
      schema: neetAttemptListResponseSchema,
      signal,
    }),
  getAttempt: (attemptId, { signal, signalSession } = {}) =>
    dataOnly({
      url: neetEndpoints.ATTEMPT_API(attemptId),
      schema: neetAttemptResponseSchema,
      signal,
      signalSession,
    }),
  registerAttempt: ({ candidate, testId }) =>
    dataOnly({
      url: neetEndpoints.ATTEMPTS_API,
      method: "POST",
      body: { testId, candidate },
      schema: neetAttemptResponseSchema,
    }),
  updateAttempt: (attemptId, changes) =>
    dataOnly({
      url: neetEndpoints.ATTEMPT_API(attemptId),
      method: "PATCH",
      body: changes,
      schema: neetAttemptResponseSchema,
    }),
  markReady: (attemptId, body) =>
    dataOnly({
      url: action(attemptId, "ready"),
      method: "POST",
      body,
      schema: neetAttemptResponseSchema,
    }),
  // Exam-time calls keep timing for server-clock estimation and never trigger
  // the global sign-out redirect; the exam handles 401 in place.
  startAttempt: (attemptId, sessionId) =>
    request({
      url: action(attemptId, "start"),
      method: "POST",
      body: { sessionId },
      schema: neetExamSessionResponseSchema,
      signalSession: false,
    }),
  resumeAttempt: (attemptId, sessionId) =>
    request({
      url: action(attemptId, "session"),
      method: "POST",
      body: { sessionId },
      schema: neetExamSessionResponseSchema,
      signalSession: false,
    }),
  saveResponses: (attemptId, sessionId, responses) =>
    request({
      url: action(attemptId, "responses"),
      method: "PUT",
      body: { sessionId, responses },
      schema: neetSaveResponsesResponseSchema,
      signalSession: false,
    }),
  heartbeat: (attemptId, sessionId) =>
    request({
      url: action(attemptId, "heartbeat"),
      method: "POST",
      body: { sessionId },
      schema: neetHeartbeatResponseSchema,
      signalSession: false,
      timeoutMs: 10_000,
    }),
  recordProctorEvents: (attemptId, sessionId, events) =>
    request({
      url: action(attemptId, "proctor-events"),
      method: "POST",
      body: { sessionId, events },
      schema: neetProctorEventResponseSchema,
      signalSession: false,
    }),
  submitAttempt: (attemptId, sessionId, reason) =>
    request({
      url: action(attemptId, "submit"),
      method: "POST",
      body: { sessionId, reason },
      schema: neetResultResponseSchema,
      signalSession: false,
      timeoutMs: 30_000,
    }),
  getResult: (attemptId, { signal } = {}) =>
    dataOnly({
      url: action(attemptId, "result"),
      schema: neetResultResponseSchema,
      signal,
    }),
})
