import { describeNeetError, formatNeetDuration } from "@/entities/neet"
import { FiArrowRight, FiRefreshCw } from "react-icons/fi"
import { Link } from "react-router"

const SHOWN = 3
const STATE_ORDER = { OPEN: 0, UPCOMING: 1, CLOSED: 2 }

function PaperRow({ test }) {
  const open = test.availability.state === "OPEN"
  return (
    <li className="np-paper">
      <span className="np-paper-bar" aria-hidden="true">
        {test.sections.map((section) => (
          <span
            key={section.key}
            className={`np-subject-${section.subjectKey}`}
            style={{ flexGrow: section.questionCount }}
          />
        ))}
      </span>
      <div className="np-paper-title">
        <h3>{test.title}</h3>
        {test.isSample && <span className="np-tag">Sample paper</span>}
        {test.tagline && <p>{test.tagline}</p>}
        <ul className="np-paper-subjects" aria-label="Sections">
          {test.sections.map((section) => (
            <li key={section.key}>
              <span
                aria-hidden="true"
                className={`np-subject-${section.subjectKey}`}
              />
              {section.title}
            </li>
          ))}
        </ul>
      </div>
      <dl className="np-paper-facts">
        <div>
          <dt>Questions</dt>
          <dd>{test.questionCount}</dd>
        </div>
        <div>
          <dt>Duration</dt>
          <dd>{formatNeetDuration(test.durationSeconds)}</dd>
        </div>
        <div>
          <dt>Marks</dt>
          <dd>{test.totalMarks}</dd>
        </div>
      </dl>
      <div className="np-paper-action">
        {open ? (
          <Link
            to={`/neet/mocks/${test.id}/start`}
            className="np-btn np-btn-primary np-btn-small"
            aria-label={`Choose this mock: ${test.title}`}
          >
            Choose
            <FiArrowRight aria-hidden="true" />
          </Link>
        ) : (
          <span className="np-paper-status">
            {test.availability.state === "UPCOMING"
              ? "Opening soon"
              : "This mock has closed"}
          </span>
        )}
      </div>
    </li>
  )
}

function PaperSkeleton() {
  return (
    <div className="np-paper np-paper-skeleton">
      <span className="pn-skeleton" />
      <span className="pn-skeleton" />
      <span className="pn-skeleton" />
    </div>
  )
}

// A blank answer sheet for the honest "nothing published yet" state.
function EmptyCard() {
  return (
    <svg viewBox="0 0 120 120" className="np-empty-art" aria-hidden="true">
      <rect x="10" y="10" width="100" height="100" rx="26" fill="#f3eee6" />
      {[38, 60, 82].map((cy) =>
        [38, 60, 82].map((cx) => (
          <circle
            key={`${cx}-${cy}`}
            cx={cx}
            cy={cy}
            r="8"
            fill="#fff"
            stroke="#ddd3c4"
            strokeWidth="3"
          />
        ))
      )}
    </svg>
  )
}

function CatalogState({ catalog }) {
  if (catalog.status === "loading")
    return (
      <div
        role="status"
        aria-label="Loading mock tests"
        className="np-papers-list"
      >
        <PaperSkeleton />
        <PaperSkeleton />
      </div>
    )

  if (catalog.status === "error") {
    const error = describeNeetError(catalog.error)
    return (
      <div role="alert" className="np-papers-message">
        <h3>{error.title}</h3>
        <p>{error.message}</p>
        {error.requestId && (
          <p className="np-reference">Reference: {error.requestId}</p>
        )}
        <div className="np-message-actions">
          <button
            type="button"
            className="np-btn np-btn-secondary np-btn-small"
            onClick={catalog.reload}
          >
            <FiRefreshCw aria-hidden="true" /> Try again
          </button>
        </div>
      </div>
    )
  }

  const tests = [...catalog.data.tests].sort(
    (a, b) =>
      (STATE_ORDER[a.availability.state] ?? 3) -
      (STATE_ORDER[b.availability.state] ?? 3)
  )
  if (!tests.length)
    return (
      <div className="np-papers-message">
        <EmptyCard />
        <div>
          <h3>No mocks are open right now</h3>
          <p>
            New papers appear here as soon as they are published. Your previous
            attempts and results stay on the mock tests page.
          </p>
          <div className="np-message-actions">
            <button
              type="button"
              className="np-btn np-btn-secondary np-btn-small"
              onClick={catalog.reload}
            >
              <FiRefreshCw aria-hidden="true" /> Check availability
            </button>
            <Link to="/neet/mocks" className="np-text-link">
              View your attempts <FiArrowRight aria-hidden="true" />
            </Link>
          </div>
        </div>
      </div>
    )

  const hidden = tests.length - SHOWN
  return (
    <>
      <ul className="np-papers-list">
        {tests.slice(0, SHOWN).map((test) => (
          <PaperRow key={test.id} test={test} />
        ))}
      </ul>
      {hidden > 0 && (
        <Link to="/neet/mocks" className="np-papers-more">
          {hidden} more {hidden === 1 ? "paper" : "papers"} on the mock tests
          page <FiArrowRight aria-hidden="true" />
        </Link>
      )}
    </>
  )
}

// Live catalog preview. It shows only what the API returns: loading, failure,
// no published papers, and each paper's real availability.
export function OpenPapers({ catalog }) {
  return (
    <section
      id="papers"
      className="np-papers"
      aria-labelledby="np-papers-title"
    >
      <div className="np-papers-head">
        <div>
          <h2 id="np-papers-title">Pick today’s sitting.</h2>
          <p>Every paper lists its own questions, duration and marking.</p>
        </div>
        <Link to="/neet/mocks" className="np-text-link">
          All mocks & your attempts <FiArrowRight aria-hidden="true" />
        </Link>
      </div>
      <div className="np-papers-panel">
        <CatalogState catalog={catalog} />
      </div>
    </section>
  )
}
