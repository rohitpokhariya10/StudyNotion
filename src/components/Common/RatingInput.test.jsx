import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import RatingInput from "./RatingInput"

describe("RatingInput", () => {
  it("exposes an accessible radio group and reports the selected rating", () => {
    const onChange = vi.fn()

    render(<RatingInput value={3} onChange={onChange} />)

    expect(screen.getByRole("radio", { name: "3 out of 5 stars" })).toBeChecked()

    fireEvent.click(screen.getByRole("radio", { name: "4 out of 5 stars" }))

    expect(onChange).toHaveBeenCalledWith(4)
  })

  it("prevents changes while disabled", () => {
    const onChange = vi.fn()

    render(<RatingInput value={2} onChange={onChange} disabled />)
    fireEvent.click(screen.getByRole("radio", { name: "5 out of 5 stars" }))

    expect(onChange).not.toHaveBeenCalled()
  })
})
