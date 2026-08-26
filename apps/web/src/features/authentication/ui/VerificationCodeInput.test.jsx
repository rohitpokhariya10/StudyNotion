import VerificationCodeInput from "@/features/authentication/ui/VerificationCodeInput"
import { fireEvent, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { useState } from "react"
import { describe, expect, it } from "vitest"

function ControlledVerificationCodeInput() {
  const [value, setValue] = useState("")
  return (
    <>
      <VerificationCodeInput autoFocus onChange={setValue} value={value} />
      <output aria-label="Current code">{value}</output>
    </>
  )
}

describe("VerificationCodeInput", () => {
  it("accepts six digits and advances focus", async () => {
    const user = userEvent.setup()
    render(<ControlledVerificationCodeInput />)

    const firstDigit = screen.getByLabelText("Verification code digit 1")
    expect(firstDigit).toHaveFocus()

    await user.type(firstDigit, "123456")

    expect(screen.getByLabelText("Current code")).toHaveTextContent("123456")
    expect(screen.getByLabelText("Verification code digit 6")).toHaveFocus()
  })

  it("filters a pasted code to digits and caps it at six characters", () => {
    render(<ControlledVerificationCodeInput />)

    fireEvent.paste(screen.getByLabelText("Verification code digit 1"), {
      clipboardData: { getData: () => "12a 34567" },
    })

    expect(screen.getByLabelText("Current code")).toHaveTextContent("123456")
  })

  it("moves backward and removes the previous digit on backspace", async () => {
    const user = userEvent.setup()
    render(<ControlledVerificationCodeInput />)

    const firstDigit = screen.getByLabelText("Verification code digit 1")
    await user.type(firstDigit, "12")
    await user.keyboard("{Backspace}")

    expect(screen.getByLabelText("Current code")).toHaveTextContent("1")
    expect(screen.getByLabelText("Verification code digit 2")).toHaveFocus()

    await user.keyboard("{Backspace}")
    expect(screen.getByLabelText("Current code")).toBeEmptyDOMElement()
    expect(firstDigit).toHaveFocus()
  })
})
