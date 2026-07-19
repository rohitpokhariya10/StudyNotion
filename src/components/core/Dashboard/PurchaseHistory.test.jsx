import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter } from "react-router-dom"
import { beforeEach, describe, expect, it, vi } from "vitest"

import {
  fetchPurchaseHistory,
  requestPurchaseRefund,
} from "../../../services/operations/studentFeaturesAPI"
import PurchaseHistory from "./PurchaseHistory"

vi.mock("../../../services/operations/studentFeaturesAPI", () => ({
  fetchPurchaseHistory: vi.fn(),
  requestPurchaseRefund: vi.fn(),
}))

vi.mock("react-hot-toast", () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}))

describe("PurchaseHistory", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    fetchPurchaseHistory.mockResolvedValue({
      pagination: { page: 1, pages: 1, total: 1 },
      purchases: [
        {
          _id: "purchase-1",
          amount: 49900,
          checkoutTermsVersion: "terms-2026-07",
          createdAt: "2026-07-18T10:00:00.000Z",
          currency: "INR",
          lineItems: [
            {
              amount: 49900,
              course: "course-1",
              courseName: "Production React",
            },
          ],
          razorpayOrderId: "order_1",
          refundEligible: true,
          refundEligibleUntil: "2026-07-25T10:00:00.000Z",
          refundPolicyVersion: "refunds-2026-07",
          refundWindowDays: 7,
          status: "fulfilled",
        },
      ],
    })
    requestPurchaseRefund.mockResolvedValue({
      data: { purchaseId: "purchase-1", status: "refund_requested" },
      message: "Refund request submitted for review",
    })
  })

  it("submits an eligible refund request with the learner reason", async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <PurchaseHistory />
      </MemoryRouter>
    )

    expect(await screen.findByText("Production React")).toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: "Request refund" }))
    const reason = "The course content could not be accessed after payment."
    await user.type(
      screen.getByRole("textbox", {
        name: "Why are you requesting a refund?",
      }),
      reason
    )
    await user.click(
      screen.getByRole("button", { name: "Submit refund request" })
    )

    await waitFor(() =>
      expect(requestPurchaseRefund).toHaveBeenCalledWith("purchase-1", reason)
    )
  })

  it("shows a reviewed rejection without claiming the refund window simply closed", async () => {
    fetchPurchaseHistory.mockResolvedValue({
      pagination: { page: 1, pages: 1, total: 1 },
      purchases: [
        {
          _id: "purchase-1",
          amount: 49900,
          createdAt: "2026-07-18T10:00:00.000Z",
          currency: "INR",
          lineItems: [{ course: "course-1", courseName: "Production React" }],
          refundEligible: false,
          refundRejectedAt: "2026-07-19T10:00:00.000Z",
          refundWindowDays: 7,
          status: "fulfilled",
        },
      ],
    })

    render(
      <MemoryRouter>
        <PurchaseHistory />
      </MemoryRouter>
    )

    expect(await screen.findByText("Refund not approved")).toBeInTheDocument()
    expect(
      screen.getByText(/contact support if you need to appeal/i)
    ).toBeVisible()
    expect(screen.queryByText(/refund request window has closed/i)).toBeNull()
  })
})
