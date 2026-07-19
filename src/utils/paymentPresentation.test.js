import { describe, expect, it } from "vitest"

import {
  getRefundDeadline,
  requiresRefundWindowOverride,
} from "./paymentPresentation"

describe("refund-window presentation", () => {
  const expiredPurchase = {
    createdAt: "2020-01-01T00:00:00.000Z",
    paidAt: "2020-01-01T00:00:00.000Z",
    refundWindowDays: 7,
  }

  it("requires override only before an out-of-window initial refund attempt", () => {
    const paymentReview = { ...expiredPurchase, status: "payment_review" }
    expect(
      requiresRefundWindowOverride(
        paymentReview,
        getRefundDeadline(paymentReview)
      )
    ).toBe(true)
  })

  it("does not require override for a timely learner request reviewed later", () => {
    const refundRequested = {
      ...expiredPurchase,
      refundRequestedAt: "2020-01-02T00:00:00.000Z",
      status: "refund_requested",
    }
    expect(
      requiresRefundWindowOverride(
        refundRequested,
        getRefundDeadline(refundRequested)
      )
    ).toBe(false)
  })

  it("does not require override when polling or retrying a provider attempt", () => {
    const refundPending = {
      ...expiredPurchase,
      refundAttemptedAt: "2020-01-03T00:00:00.000Z",
      refundId: "rfnd_1",
      status: "refund_pending",
    }
    expect(
      requiresRefundWindowOverride(
        refundPending,
        getRefundDeadline(refundPending)
      )
    ).toBe(false)
  })
})
