import { restoreSession } from "@/features/authentication/api/authApi"
import SessionBootstrap from "@/features/authentication/SessionBootstrap"
import { render, screen } from "@testing-library/react"
import { StrictMode } from "react"
import { Provider } from "react-redux"
import { describe, expect, it, vi } from "vitest"

vi.mock("@/features/authentication/api/authApi", () => ({
  restoreSession: vi.fn(() => ({ type: "auth/restore-session" })),
}))

describe("SessionBootstrap", () => {
  it("dispatches session restoration once under StrictMode", () => {
    const store = {
      dispatch: vi.fn(),
      getState: () => ({}),
      subscribe: () => () => {},
    }

    render(
      <StrictMode>
        <Provider store={store}>
          <SessionBootstrap>
            <p>Application content</p>
          </SessionBootstrap>
        </Provider>
      </StrictMode>
    )

    expect(screen.getByText("Application content")).toBeVisible()
    expect(restoreSession).toHaveBeenCalledOnce()
    expect(store.dispatch).toHaveBeenCalledOnce()
    expect(store.dispatch).toHaveBeenCalledWith({
      type: "auth/restore-session",
    })
  })
})
