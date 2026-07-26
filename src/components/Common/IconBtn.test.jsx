import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import IconBtn from "./IconBtn"

describe("IconBtn", () => {
  it("defaults to a non-submitting button", async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()
    const onSubmit = vi.fn((event) => event.preventDefault())

    render(
      <form onSubmit={onSubmit}>
        <IconBtn text="Open actions" onclick={onClick} />
      </form>
    )

    const button = screen.getByRole("button", { name: "Open actions" })
    expect(button).toHaveAttribute("type", "button")

    await user.click(button)

    expect(onClick).toHaveBeenCalledOnce()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it("allows callers to opt into submit behavior", async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn((event) => event.preventDefault())

    render(
      <form onSubmit={onSubmit}>
        <IconBtn type="submit" text="Save" />
      </form>
    )

    const button = screen.getByRole("button", { name: "Save" })
    expect(button).toHaveAttribute("type", "submit")

    await user.click(button)

    expect(onSubmit).toHaveBeenCalledOnce()
  })
})
