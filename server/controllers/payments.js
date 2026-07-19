const crypto = require("crypto")
const mongoose = require("mongoose")

const { instance } = require("../config/razorpay")
const env = require("../config/env")
const Course = require("../models/Course")
const CourseProgress = require("../models/CourseProgress")
const Purchase = require("../models/Purchase")
const User = require("../models/User")
const mailSender = require("../utils/mailSender")
const {
  courseEnrollmentEmail,
} = require("../mail/templates/courseEnrollmentEmail")
const { paymentSuccessEmail } = require("../mail/templates/paymentSuccessEmail")
const {
  CURRENT_REFUND_POLICY_VERSION,
  CURRENT_TERMS_VERSION,
} = require("../utils/policyAcceptance")
const { releaseStaleCheckoutLocks } = require("../utils/purchaseLifecycle")

const CURRENCY = "INR"
const ACTIVE_PURCHASE_STATUSES = [
  "created",
  "order_created",
  "paid",
  "fulfilled",
  "payment_review",
]

const safeLogIdentifier = (value) => {
  const normalized = value === undefined || value === null ? "" : String(value)
  return /^[A-Za-z0-9_.:/-]{1,128}$/.test(normalized) ? normalized : undefined
}

const logPaymentFailure = (message, error, metadata = {}) => {
  const providerRequestId =
    error?.error?.metadata?.request_id ||
    error?.headers?.["x-request-id"] ||
    error?.requestId
  const details = {
    code:
      safeLogIdentifier(error?.error?.code || error?.code) || "PAYMENT_ERROR",
    requestId:
      safeLogIdentifier(metadata.requestId || providerRequestId) || "unknown",
  }
  for (const [key, value] of Object.entries(metadata)) {
    if (key === "requestId") continue
    const safeValue = safeLogIdentifier(value)
    if (safeValue) details[key] = safeValue
  }
  console.error(message, details)
}

const paymentUnavailable = (res) =>
  res.status(503).json({
    success: false,
    message: "Payments are unavailable because Razorpay is not configured",
  })

const paymentFailed = (res, message = "Payment Failed", status = 400) =>
  res.status(status).json({ success: false, message })

exports.getCheckoutConfig = (_req, res) => {
  // Capture accepts only the currently deployed policy snapshot. Prevent a
  // browser or intermediary from replaying a stale version after a policy
  // change and causing a checkout rejection loop.
  res.setHeader("cache-control", "private, no-store, max-age=0")
  return res.status(200).json({
    success: true,
    data: {
      checkoutTtlSeconds: env.checkoutTtlSeconds,
      refundPolicyVersion: CURRENT_REFUND_POLICY_VERSION,
      refundWindowDays: env.refundWindowDays,
      termsVersion: CURRENT_TERMS_VERSION,
    },
  })
}

const callRazorpay = async (operation) => {
  let timeout
  const deadline = new Promise((_, reject) => {
    timeout = setTimeout(() => {
      const error = new Error("Razorpay request timed out")
      error.code = "RAZORPAY_TIMEOUT"
      reject(error)
    }, env.razorpayTimeoutMs)
  })

  try {
    return await Promise.race([Promise.resolve().then(operation), deadline])
  } finally {
    clearTimeout(timeout)
  }
}

const signaturesMatch = (expectedSignature, suppliedSignature) => {
  if (
    typeof suppliedSignature !== "string" ||
    !/^[a-f0-9]{64}$/i.test(suppliedSignature)
  ) {
    return false
  }

  const expected = Buffer.from(expectedSignature, "hex")
  const supplied = Buffer.from(suppliedSignature, "hex")

  return (
    expected.length === supplied.length &&
    crypto.timingSafeEqual(expected, supplied)
  )
}

const normalizeCourseIds = (courses) => {
  if (!Array.isArray(courses) || courses.length === 0 || courses.length > 20) {
    return null
  }

  const normalized = courses.map((courseId) => String(courseId))
  if (
    normalized.some((courseId) => !mongoose.isValidObjectId(courseId)) ||
    new Set(normalized).size !== normalized.length
  ) {
    return null
  }

  return normalized.sort()
}

const readIdempotencyKey = (req) => {
  const value = req.get?.("idempotency-key") || req.headers?.["idempotency-key"]
  if (value === undefined) return { value: undefined }
  if (typeof value !== "string" || !/^[A-Za-z0-9._:-]{8,100}$/.test(value)) {
    return { error: "Idempotency-Key must be 8-100 safe characters" }
  }
  return { value }
}

const courseSetsMatch = (purchase, courseIds) => {
  const purchasedIds = (purchase.courses || [])
    .map((courseId) => courseId.toString())
    .sort()
  return (
    purchasedIds.length === courseIds.length &&
    purchasedIds.every((courseId, index) => courseId === courseIds[index])
  )
}

const checkoutResponse = (purchase, order = {}, reused = true) => ({
  success: true,
  data: {
    id: order.id || purchase.razorpayOrderId,
    amount: Number(order.amount ?? purchase.amount),
    currency: order.currency || purchase.currency,
    receipt: order.receipt || purchase.receipt,
    purchaseId: purchase._id,
    reused,
    checkoutExpiresAt:
      purchase.checkoutExpiresAt?.toISOString?.() || purchase.checkoutExpiresAt,
  },
})

const checkoutIsExpired = (purchase) => {
  if (["expired", "failed", "payment_review"].includes(purchase.status)) {
    return true
  }
  if (!["created", "order_created"].includes(purchase.status)) return false
  if (!purchase.checkoutExpiresAt) {
    const createdAt = new Date(purchase.createdAt).getTime()
    return (
      !Number.isFinite(createdAt) ||
      createdAt <= Date.now() - env.checkoutTtlSeconds * 1000
    )
  }
  return new Date(purchase.checkoutExpiresAt).getTime() <= Date.now()
}

const holdCapturedPaymentForReview = async (purchase, razorpayPaymentId) => {
  if (purchase.status === "payment_review") {
    return purchase.razorpayPaymentId === razorpayPaymentId
  }

  const heldPurchase = await Purchase.findOneAndUpdate(
    {
      _id: purchase._id,
      status: {
        $in: ["created", "order_created", "paid", "expired", "failed"],
      },
      $or: [
        { razorpayPaymentId: { $exists: false } },
        { razorpayPaymentId },
      ],
    },
    {
      $set: {
        activeCourses: [],
        failureReason:
          "Captured payment is held for refund or manual reconciliation",
        paidAt: purchase.paidAt || new Date(),
        razorpayPaymentId,
        reconciliationRequiredAt: new Date(),
        status: "payment_review",
      },
      $unset: { checkoutKey: 1, idempotencyKey: 1 },
    },
    { new: true }
  )
  return Boolean(heldPurchase)
}

