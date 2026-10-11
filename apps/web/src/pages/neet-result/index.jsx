import {
  formatNeetDuration,
  formatNeetMarks,
  NEET_MODE_LABELS,
  NEET_SUBMISSION_REASON_LABELS,
  neetClient,
  NeetResourceStatus,
  subjectStyle,
  useNeetResource,
} from "@/entities/neet"
import { ProjectNeetShell } from "@/widgets/neet-shell"
import { Link, useParams } from "react-router"

const encouragement = (accuracy, attempted) => {
  if (!attempted)
    return "Every sitting teaches you something about time and focus. Rest, then come back for the next one."
  if (accuracy >= 75)
    return "Strong accuracy. Keep this rhythm going into your next mock."
  if (accuracy >= 50)
    return "Solid groundwork. Steady, regular practice turns this into strength."
  return "Every mock shows you something useful. Rest, review what you know, and return stronger."
}

function ScoreRing({ maxScore, score }) {
  const progress = maxScore > 0 ? Math.max(0, Math.min(1, score / maxScore)) : 0
  const radius = 84
  const circumference = 2 * Math.PI * radius
  return (
    <div className="relative mx-auto grid h-56 w-56 place-items-center">
      <svg
        viewBox="0 0 200 200"
        className="absolute inset-0 h-full w-full -rotate-90"
        aria-hidden="true"
      >
        <circle
          cx="100"
          cy="100"
          r={radius}
          fill="none"
          stroke="rgb(var(--pn-surface-muted))"
          strokeWidth="14"
        />
        <circle
          cx="100"
          cy="100"
          r={radius}
          fill="none"
          stroke="url(#pn-score-gradient)"
          strokeWidth="14"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - progress)}
          className="transition-[stroke-dashoffset] duration-[1600ms] ease-out"
        />
        <defs>
          <linearGradient id="pn-score-gradient" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0" stopColor="rgb(var(--pn-accent))" />
            <stop offset="1" stopColor="rgb(var(--pn-cell))" />
          </linearGradient>
        </defs>
      </svg>
      <div className="text-center">
        <p className="pn-display pn-tabular text-6xl font-bold">
          {formatNeetMarks(score)}
        </p>
        <p className="mt-1 text-sm text-neet-muted">
          of {formatNeetMarks(maxScore)} marks
        </p>
      </div>
    </div>
  )
}

