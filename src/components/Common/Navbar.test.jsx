import { configureStore } from "@reduxjs/toolkit"
import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { Provider } from "react-redux"
import { MemoryRouter } from "react-router-dom"
import { beforeEach, describe, expect, it, vi } from "vitest"

import rootReducer from "../../reducer"
import { setSession } from "../../slices/authSlice"
import Navbar from "./Navbar"

const catalogMocks = vi.hoisted(() => ({ categories: vi.fn() }))

vi.mock("../../services/catalogApi", async (importOriginal) => ({
  ...(await importOriginal()),
  useGetCatalogCategoriesQuery: catalogMocks.categories,
}))

describe("Navbar", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    catalogMocks.categories.mockReturnValue({ data: [], isLoading: false })
  })

  it("renders an empty catalog state when the API response has no data array", async () => {
    const store = configureStore({ reducer: rootReducer })

    render(
      <Provider store={store}>
        <MemoryRouter>
          <Navbar />
        </MemoryRouter>
      </Provider>
    )

    expect(await screen.findByText("No Courses Found")).toBeTruthy()
  })

  it("provides keyboard-accessible mobile navigation and anonymous actions", async () => {
    catalogMocks.categories.mockReturnValue({
      data: [
        {
          id: "category-1",
          name: "Web Development",
          publishedCourseCount: 1,
        },
      ],
      isLoading: false,
    })
    const store = configureStore({ reducer: rootReducer })
    store.dispatch(setSession(false))
    const user = userEvent.setup()

    render(
      <Provider store={store}>
        <MemoryRouter>
          <Navbar />
        </MemoryRouter>
      </Provider>
    )

    await user.click(screen.getByRole("button", { name: "Open navigation" }))
    const mobileNavigation = screen.getByRole("navigation", {
      name: "Mobile navigation",
    })
    expect(
      within(mobileNavigation).getByRole("link", { name: "Home" })
    ).toBeVisible()
    expect(
      within(mobileNavigation).getByRole("link", { name: "Log in" })
    ).toBeVisible()
    expect(
      within(mobileNavigation).getByRole("link", { name: "Sign up" })
    ).toBeVisible()

    await user.click(
      within(mobileNavigation).getByRole("button", { name: "Catalog" })
    )
    expect(
      within(mobileNavigation).getByRole("link", {
        name: "Web Development",
      })
    ).toBeVisible()

    await user.keyboard("{Escape}")
    expect(
      screen.queryByRole("navigation", { name: "Mobile navigation" })
    ).not.toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: "Open navigation" })
    ).toHaveFocus()
  })
})
