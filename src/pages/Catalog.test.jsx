import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom"
import { beforeEach, describe, expect, it, vi } from "vitest"

import Catalog from "./Catalog"

const apiMocks = vi.hoisted(() => ({
  categories: vi.fn(),
  courses: vi.fn(),
}))

vi.mock("../services/catalogApi", () => ({
  getCatalogErrorPresentation: (error) => ({
    message:
      error?.data?.error?.message ||
      "We could not load the catalog. Please try again.",
    requestId: error?.data?.error?.requestId || null,
  }),
  useGetCatalogCategoriesQuery: apiMocks.categories,
  useGetCoursesInfiniteQuery: apiMocks.courses,
}))

vi.mock("../components/Common/Footer", () => ({
  default: () => <footer>StudyNotion footer</footer>,
}))

const category = {
  id: "507f1f77bcf86cd799439012",
  name: "Web Development",
  description: "Learn to build useful web products.",
  publishedCourseCount: 2,
}

const course = {
  id: "507f1f77bcf86cd799439011",
  name: "Production React",
  description: "Build resilient React applications.",
  thumbnailUrl: "https://res.cloudinary.com/example/image/upload/course.webp",
  price: 1499,
  currency: "INR",
  instructor: {
    id: "507f191e810c19729de860ea",
    name: "Asha Rao",
    imageUrl: null,
  },
  category: {
    id: category.id,
    name: category.name,
  },
  rating: { average: 4.7, count: 18 },
  durationSeconds: 10800,
  level: "intermediate",
  language: "en",
  enrollmentCount: 245,
  createdAt: "2026-07-20T10:00:00.000Z",
}

const defaultCategoriesResult = {
  data: [category],
  error: undefined,
  isError: false,
  isLoading: false,
  refetch: vi.fn(),
}

const coursesResult = (overrides = {}) => ({
  currentData: {
    pages: [
      {
        items: [course],
        pageInfo: { endCursor: null, hasNextPage: false },
      },
    ],
    pageParams: [null],
  },
  error: undefined,
  fetchNextPage: vi.fn(),
  hasNextPage: false,
  isError: false,
  isFetching: false,
  isFetchingNextPage: false,
  isLoading: false,
  refetch: vi.fn(),
  ...overrides,
})

function LocationProbe() {
  const location = useLocation()
  return <output aria-label="Current query">{location.search}</output>
}

const renderCatalog = (path = "/catalog/web-development") =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route
          path="/catalog/:catalogName"
          element={
            <>
              <Catalog />
              <LocationProbe />
            </>
          }
        />
      </Routes>
    </MemoryRouter>
  )

