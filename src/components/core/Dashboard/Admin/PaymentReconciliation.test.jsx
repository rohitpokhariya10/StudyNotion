import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import {
  fetchPaymentReconciliation,
  resolvePaymentReconciliation,
} from "../../../../services/operations/adminAPI"
import PaymentReconciliation from "./PaymentReconciliation"

vi.mock("../../../../services/operations/adminAPI", () => ({
  fetchPaymentReconciliation: vi.fn(),
  resolvePaymentReconciliation: vi.fn(),
}))

vi.mock("react-hot-toast", () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}))

describe("PaymentReconciliation", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    fetchPaymentReconciliation.mockResolvedValue({
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
          paidAt: "2026-07-18T10:00:00.000Z",
          razorpayOrderId: "order_1",
          razorpayPaymentId: "pay_1",
          reconciliationRequiredAt: "2026-07-18T11:00:00.000Z",
          refundPolicyVersion: "refunds-2026-07",
          refundRequestNote: "Course delivery did not match the listing.",
          refundWindowDays: 7,
          status: "refund_requested",
          user: {
            accountType: "Student",
            active: true,
            approved: true,
            email: "learner@example.com",
            firstName: "Test",
            lastName: "Learner",
          },
        },
      ],
    })
    resolvePaymentReconciliation.mockResolvedValue({
      data: {
        purchaseId: "purchase-1",
        resolution: "refund_rejected",
        status: "fulfilled",
      },
      message: "Refund request rejected",
    })
  })

  it("offers an audited rejection without forcing every request to refund", async () => {
    const user = userEvent.setup()
    render(<PaymentReconciliation />)

    expect(await screen.findByText("Production React")).toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: "Approve & refund" })
    ).toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: "Reject request" }))
    const note =
      "Course access was delivered and the policy conditions were unmet."
    await user.type(screen.getByRole("textbox", { name: "Audit note" }), note)
    await user.click(
      screen.getByRole("button", { name: "Confirm request rejection" })
    )

    await waitFor(() =>
      expect(resolvePaymentReconciliation).toHaveBeenCalledWith({
        action: "reject_refund",
        note,
        overrideRefundWindow: false,
        purchaseId: "purchase-1",
      })
    )
  })

  it("uses the explicit retry path when Razorpay marked a refund failed", async () => {
    fetchPaymentReconciliation.mockResolvedValue({
      pagination: { page: 1, pages: 1, total: 1 },
      purchases: [
        {
          _id: "purchase-2",
          amount: 49900,
          createdAt: "2026-07-18T10:00:00.000Z",
          currency: "INR",
          lineItems: [{ course: "course-1", courseName: "Production React" }],
          paidAt: "2026-07-18T10:00:00.000Z",
          razorpayOrderId: "order_2",
          razorpayPaymentId: "pay_2",
          reconciliationRequiredAt: "2026-07-18T11:00:00.000Z",
          refundAttemptedAt: "2026-07-18T12:00:00.000Z",
          refundId: "rfnd_failed",
          refundLastCheckedAt: "2026-07-18T12:05:00.000Z",
          refundProviderStatus: "failed",
          refundWindowDays: 7,
          status: "refund_pending",
          user: {
            accountType: "Student",
            active: true,
            approved: true,
            email: "learner@example.com",
          },
        },
      ],
    })
    resolvePaymentReconciliation.mockResolvedValue({
      data: { purchaseId: "purchase-2", status: "refund_pending" },
      message: "Refund retry submitted",
    })
    const user = userEvent.setup()
    render(<PaymentReconciliation />)

    await user.click(
      await screen.findByRole("button", { name: "Retry failed refund" })
    )
    const note = "Provider failure confirmed; one audited retry is approved."
    await user.type(screen.getByRole("textbox", { name: "Audit note" }), note)
    await user.click(
      screen.getByRole("button", { name: "Confirm one refund retry" })
    )

    await waitFor(() =>
      expect(resolvePaymentReconciliation).toHaveBeenCalledWith({
        action: "retry_refund",
        note,
        overrideRefundWindow: false,
        purchaseId: "purchase-2",
      })
    )
  })
})
