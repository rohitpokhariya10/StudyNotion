import { toast } from "react-hot-toast"

import {
  setAuthChecking,
  setLoading,
  setPolicyAcceptanceRequired,
  setSession,
  setSignupData,
} from "../../slices/authSlice"
import { resetCart } from "../../slices/cartSlice"
import { setUser } from "../../slices/profileSlice"
import { getAvatarSource } from "../../utils/avatar"
import { sanitizeInternalRedirect } from "../../utils/internalRedirect"
import { apiConnector } from "../apiConnector"
import { endpoints, profileEndpoints } from "../apis"

const {
  SENDOTP_API,
  SIGNUP_API,
  LOGIN_API,
  GOOGLE_LOGIN_API,
  LOGOUT_API,
  ACCEPT_POLICIES_API,
  RESETPASSTOKEN_API,
  RESETPASSWORD_API,
} = endpoints

const getErrorMessage = (error, fallback) =>
  error?.response?.data?.message || error?.message || fallback

const clearLegacyAuthStorage = () => {
  // Remove credentials written by older releases. Session credentials now
  // remain inaccessible to JavaScript in the server-issued HttpOnly cookie.
  if (typeof window === "undefined") return
  window.localStorage.removeItem("token")
  window.localStorage.removeItem("user")
}

const withFallbackImage = (user) => {
  if (!user) return null
  return {
    ...user,
    image: getAvatarSource(user),
  }
}

const readUser = (response) =>
  response?.data?.user || response?.data?.data || null

const commitSession = (dispatch, response) => {
  const responseUser = withFallbackImage(readUser(response))
  const user = responseUser
    ? {
        ...responseUser,
        deletionPending:
          response?.data?.deletionPending === true ||
          responseUser.deletionPending === true,
      }
    : null
  if (!response?.data?.success || !user) {
    throw new Error(response?.data?.message || "Invalid session response")
  }

  dispatch(setUser(user))
  dispatch(setSession(true))
  dispatch(
    setPolicyAcceptanceRequired(
      Boolean(response?.data?.requiresPolicyAcceptance)
    )
  )
  clearLegacyAuthStorage()
  return user
}

const navigateAfterLogin = (
  navigate,
  { deletionPending, requiresPolicyAcceptance, redirectTo }
) => {
  if (deletionPending) {
    navigate("/dashboard/settings", { replace: true })
    return
  }

  const destination = sanitizeInternalRedirect(redirectTo)
  if (requiresPolicyAcceptance) {
    navigate("/accept-terms", {
      replace: true,
      state: { from: destination },
    })
    return
  }

  navigate(destination, { replace: true })
}

export function restoreSession() {
  return async (dispatch) => {
    dispatch(setAuthChecking())
    clearLegacyAuthStorage()

    try {
      const response = await apiConnector(
        "GET",
        profileEndpoints.GET_USER_DETAILS_API
      )
      commitSession(dispatch, response)
      return true
    } catch (error) {
      dispatch(setUser(null))
      dispatch(setSession(false))
      dispatch(setPolicyAcceptanceRequired(false))

      // An absent/expired cookie is an expected anonymous state. Transient
      // failures are left to observability rather than shown as a login error.
      if (![401, 403].includes(error?.response?.status)) {
        console.error("Session restoration failed")
      }
      return false
    }
  }
}

export function sendOtp(email, navigate) {
  return async (dispatch) => {
    const toastId = toast.loading("Loading...")
    dispatch(setLoading(true))
    try {
      const response = await apiConnector("POST", SENDOTP_API, {
        email: email?.trim().toLowerCase(),
        checkUserPresent: true,
      })

      if (!response?.data?.success) {
        throw new Error(response?.data?.message)
      }

      // The API only includes this field when its non-production
      // ALLOW_DEV_OTP gate is enabled. Local Docker uses an optimized Vite
      // build, so import.meta.env.DEV is false even though the API is safely
      // running in development mode.
      if (response.data.otp) {
        toast.success(`Development OTP: ${response.data.otp}`, {
          duration: 10000,
        })
      }
      toast.success("OTP Sent Successfully")
      navigate?.("/verify-email")
      return true
    } catch (error) {
      toast.error(getErrorMessage(error, "Could Not Send OTP"))
      return false
    } finally {
      dispatch(setLoading(false))
      toast.dismiss(toastId)
    }
  }
}

export function signUp(signupData, otp, navigate) {
  return async (dispatch) => {
    const toastId = toast.loading("Loading...")
    dispatch(setLoading(true))
    try {
      const response = await apiConnector("POST", SIGNUP_API, {
        ...signupData,
        email: signupData?.email?.trim().toLowerCase(),
        otp,
      })

      if (!response?.data?.success) {
        throw new Error(response?.data?.message)
      }

      dispatch(setSignupData(null))
      toast.success(response.data.message || "Signup Successful")
      navigate("/login", { replace: true })
      return true
    } catch (error) {
      toast.error(getErrorMessage(error, "Signup Failed"))
      return false
    } finally {
      dispatch(setLoading(false))
      toast.dismiss(toastId)
    }
  }
}

