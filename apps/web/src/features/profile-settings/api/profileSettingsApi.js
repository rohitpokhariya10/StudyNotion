import { getAvatarSource, setUser } from "@/entities/user"
import { settingsEndpoints } from "@/shared/api/endpoints"
import { apiConnector } from "@/shared/api/httpClient"
import { toast } from "react-hot-toast"

const { UPDATE_DISPLAY_PICTURE_API, UPDATE_PROFILE_API } = settingsEndpoints

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
