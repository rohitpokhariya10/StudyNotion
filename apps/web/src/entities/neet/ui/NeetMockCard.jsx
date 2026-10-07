import {
  formatNeetDuration,
  NEET_DIFFICULTY_LABELS,
} from "@/entities/neet/lib/format"
import { subjectStyle } from "@/entities/neet/lib/subjects"
import { Link } from "react-router"

const MODE_LABELS = { NON_PROCTORED: "Practice", PROCTORED: "Proctored" }

export function NeetMockCard({ test }) {
  const open = test.availability.state === "OPEN"
  return (
    <article className="pn-card group relative flex flex-col gap-5 overflow-hidden p-6 sm:p-7">
      <div aria-hidden="true" className="absolute inset-x-0 top-0 flex h-1">
        {test.sections.map((section) => (
          <span
            key={section.key}
            className={`flex-1 ${subjectStyle(section.subjectKey).bg}`}
            style={{ flexGrow: section.questionCount }}
          />
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        <span className="pn-chip border-neet-line">
          {NEET_DIFFICULTY_LABELS[test.difficulty]}
        </span>
        {test.modes.map((mode) => (
          <span key={mode} className="pn-chip border-neet-line text-neet-muted">
            {MODE_LABELS[mode]}
          </span>
        ))}
        {test.isSample && (
          <span className="pn-chip border-neet-accent/40 text-neet-accent">
            Sample paper
          </span>
        )}
      </div>
      <div>
        <h3 className="pn-display text-3xl font-bold">{test.title}</h3>
        <p className="mt-2 text-neet-muted">{test.tagline}</p>
      </div>
      <dl className="grid grid-cols-3 gap-3 text-center">
        <div className="rounded-2xl bg-neet-surface-muted/60 px-2 py-3">
          <dt className="text-xs text-neet-muted">Questions</dt>
          <dd className="pn-display text-2xl font-bold">
            {test.questionCount}
          </dd>
        </div>
        <div className="rounded-2xl bg-neet-surface-muted/60 px-2 py-3">
          <dt className="text-xs text-neet-muted">Duration</dt>
          <dd className="pn-display text-2xl font-bold">
            {formatNeetDuration(test.durationSeconds).replace(
              " minutes",
              " min"
            )}
          </dd>
        </div>
        <div className="rounded-2xl bg-neet-surface-muted/60 px-2 py-3">
          <dt className="text-xs text-neet-muted">Marks</dt>
          <dd className="pn-display text-2xl font-bold">{test.totalMarks}</dd>
        </div>
      </dl>
      <p className="leading-7 text-neet-muted">{test.description}</p>
      <ul className="flex flex-wrap gap-2" aria-label="Sections">
        {test.sections.map((section) => (
          <li key={section.key} className="pn-chip border-neet-line">
            <span
              aria-hidden="true"
              className={`h-2 w-2 rounded-full ${subjectStyle(section.subjectKey).bg}`}
            />
            {section.title} · {section.questionCount}
          </li>
        ))}
      </ul>
      {test.patternNote && (
        <p className="text-sm leading-6 text-neet-muted">{test.patternNote}</p>
      )}
      <div className="mt-auto pt-1">
        {open ? (
          <Link
            to={`/project-neet/mocks/${test.id}/start`}
            className="pn-btn pn-btn-primary"
          >
            Choose this mock <span aria-hidden="true">→</span>
          </Link>
        ) : (
          <p className="font-semibold text-neet-warning">
            {test.availability.state === "UPCOMING"
              ? "Opening soon"
              : "This mock has closed"}
          </p>
        )}
      </div>
    </article>
  )
}

export function NeetMockCardSkeleton() {
  return (
    <div className="pn-card space-y-5 p-7" aria-hidden="true">
      <div className="pn-skeleton h-6 w-40" />
      <div className="pn-skeleton h-9 w-3/4" />
      <div className="pn-skeleton h-20 w-full" />
      <div className="pn-skeleton h-11 w-44 rounded-full" />
    </div>
  )
}