const recoverProviderOrder = async (purchase, requestId) => {
  if (typeof instance?.orders?.all !== "function") {
    return { checked: false, order: null }
  }

  try {
    const result = await callRazorpay(() =>
      instance.orders.all({ count: 2, receipt: purchase.receipt })
    )
    const order = (result?.items || []).find(
      (candidate) =>
        candidate.receipt === purchase.receipt &&
        Number(candidate.amount) === purchase.amount &&
        String(candidate.currency).toUpperCase() === purchase.currency
    )
    if (!order?.id) return { checked: true, order: null }

    await Purchase.findByIdAndUpdate(purchase._id, {
      $set: {
        razorpayOrderId: order.id,
        status: "order_created",
      },
      $unset: { failureReason: 1 },
    })
    purchase.razorpayOrderId = order.id
    purchase.status = "order_created"
    return { checked: true, order }
  } catch (error) {
    logPaymentFailure("Could not reconcile Razorpay order by receipt", error, {
      purchaseId: purchase._id,
      requestId,
    })
    return { checked: false, order: null }
  }
}

const respondForExistingCheckout = async (
  purchase,
  courseIds,
  res,
  requestId
) => {
  if (!purchase || !courseSetsMatch(purchase, courseIds)) {
    return paymentFailed(
      res,
      "Another active checkout already contains one of these courses",
      409
    )
  }
  if (purchase.status === "fulfilled") {
    return paymentFailed(res, "This purchase has already been fulfilled", 409)
  }
  if (purchase.status === "payment_review") {
    return paymentFailed(
      res,
      "A captured payment is awaiting support reconciliation",
      409
    )
  }
  if (checkoutIsExpired(purchase)) {
    return paymentFailed(res, "This checkout expired; please retry", 409)
  }
  if (purchase.status === "order_created" && purchase.razorpayOrderId) {
    return res.json(checkoutResponse(purchase))
  }
  if (purchase.status === "created") {
    const recovered = await recoverProviderOrder(purchase, requestId)
    if (recovered.order) {
      return res.json(checkoutResponse(purchase, recovered.order))
    }
  }
  return paymentFailed(res, "This checkout is already being processed", 409)
}

const fulfillPurchase = async (
  purchase,
  razorpayPaymentId,
  reconciliationAudit
) => {
  if (purchase.status === "fulfilled") {
    return purchase.razorpayPaymentId === razorpayPaymentId
  }

  if (!["order_created", "paid"].includes(purchase.status)) {
    return false
  }
  if (purchase.status === "order_created" && checkoutIsExpired(purchase)) {
    return false
  }

  if (
    purchase.razorpayPaymentId &&
    purchase.razorpayPaymentId !== razorpayPaymentId
  ) {
    return false
  }

  const now = new Date()
  const legacyCutoff = new Date(
    now.getTime() - env.checkoutTtlSeconds * 1000
  )
  const claimedPurchase = await Purchase.findOneAndUpdate(
    {
      _id: purchase._id,
      $and: [
        {
          $or: [
            { status: "paid" },
            { status: "order_created", checkoutExpiresAt: { $gt: now } },
            {
              status: "order_created",
              checkoutExpiresAt: { $exists: false },
              createdAt: { $gt: legacyCutoff },
            },
          ],
        },
        {
          $or: [
            { razorpayPaymentId: { $exists: false } },
            { razorpayPaymentId },
          ],
        },
      ],
    },
    {
      $set: {
        razorpayPaymentId,
        status: "paid",
        paidAt: purchase.paidAt || new Date(),
      },
    },
    { new: true }
  )

  if (!claimedPurchase) {
    const currentPurchase = await Purchase.findOne({ _id: purchase._id })
    return (
      currentPurchase?.status === "fulfilled" &&
      currentPurchase.razorpayPaymentId === razorpayPaymentId
    )
  }

  let enrolledCourses
  try {
    enrolledCourses = await enrollStudent(
      claimedPurchase.courses,
      claimedPurchase.user
    )
  } catch (error) {
    logPaymentFailure("Captured payment requires reconciliation", error, {
      purchaseId: claimedPurchase._id,
    })
    await holdCapturedPaymentForReview(claimedPurchase, razorpayPaymentId)
    return false
  }

  const newlyFulfilledPurchase = await Purchase.findOneAndUpdate(
    {
      _id: purchase._id,
      status: { $ne: "fulfilled" },
      razorpayPaymentId,
    },
    {
      $set: {
        status: "fulfilled",
        fulfilledAt: new Date(),
        ...(reconciliationAudit || {}),
      },
    },
    { new: true }
  )

  if (newlyFulfilledPurchase) {
    await sendEnrollmentEmails(enrolledCourses, claimedPurchase.user)
  } else if (reconciliationAudit) {
    const auditedPurchase = await Purchase.findOneAndUpdate(
      {
        _id: purchase._id,
        status: "fulfilled",
        razorpayPaymentId,
        reconciliationResolution: { $exists: false },
      },
      { $set: reconciliationAudit },
      { new: true }
    )
    if (!auditedPurchase) {
      throw new Error("Manual fulfillment audit could not be persisted")
    }
  }

  return true
}

const reconcileUnfulfilledCapturedPayment = async (
  purchase,
  razorpayPaymentId
) => {
  const currentPurchase = await Purchase.findOne({ _id: purchase._id })
  if (
    currentPurchase?.status === "fulfilled" &&
    currentPurchase.razorpayPaymentId === razorpayPaymentId
  ) {
    return "fulfilled"
  }
  if (
    currentPurchase &&
    checkoutIsExpired(currentPurchase) &&
    (await holdCapturedPaymentForReview(currentPurchase, razorpayPaymentId))
  ) {
    return "payment_review"
  }
  return "conflict"
}

