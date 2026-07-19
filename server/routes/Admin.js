const express = require("express")

const {
  approveInstructor,
  listPendingInstructors,
  rejectInstructor,
} = require("../controllers/Admin")
const { auth, isAdmin } = require("../middleware/auth")
const {
  listPaymentReviews,
  resolvePaymentReview,
} = require("../controllers/payments")

const router = express.Router()

router.use(auth, isAdmin)
router.get("/instructors/pending", listPendingInstructors)
router.patch("/instructors/:instructorId/approve", approveInstructor)
router.patch("/instructors/:instructorId/reject", rejectInstructor)
router.get("/payments/reconciliation", listPaymentReviews)
router.post("/payments/reconciliation/:purchaseId/resolve", resolvePaymentReview)

module.exports = router
