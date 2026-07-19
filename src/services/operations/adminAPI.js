import { apiConnector } from "../apiConnector"
import { adminEndpoints } from "../apis"

const getErrorMessage = (error, fallback) =>
  error?.response?.data?.message || error?.message || fallback

export const fetchPendingInstructors = async ({
  page = 1,
  limit = 20,
} = {}) => {
  try {
    const response = await apiConnector(
      "GET",
      adminEndpoints.PENDING_INSTRUCTORS_API,
      null,
      undefined,
      { page, limit }
    )
    if (!response?.data?.success || !response?.data?.data) {
      throw new Error(response?.data?.message || "Invalid admin response")
    }
    return response.data.data
  } catch (error) {
    throw new Error(
      getErrorMessage(error, "Pending instructors could not be loaded")
    )
  }
}

export const approveInstructor = async (instructorId, note = "") => {
  try {
    const response = await apiConnector(
      "PATCH",
      adminEndpoints.APPROVE_INSTRUCTOR_API(instructorId),
      { note }
    )
    if (!response?.data?.success || !response?.data?.data?.instructor) {
      throw new Error(response?.data?.message || "Invalid approval response")
    }
    return response.data
  } catch (error) {
    throw new Error(getErrorMessage(error, "Instructor could not be approved"))
  }
}

export const rejectInstructor = async (instructorId, reason) => {
  try {
    const response = await apiConnector(
      "PATCH",
      adminEndpoints.REJECT_INSTRUCTOR_API(instructorId),
      { reason }
    )
    if (!response?.data?.success || !response?.data?.data?.instructor) {
      throw new Error(response?.data?.message || "Invalid rejection response")
    }
    return response.data
  } catch (error) {
    throw new Error(getErrorMessage(error, "Instructor could not be rejected"))
  }
}

export const fetchPaymentReconciliation = async ({
  page = 1,
  limit = 20,
} = {}) => {
  try {
    const response = await apiConnector(
      "GET",
      adminEndpoints.PAYMENT_RECONCILIATION_API,
      null,
      undefined,
      { page, limit }
    )
    if (!response?.data?.success || !response?.data?.data) {
      throw new Error(
        response?.data?.message || "Invalid reconciliation response"
      )
    }
    return response.data.data
  } catch (error) {
    throw new Error(
      getErrorMessage(error, "Payment reconciliation could not be loaded")
    )
  }
}

export const resolvePaymentReconciliation = async ({
  action,
  note,
  overrideRefundWindow = false,
  purchaseId,
}) => {
  if (
    !purchaseId ||
    !["fulfill", "refund", "reject_refund", "retry_refund"].includes(action)
  ) {
    throw new Error("A valid purchase and reconciliation action are required")
  }
  const normalizedAction = action
  const normalizedNote = typeof note === "string" ? note.trim() : ""
  if (normalizedNote.length < 10 || normalizedNote.length > 1000) {
    throw new Error("A reconciliation note of 10-1000 characters is required")
  }
  const confirmation = {
    fulfill: "FULFILL PAYMENT",
    refund: "REFUND PAYMENT",
    reject_refund: "REJECT REFUND",
    retry_refund: "RETRY FAILED REFUND",
  }[normalizedAction]

  try {
    const response = await apiConnector(
      "POST",
      adminEndpoints.RESOLVE_PAYMENT_RECONCILIATION_API(purchaseId),
      {
        action: normalizedAction,
        confirmation,
        note: normalizedNote,
        ...(normalizedAction === "refund" && overrideRefundWindow
          ? { overrideRefundWindow: true }
          : {}),
      }
    )
    if (!response?.data?.success || !response?.data?.data) {
      throw new Error(
        response?.data?.message || "Invalid reconciliation response"
      )
    }
    return response.data
  } catch (error) {
    throw new Error(
      getErrorMessage(error, "Payment reconciliation could not be completed")
    )
  }
}
