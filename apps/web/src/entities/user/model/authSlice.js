import { createSlice } from "@reduxjs/toolkit"

const initialState = {
  signupData: null,
  loading: false,
  status: "checking",
  isAuthenticated: false,
  requiresPolicyAcceptance: false,
  // Temporary compatibility flag for existing feature call sites. This is
  // never a credential; the real session lives only in the HttpOnly cookie.
  token: null,
}

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setSignupData(state, value) {
      state.signupData = value.payload
    },
    setLoading(state, value) {
      state.loading = value.payload
    },
    setAuthChecking(state) {
      state.status = "checking"
    },
    setSession(state, value) {
      const isAuthenticated = Boolean(value.payload)
      state.isAuthenticated = isAuthenticated
      state.status = isAuthenticated ? "authenticated" : "anonymous"
      state.token = isAuthenticated ? true : null
      if (!isAuthenticated) state.requiresPolicyAcceptance = false
    },
    setPolicyAcceptanceRequired(state, value) {
      state.requiresPolicyAcceptance = Boolean(value.payload)
    },
  },
})

export const {
  setSignupData,
  setLoading,
  setAuthChecking,
  setPolicyAcceptanceRequired,
  setSession,
} = authSlice.actions

export default authSlice.reducer
