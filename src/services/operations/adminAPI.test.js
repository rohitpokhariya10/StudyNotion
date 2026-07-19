import { beforeEach, describe, expect, it, vi } from "vitest"

import { apiConnector } from "../apiConnector"
import {
  fetchPaymentReconciliation,
  resolvePaymentReconciliation,
} from "./adminAPI"

vi.mock("../apiConnector", () => ({
  apiConnector: vi.fn(),
}))

describe("payment reconciliation operations", () => {
  beforeEach(() => vi.clearAllMocks())

  it("loads the paginated admin queue", async () => {
    apiConnector.mockResolvedValue({
      data: {
        success: true,
        data: {
          pagination: { page: 1, pages: 1, total: 1 },
          purchases: [{ _id: "purchase-1", status: "payment_review" }],
        },
      },
    })

    await expect(
      fetchPaymentReconciliation({ page: 1, limit: 20 })
    ).resolves.toEqual(
      expect.objectContaining({ purchases: expect.any(Array) })
    )
    expect(apiConnector).toHaveBeenCalledWith(
      "GET",
      expect.stringContaining("/admin/payments/reconciliation"),
      null,
      undefined,
      { page: 1, limit: 20 }
    )
  })

  it("sends exact confirmations and audited refund overrides", async () => {
    apiConnector.mockResolvedValue({
      data: {
        success: true,
        data: { purchaseId: "purchase/1", resolution: "refunded" },
      },
    })

    await resolvePaymentReconciliation({
      action: "refund",
      note: "Provider capture confirmed and refund approved.",
      overrideRefundWindow: true,
      purchaseId: "purchase/1",
    })
    expect(apiConnector).toHaveBeenCalledWith(
      "POST",
      expect.stringContaining(
        "/admin/payments/reconciliation/purchase%2F1/resolve"
      ),
      {
        action: "refund",
        confirmation: "REFUND PAYMENT",
        note: "Provider capture confirmed and refund approved.",
        overrideRefundWindow: true,
      }
    )
  })

  it("uses the explicit learner refund rejection contract", async () => {
    apiConnector.mockResolvedValue({
      data: {
        success: true,
        data: {
          purchaseId: "purchase-1",
          resolution: "refund_rejected",
          status: "fulfilled",
        },
      },
    })

    await resolvePaymentReconciliation({
      action: "reject_refund",
      note: "Request is outside the recorded policy conditions.",
      overrideRefundWindow: true,
      purchaseId: "purchase-1",
    })
    expect(apiConnector).toHaveBeenCalledWith(
      "POST",
      expect.stringContaining(
        "/admin/payments/reconciliation/purchase-1/resolve"
      ),
      {
        action: "reject_refund",
        confirmation: "REJECT REFUND",
        note: "Request is outside the recorded policy conditions.",
      }
    )
  })

  it("uses a separate exact confirmation for a failed provider refund retry", async () => {
    apiConnector.mockResolvedValue({
      data: {
        success: true,
        data: { purchaseId: "purchase-1", status: "refund_pending" },
      },
    })

    await resolvePaymentReconciliation({
      action: "retry_refund",
      note: "Provider failure confirmed; one audited retry is approved.",
      purchaseId: "purchase-1",
    })
    expect(apiConnector).toHaveBeenCalledWith(
      "POST",
      expect.stringContaining(
        "/admin/payments/reconciliation/purchase-1/resolve"
      ),
      {
        action: "retry_refund",
        confirmation: "RETRY FAILED REFUND",
        note: "Provider failure confirmed; one audited retry is approved.",
      }
    )
  })
})
