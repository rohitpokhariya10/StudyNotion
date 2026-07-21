import { describe, expect, it } from "vitest"

import rootReducer from "../reducer"
import { API_V2_BASE_URL, deriveApiVersionBaseUrl } from "./apis"
import {
  buildCatalogQueryParams,
  catalogApi,
  catalogBaseQueryConfig,
  getCatalogErrorPresentation,
  parseCatalogResponse,
  parseCategoryResponse,
} from "./catalogApi"

const course = {
  id: "507f1f77bcf86cd799439011",
  name: "Production React",
  description: "Build resilient applications.",
  thumbnailUrl: "https://res.cloudinary.com/example/image/upload/course.webp",
  price: 1499,
  currency: "INR",
  instructor: {
    id: "507f191e810c19729de860ea",
    name: "Asha Rao",
    imageUrl: null,
  },
  category: {
    id: "507f1f77bcf86cd799439012",
    name: "Web Development",
  },
  rating: { average: 4.7, count: 18 },
  durationSeconds: 10800,
  level: "intermediate",
  language: "en",
  enrollmentCount: 245,
  createdAt: "2026-07-20T10:00:00.000Z",
}

describe("catalog API configuration", () => {
  it("derives v2 without changing the existing v1 base", () => {
    expect(
      deriveApiVersionBaseUrl("https://api.studynotion.test/api/v1/", "v2")
    ).toBe("https://api.studynotion.test/api/v2")
    expect(API_V2_BASE_URL).toMatch(/\/api\/v2$/)
    expect(() => deriveApiVersionBaseUrl("https://api.test/v1", "v2")).toThrow(
      "/api/v1"
    )
  })

  it("keeps cookie credentials, timeout, reducer, and middleware API isolated", () => {
    expect(catalogBaseQueryConfig).toMatchObject({
      credentials: "include",
      timeout: 15000,
    })
    expect(catalogApi.reducerPath).toBe("catalogApi")
    expect(rootReducer(undefined, { type: "test/init" })).toHaveProperty(
      "catalogApi"
    )
  })

  it("serializes normalized filters and an opaque cursor", () => {
    expect(
      buildCatalogQueryParams(
        {
          q: "  react   query  ",
          categoryId: "507f1f77bcf86cd799439012",
          level: "intermediate",
          language: "EN",
          minPrice: "500",
          maxPrice: "2000",
          minRating: "4",
          minDurationSeconds: "3600",
          maxDurationSeconds: "14400",
        },
        "cursor_2"
      )
    ).toEqual({
      q: "react query",
      categoryId: "507f1f77bcf86cd799439012",
      level: "intermediate",
      language: "en",
      minPrice: 500,
      maxPrice: 2000,
      minRating: 4,
      minDurationSeconds: 3600,
      maxDurationSeconds: 14400,
      sort: "relevance",
      limit: 12,
      cursor: "cursor_2",
    })
  })

  it("never sends relevance sorting without a search query", () => {
    expect(buildCatalogQueryParams({ sort: "relevance" })).toMatchObject({
      sort: "newest",
    })
  })
})

describe("catalog response boundaries", () => {
  it("accepts the stable success envelope without coercing pagination", () => {
    expect(
      parseCatalogResponse({
        success: true,
        requestId: "request-1",
        data: {
          items: [course],
          pageInfo: { endCursor: "next_cursor", hasNextPage: true },
        },
      })
    ).toEqual({
      items: [course],
      pageInfo: { endCursor: "next_cursor", hasNextPage: true },
    })
  })

  it("rejects malformed DTOs and non-boolean pagination", () => {
    expect(() =>
      parseCatalogResponse({
        success: true,
        requestId: "request-1",
        data: {
          items: [{ ...course, id: "not-an-object-id" }],
          pageInfo: { endCursor: null, hasNextPage: false },
        },
      })
    ).toThrow("expected contract")
    expect(() =>
      parseCatalogResponse({
        success: true,
        requestId: "request-1",
        data: {
          items: [],
          pageInfo: { endCursor: null, hasNextPage: "false" },
        },
      })
    ).toThrow("expected contract")
  })

  it("normalizes the compatible v1 category response", () => {
    expect(
      parseCategoryResponse({
        success: true,
        data: [
          {
            _id: "507f1f77bcf86cd799439012",
            name: " Web Development ",
            description: "Build for the web.",
            publishedCourseCount: 2,
          },
        ],
      })
    ).toEqual([
      {
        id: "507f1f77bcf86cd799439012",
        name: "Web Development",
        description: "Build for the web.",
        publishedCourseCount: 2,
      },
    ])
  })

  it("presents only the safe API message and request identifier", () => {
    expect(
      getCatalogErrorPresentation({
        status: 500,
        data: {
          error: {
            code: "CATALOG_READ_FAILED",
            message: "Courses are temporarily unavailable.",
            requestId: "request-500",
          },
        },
      })
    ).toEqual({
      message: "Courses are temporarily unavailable.",
      requestId: "request-500",
    })
    expect(getCatalogErrorPresentation(new Error("database secret"))).toEqual({
      message: "We could not load the catalog. Please try again.",
      requestId: null,
    })
  })
})
