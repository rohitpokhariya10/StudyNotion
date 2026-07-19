import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("react-hot-toast", () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}))

beforeEach(() => {
  window.localStorage.clear()
  vi.resetModules()
})

describe("cart persistence", () => {
  it("recovers safely from malformed browser storage", async () => {
    window.localStorage.setItem("cart", "not-json")
    const { default: cartReducer } = await import("./cartSlice")

    expect(cartReducer(undefined, { type: "init" })).toMatchObject({
      cart: [],
      total: 0,
      totalItems: 0,
    })
  })

  it("derives totals from course data instead of trusting stored totals", async () => {
    window.localStorage.setItem(
      "cart",
      JSON.stringify([
        { _id: "course-1", price: 499 },
        { _id: "course-2", price: "250" },
      ])
    )
    window.localStorage.setItem("total", "1")
    window.localStorage.setItem("totalItems", "99")
    const { default: cartReducer } = await import("./cartSlice")

    expect(cartReducer(undefined, { type: "init" })).toMatchObject({
      total: 749,
      totalItems: 2,
    })
  })
})
