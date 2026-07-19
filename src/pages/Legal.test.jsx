import { render, screen } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { describe, expect, it, vi } from "vitest"

vi.mock("../services/operations/studentFeaturesAPI", () => ({
  fetchCheckoutConfig: vi.fn().mockResolvedValue({ refundWindowDays: 7 }),
}))

import Legal from "./Legal"

describe("legal pages", () => {
  it.each([
    ["privacy", "Privacy Policy"],
    ["cookies", "Cookie Policy"],
    ["terms", "Terms of Use"],
    ["refunds", "Refund & Cancellation Policy"],
  ])("renders the %s document and support contact", async (document, heading) => {
    render(
      <MemoryRouter>
        <Legal document={document} />
      </MemoryRouter>
    )

    expect(screen.getByRole("heading", { level: 1, name: heading })).toBeVisible()
    expect(
      screen
        .getAllByRole("link", { name: /support@/i })
        .every((link) => link.getAttribute("href")?.startsWith("mailto:"))
    ).toBe(true)
    if (document === "refunds") {
      expect(
        await screen.findByText(/within 7 calendar days/i)
      ).toBeVisible()
    }
  })
})
