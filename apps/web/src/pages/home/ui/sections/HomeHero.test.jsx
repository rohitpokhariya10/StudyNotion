import { render, screen, waitFor } from "@testing-library/react"
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

  it("keeps semantic copy and links beside the decorative yeti", async () => {
    // No WebGL: the yeti stays on its rest-pose poster.
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null)
    const { container } = render(
      <MemoryRouter>
        <HomeHero />
      </MemoryRouter>
    )
    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "Learn at your pace. Build skills that matter.",
      })
    ).toBeInTheDocument()
    expect(
      screen.getByRole("link", { name: "Explore courses" })
    ).toHaveAttribute("href", "/services")
    expect(screen.getByLabelText("Choose a subject")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Find courses" })).toBeDisabled()

    // The capsule characters are gone; the yeti stands in its sky window.
    expect(container.querySelector("[data-scene-mode]")).toBeNull()
    const hero = container.querySelector(".sn-hero-yeti")
    expect(hero).toHaveAttribute("aria-hidden", "true")
    expect(hero.querySelector(".sn-hero-yeti-window svg")).toBeInTheDocument()
    expect(hero.querySelector(".sn-hero-yeti-ledge")).toHaveAttribute("alt", "")
    const yeti = hero.querySelector(".sn-yeti")
    await waitFor(() => expect(yeti).toHaveAttribute("data-state", "static"))
    expect(yeti.querySelector("img")).toHaveAttribute("alt", "")
    expect(yeti.querySelector("img")).toHaveAttribute("fetchpriority", "high")
    expect(yeti.querySelector("canvas")).toBeNull()
  })
})
