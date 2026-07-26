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
    },
    components: {
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
