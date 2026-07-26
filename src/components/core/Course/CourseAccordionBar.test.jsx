import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import CourseAccordionBar from "./CourseAccordionBar"

const course = {
  _id: "section-1",
  sectionName: "Foundations",
  subSection: [{ _id: "lesson-1", title: "Introduction" }],
}

describe("CourseAccordionBar", () => {
  it("uses an accessible button and exposes its expanded state", async () => {
    const user = userEvent.setup()
    const handleActive = vi.fn()
    const { rerender } = render(
      <CourseAccordionBar
        course={course}
        isActive={[]}
        handleActive={handleActive}
      />
    )

    const trigger = screen.getByRole("button", { name: /Foundations/ })
    const contentId = trigger.getAttribute("aria-controls")
    const content = document.getElementById(contentId)

    expect(trigger).toHaveAttribute("type", "button")
    expect(trigger).toHaveAttribute("aria-expanded", "false")
    expect(content).toHaveAttribute("role", "region")
    expect(content).toHaveAttribute("aria-hidden", "true")

    await user.click(trigger)
    expect(handleActive).toHaveBeenCalledWith("section-1")

    rerender(
      <CourseAccordionBar
        course={course}
        isActive={["section-1"]}
        handleActive={handleActive}
      />
    )

    expect(trigger).toHaveAttribute("aria-expanded", "true")
    expect(content).toHaveAttribute("aria-hidden", "false")
  })
})
