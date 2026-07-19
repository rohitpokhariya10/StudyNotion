import { describe, expect, it } from "vitest"

import authReducer, {
  setAuthChecking,
  setPolicyAcceptanceRequired,
  setSession,
} from "./authSlice"

describe("auth session state", () => {
  it("starts without a JavaScript-readable credential", () => {
    const state = authReducer(undefined, { type: "unknown" })

    expect(state.status).toBe("checking")
    expect(state.isAuthenticated).toBe(false)
    expect(state.token).toBeNull()
  })

  it("tracks a verified cookie session without storing the credential", () => {
    const authenticated = authReducer(undefined, setSession(true))
    const checking = authReducer(authenticated, setAuthChecking())
    const anonymous = authReducer(checking, setSession(false))

    expect(authenticated.status).toBe("authenticated")
    expect(authenticated.isAuthenticated).toBe(true)
    expect(authenticated.token).toBe(true)
    expect(checking.status).toBe("checking")
    expect(anonymous.status).toBe("anonymous")
    expect(anonymous.token).toBeNull()
  })

  it("tracks a policy gate without treating it as a browser credential", () => {
    const authenticated = authReducer(undefined, setSession(true))
    const gated = authReducer(authenticated, setPolicyAcceptanceRequired(true))
    const signedOut = authReducer(gated, setSession(false))

    expect(gated.requiresPolicyAcceptance).toBe(true)
    expect(gated.token).toBe(true)
    expect(signedOut.requiresPolicyAcceptance).toBe(false)
    expect(signedOut.token).toBeNull()
  })
})