// Capture the payment and create an immutable local purchase snapshot before
// requesting a Razorpay order.
exports.capturePayment = async (req, res) => {
  if (!instance) {
    return paymentUnavailable(res)
  }

  const courseIds = normalizeCourseIds(req.body?.courses)
  const userId = req.user.id
  const idempotency = readIdempotencyKey(req)

  if (!courseIds) {
    return paymentFailed(res, "Please Provide valid Course IDs", 400)
  }
  if (req.body?.acknowledgeCheckoutPolicies !== true) {
    return paymentFailed(
      res,
      "You must acknowledge the current purchase and refund terms",
      400
    )
  }
  if (
    req.body?.termsVersion !== CURRENT_TERMS_VERSION ||
    req.body?.refundPolicyVersion !== CURRENT_REFUND_POLICY_VERSION ||
    req.body?.refundWindowDays !== env.refundWindowDays
  ) {
    return paymentFailed(
      res,
      "Checkout policies changed; reload the current terms before purchasing",
      409
    )
  }
  if (idempotency.error) {
    return paymentFailed(res, idempotency.error, 400)
  }

  let purchase
  let providerOrder
  let createdByRequest = false

  try {
    await releaseStaleCheckoutLocks({ userId })

    const courses = await Course.find({
      _id: { $in: courseIds },
      status: "Published",
    }).select("courseName price studentsEnroled")

    if (courses.length !== courseIds.length) {
      return paymentFailed(res, "Could not find the Course", 404)
    }

    const coursesById = new Map(
      courses.map((course) => [course._id.toString(), course])
    )
    const orderedCourses = courseIds.map((courseId) =>
      coursesById.get(courseId)
    )

    const alreadyEnrolled = orderedCourses.some((course) =>
      course.studentsEnroled.some(
        (studentId) => studentId.toString() === userId.toString()
      )
    )

    if (alreadyEnrolled) {
      return paymentFailed(res, "Student is already Enrolled", 409)
    }

    const checkoutKey = crypto
      .createHash("sha256")
      .update(courseIds.join(","))
      .digest("hex")
    const existingPurchase = await Purchase.findOne({
      user: userId,
      status: { $in: ACTIVE_PURCHASE_STATUSES },
      $or: [
        { activeCourses: { $in: courseIds } },
        { courses: { $in: courseIds } },
        ...(idempotency.value ? [{ idempotencyKey: idempotency.value }] : []),
      ],
    })
    if (existingPurchase) {
      return respondForExistingCheckout(
        existingPurchase,
        courseIds,
        res,
        req.requestId
      )
    }

    const lineItems = orderedCourses.map((course) => ({
      course: course._id,
      courseName: course.courseName,
      amount: Math.round(Number(course.price) * 100),
    }))

    if (
      lineItems.some(
        (lineItem) =>
          !Number.isSafeInteger(lineItem.amount) || lineItem.amount <= 0
      )
    ) {
      return paymentFailed(res, "Course price is invalid", 400)
    }

    const amount = lineItems.reduce(
      (total, lineItem) => total + lineItem.amount,
      0
    )

    if (!Number.isSafeInteger(amount) || amount <= 0) {
      return paymentFailed(res, "Payment amount is invalid", 400)
    }

    const receipt = `sn_${crypto.randomUUID().replace(/-/g, "").slice(0, 32)}`
    const paymentOperationLockId = crypto.randomUUID()
    const lockNow = new Date()
    const checkoutOwner = await User.findOneAndUpdate(
      {
        _id: userId,
        accountType: "Student",
        active: true,
        approved: true,
        deletionPending: { $ne: true },
        $or: [
          { paymentOperationLockUntil: { $exists: false } },
          { paymentOperationLockUntil: { $lte: lockNow } },
        ],
      },
      {
        $set: {
          paymentOperationLockId,
          paymentOperationLockUntil: new Date(lockNow.getTime() + 30_000),
        },
      },
      { new: true }
    )
    if (!checkoutOwner) {
      return paymentFailed(
        res,
        "Account deletion or another checkout is currently being processed",
        409
      )
    }

    try {
      purchase = await Purchase.create({
        user: userId,
        courses: orderedCourses.map((course) => course._id),
        activeCourses: orderedCourses.map((course) => course._id),
        checkoutKey,
        idempotencyKey: idempotency.value,
        checkoutExpiresAt: new Date(
          Date.now() + env.checkoutTtlSeconds * 1000
        ),
        checkoutAcknowledgedAt: new Date(),
        checkoutPolicySource: "web_checkout",
        checkoutTermsVersion: CURRENT_TERMS_VERSION,
        refundPolicyVersion: CURRENT_REFUND_POLICY_VERSION,
        refundWindowDays: env.refundWindowDays,
        lineItems,
        amount,
        currency: CURRENCY,
        receipt,
      })
    } finally {
      await User.updateOne(
        { _id: userId, paymentOperationLockId },
        {
          $unset: {
            paymentOperationLockId: 1,
            paymentOperationLockUntil: 1,
          },
        }
      ).catch(() => undefined)
    }
    createdByRequest = true

    const purchasableCourseCount = await Course.countDocuments({
      _id: { $in: courseIds },
      status: "Published",
    })
    if (purchasableCourseCount !== courseIds.length) {
      await Purchase.findByIdAndUpdate(purchase._id, {
        $set: {
          activeCourses: [],
          failureReason: "A course became unavailable before checkout",
          status: "failed",
        },
        $unset: { checkoutKey: 1, idempotencyKey: 1 },
      })
      return paymentFailed(
        res,
        "A selected course is no longer available; refresh and retry",
        409
      )
    }

    providerOrder = await callRazorpay(() =>
      instance.orders.create({
        amount,
        currency: CURRENCY,
        receipt,
        notes: {
          purchaseId: purchase._id.toString(),
          userId: userId.toString(),
        },
      })
    )

    if (!providerOrder?.id) {
      throw new Error("Razorpay did not return an order ID")
    }

    await Purchase.findByIdAndUpdate(purchase._id, {
      $set: {
        razorpayOrderId: providerOrder.id,
        status: "order_created",
      },
    })
    purchase.razorpayOrderId = providerOrder.id
    purchase.status = "order_created"

    return res.json(checkoutResponse(purchase, providerOrder, false))
  } catch (error) {
    if (error?.code === 11000) {
      const existingPurchase = await Purchase.findOne({
        user: userId,
        status: { $in: ACTIVE_PURCHASE_STATUSES },
        $or: [
          { activeCourses: { $in: courseIds } },
          { courses: { $in: courseIds } },
          ...(idempotency.value ? [{ idempotencyKey: idempotency.value }] : []),
        ],
      }).catch(() => null)
      if (existingPurchase) {
        return respondForExistingCheckout(
          existingPurchase,
          courseIds,
          res,
          req.requestId
        )
      }
    }

    let providerRecovery = { checked: false, order: null }
    if (createdByRequest && purchase?._id) {
      providerRecovery = await recoverProviderOrder(purchase, req.requestId)
      if (providerRecovery.order) {
        return res.json(checkoutResponse(purchase, providerRecovery.order))
      }
    }

    if (createdByRequest && purchase?._id && !providerOrder && providerRecovery.checked) {
      await Purchase.findByIdAndUpdate(purchase._id, {
        $set: {
          activeCourses: [],
          status: "failed",
          failureReason: "Could not initiate order",
        },
        $unset: { checkoutKey: 1, idempotencyKey: 1 },
      }).catch(() => undefined)
    }

    logPaymentFailure("Could not initiate Razorpay order", error, {
      purchaseId: purchase?._id,
      requestId: req.requestId,
    })
    return paymentFailed(res, "Could not initiate order.", 500)
  }
}

