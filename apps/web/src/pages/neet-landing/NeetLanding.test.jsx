import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react"
import { MemoryRouter } from "react-router"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { neetFixture } from "../../../test/neetFixtures"
import NeetLanding from "./index"

const { listTests, session } = vi.hoisted(() => ({
  listTests: vi.fn(),
  session: { current: null },
}))
vi.mock("@/entities/neet", async (importOriginal) => ({
  ...(await importOriginal()),
  neetClient: { listTests },
}))
vi.mock("react-redux", () => ({
  useSelector: (selector) => selector(session.current),
}))

const signedOut = {
  auth: { isAuthenticated: false, status: "ready" },
  profile: { user: null },
}

function paper(id, subject = "physics", state = "OPEN") {
  const { test } = neetFixture()
  return {
    ...test,
    id,
    title: `${subject} paper ${id}`,
    sections: [{ ...test.sections[0], subjectKey: subject, title: subject }],
    availability: { ...test.availability, state },
  }
}
const mount = () =>
  render(
    <MemoryRouter initialEntries={["/neet"]}>
      <NeetLanding />
    </MemoryRouter>
  )
const startLinks = () => screen.getAllByRole("link", { name: /^Start a Mock/ })

describe("NEET landing", () => {
  beforeEach(() => {
    listTests.mockReset()
    session.current = signedOut
  })

  it("starts the first open paper and keeps real availability for the rest", async () => {
    listTests.mockResolvedValue({
      tests: [
        paper("closed", "physics", "CLOSED"),
        paper("soon", "chemistry", "UPCOMING"),
        paper("open", "botany"),
      ],
    })
    mount()
    await waitFor(() =>
      startLinks().forEach((link) =>
        expect(link).toHaveAttribute("href", "/neet/mocks/open/start")
      )
    )
    expect(startLinks()).toHaveLength(2)
    expect(screen.getByRole("link", { name: "Explore Tests" })).toHaveAttribute(
      "href",
      "/neet/mocks"
    )
    // Open papers are listed first; unavailable ones show their state only.
    const titles = screen
      .getAllByRole("heading", { level: 3 })
      .map((heading) => heading.textContent)
    expect(titles.slice(0, 3)).toEqual([
      "botany paper open",
      "chemistry paper soon",
      "physics paper closed",
    ])
    expect(screen.getByText("Opening soon")).toBeInTheDocument()
    expect(screen.getByText("This mock has closed")).toBeInTheDocument()
    const choose = screen.getAllByRole("link", { name: /^Choose this mock/ })
    expect(choose).toHaveLength(1)
    expect(choose[0]).toHaveAttribute("href", "/neet/mocks/open/start")
  })

  it("previews at most three papers and links to the full catalog", async () => {
    listTests.mockResolvedValue({
      tests: ["a", "b", "c", "d", "e"].map((id) => paper(id)),
    })
    mount()
    expect(
      await screen.findByRole("link", {
        name: "2 more papers on the mock tests page",
      })
    ).toHaveAttribute("href", "/neet/mocks")
    expect(
      screen.getAllByRole("link", { name: /^Choose this mock/ })
    ).toHaveLength(3)
  })

  it("shows the genuine empty state and reloads without inventing papers", async () => {
    listTests
      .mockResolvedValueOnce({ tests: [] })
      .mockResolvedValueOnce({ tests: [paper("new")] })
    mount()
    expect(
      await screen.findByRole("heading", {
        name: "No mocks are open right now",
      })
    ).toBeInTheDocument()
    startLinks().forEach((link) =>
      expect(link).toHaveAttribute("href", "/neet/mocks")
    )
    fireEvent.click(screen.getByRole("button", { name: "Check availability" }))
    expect(
      await screen.findByRole("heading", { name: "physics paper new" })
    ).toBeInTheDocument()
    expect(listTests).toHaveBeenCalledTimes(2)
  })

  it("recovers from a catalog failure through the retry action", async () => {
    listTests
      .mockRejectedValueOnce(new Error("unavailable"))
      .mockResolvedValueOnce({ tests: [paper("recovered")] })
    mount()
    expect(await screen.findByRole("alert")).toBeInTheDocument()
    startLinks().forEach((link) =>
      expect(link).toHaveAttribute("href", "/neet/mocks")
    )
    fireEvent.click(screen.getByRole("button", { name: "Try again" }))
    expect(
      await screen.findByRole("heading", { name: "physics paper recovered" })
    ).toBeInTheDocument()
    expect(screen.queryByRole("alert")).not.toBeInTheDocument()
  })

  it("keeps Start a Mock on the catalog while loading and when nothing is open", async () => {
    let resolve
    listTests.mockReturnValue(
      new Promise((done) => {
        resolve = done
      })
    )
    mount()
    expect(
      screen.getByRole("status", { name: "Loading mock tests" })
    ).toBeInTheDocument()
    startLinks().forEach((link) =>
      expect(link).toHaveAttribute("href", "/neet/mocks")
    )
    resolve({ tests: [paper("future", "physics", "UPCOMING")] })
    await screen.findByText("Opening soon")
    startLinks().forEach((link) =>
      expect(link).toHaveAttribute("href", "/neet/mocks")
    )
    expect(
      screen.queryByRole("link", { name: /^Choose this mock/ })
    ).not.toBeInTheDocument()
  })

  it("is a short page that ends with the preparation section", async () => {
    listTests.mockResolvedValue({ tests: [] })
    const { container } = mount()
    await screen.findByRole("heading", { name: "No mocks are open right now" })
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1)
    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "Big dreams. Stronger preparation.",
      })
    ).toBeInTheDocument()
    const sections = within(screen.getByRole("main"))
      .getAllByRole("heading", { level: 2 })
      .map((heading) => heading.textContent)
    expect(sections).toEqual([
      "Pick today’s sitting.",
      "Preparation with purpose. Confidence with a foundation.",
    ])
    for (const benefit of [
      "Build a consistent exam rhythm",
      "Stay focused during practice",
      "Understand your performance",
      "Improve through structured revision",
    ])
      expect(screen.getByRole("heading", { name: benefit })).toBeVisible()
    // The hero is drawn in code; the only image is the shared footer landscape.
    expect(container.querySelectorAll("main img")).toHaveLength(0)
    const footer = within(screen.getByRole("contentinfo"))
    expect(container.querySelector(".sn-footer .sn-footer-art")).toBeTruthy()
    expect(
      footer.getByRole("heading", { name: "Make room for your next chapter" })
    ).toBeInTheDocument()
    expect(
      footer.getByRole("link", { name: "Create an account" })
    ).toHaveAttribute("href", "/signup")
    expect(footer.getByRole("link", { name: "NEET Mocks" })).toHaveAttribute(
      "href",
      "/neet"
    )
    expect(
      footer.getByText(/not affiliated with or endorsed by the National/)
    ).toBeInTheDocument()
  })

  it("opens and closes the small-screen menu from the keyboard", async () => {
    listTests.mockResolvedValue({ tests: [] })
    mount()
    // jsdom applies the base stylesheet but not the phone media query, so the
    // button is display:none (with an empty accessible name) here. The real
    // browser check lives in e2e/neet-landing.spec.js.
    const button = document.querySelector("[aria-controls=np-mobile-menu]")
    expect(button).toHaveAttribute("aria-label", "Menu")
    const menu = document.getElementById("np-mobile-menu")
    expect(button).toHaveAttribute("aria-expanded", "false")
    expect(menu).toHaveAttribute("hidden")
    fireEvent.click(button)
    expect(button).toHaveAttribute("aria-expanded", "true")
    expect(menu).not.toHaveAttribute("hidden")
    fireEvent.keyDown(document, { key: "Escape" })
    expect(button).toHaveAttribute("aria-expanded", "false")
    expect(button).toHaveFocus()
    fireEvent.click(button)
    fireEvent.pointerDown(document.body)
    expect(button).toHaveAttribute("aria-expanded", "false")
    fireEvent.click(button)
    fireEvent.click(
      screen.getAllByRole("link", { name: "Mock tests", hidden: true })[1]
    )
    expect(button).toHaveAttribute("aria-expanded", "false")
  })

  it("offers sign-in to visitors and the account entry to signed-in students", async () => {
    listTests.mockResolvedValue({ tests: [] })
    const { unmount } = mount()
    expect(screen.getByRole("link", { name: "Sign in" })).toHaveAttribute(
      "href",
      "/login"
    )
    expect(
      screen.getByRole("link", { name: "Back to Prahit" })
    ).toHaveAttribute("href", "/")
    expect(screen.getByRole("link", { name: "Overview" })).toHaveAttribute(
      "aria-current",
      "page"
    )
    // Typographic wordmark only: no icon and no stacked "Prahit" label.
    const brand = screen.getByRole("link", { name: "Prahit NEET Mocks home" })
    expect(brand).toHaveAttribute("href", "/neet")
    expect(brand).toHaveTextContent(/^NEET Mocks$/)
    expect(brand.querySelector("svg, img")).toBeNull()
    expect(within(brand).queryByText(/^prahit$/i)).toBeNull()
    await screen.findByRole("heading", { name: "No mocks are open right now" })
    unmount()

    session.current = {
      auth: { isAuthenticated: true, status: "ready" },
      profile: { user: { firstName: "Asha", accountType: "Student" } },
    }
    mount()
    expect(
      screen.getByRole("link", { name: "Signed in as Asha. View mocks." })
    ).toHaveAttribute("href", "/neet/mocks")
    expect(
      screen.queryByRole("link", { name: "Sign in" })
    ).not.toBeInTheDocument()
    await screen.findByRole("heading", { name: "No mocks are open right now" })
  })
})
