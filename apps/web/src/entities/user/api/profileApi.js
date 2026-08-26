import { getAvatarSource } from "@/entities/user/lib/avatar"
import { setSession } from "@/entities/user/model/authSlice"
import { setLoading, setUser } from "@/entities/user/model/profileSlice"
import { profileEndpoints } from "@/shared/api/endpoints"
import { apiConnector } from "@/shared/api/httpClient"
import { toast } from "react-hot-toast"

const {
  GET_USER_DETAILS_API,
  GET_USER_ENROLLED_COURSES_API,
  GET_INSTRUCTOR_DATA_API,
} = profileEndpoints

export function getUserDetails() {
  return async (dispatch) => {
    const toastId = toast.loading("Loading...")
    dispatch(setLoading(true))
    try {
      const response = await apiConnector("GET", GET_USER_DETAILS_API)

      if (!response?.data?.success || !response?.data?.data) {
        throw new Error(response?.data?.message || "Invalid profile response")
      }
      const userImage = getAvatarSource(response.data.data)
      dispatch(setUser({ ...response.data.data, image: userImage }))
      dispatch(setSession(true))
    } catch (error) {
      if ([401, 403].includes(error?.response?.status)) {
        dispatch(setUser(null))
        dispatch(setSession(false))
      } else {
        toast.error("Could Not Get User Details")
      }
    } finally {
      toast.dismiss(toastId)
      dispatch(setLoading(false))
    }
  }
}

export async function getUserEnrolledCourses(_token) {
  const toastId = toast.loading("Loading...")
  let result = []
  try {
    const response = await apiConnector("GET", GET_USER_ENROLLED_COURSES_API)

    if (!response?.data?.success || !Array.isArray(response?.data?.data)) {
      throw new Error(response?.data?.message || "Invalid courses response")
    }
    result = response.data.data
  } catch (error) {
    toast.error(
      error?.response?.data?.message ||
        error?.message ||
        "Could not get enrolled courses"
    )
  } finally {
    toast.dismiss(toastId)
  }
  return result
}

export async function getInstructorData(_token) {
  const toastId = toast.loading("Loading...")
  let result = []
  try {
    const response = await apiConnector("GET", GET_INSTRUCTOR_DATA_API)
    if (!response?.data?.success || !Array.isArray(response?.data?.courses)) {
      throw new Error(response?.data?.message || "Invalid dashboard response")
    }
    result = response.data.courses
  } catch (error) {
    toast.error(
      error?.response?.data?.message ||
        error?.message ||
        "Could not get instructor data"
    )
  } finally {
    toast.dismiss(toastId)
  }
  return result
}
