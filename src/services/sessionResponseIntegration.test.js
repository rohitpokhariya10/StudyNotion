import { configureStore } from "@reduxjs/toolkit"
import { beforeEach, describe, expect, it } from "vitest"

import rootReducer from "../reducer"
import { SESSION_RESPONSE_SIGNALS } from "./apiConnector"
import { createSessionResponseHandler } from "./sessionResponseIntegration"

const learner = {
  _id: "user-1",
  email: "learner@example.com",
  deletionPending: false,
}

const course = { _id: "course-1", price: 499 }

const createAuthenticatedStore = () =>
  configureStore({
    reducer: rootReducer,
    preloadedState: {
      auth: {
        signupData: null,
        loading: false,
        status: "authenticated",
        isAuthenticated: true,
        requiresPolicyAcceptance: false,
        token: true,
      },
      profile: { user: learner, loading: false },
      cart: { cart: [course], total: 499, totalItems: 1 },
    },
  })

beforeEach(() => {
  window.localStorage.clear()
})

describe("session response state integration", () => {
  it("clears stale session, profile, cart, and legacy persisted state on 401", () => {
    const store = createAuthenticatedStore()
    const handleSignal = createSessionResponseHandler(store)
    for (const [key, value] of [
      ["token", "legacy-token"],
      ["user", JSON.stringify(learner)],
      ["cart", JSON.stringify([course])],
      ["total", "499"],
      ["totalItems", "1"],
    ]) {
      window.localStorage.setItem(key, value)
    }

    handleSignal(SESSION_RESPONSE_SIGNALS.UNAUTHORIZED)

    expect(store.getState()).toMatchObject({
      auth: {
        status: "anonymous",
        isAuthenticated: false,
        requiresPolicyAcceptance: false,
        token: null,
      },
      profile: { user: null },
      cart: { cart: [], total: 0, totalItems: 0 },
    })
    for (const key of ["token", "user", "cart", "total", "totalItems"]) {
      expect(window.localStorage.getItem(key)).toBeNull()
    }
  })

  it.each(["checking", "anonymous"])(
    "preserves a guest cart on an expected %s-session 401",
    (status) => {
      const store = configureStore({
        reducer: rootReducer,
        preloadedState: {
          auth: {
            signupData: null,
            loading: false,
            status,
            isAuthenticated: false,
            requiresPolicyAcceptance: false,
            token: null,
          },
          profile: { user: null, loading: false },
          cart: { cart: [course], total: 499, totalItems: 1 },
        },
      })
      const handleSignal = createSessionResponseHandler(store)
      window.localStorage.setItem("token", "legacy-token")
      window.localStorage.setItem("user", JSON.stringify(learner))
      window.localStorage.setItem("cart", JSON.stringify([course]))
      window.localStorage.setItem("total", "499")
      window.localStorage.setItem("totalItems", "1")

      handleSignal(SESSION_RESPONSE_SIGNALS.UNAUTHORIZED)

      expect(store.getState().auth.status).toBe(status)
      expect(store.getState().profile.user).toBeNull()
      expect(store.getState().cart).toMatchObject({
        cart: [course],
        total: 499,
        totalItems: 1,
      })
      expect(window.localStorage.getItem("token")).toBeNull()
      expect(window.localStorage.getItem("user")).toBeNull()
      expect(JSON.parse(window.localStorage.getItem("cart"))).toEqual([course])
      expect(window.localStorage.getItem("total")).toBe("499")
      expect(window.localStorage.getItem("totalItems")).toBe("1")
    }
  )

  it("enters deletion-recovery mode without discarding the session", () => {
    const store = createAuthenticatedStore()
    const handleSignal = createSessionResponseHandler(store)

    handleSignal(SESSION_RESPONSE_SIGNALS.ACCOUNT_DELETION_PENDING)

    expect(store.getState().profile.user).toEqual({
      ...learner,
      deletionPending: true,
    })
    expect(store.getState().auth.isAuthenticated).toBe(true)
    expect(store.getState().cart.cart).toEqual([course])
  })

  it("enables the policy gate without logging out the current user", () => {
    const store = createAuthenticatedStore()
    const handleSignal = createSessionResponseHandler(store)

    handleSignal(SESSION_RESPONSE_SIGNALS.POLICY_ACCEPTANCE_REQUIRED)

    expect(store.getState().auth).toMatchObject({
      status: "authenticated",
      isAuthenticated: true,
      requiresPolicyAcceptance: true,
      token: true,
    })
    expect(store.getState().profile.user).toEqual(learner)
  })
})
