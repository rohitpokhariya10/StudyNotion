const express = require("express")
const {
  neetAttemptListQuerySchema,
  neetAttemptParamsSchema,
  neetCreateAttemptRequestSchema,
  neetEmptyRequestSchema,
  neetProctorEventBatchRequestSchema,
  neetReadyRequestSchema,
  neetSaveResponsesRequestSchema,
  neetSessionRequestSchema,
  neetSubmitRequestSchema,
  neetTestParamsSchema,
  neetUpdateAttemptRequestSchema,
} = require("@studynotion/contracts/neet")

const { auth, isStudent } = require("../../../middleware/auth")
const {
  neetAttemptIpLimiter,
  neetAttemptSessionLimiter,
  neetAttemptUserLimiter,
  neetRegistrationLimiter,
} = require("../../../middleware/rateLimiters")
const { sendV2Error } = require("../../../shared/http/v2ErrorEnvelope")
const { validateV2Request } = require("../../../shared/http/validateV2Request")

const ATTEMPTS_PREFIX = "/project-neet/attempts"

// True for paths (relative to the /api/v2 mount) that this router serves with
// its own per-IP ceiling and per-student limits instead of the shared limiter.
const isProjectNeetAttemptPath = (path) => {
  const normalized = String(path || "").toLowerCase()
  return (
    normalized === ATTEMPTS_PREFIX ||
    normalized.startsWith(`${ATTEMPTS_PREFIX}/`)
  )
}

const createProjectNeetRouter = ({ controller, gates = {} }) => {
  const router = express.Router()
  const attemptGate = gates.attemptGate || [
    neetAttemptIpLimiter,
    auth,
    isStudent,
    neetAttemptUserLimiter,
    neetAttemptSessionLimiter,
  ]
  const registrationGate = gates.registrationGate || [neetRegistrationLimiter]

  const attemptRoute = (body) =>
    validateV2Request({
      params: neetAttemptParamsSchema,
      query: neetEmptyRequestSchema,
      ...(body ? { body } : {}),
    })

  router.get(
    "/tests",
    validateV2Request({ query: neetEmptyRequestSchema }),
    controller.listTests
  )
  router.get(
    "/tests/:testId",
    validateV2Request({
      params: neetTestParamsSchema,
      query: neetEmptyRequestSchema,
    }),
    controller.getTest
  )

  // Authentication and role gates run before any attempt input is parsed.
  router.use("/attempts", ...attemptGate)
  router.get(
    "/attempts",
    validateV2Request({ query: neetAttemptListQuerySchema }),
    controller.listAttempts
  )
  router.post(
    "/attempts",
    ...registrationGate,
    validateV2Request({
      query: neetEmptyRequestSchema,
      body: neetCreateAttemptRequestSchema,
    }),
    controller.register
  )
  router.get("/attempts/:attemptId", attemptRoute(), controller.getAttempt)
  router.patch(
    "/attempts/:attemptId",
    attemptRoute(neetUpdateAttemptRequestSchema),
    controller.updateAttempt
  )
  router.post(
    "/attempts/:attemptId/ready",
    attemptRoute(neetReadyRequestSchema),
    controller.markReady
  )
  router.post(
    "/attempts/:attemptId/start",
    attemptRoute(neetSessionRequestSchema),
    controller.start
  )
  router.post(
    "/attempts/:attemptId/session",
    attemptRoute(neetSessionRequestSchema),
    controller.resume
  )
  router.put(
    "/attempts/:attemptId/responses",
    attemptRoute(neetSaveResponsesRequestSchema),
    controller.saveResponses
  )
  router.post(
    "/attempts/:attemptId/heartbeat",
    attemptRoute(neetSessionRequestSchema),
    controller.heartbeat
  )
  router.post(
    "/attempts/:attemptId/proctor-events",
    attemptRoute(neetProctorEventBatchRequestSchema),
    controller.recordProctorEvents
  )
  router.post(
    "/attempts/:attemptId/submit",
    attemptRoute(neetSubmitRequestSchema),
    controller.submit
  )
  router.get(
    "/attempts/:attemptId/result",
    attemptRoute(),
    controller.getResult
  )

  // Terminal handler: nothing under /api/v2/project-neet may fall through to
  // later v2 routers, which would otherwise run without the shared limiter.
  router.use((req, res) =>
    sendV2Error(req, res, {
      code: "ROUTE_NOT_FOUND",
      message: "Route not found",
      statusCode: 404,
    })
  )

  return router
}

module.exports = { createProjectNeetRouter, isProjectNeetAttemptPath }
