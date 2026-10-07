const { z } = require("zod")

const {
  catalogCourseListResponseSchema,
  catalogQueryOpenApiSchema,
} = require("./catalog")
const { requestIdSchema } = require("./common")
const { apiErrorResponseSchema } = require("./errors")
const { contractSchemas } = require("./registry")

const toJsonSchema = (schema) =>
  z.toJSONSchema(schema, { target: "draft-2020-12" })

const toComponentSchema = (schema) => {
  const { $schema: _jsonSchemaDialect, ...component } = toJsonSchema(schema)
  return component
}

const withRequestIdResponseHeader = (response) => ({
  ...response,
  headers: {
    "x-request-id": { $ref: "#/components/headers/RequestId" },
  },
})

const errorResponse = (description) =>
  withRequestIdResponseHeader({
    description,
    content: {
      "application/json": {
        schema: { $ref: "#/components/schemas/ApiErrorResponse" },
      },
    },
  })

const learningErrorResponses = () => ({
  400: errorResponse("The learning route parameters or request are invalid."),
  401: errorResponse("Authentication is required or the session is invalid."),
  403: errorResponse("The learner is not entitled to this course."),
  404: errorResponse("The course or lesson does not exist for this learner."),
  413: errorResponse("The request payload is too large."),
  415: errorResponse("The request media type is not supported."),
  423: errorResponse("Account deletion is pending."),
  428: errorResponse("Current policies must be accepted."),
  429: errorResponse("The global API rate limit was exceeded."),
  500: errorResponse("The learning state could not be read or updated."),
})

const neetErrorResponses = ({ authenticated = true } = {}) => ({
  400: errorResponse("The Project NEET request is invalid."),
  ...(authenticated
    ? {
        401: errorResponse(
          "Authentication is required or the session is invalid."
        ),
        403: errorResponse("Project NEET attempts require a student account."),
      }
    : {}),
  404: errorResponse("The test or attempt does not exist for this student."),
  ...(authenticated
    ? {
        409: errorResponse(
          "The attempt state or exam session does not allow this operation."
        ),
        413: errorResponse("The request payload is too large."),
        415: errorResponse("The request media type is not supported."),
        423: errorResponse("Account deletion is pending."),
        428: errorResponse("Current policies must be accepted."),
      }
    : {}),
  429: errorResponse("A Project NEET rate limit was exceeded."),
  500: errorResponse("The Project NEET request could not be completed."),
})

const neetPathParameter = (name, description) => ({
  name,
  in: "path",
  required: true,
  description,
  schema: { $ref: "#/components/schemas/ObjectId" },
})

const neetAttemptParameter = neetPathParameter(
  "attemptId",
  "Project NEET attempt ObjectId owned by the current student."
)

const neetOperation = ({
  authenticated = true,
  description,
  operationId,
  parameters = [],
  requestRef,
  responseRef,
  status = 200,
  summary,
}) => ({
  operationId,
  summary,
  ...(authenticated ? { security: [{ SessionCookie: [] }] } : {}),
  parameters: [{ $ref: "#/components/parameters/RequestId" }, ...parameters],
  ...(requestRef
    ? {
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: `#/components/schemas/${requestRef}` },
            },
          },
        },
      }
    : {}),
  responses: {
    [status]: withRequestIdResponseHeader({
      description,
      content: {
        "application/json": {
          schema: { $ref: `#/components/schemas/${responseRef}` },
        },
      },
    }),
    ...neetErrorResponses({ authenticated }),
  },
})

