import { resetCart } from "@/entities/cart"
import {
  setPolicyAcceptanceRequired,
  setSession,
  setUser,
} from "@/entities/user"
import {
  registerSessionResponseHandler,
  SESSION_RESPONSE_SIGNALS,
} from "@/shared/api/httpClient"

const clearPersistedIdentityState = () => {
  if (typeof window === "undefined") return

  try {
    for (const key of ["token", "user"]) {
      window.localStorage.removeItem(key)
    }
  } catch {
    // Redux state remains authoritative when browser storage is unavailable.
  }
}

export const createSessionResponseHandler =
  ({ dispatch, getState }) =>
  (signal) => {
    if (signal === SESSION_RESPONSE_SIGNALS.UNAUTHORIZED) {
      const state = getState()
      const hadAuthenticatedSession = Boolean(
        state.auth?.isAuthenticated ||
        state.auth?.status === "authenticated" ||
        state.auth?.token != null ||
        state.profile?.user != null
      )

      clearPersistedIdentityState()
      if (!hadAuthenticatedSession) return

      if (state.profile?.user != null) dispatch(setUser(null))
      dispatch(resetCart())
      dispatch(setSession(false))
      return
    }

    if (signal === SESSION_RESPONSE_SIGNALS.ACCOUNT_DELETION_PENDING) {
      const user = getState().profile?.user
      if (user && user.deletionPending !== true) {
        dispatch(setUser({ ...user, deletionPending: true }))
      }
      return
    }

    if (signal === SESSION_RESPONSE_SIGNALS.POLICY_ACCEPTANCE_REQUIRED) {
      if (getState().auth?.requiresPolicyAcceptance !== true) {
        dispatch(setPolicyAcceptanceRequired(true))
      }
    }
  }

export const installSessionResponseIntegration = (store) =>
  registerSessionResponseHandler(createSessionResponseHandler(store))
