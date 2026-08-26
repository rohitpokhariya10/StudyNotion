import VideoDetailsSidebar from "@/widgets/curriculum-panel/ui/VideoDetailsSidebar"
import { render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter, Route, Routes } from "react-router"
import { beforeEach, describe, expect, it, vi } from "vitest"

const COURSE_ID = "507f1f77bcf86cd799439011"
const SECTION_ONE_ID = "507f1f77bcf86cd799439012"
const LESSON_ONE_ID = "507f1f77bcf86cd799439013"
const LESSON_TWO_ID = "507f1f77bcf86cd799439014"
const EMPTY_SECTION_ID = "507f1f77bcf86cd799439015"
const SECTION_THREE_ID = "507f1f77bcf86cd799439016"
const LESSON_THREE_ID = "507f1f77bcf86cd799439017"

const learningCourse = {
  course: {
    id: COURSE_ID,
    name: "Production React",
    thumbnailUrl: null,
  },
  curriculum: [
    {
      id: SECTION_ONE_ID,
      name: "Foundations",
      lessons: [
        {
          id: LESSON_ONE_ID,
          title: "Reliable components",
          description: "",
          durationSeconds: 90,
        },
        {
          id: LESSON_TWO_ID,
          title: "Safe state",
          description: "",
          durationSeconds: 120,
        },
      ],
    },
    {
      id: EMPTY_SECTION_ID,
      name: "Coming next",
      lessons: [],
    },
    {
      id: SECTION_THREE_ID,
      name: "Shipping",
      lessons: [
        {
          id: LESSON_THREE_ID,
          title: "Production checks",
          description: "",
          durationSeconds: 180,
        },
      ],
    },
  ],
  progress: {
    courseId: COURSE_ID,
    completedLessonIds: [LESSON_TWO_ID],
    completedCount: 1,
    totalLessons: 3,
    progressPercent: 33.33,
    updatedAt: "2026-08-08T10:30:00.000Z",
  },
}

const routeFor = (sectionId = SECTION_ONE_ID, lessonId = LESSON_ONE_ID) =>
  `/view-course/${COURSE_ID}/section/${sectionId}/sub-section/${lessonId}`

const renderSidebar = (props = {}, initialEntry = routeFor()) =>
  render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route
          path="/view-course/:courseId/section/:sectionId/sub-section/:subSectionId"
          element={
            <VideoDetailsSidebar
              learningCourse={learningCourse}
              setReviewModal={vi.fn()}
              {...props}
            />
          }
        />
      </Routes>
    </MemoryRouter>
  )

describe("VideoDetailsSidebar", () => {
  beforeEach(() => vi.clearAllMocks())

  it("announces exact progress and marks the current and completed lessons", () => {
    renderSidebar()

    expect(screen.getByText("1 of 3 lessons completed")).toBeVisible()
    expect(screen.getByText("33.33%")).toBeVisible()
    expect(screen.getByRole("progressbar")).toHaveAttribute("max", "3")
    expect(screen.getByRole("progressbar")).toHaveAttribute("value", "1")
    expect(screen.getByRole("progressbar")).toHaveAccessibleName(
      "33.33% complete"
    )

    const currentLesson = screen.getByRole("link", {
      name: /Reliable components\s*Not completed/i,
    })
    expect(currentLesson).toHaveAttribute("aria-current", "page")
    expect(currentLesson).toHaveAttribute(
      "href",
      routeFor(SECTION_ONE_ID, LESSON_ONE_ID)
    )

    const completedLesson = screen.getByRole("link", {
      name: /Safe state\s*Completed/i,
    })
    expect(completedLesson).not.toHaveAttribute("aria-current")
    expect(within(completedLesson).getByText("Completed")).toBeVisible()
  })

  it("supports keyboard section disclosure and an explicit empty-section state", async () => {
    const user = userEvent.setup()
    renderSidebar()

    const foundations = screen.getByRole("button", { name: /Foundations/ })
    expect(foundations).toHaveAttribute("aria-expanded", "true")
    foundations.focus()
    await user.keyboard("{Enter}")
    expect(foundations).toHaveAttribute("aria-expanded", "false")
    expect(
      screen.queryByRole("link", { name: /Reliable components/ })
    ).not.toBeInTheDocument()

    await user.keyboard(" ")
    expect(foundations).toHaveAttribute("aria-expanded", "true")
    expect(
      screen.getByRole("link", { name: /Reliable components/ })
    ).toBeVisible()

    await user.click(screen.getByRole("button", { name: /Coming next/ }))
    expect(screen.getByText("No lessons in this section.")).toBeVisible()
  })

  it("focuses and traps the mobile dialog, closes it, and preserves review behavior", async () => {
    const onClose = vi.fn()
    const setReviewModal = vi.fn()
    const user = userEvent.setup()
    renderSidebar({ mobileOpen: true, onClose, setReviewModal })

    const dialog = screen.getByRole("dialog", { name: "Course content" })
    const backLink = within(dialog).getByRole("link", {
      name: "Back to enrolled courses",
    })
    await waitFor(() => expect(backLink).toHaveFocus())

    const focusable = dialog.querySelectorAll(
      'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
    )
    const first = focusable[0]
    const last = focusable[focusable.length - 1]

    last.focus()
    await user.tab()
    expect(first).toHaveFocus()

    first.focus()
    await user.tab({ shift: true })
    expect(last).toHaveFocus()

    await user.click(within(dialog).getByRole("button", { name: "Add review" }))
    expect(setReviewModal).toHaveBeenCalledWith(true)
    expect(onClose).toHaveBeenCalled()

    await user.click(
      screen.getByRole("button", { name: "Close course content" })
    )
    expect(onClose).toHaveBeenCalledTimes(2)
  })
})
