import { toast } from "react-hot-toast"

import rzpLogo from "../../assets/Logo/rzp_logo.png"
import { resetCart } from "../../slices/cartSlice"
import { setPaymentLoading } from "../../slices/courseSlice"
import {
  clearCheckoutIdempotency,
  getCheckoutIdempotency,
} from "../../utils/checkoutIdempotency"
import { apiConnector } from "../apiConnector"
import { studentEndpoints } from "../apis"

const {
  CHECKOUT_CONFIG_API,
  COURSE_PAYMENT_API,
  COURSE_VERIFY_API,
  PURCHASE_HISTORY_API,
  REFUND_REQUEST_API,
  SEND_PAYMENT_SUCCESS_EMAIL_API,
} = studentEndpoints

const RAZORPAY_SCRIPT_SRC = "https://checkout.razorpay.com/v1/checkout.js"
const RAZORPAY_SCRIPT_TIMEOUT_MS = 15_000
let razorpayScriptPromise

// Load the Razorpay SDK from the CDN exactly once, including concurrent calls.
function loadScript(src) {
  if (typeof window === "undefined") return Promise.resolve(false)
  if (window.Razorpay) return Promise.resolve(true)
  if (razorpayScriptPromise) return razorpayScriptPromise

  razorpayScriptPromise = new Promise((resolve) => {
    const existingScript = document.querySelector(`script[src="${src}"]`)
    const script = existingScript || document.createElement("script")
    let settled = false

    const finish = (loaded) => {
      if (settled) return
      settled = true
      clearTimeout(timeout)
      script.removeEventListener("load", handleLoad)
      script.removeEventListener("error", handleError)
      if (!loaded) razorpayScriptPromise = undefined
      if (!loaded && !window.Razorpay) script.remove()
      resolve(loaded)
    }

    const handleLoad = () => finish(Boolean(window.Razorpay))
    const handleError = () => finish(false)
    const timeout = setTimeout(
      () => finish(false),
      RAZORPAY_SCRIPT_TIMEOUT_MS
    )

    script.addEventListener("load", handleLoad)
    script.addEventListener("error", handleError)

    if (!existingScript) {
      script.src = src
      script.async = true
      script.referrerPolicy = "strict-origin-when-cross-origin"
      document.body.appendChild(script)
    }
  })

  return razorpayScriptPromise
}

// Buy the Course
export async function BuyCourse(
  _token,
  courses,
  user_details,
  navigate,
  dispatch,
  checkoutPolicy = null
) {
  const toastId = toast.loading("Preparing secure checkout...")
  let checkoutOpened = false
  dispatch(setPaymentLoading(true))

  try {
    const razorpayKey = import.meta.env.VITE_RAZORPAY_KEY_ID?.trim()
    if (!razorpayKey || razorpayKey.includes("replace")) {
      throw new Error("Payments are not configured")
    }
    if (!Array.isArray(courses) || courses.length === 0) {
      throw new Error("Your cart is empty")
    }
    if (!user_details?.email) {
      throw new Error("Your profile could not be loaded")
    }
    if (checkoutPolicy?.acknowledged !== true) {
      throw new Error("Review and accept the checkout policies before payment")
    }

    const termsVersion = String(checkoutPolicy.termsVersion || "").trim()
    const refundPolicyVersion = String(
      checkoutPolicy.refundPolicyVersion || ""
    ).trim()
    const refundWindowDays = Number(checkoutPolicy.refundWindowDays)
    if (
      !termsVersion ||
      !refundPolicyVersion ||
      !Number.isInteger(refundWindowDays) ||
      refundWindowDays < 0 ||
      refundWindowDays > 30
    ) {
      throw new Error(
        "Checkout policy details are unavailable. Please refresh."
      )
    }

    // Load Razorpay SDK
    const res = await loadScript(RAZORPAY_SCRIPT_SRC)
    if (!res) {
      throw new Error("Secure checkout could not be loaded")
    }

    const checkout = getCheckoutIdempotency({
      courses,
      userId: user_details._id,
    })

    // Initiate (or safely resume) one backend order for this checkout.
    const orderResponse = await apiConnector(
      "POST",
      COURSE_PAYMENT_API,
      {
        acknowledgeCheckoutPolicies: true,
        courses,
        refundPolicyVersion,
        refundWindowDays,
        termsVersion,
      },
      { "Idempotency-Key": checkout.idempotencyKey }
    )

    if (!orderResponse?.data?.success) {
      throw new Error(orderResponse?.data?.message || "Could not create order")
    }

    const orderData = orderResponse.data.data
    const amount = Number(orderData?.amount)
    if (
      !orderData?.id ||
      !Number.isSafeInteger(amount) ||
      amount <= 0 ||
      !orderData?.currency
    ) {
      throw new Error("The payment provider returned an invalid order")
    }
    const checkoutExpiresAt = Date.parse(orderData.checkoutExpiresAt)
    const checkoutTimeoutSeconds = Math.floor(
      (checkoutExpiresAt - Date.now()) / 1000
    )
    if (!Number.isFinite(checkoutExpiresAt) || checkoutTimeoutSeconds <= 5) {
      throw new Error("This checkout expired. Please start again.")
    }

    // Razorpay options
    const options = {
      key: razorpayKey,
      currency: orderData.currency,
      amount: amount,
      order_id: orderData.id,
      timeout: Math.min(checkoutTimeoutSeconds - 5, 15 * 60),
      name: "StudyNotion",
      description: "Thank you for Purchasing the Course.",
      image: rzpLogo,
      prefill: {
        name: `${user_details.firstName} ${user_details.lastName}`,
        email: user_details.email,
      },
      handler: async (response) => {
        const verified = await verifyPayment(response, navigate, dispatch)
        if (verified) clearCheckoutIdempotency(checkout.storageKey)
      },
      modal: {
        ondismiss: () => dispatch(setPaymentLoading(false)),
      },
    }

    if (!window.Razorpay) throw new Error("Razorpay SDK not available")

    const paymentObject = new window.Razorpay(options)
    paymentObject.on("payment.failed", () => {
      toast.error("Oops! Payment Failed.")
      dispatch(setPaymentLoading(false))
    })
    paymentObject.open()
    checkoutOpened = true
  } catch (error) {
    toast.error(
      error?.response?.data?.message ||
        error?.message ||
        "Could not start payment"
    )
  } finally {
    toast.dismiss(toastId)
    if (!checkoutOpened) dispatch(setPaymentLoading(false))
  }
}

