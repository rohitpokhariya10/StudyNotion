import { googleLogin } from "@/features/authentication/api/authApi"
import { loadGoogleIdentityServices } from "@/features/authentication/lib/googleIdentity"
import GoogleSignInButton from "@/features/authentication/ui/GoogleSignInButton"
import { configureStore } from "@reduxjs/toolkit"
import { act, render, waitFor } from "@testing-library/react"
import { Provider } from "react-redux"
import { MemoryRouter } from "react-router"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("@/features/authentication/api/authApi", () => ({
  googleLogin: vi.fn(() => ({ type: "auth/google-login-test" })),
}))

vi.mock("@/features/authentication/lib/googleIdentity", () => ({
  loadGoogleIdentityServices: vi.fn(),
}))

describe("GoogleSignInButton redirect intent", () => {
  let googleIdentity

  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubEnv("VITE_GOOGLE_CLIENT_ID", "test-google-client-id")
    googleIdentity = {
      accounts: {
        id: {
          initialize: vi.fn(),
          renderButton: vi.fn(),
        },
      },
    }
    loadGoogleIdentityServices.mockResolvedValue(googleIdentity)
  })

  afterEach(() => vi.unstubAllEnvs())

  it("passes PrivateRoute's sanitized destination to Google login", async () => {
    const state = { auth: { loading: false } }
    const store = configureStore({
      preloadedState: state,
      reducer: (currentState = state) => currentState,
    })

    render(
      <Provider store={store}>
        <MemoryRouter
          initialEntries={[
            {
              pathname: "/login",
              state: {
                from: {
                  pathname: "/dashboard/enrolled-courses",
                  search: "?status=active",
                  hash: "#course-1",
                },
              },
            },
          ]}
        >
          <GoogleSignInButton />
        </MemoryRouter>
      </Provider>
    )

    await waitFor(() =>
      expect(googleIdentity.accounts.id.initialize).toHaveBeenCalledOnce()
    )
    const { callback } = googleIdentity.accounts.id.initialize.mock.calls[0][0]

    act(() => callback({ credential: "google-id-token" }))

    expect(googleLogin).toHaveBeenCalledWith(
      "google-id-token",
      expect.any(Function),
      undefined,
      "/dashboard/enrolled-courses?status=active#course-1"
    )
  })
})
