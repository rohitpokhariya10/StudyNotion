import { acceptCurrentPolicies } from "@/features/authentication"
import PolicyAcceptance from "@/pages/policy-acceptance"
import { configureStore } from "@reduxjs/toolkit"
import { fireEvent, render, screen } from "@testing-library/react"
import { Provider } from "react-redux"
import { MemoryRouter } from "react-router"
import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("@/features/authentication", async (importOriginal) => ({
  ...(await importOriginal()),
  acceptCurrentPolicies: vi.fn(() => ({ type: "auth/accept-policies-test" })),
}))

describe("PolicyAcceptance redirect intent", () => {
  beforeEach(() => vi.clearAllMocks())

  it("passes the saved internal destination through policy acceptance", () => {
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
              pathname: "/accept-terms",
              state: { from: "/dashboard/purchases?filter=refundable" },
            },
          ]}
        >
          <PolicyAcceptance />
        </MemoryRouter>
      </Provider>
    )

    fireEvent.submit(
      screen
        .getByRole("button", { name: "Accept and continue" })
        .closest("form")
    )

    expect(acceptCurrentPolicies).toHaveBeenCalledWith(
      expect.any(Object),
      expect.any(Function),
      "/dashboard/purchases?filter=refundable"
    )
  })
})
