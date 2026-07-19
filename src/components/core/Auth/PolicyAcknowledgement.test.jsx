import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { useState } from "react"
import { MemoryRouter } from "react-router-dom"
import { describe, expect, it } from "vitest"

import { emptyPolicyAcknowledgement } from "../../../utils/policyAcknowledgement"
import PolicyAcknowledgement from "./PolicyAcknowledgement"

function Harness() {
  const [value, setValue] = useState(emptyPolicyAcknowledgement)
  return (
    <form>
      <PolicyAcknowledgement value={value} onChange={setValue} />
      <output>{JSON.stringify(value)}</output>
    </form>
  )
}

describe("PolicyAcknowledgement", () => {
  it("requires three separate affirmative acknowledgements and links policies", async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <Harness />
      </MemoryRouter>
    )

    const terms = screen.getByRole("checkbox", { name: /agree to the/i })
    const privacy = screen.getByRole("checkbox", { name: /read the/i })
    const eligibility = screen.getByRole("checkbox", { name: /lawfully use/i })
    expect(terms).toBeRequired()
    expect(privacy).toBeRequired()
    expect(eligibility).toBeRequired()
    expect(screen.getByRole("link", { name: "Terms of Use" })).toHaveAttribute(
      "href",
      "/terms"
    )
    expect(screen.getByRole("link", { name: "Privacy Notice" })).toHaveAttribute(
      "href",
      "/privacy-policy"
    )

    await user.click(terms)
    await user.click(privacy)
    await user.click(eligibility)
    expect(screen.getByText(/"confirmEligibility":true/)).toBeInTheDocument()
  })
})
