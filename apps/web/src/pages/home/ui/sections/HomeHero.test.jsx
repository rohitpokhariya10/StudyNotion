import { render, screen } from "@testing-library/react"
import { MemoryRouter } from "react-router"
import { afterEach, describe, expect, it, vi } from "vitest"

import HomeHero from "./HomeHero"

vi.mock("@/entities/catalog", () => ({
  useGetCatalogCategoriesQuery: () => ({
    data: [{ id: "real-category", name: "Web Development" }],
    isLoading: false,
    isError: false,
  }),
}))

describe("Home hero", () => {
  afterEach(() => vi.restoreAllMocks())

  it("keeps semantic copy and links beside decorative static characters", () => {
    // No WebGL: the scene must stay on its static rendering.
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null)
    const { container } = render(
      <MemoryRouter>
        <HomeHero />
      </MemoryRouter>
    )
    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "Build your skills. Shape your future.",
      })
    ).toBeInTheDocument()
    expect(
      screen.getByRole("link", { name: "Explore courses" })
    ).toHaveAttribute("href", "/services")
    expect(screen.getByLabelText("Choose a subject")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Find courses" })).toBeDisabled()

    const scene = container.querySelector("[data-scene-mode]")
    expect(scene).toHaveAttribute("aria-hidden", "true")
    expect(scene).toHaveAttribute("data-scene-mode", "static")
    expect(scene.querySelector("svg")).toBeInTheDocument()
    expect(scene.querySelectorAll("svg ellipse")).toHaveLength(4)
  })
})