// Razorpay webhooks are the canonical fulfillment path when a browser closes
// before calling verifyPayment. The route supplies the untouched request bytes.
exports.razorpayWebhook = async (req, res) => {
  if (!process.env.RAZORPAY_WEBHOOK_SECRET) {
    return res.status(503).json({
      success: false,
      message: "Payment webhook is not configured",
    })
  }

  const signature = req.get("x-razorpay-signature")
  if (!Buffer.isBuffer(req.body) || !signature) {
    return res.status(400).json({
      success: false,
      message: "Invalid webhook request",
    })
  }

  const expectedSignature = crypto
    .createHmac("sha256", process.env.RAZORPAY_WEBHOOK_SECRET)
    .update(req.body)
    .digest("hex")

  if (!signaturesMatch(expectedSignature, signature)) {
    return res.status(401).json({
      success: false,
      message: "Invalid webhook signature",
    })
  }

  let event
  try {
    event = JSON.parse(req.body.toString("utf8"))
  } catch {
    return res.status(400).json({
      success: false,
      message: "Invalid webhook payload",
    })
  }

  if (!["payment.captured", "order.paid"].includes(event?.event)) {
    return res.status(200).json({ success: true, message: "Webhook ignored" })
  }

  const payment = event.payload?.payment?.entity
  const razorpayOrderId = payment?.order_id
  const razorpayPaymentId = payment?.id

  if (!razorpayOrderId || !razorpayPaymentId) {
    return res.status(400).json({
      success: false,
      message: "Webhook payment details are missing",
    })
  }

  try {
    const purchase = await Purchase.findOne({ razorpayOrderId })
    if (!purchase) {
      // A signed event for an order not created by this application is safe to
      // acknowledge and avoids retry storms for unrelated Razorpay orders.
      return res.status(200).json({ success: true, message: "Order ignored" })
    }

    const paymentIsValid =
      Number(payment.amount) === purchase.amount &&
      String(payment.currency).toUpperCase() === purchase.currency &&
      payment.status === "captured"

    if (!paymentIsValid) {
      return res.status(400).json({
        success: false,
        message: "Webhook payment does not match the purchase",
      })
    }

    if (checkoutIsExpired(purchase)) {
      if (!(await holdCapturedPaymentForReview(purchase, razorpayPaymentId))) {
        return paymentFailed(
          res,
          "Late payment conflicts with an existing reconciliation",
          409
        )
      }
      return res.status(200).json({
        success: true,
        reconciliationRequired: true,
        message: "Late payment held for refund or manual reconciliation",
      })
    }

    if (!(await fulfillPurchase(purchase, razorpayPaymentId))) {
      const outcome = await reconcileUnfulfilledCapturedPayment(
        purchase,
        razorpayPaymentId
      )
      if (outcome === "payment_review") {
        return res.status(200).json({
          success: true,
          reconciliationRequired: true,
          message: "Late payment held for refund or manual reconciliation",
        })
      }
      if (outcome !== "fulfilled") {
        return paymentFailed(
          res,
          "Payment conflicts with an existing purchase",
          409
        )
      }
    }

    return res.status(200).json({
      success: true,
      message: "Payment webhook processed",
    })
  } catch (error) {
    logPaymentFailure("Payment webhook processing failed", error, {
      orderId: razorpayOrderId,
      requestId: req.requestId,
    })
    return res.status(500).json({
      success: false,
      message: "Payment webhook could not be processed",
    })
  }
}

// Verify a payment against the server-owned Purchase. Course IDs and amounts
// supplied by the browser are deliberately ignored.
exports.verifyPayment = async (req, res) => {
  if (!instance || !process.env.RAZORPAY_SECRET) {
    return paymentUnavailable(res)
  }

  const razorpayOrderId = req.body?.razorpay_order_id
  const razorpayPaymentId = req.body?.razorpay_payment_id
  const razorpaySignature = req.body?.razorpay_signature
  const userId = req.user.id

  if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature || !userId) {
    return paymentFailed(res)
  }

  try {
    const purchase = await Purchase.findOne({
      razorpayOrderId,
      user: userId,
    })

    if (!purchase) {
      return paymentFailed(res)
    }

    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_SECRET)
      .update(`${razorpayOrderId}|${razorpayPaymentId}`)
      .digest("hex")

    if (!signaturesMatch(expectedSignature, razorpaySignature)) {
      return paymentFailed(res)
    }

    const payment = await callRazorpay(() =>
      instance.payments.fetch(razorpayPaymentId)
    )
    const paymentIsValid =
      payment?.order_id === razorpayOrderId &&
      Number(payment.amount) === purchase.amount &&
      String(payment.currency).toUpperCase() === purchase.currency &&
      payment.status === "captured"

    if (!paymentIsValid) {
      return paymentFailed(res)
    }

    if (checkoutIsExpired(purchase)) {
      if (!(await holdCapturedPaymentForReview(purchase, razorpayPaymentId))) {
        return paymentFailed(res, "Payment reconciliation conflict", 409)
      }
      return paymentFailed(
        res,
        "Payment was captured after checkout expiry and is held for support reconciliation",
        409
      )
    }

    if (!(await fulfillPurchase(purchase, razorpayPaymentId))) {
      const outcome = await reconcileUnfulfilledCapturedPayment(
        purchase,
        razorpayPaymentId
      )
      if (outcome === "payment_review") {
        return paymentFailed(
          res,
          "Payment was captured after checkout expiry and is held for support reconciliation",
          409
        )
      }
      if (outcome !== "fulfilled") return paymentFailed(res)
    }

    return res.status(200).json({
      success: true,
      message: "Payment Verified",
    })
  } catch (error) {
    logPaymentFailure("Payment verification failed", error, {
      orderId: razorpayOrderId,
      requestId: req.requestId,
    })
    return paymentFailed(res, "Payment could not be verified", 500)
  }
}

const refundDeadline = (purchase) => {
  const paidAt = new Date(
    purchase.paidAt || purchase.reconciliationRequiredAt || purchase.createdAt
  ).getTime()
  const refundWindowDays = Number.isInteger(purchase.refundWindowDays)
    ? purchase.refundWindowDays
    : env.refundWindowDays
  return {
    eligibleUntil: new Date(paidAt + refundWindowDays * 24 * 60 * 60 * 1000),
    valid: Number.isFinite(paidAt),
  }
}

exports.requestRefund = async (req, res) => {
  const purchaseId = req.params?.purchaseId
  const confirmation = req.body?.confirmation
  const reason =
    typeof req.body?.reason === "string" ? req.body.reason.trim() : ""
  if (!mongoose.isValidObjectId(purchaseId)) {
    return paymentFailed(res, "A valid purchaseId is required", 400)
  }
  if (
    confirmation !== "REQUEST REFUND" ||
    reason.length < 10 ||
    reason.length > 1000
  ) {
    return paymentFailed(
      res,
      "Exact confirmation and a 10-1000 character refund reason are required",
      400
    )
  }

  try {
    const purchase = await Purchase.findOne({
      _id: purchaseId,
      user: req.user.id,
    })
    if (!purchase) return paymentFailed(res, "Purchase not found", 404)
    if (
      purchase.refundRejectedAt ||
      purchase.reconciliationResolution === "refund_rejected"
    ) {
      return paymentFailed(
        res,
        "This purchase already has a reviewed refund decision; contact support to appeal",
        409
      )
    }
    if (["refund_requested", "refund_pending", "refunded"].includes(purchase.status)) {
      return res.status(200).json({
        success: true,
        data: { purchaseId, status: purchase.status },
        message: "Refund request is already recorded",
      })
    }
    if (purchase.status !== "fulfilled") {
      return paymentFailed(res, "Only a fulfilled purchase can request a refund", 409)
    }
    const deadline = refundDeadline(purchase)
    if (!deadline.valid || deadline.eligibleUntil < new Date()) {
      return res.status(409).json({
        success: false,
        data: { refundEligibleUntil: deadline.eligibleUntil },
        message: "The purchase is outside its recorded refund window",
      })
    }

    const requested = await Purchase.findOneAndUpdate(
      { _id: purchase._id, status: "fulfilled", user: req.user.id },
      {
        $set: {
          reconciliationRequiredAt: new Date(),
          refundRequestNote: reason,
          refundRequestedAt: new Date(),
          status: "refund_requested",
        },
      },
      { new: true }
    )
    if (!requested) {
      return paymentFailed(res, "Purchase state changed; refresh and retry", 409)
    }
    return res.status(202).json({
      success: true,
      data: { purchaseId, status: "refund_requested" },
      message: "Refund request submitted for review",
    })
  } catch (error) {
    logPaymentFailure("Refund request failed", error, {
      purchaseId,
      requestId: req.requestId,
    })
    return paymentFailed(res, "Refund request could not be submitted", 500)
  }
}