export function login(email, password, navigate, redirectTo) {
  return async (dispatch) => {
    const toastId = toast.loading("Loading...")
    dispatch(setLoading(true))
    try {
      const response = await apiConnector("POST", LOGIN_API, {
        email: email?.trim().toLowerCase(),
        password,
      })

      const user = commitSession(dispatch, response)
      toast.success(response.data.message || "Login Successful")
      navigateAfterLogin(navigate, {
        deletionPending: user.deletionPending === true,
        requiresPolicyAcceptance: Boolean(
          response.data.requiresPolicyAcceptance
        ),
        redirectTo,
      })
      return true
    } catch (error) {
      dispatch(setUser(null))
      dispatch(setSession(false))
      toast.error(getErrorMessage(error, "Login Failed"))
      return false
    } finally {
      dispatch(setLoading(false))
      toast.dismiss(toastId)
    }
  }
}

export function googleLogin(
  credential,
  navigate,
  policyAcknowledgement = {},
  redirectTo
) {
  return async (dispatch) => {
    const toastId = toast.loading("Signing in with Google...")
    dispatch(setLoading(true))
    try {
      const response = await apiConnector("POST", GOOGLE_LOGIN_API, {
        credential,
        ...policyAcknowledgement,
      })

      const user = commitSession(dispatch, response)
      toast.success(response.data.message || "Google sign-in successful")
      navigateAfterLogin(navigate, {
        deletionPending: user.deletionPending === true,
        requiresPolicyAcceptance: Boolean(
          response.data.requiresPolicyAcceptance
        ),
        redirectTo,
      })
      return true
    } catch (error) {
      dispatch(setUser(null))
      dispatch(setSession(false))
      toast.error(getErrorMessage(error, "Google sign-in failed"))
      return false
    } finally {
      dispatch(setLoading(false))
      toast.dismiss(toastId)
    }
  }
}

export function acceptCurrentPolicies(
  policyAcknowledgement,
  navigate,
  redirectTo
) {
  return async (dispatch, getState) => {
    const toastId = toast.loading("Saving your agreement...")
    dispatch(setLoading(true))
    try {
      const response = await apiConnector(
        "POST",
        ACCEPT_POLICIES_API,
        policyAcknowledgement
      )
      if (!response?.data?.success) {
        throw new Error(
          response?.data?.message || "Agreement could not be saved"
        )
      }
      dispatch(setPolicyAcceptanceRequired(false))
      toast.success("Agreement saved")
      const deletionPending =
        getState?.().profile?.user?.deletionPending === true
      navigate(
        deletionPending
          ? "/dashboard/settings"
          : sanitizeInternalRedirect(redirectTo),
        { replace: true }
      )
      return true
    } catch (error) {
      toast.error(getErrorMessage(error, "Agreement could not be saved"))
      return false
    } finally {
      dispatch(setLoading(false))
      toast.dismiss(toastId)
    }
  }
}

export function getPasswordResetToken(email, setEmailSent) {
  return async (dispatch) => {
    const toastId = toast.loading("Loading...")
    dispatch(setLoading(true))
    try {
      const response = await apiConnector("POST", RESETPASSTOKEN_API, {
        email: email?.trim().toLowerCase(),
      })

      if (!response?.data?.success) {
        throw new Error(response?.data?.message)
      }

      toast.success("Reset Email Sent")
      setEmailSent(true)
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed To Send Reset Email"))
    } finally {
      toast.dismiss(toastId)
      dispatch(setLoading(false))
    }
  }
}

export function resetPassword(password, confirmPassword, token, navigate) {
  return async (dispatch) => {
    const toastId = toast.loading("Loading...")
    dispatch(setLoading(true))
    try {
      const response = await apiConnector("POST", RESETPASSWORD_API, {
        password,
        confirmPassword,
        token,
      })

      if (!response?.data?.success) {
        throw new Error(response?.data?.message)
      }

      toast.success("Password Reset Successfully")
      navigate("/login", { replace: true })
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed To Reset Password"))
    } finally {
      toast.dismiss(toastId)
      dispatch(setLoading(false))
    }
  }
}

export function logout(navigate) {
  return async (dispatch) => {
    try {
      const response = await apiConnector("POST", LOGOUT_API)
      if (!response?.data?.success) {
        throw new Error(response?.data?.message || "Logout failed")
      }
    } catch (error) {
      if (error?.response?.status !== 401) {
        toast.error(
          getErrorMessage(error, "Logout could not be completed. Please retry.")
        )
        return false
      }
    }

    dispatch(setSession(false))
    dispatch(setPolicyAcceptanceRequired(false))
    dispatch(setUser(null))
    dispatch(resetCart())
    clearLegacyAuthStorage()
    toast.success("Logged Out")
    navigate?.("/", { replace: true })
    return true
  }
}
