import { ExamShell, useExamEngine } from "@/features/neet-exam"
import {
  grantFromAttempt,
  MonitoringOverlay,
  proctorMediaStore,
  ProctorStatusBar,
  ProctorWarningDialog,
  useProctorMonitor,
} from "@/features/neet-proctoring"
import AccessibleDialog from "@/shared/ui/AccessibleDialog"
import { ExamFocusShell, NeetWordmark } from "@/widgets/neet-shell"
import { useCallback, useEffect, useMemo, useState } from "react"
import { Link, useNavigate, useParams } from "react-router"

export default function NeetExam() {
  const { attemptId } = useParams()
  const navigate = useNavigate()
  const result = useCallback(
    (id) => navigate(`/project-neet/attempts/${id}/result`, { replace: true }),
    [navigate]
  )
  const engine = useExamEngine({ attemptId, onResult: result })
  const { controller, phase, session, attempt } = engine
  const grant = useMemo(() => grantFromAttempt(attempt), [attempt])
  const [warnings, setWarnings] = useState([])
  const [deviceDismissed, setDeviceDismissed] = useState(false)
  const [leaveOpen, setLeaveOpen] = useState(false)
  const proctored = attempt?.mode === "PROCTORED"
  const active = proctored && phase === "active"
  const monitor = useProctorMonitor({
    enabled: active,
    grant,
    attemptId,
    sessionId: session?.sessionId,
    policy: session?.proctorPolicy,
    signalConfig: session?.signalConfig,
    onClosed: controller.finishFromServer,
    onSuperseded: controller.supersede,
    onWarnings: (next) => setWarnings((current) => [...current, ...next]),
  })
  useEffect(
    () => () => {
      proctorMediaStore.stopAll()
      if (document.fullscreenElement)
        void document.exitFullscreen?.().catch(() => {})
    },
    []
  )
  useEffect(() => {
    if (
      [
        "duplicate",
        "completed",
        "closed",
        "auth",
        "submit-error",
        "submitting",
        "save-error",
      ].includes(phase)
    )
      proctorMediaStore.stopAll()
  }, [phase])
  // Browser Back during a running exam opens a confirmation instead of
  // silently leaving. The guard entry reuses the router's history state so
  // the current route is unchanged.
  useEffect(() => {
    if (phase !== "active") return undefined
    const guard = () =>
      window.history.pushState(
        { ...(window.history.state || {}), pnExamGuard: attemptId },
        "",
        window.location.href
      )
    if (window.history.state?.pnExamGuard !== attemptId) guard()
    const onPopState = () => {
      guard()
      setLeaveOpen(true)
    }
    window.addEventListener("popstate", onPopState)
    return () => window.removeEventListener("popstate", onPopState)
  }, [attemptId, phase])
  const activate = () => {
    setDeviceDismissed(false)
    // Fullscreen must start within the click gesture, before network awaits.
    if (proctored) void monitor.enterFullscreen()
    void controller.activate()
  }
  return (
    <ExamFocusShell>
      {session ? (
        <ExamShell
          engine={engine}
          proctorStatus={
            proctored && (
              <ProctorStatusBar
                {...monitor}
                maxWarnings={session.proctorPolicy.warnings.maxWarnings}
                warningCount={
                  monitor.warningCount ?? attempt.proctoring?.warningCount
                }
              />
            )
          }
        >
          {active &&
            (!deviceDismissed ||
              (monitor.fullscreenRequired && !monitor.fullscreen)) && (
              <MonitoringOverlay
                {...monitor}
                onEnterFullscreen={monitor.enterFullscreen}
                onReconnect={monitor.reconnect}
                onContinueWithout={() => {
                  setDeviceDismissed(true)
                  monitor.reportEvent("CAMERA_INTERRUPTED", {
                    reason: "DEVICE_REMOVED",
                  })
                }}
              />
            )}
          {leaveOpen && (
            <AccessibleDialog
              title="Leave the exam?"
              onClose={() => setLeaveOpen(false)}
              overlayClassName="bg-neet-ink/40"
              className="w-full max-w-md rounded-2xl bg-neet-surface p-6 text-neet-ink shadow-xl"
              titleClassName="text-2xl font-bold"
              description={
                <p className="mt-3 leading-7 text-neet-muted">
                  Your timer keeps running on the server while you are away.
                  Saved answers stay saved, and you can resume from the mock
                  list before time runs out.
                </p>
              }
            >
              <div className="mt-6 flex flex-wrap justify-end gap-3">
                <button
                  type="button"
                  className="pn-btn pn-btn-secondary"
                  onClick={() => {
                    setLeaveOpen(false)
                    navigate("/project-neet/mocks")
                  }}
                >
                  Leave exam
                </button>
                <button
                  type="button"
                  className="pn-btn pn-btn-primary"
                  onClick={() => setLeaveOpen(false)}
                >
                  Stay and continue
                </button>
              </div>
            </AccessibleDialog>
          )}
          {active && warnings.length > 0 && (
            <ProctorWarningDialog
              warning={warnings[0]}
              maxWarnings={session.proctorPolicy.warnings.maxWarnings}
              onAcknowledge={() => setWarnings((current) => current.slice(1))}
            />
          )}
        </ExamShell>
      ) : (
        <main className="mx-auto my-auto w-full max-w-2xl space-y-6 p-6 sm:p-10">
          <NeetWordmark />
          <h1 className="pn-display text-4xl font-bold sm:text-5xl">
            {attempt?.test.title || "Your exam"}
          </h1>
          {phase === "ready" && (
            <p className="text-lg font-semibold text-neet-accent">
              Ready when you are. Stay calm and trust your preparation.
            </p>
          )}
          {["loading", "submitting", "completed"].includes(phase) && (
            <p role="status">
              {phase === "loading"
                ? "Loading your attempt…"
                : "Preparing your result…"}
            </p>
          )}
          {engine.error && <p role="alert">{engine.error.message}</p>}
          {phase === "ready" && (
            <>
              <p>
                Your checks are complete. Start when you are ready; the server
                starts the timer once.
              </p>
              <button
                type="button"
                className="pn-btn pn-btn-primary pn-btn-lg"
                onClick={activate}
              >
                Start test
              </button>
            </>
          )}
          {phase === "resume" && (
            <>
              <p>
                This attempt has already started. The original timer keeps
                running. If it is open in another tab/window, continuing here
                will pause that session.
              </p>
              <button
                type="button"
                className="pn-btn pn-btn-primary pn-btn-lg"
                onClick={activate}
              >
                Resume in this tab
              </button>
            </>
          )}
          {["error", "auth"].includes(phase) && (
            <button
              type="button"
              className="pn-btn pn-btn-secondary"
              onClick={controller.load}
            >
              Retry loading attempt
            </button>
          )}
          {phase === "closed" && (
            <>
              <p>
                This attempt is not ready to start or its registration has
                expired.
              </p>
              <Link
                className="pn-btn pn-btn-primary"
                to={`/project-neet/mocks/${attempt.testId}/start`}
              >
                Return to onboarding
              </Link>
            </>
          )}
          <Link to="/project-neet/mocks" className="block text-sm underline">
            Back to mock tests
          </Link>
        </main>
      )}
    </ExamFocusShell>
  )
}
