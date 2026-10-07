import {
  deriveQuestionState,
  QUESTION_STATE,
  QUESTION_STATE_LABELS,
  subjectStyle,
  summarizeResponses,
} from "@/entities/neet"
import { memo, useState } from "react"
import { FiCheck, FiFlag } from "react-icons/fi"

const FILTERS = [
  { value: "all", label: "All" },
  { value: "open", label: "Unanswered" },
  { value: "marked", label: "Marked" },
]

const matchesFilter = (state, filter) => {
  if (filter === "open") {
    return [
      QUESTION_STATE.NOT_VISITED,
      QUESTION_STATE.NOT_ANSWERED,
      QUESTION_STATE.MARKED_FOR_REVIEW,
    ].includes(state)
  }
  if (filter === "marked") {
    return [
      QUESTION_STATE.MARKED_FOR_REVIEW,
      QUESTION_STATE.ANSWERED_AND_MARKED,
    ].includes(state)
  }
  return true
}

function BubbleBadge({ state }) {
  if (state === QUESTION_STATE.ANSWERED) {
    return (
      <span className="pn-omr-badge" aria-hidden="true">
        <FiCheck size={10} strokeWidth={4} />
      </span>
    )
  }
  if (
    state === QUESTION_STATE.MARKED_FOR_REVIEW ||
    state === QUESTION_STATE.ANSWERED_AND_MARKED
  ) {
    return (
      <span className="pn-omr-badge" aria-hidden="true">
        <FiFlag size={9} strokeWidth={3} />
      </span>
    )
  }
  return null
}

// Each bubble re-renders only when its own state or current-ness changes,
// keeping a 180-question palette cheap for a three-hour session.
const OmrBubble = memo(function OmrBubble({
  current,
  index,
  number,
  onSelect,
  state,
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(index)}
      aria-label={`Question ${number}: ${QUESTION_STATE_LABELS[state]}`}
      aria-current={current ? "true" : undefined}
      data-state={state}
      data-current={current ? "true" : undefined}
      className="pn-omr-bubble"
    >
      {number}
      <BubbleBadge state={state} />
    </button>
  )
})

function LegendSwatch({ state }) {
  return (
    <span
      aria-hidden="true"
      data-state={state}
      className="pn-omr-bubble pointer-events-none h-6 w-6 text-[0.6rem]"
    >
      <BubbleBadge state={state} />
    </span>
  )
}

export function QuestionPalette({
  index,
  onSelect,
  questions,
  responses,
  sections,
}) {
  const [filter, setFilter] = useState("all")
  const summary = summarizeResponses(
    questions.map((question) => question.id),
    responses
  )
  const groups = sections?.length
    ? sections.map((section) => ({
        key: section.key,
        title: section.subjectLabel || section.title,
        subjectKey: section.subjectKey,
        entries: questions
          .map((question, questionIndex) => ({ question, questionIndex }))
          .filter(({ question }) => question.sectionKey === section.key),
      }))
    : [
        {
          key: "all",
          title: null,
          subjectKey: null,
          entries: questions.map((question, questionIndex) => ({
            question,
            questionIndex,
          })),
        },
      ]

  return (
    <nav aria-label="Digital OMR" className="space-y-5">
      <div className="space-y-3">
        <div>
          <h2 className="text-lg font-bold">Digital OMR</h2>
          <p className="text-sm text-neet-muted">
            {summary.answered} of {summary.total} answered
          </p>
        </div>
        <div
          role="group"
          aria-label="Filter questions"
          className="grid grid-cols-3 rounded-full border border-neet-line p-0.5 text-xs font-semibold"
        >
          {FILTERS.map((option) => (
            <button
              key={option.value}
              type="button"
              aria-pressed={filter === option.value}
              onClick={() => setFilter(option.value)}
              className={`rounded-full px-2.5 py-1 ${
                filter === option.value
                  ? "bg-neet-ink text-neet-surface"
                  : "text-neet-muted"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {groups.map((group) => {
        const visible = group.entries.filter(({ question }) =>
          matchesFilter(deriveQuestionState(responses[question.id]), filter)
        )
        const answered = group.entries.filter(({ question }) =>
          Boolean(responses[question.id]?.selectedOption)
        ).length
        return (
          <section key={group.key} aria-label={group.title || "Questions"}>
            {group.title && (
              <h3 className="mb-2 flex items-center justify-between text-sm font-bold">
                <span className="flex items-center gap-2">
                  <span
                    aria-hidden="true"
                    className={`h-2.5 w-2.5 rounded-full ${subjectStyle(group.subjectKey).bg}`}
                  />
                  {group.title}
                </span>
                <span className="pn-tabular font-semibold text-neet-muted">
                  {answered}/{group.entries.length}
                </span>
              </h3>
            )}
            {visible.length ? (
              <div className="grid grid-cols-[repeat(auto-fill,minmax(2.5rem,1fr))] gap-2.5">
                {visible.map(({ question, questionIndex }) => (
                  <OmrBubble
                    key={question.id}
                    current={questionIndex === index}
                    index={questionIndex}
                    number={question.number}
                    onSelect={onSelect}
                    state={deriveQuestionState(responses[question.id])}
                  />
                ))}
              </div>
            ) : (
              <p className="text-sm text-neet-muted">
                No questions match this filter.
              </p>
            )}
          </section>
        )
      })}

      <ul
        className="grid gap-2 border-t border-neet-line pt-4 text-xs"
        aria-label="OMR legend"
      >
        {Object.values(QUESTION_STATE).map((state) => (
          <li key={state} className="flex items-center gap-2.5">
            <LegendSwatch state={state} />
            <span className="flex-1">{QUESTION_STATE_LABELS[state]}</span>
            <span className="pn-tabular font-bold">
              {summary.counts[state]}
            </span>
          </li>
        ))}
      </ul>
    </nav>
  )
}