export async function fetchCheckoutConfig() {
  try {
    const response = await apiConnector("GET", CHECKOUT_CONFIG_API)
    const config = response?.data?.data
    if (
      !response?.data?.success ||
      typeof config?.termsVersion !== "string" ||
      !config.termsVersion.trim() ||
      typeof config?.refundPolicyVersion !== "string" ||
      !config.refundPolicyVersion.trim() ||
      !Number.isInteger(config?.refundWindowDays) ||
      config.refundWindowDays < 0 ||
      config.refundWindowDays > 30 ||
      !Number.isInteger(config?.checkoutTtlSeconds) ||
      config.checkoutTtlSeconds <= 5
    ) {
      throw new Error(
        response?.data?.message || "Invalid checkout configuration"
      )
    }
    return config
  } catch (error) {
    throw new Error(
      error?.response?.data?.message ||
        error?.message ||
        "Checkout policies could not be loaded"
    )
  }
}

export async function fetchPurchaseHistory({ page = 1, limit = 20 } = {}) {
  try {
    const response = await apiConnector(
      "GET",
      PURCHASE_HISTORY_API,
      null,
      undefined,
      { page, limit }
    )
    if (!response?.data?.success || !response?.data?.data) {
      throw new Error(
        response?.data?.message || "Invalid purchase history response"
      )
    }
    return response.data.data
  } catch (error) {
    throw new Error(
      error?.response?.data?.message ||
        error?.message ||
        "Purchase history could not be loaded"
    )
  }
}

export async function requestPurchaseRefund(purchaseId, reason) {
  const normalizedReason = typeof reason === "string" ? reason.trim() : ""
  if (
    !purchaseId ||
    normalizedReason.length < 10 ||
    normalizedReason.length > 1000
  ) {
    throw new Error(
      "A valid purchase and 10-1000 character reason are required"
    )
  }

  try {
    const response = await apiConnector(
      "POST",
      REFUND_REQUEST_API(purchaseId),
      { confirmation: "REQUEST REFUND", reason: normalizedReason }
    )
    if (!response?.data?.success || !response?.data?.data) {
      throw new Error(response?.data?.message || "Invalid refund response")
    }
    return response.data
  } catch (error) {
    throw new Error(
      error?.response?.data?.message ||
        error?.message ||
        "Refund request could not be submitted"
    )
  }
}

// Verify the Payment
async function verifyPayment(bodyData, navigate, dispatch) {
  const toastId = toast.loading("Verifying Payment...")
  dispatch(setPaymentLoading(true))
  try {
    const response = await apiConnector("POST", COURSE_VERIFY_API, bodyData)

    if (!response || !response.data || !response.data.success) {
      throw new Error(response?.data?.message || "Verification failed")
    }

    // On successful verification, send email (non-blocking — catch errors)
    try {
      await sendPaymentSuccessEmail({
        razorpay_order_id: bodyData.razorpay_order_id,
        razorpay_payment_id: bodyData.razorpay_payment_id,
      })
    } catch {
      // Enrollment is complete even if the optional receipt email fails.
    }

    toast.success("Payment Successful. You are added to the course.")
    dispatch(resetCart())
    navigate("/dashboard/enrolled-courses", { replace: true })
    return true
  } catch (error) {
    toast.error(
      error?.response?.data?.message ||
        error?.message ||
        "Could not verify payment"
    )
    return false
  } finally {
    toast.dismiss(toastId)
    dispatch(setPaymentLoading(false))
  }
}

// Send the Payment Success Email
async function sendPaymentSuccessEmail(response) {
  await apiConnector("POST", SEND_PAYMENT_SUCCESS_EMAIL_API, {
    orderId: response.razorpay_order_id,
    paymentId: response.razorpay_payment_id,
  })
}