exports.listMyPurchases = async (req, res) => {
  const pagination = parseReviewPagination(req.query)
  if (!pagination) {
    return paymentFailed(res, "page and limit must be valid positive integers", 400)
  }
  try {
    const filter = {
      user: req.user.id,
      status: {
        $in: [
          "fulfilled",
          "paid",
          "payment_review",
          "refund_pending",
          "refund_requested",
          "refunded",
        ],
      },
    }
    const [purchases, total] = await Promise.all([
      Purchase.find(filter)
        .select(
          "amount checkoutAcknowledgedAt checkoutTermsVersion createdAt currency fulfilledAt lineItems paidAt razorpayOrderId reconciliationRequiredAt reconciliationResolution refundAttemptedAt refundId refundLastCheckedAt refundPolicyVersion refundProviderStatus refundRejectedAt refundRequestedAt refundWindowDays status"
        )
        .sort({ createdAt: -1, _id: -1 })
        .skip((pagination.page - 1) * pagination.limit)
        .limit(pagination.limit)
        .lean(),
      Purchase.countDocuments(filter),
    ])
    const now = new Date()
    return res.status(200).json({
      success: true,
      data: {
        pagination: {
          ...pagination,
          pages: Math.ceil(total / pagination.limit),
          total,
        },
        purchases: purchases.map((purchase) => {
          const deadline = refundDeadline(purchase)
          return {
            _id: purchase._id,
            amount: purchase.amount,
            checkoutAcknowledgedAt: purchase.checkoutAcknowledgedAt,
            checkoutTermsVersion: purchase.checkoutTermsVersion,
            createdAt: purchase.createdAt,
            currency: purchase.currency,
            fulfilledAt: purchase.fulfilledAt,
            lineItems: purchase.lineItems,
            paidAt: purchase.paidAt,
            razorpayOrderId: purchase.razorpayOrderId,
            reconciliationRequiredAt: purchase.reconciliationRequiredAt,
            refundAttemptedAt: purchase.refundAttemptedAt,
            refundEligible:
              purchase.status === "fulfilled" &&
              !purchase.refundRejectedAt &&
              deadline.valid &&
              deadline.eligibleUntil >= now,
            refundEligibleUntil: deadline.valid ? deadline.eligibleUntil : null,
            refundId: purchase.refundId,
            refundLastCheckedAt: purchase.refundLastCheckedAt,
            refundPolicyVersion: purchase.refundPolicyVersion,
            refundProviderStatus: purchase.refundProviderStatus,
            refundRejectedAt: purchase.refundRejectedAt,
            refundRequestedAt: purchase.refundRequestedAt,
            refundWindowDays: purchase.refundWindowDays,
            status: purchase.status,
          }
        }),
      },
    })
  } catch (error) {
    logPaymentFailure("Purchase history lookup failed", error, {
      requestId: req.requestId,
    })
    return paymentFailed(res, "Purchase history could not be loaded", 500)
  }
}

const paymentReviewDto = (purchase) => ({
  _id: purchase._id,
  amount: purchase.amount,
  checkoutAcknowledgedAt: purchase.checkoutAcknowledgedAt,
  checkoutTermsVersion: purchase.checkoutTermsVersion,
  createdAt: purchase.createdAt,
  currency: purchase.currency,
  failedRefundIds: purchase.failedRefundIds,
  lineItems: purchase.lineItems,
  paidAt: purchase.paidAt,
  razorpayOrderId: purchase.razorpayOrderId,
  razorpayPaymentId: purchase.razorpayPaymentId,
  reconciliationRequiredAt: purchase.reconciliationRequiredAt,
  refundAttemptedAt: purchase.refundAttemptedAt,
  refundEligibilityDeadline: purchase.refundEligibilityDeadline,
  refundId: purchase.refundId,
  refundLastCheckedAt: purchase.refundLastCheckedAt,
  refundPolicyVersion: purchase.refundPolicyVersion,
  refundProviderStatus: purchase.refundProviderStatus,
  refundRequestNote: purchase.refundRequestNote,
  refundRequestedAt: purchase.refundRequestedAt,
  refundWindowDays: purchase.refundWindowDays,
  refundWindowOverride: purchase.refundWindowOverride,
  refundWindowOverrideAt: purchase.refundWindowOverrideAt,
  refundWindowOverrideBy: purchase.refundWindowOverrideBy,
  status: purchase.status,
  user: purchase.user
    ? {
        _id: purchase.user._id,
        accountType: purchase.user.accountType,
        active: purchase.user.active,
        approved: purchase.user.approved,
        email: purchase.user.email,
        firstName: purchase.user.firstName,
        lastName: purchase.user.lastName,
      }
    : undefined,
})

const parseReviewPagination = (query = {}) => {
  const page = query.page === undefined ? 1 : Number(query.page)
  const limit = query.limit === undefined ? 20 : Number(query.limit)
  if (
    !Number.isInteger(page) ||
    page < 1 ||
    page > 1_000_000 ||
    !Number.isInteger(limit) ||
    limit < 1 ||
    limit > 100
  ) {
    return null
  }
  return { limit, page }
}

