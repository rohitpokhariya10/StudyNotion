import { afterEach, describe, expect, it } from "vitest"

import {
  apiConnector,
  axiosInstance,
  NORMAL_REQUEST_TIMEOUT_MS,
  UPLOAD_REQUEST_TIMEOUT_MS,
} from "./apiConnector"

const originalAdapter = axiosInstance.defaults.adapter

afterEach(() => {
  axiosInstance.defaults.adapter = originalAdapter
})

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
})
