import {
  neetClient,
  NeetResourceStatus,
  useNeetResource,
} from "@/entities/neet"
import {
  CandidateDetailsForm,
  InstructionsPanel,
  ModeSelector,
} from "@/features/neet-onboarding"
import {
  evaluateProctoredSupport,
  grantProctorConsent,
  ProctorConsentPanel,
  proctorMediaStore,
  SystemCheckPanel,
} from "@/features/neet-proctoring"
import { ProjectNeetShell } from "@/widgets/neet-shell"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useSelector } from "react-redux"
import { Link, useNavigate, useParams } from "react-router"

function OnboardingFlow({ test, existing }) {
  const user = useSelector((s) => s.profile.user)
  const navigate = useNavigate()
  const [attempt, setAttempt] = useState(existing)
  const [step, setStep] = useState("candidate")
  const [mode, setMode] = useState(existing?.mode || "NON_PROCTORED")
  const [accepted, setAccepted] = useState(false)
  const [grant, setGrant] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const handoff = useRef(false)
  const support = useMemo(
    () => evaluateProctoredSupport(test.proctorPolicy),
    [test.proctorPolicy]
  )
  const connectivity = useCallback(() => neetClient.getTest(test.id), [test.id])
  useEffect(
    () => () => {
      if (!handoff.current) proctorMediaStore.stopAll()
    },
    []
  )
  const run = async (action) => {
    if (busy) return
    setBusy(true)
    setError(null)
    try {
      await action()
    } catch (failure) {
      setError(failure.message || "Please try again.")
    } finally {
      setBusy(false)
    }
  }
  if (attempt?.status === "IN_PROGRESS")
    return (
      <div className="pn-card space-y-5 p-7">
        <h2 className="text-2xl font-bold">Your attempt is already running</h2>
        <p>Resuming keeps the original deadline.</p>
        <Link
          to={`/project-neet/attempts/${attempt.id}`}
          className="pn-btn pn-btn-primary"
        >
          Resume attempt
        </Link>
      </div>
    )
  return (
    <div className="pn-card space-y-7 p-5 sm:p-8">
      <ol aria-label="Onboarding progress" className="flex flex-wrap gap-2">
        {[
          ["candidate", "Details"],
          ["mode", "Mode"],
          ["instructions", "Instructions"],
          ...(mode === "PROCTORED" ? [["consent", "Consent"]] : []),
          ["check", "System check"],
          ["ready", "Ready"],
        ].map(([key, label], position, all) => {
          const current = key === step
          const done = all.findIndex(([value]) => value === step) > position
          return (
            <li
              key={key}
              aria-current={current ? "step" : undefined}
              className={`pn-chip ${
                current
                  ? "border-neet-accent bg-neet-accent text-neet-accent-ink"
                  : done
                    ? "border-neet-accent/50 text-neet-accent"
                    : "border-neet-line text-neet-muted"
              }`}
            >
              <span aria-hidden="true">{done ? "✓" : position + 1}</span>
              {label}
              {done && <span className="sr-only">(completed)</span>}
            </li>
          )
        })}
      </ol>
      {error && (
        <p role="alert" className="rounded-xl border border-neet-danger p-4">
          {error}
        </p>
      )}
      {step === "candidate" && (
        <CandidateDetailsForm
          initialCandidate={attempt?.candidate}
          profileUser={user}
          submitting={busy}
          onSubmit={(candidate) =>
            run(async () => {
              const next = await neetClient.registerAttempt({
                testId: test.id,
                candidate,
              })
              setAttempt(next)
              setStep("mode")
            })
          }
        />
      )}
      {step === "mode" && (
        <>
          <ModeSelector
            availableModes={test.modes}
            proctorPolicy={test.proctorPolicy}
            proctoredSupport={support}
            value={mode}
            onChange={(next) => {
              setMode(next)
              setGrant(null)
              setAccepted(false)
              proctorMediaStore.stopAll()
            }}
          />
          <button
            type="button"
            className="pn-btn pn-btn-primary"
            disabled={
              busy ||
              !test.modes.includes(mode) ||
              (mode === "PROCTORED" && !support.supported)
            }
            onClick={() =>
              run(async () => {
                setAttempt(await neetClient.updateAttempt(attempt.id, { mode }))
                setStep("instructions")
              })
            }
          >
            Continue to instructions
          </button>
        </>
      )}
      {step === "instructions" && (
        <>
          <InstructionsPanel
            test={test}
            mode={mode}
            accepted={accepted}
            onAcceptedChange={setAccepted}
          />
          <button
            type="button"
            className="pn-btn pn-btn-primary"
            disabled={!accepted}
            onClick={() => setStep(mode === "PROCTORED" ? "consent" : "check")}
          >
            Continue to checks
          </button>
        </>
      )}
      {step === "consent" && (
        <ProctorConsentPanel
          policy={test.proctorPolicy}
          onAccept={() => {
            setGrant(
              grantProctorConsent({
                attemptId: attempt.id,
                mode,
                consentVersion: test.proctorPolicy.consentVersion,
              })
            )
            setStep("check")
          }}
          onBack={() => {
            setMode("NON_PROCTORED")
            setGrant(null)
            proctorMediaStore.stopAll()
            setStep("mode")
          }}
        />
      )}
      {step === "check" && (
        <SystemCheckPanel
          grant={grant}
          mode={mode}
          policy={test.proctorPolicy}
          probeConnectivity={connectivity}
          submitting={busy}
          onComplete={(systemCheck) =>
            run(async () => {
              await neetClient.markReady(attempt.id, {
                instructionsAccepted: true,
                systemCheck,
                ...(mode === "PROCTORED"
                  ? {
                      proctorConsent: {
                        accepted: true,
                        version: test.proctorPolicy.consentVersion,
                      },
                    }
                  : {}),
              })
              handoff.current = true
              navigate(`/project-neet/attempts/${attempt.id}`)
            })
          }
        />
      )}
      {step !== "candidate" && (
        <button
          type="button"
          className="pn-btn pn-btn-secondary"
          disabled={busy}
          onClick={() => {
            proctorMediaStore.stopAll()
            setGrant(null)
            setAccepted(false)
            setStep("mode")
          }}
        >
          Change mode
        </button>
      )}
    </div>
  )
}
export default function NeetOnboarding() {
  const { testId } = useParams()
  const resource = useNeetResource(
    async ({ signal }) => {
      const [test, list] = await Promise.all([
        neetClient.getTest(testId, { signal }),
        neetClient.listAttempts({ testId, signal }),
      ])
      const open = list.attempts.find((item) =>
        ["REGISTERED", "READY", "IN_PROGRESS"].includes(item.status)
      )
      return {
        test,
        existing: open
          ? await neetClient.getAttempt(open.id, { signal })
          : null,
      }
    },
    [testId]
  )
  return (
    <ProjectNeetShell compactHeader>
      <div className="mx-auto w-full max-w-4xl px-5 py-10">
        <NeetResourceStatus resource={resource} />
        {resource.status === "success" && (
          <>
            <Link to="/project-neet/mocks" className="text-sm text-neet-muted">
              ← Mock tests
            </Link>
            <h1 className="pn-display mt-5 mb-8 text-4xl font-bold">
              {resource.data.test.title}
            </h1>
            <OnboardingFlow key={testId} {...resource.data} />
          </>
        )}
      </div>
    </ProjectNeetShell>
  )
}
