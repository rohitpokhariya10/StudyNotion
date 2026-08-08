import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter, Outlet, Route, Routes } from "react-router"
import { beforeEach, describe, expect, it, vi } from "vitest"

import VideoDetails from "./VideoDetails"

const learningMocks = vi.hoisted(() => ({
  mark: vi.fn(),
  mutationHook: vi.fn(),
  unwrap: vi.fn(),
}))

const playbackMocks = vi.hoisted(() => ({
  get: vi.fn(),
}))

vi.mock(
  "../../../entities/learning/api/learningApi",
  async (importOriginal) => ({
    ...(await importOriginal()),
    useMarkLessonCompleteMutation: learningMocks.mutationHook,
  })
)

vi.mock(
  "../../../services/operations/courseDetailsAPI",
  async (importOriginal) => ({
    ...(await importOriginal()),
    getLessonPlaybackUrl: playbackMocks.get,
  })
)

const COURSE_ID = "507f1f77bcf86cd799439011"
const SECTION_ONE_ID = "507f1f77bcf86cd799439012"
const LESSON_ONE_ID = "507f1f77bcf86cd799439013"
const EMPTY_SECTION_ID = "507f1f77bcf86cd799439014"
const SECTION_THREE_ID = "507f1f77bcf86cd799439015"
const LESSON_THREE_ID = "507f1f77bcf86cd799439016"
const UNKNOWN_LESSON_ID = "507f1f77bcf86cd799439099"

const lessonOne = {
  id: LESSON_ONE_ID,
  title: "Reliable components",
  description: "Build a component that handles failure safely.",
  durationSeconds: 90,
}

const lessonThree = {
  id: LESSON_THREE_ID,
  title: "Production checks",
  description: "Verify the completed slice.",
  durationSeconds: 180,
}

const buildLearningCourse = (progressOverrides = {}) => ({
  course: {
    id: COURSE_ID,
    name: "Production React",
    thumbnailUrl: "https://media.example/course.webp",
  },
  curriculum: [
    {
      id: SECTION_ONE_ID,
      name: "Foundations",
      lessons: [lessonOne],
    },
    {
      id: EMPTY_SECTION_ID,
      name: "Coming soon",
      lessons: [],
    },
    {
      id: SECTION_THREE_ID,
      name: "Shipping",
      lessons: [lessonThree],
    },
  ],
  progress: {
    courseId: COURSE_ID,
    completedLessonIds: [],
    completedCount: 0,
    totalLessons: 2,
    progressPercent: 0,
    updatedAt: null,
    ...progressOverrides,
  },
})

const routeFor = (sectionId, lessonId) =>
  `/view-course/${COURSE_ID}/section/${sectionId}/sub-section/${lessonId}`

function LearningContext({ learningCourse }) {
  return <Outlet context={{ learningCourse }} />
}

const renderVideoDetails = (
  learningCourse = buildLearningCourse(),
  initialEntry = routeFor(SECTION_ONE_ID, LESSON_ONE_ID)
) =>
  render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route element={<LearningContext learningCourse={learningCourse} />}>
          <Route
            path="/view-course/:courseId/section/:sectionId/sub-section/:subSectionId"
            element={<VideoDetails />}
          />
        </Route>
      </Routes>
    </MemoryRouter>
  )

const findVideo = async () => {
  const region = screen.getByRole("region", { name: "Secure lesson video" })
  await waitFor(() => expect(region.querySelector("video")).not.toBeNull())
  return region.querySelector("video")
}

