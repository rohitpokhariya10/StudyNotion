import {
  getSafeApiErrorPresentation,
  readApiErrorResponse,
} from "@/shared/api/apiErrorModel"
import { describe, expect, it } from "vitest"

describe("shared API error model", () => {
  it("normalizes both Axios responses and RTK Query error envelopes", () => {
    expect(
      readApiErrorResponse({
        response: {
          status: 423,
          data: { code: "ACCOUNT_DELETION_PENDING", message: " Pending " },
        },
      })
    ).toEqual({
      status: 423,
      code: "ACCOUNT_DELETION_PENDING",
      message: "Pending",
      requestId: null,
    })

    expect(
      readApiErrorResponse({
        status: 500,
        data: {
          error: {
            code: "CATALOG_READ_FAILED",
            message: " Temporarily unavailable ",
            requestId: " request-500 ",
          },
        },
      })
    ).toEqual({
      status: 500,
      code: "CATALOG_READ_FAILED",
      message: "Temporarily unavailable",
      requestId: "request-500",
    })
  })

  it("does not expose an untrusted JavaScript error message", () => {
    expect(
      getSafeApiErrorPresentation(new Error("database credential leaked"), {
        fallbackMessage: "Please try again.",
      })
    ).toEqual({ message: "Please try again.", requestId: null })
  })
})
