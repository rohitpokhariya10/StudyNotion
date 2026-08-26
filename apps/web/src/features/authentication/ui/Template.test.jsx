import Template from "@/features/authentication/ui/Template"
import { configureStore } from "@reduxjs/toolkit"
import { render, screen } from "@testing-library/react"
import { Provider } from "react-redux"
import { MemoryRouter } from "react-router"
import { afterEach, describe, expect, it, vi } from "vitest"

vi.mock("@/features/authentication/ui/LoginForm", () => ({
  default: () => <div>Local login</div>,
}))
vi.mock("@/features/authentication/ui/SignupForm", () => ({
  default: () => <div>Local signup</div>,
}))
vi.mock("@/features/authentication/ui/GoogleSignInButton", () => ({
  default: () => <button type="button">Google identity</button>,
}))

const renderTemplate = () => {
  const store = configureStore({
    reducer: {
      auth: (state = { loading: false }) => state,
    },
  })
  return render(
    <Provider store={store}>
      <MemoryRouter>
        <Template
          title="Sign in"
          description1="Welcome"
          description2="back"
          image="/fixture.png"
          formType="login"
        />
      </MemoryRouter>
    </Provider>
  )
}

afterEach(() => vi.unstubAllEnvs())

describe("Template Google Identity deployment state", () => {
  it("removes the complete Google affordance when staging leaves it unconfigured", () => {
    vi.stubEnv("VITE_GOOGLE_CLIENT_ID", "")
    renderTemplate()

    expect(screen.queryByText("or")).not.toBeInTheDocument()
    expect(
      screen.queryByRole("button", { name: /google identity/i })
    ).not.toBeInTheDocument()
  })

  it("shows Google Identity only for a configured client", () => {
    vi.stubEnv(
      "VITE_GOOGLE_CLIENT_ID",
      "123456789-staging.apps.googleusercontent.com"
    )
    renderTemplate()

    expect(screen.getByText("or")).toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: /google identity/i })
    ).toBeInTheDocument()
  })
})
