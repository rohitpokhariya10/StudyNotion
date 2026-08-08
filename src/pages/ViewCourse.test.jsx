import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter, Route, Routes, useLocation } from "react-router"
import { beforeEach, describe, expect, it, vi } from "vitest"

import ViewCourse from "./ViewCourse"

const learningMocks = vi.hoisted(() => ({
  query: vi.fn(),
}))

vi.mock("../entities/learning/api/learningApi", async (importOriginal) => ({
  ...(await importOriginal()),
  useGetLearningCourseQuery: learningMocks.query,
}))

vi.mock("../components/core/ViewCourse/VideoDetailsSidebar", () => ({
  default: ({ learningCourse, mobileOpen, setReviewModal }) => (
    <aside aria-label="Test course sidebar">
      <span>{learningCourse.course.name}</span>
      <output aria-label="Mobile sidebar state">
        {mobileOpen ? "open" : "closed"}
      </output>
      <button type="button" onClick={() => setReviewModal(true)}>
        Open review
      </button>
    </aside>
  ),
}))

vi.mock("../components/core/ViewCourse/CourseReviewModal", () => ({
  default: ({ courseId }) => <div>Reviewing {courseId}</div>,
}))

const COURSE_ID = "507f1f77bcf86cd799439011"
const SECTION_ID = "507f1f77bcf86cd799439012"
const LESSON_ID = "507f1f77bcf86cd799439013"

const learningCourse = (totalLessons = 1) => ({
  course: {
    id: COURSE_ID,
    name: "Production React",
    thumbnailUrl: null,
  },
  curriculum:
    totalLessons > 0
      ? [
          {
            id: SECTION_ID,
            name: "Foundations",
            lessons: [
              {
                id: LESSON_ID,
                title: "Reliable components",
                description: "",
                durationSeconds: 90,
              },
            ],
          },
        ]
      : [],
  progress: {
    courseId: COURSE_ID,
    completedLessonIds: [],
    completedCount: 0,
    totalLessons,
    progressPercent: 0,
    updatedAt: null,
  },
})

const readyQuery = (overrides = {}) => ({
  data: learningCourse(),
  error: undefined,
  isError: false,
  isFetching: false,
  isLoading: false,
  refetch: vi.fn(),
  ...overrides,
})

function LocationProbe() {
  const location = useLocation()
  return <output aria-label="Current location">{location.pathname}</output>
}

const renderViewCourse = () =>
  render(
    <MemoryRouter initialEntries={[`/view-course/${COURSE_ID}`]}>
      <Routes>
        <Route path="/view-course/:courseId" element={<ViewCourse />}>
          <Route index element={<div>Selected lesson outlet</div>} />
        </Route>
        <Route
          path="/dashboard/enrolled-courses"
          element={<div>Enrolled courses destination</div>}
        />
      </Routes>
      <LocationProbe />
    </MemoryRouter>
  )

describe("ViewCourse", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    learningMocks.query.mockReturnValue(readyQuery())
  })

  it("shows a named initial loading state and skips no valid course id", () => {
    learningMocks.query.mockReturnValue(
      readyQuery({ data: undefined, isLoading: true })
    )

    renderViewCourse()

    expect(
      screen.getByRole("status", { name: "Loading course learning state" })
    ).toBeVisible()
    expect(screen.getByText("Preparing your course…")).toBeVisible()
    expect(learningMocks.query).toHaveBeenCalledWith(COURSE_ID, { skip: false })
  })

  it("renders the server learning state, nested lesson, mobile toggle, and review course id", async () => {
    const user = userEvent.setup()
    renderViewCourse()

    expect(screen.getByText("Production React")).toBeVisible()
    expect(screen.getByText("Selected lesson outlet")).toBeVisible()
    expect(screen.getByLabelText("Mobile sidebar state")).toHaveTextContent(
      "closed"
    )

    const contentButton = screen.getByRole("button", {
      name: "Course content",
    })
    await user.click(contentButton)
    expect(contentButton).toHaveAttribute("aria-expanded", "true")
    expect(screen.getByLabelText("Mobile sidebar state")).toHaveTextContent(
      "open"
    )

    await user.keyboard("{Escape}")
    expect(contentButton).toHaveFocus()
    expect(contentButton).toHaveAttribute("aria-expanded", "false")

    await user.click(screen.getByRole("button", { name: "Open review" }))
    expect(screen.getByText(`Reviewing ${COURSE_ID}`)).toBeVisible()
  })

  it("renders a non-retryable 403 access state without leaking a lesson", async () => {
    learningMocks.query.mockReturnValue(
      readyQuery({
        data: undefined,
        error: {
          status: 403,
          data: {
            error: {
              code: "LEARNING_COURSE_ACCESS_DENIED",
              message: "Enrollment is required for this course.",
              requestId: "request-forbidden",
            },
          },
        },
        isError: true,
      })
    )
    const user = userEvent.setup()
    renderViewCourse()

    expect(
      screen.getByRole("heading", {
        name: "This course is not available to this account.",
      })
    ).toBeVisible()
    expect(
      screen.getByText("Enrollment is required for this course.")
    ).toBeVisible()
    expect(screen.getByText("Reference: request-forbidden")).toBeVisible()
    expect(
      screen.queryByRole("button", { name: "Try again" })
    ).not.toBeInTheDocument()
    expect(screen.queryByText("Selected lesson outlet")).not.toBeInTheDocument()

    await user.click(
      screen.getByRole("button", { name: "Back to enrolled courses" })
    )
    expect(screen.getByText("Enrolled courses destination")).toBeVisible()
    expect(screen.getByLabelText("Current location")).toHaveTextContent(
      "/dashboard/enrolled-courses"
    )
  })

  it("shows a safe 5xx message and retries the same query", async () => {
    const refetch = vi.fn()
    learningMocks.query.mockReturnValue(
      readyQuery({
        data: undefined,
        error: {
          status: 500,
          data: {
            error: {
              code: "LEARNING_READ_FAILED",
              message: "Learning is temporarily unavailable.",
              requestId: "request-learning-500",
            },
          },
        },
        isError: true,
        refetch,
      })
    )
    const user = userEvent.setup()
    renderViewCourse()

    expect(
      screen.getByRole("heading", { name: "This course could not be loaded." })
    ).toBeVisible()
    expect(
      screen.getByText("Learning is temporarily unavailable.")
    ).toBeVisible()
    expect(screen.getByText("Reference: request-learning-500")).toBeVisible()

    await user.click(screen.getByRole("button", { name: "Try again" }))
    expect(refetch).toHaveBeenCalledOnce()
  })

  it("falls back to a generic message for malformed failures", () => {
    learningMocks.query.mockReturnValue(
      readyQuery({
        data: undefined,
        error: new Error("database topology and host secret"),
        isError: true,
      })
    )

    renderViewCourse()

    expect(
      screen.getByText("We could not load this course. Please try again.")
    ).toBeVisible()
    expect(
      screen.queryByText(/database topology and host secret/i)
    ).not.toBeInTheDocument()
  })

  it("renders a stable empty-course state without mounting a lesson outlet", () => {
    learningMocks.query.mockReturnValue(readyQuery({ data: learningCourse(0) }))

    renderViewCourse()

    expect(
      screen.getByRole("heading", { name: "Lessons are being prepared." })
    ).toBeVisible()
    expect(screen.getByText(/progress will remain at 0%/i)).toBeVisible()
    expect(screen.queryByText("Selected lesson outlet")).not.toBeInTheDocument()
  })
})
