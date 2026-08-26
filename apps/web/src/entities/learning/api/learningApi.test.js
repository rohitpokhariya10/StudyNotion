import {
  learningApi,
  learningBaseQueryConfig,
  parseLearningCourseResponse,
  parseLearningProgressResponse,
} from "@/entities/learning/api/learningApi"
import { learningEndpoints } from "@/shared/api/endpoints"
import {
  registerSessionResponseHandler,
  SESSION_RESPONSE_SIGNALS,
} from "@/shared/api/httpClient"
import { configureStore } from "@reduxjs/toolkit"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const COURSE_ID = "507f1f77bcf86cd799439011"
const SECTION_ID = "507f1f77bcf86cd799439012"
const LESSON_ONE_ID = "507f1f77bcf86cd799439013"
const LESSON_TWO_ID = "507f1f77bcf86cd799439014"

const progress = (overrides = {}) => ({
  courseId: COURSE_ID,
  completedLessonIds: [],
  completedCount: 0,
  totalLessons: 2,
  progressPercent: 0,
  updatedAt: null,
  ...overrides,
})

const learningCourse = (overrides = {}) => ({
  course: {
    id: COURSE_ID,
    name: "Production React",
    thumbnailUrl: "https://media.example/course.webp",
  },
  curriculum: [
    {
      id: SECTION_ID,
      name: "Foundations",
      lessons: [
        {
          id: LESSON_ONE_ID,
          title: "A resilient component",
          description: "Build the first component.",
          durationSeconds: 120,
        },
        {
          id: LESSON_TWO_ID,
          title: "A secure data path",
          description: "Connect it safely.",
          durationSeconds: 180,
        },
      ],
    },
  ],
  progress: progress(),
  ...overrides,
})

const successEnvelope = (data, requestId = "request-learning-1") => ({
  success: true,
  requestId,
  data,
})

const jsonResponse = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  })

const createLearningStore = () =>
  configureStore({
    reducer: { [learningApi.reducerPath]: learningApi.reducer },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware().concat(learningApi.middleware),
  })

describe("learning API boundary", () => {
  const sessionHandler = vi.fn()
  let unregisterSessionHandler

  beforeEach(() => {
    sessionHandler.mockClear()
    unregisterSessionHandler = registerSessionResponseHandler(sessionHandler)
  })

  afterEach(() => {
    unregisterSessionHandler?.()
    vi.unstubAllGlobals()
  })

  it("uses encoded V2 URLs with cookie credentials and a bounded timeout", () => {
    expect(learningBaseQueryConfig).toEqual({
      baseUrl: "",
      credentials: "include",
      timeout: 15000,
    })
    expect(learningEndpoints.COURSE_API("course/with space")).toMatch(
      /\/learning\/courses\/course%2Fwith%20space$/
    )
    expect(
      learningEndpoints.LESSON_PROGRESS_API(
        "course/with space",
        "lesson/with space"
      )
    ).toMatch(
      /\/learning\/courses\/course%2Fwith%20space\/lessons\/lesson%2Fwith%20space\/progress$/
    )
  })

  it("accepts only a self-consistent, media-free learning state for the requested course", () => {
    expect(
      parseLearningCourseResponse(
        successEnvelope(learningCourse()),
        COURSE_ID.toUpperCase()
      )
    ).toEqual(learningCourse())

    expect(() =>
      parseLearningCourseResponse(
        successEnvelope(
          learningCourse({
            curriculum: [
              {
                ...learningCourse().curriculum[0],
                lessons: [
                  {
                    ...learningCourse().curriculum[0].lessons[0],
                    videoUrl: "https://media.example/signed-secret",
                  },
                ],
              },
            ],
            progress: progress({ totalLessons: 1 }),
          })
        ),
        COURSE_ID
      )
    ).toThrow("expected contract")

    expect(() =>
      parseLearningCourseResponse(
        successEnvelope(learningCourse()),
        "507f1f77bcf86cd799439099"
      )
    ).toThrow("requested course")
  })

  it("rejects inconsistent progress instead of coercing counts or percentages", () => {
    expect(() =>
      parseLearningProgressResponse(
        successEnvelope(
          progress({
            completedLessonIds: [LESSON_ONE_ID],
            completedCount: 0,
            progressPercent: 50,
          })
        ),
        COURSE_ID
      )
    ).toThrow("expected contract")

    expect(() =>
      parseLearningProgressResponse(
        successEnvelope(
          progress({
            completedLessonIds: [LESSON_ONE_ID],
            completedCount: 1,
            progressPercent: 49,
          })
        ),
        COURSE_ID
      )
    ).toThrow("expected contract")
  })

  it("issues GET and PUT requests with cookies, then replaces cached progress with the server result", async () => {
    const updatedProgress = progress({
      completedLessonIds: [LESSON_ONE_ID],
      completedCount: 1,
      progressPercent: 50,
      updatedAt: "2026-08-08T10:30:00.000Z",
    })
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(successEnvelope(learningCourse())))
      .mockResolvedValueOnce(jsonResponse(successEnvelope(updatedProgress)))
    vi.stubGlobal("fetch", fetchMock)
    const store = createLearningStore()

    await expect(
      store
        .dispatch(learningApi.endpoints.getLearningCourse.initiate(COURSE_ID))
        .unwrap()
    ).resolves.toEqual(learningCourse())

    const courseRequest = fetchMock.mock.calls[0][0]
    expect(courseRequest).toBeInstanceOf(Request)
    expect(courseRequest.url).toBe(learningEndpoints.COURSE_API(COURSE_ID))
    expect(courseRequest.method).toBe("GET")
    expect(courseRequest.credentials).toBe("include")

    await expect(
      store
        .dispatch(
          learningApi.endpoints.markLessonComplete.initiate({
            courseId: COURSE_ID,
            lessonId: LESSON_ONE_ID,
          })
        )
        .unwrap()
    ).resolves.toEqual(updatedProgress)

    const progressRequest = fetchMock.mock.calls[1][0]
    expect(progressRequest.url).toBe(
      learningEndpoints.LESSON_PROGRESS_API(COURSE_ID, LESSON_ONE_ID)
    )
    expect(progressRequest.method).toBe("PUT")
    expect(progressRequest.credentials).toBe("include")
    expect(
      learningApi.endpoints.getLearningCourse.select(COURSE_ID)(
        store.getState()
      ).data.progress
    ).toEqual(updatedProgress)
  })

  it.each([
    [
      401,
      { error: { code: "UNAUTHORIZED", message: "Sign in again." } },
      SESSION_RESPONSE_SIGNALS.UNAUTHORIZED,
    ],
    [
      423,
      {
        error: {
          code: "ACCOUNT_DELETION_PENDING",
          message: "Restore the account first.",
        },
      },
      SESSION_RESPONSE_SIGNALS.ACCOUNT_DELETION_PENDING,
    ],
    [
      428,
      {
        error: {
          code: "POLICY_ACCEPTANCE_REQUIRED",
          message: "Accept the current policies.",
        },
      },
      SESSION_RESPONSE_SIGNALS.POLICY_ACCEPTANCE_REQUIRED,
    ],
  ])(
    "passes a %i response through the shared session signal boundary",
    async (status, body, expectedSignal) => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue(jsonResponse(body, status))
      )
      const store = createLearningStore()

      await expect(
        store
          .dispatch(learningApi.endpoints.getLearningCourse.initiate(COURSE_ID))
          .unwrap()
      ).rejects.toMatchObject({ status })
      expect(sessionHandler).toHaveBeenCalledWith(expectedSignal)
    }
  )
})
