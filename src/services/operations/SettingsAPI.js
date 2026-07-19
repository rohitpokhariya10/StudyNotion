import { toast } from "react-hot-toast"

import { setUser } from "../../slices/profileSlice"
import { getAvatarSource } from "../../utils/avatar"
import { apiConnector } from "../apiConnector"
import { settingsEndpoints } from "../apis"
import { logout } from "./authAPI"

const {
  UPDATE_DISPLAY_PICTURE_API,
  UPDATE_PROFILE_API,
  CHANGE_PASSWORD_API,
  DELETE_PROFILE_API,
} = settingsEndpoints

const getErrorMessage = (error, fallback) =>
  error?.response?.data?.message || error?.message || fallback

const withFallbackImage = (user) => {
  if (!user) return user
  return {
    ...user,
    image: getAvatarSource(user),
  }
}

export function updateDisplayPicture(_token, formData) {
  return async (dispatch) => {
    const toastId = toast.loading("Loading...")
    try {
      const response = await apiConnector(
        "PUT",
        UPDATE_DISPLAY_PICTURE_API,
        formData,
        {
          "Content-Type": "multipart/form-data",
        }
      )

      if (!response?.data?.success || !response?.data?.data) {
        throw new Error(response?.data?.message || "Invalid profile response")
      }
      toast.success("Display Picture Updated Successfully")
      dispatch(setUser(withFallbackImage(response.data.data)))
      return true
    } catch (error) {
      toast.error(getErrorMessage(error, "Could not update display picture"))
      return false
    } finally {
      toast.dismiss(toastId)
    }
  }
}

export function updateProfile(_token, formData) {
  return async (dispatch) => {
    const toastId = toast.loading("Loading...")
    try {
      const response = await apiConnector("PUT", UPDATE_PROFILE_API, formData)

      const updatedUser = response?.data?.updatedUserDetails
      if (!response?.data?.success || !updatedUser) {
        throw new Error(response?.data?.message || "Invalid profile response")
      }
      dispatch(setUser(withFallbackImage(updatedUser)))
      toast.success("Profile Updated Successfully")
      return true
    } catch (error) {
      toast.error(getErrorMessage(error, "Could not update profile"))
      return false
    } finally {
      toast.dismiss(toastId)
    }
  }
}

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
