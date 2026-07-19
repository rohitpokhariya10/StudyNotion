import { beforeEach, describe, expect, it } from "vitest"

import {
  clearCheckoutIdempotency,
  getCheckoutIdempotency,
} from "./checkoutIdempotency"

describe("checkout idempotency", () => {
  beforeEach(() => window.sessionStorage.clear())

  it("reuses one key for retries of the same user and course set", () => {
    const first = getCheckoutIdempotency({
      userId: "user-1",
      courses: ["course-b", "course-a"],
    })
    const retry = getCheckoutIdempotency({
      userId: "user-1",
      courses: ["course-a", "course-b"],
    })

    expect(retry.idempotencyKey).toBe(first.idempotencyKey)
    expect(retry.storageKey).toBe(first.storageKey)
    expect(first.idempotencyKey.length).toBeGreaterThanOrEqual(8)
  })

  it("clears the completed checkout key", () => {
    const checkout = getCheckoutIdempotency({
      userId: "user-1",
      courses: ["course-a"],
    })
    clearCheckoutIdempotency(checkout.storageKey)

    expect(window.sessionStorage.getItem(checkout.storageKey)).toBeNull()
  })
})
