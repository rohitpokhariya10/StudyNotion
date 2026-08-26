import App from "@/app/App"
import { store } from "@/app/store"
import { catalogApi } from "@/entities/catalog"
import { learningApi } from "@/entities/learning"
import { setSession } from "@/entities/user"
import * as sharedHttpClient from "@/shared/api/httpClient"
import Button from "@/shared/ui/Button"
import ErrorBoundary from "@/shared/ui/ErrorBoundary"
import { afterEach, describe, expect, it } from "vitest"

const COURSE_ID = "507f1f77bcf86cd799439011"
const learningCourse = {
  course: {
    id: COURSE_ID,
    name: "Production React",
    thumbnailUrl: "https://media.example/course.webp",
  },
  curriculum: [],
  progress: {
    courseId: COURSE_ID,
    completedLessonIds: [],
    completedCount: 0,
    totalLessons: 0,
    progressPercent: 0,
    updatedAt: null,
  },
}

afterEach(() => {
  store.dispatch(learningApi.util.resetApiState())
  store.dispatch(setSession(false))
})

describe("frontend application composition", () => {
  it("exposes the canonical application and shared primitives", () => {
    expect(App).toBeTypeOf("function")
    expect(Button).toBeTypeOf("function")
    expect(ErrorBoundary).toBeTypeOf("function")
    expect(sharedHttpClient.apiConnector).toBeTypeOf("function")
    expect(sharedHttpClient.axiosInstance.defaults.withCredentials).toBe(true)
  })

  it("preserves every Redux reducer key", () => {
    expect(Object.keys(store.getState())).toEqual([
      "auth",
      "profile",
      "course",
      "cart",
      "viewCourse",
      "catalogApi",
      "learningApi",
    ])
    expect(catalogApi.reducerPath).toBe("catalogApi")
    expect(learningApi.reducerPath).toBe("learningApi")
  })

  it("clears enrolled learning data when the session ends", async () => {
    store.dispatch(setSession(true))
    await store.dispatch(
      learningApi.util.upsertQueryData(
        "getLearningCourse",
        COURSE_ID,
        learningCourse
      )
    )

    expect(
      learningApi.endpoints.getLearningCourse.select(COURSE_ID)(
        store.getState()
      ).data
    ).toEqual(learningCourse)

    store.dispatch(setSession(false))

    expect(
      learningApi.endpoints.getLearningCourse.select(COURSE_ID)(
        store.getState()
      ).status
    ).toBe("uninitialized")
  })
})
