import { afterEach, describe, expect, it, vi } from "vitest"

import {
  apiConnector,
  axiosInstance,
  NORMAL_REQUEST_TIMEOUT_MS,
  registerSessionResponseHandler,
  SESSION_RESPONSE_SIGNALS,
  UPLOAD_REQUEST_TIMEOUT_MS,
} from "./apiConnector"

const originalAdapter = axiosInstance.defaults.adapter
let unregisterSessionResponseHandler

afterEach(() => {
  unregisterSessionResponseHandler?.()
  unregisterSessionResponseHandler = undefined
  axiosInstance.defaults.adapter = originalAdapter
})

const rejectWithResponse = (status, data) => {
  const error = {
    response: {
      data,
      headers: {},
      status,
      statusText: "Rejected",
    },
  }

  axiosInstance.defaults.adapter = vi.fn().mockRejectedValue(error)
  return error
}

describe("API connector session security", () => {
  it("sends cross-origin requests with the HttpOnly session cookie enabled", () => {
    expect(axiosInstance.defaults.withCredentials).toBe(true)
    expect(axiosInstance.defaults.timeout).toBe(NORMAL_REQUEST_TIMEOUT_MS)
  })

  it("removes legacy bearer credentials without dropping safe headers", async () => {
    let capturedConfig
    axiosInstance.defaults.adapter = async (config) => {
      capturedConfig = config
      return {
        config,
        data: { success: true },
        headers: {},
        status: 200,
        statusText: "OK",
      }
    }

    await apiConnector(
      "POST",
      "/test",
      { courseId: "course-1" },
      { Authorization: "Bearer legacy-token", "X-Request-ID": "request-1" }
    )

    expect(capturedConfig.headers.has("Authorization")).toBe(false)
    expect(capturedConfig.headers.get("X-Request-ID")).toBe("request-1")
    expect(capturedConfig.withCredentials).toBe(true)
    expect(capturedConfig.timeout).toBe(NORMAL_REQUEST_TIMEOUT_MS)
  })

  it("allows multipart uploads to use the backend's longer request window", async () => {
    let capturedConfig
    axiosInstance.defaults.adapter = async (config) => {
      capturedConfig = config
      return {
        config,
        data: { success: true },
        headers: {},
        status: 200,
        statusText: "OK",
      }
    }
    const formData = new FormData()
    formData.append("displayPicture", "image-content")

    await apiConnector("PUT", "/upload", formData)

    expect(capturedConfig.timeout).toBe(UPLOAD_REQUEST_TIMEOUT_MS)
  })

  it.each([
    [
      401,
      { message: "Session expired" },
      SESSION_RESPONSE_SIGNALS.UNAUTHORIZED,
    ],
    [
      423,
      { code: "ACCOUNT_DELETION_PENDING", message: "Deletion is pending" },
      SESSION_RESPONSE_SIGNALS.ACCOUNT_DELETION_PENDING,
    ],
    [
      428,
      {
        code: "POLICY_ACCEPTANCE_REQUIRED",
        message: "Review the current policies",
      },
      SESSION_RESPONSE_SIGNALS.POLICY_ACCEPTANCE_REQUIRED,
    ],
  ])(
    "classifies authenticated session response %s without replacing its rejection",
    async (status, payload, expectedSignal) => {
      const handler = vi.fn()
      unregisterSessionResponseHandler = registerSessionResponseHandler(handler)
      const error = rejectWithResponse(status, payload)

      await expect(apiConnector("GET", "/protected")).rejects.toBe(error)

      expect(handler).toHaveBeenCalledOnce()
      expect(handler).toHaveBeenCalledWith(expectedSignal)
      expect(error.response.data).toBe(payload)
      expect(axiosInstance.defaults.adapter).toHaveBeenCalledOnce()
    }
  )

  it.each([
    [403, { code: "POLICY_ACCEPTANCE_REQUIRED" }],
    [409, { code: "ACCOUNT_DELETION_PENDING" }],
    [423, { code: "POLICY_ACCEPTANCE_REQUIRED" }],
    [428, { code: "ACCOUNT_DELETION_PENDING" }],
  ])("ignores unrelated response %s", async (status, payload) => {
    const handler = vi.fn()
    unregisterSessionResponseHandler = registerSessionResponseHandler(handler)
    const error = rejectWithResponse(status, payload)

    await expect(apiConnector("GET", "/protected")).rejects.toBe(error)

    expect(handler).not.toHaveBeenCalled()
  })
})
