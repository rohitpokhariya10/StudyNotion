import { fireEvent, render, screen, within } from "@testing-library/react"
import { MemoryRouter } from "react-router"
import { describe, expect, it } from "vitest"

import Footer from "./Footer"

const renderFooter = () =>
  render(
    <MemoryRouter>
      <Footer />
    </MemoryRouter>
  )

describe("Footer", () => {
  it("offers real next steps instead of a newsletter form", () => {
    renderFooter()
    const footer = screen.getByRole("contentinfo")
    expect(within(footer).queryByRole("textbox")).toBeNull()
    expect(
      within(footer).queryByRole("link", { name: "Prahit home" })
    ).toBeNull()
    expect(
      within(footer).getByRole("link", { name: "Home", exact: true })
    ).toHaveAttribute("href", "/")
    expect(
      within(footer).getByText(/Prahit\. All rights reserved/)
    ).toBeVisible()
    expect(
      within(footer).getByRole("link", { name: "Create an account" })
    ).toHaveAttribute("href", "/signup")
    expect(
      within(footer).getByRole("link", { name: "Explore courses" })
    ).toHaveAttribute("href", "/services")
  })

  it("links only to implemented routes and the contact page", () => {
    renderFooter()
    const hrefs = within(screen.getByRole("contentinfo"))
      .getAllByRole("link")
      .map((link) => link.getAttribute("href"))
    expect(hrefs).toEqual(
      expect.arrayContaining(["/neet", "/privacy-policy", "/contact"])
    )
    for (const href of hrefs)
      expect(href.startsWith("/") || href.startsWith("mailto:")).toBe(true)
  })

  it("keeps the landscape decorative and falls back if it cannot load", () => {
    const { container } = renderFooter()
    const scene = container.querySelector(".sn-footer-scene")
    expect(scene).toHaveAttribute("aria-hidden", "true")
    const art = scene.querySelector("img")
    expect(art).toHaveAttribute("alt", "")
    expect(art).toHaveAttribute("loading", "lazy")
    fireEvent.error(art)
    expect(scene.querySelector("img")).toBeNull()
    expect(scene).toHaveClass("sn-footer-scene-fallback")
  })
})
