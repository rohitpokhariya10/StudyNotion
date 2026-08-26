import { adminEndpoints } from "@/shared/api/endpoints"
import { apiConnector } from "@/shared/api/httpClient"

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
