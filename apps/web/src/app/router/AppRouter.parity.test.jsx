import AppRouter from "@/app/router/AppRouter"
import rootReducer from "@/app/store/rootReducer"
import { ACCOUNT_TYPE } from "@/entities/user"
import { createSessionResponseHandler } from "@/features/authentication"
import { configureStore } from "@reduxjs/toolkit"
import { act, render, screen, waitFor } from "@testing-library/react"
import { Suspense } from "react"
import { Provider } from "react-redux"
import { MemoryRouter, Outlet, useLocation } from "react-router"
import { describe, expect, it, vi } from "vitest"

vi.mock("@/pages/home", () => ({
  default: () => <h1>Home route</h1>,
}))
vi.mock("@/pages/about", () => ({
  default: () => <h1>About route</h1>,
}))
vi.mock("@/pages/contact", () => ({
  default: () => <h1>Contact route</h1>,
}))
vi.mock("@/pages/login", () => ({
  default: () => <h1>Login route</h1>,
}))
vi.mock("@/pages/signup", () => ({
  default: () => <h1>Signup route</h1>,
}))
vi.mock("@/pages/verify-email", () => ({
  default: () => <h1>Verify email route</h1>,
}))
vi.mock("@/pages/forgot-password", () => ({
  default: () => <h1>Forgot password route</h1>,
}))
vi.mock("@/pages/update-password", () => ({
  default: () => <h1>Update password route</h1>,
}))
vi.mock("@/pages/catalog", () => ({
  default: () => <h1>Catalog route</h1>,
}))
vi.mock("@/pages/course-details", () => ({
  default: () => <h1>Course detail route</h1>,
}))
vi.mock("@/pages/not-found", () => ({
  default: () => <h1>Not found route</h1>,
}))
vi.mock("@/pages/legal", () => ({
  default: ({ document }) => <h1>Legal {document} route</h1>,
}))
vi.mock("@/pages/dashboard", () => ({
  default: () => <Outlet />,
}))
vi.mock("@/pages/profile", () => ({
  default: () => <h1>Profile route</h1>,
}))
vi.mock("@/pages/instructor-dashboard", () => ({
  default: () => <h1>Instructor route</h1>,
}))
vi.mock("@/pages/enrolled-courses", () => ({
  default: () => <h1>Student enrolled route</h1>,
}))
vi.mock("@/features/instructor-approval/ui/InstructorApprovals", () => ({
  default: () => <h1>Admin approvals route</h1>,
}))
vi.mock("@/pages/policy-acceptance", () => ({
  default: () => <h1>Policy route</h1>,
}))
vi.mock("@/pages/learning", () => ({
  default: () => <Outlet />,
}))
vi.mock("@/features/lesson-playback/ui/VideoDetails", () => ({
  default: () => <h1>Protected playback route</h1>,
}))

const anonymousState = {
  auth: {
    isAuthenticated: false,
    loading: false,
    requiresPolicyAcceptance: false,
    status: "anonymous",
  },
  profile: { loading: false, user: null },
}

const authenticatedState = (accountType, authOverrides = {}) => ({
  auth: {
    isAuthenticated: true,
    loading: false,
    requiresPolicyAcceptance: false,
    status: "authenticated",
    ...authOverrides,
  },
  profile: {
    loading: false,
    user: { accountType, deletionPending: false },
  },
})

function LocationProbe() {
  const location = useLocation()
  const intendedDestination = location.state?.from

  return (
    <>
      <output aria-label="Current location">
        {location.pathname}
        {location.search}
        {location.hash}
      </output>
      <output aria-label="Intended destination">
        {intendedDestination
          ? `${intendedDestination.pathname || ""}${
              intendedDestination.search || ""
            }${intendedDestination.hash || ""}`
          : ""}
      </output>
    </>
  )
}

const renderRouterWithStore = (initialEntry, store) =>
  render(
    <Provider store={store}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <Suspense fallback={<div role="status">Loading route</div>}>
          <AppRouter />
          <LocationProbe />
        </Suspense>
      </MemoryRouter>
    </Provider>
  )