exports.listPaymentReviews = async (req, res) => {
  const pagination = parseReviewPagination(req.query)
  if (!pagination) {
    return paymentFailed(res, "page and limit must be valid positive integers", 400)
  }

  try {
    const filter = {
      status: { $in: ["payment_review", "refund_pending", "refund_requested"] },
    }
    const [purchases, total] = await Promise.all([
      Purchase.find(filter)
        .select(
          "amount checkoutAcknowledgedAt checkoutTermsVersion createdAt currency failedRefundIds lineItems paidAt razorpayOrderId razorpayPaymentId reconciliationRequiredAt refundAttemptedAt refundEligibilityDeadline refundId refundLastCheckedAt refundPolicyVersion refundProviderStatus refundRequestNote refundRequestedAt refundWindowDays refundWindowOverride refundWindowOverrideAt refundWindowOverrideBy status user"
        )
        .populate({
          path: "user",
          select: "firstName lastName email accountType active approved",
        })
        .sort({ reconciliationRequiredAt: 1, _id: 1 })
        .skip((pagination.page - 1) * pagination.limit)
        .limit(pagination.limit)
        .lean(),
      Purchase.countDocuments(filter),
    ])

    return res.status(200).json({
      success: true,
      data: {
        pagination: {
          ...pagination,
          pages: Math.ceil(total / pagination.limit),
          total,
        },
        purchases: purchases.map(paymentReviewDto),
      },
    })
  } catch (error) {
    logPaymentFailure("Payment reconciliation list failed", error, {
      requestId: req.requestId,
    })
    return paymentFailed(res, "Payment reviews could not be loaded", 500)
  }
}

const recoverPurchaseRefund = async (purchase) => {
  if (typeof instance?.payments?.fetchMultipleRefund !== "function") return null
  const response = await callRazorpay(() =>
    instance.payments.fetchMultipleRefund(purchase.razorpayPaymentId, {
      count: 100,
    })
  )
  const failedRefundIds = new Set(
    (purchase.failedRefundIds || []).map((refundId) => String(refundId))
  )
  const matchingRefunds = (response?.items || []).filter(
    (refund) =>
      String(refund.notes?.purchaseId || "") === String(purchase._id) &&
      Number(refund.amount) === purchase.amount &&
      !failedRefundIds.has(String(refund.id))
  )
  return (
    matchingRefunds.find((refund) => refund.status === "processed") ||
    matchingRefunds.find((refund) => refund.status === "pending") ||
    matchingRefunds[0] ||
    null
  )
}

const revokeRefundedEntitlements = async (purchase) => {
  const revocableCourses = []
  for (const courseId of purchase.courses) {
    const otherEntitlement = await Purchase.exists({
      _id: { $ne: purchase._id },
      courses: courseId,
      status: { $in: ["fulfilled", "refund_pending", "refund_requested"] },
      user: purchase.user,
    })
    if (!otherEntitlement) revocableCourses.push(courseId)
  }
  if (!revocableCourses.length) return

  const progressIds = await CourseProgress.distinct("_id", {
    courseID: { $in: revocableCourses },
    userId: purchase.user,
  })
  await Promise.all([
    Course.updateMany(
      { _id: { $in: revocableCourses } },
      { $pull: { studentsEnroled: purchase.user } }
    ),
    CourseProgress.deleteMany({
      courseID: { $in: revocableCourses },
      userId: purchase.user,
    }),
    User.updateOne(
      { _id: purchase.user },
      {
        $pull: {
          courses: { $in: revocableCourses },
          courseProgress: { $in: progressIds },
        },
      }
    ),
  ])
}

