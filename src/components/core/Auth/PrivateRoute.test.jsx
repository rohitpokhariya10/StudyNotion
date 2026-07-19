import { configureStore } from "@reduxjs/toolkit"
import { render, screen } from "@testing-library/react"
import { Provider } from "react-redux"
import { MemoryRouter, Route, Routes } from "react-router-dom"
import { describe, expect, it } from "vitest"

import PrivateRoute from "./PrivateRoute"

const renderRoutes = (preloadedState, initialPath) => {
  const store = configureStore({
    preloadedState,
    reducer: (state = preloadedState) => state,
  })

  return render(
    <Provider store={store}>
      <MemoryRouter initialEntries={[initialPath]}>
        <Routes>
          <Route
            path="/dashboard/my-profile"
            element={
              <PrivateRoute>
                <div>Normal profile</div>
              </PrivateRoute>
            }
          />
          <Route
            path="/dashboard/settings"
            element={
              <PrivateRoute>
                <div>Deletion recovery</div>
              </PrivateRoute>
            }
          />
        </Routes>
      </MemoryRouter>
    </Provider>
  )
}

describe("private account recovery routing", () => {
  it("redirects a deletion-pending session away from normal account pages", async () => {
    renderRoutes(
      {
        auth: {
          isAuthenticated: true,
          requiresPolicyAcceptance: false,
          status: "authenticated",
        },
        profile: {
          user: { deletionPending: true },
        },
      },
      "/dashboard/my-profile"
    )

    expect(await screen.findByText("Deletion recovery")).toBeVisible()
    expect(screen.queryByText("Normal profile")).not.toBeInTheDocument()
  })
})
