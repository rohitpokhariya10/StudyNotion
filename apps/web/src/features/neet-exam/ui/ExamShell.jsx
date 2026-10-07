import {
  deriveQuestionState,
  QUESTION_STATE,
  subjectStyle,
  summarizeResponses,
} from "@/entities/neet"
import AccessibleDialog from "@/shared/ui/AccessibleDialog"
import { useMemo, useState } from "react"
import {
  FiAlertTriangle,
  FiCheckCircle,
  FiClock,
  FiGrid,
  FiPauseCircle,
  FiRefreshCw,
  FiWifi,
  FiWifiOff,
} from "react-icons/fi"

import { ExamTimer } from "./ExamTimer"
import { QuestionCard } from "./QuestionCard"
import { QuestionPalette } from "./QuestionPalette"

export { ExamTimer } from "./ExamTimer"
export { QuestionCard } from "./QuestionCard"
export { QuestionPalette } from "./QuestionPalette"

const SAVE_PRESENTATION = {
  saved: {
    label: "All answers saved",
    Icon: FiCheckCircle,
    tone: "text-neet-success",
  },
  pending: { label: "Waiting to save", Icon: FiClock, tone: "text-neet-muted" },
  saving: {
    label: "Saving answers…",
    Icon: FiRefreshCw,
    tone: "text-neet-muted",
  },
  offline: {
    label: "Answers waiting for connection",
    Icon: FiWifiOff,
    tone: "text-neet-warning",
  },
  retrying: {
    label: "Retrying save…",
    Icon: FiRefreshCw,
    tone: "text-neet-warning",
  },
  blocked: {
    label: "Saving paused",
    Icon: FiPauseCircle,
    tone: "text-neet-danger",
  },
}

export function AutosaveStatus({ save }) {
  const presentation =
    SAVE_PRESENTATION[save.status] || SAVE_PRESENTATION.pending
  const { Icon } = presentation
  return (
    <span
      role="status"
      className={`flex items-center gap-1.5 text-sm font-semibold ${presentation.tone}`}
    >
      <Icon aria-hidden="true" />
      {presentation.label}
      {save.pendingCount > 0 ? ` · ${save.pendingCount} pending` : ""}
    </span>
  )
}

export function ConnectionStatus({ online }) {
  return (
    <span
      className={`pn-chip ${online ? "border-neet-line text-neet-muted" : "border-neet-warning text-neet-warning"}`}
    >
      {online ? (
        <FiWifi aria-hidden="true" />
      ) : (
        <FiWifiOff aria-hidden="true" />
      )}
      {online ? "Online" : "Offline"}
    </span>
  )
}

export function SubjectTabs({ currentSection, onSelect, responses, sections }) {
  return (
    <nav
      aria-label="Exam subjects"
      className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1"
    >
      {sections.map((section) => {
        const active = section.key === currentSection
        const answered = section.questionIds.filter(
          (id) => responses[id]?.selectedOption
        ).length
        return (
          <button
            type="button"
            key={section.key}
            aria-current={active ? "true" : undefined}
            onClick={() => onSelect(section.questionIds[0])}
            className={`flex flex-none items-center gap-2 rounded-full border-2 px-4 py-2 text-sm font-bold ${
              active
                ? "border-neet-ink bg-neet-ink text-neet-surface"
                : "border-neet-line bg-neet-surface text-neet-ink"
            }`}
          >
            <span
              aria-hidden="true"
              className={`h-2.5 w-2.5 rounded-full ${subjectStyle(section.subjectKey).bg}`}
            />
            {section.title}
            <span
              className={`pn-tabular text-xs font-semibold ${active ? "opacity-80" : "text-neet-muted"}`}
            >
              {answered}/{section.questionIds.length}
            </span>
          </button>
        )
      })}
    </nav>
  )
}

function Banner({ children, role = "status", tone = "warning" }) {
  const tones = {
    warning: "border-neet-warning bg-neet-warning/10",
    danger: "border-neet-danger bg-neet-danger/10",
    neutral: "border-neet-line bg-neet-surface",
  }
  return (
    <div
      role={role}
      className={`rounded-2xl border-2 p-4 leading-7 sm:p-5 ${tones[tone]}`}
    >
      {children}
    </div>
  )
}