export function NeetResultView({ result }) {
  const { attempt, proctoring, sections, summary } = result
  const metrics = [
    ["Attempted", summary.attempted],
    ["Correct", summary.correct],
    ["Incorrect", summary.incorrect],
    ["Unanswered", summary.unanswered],
    ["Accuracy", `${formatNeetMarks(summary.accuracyPercent)}%`],
    ["Time used", formatNeetDuration(summary.durationUsedSeconds)],
    ["Marks earned", `+${formatNeetMarks(summary.positiveMarks)}`],
    ["Negative marks", formatNeetMarks(summary.negativeMarks)],
    // Dropped questions award marks to every candidate (NTA rule).
    ...(summary.dropped ? [["Dropped (marks awarded)", summary.dropped]] : []),
  ]
  const flagged =
    attempt.proctoring?.reviewStatus &&
    attempt.proctoring.reviewStatus !== "NONE"
  return (
    <div className="space-y-12">
      <section
        aria-labelledby="pn-result-title"
        className="pn-card pn-grain relative overflow-hidden p-6 sm:p-10"
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 600 80"
          preserveAspectRatio="none"
          className="absolute inset-x-0 bottom-4 h-16 w-full opacity-30"
        >
          <path
            d="M0 50 H200 l14 -12 l10 12 H260 l8 16 l12 -60 l14 76 l10 -30 H380 l20 -16 l20 16 H600"
            fill="none"
            stroke="rgb(var(--pn-accent))"
            strokeWidth="2.5"
            strokeLinejoin="round"
            className="pn-ecg-line"
            style={{ "--pn-ecg-length": 900 }}
          />
        </svg>
        <div className="relative grid items-center gap-10 lg:grid-cols-[1.2fr_1fr]">
          <div>
            <p className="pn-chip border-neet-accent/40 text-neet-accent">
              <span aria-hidden="true">✓</span> Mock completed
            </p>
            <h1
              id="pn-result-title"
              className="pn-display mt-5 text-[clamp(2.6rem,1.6rem+4vw,4.6rem)] font-bold"
            >
              One mock closer.
            </h1>
            <h2 className="mt-6 text-2xl font-bold">Your result</h2>
            <p className="mt-2 text-lg font-semibold">{attempt.test.title}</p>
            <p className="mt-1 text-neet-muted">
              {attempt.candidate.fullName} · Attempt {attempt.attemptNumber} ·{" "}
              {NEET_MODE_LABELS[attempt.mode]}
            </p>
            <p className="mt-6 max-w-xl text-lg leading-8 text-neet-ink">
              {encouragement(summary.accuracyPercent, summary.attempted)}
            </p>
            <p className="mt-3 text-sm text-neet-muted">
              {NEET_SUBMISSION_REASON_LABELS[attempt.submissionReason]}
            </p>
          </div>
          <ScoreRing score={summary.score} maxScore={summary.maxScore} />
        </div>
      </section>

      <section aria-labelledby="pn-result-summary">
        <h2 id="pn-result-summary" className="sr-only">
          Attempt summary
        </h2>
        <dl className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {metrics.map(([label, value]) => (
            <div key={label} className="pn-card p-5">
              <dt className="text-sm text-neet-muted">{label}</dt>
              <dd className="pn-display pn-tabular mt-2 text-3xl font-bold">
                {value}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <section aria-labelledby="pn-result-subjects">
        <h2
          id="pn-result-subjects"
          className="pn-display mb-6 text-3xl font-bold"
        >
          Subject breakdown
        </h2>
        <div className="grid gap-4 md:grid-cols-2">
          {sections.map((section) => {
            const share =
              section.maxScore > 0
                ? Math.max(0, section.score / section.maxScore)
                : 0
            return (
              <article key={section.key} className="pn-card p-6">
                <div className="flex items-baseline justify-between gap-3">
                  <h3 className="flex items-center gap-2 text-lg font-bold">
                    <span
                      aria-hidden="true"
                      className={`h-3 w-3 rounded-full ${subjectStyle(section.subjectKey).bg}`}
                    />
                    {section.subjectLabel || section.title}
                  </h3>
                  <p className="pn-display pn-tabular text-2xl font-bold">
                    {formatNeetMarks(section.score)}
                    <span className="text-base text-neet-muted">
                      {" "}
                      / {formatNeetMarks(section.maxScore)}
                    </span>
                  </p>
                </div>
                <div
                  className="mt-4 h-2.5 overflow-hidden rounded-full bg-neet-surface-muted"
                  aria-hidden="true"
                >
                  <div
                    className={`h-full rounded-full ${subjectStyle(section.subjectKey).bg}`}
                    style={{ width: `${Math.round(share * 100)}%` }}
                  />
                </div>
                <p className="mt-4 text-sm text-neet-muted">
                  {section.correct} correct · {section.incorrect} incorrect ·{" "}
                  {section.unanswered} unanswered
                </p>
              </article>
            )
          })}
        </div>
        <details className="mt-6 rounded-2xl border border-neet-line">
          <summary className="cursor-pointer p-4 font-semibold">
            Detailed table
          </summary>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <caption className="sr-only">
                Marks and answers by subject
              </caption>
              <thead className="bg-neet-surface-muted">
                <tr>
                  {[
                    "Subject",
                    "Score",
                    "Attempted",
                    "Correct",
                    "Incorrect",
                    "Unanswered",
                  ].map((label) => (
                    <th scope="col" key={label} className="p-4">
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sections.map((section) => (
                  <tr key={section.key} className="border-t border-neet-line">
                    <th scope="row" className="p-4">
                      {section.title}
                    </th>
                    <td className="p-4 font-bold">
                      {section.score} / {section.maxScore}
                    </td>
                    <td className="p-4">{section.attempted}</td>
                    <td className="p-4">{section.correct}</td>
                    <td className="p-4">{section.incorrect}</td>
                    <td className="p-4">{section.unanswered}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
        <p className="mt-4 text-sm leading-6 text-neet-muted">
          Scored on our server from the answers it received before the deadline.
          Answered questions that were marked for review were scored normally.
        </p>
      </section>

      {proctoring && (
        <section
          aria-labelledby="pn-result-proctoring"
          className="pn-card p-6 sm:p-8"
        >
          <h2 id="pn-result-proctoring" className="text-2xl font-bold">
            Monitoring summary
          </h2>
          <p className="mt-3">
            {proctoring.warningCount} counted notice
            {proctoring.warningCount === 1 ? "" : "s"} (review threshold{" "}
            {proctoring.maxWarnings}) · {proctoring.softWarningCount}{" "}
            camera/audio notice
            {proctoring.softWarningCount === 1 ? "" : "s"}
          </p>
          {flagged && (
            <p className="mt-3 rounded-xl border border-neet-line p-4">
              This attempt has been flagged for review by a person because of
              repeated monitoring signals. A flag is not a finding of misconduct
              and does not change your score.
            </p>
          )}
          <p className="mt-2 text-sm text-neet-muted">
            Browser signals are observations, not proof of misconduct. No video,
            audio or screen recording was stored.
          </p>
          {proctoring.warnings.length > 0 && (
            <ul className="mt-5 space-y-3">
              {proctoring.warnings.map((warning) => (
                <li
                  key={warning.id}
                  className="border-t border-neet-line pt-3 leading-7"
                >
                  {warning.message}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      <div className="flex flex-wrap gap-3">
        <Link className="pn-btn pn-btn-primary pn-btn-lg" to="/neet/mocks">
          Back to mock tests
        </Link>
        <Link className="pn-btn pn-btn-secondary pn-btn-lg" to="/neet">
          NEET Mocks home
        </Link>
      </div>
    </div>
  )
}
export default function NeetResult() {
  const { attemptId } = useParams()
  const resource = useNeetResource(
    (options) => neetClient.getResult(attemptId, options),
    [attemptId]
  )
  return (
    <ProjectNeetShell>
      <div className="mx-auto w-full max-w-[1100px] px-5 py-12">
        <NeetResourceStatus resource={resource} />
        {resource.status === "success" && (
          <NeetResultView result={resource.data} />
        )}
      </div>
    </ProjectNeetShell>
  )
}
