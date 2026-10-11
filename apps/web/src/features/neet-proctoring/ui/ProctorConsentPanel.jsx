import { useId, useState } from "react"

const Item = ({ children, title }) => (
  <div className="rounded-2xl border border-neet-line bg-neet-surface/60 p-5">
    <h3 className="font-bold text-neet-ink">{title}</h3>
    <div className="mt-2 space-y-2 text-[0.95rem] leading-6 text-neet-muted">
      {children}
    </div>
  </div>
)

// Plain-language monitoring notice. Nothing is accessed until the student
// ticks the consent box and presses the consent button.
export function ProctorConsentPanel({ onAccept, onBack, policy }) {
  const checkboxId = useId()
  const adultId = useId()
  const [agreed, setAgreed] = useState(false)
  const [adult, setAdult] = useState(false)
  const { monitoring, requirements, signals, warnings } = policy

  const devices = [
    requirements.camera && "your camera",
    requirements.microphone && "your microphone",
    requirements.screenShare && "a share of your entire screen",
  ].filter(Boolean)

  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-2">
        <Item title="What is accessed">
          <p>
            {devices.length
              ? `During the exam, Prahit NEET Mocks will use ${devices.join(", ")}`
              : "No camera, microphone or screen is accessed"}
            {requirements.fullscreen
              ? ", and the exam runs in full screen."
              : "."}
          </p>
          <p>
            Your browser will ask for permission. You can decline; monitored
            mode will then be unavailable and practice mode remains open to you.
          </p>
        </Item>
        <Item title="Why">
          <p>
            To help you rehearse disciplined exam conditions. Monitoring is a
            deterrent and a set of signals — not proof of anything, and not a
            lock on your computer.
          </p>
        </Item>
        <Item title="What is monitored">
          <ul className="list-disc space-y-1 pl-5">
            {monitoring.visibility && <li>Switching away from the exam tab</li>}
            {monitoring.focus && <li>The exam window losing focus</li>}
            {requirements.fullscreen && <li>Leaving full screen</li>}
            {monitoring.clipboard && <li>Copy and paste attempts</li>}
            {monitoring.duplicateSessions && (
              <li>Opening this attempt in another tab or window</li>
            )}
            {requirements.screenShare && <li>Screen sharing being stopped</li>}
            {monitoring.faceSignals && requirements.camera && (
              <li>
                Camera visibility problems lasting about{" "}
                {signals.faceAbsentSeconds} seconds. Face-count signals are
                available only in browsers with a face detector; other browsers
                check camera lighting/obstruction only. Head pose is not
                measured.
              </li>
            )}
            {monitoring.audioSignals && requirements.microphone && (
              <li>
                Sustained sound for about {signals.audioActivitySeconds} seconds
                or longer
              </li>
            )}
            {monitoring.network && (
              <li>
                Your connection going offline or back online (never counted
                against you)
              </li>
            )}
          </ul>
        </Item>
        <Item title="What is stored">
          <p>
            <strong className="text-neet-ink">
              No video, audio or screen images are recorded, uploaded or stored.
            </strong>{" "}
            Camera and microphone are analysed on your device in real time.
          </p>
          <p>
            We store only short event records (type, time and a basic reason)
            with your attempt, kept for up to 180 days.
          </p>
          <p>There is no face recognition and no biometric identification.</p>
        </Item>
      </div>

      <Item title="Notices and human review">
        <p>
          Brief, natural movements never raise notices. Repeated or sustained
          signals lead to calm notices, then stronger ones.
        </p>
        <p>
          Monitoring{" "}
          <strong className="text-neet-ink">
            never submits, ends or cancels your exam
          </strong>
          , and it never changes your score. After {warnings.maxWarnings}{" "}
          counted notice
          {warnings.maxWarnings === 1 ? "" : "s"}, further counted signals flag
          this attempt for review by a person. Counted signals are tab switches,
          leaving full screen, repeated focus loss, copy/paste, opening this
          attempt in a second live window
          {requirements.screenShare ? ", and stopping screen sharing" : ""}.
          Refreshing this same tab is not counted.
        </p>
        <p>
          Camera and audio signals are uncertain, so they only produce notices
          and are never counted.
        </p>
        <p>Losing your internet connection is never treated as a violation.</p>
        <p>The exam is submitted automatically only when its timer ends.</p>
      </Item>

      <p className="rounded-2xl border border-neet-sun/40 bg-neet-sun/10 p-4 text-sm leading-6 text-neet-ink">
        Monitored mode is available only to candidates aged 18 or over. Practice
        mode is open to everyone. Browser monitoring has real limits: it cannot
        see other devices or lock your computer.
      </p>

      <div className="flex items-start gap-3 rounded-2xl border border-neet-line bg-neet-surface-muted/50 p-4">
        <input
          id={adultId}
          type="checkbox"
          checked={adult}
          onChange={(event) => setAdult(event.target.checked)}
          className="mt-1 h-5 w-5 flex-none accent-[rgb(var(--pn-accent))]"
        />
        <label htmlFor={adultId} className="leading-6 font-semibold">
          I confirm I am 18 years of age or older.
        </label>
      </div>

      <div className="flex items-start gap-3 rounded-2xl border border-neet-line bg-neet-surface-muted/50 p-4">
        <input
          id={checkboxId}
          type="checkbox"
          checked={agreed}
          onChange={(event) => setAgreed(event.target.checked)}
          className="mt-1 h-5 w-5 flex-none accent-[rgb(var(--pn-accent))]"
        />
        <label htmlFor={checkboxId} className="leading-6 font-semibold">
          I understand what is monitored and stored, and I consent to monitoring
          for this mock attempt.
        </label>
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          className="pn-btn pn-btn-primary pn-btn-lg"
          disabled={!agreed || !adult}
          onClick={() => onAccept({ adultConfirmed: true })}
        >
          I consent — check my devices
        </button>
        <button
          type="button"
          className="pn-btn pn-btn-secondary pn-btn-lg"
          onClick={onBack}
        >
          Choose practice mode instead
        </button>
      </div>
    </div>
  )
}
