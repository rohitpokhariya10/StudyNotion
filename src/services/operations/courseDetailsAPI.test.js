import { beforeEach, describe, expect, it, vi } from "vitest"

import { apiConnector } from "../apiConnector"
import { deleteCourse, getLessonPlaybackUrl } from "./courseDetailsAPI"

vi.mock("../apiConnector", () => ({
  apiConnector: vi.fn(),
}))

vi.mock("react-hot-toast", () => ({
  toast: {
    dismiss: vi.fn(),
    error: vi.fn(),
    loading: vi.fn(),
    success: vi.fn(),
  },
}))

describe("lesson playback URL requests", () => {
  beforeEach(() => vi.clearAllMocks())

  it("requests a fresh URL for the active enrolled lesson", async () => {
    apiConnector.mockResolvedValue({
      data: {
        success: true,
        data: {
          url: "https://media.example/signed-video",
          expiresAt: "2026-07-18T12:00:00.000Z",
          subSectionId: "lesson-1",
        },
      },
    })

    await expect(
      getLessonPlaybackUrl("course-1", "lesson-1")
    ).resolves.toMatchObject({
      url: "https://media.example/signed-video",
      subSectionId: "lesson-1",
    })
    expect(apiConnector).toHaveBeenCalledWith(
      "POST",
      expect.stringContaining("/course/getLessonPlaybackUrl"),
      { courseId: "course-1", subSectionId: "lesson-1" }
    )
  })

  it("rejects malformed playback responses", async () => {
    apiConnector.mockResolvedValue({
      data: { success: false, message: "Enrollment required" },
    })

    await expect(
      getLessonPlaybackUrl("course-1", "lesson-1")
    ).rejects.toThrow("Enrollment required")
  })
})

describe("course lifecycle requests", () => {
  beforeEach(() => vi.clearAllMocks())

  it("sends the exact course-name confirmation for archive or deletion", async () => {
    apiConnector.mockResolvedValue({
      data: {
        success: true,
        archived: true,
        message: "Course archived",
      },
    })

    await expect(
      deleteCourse(
        {
          courseId: "course-1",
          confirmationCourseName: "Production React",
        },
        true
      )
    ).resolves.toMatchObject({ success: true, archived: true })
    expect(apiConnector).toHaveBeenCalledWith(
      "DELETE",
      expect.stringContaining("/course/deleteCourse"),
      {
        courseId: "course-1",
        confirmationCourseName: "Production React",
      },
      { Authorization: "Bearer true" }
    )
  })
})
