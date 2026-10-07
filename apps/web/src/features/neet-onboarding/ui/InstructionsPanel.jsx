import {
  formatNeetDuration,
  formatSignedMarks,
  subjectStyle,
} from "@/entities/neet"
import { useId } from "react"

export function InstructionsPanel({ accepted, mode, onAcceptedChange, test }) {
  const checkboxId = useId()
  return (
    <div className="space-y-8">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="pn-card p-4">
          <p className="text-sm text-neet-muted">Duration</p>
          <p className="pn-display mt-1 text-2xl font-bold">
            {formatNeetDuration(test.durationSeconds)}
          </p>
        </div>
        <div className="pn-card p-4">
          <p className="text-sm text-neet-muted">Questions</p>
          <p className="pn-display mt-1 text-2xl font-bold">
            {test.questionCount}
          </p>
        </div>
        <div className="pn-card p-4">
          <p className="text-sm text-neet-muted">Marking</p>
          <p className="pn-display mt-1 text-2xl font-bold">
            {formatSignedMarks(test.marking.correct)} /{" "}
            {formatSignedMarks(test.marking.incorrect)}
          </p>
        </div>
      </div>

      <section aria-labelledby={`${checkboxId}-sections`}>
        <h3 id={`${checkboxId}-sections`} className="text-lg font-bold">
          Sections
        </h3>
        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
          {test.sections.map((section) => (
            <li
              key={section.key}
              className="flex items-center justify-between rounded-xl border border-neet-line px-4 py-3"
            >
              <span className="flex items-center gap-2 font-semibold">
                <span
                  aria-hidden="true"
                  className={`h-2.5 w-2.5 rounded-full ${subjectStyle(section.subjectKey).bg}`}
                />
                {section.subjectLabel}
              </span>
              <span className="text-sm text-neet-muted">
                {section.questionCount} questions · {section.maxMarks} marks
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby={`${checkboxId}-rules`}>
        <h3 id={`${checkboxId}-rules`} className="text-lg font-bold">
          Before you begin
        </h3>
        <ol className="mt-3 space-y-3">
          {test.instructions.map((instruction, index) => (
            <li
              key={instruction}
              className="flex gap-3 leading-7 text-neet-muted"
            >
              <span className="pn-tabular mt-0.5 grid h-7 w-7 flex-none place-items-center rounded-full bg-neet-surface-muted text-sm font-bold text-neet-ink">
                {index + 1}
              </span>
              <span>{instruction}</span>
            </li>
          ))}
          {mode === "PROCTORED" && (
            <li className="flex gap-3 leading-7 text-neet-muted">
              <span
                aria-hidden="true"
                className="mt-0.5 grid h-7 w-7 flex-none place-items-center rounded-full bg-neet-accent-soft text-sm font-bold text-neet-accent"
              >
                ◎
              </span>
              <span>
                You chose proctored mode. Next you will review exactly what is
                monitored and give your consent before any camera or microphone
                is accessed.
              </span>
            </li>
          )}
        </ol>
      </section>

      <div className="flex items-start gap-3 rounded-2xl border border-neet-line bg-neet-surface-muted/50 p-4">
        <input
          id={checkboxId}
          type="checkbox"
          checked={accepted}
          onChange={(event) => onAcceptedChange(event.target.checked)}
          className="mt-1 h-5 w-5 flex-none accent-[rgb(var(--pn-accent))]"
        />
        <label htmlFor={checkboxId} className="leading-6 font-semibold">
          I have read these instructions and I'm ready to continue.
        </label>
      </div>
    </div>
  )
}
