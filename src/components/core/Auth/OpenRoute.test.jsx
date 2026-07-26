import { configureStore } from "@reduxjs/toolkit"
import { render, screen } from "@testing-library/react"
import { Provider } from "react-redux"
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom"
import { describe, expect, it } from "vitest"

import OpenRoute from "./OpenRoute"

function Destination() {
  const location = useLocation()
  return (
    <output aria-label="Destination">
      {location.pathname}
      {location.search}
      {location.hash}
      {String(location.state?.from || "")}
    </output>
  )
}

const renderOpenRoute = ({ from, requiresPolicyAcceptance = false }) => {
  const state = {
    auth: {
      isAuthenticated: true,
      requiresPolicyAcceptance,
      status: "authenticated",
    },
  }
  const store = configureStore({
    preloadedState: state,
    reducer: (currentState = state) => currentState,
  })

  render(
    <Provider store={store}>
      <MemoryRouter
        initialEntries={[{ pathname: "/login", state: { from } }]}
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <Routes>
          <Route
            path="/login"
            element={
              <OpenRoute>
                <div>Login form</div>
              </OpenRoute>
            }
          />
          <Route path="*" element={<Destination />} />
        </Routes>
      </MemoryRouter>
    </Provider>
  )
}

describe("OpenRoute authenticated navigation", () => {
  it("preserves the protected destination during the login state transition", async () => {
    renderOpenRoute({
      from: {
        pathname: "/dashboard/enrolled-courses",
        search: "?status=active",
        hash: "#course-1",
      },
    })

    expect(await screen.findByLabelText("Destination")).toHaveTextContent(
      "/dashboard/enrolled-courses?status=active#course-1"
    )
  })

  it("carries only a sanitized destination through the policy gate", async () => {
    renderOpenRoute({
      from: "https://evil.example/steal-session",
      requiresPolicyAcceptance: true,
    })

    expect(await screen.findByLabelText("Destination")).toHaveTextContent(
      "/accept-terms/dashboard/my-profile"
    )
  })
})
