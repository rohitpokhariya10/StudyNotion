import { render, screen } from "@testing-library/react"
import { MemoryRouter } from "react-router"
import { expect, it } from "vitest"

import { neetFixture } from "../../../test/neetFixtures"
import { NeetResultView } from "./index"

it("renders the server result with candidate, breakdown, and submission reason", () => {
  const { result } = neetFixture()
  result.summary.score = -1
  result.sections[0].score = -1
  render(
    <MemoryRouter>
      <NeetResultView result={result} />
    </MemoryRouter>
  )
  expect(
    screen.getByRole("heading", { name: "Your result" })
  ).toBeInTheDocument()
  expect(screen.getByText(/Asha Rao/)).toBeInTheDocument()
  expect(screen.getByText("Submitted by you")).toBeInTheDocument()
  expect(screen.getByRole("cell", { name: "-1 / 4" })).toBeInTheDocument()
})
