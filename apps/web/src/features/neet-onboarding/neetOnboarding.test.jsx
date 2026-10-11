import { fireEvent, render, screen } from "@testing-library/react"
import { expect, it, vi } from "vitest"

import { validateCandidate } from "./lib/candidateValidation"
import { CandidateDetailsForm } from "./ui/CandidateDetailsForm"

it("collects only a display name and validates it before continuing", () => {
  const onSubmit = vi.fn()
  render(<CandidateDetailsForm onSubmit={onSubmit} />)
  // Contact details are never collected for an attempt (decision 3).
  expect(screen.queryByLabelText("Email")).toBeNull()
  expect(screen.queryByLabelText("Mobile number")).toBeNull()
  fireEvent.click(screen.getByRole("button", { name: "Continue" }))
  expect(onSubmit).not.toHaveBeenCalled()
  expect(Object.keys(validateCandidate({ fullName: "1" }))).toEqual([
    "fullName",
  ])
  fireEvent.change(screen.getByLabelText("Full name"), {
    target: { value: "Asha Rao" },
  })
  fireEvent.click(screen.getByRole("button", { name: "Continue" }))
  expect(onSubmit).toHaveBeenCalledExactlyOnceWith({ fullName: "Asha Rao" })
})
