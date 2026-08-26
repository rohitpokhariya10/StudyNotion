import {
  DEFAULT_AUTHENTICATED_PATH,
  sanitizeInternalRedirect,
} from "@/shared/lib/routing/internalRedirect"
import { describe, expect, it } from "vitest"

describe("internal redirect sanitization", () => {
  it.each([
    [
      "/dashboard/enrolled-courses?status=active#lesson-2",
      "/dashboard/enrolled-courses?status=active#lesson-2",
    ],
    [
      {
        pathname:
          "/view-course/course-1/section/section-1/sub-section/lesson-2",
        search: "?autoplay=1",
        hash: "#transcript",
      },
      "/view-course/course-1/section/section-1/sub-section/lesson-2?autoplay=1#transcript",
    ],
    ["/catalog/web%20development", "/catalog/web%20development"],
  ])("preserves a canonical internal destination", (value, expected) => {
    expect(sanitizeInternalRedirect(value)).toBe(expected)
  })

  it.each([
    "//evil.example/steal-session",
    "https://evil.example/steal-session",
    "javascript:alert(1)",
    "dashboard/my-profile",
    "/\\evil.example",
    "/%2f%2fevil.example",
    "/%255c%255cevil.example",
    "/dashboard/../admin",
    "/dashboard/%2e%2e/admin",
    "/dashboard/%not-encoded",
    " /dashboard/my-profile",
    { pathname: "/dashboard/cart", search: "next=checkout" },
    new URL("https://evil.example/dashboard/cart"),
    null,
  ])("rejects unsafe or malformed redirect value %#", (value) => {
    expect(sanitizeInternalRedirect(value)).toBe(DEFAULT_AUTHENTICATED_PATH)
  })

  it("uses only a validated internal fallback", () => {
    expect(sanitizeInternalRedirect(null, "/dashboard/cart")).toBe(
      "/dashboard/cart"
    )
    expect(sanitizeInternalRedirect(null, "https://evil.example")).toBe(
      DEFAULT_AUTHENTICATED_PATH
    )
  })
})
