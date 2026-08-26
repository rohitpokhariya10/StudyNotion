export const PAYMENT_STATUS = {
  fulfilled: {
    label: "Access active",
    description: "Payment verified and course access granted.",
    classes: "bg-caribbeangreen-800 text-caribbeangreen-100",
  },
  paid: {
    label: "Finalizing access",
    description: "Payment verified while enrollment finishes.",
    classes: "bg-yellow-800 text-yellow-50",
  },
  payment_review: {
    label: "Support review",
    description: "Payment is safe and awaiting manual reconciliation.",
    classes: "bg-yellow-800 text-yellow-50",
  },
  refund_requested: {
    label: "Refund requested",
    description: "Your request is waiting for an administrator review.",
    classes: "bg-blue-900 text-blue-100",
  },
  refund_pending: {
    label: "Refund processing",
    description: "Razorpay is processing the refund to the original method.",
    classes: "bg-blue-900 text-blue-100",
  },
  refunded: {
    label: "Refunded",
    description: "The refund was completed and this purchase is closed.",
    classes: "bg-richblack-600 text-richblack-100",
  },
}

export const getPaymentStatus = (status) =>
  PAYMENT_STATUS[status] || {
    label: String(status || "Unknown").replaceAll("_", " "),
    description: "Contact support if this status does not change.",
    classes: "bg-richblack-600 text-richblack-100",
  }

export const formatPaymentMoney = (amount, currency = "INR") => {
  const minorUnits = Number(amount)
  if (!Number.isFinite(minorUnits)) return "—"

  try {
    return new Intl.NumberFormat(undefined, {
      currency: String(currency || "INR").toUpperCase(),
      style: "currency",
    }).format(minorUnits / 100)
  } catch {
    return `${currency || "INR"} ${(minorUnits / 100).toFixed(2)}`
  }
}

export const formatPaymentDate = (value, fallback = "Not recorded") => {
  if (!value) return fallback
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return fallback

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date)
}

export const getRefundDeadline = (purchase) => {
  const recordedDeadline = new Date(purchase?.refundEligibilityDeadline || "")
  if (Number.isFinite(recordedDeadline.getTime())) return recordedDeadline

  const days = Number(purchase?.refundWindowDays)
  const recordedAt = new Date(
    purchase?.paidAt ||
      purchase?.reconciliationRequiredAt ||
      purchase?.createdAt ||
      ""
  ).getTime()
  if (!Number.isInteger(days) || days < 0 || !Number.isFinite(recordedAt)) {
    return null
  }
  return new Date(recordedAt + days * 24 * 60 * 60 * 1000)
}

export const isRefundWindowElapsed = (deadline) =>
  !deadline || deadline.getTime() < Date.now()

export const requiresRefundWindowOverride = (purchase, deadline) => {
  if (!isRefundWindowElapsed(deadline)) return false

  const providerAttemptExists =
    purchase?.status === "refund_pending" ||
    Boolean(purchase?.refundAttemptedAt || purchase?.refundId)
  const requestedAt = new Date(purchase?.refundRequestedAt || "").getTime()
  const requestWasTimely =
    purchase?.status === "refund_requested" &&
    deadline &&
    Number.isFinite(requestedAt) &&
    requestedAt <= deadline.getTime()

  return !providerAttemptExists && !requestWasTimely
}
