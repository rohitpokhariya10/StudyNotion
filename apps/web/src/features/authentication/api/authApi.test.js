import {
  acceptCurrentPolicies,
  googleLogin,
  login,
  sendOtp,
} from "@/features/authentication/api/authApi"
import { apiConnector } from "@/shared/api/httpClient"
import { toast } from "react-hot-toast"
import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("@/shared/api/httpClient", () => ({
  apiConnector: vi.fn(),
}))

vi.mock("react-hot-toast", () => ({
  toast: {
    dismiss: vi.fn(),
    error: vi.fn(),
    loading: vi.fn(() => "toast-1"),
    success: vi.fn(),
  },
}))

const sessionResponse = ({
  deletionPending = false,
  requiresPolicyAcceptance = false,
} = {}) => ({
  data: {
    success: true,
    message: "Login successful",
    deletionPending,
    requiresPolicyAcceptance,
    user: {
      _id: "user-1",
      email: "learner@example.com",
    },
  },
})

describe("post-login navigation", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    window.localStorage.clear()
  })

  it("returns a local login to the protected destination captured by PrivateRoute", async () => {
    apiConnector.mockResolvedValue(sessionResponse())
    const dispatch = vi.fn()
    const navigate = vi.fn()
    const destination = "/dashboard/enrolled-courses?status=active#course-1"

    await expect(
      login(
        " Learner@Example.com ",
        "password",
        navigate,
        destination
      )(dispatch)
    ).resolves.toBe(true)

    expect(apiConnector).toHaveBeenCalledWith(
      "POST",
      expect.stringContaining("/auth/login"),
      { email: "learner@example.com", password: "password" }
    )
    expect(navigate).toHaveBeenCalledWith(destination, { replace: true })
  })

  it("carries a sanitized destination through the policy gate", async () => {
    apiConnector.mockResolvedValue(
      sessionResponse({ requiresPolicyAcceptance: true })
    )
    const navigate = vi.fn()
    const destination = "/dashboard/purchases?filter=refundable"

    await login(
      "learner@example.com",
      "password",
      navigate,
      destination
    )(vi.fn())

    expect(navigate).toHaveBeenCalledWith("/accept-terms", {
      replace: true,
      state: { from: destination },
    })
  })

  it("rejects an unsafe destination and keeps deletion recovery authoritative", async () => {
    const navigate = vi.fn()
    apiConnector.mockResolvedValue(sessionResponse())

    await login(
      "learner@example.com",
      "password",
      navigate,
      "https://evil.example/steal-session"
    )(vi.fn())

    expect(navigate).toHaveBeenLastCalledWith("/dashboard/my-profile", {
      replace: true,
    })

    apiConnector.mockResolvedValue(
      sessionResponse({
        deletionPending: true,
        requiresPolicyAcceptance: true,
      })
    )

    await login(
      "learner@example.com",
      "password",
      navigate,
      "/dashboard/enrolled-courses"
    )(vi.fn())

    expect(navigate).toHaveBeenLastCalledWith("/dashboard/settings", {
      replace: true,
    })
  })

  it("keeps deletion recovery authoritative after Google sign-in", async () => {
    const navigate = vi.fn()
    apiConnector.mockResolvedValue(sessionResponse({ deletionPending: true }))

    await googleLogin("google-id-token", navigate)(vi.fn())

    expect(navigate).toHaveBeenLastCalledWith("/dashboard/settings", {
      replace: true,
    })
  })

  it("preserves a protected destination across Google sign-in and policy acceptance", async () => {
    const navigate = vi.fn()
    const destination = "/dashboard/enrolled-courses?status=active#course-1"
    apiConnector.mockResolvedValue(sessionResponse())

    await googleLogin("google-id-token", navigate, {}, destination)(vi.fn())

    expect(navigate).toHaveBeenLastCalledWith(destination, { replace: true })

    apiConnector.mockResolvedValue(
      sessionResponse({ requiresPolicyAcceptance: true })
    )

    await googleLogin("google-id-token", navigate, {}, destination)(vi.fn())

    expect(navigate).toHaveBeenLastCalledWith("/accept-terms", {
      replace: true,
      state: { from: destination },
    })
  })

  it("resumes the saved path after policy acceptance unless deletion is pending", async () => {
    apiConnector.mockResolvedValue({ data: { success: true } })
    const navigate = vi.fn()
    const dispatch = vi.fn()
    const destination = "/view-course/course-1/section/1/sub-section/2"

    await acceptCurrentPolicies(
      {},
      navigate,
      destination
    )(dispatch, () => ({
      profile: { user: { deletionPending: false } },
    }))
    expect(navigate).toHaveBeenLastCalledWith(destination, { replace: true })

    await acceptCurrentPolicies(
      {},
      navigate,
      destination
    )(dispatch, () => ({
      profile: { user: { deletionPending: true } },
    }))
    expect(navigate).toHaveBeenLastCalledWith("/dashboard/settings", {
      replace: true,
    })
  })
})

describe("development OTP delivery", () => {
  beforeEach(() => vi.clearAllMocks())

  it("shows an API-provided development OTP in optimized local builds", async () => {
    apiConnector.mockResolvedValue({
      data: {
        success: true,
        message: "Verification code sent",
        otp: "654321",
      },
    })
    const dispatch = vi.fn()
    const navigate = vi.fn()

    await expect(
      sendOtp(" Learner@Example.com ", navigate)(dispatch)
    ).resolves.toBe(true)

    expect(apiConnector).toHaveBeenCalledWith("POST", expect.any(String), {
      email: "learner@example.com",
      checkUserPresent: true,
    })
    expect(toast.success).toHaveBeenCalledWith("Development OTP: 654321", {
      duration: 10000,
    })
    expect(navigate).toHaveBeenCalledWith("/verify-email")
  })

  it("does not invent or display a development OTP when the API omits it", async () => {
    apiConnector.mockResolvedValue({
      data: {
        success: true,
        message: "Verification code sent",
      },
    })

    await sendOtp("learner@example.com")(vi.fn())

    expect(toast.success).not.toHaveBeenCalledWith(
      expect.stringContaining("Development OTP:"),
      expect.anything()
    )
  })
})
