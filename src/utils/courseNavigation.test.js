import { describe, expect, it } from "vitest"

import { getFirstLessonPath } from "./courseNavigation"

describe("enrolled course navigation", () => {
  it("selects the first section that contains a real lesson", () => {
    expect(
      getFirstLessonPath({
        _id: "course-1",
        courseContent: [
          { _id: "empty-section", subSection: [] },
          { _id: "section-2", subSection: [{ _id: "lesson-1" }] },
        ],
      })
    ).toBe(
      "/view-course/course-1/section/section-2/sub-section/lesson-1"
    )
  })

  it("returns null instead of constructing a route with undefined IDs", () => {
    expect(
      getFirstLessonPath({
        _id: "course-1",
        courseContent: [{ _id: "empty-section", subSection: [] }],
      })
    ).toBeNull()
    expect(getFirstLessonPath({ _id: "course-1" })).toBeNull()
  })
})
