import { resetCart } from "@/entities/cart"
import { setPaymentLoading } from "@/entities/course"
import { BuyCourse } from "@/features/course-purchase"
import { apiConnector } from "@/shared/api/httpClient"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("@/shared/api/httpClient", () => ({ apiConnector: vi.fn() }))
vi.mock("react-hot-toast", () => ({
  toast: {
    dismiss: vi.fn(),
    error: vi.fn(),
    loading: vi.fn(),
    success: vi.fn(),
  },
}))

let options
let failed
const dispatch = vi.fn()
const navigate = vi.fn()
const receipt = {
  razorpay_order_id: "order_fixture",
  razorpay_payment_id: "pay_fixture",
  razorpay_signature: "synthetic-signature",
}
const start = () =>
  BuyCourse(
    null,
    ["fixture-course"],
    {
      _id: "fixture-student",
      email: "learner@example.test",
      firstName: "Fixture",
      lastName: "Learner",
    },
    navigate,
    dispatch,
    {
      acknowledged: true,
      termsVersion: "fixture-terms",
      refundPolicyVersion: "fixture-refunds",
      refundWindowDays: 7,
    }
  )

describe("checkout outcomes remain server-confirmed", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubEnv("VITE_RAZORPAY_KEY_ID", "rzp_test_fixture")
    sessionStorage.clear()
    window.Razorpay = class {
      constructor(config) {
        options = config
      }
      on(event, handler) {
        if (event === "payment.failed") failed = handler
      }
      open() {}
    }
    apiConnector.mockResolvedValueOnce({
      data: {
        success: true,
        data: {
          id: "order_fixture",
          amount: 49900,
          currency: "INR",
          checkoutExpiresAt: new Date(Date.now() + 900000).toISOString(),
        },
      },
    })
  })
  afterEach(() => {
    delete window.Razorpay
    vi.unstubAllEnvs()
  })
  it.each(["dismiss", "failure"])(
    "keeps cart and destination after provider %s",
    async (outcome) => {
      await start()
      if (outcome === "dismiss") options.modal.ondismiss()
      else failed()
      expect(dispatch).toHaveBeenLastCalledWith(setPaymentLoading(false))
      expect(dispatch).not.toHaveBeenCalledWith(resetCart())
      expect(navigate).not.toHaveBeenCalled()
      expect(sessionStorage.length).toBe(1)
      expect(apiConnector).toHaveBeenCalledTimes(1)
    }
  )
  it("waits for verification before clearing the cart and entering the library", async () => {
    await start()
    let confirm
    apiConnector.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          confirm = resolve
        })
    )
    apiConnector.mockResolvedValueOnce({ data: { success: true } })
    const verifying = options.handler(receipt)
    expect(dispatch).not.toHaveBeenCalledWith(resetCart())
    expect(navigate).not.toHaveBeenCalled()
    confirm({ data: { success: true } })
    await verifying
    expect(apiConnector).toHaveBeenNthCalledWith(
      2,
      "POST",
      expect.stringContaining("/payment/verifyPayment"),
      receipt
    )
    expect(dispatch).toHaveBeenCalledWith(resetCart())
    expect(navigate).toHaveBeenCalledWith("/dashboard/enrolled-courses", {
      replace: true,
    })
    expect(sessionStorage.length).toBe(0)
  })
  it("retains the cart and retry key when the server rejects verification", async () => {
    await start()
    apiConnector.mockResolvedValueOnce({
      data: { success: false, message: "Synthetic verification rejection" },
    })
    await options.handler(receipt)
    expect(dispatch).not.toHaveBeenCalledWith(resetCart())
    expect(navigate).not.toHaveBeenCalled()
    expect(dispatch).toHaveBeenLastCalledWith(setPaymentLoading(false))
    expect(sessionStorage.length).toBe(1)
  })
})
