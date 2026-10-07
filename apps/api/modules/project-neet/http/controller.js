const {
  neetAttemptListResponseSchema,
  neetAttemptResponseSchema,
  neetExamSessionResponseSchema,
  neetHeartbeatResponseSchema,
  neetProctorEventResponseSchema,
  neetResultResponseSchema,
  neetSaveResponsesResponseSchema,
  neetTestDetailResponseSchema,
  neetTestListResponseSchema,
} = require("@studynotion/contracts/neet")

const { sendV2Error } = require("../../../shared/http/v2ErrorEnvelope")
const { NeetApiError } = require("../domain/errors")

const SLOW_REQUEST_MS = 1_000
const PRIVATE_CACHE = "private, no-store"
const PUBLIC_CACHE = "public, max-age=30"
const TRANSIENT_DATABASE_ERROR =
  /^(?:Mongo(?:ose)?ServerSelectionError|MongoNetworkError|MongoNetworkTimeoutError|MongoNotConnectedError|MongoWaitQueueTimeoutError|MongoServerClosedError)$/

const createNeetController = ({ logger, services }) => {
  const execute =
    ({ cacheControl = PRIVATE_CACHE, event, operation, schema }) =>
    async (req, res) => {
      const requestId = req.requestId || "unknown"
      const startedAt = performance.now()
      try {
        const { data, statusCode = 200 } = await operation({
          input: res.locals.v2Input || {},
          userId: req.user?.id,
        })
        const parsed = schema.safeParse({ success: true, requestId, data })
        if (!parsed.success) {
          logger.error(`${event}.response_invalid`, {
            requestId,
            issues: parsed.error.issues.slice(0, 5).map((issue) => ({
              code: issue.code,
              path: issue.path.map(String).join("."),
            })),
          })
          return sendV2Error(req, res, {
            code: "NEET_RESPONSE_INVALID",
            message: "Project NEET could not prepare this response",
            statusCode: 500,
          })
        }
        const durationMs = Math.round(performance.now() - startedAt)
        if (durationMs >= SLOW_REQUEST_MS) {
          logger.warn(`${event}.slow`, { requestId, durationMs })
        }
        res.setHeader("Cache-Control", cacheControl)
        return res.status(statusCode).json(parsed.data)
      } catch (error) {
        if (error instanceof NeetApiError) {
          if (error.statusCode >= 500) {
            logger.warn(`${event}.unavailable`, { requestId, code: error.code })
          }
          return sendV2Error(req, res, error)
        }
        if (TRANSIENT_DATABASE_ERROR.test(String(error?.name || ""))) {
          logger.error(`${event}.database_unavailable`, {
            requestId,
            errorType: String(error?.name || "Error"),
          })
          return sendV2Error(req, res, {
            code: "NEET_SERVICE_UNAVAILABLE",
            message:
              "Project NEET is temporarily unavailable. Please retry in a moment.",
            statusCode: 503,
          })
        }
        logger.error(`${event}.failed`, {
          requestId,
          errorType: String(error?.name || "Error"),
        })
        return sendV2Error(req, res, {
          code: "NEET_UNAVAILABLE",
          message:
            "Project NEET could not complete this request. Please retry.",
          statusCode: 500,
        })
      }
    }

  const attempts = services.attempts
  const paramsWith = (input, extra = {}) => ({
    attemptId: input.params.attemptId,
    ...extra,
  })

  return {
    listTests: execute({
      cacheControl: PUBLIC_CACHE,
      event: "neet.tests.list",
      schema: neetTestListResponseSchema,
      operation: async () => ({ data: await services.tests.listTests() }),
    }),
    getTest: execute({
      cacheControl: PUBLIC_CACHE,
      event: "neet.tests.detail",
      schema: neetTestDetailResponseSchema,
      operation: async ({ input }) => ({
        data: await services.tests.getTest({ testId: input.params.testId }),
      }),
    }),
    listAttempts: execute({
      event: "neet.attempts.list",
      schema: neetAttemptListResponseSchema,
      operation: async ({ input, userId }) => ({
        data: await attempts.listAttempts({
          testId: input.query.testId,
          userId,
        }),
      }),
    }),
    register: execute({
      event: "neet.attempts.register",
      schema: neetAttemptResponseSchema,
      operation: async ({ input, userId }) => {
        const { attempt, created } = await attempts.register({
          candidate: input.body.candidate,
          testId: input.body.testId,
          userId,
        })
        return { data: attempt, statusCode: created ? 201 : 200 }
      },
    }),
    getAttempt: execute({
      event: "neet.attempts.detail",
      schema: neetAttemptResponseSchema,
      operation: async ({ input, userId }) => ({
        data: await attempts.getAttempt(paramsWith(input, { userId })),
      }),
    }),
    updateAttempt: execute({
      event: "neet.attempts.update",
      schema: neetAttemptResponseSchema,
      operation: async ({ input, userId }) => ({
        data: await attempts.update(
          paramsWith(input, {
            candidate: input.body.candidate,
            mode: input.body.mode,
            userId,
          })
        ),
      }),
    }),
    markReady: execute({
      event: "neet.attempts.ready",
      schema: neetAttemptResponseSchema,
      operation: async ({ input, userId }) => ({
        data: await attempts.markReady(
          paramsWith(input, {
            proctorConsent: input.body.proctorConsent,
            systemCheck: input.body.systemCheck,
            userId,
          })
        ),
      }),
    }),
    start: execute({
      event: "neet.attempts.start",
      schema: neetExamSessionResponseSchema,
      operation: async ({ input, userId }) => ({
        data: await attempts.start(
          paramsWith(input, { sessionId: input.body.sessionId, userId })
        ),
      }),
    }),
    resume: execute({
      event: "neet.attempts.resume",
      schema: neetExamSessionResponseSchema,
      operation: async ({ input, userId }) => ({
        data: await attempts.resume(
          paramsWith(input, { sessionId: input.body.sessionId, userId })
        ),
      }),
    }),
    saveResponses: execute({
      event: "neet.attempts.autosave",
      schema: neetSaveResponsesResponseSchema,
      operation: async ({ input, userId }) => ({
        data: await attempts.saveResponses(
          paramsWith(input, {
            responses: input.body.responses,
            sessionId: input.body.sessionId,
            userId,
          })
        ),
      }),
    }),
    heartbeat: execute({
      event: "neet.attempts.heartbeat",
      schema: neetHeartbeatResponseSchema,
      operation: async ({ input, userId }) => ({
        data: await attempts.heartbeat(
          paramsWith(input, { sessionId: input.body.sessionId, userId })
        ),
      }),
    }),
    recordProctorEvents: execute({
      event: "neet.proctor.events",
      schema: neetProctorEventResponseSchema,
      operation: async ({ input, userId }) => ({
        data: await services.proctor.recordEvents(
          paramsWith(input, {
            events: input.body.events,
            sessionId: input.body.sessionId,
            userId,
          })
        ),
      }),
    }),
    submit: execute({
      event: "neet.attempts.submit",
      schema: neetResultResponseSchema,
      operation: async ({ input, userId }) => ({
        data: await attempts.submit(
          paramsWith(input, {
            reason: input.body.reason,
            sessionId: input.body.sessionId,
            userId,
          })
        ),
      }),
    }),
    getResult: execute({
      event: "neet.attempts.result",
      schema: neetResultResponseSchema,
      operation: async ({ input, userId }) => ({
        data: await attempts.getResult(paramsWith(input, { userId })),
      }),
    }),
  }
}

module.exports = { createNeetController }
