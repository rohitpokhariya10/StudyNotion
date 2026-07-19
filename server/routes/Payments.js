// Import the required modules
const express = require("express")
const router = express.Router()
const {
  capturePayment,
  getCheckoutConfig,
  requestRefund,
  listMyPurchases,
  // verifySignature,
  verifyPayment,
  sendPaymentSuccessEmail,
} = require("../controllers/payments")
const { auth, isInstructor, isStudent, isAdmin } = require("../middleware/auth")
const { paymentLimiter } = require("../middleware/rateLimiters")
router.get("/config", getCheckoutConfig)
router.post("/capturePayment", auth, isStudent, paymentLimiter, capturePayment)
router.post("/verifyPayment", auth, isStudent, paymentLimiter, verifyPayment)
router.post(
  "/purchases/:purchaseId/refund-request",
  auth,
  isStudent,
  paymentLimiter,
  requestRefund
)
router.get("/purchases", auth, isStudent, listMyPurchases)
router.post(
  "/sendPaymentSuccessEmail",
  auth,
  isStudent,
  paymentLimiter,
  sendPaymentSuccessEmail
)
// router.post("/verifySignature", verifySignature)

module.exports = router