const createNeetPaths = () => ({
  "/api/v2/project-neet/tests": {
    get: neetOperation({
      authenticated: false,
      operationId: "listNeetTests",
      summary: "List published Project NEET mock tests",
      description: "Published, student-safe mock test summaries.",
      responseRef: "NeetTestListResponse",
    }),
  },
  "/api/v2/project-neet/tests/{testId}": {
    get: neetOperation({
      authenticated: false,
      operationId: "getNeetTest",
      summary: "Get a published Project NEET mock test",
      description: "Instructions, pattern, and disclosed proctor policy.",
      parameters: [neetPathParameter("testId", "Published mock ObjectId.")],
      responseRef: "NeetTestDetailResponse",
    }),
  },
  "/api/v2/project-neet/attempts": {
    get: {
      ...neetOperation({
        operationId: "listNeetAttempts",
        summary: "List the current student's recent Project NEET attempts",
        description: "Recent attempts, newest first.",
        responseRef: "NeetAttemptListResponse",
      }),
      parameters: [
        { $ref: "#/components/parameters/RequestId" },
        {
          name: "testId",
          in: "query",
          required: false,
          description: "Optional mock test ObjectId filter.",
          schema: { $ref: "#/components/schemas/ObjectId" },
        },
      ],
    },
    post: neetOperation({
      operationId: "registerNeetAttempt",
      summary: "Register a candidate attempt or return the open attempt",
      description: "The registered or already open attempt.",
      requestRef: "NeetCreateAttemptRequest",
      responseRef: "NeetAttemptResponse",
    }),
  },
  "/api/v2/project-neet/attempts/{attemptId}": {
    get: neetOperation({
      operationId: "getNeetAttempt",
      summary: "Get an owned attempt and finalize it if time has expired",
      description: "The authoritative attempt state and server time.",
      parameters: [neetAttemptParameter],
      responseRef: "NeetAttemptResponse",
    }),
    patch: neetOperation({
      operationId: "updateNeetAttempt",
      summary: "Edit candidate details or exam mode before the exam starts",
      description: "The updated attempt.",
      parameters: [neetAttemptParameter],
      requestRef: "NeetUpdateAttemptRequest",
      responseRef: "NeetAttemptResponse",
    }),
  },
  "/api/v2/project-neet/attempts/{attemptId}/ready": {
    post: neetOperation({
      operationId: "markNeetAttemptReady",
      summary: "Record instructions, proctor consent, and system check",
      description: "The ready attempt.",
      parameters: [neetAttemptParameter],
      requestRef: "NeetReadyRequest",
      responseRef: "NeetAttemptResponse",
    }),
  },
  "/api/v2/project-neet/attempts/{attemptId}/start": {
    post: neetOperation({
      operationId: "startNeetAttempt",
      summary: "Idempotently start a ready attempt and claim the exam session",
      description: "The student-safe paper, saved responses, and timer.",
      parameters: [neetAttemptParameter],
      requestRef: "NeetSessionRequest",
      responseRef: "NeetExamSessionResponse",
    }),
  },
  "/api/v2/project-neet/attempts/{attemptId}/session": {
    post: neetOperation({
      operationId: "resumeNeetAttempt",
      summary: "Resume an in-progress attempt and claim the exam session",
      description: "The student-safe paper, saved responses, and timer.",
      parameters: [neetAttemptParameter],
      requestRef: "NeetSessionRequest",
      responseRef: "NeetExamSessionResponse",
    }),
  },
  "/api/v2/project-neet/attempts/{attemptId}/responses": {
    put: neetOperation({
      operationId: "saveNeetResponses",
      summary: "Autosave sequenced responses; stale writes are ignored",
      description: "The authoritative state of the written questions.",
      parameters: [neetAttemptParameter],
      requestRef: "NeetSaveResponsesRequest",
      responseRef: "NeetSaveResponsesResponse",
    }),
  },
  "/api/v2/project-neet/attempts/{attemptId}/heartbeat": {
    post: neetOperation({
      operationId: "neetAttemptHeartbeat",
      summary: "Report session liveness and read authoritative time",
      description: "Server time, expiry, and session ownership.",
      parameters: [neetAttemptParameter],
      requestRef: "NeetSessionRequest",
      responseRef: "NeetHeartbeatResponse",
    }),
  },
  "/api/v2/project-neet/attempts/{attemptId}/proctor-events": {
    post: neetOperation({
      operationId: "recordNeetProctorEvents",
      summary: "Record proctor signals and apply the server warning policy",
      description: "Accepted events, new warnings, and attempt status.",
      parameters: [neetAttemptParameter],
      requestRef: "NeetProctorEventBatchRequest",
      responseRef: "NeetProctorEventResponse",
    }),
  },
  "/api/v2/project-neet/attempts/{attemptId}/submit": {
    post: neetOperation({
      operationId: "submitNeetAttempt",
      summary: "Idempotently submit and score an attempt",
      description: "The final, server-scored result.",
      parameters: [neetAttemptParameter],
      requestRef: "NeetSubmitRequest",
      responseRef: "NeetResultResponse",
    }),
  },
  "/api/v2/project-neet/attempts/{attemptId}/result": {
    get: neetOperation({
      operationId: "getNeetResult",
      summary: "Get the immutable result of a finalized attempt",
      description: "The final, server-scored result.",
      parameters: [neetAttemptParameter],
      responseRef: "NeetResultResponse",
    }),
  },
})

