const mongoose = require("mongoose")

const MAX_PURCHASE_COURSES = 20
const PURCHASE_STATUSES = new Set([
  "created",
  "order_created",
  "paid",
  "fulfilled",
  "failed",
  "expired",
  "payment_review",
  "refund_pending",
  "refund_requested",
  "refunded",
])
const NON_SIDECAR_PURCHASE_STATUSES = new Set([
  "created",
  "order_created",
  "failed",
  "expired",
  "payment_review",
])

const validDate = (value) =>
  value instanceof Date && Number.isFinite(value.getTime())

const referenceKey = (value) => {
  if (value === undefined || value === null) return null
  if (
    typeof value === "object" &&
    value._id !== undefined &&
    value._id !== value
  ) {
    return referenceKey(value._id)
  }
  const normalized = String(value)
  return normalized && normalized !== "[object Object]" ? normalized : null
}

const referencesEqual = (left, right) => {
  const leftKey = referenceKey(left)
  const rightKey = referenceKey(right)
  return Boolean(leftKey && rightKey && leftKey === rightKey)
}

const persistedObjectId = (value) => value instanceof mongoose.Types.ObjectId

const validLineItem = (lineItem) =>
  persistedObjectId(lineItem?.course) &&
  typeof lineItem.courseName === "string" &&
  lineItem.courseName.length > 0 &&
  Number.isFinite(lineItem.amount) &&
  lineItem.amount >= 0

const analyzePurchaseCourseEvidence = (purchase) => {
  if (
    !persistedObjectId(purchase?._id) ||
    !persistedObjectId(purchase?.user) ||
    !Array.isArray(purchase.courses)
  ) {
    return Object.freeze({ ok: false, reason: "identity_invalid" })
  }
  if (
    purchase.courses.length < 1 ||
    purchase.courses.length > MAX_PURCHASE_COURSES
  ) {
    return Object.freeze({ ok: false, reason: "course_count_invalid" })
  }

  if (!purchase.courses.every(persistedObjectId)) {
    return Object.freeze({ ok: false, reason: "course_reference_invalid" })
  }
  const courseIds = purchase.courses.map(referenceKey)
  if (new Set(courseIds).size !== courseIds.length) {
    return Object.freeze({ ok: false, reason: "course_set_ambiguous" })
  }
  if (!Array.isArray(purchase.lineItems)) {
    return Object.freeze({ ok: false, reason: "line_items_missing" })
  }
  if (purchase.lineItems.length !== courseIds.length) {
    return Object.freeze({ ok: false, reason: "line_items_ambiguous" })
  }
  if (!purchase.lineItems.every(validLineItem)) {
    return Object.freeze({ ok: false, reason: "line_items_invalid" })
  }
  const exactLineSet = courseIds.every(
    (courseId) =>
      purchase.lineItems.filter(
        (lineItem) => referenceKey(lineItem?.course) === courseId
      ).length === 1
  )
  if (!exactLineSet) {
    return Object.freeze({ ok: false, reason: "line_items_ambiguous" })
  }

  return Object.freeze({
    courseIds: Object.freeze(courseIds),
    ok: true,
  })
}

const purchaseHasVerifiedCapture = (purchase) =>
  validDate(purchase?.paidAt) &&
  typeof purchase?.razorpayPaymentId === "string" &&
  purchase.razorpayPaymentId.length > 0

const purchaseIsInSidecarCohort = (purchase, sidecarStartedAt) =>
  validDate(sidecarStartedAt) &&
  validDate(purchase?.createdAt) &&
  validDate(purchase?.paidAt) &&
  purchase.createdAt >= sidecarStartedAt &&
  purchase.paidAt >= sidecarStartedAt &&
  purchase.paidAt >= purchase.createdAt

const purchaseHasActivationEvidence = (purchase) =>
  purchaseHasVerifiedCapture(purchase) &&
  validDate(purchase?.fulfilledAt) &&
  purchase.fulfilledAt >= purchase.paidAt

const purchaseHasProcessedRefundEvidence = (purchase) => {
  if (
    !purchaseHasVerifiedCapture(purchase) ||
    !["refund_pending", "refunded"].includes(purchase?.status) ||
    purchase.refundProviderStatus !== "processed" ||
    !validDate(purchase.refundProcessedAt) ||
    !["payment_review", "refund_requested"].includes(
      purchase.refundOriginStatus
    )
  ) {
    return false
  }
  if (
    purchase.refundProcessedAt < purchase.paidAt ||
    !validDate(purchase.refundEntitlementsRevokedAt) ||
    purchase.refundEntitlementsRevokedAt < purchase.refundProcessedAt ||
    (purchase.status === "refund_pending" && purchase.refundedAt !== undefined)
  ) {
    return false
  }
  if (purchase.refundOriginStatus === "payment_review") {
    if (purchase.fulfilledAt !== undefined) return false
    return (
      purchase.status !== "refunded" ||
      (validDate(purchase.refundedAt) &&
        purchase.refundedAt >= purchase.refundEntitlementsRevokedAt)
    )
  }
  if (
    !purchaseHasActivationEvidence(purchase) ||
    purchase.refundProcessedAt < purchase.fulfilledAt ||
    purchase.refundEntitlementsRevokedAt < purchase.refundProcessedAt
  ) {
    return false
  }
  return (
    purchase.status !== "refunded" ||
    (validDate(purchase.refundedAt) &&
      purchase.refundedAt >= purchase.refundEntitlementsRevokedAt)
  )
}