const renderRouter = (initialEntry, preloadedState = anonymousState) => {
  const store = configureStore({
    preloadedState,
    reducer: (state = preloadedState) => state,
  })

  return renderRouterWithStore(initialEntry, store)
}

describe("Router 8 public route parity", () => {
  it.each([
    ["/", "Home route", "/"],
    ["/about", "About route", "/about"],
    ["/contact", "Contact route", "/contact"],
    ["/login", "Login route", "/login"],
    ["/signup", "Signup route", "/signup"],
    ["/verify-email", "Verify email route", "/verify-email"],
    ["/forgot-password", "Forgot password route", "/forgot-password"],
    [
      "/update-password#token=reset-token",
      "Update password route",
      "/update-password#token=reset-token",
    ],
    [
      "/catalog/web-development?q=react#results",
      "Catalog route",
      "/catalog/web-development?q=react#results",
    ],
    [
      "/courses/507f1f77bcf86cd799439011",
      "Course detail route",
      "/courses/507f1f77bcf86cd799439011",
    ],
    ["/privacy-policy", "Legal privacy route", "/privacy-policy"],
    ["/cookie-policy", "Legal cookies route", "/cookie-policy"],
    ["/terms", "Legal terms route", "/terms"],
    ["/refund-policy", "Legal refunds route", "/refund-policy"],
    [
      "/route-that-does-not-exist",
      "Not found route",
      "/route-that-does-not-exist",
    ],
  ])("maps %s without changing its URL", async (path, heading, expectedUrl) => {
    renderRouter(path)

    expect(await screen.findByRole("heading", { name: heading })).toBeVisible()
    expect(screen.getByLabelText("Current location")).toHaveTextContent(
      expectedUrl
    )
  })
})

describe("Router 8 authentication redirect parity", () => {
  it("preserves pathname, search, and hash when an expired session reaches a protected route", async () => {
    renderRouter("/dashboard/enrolled-courses?status=active#course-1")

    expect(
      await screen.findByRole("heading", { name: "Login route" })
    ).toBeVisible()
    expect(screen.getByLabelText("Current location")).toHaveTextContent(
      "/login"
    )
    expect(screen.getByLabelText("Intended destination")).toHaveTextContent(
      "/dashboard/enrolled-courses?status=active#course-1"
    )
  })

  it("redirects an authenticated user away from an open-only route", async () => {
    renderRouter("/login", authenticatedState(ACCOUNT_TYPE.STUDENT))

    expect(
      await screen.findByRole("heading", { name: "Profile route" })
    ).toBeVisible()
    expect(screen.getByLabelText("Current location")).toHaveTextContent(
      "/dashboard/my-profile"
    )
  })

  it("holds the current route while session bootstrap is still checking", () => {
    renderRouter("/dashboard/my-profile", {
      ...anonymousState,
      auth: { ...anonymousState.auth, status: "checking" },
    })

    expect(screen.getByLabelText("Checking your session")).toBeVisible()
    expect(screen.getByLabelText("Current location")).toHaveTextContent(
      "/dashboard/my-profile"
    )
    expect(
      screen.queryByRole("heading", { name: "Login route" })
    ).not.toBeInTheDocument()
  })

  it("preserves the intended destination through the policy gate without looping", async () => {
    renderRouter(
      "/dashboard/enrolled-courses?status=active#course-1",
      authenticatedState(ACCOUNT_TYPE.STUDENT, {
        requiresPolicyAcceptance: true,
      })
    )

    expect(
      await screen.findByRole("heading", { name: "Policy route" })
    ).toBeVisible()
    expect(screen.getByLabelText("Current location")).toHaveTextContent(
      "/accept-terms"
    )
    expect(screen.getByLabelText("Intended destination")).toHaveTextContent(
      "/dashboard/enrolled-courses?status=active#course-1"
    )
  })

  it("allows a policy-pending session to stay on the acceptance route", async () => {
    renderRouter(
      "/accept-terms",
      authenticatedState(ACCOUNT_TYPE.STUDENT, {
        requiresPolicyAcceptance: true,
      })
    )

    expect(
      await screen.findByRole("heading", { name: "Policy route" })
    ).toBeVisible()
    expect(screen.getByLabelText("Current location")).toHaveTextContent(
      "/accept-terms"
    )
  })

  it("redirects a live protected URL after an authenticated session expires without looping", async () => {
    const store = configureStore({
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
        profile: {
          loading: false,
          user: {
            accountType: ACCOUNT_TYPE.STUDENT,
            deletionPending: false,
          },
        },
      },
    })
    const handleSessionResponse = createSessionResponseHandler(store)

    renderRouterWithStore(
      "/dashboard/enrolled-courses?status=active#course-1",
      store
    )
    expect(
      await screen.findByRole("heading", { name: "Student enrolled route" })
    ).toBeVisible()

    act(() => {
      handleSessionResponse("SESSION_UNAUTHORIZED")
    })

    expect(
      await screen.findByRole("heading", { name: "Login route" })
    ).toBeVisible()
    expect(screen.getByLabelText("Current location")).toHaveTextContent(
      "/login"
    )
    expect(screen.getByLabelText("Intended destination")).toHaveTextContent(
      "/dashboard/enrolled-courses?status=active#course-1"
    )
    await waitFor(() => {
      expect(screen.getByLabelText("Current location")).toHaveTextContent(
        "/login"
      )
    })
  })
})

