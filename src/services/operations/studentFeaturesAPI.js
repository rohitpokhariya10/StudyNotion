import { toast } from "react-hot-toast"

import rzpLogo from "../../assets/Logo/rzp_logo.png"
import { resetCart } from "../../slices/cartSlice"
import { setPaymentLoading } from "../../slices/courseSlice"
import { apiConnector } from "../apiConnector"
import { studentEndpoints } from "../apis"

const {
  COURSE_PAYMENT_API,
  COURSE_VERIFY_API,
  SEND_PAYMENT_SUCCESS_EMAIL_API,
} = studentEndpoints

// Load the Razorpay SDK from the CDN (avoids duplicates)
function loadScript(src) {
  return new Promise((resolve) => {
    if (document.querySelector(`script[src="${src}"]`)) {
      resolve(true)
      return
    }
    const script = document.createElement("script")
    script.src = src
    script.async = true
    script.onload = () => resolve(true)
    script.onerror = () => resolve(false)
    document.body.appendChild(script)
  })
}

// Buy the Course
export async function BuyCourse(
  token,
  courses,
  user_details,
  navigate,
  dispatch
) {
  const toastId = toast.loading("Loading...")
  dispatch(setPaymentLoading(true))

  try {
    // Load Razorpay SDK
    const res = await loadScript("https://checkout.razorpay.com/v1/checkout.js")
    if (!res) {
      toast.dismiss(toastId)
      toast.error("Razorpay SDK failed to load. Check your Internet Connection.")
      dispatch(setPaymentLoading(false)
      )
      return
    }

    // Initiate order on backend
    const orderResponse = await apiConnector(
      "POST",
      COURSE_PAYMENT_API,
      { courses },
      { Authorization: `Bearer ${token}` }
    )

    if (!orderResponse || !orderResponse.data || !orderResponse.data.success) {
      throw new Error(orderResponse?.data?.message || "Could not create order")
    }

    const orderData = orderResponse.data.data
    const amount = Number(orderData.amount) // ensure integer (paise)

    // Razorpay options
    const options = {
      key:
        process.env.REACT_APP_RAZORPAY_KEY_ID ||
        process.env.VITE_RAZORPAY_KEY_ID ||
        process.env.RAZORPAY_KEY_ID, // prefer prefixed env vars
      currency: orderData.currency,
      amount: amount,
      order_id: orderData.id,
      name: "StudyNotion",
      description: "Thank you for Purchasing the Course.",
      image: rzpLogo,
      prefill: {
        name: `${user_details.firstName} ${user_details.lastName}`,
        email: user_details.email,
      },
      handler: function (response) {
        // First verify payment on backend; on backend success we will send email
        // verifyPayment will handle navigation, resetting cart and sending email
        verifyPayment({ ...response, courses }, token, navigate, dispatch)
      },
    }

    if (!window.Razorpay) throw new Error("Razorpay SDK not available")

    const paymentObject = new window.Razorpay(options)

    paymentObject.open()
    paymentObject.on("payment.failed", function (response) {
      toast.error("Oops! Payment Failed.")
      console.log("razorpay payment.failed ->", response.error)
    })
  } catch (error) {
    console.log("PAYMENT API ERROR............", error)
    toast.error("Could Not make Payment.")
  } finally {
    toast.dismiss(toastId)
    dispatch(setPaymentLoading(false))
  }
}

// Verify the Payment
async function verifyPayment(bodyData, token, navigate, dispatch) {
  const toastId = toast.loading("Verifying Payment...")
  dispatch(setPaymentLoading(true))
  try {
    const response = await apiConnector("POST", COURSE_VERIFY_API, bodyData, {
      Authorization: `Bearer ${token}`,
    })

    if (!response || !response.data || !response.data.success) {
      throw new Error(response?.data?.message || "Verification failed")
    }

    // On successful verification, send email (non-blocking — catch errors)
    try {
      await sendPaymentSuccessEmail(
        {
          razorpay_order_id: bodyData.razorpay_order_id,
          razorpay_payment_id: bodyData.razorpay_payment_id,
        },
        response.data.data?.amount || bodyData.amount,
        token
      )
    } catch (emailErr) {
      console.log("EMAIL SEND ERROR (non-fatal):", emailErr)
    }

    toast.success("Payment Successful. You are added to the course.")
    dispatch(resetCart())
    navigate("/dashboard/enrolled-courses")
  } catch (error) {
    console.log("PAYMENT VERIFY ERROR............", error)
    toast.error("Could Not Verify Payment.")
  } finally {
    toast.dismiss(toastId)
    dispatch(setPaymentLoading(false))
  }
}

// Send the Payment Success Email
async function sendPaymentSuccessEmail(response, amount, token) {
  try {
    await apiConnector(
      "POST",
      SEND_PAYMENT_SUCCESS_EMAIL_API,
      {
        orderId: response.razorpay_order_id,
        paymentId: response.razorpay_payment_id,
        amount,
      },
      {
        Authorization: `Bearer ${token}`,
      }
    )
  } catch (error) {
    console.log("PAYMENT SUCCESS EMAIL ERROR............", error)
    // don't throw — non-fatal
  }
}