describe("Catalog", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    apiMocks.categories.mockReturnValue({ ...defaultCategoriesResult })
    apiMocks.courses.mockReturnValue(coursesResult())
  })

  it("shows a named, layout-matched initial loading state", () => {
    apiMocks.categories.mockReturnValue({
      ...defaultCategoriesResult,
      data: undefined,
      isLoading: true,
    })

    renderCatalog()

    expect(
      screen.getByRole("status", { name: "Loading courses" })
    ).toBeVisible()
    expect(screen.getByText("Loading courses…")).toHaveClass("sr-only")
  })

  it("keeps the loading state while a changed query has no current data", () => {
    apiMocks.courses.mockReturnValue(
      coursesResult({
        currentData: undefined,
        isFetching: true,
        isLoading: false,
      })
    )

    renderCatalog("/catalog/web-development?q=react")

    expect(
      screen.getByRole("status", { name: "Loading courses" })
    ).toBeVisible()
    expect(
      screen.queryByRole("heading", { name: "No courses match these filters" })
    ).not.toBeInTheDocument()
  })

  it("renders a semantic populated grid and end state", () => {
    renderCatalog()

    expect(
      screen.getByRole("heading", { name: "Web Development", level: 1 })
    ).toBeVisible()
    expect(screen.getByRole("list", { name: "Courses" })).toBeVisible()
    expect(
      screen.getByRole("link", { name: "View Production React course details" })
    ).toHaveAttribute("href", "/courses/507f1f77bcf86cd799439011")
    expect(
      screen.getByText("You’ve reached the end of this category.")
    ).toBeVisible()
  })

  it("writes validated search and filters to the URL and query cache key", async () => {
    const user = userEvent.setup()
    renderCatalog()

    await user.type(
      screen.getByRole("searchbox", { name: "Search courses" }),
      "react"
    )
    await user.click(screen.getByRole("button", { name: "Show filters" }))
    await user.selectOptions(screen.getByLabelText("Level"), "beginner")
    await user.selectOptions(screen.getByLabelText("Language"), "en")
    await user.click(screen.getByRole("button", { name: "Search" }))

    await waitFor(() =>
      expect(screen.getByLabelText("Current query")).toHaveTextContent(
        "?q=react&level=beginner&language=en"
      )
    )
    expect(apiMocks.courses).toHaveBeenLastCalledWith(
      expect.objectContaining({
        q: "react",
        categoryId: category.id,
        level: "beginner",
        language: "en",
        sort: "relevance",
      }),
      { skip: false }
    )
    expect(screen.getByText("3 active filters")).toBeVisible()
  })

  it("validates price ranges before navigation", async () => {
    const user = userEvent.setup()
    renderCatalog()

    await user.click(screen.getByRole("button", { name: "Show filters" }))
    await user.type(screen.getByLabelText("Minimum price"), "1000")
    await user.type(screen.getByLabelText("Maximum price"), "500")
    await user.click(screen.getByRole("button", { name: "Apply filters" }))

    expect(
      screen.getByRole("alert", {
        name: "",
      })
    ).toHaveTextContent("Minimum price cannot be greater")
    expect(screen.getByLabelText("Current query")).toHaveTextContent("")
  })

  it("sanitizes inconsistent ranges restored from a shared URL", () => {
    renderCatalog(
      "/catalog/web-development?minPrice=1000&maxPrice=500&minDurationSeconds=7200&maxDurationSeconds=60"
    )

    expect(apiMocks.courses).toHaveBeenLastCalledWith(
      expect.objectContaining({
        minPrice: "",
        maxPrice: "",
        minDurationSeconds: "",
        maxDurationSeconds: "",
      }),
      { skip: false }
    )
  })

  it("uses server-side sort values and never enables relevance without q", async () => {
    const user = userEvent.setup()
    renderCatalog()

    expect(screen.getByRole("option", { name: "Most relevant" })).toBeDisabled()
    await user.selectOptions(screen.getByLabelText("Sort by"), "price_asc")

    await waitFor(() =>
      expect(screen.getByLabelText("Current query")).toHaveTextContent(
        "?sort=price_asc"
      )
    )
    expect(apiMocks.courses).toHaveBeenLastCalledWith(
      expect.objectContaining({ sort: "price_asc" }),
      { skip: false }
    )
  })

  it("distinguishes an empty category from filtered no-results", () => {
    apiMocks.courses.mockReturnValue(
      coursesResult({
        currentData: {
          pages: [
            {
              items: [],
              pageInfo: { endCursor: null, hasNextPage: false },
            },
          ],
          pageParams: [null],
        },
      })
    )

    const first = renderCatalog()
    expect(
      screen.getByRole("heading", { name: "No courses published yet" })
    ).toBeVisible()
    first.unmount()

    renderCatalog("/catalog/web-development?q=rust")
    expect(
      screen.getByRole("heading", { name: "No courses match these filters" })
    ).toBeVisible()
    expect(screen.getByRole("button", { name: "Clear filters" })).toBeVisible()
  })

  it("shows a safe request ID and retries an initial API error", async () => {
    const refetch = vi.fn()
    apiMocks.courses.mockReturnValue(
      coursesResult({
        currentData: undefined,
        error: {
          status: 500,
          data: {
            error: {
              code: "CATALOG_READ_FAILED",
              message: "Courses are temporarily unavailable.",
              requestId: "request-500",
            },
          },
        },
        isError: true,
        refetch,
      })
    )
    const user = userEvent.setup()

    renderCatalog()

    expect(
      screen.getByRole("heading", { name: "Courses could not be loaded" })
    ).toBeVisible()
    expect(screen.getByText("Request ID: request-500")).toBeVisible()
    await user.click(screen.getByRole("button", { name: "Try again" }))
    expect(refetch).toHaveBeenCalledTimes(1)
  })

  it("loads the next cursor page without replacing current cards", async () => {
    const fetchNextPage = vi.fn()
    apiMocks.courses.mockReturnValue(
      coursesResult({
        fetchNextPage,
        hasNextPage: true,
      })
    )
    const user = userEvent.setup()

    renderCatalog()
    await user.click(screen.getByRole("button", { name: "Load more courses" }))

    expect(fetchNextPage).toHaveBeenCalledTimes(1)
    expect(screen.getByText("Production React")).toBeVisible()
  })

  it("announces loading-more while retaining the current grid", () => {
    apiMocks.courses.mockReturnValue(
      coursesResult({
        hasNextPage: true,
        isFetching: true,
        isFetchingNextPage: true,
      })
    )

    renderCatalog()

    expect(
      screen.getByRole("button", { name: "Loading more courses…" })
    ).toBeDisabled()
    expect(screen.getByText("Production React")).toBeVisible()
  })

  it("renders category-not-found separately from transport errors", () => {
    renderCatalog("/catalog/not-a-category")

    expect(
      screen.getByRole("heading", { name: "Catalog category not found" })
    ).toBeVisible()
    expect(apiMocks.courses).toHaveBeenLastCalledWith(
      expect.objectContaining({ categoryId: "" }),
      { skip: true }
    )
  })
})
