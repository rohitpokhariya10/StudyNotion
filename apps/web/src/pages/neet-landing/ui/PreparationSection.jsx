import {
  FiArrowRight,
  FiBarChart2,
  FiCheck,
  FiClock,
  FiFileText,
  FiSliders,
  FiWifiOff,
} from "react-icons/fi"
import { Link } from "react-router"

const ROUTINE = [
  {
    Icon: FiFileText,
    tone: "blue",
    title: "Choose a paper",
    copy: "Each lists its subjects, duration and marking.",
  },
  {
    Icon: FiSliders,
    tone: "grey",
    title: "Read the instructions",
    copy: "Confirm your details and choose a mode.",
  },
  {
    Icon: FiClock,
    tone: "green",
    title: "Start test",
    copy: "Your timer begins only when you press it.",
  },
  {
    Icon: FiBarChart2,
    tone: "pink",
    title: "See your result",
    copy: "Score, accuracy and every subject.",
  },
]

const RESULT_PARTS = [
  ["Score", "Marks & accuracy"],
  ["Subjects", "Physics · Chemistry · Biology"],
  ["Answers", "Correct · Incorrect · Unanswered"],
]

// Illustrative palette states only; the legend uses the exam's own labels.
const PALETTE = "aaamaanaaaramnnaanna"
const PALETTE_STATES = {
  a: "answered",
  m: "marked",
  r: "answered-marked",
  n: "open",
}

function Feature({ className = "", visual, title, children }) {
  return (
    <article className={`np-feature ${className}`}>
      <div className="np-feature-visual">{visual}</div>
      <div className="np-feature-text">
        <h3>{title}</h3>
        <p>{children}</p>
      </div>
    </article>
  )
}

export function PreparationSection({ startPath }) {
  return (
    <section className="np-prep" aria-labelledby="np-prep-title">
      <h2 id="np-prep-title" className="np-prep-title">
        <span>Preparation with purpose.</span>{" "}
        <span>Confidence with a foundation.</span>
      </h2>
      <div className="np-bento">
        <Feature
          className="np-feature-tall"
          title="Build a consistent exam rhythm"
          visual={
            <ol className="np-routine" aria-label="How every mock runs">
              {ROUTINE.map(({ Icon, tone, title, copy }) => (
                <li key={title}>
                  <span className={`np-routine-icon np-tone-${tone}`}>
                    <Icon aria-hidden="true" />
                  </span>
                  <span>
                    <strong>{title}</strong>
                    {copy}
                  </span>
                </li>
              ))}
            </ol>
          }
        >
          Every mock follows the same calm routine, and its deadline is kept by
          our server. Timing becomes a habit, not a worry.
        </Feature>
        <Feature
          title="Stay focused during practice"
          visual={
            <div className="np-saved" aria-hidden="true">
              <span className="np-saved-pill">
                <FiCheck /> Answer saved
              </span>
              <span className="np-saved-offline">
                <FiWifiOff /> Offline · waiting on this device
              </span>
            </div>
          }
        >
          Answers save as you go. If the connection drops, they wait on this
          device and sync when you reconnect.
        </Feature>
        <Feature
          title="Understand your performance"
          visual={
            <ul className="np-result-parts" aria-hidden="true">
              {RESULT_PARTS.map(([label, detail]) => (
                <li key={label}>
                  <span className="np-result-check">
                    <FiCheck />
                  </span>
                  <strong>{label}</strong>
                  <span>{detail}</span>
                </li>
              ))}
            </ul>
          }
        >
          Every result shows your score, accuracy and a subject-wise breakdown
          of where marks were gained and lost.
        </Feature>
        <Feature
          className="np-feature-wide"
          title="Improve through structured revision"
          visual={
            <div className="np-palette" aria-hidden="true">
              <ol>
                {[...PALETTE].map((code, index) => (
                  <li key={index} data-state={PALETTE_STATES[code]}>
                    {index + 1}
                  </li>
                ))}
              </ol>
              <p>
                <span data-state="answered">Answered</span>
                <span data-state="marked">Marked for review</span>
                <span data-state="open">Not answered</span>
              </p>
            </div>
          }
        >
          Mark questions for review, return to skipped ones before you submit,
          and let each result decide what you revise next.
        </Feature>
      </div>
      <div className="np-prep-cta">
        <Link to={startPath} className="np-btn np-btn-primary">
          Start a Mock
          <FiArrowRight aria-hidden="true" />
        </Link>
        <p>Your timer starts only when you press Start test.</p>
      </div>
    </section>
  )
}