function SubmitSummary({ responses, sections }) {
  return (
    <table className="mt-5 w-full text-left text-sm">
      <caption className="sr-only">Answers by subject</caption>
      <thead className="text-neet-muted">
        <tr>
          <th scope="col" className="py-2 font-semibold">
            Subject
          </th>
          <th scope="col" className="py-2 text-right font-semibold">
            Answered
          </th>
          <th scope="col" className="py-2 text-right font-semibold">
            Unanswered
          </th>
          <th scope="col" className="py-2 text-right font-semibold">
            Marked
          </th>
        </tr>
      </thead>
      <tbody>
        {sections.map((section) => {
          const summary = summarizeResponses(section.questionIds, responses)
          return (
            <tr key={section.key} className="border-t border-neet-line">
              <th scope="row" className="py-2 font-semibold">
                {section.title}
              </th>
              <td className="pn-tabular py-2 text-right">{summary.answered}</td>
              <td className="pn-tabular py-2 text-right">
                {summary.unanswered}
              </td>
              <td className="pn-tabular py-2 text-right">
                {summary.markedForReview}
              </td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}

export function ExamShell({ children, engine, proctorStatus }) {
  const [confirmSubmit, setConfirmSubmit] = useState(false)
  const [paletteOpen, setPaletteOpen] = useState(false)
  const {
    controller,
    index,
    online,
    phase,
    remainingMs,
    responses,
    save,
    session,
  } = engine
  const questions = session.paper.questions
  const sections = session.paper.sections
  const question = questions[index]
  const response = responses[question.id]
  const section = sections.find((item) => item.key === question.sectionKey)
  const disabled = phase !== "active" || remainingMs <= 0
  const last = index === questions.length - 1
  const summary = useMemo(
    () =>
      summarizeResponses(
        questions.map((item) => item.id),
        responses
      ),
    [questions, responses]
  )
  const state = deriveQuestionState(response)
  const marked =
    state === QUESTION_STATE.MARKED_FOR_REVIEW ||
    state === QUESTION_STATE.ANSWERED_AND_MARKED

  const goTo = (target) => {
    controller.visit(target)
    setPaletteOpen(false)
  }
  const markAndNext = () => {
    if (!response?.markedForReview)
      controller.change(question.id, { markedForReview: true })
    if (!last) controller.visit(index + 1)
  }
  const submit = () => {
    setConfirmSubmit(false)
    void controller.submit()
  }

  const palette = (
    <QuestionPalette
      questions={questions}
      sections={sections}
      responses={responses}
      index={index}
      onSelect={goTo}
    />
  )

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-30 border-b border-neet-line bg-neet-canvas-raised/95 backdrop-blur-sm">
        <div className="mx-auto flex w-full max-w-[1440px] items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <span
              aria-hidden="true"
              className="hidden h-8 w-8 flex-none place-items-center rounded-xl bg-neet-accent font-bold text-neet-accent-ink sm:grid"
            >
              N
            </span>
            <div className="min-w-0">
              <p className="text-[0.65rem] font-bold tracking-[0.24em] text-neet-muted uppercase">
                Project NEET
              </p>
              <h1 className="truncate text-base font-bold sm:text-lg">
                {session.attempt.test.title}
              </h1>
            </div>
            {session.attempt.test.isSample && (
              <span className="pn-chip hidden flex-none border-neet-line text-neet-muted md:inline-flex">
                Sample paper
              </span>
            )}
          </div>
          <div className="flex flex-none items-center gap-2 sm:gap-3">
            <span className="hidden xl:block">{proctorStatus}</span>
            <ExamTimer remainingMs={remainingMs} />
            <button
              type="button"
              className="pn-btn pn-btn-primary min-h-11 px-4"
              onClick={() => setConfirmSubmit(true)}
              disabled={disabled}
            >
              Submit test
            </button>
          </div>
        </div>
        <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-2 px-4 pb-3 sm:px-6 md:flex-row md:items-center md:justify-between">
          <SubjectTabs
            sections={sections}
            responses={responses}
            currentSection={question.sectionKey}
            onSelect={(id) =>
              controller.visit(questions.findIndex((item) => item.id === id))
            }
          />
          <div className="flex flex-none items-center gap-3">
            <span className="xl:hidden">{proctorStatus}</span>
            <AutosaveStatus save={save} />
            <ConnectionStatus online={online} />
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1440px] flex-1 px-4 py-5 sm:px-6">
        <div className="mb-5 space-y-3 empty:hidden">
          {!online && (
            <Banner>
              <strong>You’re offline.</strong> Keep answering while time remains
              — your answers are kept on this device and sync automatically when
              you reconnect. The timer keeps running, and answers that reach the
              server after the deadline cannot count.
            </Banner>
          )}
          {phase === "duplicate" && (
            <Banner role="alert" tone="danger">
              <h2 className="text-lg font-bold">
                This exam is open in another tab or window.
              </h2>
              <p className="my-2">
                This tab is paused so answers can't conflict. Continuing here
                pauses the other one. The timer keeps running either way.
              </p>
              <button
                type="button"
                className="pn-btn pn-btn-primary"
                onClick={controller.activate}
              >
                Continue in this tab
              </button>
            </Banner>
          )}
          {phase === "auth" && (
            <Banner role="alert" tone="danger">
              <h2 className="text-lg font-bold">
                Your Prahit sign-in expired.
              </h2>
              <p className="my-2">
                Your pending answers are safe on this device. Sign in again in a
                new tab, then resume here — the timer keeps running.
              </p>
              <div className="flex flex-wrap gap-3">
                <a
                  href="/login"
                  target="_blank"
                  rel="noopener"
                  className="pn-btn pn-btn-secondary"
                >
                  Sign in (new tab)
                </a>
                <button
                  type="button"
                  className="pn-btn pn-btn-primary"
                  onClick={controller.activate}
                >
                  Resume here
                </button>
              </div>
            </Banner>
          )}
          {engine.error && !["duplicate", "auth"].includes(phase) && (
            <Banner role="alert">
              <span className="flex items-start gap-2">
                <FiAlertTriangle
                  aria-hidden="true"
                  className="mt-1.5 flex-none"
                />
                {engine.error.message}
              </span>
            </Banner>
          )}
          {["submitting", "submit-error", "save-error"].includes(phase) && (
            <Banner tone="neutral">
              <h2 className="flex items-center gap-2 text-lg font-bold">
                {phase === "submitting" && (
                  <span className="pn-spinner" aria-hidden="true" />
                )}
                {phase === "submitting"
                  ? "Submitting your test…"
                  : "Submission needs attention"}
              </h2>
              <p className="my-2">
                Your answers are locked. Keep this tab open until your result is
                confirmed.
              </p>
              {phase !== "submitting" && (
                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    className="pn-btn pn-btn-primary"
                    onClick={() => controller.submit()}
                  >
                    Retry submission
                  </button>
                  {phase === "save-error" && (
                    <button
                      type="button"
                      className="pn-btn pn-btn-secondary"
                      onClick={() =>
                        controller.submit("MANUAL_SUBMIT", { savedOnly: true })
                      }
                    >
                      Submit saved answers only
                    </button>
                  )}
                </div>
              )}
            </Banner>
          )}
        </div>

        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="mx-auto w-full max-w-[880px] space-y-4">
            <QuestionCard
              question={question}
              response={response}
              section={section}
              total={questions.length}
              disabled={disabled}
              onAnswer={(selectedOption) =>
                controller.change(question.id, { selectedOption })
              }
            />
            <p className="px-1 text-sm text-neet-muted">
              Answers save automatically. An answered question that is marked
              for review is still scored.
            </p>
          </div>
          <aside className="pn-card sticky top-36 hidden max-h-[calc(100dvh-10rem)] overflow-y-auto p-5 lg:block">
            {palette}
          </aside>
        </div>
      </main>

      <div className="sticky bottom-0 z-20 border-t border-neet-line bg-neet-surface/95 backdrop-blur-sm">
        <div className="mx-auto flex w-full max-w-[1440px] flex-wrap items-center justify-between gap-2 px-4 py-3 sm:px-6">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="pn-btn pn-btn-ghost min-h-11 border border-neet-line px-4"
              disabled={disabled || !response?.selectedOption}
              onClick={() =>
                controller.change(question.id, { selectedOption: null })
              }
            >
              Clear response
            </button>
            <button
              type="button"
              className="pn-btn pn-btn-ghost min-h-11 border border-neet-line px-4"
              disabled={disabled}
              aria-pressed={marked}
              onClick={() =>
                controller.change(question.id, {
                  markedForReview: !response?.markedForReview,
                })
              }
            >
              {marked ? "Unmark review" : "Mark for review"}
            </button>
            {!last && (
              <button
                type="button"
                className="pn-btn pn-btn-ghost hidden min-h-11 border border-neet-line px-4 sm:inline-flex"
                disabled={disabled}
                onClick={markAndNext}
              >
                Mark for review & next
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              className="pn-btn pn-btn-secondary min-h-11 px-4 lg:hidden"
              aria-haspopup="dialog"
              onClick={() => setPaletteOpen(true)}
            >
              <FiGrid aria-hidden="true" />
              <span className="sr-only sm:not-sr-only">OMR</span>
              <span className="pn-tabular text-xs">
                {summary.answered}/{summary.total}
              </span>
            </button>
            <button
              type="button"
              className="pn-btn pn-btn-secondary min-h-11 px-4"
              disabled={index === 0}
              onClick={() => controller.visit(index - 1)}
            >
              Previous
            </button>
            {last ? (
              <button
                type="button"
                className="pn-btn pn-btn-primary min-h-11 px-5"
                disabled={disabled}
                onClick={() => setConfirmSubmit(true)}
              >
                Review & submit
              </button>
            ) : (
              <button
                type="button"
                className="pn-btn pn-btn-primary min-h-11 px-5"
                onClick={() => controller.visit(index + 1)}
              >
                Save & next
              </button>
            )}
          </div>
        </div>
      </div>

      {children}

      {paletteOpen && (
        <AccessibleDialog
          title="Question palette"
          onClose={() => setPaletteOpen(false)}
          overlayClassName="items-end bg-neet-ink/40 p-0 sm:place-items-center sm:p-4"
          className="max-h-[85dvh] w-full overflow-y-auto rounded-t-3xl bg-neet-surface p-5 text-neet-ink shadow-xl sm:max-w-lg sm:rounded-3xl"
          titleClassName="sr-only"
        >
          <div className="mb-4 flex justify-end">
            <button
              type="button"
              className="pn-btn pn-btn-secondary min-h-10 px-4"
              onClick={() => setPaletteOpen(false)}
            >
              Close
            </button>
          </div>
          {palette}
        </AccessibleDialog>
      )}

      {confirmSubmit && (
        <AccessibleDialog
          title="Submit this test?"
          onClose={() => setConfirmSubmit(false)}
          className="w-full max-w-lg rounded-2xl bg-neet-surface p-6 text-neet-ink shadow-xl"
          overlayClassName="bg-neet-ink/40"
          titleClassName="text-2xl font-bold"
          description={
            <p className="mt-3 leading-7 text-neet-muted">
              {summary.answered} answered · {summary.unanswered} unanswered ·{" "}
              {summary.markedForReview} marked for review. You cannot change
              answers after submitting.
            </p>
          }
        >
          <SubmitSummary sections={sections} responses={responses} />
          <div className="mt-6 flex flex-wrap justify-end gap-3">
            <button
              type="button"
              className="pn-btn pn-btn-secondary"
              onClick={() => setConfirmSubmit(false)}
            >
              Keep working
            </button>
            <button
              type="button"
              className="pn-btn pn-btn-primary"
              onClick={submit}
            >
              Confirm submission
            </button>
          </div>
        </AccessibleDialog>
      )}
    </div>
  )
}
