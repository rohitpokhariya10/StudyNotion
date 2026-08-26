import { setUser } from "@/entities/user"
import { settingsEndpoints } from "@/shared/api/endpoints"
import { apiConnector } from "@/shared/api/httpClient"
import { toast } from "react-hot-toast"

import { logout } from "./authApi"

const { CHANGE_PASSWORD_API, DELETE_PROFILE_API } = settingsEndpoints

const getErrorMessage = (error, fallback) =>
  error?.response?.data?.message || error?.message || fallback

export async function changePassword(_token, formData) {
  const toastId = toast.loading("Loading...")
  try {
    const response = await apiConnector("POST", CHANGE_PASSWORD_API, formData)

    if (!response?.data?.success) {
      throw new Error(response?.data?.message || "Password change failed")
    }
    toast.success("Password Changed Successfully")
    return true
  } catch (error) {
    toast.error(getErrorMessage(error, "Could not change password"))
    return false
  } finally {
    toast.dismiss(toastId)
  }
}

export function deleteProfile(_token, navigate, confirmation) {
  return async (dispatch, getState) => {
    const toastId = toast.loading("Loading...")
    try {
      const response = await apiConnector(
        "DELETE",
        DELETE_PROFILE_API,
        confirmation
      )

      if (!response?.data?.success) {
        throw new Error(response?.data?.message || "Account deletion failed")
      }
      toast.success("Profile Deleted Successfully")
      await dispatch(logout(navigate))
      return true
    } catch (error) {
      if (error?.response?.data?.code === "ACCOUNT_DELETION_PENDING") {
        const user = getState().profile.user
        if (user) dispatch(setUser({ ...user, deletionPending: true }))
      }
      toast.error(getErrorMessage(error, "Could not delete profile"))
      return false
    } finally {
      toast.dismiss(toastId)
    }
  }
}