describe("Router 8 role and playback parity", () => {
  it.each([
    [
      ACCOUNT_TYPE.STUDENT,
      "/dashboard/enrolled-courses",
      "Student enrolled route",
      "/dashboard/enrolled-courses",
    ],
    [
      ACCOUNT_TYPE.STUDENT,
      "/dashboard/instructor",
      "Profile route",
      "/dashboard/my-profile",
    ],
    [
      ACCOUNT_TYPE.STUDENT,
      "/dashboard/instructor-approvals",
      "Profile route",
      "/dashboard/my-profile",
    ],
    [
      ACCOUNT_TYPE.INSTRUCTOR,
      "/dashboard/instructor",
      "Instructor route",
      "/dashboard/instructor",
    ],
    [
      ACCOUNT_TYPE.INSTRUCTOR,
      "/dashboard/enrolled-courses",
      "Profile route",
      "/dashboard/my-profile",
    ],
    [
      ACCOUNT_TYPE.INSTRUCTOR,
      "/dashboard/instructor-approvals",
      "Profile route",
      "/dashboard/my-profile",
    ],
    [
      ACCOUNT_TYPE.ADMIN,
      "/dashboard/instructor-approvals",
      "Admin approvals route",
      "/dashboard/instructor-approvals",
    ],
    [
      ACCOUNT_TYPE.ADMIN,
      "/dashboard/enrolled-courses",
      "Profile route",
      "/dashboard/my-profile",
    ],
    [
      ACCOUNT_TYPE.ADMIN,
      "/dashboard/instructor",
      "Profile route",
      "/dashboard/my-profile",
    ],
    [
      ACCOUNT_TYPE.INSTRUCTOR,
      "/view-course/course-1/section/section-1/sub-section/lesson-1",
      "Profile route",
      "/dashboard/my-profile",
    ],
    [
      ACCOUNT_TYPE.STUDENT,
      "/view-course/course-1/section/section-1/sub-section/lesson-1",
      "Protected playback route",
      "/view-course/course-1/section/section-1/sub-section/lesson-1",
    ],
  ])(
    "routes %s at %s to the authorized destination",
    async (accountType, path, heading, expectedUrl) => {
      renderRouter(path, authenticatedState(accountType))

      expect(
        await screen.findByRole("heading", { name: heading })
      ).toBeVisible()
      expect(screen.getByLabelText("Current location")).toHaveTextContent(
        expectedUrl
      )
    }
  )
})
