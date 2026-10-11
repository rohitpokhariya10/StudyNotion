import { fireEvent, render, screen } from "@testing-library/react"
import { expect, it, vi } from "vitest"

import { neetFixture } from "../../../../test/neetFixtures"
import { ProctorConsentPanel } from "./ProctorConsentPanel"

it("states that monitoring never submits the exam and requires an 18+ declaration", () => {
  const onAccept = vi.fn()
  const { policy } = neetFixture({ mode: "PROCTORED" })
  render(
    <ProctorConsentPanel policy={policy} onAccept={onAccept} onBack={vi.fn()} />
  )
  expect(
    screen.getByText(/never submits, ends or cancels your exam/)
  ).toBeInTheDocument()
  expect(
    screen.getByText(/flag this attempt for review by a person/)
  ).toBeInTheDocument()
  expect(
    screen.getByText(/opening this attempt in a second live window/)
  ).toBeInTheDocument()
  expect(
    screen.getByText(/Refreshing this same tab is not counted/)
  ).toBeInTheDocument()
  expect(
    screen.getByText(/only to candidates aged 18 or over/)
  ).toBeInTheDocument()
  expect(screen.queryByText(/submits your attempt automatically/)).toBeNull()

  const consent = screen.getByRole("button", { name: /I consent/ })
  fireEvent.click(
    screen.getByLabelText(/I understand what is monitored and stored/)
  )
  expect(consent).toBeDisabled()
  fireEvent.click(
    screen.getByLabelText("I confirm I am 18 years of age or older.")
  )
  expect(consent).toBeEnabled()
  fireEvent.click(consent)
  expect(onAccept).toHaveBeenCalledExactlyOnceWith({ adultConfirmed: true })
})
