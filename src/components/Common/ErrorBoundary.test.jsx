import { fireEvent, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { configureErrorReporter } from "../../utils/errorMonitoring"
import ErrorBoundary from "./ErrorBoundary"

function BrokenView() {
  throw new Error("render failed")
}

describe("ErrorBoundary", () => {
  let consoleError

  beforeEach(() => {
    configureErrorReporter(vi.fn())
    consoleError = vi.spyOn(console, "error").mockImplementation(() => {})
  })

  afterEach(() => consoleError.mockRestore())

  it("shows a recoverable fallback and reports only sanitized context", () => {
    const reporter = vi.fn()
    configureErrorReporter(reporter)

    render(
      <ErrorBoundary scope="route" title="Page unavailable">
        <BrokenView />
      </ErrorBoundary>
    )

    expect(screen.getByRole("alert")).toHaveTextContent("Page unavailable")
    expect(screen.getByRole("button", { name: "Reload page" })).toBeVisible()
    expect(screen.getByRole("link", { name: "Return home" })).toHaveAttribute(
      "href",
      "/"
    )
    expect(reporter).toHaveBeenCalledWith(
      expect.objectContaining({ message: "render failed" }),
      expect.objectContaining({ boundary: "route" })
    )
  })

  it("recovers when a route reset key changes", () => {
    const { rerender } = render(
      <ErrorBoundary resetKey="first">
        <BrokenView />
      </ErrorBoundary>
    )

    expect(screen.getByRole("alert")).toBeVisible()

    rerender(
      <ErrorBoundary resetKey="second">
        <p>Recovered route</p>
      </ErrorBoundary>
    )

    expect(screen.getByText("Recovered route")).toBeVisible()
  })

  it("offers a reload action", () => {
    const reload = vi.fn()
    const location = window.location
    Object.defineProperty(window, "location", {
      configurable: true,
      value: { ...location, reload },
    })

    render(
      <ErrorBoundary>
        <BrokenView />
      </ErrorBoundary>
    )
    fireEvent.click(screen.getByRole("button", { name: "Reload page" }))

    expect(reload).toHaveBeenCalledOnce()
    Object.defineProperty(window, "location", {
      configurable: true,
      value: location,
    })
  })
})