const purchaseFinancialState = (purchase) => {
  if (!PURCHASE_STATUSES.has(purchase?.status)) return "malformed"
  if (purchase.status === "payment_review") {
    return purchaseHasVerifiedCapture(purchase) &&
      purchase.fulfilledAt === undefined &&
      purchase.refundProviderStatus === undefined &&
      purchase.refundOriginStatus === undefined &&
      purchase.refundProcessedAt === undefined &&
      purchase.refundEntitlementsRevokedAt === undefined &&
      purchase.refundedAt === undefined
      ? "held_capture"
      : "malformed"
  }
  if (NON_SIDECAR_PURCHASE_STATUSES.has(purchase.status)) {
    return purchase.razorpayPaymentId === undefined &&
      purchase.paidAt === undefined &&
      purchase.fulfilledAt === undefined &&
      purchase.refundProviderStatus === undefined &&
      purchase.refundOriginStatus === undefined &&
      purchase.refundProcessedAt === undefined &&
      purchase.refundEntitlementsRevokedAt === undefined &&
      purchase.refundedAt === undefined
      ? "ignored"
      : "malformed"
  }
  if (purchase.status === "paid") {
    return purchaseHasVerifiedCapture(purchase) &&
      purchase.fulfilledAt === undefined &&
      purchase.refundProviderStatus === undefined &&
      purchase.refundOriginStatus === undefined &&
      purchase.refundProcessedAt === undefined &&
      purchase.refundEntitlementsRevokedAt === undefined &&
      purchase.refundedAt === undefined
      ? "paid"
      : "malformed"
  }
  if (purchaseHasProcessedRefundEvidence(purchase)) {
    return "processed_refund"
  }
  if (purchaseAllowsActivation(purchase)) return "activation"
  if (
    purchase.status === "refund_pending" &&
    purchaseHasVerifiedCapture(purchase) &&
    purchase.fulfilledAt === undefined &&
    purchase.refundOriginStatus === "payment_review" &&
    [undefined, "pending", "failed"].includes(purchase.refundProviderStatus) &&
    purchase.refundProcessedAt === undefined &&
    purchase.refundEntitlementsRevokedAt === undefined &&
    purchase.refundedAt === undefined
  ) {
    return "held_refund"
  }
  return "malformed"
}

const purchaseAllowsActivation = (purchase) => {
  if (!purchaseHasActivationEvidence(purchase)) return false
  if (["fulfilled", "refund_requested"].includes(purchase?.status)) {
    return (
      purchase.refundProviderStatus === undefined &&
      purchase.refundOriginStatus === undefined &&
      purchase.refundProcessedAt === undefined &&
      purchase.refundEntitlementsRevokedAt === undefined &&
      purchase.refundedAt === undefined
    )
  }
  return Boolean(
    purchase?.status === "refund_pending" &&
    purchase.refundOriginStatus === "refund_requested" &&
    [undefined, "pending", "failed"].includes(purchase.refundProviderStatus) &&
    purchase.refundProcessedAt === undefined &&
    purchase.refundEntitlementsRevokedAt === undefined &&
    purchase.refundedAt === undefined
  )
}

const purchaseMatchesEpisode = (
  episode,
  purchase,
  { sidecarStartedAt } = {}
) => {
  const courseEvidence = analyzePurchaseCourseEvidence(purchase)
  return Boolean(
    courseEvidence.ok &&
    purchaseHasVerifiedCapture(purchase) &&
    purchaseIsInSidecarCohort(purchase, sidecarStartedAt) &&
    referencesEqual(purchase._id, episode?.purchaseId) &&
    referencesEqual(purchase.user, episode?.studentId) &&
    courseEvidence.courseIds.includes(referenceKey(episode?.courseId))
  )
}

module.exports = Object.freeze({
  MAX_PURCHASE_COURSES,
  analyzePurchaseCourseEvidence,
  purchaseAllowsActivation,
  purchaseHasVerifiedCapture,
  purchaseHasActivationEvidence,
  purchaseHasProcessedRefundEvidence,
  purchaseFinancialState,
  purchaseIsInSidecarCohort,
  purchaseMatchesEpisode,
  referenceKey,
  referencesEqual,
  validDate,
})
