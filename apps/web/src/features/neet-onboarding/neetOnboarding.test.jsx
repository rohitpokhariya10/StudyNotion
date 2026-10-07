import { fireEvent, render, screen } from "@testing-library/react"
import { expect, it, vi } from "vitest"

import { validateCandidate } from "./lib/candidateValidation"
import { CandidateDetailsForm } from "./ui/CandidateDetailsForm"

it("validates candidate details before continuing", () => {
  const onSubmit = vi.fn()
  render(<CandidateDetailsForm onSubmit={onSubmit} />)
  fireEvent.click(screen.getByRole("button", { name: "Continue" }))
  expect(onSubmit).not.toHaveBeenCalled()
  expect(
    Object.keys(
      validateCandidate({ fullName: "1", email: "bad", phone: "123" })
    )
  ).toHaveLength(3)
  fireEvent.change(screen.getByLabelText("Full name"), {
    target: { value: "Asha Rao" },
  })
  fireEvent.change(screen.getByLabelText("Email"), {
    target: { value: "asha@example.test" },
  })
  fireEvent.change(screen.getByLabelText("Mobile number"), {
    target: { value: "9876543210" },
  })
  fireEvent.click(screen.getByRole("button", { name: "Continue" }))
  expect(onSubmit).toHaveBeenCalledOnce()
})
