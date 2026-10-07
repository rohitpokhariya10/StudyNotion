import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { useState } from "react"
import { describe, expect, it } from "vitest"

import AccessibleDialog from "./AccessibleDialog"

function Harness() {
  const [drawer, setDrawer] = useState(false)
  const [confirmation, setConfirmation] = useState(false)
  return (
    <>
      <button type="button" onClick={() => setDrawer(true)}>
        Open drawer
      </button>
      {drawer && (
        <AccessibleDialog title="Workspace" onClose={() => setDrawer(false)}>
          <button type="button" onClick={() => setConfirmation(true)}>
            Log out
          </button>
          <button type="button" onClick={() => setDrawer(false)}>
            Close drawer
          </button>
        </AccessibleDialog>
      )}
      {confirmation && (
        <AccessibleDialog
          title="Confirm logout"
          onClose={() => setConfirmation(false)}
        >
          <button type="button" onClick={() => setConfirmation(false)}>
            Cancel
          </button>
          <button type="button">Confirm</button>
        </AccessibleDialog>
      )}
    </>
  )
}

describe("AccessibleDialog isolation", () => {
  it("isolates stacked dialogs and restores the drawer's focus before the page", async () => {
    const user = userEvent.setup()
    render(<Harness />)
    const opener = screen.getByText("Open drawer")
    await user.click(opener)
    expect(opener.inert).toBe(true)
    expect(document.body.style.overflow).toBe("hidden")
    const logout = screen.getByText("Log out")
    await user.click(logout)
    const confirmation = screen.getByRole("dialog", { name: "Confirm logout" })
    expect(within(confirmation).getByText("Cancel")).toHaveFocus()
    await user.tab({ shift: true })
    expect(within(confirmation).getByText("Confirm")).toHaveFocus()
    await user.keyboard("{Escape}")
    expect(screen.queryByRole("dialog", { name: "Confirm logout" })).toBeNull()
    expect(logout).toHaveFocus()
    expect(opener.inert).toBe(true)
    expect(document.body.style.overflow).toBe("hidden")
    await user.keyboard("{Escape}")
    expect(screen.queryByRole("dialog")).toBeNull()
    expect(opener).toHaveFocus()
    expect(opener.inert).not.toBe(true)
    expect(document.body.style.overflow).toBe("")
  })
  it("keeps focus stable when Escape becomes disabled during submission", async () => {
    const user = userEvent.setup()
    const view = render(
      <AccessibleDialog title="Save" closeOnEscape>
        <button type="button">First</button>
        <input aria-label="Note" />
      </AccessibleDialog>
    )
    await user.click(screen.getByLabelText("Note"))
    view.rerender(
      <AccessibleDialog title="Save" closeOnEscape={false}>
        <button type="button">First</button>
        <input aria-label="Note" />
      </AccessibleDialog>
    )
    expect(screen.getByLabelText("Note")).toHaveFocus()
    await user.keyboard("{Escape}")
    expect(screen.getByRole("dialog")).toBeVisible()
  })
})