exports.resolvePaymentReview = async (req, res) => {
  const { purchaseId } = req.params
  const action = req.body?.action
  const confirmation = req.body?.confirmation
  const note = typeof req.body?.note === "string" ? req.body.note.trim() : ""
  const expectedConfirmation =
    action === "refund"
      ? "REFUND PAYMENT"
      : action === "fulfill"
        ? "FULFILL PAYMENT"
        : action === "reject_refund"
          ? "REJECT REFUND"
          : action === "retry_refund"
            ? "RETRY FAILED REFUND"
        : null

  if (!mongoose.isValidObjectId(purchaseId)) {
    return paymentFailed(res, "A valid purchaseId is required", 400)
  }
  if (!expectedConfirmation || confirmation !== expectedConfirmation) {
    return paymentFailed(res, "The exact reconciliation confirmation is required", 400)
  }
  if (note.length < 10 || note.length > 1000) {
    return paymentFailed(res, "A reconciliation note of 10-1000 characters is required", 400)
  }
  if (["refund", "retry_refund"].includes(action) && !instance) {
    return paymentUnavailable(res)
  }

  const reconciliationLockId = crypto.randomUUID()
  const now = new Date()
  let purchase
  try {
    purchase = await Purchase.findOneAndUpdate(
      {
        _id: purchaseId,
        ...(action === "retry_refund"
          ? {
              refundId: { $type: "string" },
              refundProviderStatus: "failed",
            }
          : {}),
        status:
          action === "fulfill"
            ? "payment_review"
            : action === "reject_refund"
              ? "refund_requested"
              : action === "retry_refund"
                ? "refund_pending"
              : {
                  $in: [
                    "payment_review",
                    "refund_pending",
                    "refund_requested",
                  ],
                },
        $or: [
          { reconciliationLockUntil: { $exists: false } },
          { reconciliationLockUntil: { $lte: now } },
        ],
      },
      {
        $set: {
          reconciliationLockId,
          reconciliationLockUntil: new Date(now.getTime() + 60_000),
        },
      },
      { new: true }
    )
    if (!purchase) {
      const resolved = await Purchase.findById(purchaseId).select(
        "status reconciliationResolution refundId"
      )
      if (resolved?.reconciliationResolution) {
        return res.status(200).json({
          success: true,
          data: {
            purchaseId,
            refundId: resolved.refundId,
            resolution: resolved.reconciliationResolution,
            status: resolved.status,
          },
          message: "Payment review was already resolved",
        })
      }
      return paymentFailed(
        res,
        "Payment review is unavailable or being handled by another admin",
        409
      )
    }

    if (action === "reject_refund") {
      const rejected = await Purchase.findOneAndUpdate(
        {
          _id: purchase._id,
          reconciliationLockId,
          status: "refund_requested",
        },
        {
          $set: {
            reconciliationNote: note,
            reconciliationResolution: "refund_rejected",
            reconciledAt: new Date(),
            reconciledBy: req.user.id,
            refundRejectedAt: new Date(),
            status: "fulfilled",
          },
          $unset: {
            reconciliationLockId: 1,
            reconciliationLockUntil: 1,
            reconciliationRequiredAt: 1,
          },
        },
        { new: true }
      )
      if (!rejected) throw new Error("Refund rejection lost its lock")
      return res.status(200).json({
        success: true,
        data: {
          purchaseId,
          resolution: "refund_rejected",
          status: "fulfilled",
        },
        message: "Refund request rejected and reconciliation closed",
      })
    }

    if (["refund", "retry_refund"].includes(action)) {
      const retryingFailedRefund = action === "retry_refund"
      const refundEligibility = refundDeadline(purchase)
      const refundRequestedAt = new Date(purchase.refundRequestedAt).getTime()
      const requestWasTimely =
        purchase.status === "refund_requested" &&
        refundEligibility.valid &&
        Number.isFinite(refundRequestedAt) &&
        refundRequestedAt <= refundEligibility.eligibleUntil.getTime()
      const providerAttemptExists =
        purchase.status === "refund_pending" ||
        Boolean(purchase.refundAttemptedAt || purchase.refundId)
      const refundWindowElapsed =
        !refundEligibility.valid || refundEligibility.eligibleUntil < now
      const refundWindowOverrideUsed =
        !providerAttemptExists &&
        !requestWasTimely &&
        refundWindowElapsed &&
        req.body?.overrideRefundWindow === true
      if (
        !providerAttemptExists &&
        !requestWasTimely &&
        refundWindowElapsed &&
        req.body?.overrideRefundWindow !== true
      ) {
        return res.status(409).json({
          success: false,
          data: { refundEligibleUntil: refundEligibility.eligibleUntil },
          message:
            "The configured refund window elapsed; an explicit audited override is required",
        })
      }

      const refundOriginStatus =
        purchase.refundOriginStatus ||
        (purchase.status === "refund_requested"
          ? "refund_requested"
          : "payment_review")

      if (retryingFailedRefund) {
        const previousRefundId = purchase.refundId
        const retryAttempt = await Purchase.findOneAndUpdate(
          {
            _id: purchase._id,
            reconciliationLockId,
            refundId: previousRefundId,
            refundProviderStatus: "failed",
            status: "refund_pending",
          },
          {
            $addToSet: { failedRefundIds: previousRefundId },
            $set: {
              reconciliationNote: note,
              reconciledBy: req.user.id,
              refundAttemptedAt: new Date(),
            },
            $unset: {
              refundId: 1,
              refundLastCheckedAt: 1,
              refundProcessedAt: 1,
              refundProviderStatus: 1,
            },
          },
          { new: true }
        )
        if (!retryAttempt) throw new Error("Failed refund retry lost its lock")
        purchase = retryAttempt
      }

      let refund = purchase.refundId
        ? await callRazorpay(() =>
            instance.payments.fetchRefund(
              purchase.razorpayPaymentId,
              purchase.refundId
            )
          )
        : await recoverPurchaseRefund(purchase)

      if (!refund && (!providerAttemptExists || retryingFailedRefund)) {
        if (!retryingFailedRefund) {
          const pendingAttempt = await Purchase.findOneAndUpdate(
            {
              _id: purchase._id,
              reconciliationLockId,
              status: { $in: ["payment_review", "refund_requested"] },
            },
            {
              $set: {
                reconciliationNote: note,
                reconciledBy: req.user.id,
                refundAttemptedAt: new Date(),
                ...(refundEligibility.valid
                  ? {
                      refundEligibilityDeadline:
                        refundEligibility.eligibleUntil,
                    }
                  : {}),
                refundOriginStatus,
                ...(refundWindowOverrideUsed
                  ? {
                      refundWindowOverride: true,
                      refundWindowOverrideAt: new Date(),
                      refundWindowOverrideBy: req.user.id,
                    }
                  : {}),
                status: "refund_pending",
              },
            },
            { new: true }
          )
          if (!pendingAttempt) throw new Error("Refund attempt lost its lock")
          purchase = pendingAttempt
        }

        try {
          refund = await callRazorpay(() =>
            instance.payments.refund(purchase.razorpayPaymentId, {
              amount: purchase.amount,
              notes: { purchaseId: String(purchase._id) },
              speed: "normal",
            })
          )
        } catch (error) {
          // A timeout can be ambiguous. The durable refund_pending state means
          // future retries only recover/poll by our immutable Purchase note;
          // they never issue a second automatic refund.
          refund = await recoverPurchaseRefund(purchase).catch(() => null)
          if (!refund) {
            logPaymentFailure("Razorpay refund outcome is pending recovery", error, {
              purchaseId: purchase._id,
              requestId: req.requestId,
            })
            return res.status(202).json({
              success: true,
              data: { purchaseId, refundId: null, status: "refund_pending" },
              message:
                "Refund outcome is awaiting provider reconciliation; no duplicate refund will be issued",
            })
          }
        }
      }

      if (!refund) {
        return res.status(202).json({
          success: true,
          data: { purchaseId, refundId: null, status: "refund_pending" },
          message:
            "The attempted refund is not visible at Razorpay yet and remains in reconciliation",
        })
      }
      if (!refund?.id || Number(refund.amount) !== purchase.amount) {
        throw new Error("Razorpay returned an invalid refund")
      }
      if (!["failed", "pending", "processed"].includes(refund.status)) {
        throw new Error("Razorpay returned an unknown refund status")
      }

      const providerCheckedAt = new Date()
      const providerState = await Purchase.findOneAndUpdate(
        {
          _id: purchase._id,
          reconciliationLockId,
          status: {
            $in: ["payment_review", "refund_pending", "refund_requested"],
          },
        },
        {
          $set: {
            reconciliationNote: note,
            reconciledBy: req.user.id,
            refundAttemptedAt: purchase.refundAttemptedAt || providerCheckedAt,
            ...(refundEligibility.valid
              ? {
                  refundEligibilityDeadline:
                    purchase.refundEligibilityDeadline ||
                    refundEligibility.eligibleUntil,
                }
              : {}),
            refundId: refund.id,
            refundLastCheckedAt: providerCheckedAt,
            refundOriginStatus,
            refundProviderStatus: refund.status,
            ...(refundWindowOverrideUsed
              ? {
                  refundWindowOverride: true,
                  refundWindowOverrideAt:
                    purchase.refundWindowOverrideAt || providerCheckedAt,
                  refundWindowOverrideBy:
                    purchase.refundWindowOverrideBy || req.user.id,
                }
              : {}),
            ...(refund.status === "processed"
              ? {
                  refundProcessedAt:
                    purchase.refundProcessedAt || providerCheckedAt,
                }
              : {}),
            status: "refund_pending",
          },
        },
        { new: true }
      )
      if (!providerState) throw new Error("Refund provider state lost its lock")
      purchase = providerState

      if (refund.status === "failed") {
        return res.status(409).json({
          success: false,
          data: { purchaseId, refundId: refund.id, status: "refund_pending" },
          message:
            "Razorpay marked this refund failed; it remains queued for audited support follow-up",
        })
      }
      if (refund.status === "pending") {
        return res.status(202).json({
          success: true,
          data: { purchaseId, refundId: refund.id, status: "refund_pending" },
          message: "Refund is pending at Razorpay and remains in reconciliation",
        })
      }

      if (!purchase.refundEntitlementsRevokedAt) {
        await revokeRefundedEntitlements(purchase)
        const entitlementsRevoked = await Purchase.findOneAndUpdate(
          {
            _id: purchase._id,
            reconciliationLockId,
            refundId: refund.id,
            refundProviderStatus: "processed",
            status: "refund_pending",
          },
          { $set: { refundEntitlementsRevokedAt: new Date() } },
          { new: true }
        )
        if (!entitlementsRevoked) {
          throw new Error("Refund entitlement audit lost its lock")
        }
        purchase = entitlementsRevoked
      }

      const resolved = await Purchase.findOneAndUpdate(
        {
          _id: purchase._id,
          reconciliationLockId,
          refundId: refund.id,
          refundProviderStatus: "processed",
          status: "refund_pending",
        },
        {
          $set: {
            activeCourses: [],
            reconciliationNote: note,
            reconciliationResolution: "refunded",
            reconciledAt: new Date(),
            reconciledBy: req.user.id,
            refundedAt: new Date(),
            refundId: refund.id,
            refundOriginStatus,
            status: "refunded",
          },
          $unset: {
            checkoutKey: 1,
            idempotencyKey: 1,
            reconciliationLockId: 1,
            reconciliationLockUntil: 1,
          },
        },
        { new: true }
      )
      if (!resolved) throw new Error("Refund resolution lost its lock")
      return res.status(200).json({
        success: true,
        data: { purchaseId, refundId: refund.id, resolution: "refunded" },
        message: "Payment refunded and reconciliation closed",
      })
    }

    if (purchase.status !== "payment_review") {
      return paymentFailed(res, "Only a held payment can be manually fulfilled", 409)
    }
    if (!purchase.razorpayPaymentId) {
      return paymentFailed(res, "The review has no captured payment ID", 409)
    }
    if (
      (await Course.countDocuments({ _id: { $in: purchase.courses } })) !==
      purchase.courses.length
    ) {
      return paymentFailed(res, "Purchased course content is no longer complete", 409)
    }

    const payable = await Purchase.findOneAndUpdate(
      {
        _id: purchase._id,
        reconciliationLockId,
        status: "payment_review",
      },
      { $set: { status: "paid" } },
      { new: true }
    )
    const reconciliationAudit = {
      reconciliationNote: note,
      reconciliationResolution: "fulfilled",
      reconciledAt: new Date(),
      reconciledBy: req.user.id,
    }
    if (
      !payable ||
      !(await fulfillPurchase(
        payable,
        payable.razorpayPaymentId,
        reconciliationAudit
      ))
    ) {
      return paymentFailed(
        res,
        "Payment could not be fulfilled and remains in reconciliation",
        409
      )
    }
    return res.status(200).json({
      success: true,
      data: { purchaseId, resolution: "fulfilled" },
      message: "Payment manually reconciled and enrollment fulfilled",
    })
  } catch (error) {
    logPaymentFailure("Payment reconciliation failed", error, {
      purchaseId,
      requestId: req.requestId,
    })
    return paymentFailed(res, "Payment reconciliation could not be completed", 502)
  } finally {
    if (purchase?._id) {
      await Purchase.updateOne(
        { _id: purchase._id, reconciliationLockId },
        { $unset: { reconciliationLockId: 1, reconciliationLockUntil: 1 } }
      ).catch(() => undefined)
    }
  }
}

