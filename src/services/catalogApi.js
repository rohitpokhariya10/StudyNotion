import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react"
import { catalogCourseListResponseSchema } from "@studynotion/contracts"

import { catalogEndpoints } from "./apis"

export const CATALOG_PAGE_SIZE = 12
export const CATALOG_REQUEST_TIMEOUT_MS = 15000

export const catalogBaseQueryConfig = Object.freeze({
  baseUrl: "",
  credentials: "include",
  timeout: CATALOG_REQUEST_TIMEOUT_MS,
})

const optionalString = (value) =>
  typeof value === "string" && value.trim() ? value.trim() : undefined

const optionalSearchString = (value) =>
  optionalString(value)?.replace(/\s+/g, " ")

const optionalNumber = (value) => {
  if (value === "" || value === null || value === undefined) return undefined
  const number = Number(value)
  return Number.isFinite(number) ? number : undefined
}

export const buildCatalogQueryParams = (query = {}, cursor = null) => {
  const q = optionalSearchString(query.q)
  const requestedSort = optionalString(query.sort)
  const sort =
    requestedSort === "relevance" && !q
      ? "newest"
      : requestedSort || (q ? "relevance" : "newest")

  return Object.fromEntries(
    Object.entries({
      q,
      categoryId: optionalString(query.categoryId),
      level: optionalString(query.level),
      language: optionalString(query.language)?.toLowerCase(),
      minPrice: optionalNumber(query.minPrice),
      maxPrice: optionalNumber(query.maxPrice),
      minRating: optionalNumber(query.minRating),
      minDurationSeconds: optionalNumber(query.minDurationSeconds),
      maxDurationSeconds: optionalNumber(query.maxDurationSeconds),
      sort,
      limit: CATALOG_PAGE_SIZE,
      cursor: optionalString(cursor),
    }).filter(([, value]) => value !== undefined)
  )
}

export const parseCatalogResponse = (response) => {
  const parsed = catalogCourseListResponseSchema.safeParse(response)
  if (!parsed.success) {
    throw new Error("The catalog response did not match the expected contract")
  }

  return parsed.data.data
}

export const parseCategoryResponse = (response) => {
  if (!Array.isArray(response?.data)) {
    throw new Error("The category response did not match the expected contract")
  }

  return response.data
    .filter(
      (category) =>
        category &&
        typeof category._id === "string" &&
        typeof category.name === "string" &&
        category.name.trim()
    )
    .map((category) => ({
      id: category._id,
      description:
        typeof category.description === "string" ? category.description : "",
      name: category.name.trim(),
      publishedCourseCount: Number(category.publishedCourseCount) || 0,
    }))
}

export const getCatalogErrorPresentation = (error) => {
  const envelope = error?.data?.error
  const requestId =
    typeof envelope?.requestId === "string" && envelope.requestId.trim()
      ? envelope.requestId.trim()
      : null

  return {
    message:
      typeof envelope?.message === "string" && envelope.message.trim()
        ? envelope.message.trim()
        : "We could not load the catalog. Please try again.",
    requestId,
  }
}

export const catalogApi = createApi({
  reducerPath: "catalogApi",
  baseQuery: fetchBaseQuery(catalogBaseQueryConfig),
  keepUnusedDataFor: 60,
  refetchOnReconnect: true,
  endpoints: (build) => ({
    getCatalogCategories: build.query({
      query: () => ({ url: catalogEndpoints.CATEGORIES_API }),
      transformResponse: parseCategoryResponse,
      keepUnusedDataFor: 300,
    }),
    getCourses: build.infiniteQuery({
      infiniteQueryOptions: {
        initialPageParam: null,
        getNextPageParam: (lastPage) =>
          lastPage.pageInfo.hasNextPage && lastPage.pageInfo.endCursor
            ? lastPage.pageInfo.endCursor
            : undefined,
      },
      query: ({ queryArg, pageParam }) => ({
        url: catalogEndpoints.COURSES_API,
        params: buildCatalogQueryParams(queryArg, pageParam),
      }),
      transformResponse: parseCatalogResponse,
    }),
  }),
})

export const { useGetCatalogCategoriesQuery, useGetCoursesInfiniteQuery } =
  catalogApi
