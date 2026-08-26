import ConfirmationModal from "@/shared/ui/ConfirmationModal"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { useState } from "react"
import { describe, expect, it, vi } from "vitest"

function Harness({ onConfirm = vi.fn() }) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <button type="button" onClick={() => setIsOpen(true)}>
        Open confirmation
      </button>
      {isOpen && (
        <ConfirmationModal
          modalData={{
            text1: "Delete lesson?",
            text2: "This action cannot be undone.",
            btn1Text: "Delete",
            btn2Text: "Cancel",
            btn1Handler: () => {
              onConfirm()
              setIsOpen(false)
            },
            btn2Handler: () => setIsOpen(false),
          }}
        />
      )}
    </>
  )
}

describe("ConfirmationModal", () => {
  it("announces itself as a dialog and contains keyboard focus", async () => {
    const user = userEvent.setup()
    render(<Harness />)

    await user.click(screen.getByRole("button", { name: "Open confirmation" }))

    const dialog = screen.getByRole("dialog", { name: "Delete lesson?" })
    const confirmButton = screen.getByRole("button", { name: "Delete" })
    const cancelButton = screen.getByRole("button", { name: "Cancel" })

    expect(dialog).toHaveAttribute("aria-modal", "true")
    expect(dialog).toHaveAccessibleDescription("This action cannot be undone.")
    expect(cancelButton).toHaveFocus()

    await user.tab()
    expect(confirmButton).toHaveFocus()

    await user.tab({ shift: true })
    expect(cancelButton).toHaveFocus()
  })

  it("closes on Escape and restores focus to the opener", async () => {
    const user = userEvent.setup()
    render(<Harness />)

    const opener = screen.getByRole("button", { name: "Open confirmation" })
    await user.click(opener)
    await user.keyboard("{Escape}")

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    expect(opener).toHaveFocus()
  })
})
