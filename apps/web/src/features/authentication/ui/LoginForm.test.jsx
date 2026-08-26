import { login } from "@/features/authentication/api/authApi"
import LoginForm from "@/features/authentication/ui/LoginForm"
import { configureStore } from "@reduxjs/toolkit"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { Provider } from "react-redux"
import { MemoryRouter } from "react-router"
import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("@/features/authentication/api/authApi", () => ({
  login: vi.fn(() => ({ type: "auth/login-test" })),
}))

describe("LoginForm redirect intent", () => {
  beforeEach(() => vi.clearAllMocks())

  it("passes PrivateRoute's sanitized destination to local login", async () => {
    const user = userEvent.setup()
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
          <LoginForm />
        </MemoryRouter>
      </Provider>
    )

    await user.type(
      screen.getByRole("textbox", { name: /email address/i }),
      "learner@example.com"
    )
    await user.type(screen.getByLabelText(/^password/i), "password")
    await user.click(screen.getByRole("button", { name: "Sign In" }))

    expect(login).toHaveBeenCalledWith(
      "learner@example.com",
      "password",
      expect.any(Function),
      "/dashboard/enrolled-courses?status=active#course-1"
    )
  })
})
