import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { apiConnector } from "../apiConnector"
import {
  BuyCourse,
  fetchCheckoutConfig,
  fetchPurchaseHistory,
  requestPurchaseRefund,
} from "./studentFeaturesAPI"

vi.mock("../apiConnector", () => ({
  apiConnector: vi.fn(),
}))

vi.mock("react-hot-toast", () => ({
  toast: {
    dismiss: vi.fn(),
    error: vi.fn(),
    loading: vi.fn(),
    success: vi.fn(),
  },
}))

describe("secure checkout creation", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubEnv("VITE_RAZORPAY_KEY_ID", "rzp_test_public")
    window.sessionStorage.clear()
    window.Razorpay = class Razorpay {
      constructor(options) {
        this.options = options
      }

      on() {}

      open() {}
    }
  })

  afterEach(() => {
    delete window.Razorpay
    vi.unstubAllEnvs()
  })

  it("sends a reusable idempotency key when capturing an order", async () => {
    apiConnector.mockResolvedValue({
      data: {
        success: true,
        data: {
          id: "order_1",
          amount: 49900,
          currency: "INR",
          checkoutExpiresAt: new Date(
            Date.now() + 15 * 60 * 1000
          ).toISOString(),
        },
      },
    })
    const dispatch = vi.fn()

    await BuyCourse(
      null,
      ["course-1"],
      {
        _id: "user-1",
        email: "learner@example.com",
        firstName: "Test",
        lastName: "Learner",
      },
      vi.fn(),
      dispatch,
      {
        acknowledged: true,
        refundPolicyVersion: "refunds-2026-07",
        refundWindowDays: 7,
        termsVersion: "terms-2026-07",
      }
    )

    expect(apiConnector).toHaveBeenCalledWith(
      "POST",
      expect.stringContaining("/payment/capturePayment"),
      {
        acknowledgeCheckoutPolicies: true,
        courses: ["course-1"],
        refundPolicyVersion: "refunds-2026-07",
        refundWindowDays: 7,
        termsVersion: "terms-2026-07",
      },
      {
        "Idempotency-Key": expect.stringMatching(/^[A-Za-z0-9._:-]{8,100}$/),
      }
    )
  })

  it("loads and validates the server checkout policy snapshot", async () => {
    apiConnector.mockResolvedValue({
      data: {
        success: true,
        data: {
          checkoutTtlSeconds: 900,
          refundPolicyVersion: "refunds-2026-07",
          refundWindowDays: 7,
          termsVersion: "terms-2026-07",
        },
      },
    })

    await expect(fetchCheckoutConfig()).resolves.toMatchObject({
      refundWindowDays: 7,
      termsVersion: "terms-2026-07",
    })
    expect(apiConnector).toHaveBeenCalledWith(
      "GET",
      expect.stringContaining("/payment/config")
    )
  })

  it("uses the authenticated purchase history pagination contract", async () => {
    apiConnector.mockResolvedValue({
      data: {
        success: true,
        data: {
          pagination: { page: 2, pages: 3, total: 42 },
          purchases: [],
        },
      },
    })

    await expect(fetchPurchaseHistory({ page: 2, limit: 20 })).resolves.toEqual(
      expect.objectContaining({ purchases: [] })
    )
    expect(apiConnector).toHaveBeenCalledWith(
      "GET",
      expect.stringContaining("/payment/purchases"),
      null,
      undefined,
      { page: 2, limit: 20 }
    )
  })

  it("submits the exact learner refund confirmation and canonical reason", async () => {
    apiConnector.mockResolvedValue({
      data: {
        success: true,
        data: { purchaseId: "purchase/1", status: "refund_requested" },
        message: "Refund request submitted for review",
      },
    })

    await requestPurchaseRefund(
      "purchase/1",
      "The purchased course content could not be accessed."
    )
    expect(apiConnector).toHaveBeenCalledWith(
      "POST",
      expect.stringContaining("/payment/purchases/purchase%2F1/refund-request"),
      {
        confirmation: "REQUEST REFUND",
        reason: "The purchased course content could not be accessed.",
      }
    )
  })
})
