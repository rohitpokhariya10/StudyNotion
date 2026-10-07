import { deriveQuestionState } from "@/entities/neet"
import { render, screen } from "@testing-library/react"
import { expect, it } from "vitest"

import { neetFixture } from "../../../../test/neetFixtures"
import { QuestionPalette } from "./ExamShell"

it("distinguishes all five OMR states accessibly", () => {
  expect(deriveQuestionState(null)).toBe("NOT_VISITED")
  expect(deriveQuestionState({ visited: true })).toBe("NOT_ANSWERED")
  expect(deriveQuestionState({ selectedOption: "A" })).toBe("ANSWERED")
  expect(deriveQuestionState({ markedForReview: true })).toBe(
    "MARKED_FOR_REVIEW"
  )
  expect(
    deriveQuestionState({ selectedOption: "B", markedForReview: true })
  ).toBe("ANSWERED_AND_MARKED")
  const { session } = neetFixture()
  render(
    <QuestionPalette
      questions={session.paper.questions}
      responses={{}}
      index={0}
      onSelect={() => {}}
    />
  )
  expect(
    screen.getByRole("button", { name: "Question 1: Not visited" })
  ).toHaveAttribute("aria-current", "true")
})
