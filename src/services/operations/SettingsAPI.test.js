import { beforeEach, describe, expect, it, vi } from "vitest"

import { apiConnector } from "../apiConnector"
import { deleteProfile } from "./SettingsAPI"

vi.mock("../apiConnector", () => ({
  apiConnector: vi.fn(),
}))

vi.mock("react-hot-toast", () => ({
  toast: {
    dismiss: vi.fn(),
    error: vi.fn(),
    loading: vi.fn(),
    success: vi.fn(),
  },
}))

describe("account deletion requests", () => {
  beforeEach(() => vi.clearAllMocks())

  it("sends the email and current password re-authentication contract", async () => {
    apiConnector.mockResolvedValue({
      data: { success: true, message: "Account deleted successfully" },
    })
    const dispatch = vi.fn().mockResolvedValue(undefined)
    const navigate = vi.fn()
    const confirmation = {
      confirmationEmail: "learner@example.com",
      currentPassword: "current-password",
    }

    await expect(
      deleteProfile(null, navigate, confirmation)(dispatch)
    ).resolves.toBe(true)
    expect(apiConnector).toHaveBeenCalledWith(
      "DELETE",
      expect.stringContaining("/profile/deleteProfile"),
      confirmation
    )
    expect(dispatch).toHaveBeenCalledWith(expect.any(Function))
  })

  it("keeps a failed cleanup authenticated in restricted recovery mode", async () => {
    apiConnector.mockRejectedValue({
      response: {
        data: {
          code: "ACCOUNT_DELETION_PENDING",
          message: "Account deletion is pending and can be retried safely",
        },
        status: 500,
      },
    })
    const dispatch = vi.fn()
    const getState = () => ({
      profile: {
        user: { email: "learner@example.com", deletionPending: false },
      },
    })

    await expect(
      deleteProfile(null, vi.fn(), {
        confirmationEmail: "learner@example.com",
        currentPassword: "current-password",
      })(dispatch, getState)
    ).resolves.toBe(false)

    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        payload: expect.objectContaining({ deletionPending: true }),
        type: "profile/setUser",
      })
    )
  })
})
