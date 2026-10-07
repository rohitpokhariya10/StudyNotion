import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter, useLocation } from "react-router"
import { beforeEach, describe, expect, it, vi } from "vitest"

import CourseFinder from "./CourseFinder"

const mocks = vi.hoisted(() => ({ query: vi.fn() }))
vi.mock("@/entities/catalog", () => ({
  useGetCatalogCategoriesQuery: mocks.query,
}))
function Location() {
  const location = useLocation()
  return (
    <span aria-label="Destination">
      {location.pathname}
      {location.search}
    </span>
  )
}
function mount() {
  return render(
    <MemoryRouter>
      <CourseFinder />
      <Location />
    </MemoryRouter>
  )
}
describe("Course finder", () => {
  beforeEach(() =>
    mocks.query.mockReturnValue({
      data: [
        {
          id: "real-category",
          name: "Web Development",
          publishedCourseCount: 1,
        },
      ],
      isLoading: false,
      isError: false,
    })
  )
  it("requires a real category and safely encodes optional search", async () => {
    const user = userEvent.setup()
    mount()
    expect(screen.getByRole("button", { name: "Find courses" })).toBeDisabled()
    await user.selectOptions(
      screen.getByLabelText("Choose a subject"),
      "real-category"
    )
    await user.type(screen.getByRole("searchbox"), "React & CSS / next?")
    await user.click(screen.getByRole("button", { name: "Find courses" }))
    expect(screen.getByLabelText("Destination")).toHaveTextContent(
      "/catalog/web-development?q=React+%26+CSS+%2F+next%3F"
    )
  })
  it("exposes category loading, empty and retry states without a fake destination", async () => {
    const retry = vi.fn()
    mocks.query.mockReturnValue({ isLoading: true })
    const view = mount()
    expect(screen.getByRole("status")).toHaveTextContent("Loading subjects")
    mocks.query.mockReturnValue({ data: [], isLoading: false })
    view.rerender(
      <MemoryRouter>
        <CourseFinder />
      </MemoryRouter>
    )
    expect(screen.getByRole("status")).toHaveTextContent("New subjects")
    expect(screen.getByRole("button", { name: "Find courses" })).toBeDisabled()
    mocks.query.mockReturnValue({ isError: true, refetch: retry })
    view.rerender(
      <MemoryRouter>
        <CourseFinder />
      </MemoryRouter>
    )
    await userEvent.click(
      screen.getByRole("button", { name: "Retry subjects" })
    )
    expect(retry).toHaveBeenCalledOnce()
  })
})