// Send a receipt only for a fulfilled purchase owned by this user. Client
// supplied amount values are ignored.
exports.sendPaymentSuccessEmail = async (req, res) => {
  const { orderId, paymentId } = req.body
  const userId = req.user.id

  if (!orderId || !paymentId || !userId) {
    return res.status(400).json({
      success: false,
      message: "Please provide all the details",
    })
  }

  try {
    const [purchase, enrolledStudent] = await Promise.all([
      Purchase.findOne({
        user: userId,
        razorpayOrderId: orderId,
        razorpayPaymentId: paymentId,
        status: "fulfilled",
      }),
      User.findById(userId).select("email firstName lastName"),
    ])

    if (!purchase || !enrolledStudent) {
      return res.status(400).json({
        success: false,
        message: "Verified payment not found",
      })
    }

    await mailSender(
      enrolledStudent.email,
      "Payment Received",
      paymentSuccessEmail(
        `${enrolledStudent.firstName} ${enrolledStudent.lastName}`,
        purchase.amount / 100,
        purchase.razorpayOrderId,
        purchase.razorpayPaymentId
      )
    )

    return res.status(200).json({
      success: true,
      message: "Payment success email sent",
    })
  } catch (error) {
    logPaymentFailure("Payment receipt email failed", error, {
      orderId,
      requestId: req.requestId,
    })
    return res.status(400).json({
      success: false,
      message: "Could not send email",
    })
  }
}

const enrollStudent = async (courses, userId) => {
  const courseDocuments = await Course.find({ _id: { $in: courses } }).select(
    "courseName"
  )
  if (courseDocuments.length !== courses.length) {
    throw new Error("Purchased course no longer exists")
  }

  const progressDocuments = []

  for (const courseId of courses) {
    let courseProgress
    try {
      courseProgress = await CourseProgress.findOneAndUpdate(
        { courseID: courseId, userId },
        { $setOnInsert: { completedVideos: [] } },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      )
    } catch (error) {
      // A concurrent idempotent verification may win the unique upsert race.
      if (error?.code !== 11000) throw error
      courseProgress = await CourseProgress.findOne({
        courseID: courseId,
        userId,
      })
    }
    if (!courseProgress) {
      throw new Error("Course progress could not be created")
    }
    progressDocuments.push(courseProgress)
  }

  const enrolledStudent = await User.findOneAndUpdate(
    {
      _id: userId,
      accountType: "Student",
      active: true,
      approved: true,
    },
    {
      $addToSet: {
        courses: { $each: courses },
        courseProgress: {
          $each: progressDocuments.map((progress) => progress._id),
        },
      },
    },
    { new: true }
  )
  if (!enrolledStudent) {
    await CourseProgress.deleteMany({
      _id: { $in: progressDocuments.map((progress) => progress._id) },
      userId,
      completedVideos: { $size: 0 },
    }).catch(() => undefined)
    const error = new Error("The purchasing account is no longer eligible")
    error.code = "PURCHASE_ACCOUNT_INELIGIBLE"
    throw error
  }

  try {
    const enrollmentResult = await Course.updateMany(
      { _id: { $in: courses } },
      { $addToSet: { studentsEnroled: userId } }
    )
    if (enrollmentResult.matchedCount !== courses.length) {
      throw new Error("Purchased course no longer exists")
    }
  } catch (error) {
    await Promise.allSettled([
      Course.updateMany(
        { _id: { $in: courses } },
        { $pull: { studentsEnroled: userId } }
      ),
      User.updateOne(
        { _id: userId },
        {
          $pull: {
            courses: { $in: courses },
            courseProgress: {
              $in: progressDocuments.map((progress) => progress._id),
            },
          },
        }
      ),
      CourseProgress.deleteMany({
        _id: { $in: progressDocuments.map((progress) => progress._id) },
        userId,
        completedVideos: { $size: 0 },
      }),
    ])
    throw error
  }

  return courseDocuments
}

const sendEnrollmentEmails = async (courses, userId) => {
  const student = await User.findById(userId).select("email firstName lastName")

  if (!student) return

  await Promise.allSettled(
    courses.map((course) =>
      mailSender(
        student.email,
        `Successfully Enrolled into ${course.courseName}`,
        courseEnrollmentEmail(
          course.courseName,
          `${student.firstName} ${student.lastName}`
        )
      )
    )
  )
}
