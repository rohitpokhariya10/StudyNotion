import { z } from "zod"

import {
  catalogCourseListResponseSchema,
  catalogQueryOpenApiSchema,
} from "./catalog"
import { apiErrorResponseSchema } from "./errors"

export const createOpenApiDocument = () => {
  const queryShape = catalogQueryOpenApiSchema.shape
  const descriptions: Record<keyof typeof queryShape, string> = {
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

  const parameters = Object.entries(queryShape).map(([name, schema]) => ({
    name,
    in: "query",
    required: false,
    description: descriptions[name as keyof typeof queryShape],
    schema: z.toJSONSchema(schema, { target: "draft-2020-12" }),
  }))

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
            "200": {
              description: "A cursor-paginated published course page.",
              content: {
                "application/json": {
                  schema: z.toJSONSchema(catalogCourseListResponseSchema, {
                    target: "draft-2020-12",
                  }),
                },
              },
            },
            "400": {
              description: "The query or cursor is invalid.",
              content: {
                "application/json": {
                  schema: z.toJSONSchema(apiErrorResponseSchema, {
                    target: "draft-2020-12",
                  }),
                },
              },
            },
            "403": {
              description: "The browser origin is not trusted.",
              content: {
                "application/json": {
                  schema: z.toJSONSchema(apiErrorResponseSchema, {
                    target: "draft-2020-12",
                  }),
                },
              },
            },
            "404": {
              description: "The v2 route does not exist.",
              content: {
                "application/json": {
                  schema: z.toJSONSchema(apiErrorResponseSchema, {
                    target: "draft-2020-12",
                  }),
                },
              },
            },
            "413": {
              description: "The request payload is too large.",
              content: {
                "application/json": {
                  schema: z.toJSONSchema(apiErrorResponseSchema, {
                    target: "draft-2020-12",
                  }),
                },
              },
            },
            "429": {
              description: "The global API rate limit was exceeded.",
              content: {
                "application/json": {
                  schema: z.toJSONSchema(apiErrorResponseSchema, {
                    target: "draft-2020-12",
                  }),
                },
              },
            },
            "500": {
              description: "The catalog could not be read.",
              content: {
                "application/json": {
                  schema: z.toJSONSchema(apiErrorResponseSchema, {
                    target: "draft-2020-12",
                  }),
                },
              },
            },
          },
        },
      },
    },
  } as const
}

export const serializeOpenApiDocument = () =>
  `${JSON.stringify(createOpenApiDocument(), null, 2)}\n`