describe("VideoDetails", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    playbackMocks.get.mockResolvedValue({
      url: "https://media.example/signed/lesson-one",
      expiresAt: "2026-08-08T10:45:00.000Z",
      subSectionId: LESSON_ONE_ID,
    })
    learningMocks.unwrap.mockResolvedValue({
      courseId: COURSE_ID,
      completedLessonIds: [LESSON_ONE_ID],
      completedCount: 1,
      totalLessons: 2,
      progressPercent: 50,
      updatedAt: "2026-08-08T10:30:00.000Z",
    })
    learningMocks.mark.mockReturnValue({ unwrap: learningMocks.unwrap })
    learningMocks.mutationHook.mockReturnValue([
      learningMocks.mark,
      { isError: false, isLoading: false },
    ])
  })

  it("loads protected playback separately and completes only after the video ends", async () => {
    const user = userEvent.setup()
    renderVideoDetails()

    expect(
      screen.getByRole("status", { name: "Loading lesson video" })
    ).toBeVisible()
    const video = await findVideo()

    expect(playbackMocks.get).toHaveBeenCalledWith(COURSE_ID, LESSON_ONE_ID)
    expect(video).toHaveAttribute(
      "src",
      "https://media.example/signed/lesson-one"
    )
    expect(video).toHaveAttribute("poster", "https://media.example/course.webp")
    expect(learningMocks.mark).not.toHaveBeenCalled()

    fireEvent.ended(video)
    await user.click(
      screen.getByRole("button", { name: "Mark lesson complete" })
    )

    expect(learningMocks.mark).toHaveBeenCalledWith({
      courseId: COURSE_ID,
      lessonId: LESSON_ONE_ID,
    })
    expect(await screen.findByText("Lesson marked complete.")).toBeVisible()
  })

  it("does not repeat completion for a completed lesson and supports rewatch", async () => {
    const user = userEvent.setup()
    renderVideoDetails(
      buildLearningCourse({
        completedLessonIds: [LESSON_ONE_ID],
        completedCount: 1,
        progressPercent: 50,
        updatedAt: "2026-08-08T10:30:00.000Z",
      })
    )
    const video = await findVideo()
    const play = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(video, "play", { configurable: true, value: play })
    video.currentTime = 42

    fireEvent.ended(video)

    expect(screen.getByText("Completed", { selector: "p" })).toBeVisible()
    expect(
      screen.queryByRole("button", { name: "Mark lesson complete" })
    ).not.toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: "Rewatch" }))
    expect(video.currentTime).toBe(0)
    expect(play).toHaveBeenCalledOnce()
    expect(learningMocks.mark).not.toHaveBeenCalled()
  })

  it("keeps playback available and presents a safe completion failure with its request id", async () => {
    learningMocks.unwrap.mockRejectedValue({
      status: 500,
      data: {
        error: {
          code: "LEARNING_PROGRESS_WRITE_FAILED",
          message: "Progress could not be saved yet.",
          requestId: "request-progress-500",
        },
      },
    })
    const user = userEvent.setup()
    renderVideoDetails()
    const video = await findVideo()

    fireEvent.ended(video)
    await user.click(
      screen.getByRole("button", { name: "Mark lesson complete" })
    )

    expect(
      await screen.findByText(
        "Progress could not be saved yet. Reference: request-progress-500"
      )
    ).toBeVisible()
    expect(video).toHaveAttribute(
      "src",
      "https://media.example/signed/lesson-one"
    )
  })

  it("offers an explicit playback retry and requests a fresh signed URL", async () => {
    playbackMocks.get
      .mockRejectedValueOnce(new Error("The secure video session expired."))
      .mockResolvedValueOnce({
        url: "https://media.example/signed/refreshed",
        expiresAt: "2026-08-08T11:00:00.000Z",
        subSectionId: LESSON_ONE_ID,
      })
    const user = userEvent.setup()
    renderVideoDetails()

    expect(
      await screen.findByRole("heading", {
        name: "This lesson video could not be loaded.",
      })
    ).toBeVisible()
    expect(screen.getByRole("alert", { name: "" })).toHaveTextContent(
      "The secure video session expired."
    )

    await user.click(screen.getByRole("button", { name: "Try again" }))
    const video = await findVideo()
    expect(video).toHaveAttribute(
      "src",
      "https://media.example/signed/refreshed"
    )
    expect(playbackMocks.get).toHaveBeenCalledTimes(2)
  })

  it("rejects an invalid route before requesting protected playback", () => {
    renderVideoDetails(
      buildLearningCourse(),
      routeFor(SECTION_ONE_ID, UNKNOWN_LESSON_ID)
    )

    expect(
      screen.getByRole("heading", {
        name: "This lesson is not part of the current course.",
      })
    ).toBeVisible()
    expect(screen.getByText(/Choose an available lesson/i)).toBeVisible()
    expect(playbackMocks.get).not.toHaveBeenCalled()
  })

  it("navigates across empty sections using the flattened valid lesson order", async () => {
    const first = renderVideoDetails()
    await findVideo()

    expect(
      screen.queryByRole("link", { name: "Previous lesson" })
    ).not.toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Next lesson" })).toHaveAttribute(
      "href",
      routeFor(SECTION_THREE_ID, LESSON_THREE_ID)
    )
    first.unmount()

    playbackMocks.get.mockResolvedValue({
      url: "https://media.example/signed/lesson-three",
      expiresAt: null,
      subSectionId: LESSON_THREE_ID,
    })
    renderVideoDetails(
      buildLearningCourse(),
      routeFor(SECTION_THREE_ID, LESSON_THREE_ID)
    )
    await findVideo()

    expect(
      screen.getByRole("link", { name: "Previous lesson" })
    ).toHaveAttribute("href", routeFor(SECTION_ONE_ID, LESSON_ONE_ID))
    expect(
      screen.queryByRole("link", { name: "Next lesson" })
    ).not.toBeInTheDocument()
  })
})
