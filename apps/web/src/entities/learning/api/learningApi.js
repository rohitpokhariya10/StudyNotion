import { getSafeApiErrorEnvelopePresentation } from "@/shared/api/apiErrorModel"
import { learningEndpoints } from "@/shared/api/endpoints"
import { signalSessionResponseError } from "@/shared/api/httpClient"
import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react"
import {
  learningCourseResponseSchema,
  learningProgressResponseSchema,
} from "@studynotion/contracts/learning"

export const LEARNING_REQUEST_TIMEOUT_MS = 15000

export const learningBaseQueryConfig = Object.freeze({
  baseUrl: "",
  credentials: "include",
  timeout: LEARNING_REQUEST_TIMEOUT_MS,
})

const rawLearningBaseQuery = fetchBaseQuery(learningBaseQueryConfig)

export const learningBaseQuery = async (args, api, extraOptions) => {
  const result = await rawLearningBaseQuery(args, api, extraOptions)
  if (result.error) {
    signalSessionResponseError({
      response: {
        status: result.error.status,
        data: { code: result.error.data?.error?.code },
      },
    })
  }
  return result
}

const parseContractResponse = (schema, response, message) => {
  const parsed = schema.safeParse(response)
  if (!parsed.success) throw new Error(message)
  return parsed.data.data
}

const idsMatch = (left, right) =>
  String(left || "").toLowerCase() === String(right || "").toLowerCase()

export const parseLearningCourseResponse = (response, expectedCourseId) => {
  const learningCourse = parseContractResponse(
    learningCourseResponseSchema,
    response,
    "The learning response did not match the expected contract"
  )
  if (
    expectedCourseId !== undefined &&
    !idsMatch(learningCourse.course.id, expectedCourseId)
  ) {
    throw new Error("The learning response did not match the requested course")
  }
  return learningCourse
}

export const parseLearningProgressResponse = (response, expectedCourseId) => {
  const progress = parseContractResponse(
    learningProgressResponseSchema,
    response,
    "The progress response did not match the expected contract"
  )
  if (
    expectedCourseId !== undefined &&
    !idsMatch(progress.courseId, expectedCourseId)
  ) {
    throw new Error("The progress response did not match the requested course")
  }
  return progress
}

export const getLearningErrorPresentation = (
  error,
  { fallbackMessage = "We could not load this course. Please try again." } = {}
) =>
  getSafeApiErrorEnvelopePresentation(error, {
    fallbackMessage,
  })

export const learningApi = createApi({
  reducerPath: "learningApi",
  baseQuery: learningBaseQuery,
  keepUnusedDataFor: 60,
  refetchOnReconnect: true,
  tagTypes: ["LearningCourse"],
  endpoints: (build) => ({
    getLearningCourse: build.query({
      query: (courseId) => ({ url: learningEndpoints.COURSE_API(courseId) }),
      transformResponse: (response, _meta, courseId) =>
        parseLearningCourseResponse(response, courseId),
      providesTags: (_result, _error, courseId) => [
        { type: "LearningCourse", id: courseId },
      ],
    }),
    markLessonComplete: build.mutation({
      query: ({ courseId, lessonId }) => ({
        url: learningEndpoints.LESSON_PROGRESS_API(courseId, lessonId),
        method: "PUT",
      }),
      transformResponse: (response, _meta, { courseId }) =>
        parseLearningProgressResponse(response, courseId),
      async onQueryStarted({ courseId }, { dispatch, queryFulfilled }) {
        try {
          const { data: progress } = await queryFulfilled
          dispatch(
            learningApi.util.updateQueryData(
              "getLearningCourse",
              courseId,
              (learningCourse) => {
                learningCourse.progress = progress
              }
            )
          )
        } catch {
          // A failed idempotent completion leaves the last server-confirmed
          // learning state in place for an explicit retry.
        }
      },
    }),
  }),
})

export const { useGetLearningCourseQuery, useMarkLessonCompleteMutation } =
  learningApi
