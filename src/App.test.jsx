import { configureStore } from "@reduxjs/toolkit"
import { render, screen } from "@testing-library/react"
import { Provider } from "react-redux"
import { MemoryRouter, Outlet, useLocation } from "react-router-dom"
import { describe, expect, it, vi } from "vitest"

import App from "./App"

vi.mock("./App.css", () => ({}))

vi.mock("./components/Common/Navbar", () => ({
  default: () => null,
}))

vi.mock("./components/Common/RouteErrorBoundary", () => ({
  default: ({ children }) => children,
}))

vi.mock("./pages/Dashboard", () => ({
  default: () => <Outlet />,
}))

vi.mock("./components/core/Dashboard/MyProfile", () => ({
  default: () => <div>Profile destination</div>,
}))

vi.mock("./components/core/Dashboard/Settings", () => ({
  default: () => <div>Settings destination</div>,
}))

vi.mock("./pages/PolicyAcceptance", () => ({
  default: () => <div>Policy gate</div>,
}))

vi.mock("./services/operations/authAPI", () => ({
  restoreSession: () => ({ type: "auth/restore-test" }),
}))

function LocationProbe() {
  const location = useLocation()
  return (
    <output data-testid="location">
      {location.pathname}
      {location.search}
      {location.hash}
    </output>
  )
}

const authenticatedState = {
  auth: {
    isAuthenticated: true,
    loading: false,
    requiresPolicyAcceptance: false,
    status: "authenticated",
  },
  profile: { loading: false, user: { deletionPending: false } },
}

const renderApp = (initialEntry, state = authenticatedState) => {
  const store = configureStore({
    preloadedState: state,
    reducer: (currentState = state) => currentState,
  })

  return render(
    <Provider store={store}>
      <MemoryRouter
        initialEntries={[initialEntry]}
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <App />
        <LocationProbe />
      </MemoryRouter>
    </Provider>
  )
}

describe("dashboard route normalization", () => {
  it("redirects the dashboard index to the profile", async () => {
    renderApp("/dashboard")

    expect(await screen.findByText("Profile destination")).toBeVisible()
    expect(screen.getByTestId("location")).toHaveTextContent(
      "/dashboard/my-profile"
    )
  })

  it("redirects the legacy case-sensitive settings bookmark to its canonical path", async () => {
    renderApp("/dashboard/Settings?section=privacy#email")

    expect(await screen.findByText("Settings destination")).toBeVisible()
    expect(screen.getByTestId("location")).toHaveTextContent(
      "/dashboard/settings?section=privacy#email"
    )
  })

  it("keeps deletion and policy gates ahead of the dashboard index", async () => {
    const { unmount } = renderApp("/dashboard", {
      ...authenticatedState,
      profile: { loading: false, user: { deletionPending: true } },
    })

    expect(await screen.findByText("Settings destination")).toBeVisible()
    expect(screen.getByTestId("location")).toHaveTextContent(
      "/dashboard/settings"
    )
    unmount()

    renderApp("/dashboard", {
      ...authenticatedState,
      auth: {
        ...authenticatedState.auth,
        requiresPolicyAcceptance: true,
      },
    })

    expect(await screen.findByText("Policy gate")).toBeVisible()
    expect(screen.getByTestId("location")).toHaveTextContent("/accept-terms")
  })
})
