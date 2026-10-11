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

it("explains dropped-question awards and a review flag without changing the score", () => {
  const { result } = neetFixture({ mode: "PROCTORED" })
  result.summary.dropped = 1
  result.summary.attempted = 0
  result.summary.correct = 0
  result.attempt.proctoring = {
    ...result.attempt.proctoring,
    reviewStatus: "FLAGGED",
  }
  result.proctoring = {
    warningCount: 4,
    softWarningCount: 0,
    maxWarnings: 3,
    warnings: [],
  }
  render(
    <MemoryRouter>
      <NeetResultView result={result} />
    </MemoryRouter>
  )
  expect(screen.getByText("Dropped (marks awarded)")).toBeInTheDocument()
  expect(screen.getByText(/flagged for review by a person/)).toBeInTheDocument()
  expect(screen.getByText(/does not change your score/)).toBeInTheDocument()
})