const createOpenApiDocument = () => {
  const queryShape = catalogQueryOpenApiSchema.shape
  const descriptions = {
    q: "Full-text course search. Defaults sorting to relevance.",
    categoryId: "Exact category ObjectId.",
    level: "Canonical lowercase course level.",
    language: "BCP-47 course language code; normalized to lowercase.",
    minPrice: "Inclusive minimum price in INR major units.",
    maxPrice: "Inclusive maximum price in INR major units.",
    minRating: "Inclusive minimum canonical average rating.",
    minDurationSeconds: "Inclusive minimum derived curriculum duration.",
    maxDurationSeconds: "Inclusive maximum derived curriculum duration.",
    sort: "Stable cursor sort. relevance requires q.",
    limit: "Page size, from 1 through 50.",
    cursor: "Opaque cursor returned by the previous page.",
  }

  const parameters = [
    { $ref: "#/components/parameters/RequestId" },
    ...Object.entries(queryShape).map(([name, schema]) => ({
      name,
      in: "query",
      required: false,
      description: descriptions[name],
      schema: toJsonSchema(schema),
    })),
  ]

  return {
    openapi: "3.1.0",
    info: {
      title: "StudyNotion API",
      version: "2.0.0",
    },
    paths: {
      "/api/v2/courses": {
        get: {
          operationId: "listCatalogCourses",
          summary: "List published catalog courses",
          security: [],
          parameters,
          responses: {
            200: withRequestIdResponseHeader({
              description: "A cursor-paginated published course page.",
              content: {
                "application/json": {
                  schema: toJsonSchema(catalogCourseListResponseSchema),
                },
              },
            }),
            400: withRequestIdResponseHeader({
              description: "The query or cursor is invalid.",
              content: {
                "application/json": {
                  schema: toJsonSchema(apiErrorResponseSchema),
                },
              },
            }),
            403: withRequestIdResponseHeader({
              description: "The browser origin is not trusted.",
              content: {
                "application/json": {
                  schema: toJsonSchema(apiErrorResponseSchema),
                },
              },
            }),
            404: withRequestIdResponseHeader({
              description: "The v2 route does not exist.",
              content: {
                "application/json": {
                  schema: toJsonSchema(apiErrorResponseSchema),
                },
              },
            }),
            413: withRequestIdResponseHeader({
              description: "The request payload is too large.",
              content: {
                "application/json": {
                  schema: toJsonSchema(apiErrorResponseSchema),
                },
              },
            }),
            415: withRequestIdResponseHeader({
              description: "The request media type is not supported.",
              content: {
                "application/json": {
                  schema: toJsonSchema(apiErrorResponseSchema),
                },
              },
            }),
            429: withRequestIdResponseHeader({
              description: "The global API rate limit was exceeded.",
              content: {
                "application/json": {
                  schema: toJsonSchema(apiErrorResponseSchema),
                },
              },
            }),
            500: withRequestIdResponseHeader({
              description: "The catalog could not be read.",
              content: {
                "application/json": {
                  schema: toJsonSchema(apiErrorResponseSchema),
                },
              },
            }),
          },
        },
      },
      "/api/v2/learning/courses/{courseId}": {
        get: {
          operationId: "getLearningCourse",
          summary: "Get an enrolled student's course learning state",
          security: [{ SessionCookie: [] }],
          parameters: [
            { $ref: "#/components/parameters/RequestId" },
            {
              name: "courseId",
              in: "path",
              required: true,
              description: "Enrolled course ObjectId.",
              schema: { $ref: "#/components/schemas/ObjectId" },
            },
          ],
          responses: {
            200: withRequestIdResponseHeader({
              description:
                "The current curriculum and canonical learner progress.",
              content: {
                "application/json": {
                  schema: {
                    $ref: "#/components/schemas/LearningCourseResponse",
                  },
                },
              },
            }),
            ...learningErrorResponses(),
          },
        },
      },
      "/api/v2/learning/courses/{courseId}/lessons/{lessonId}/progress": {
        put: {
          operationId: "markLearningLessonComplete",
          summary: "Idempotently mark an enrolled course lesson complete",
          security: [{ SessionCookie: [] }],
          parameters: [
            { $ref: "#/components/parameters/RequestId" },
            {
              name: "courseId",
              in: "path",
              required: true,
              description: "Enrolled course ObjectId.",
              schema: { $ref: "#/components/schemas/ObjectId" },
            },
            {
              name: "lessonId",
              in: "path",
              required: true,
              description: "Lesson ObjectId in the current curriculum.",
              schema: { $ref: "#/components/schemas/ObjectId" },
            },
          ],
          responses: {
            200: withRequestIdResponseHeader({
              description: "The canonical progress after completion.",
              content: {
                "application/json": {
                  schema: {
                    $ref: "#/components/schemas/LearningProgressResponse",
                  },
                },
              },
            }),
            ...learningErrorResponses(),
          },
        },
      },
      ...createNeetPaths(),
    },
    components: {
      securitySchemes: {
        SessionCookie: {
          type: "apiKey",
          in: "cookie",
          name: "studynotion_session",
          description:
            "HttpOnly session cookie. Deployments may configure its name.",
        },
      },
      headers: {
        RequestId: {
          description: "Correlation ID for this response.",
          required: true,
          schema: toComponentSchema(requestIdSchema),
        },
      },
      parameters: {
        RequestId: {
          name: "x-request-id",
          in: "header",
          required: false,
          description:
            "Optional caller correlation ID. Invalid values are replaced.",
          schema: toComponentSchema(requestIdSchema),
        },
      },
      schemas: Object.fromEntries(
        Object.entries(contractSchemas).map(([name, schema]) => [
          name,
          toComponentSchema(schema),
        ])
      ),
    },
  }
}

const serializeOpenApiDocument = () =>
  `${JSON.stringify(createOpenApiDocument(), null, 2)}\n`

module.exports = { createOpenApiDocument, serializeOpenApiDocument }
