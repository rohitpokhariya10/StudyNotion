import { MEDIA_ERROR_GUIDANCE } from "@/features/neet-proctoring/lib/mediaAccess"
import { useState } from "react"

const LABELS = {
  camera: "Camera",
  microphone: "Microphone",
  screen: "Screen sharing",
}

// Shown when required monitoring is not active (for example after a reload,
// a device change, or leaving full screen). The timer keeps running; the
// student restores monitoring with explicit clicks (browsers require a user
// gesture for full screen and screen sharing).
export function MonitoringOverlay({
  devices,
  fullscreen,
  fullscreenRequired,
  onContinueWithout,
  onEnterFullscreen,
  onReconnect,
}) {
  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState(null)
  const missing = Object.entries(devices).filter(
    ([, state]) => state === "missing" || state === "interrupted"
  )
  const needsFullscreen = fullscreenRequired && !fullscreen
  if (!missing.length && !needsFullscreen) return null

  const reconnect = async (kind) => {
    setBusy(kind)
    try {
      await onReconnect(kind)
      setErrors((current) => ({ ...current, [kind]: null }))
    } catch (error) {
      setErrors((current) => ({ ...current, [kind]: error?.kind || "UNKNOWN" }))
    } finally {
      setBusy(null)
    }
  }

  return (
    <div
      className="fixed inset-0 z-[900] grid place-items-center bg-neet-canvas/95 p-4 backdrop-blur-sm"
      role="region"
      aria-label="Restore exam monitoring"
    >
      <div className="w-full max-w-lg rounded-2xl border border-neet-line bg-neet-surface p-6 shadow-xl">
        <h2 className="text-2xl font-bold">Restore exam monitoring</h2>
        <p className="mt-2 leading-7 text-neet-muted">
          Your timer is still running and your answers are safe. Restore the
          items below to continue.
        </p>
        <ul className="mt-5 space-y-3">
          {needsFullscreen && (
            <li className="flex items-center justify-between gap-3 rounded-xl border border-neet-line p-3">
              <span className="font-semibold">Full screen is off</span>
              <button
                type="button"
                className="pn-btn pn-btn-primary"
                onClick={onEnterFullscreen}
              >
                Return to full screen
              </button>
            </li>
          )}
          {missing.map(([kind, state]) => {
            const guidance = errors[kind]
              ? MEDIA_ERROR_GUIDANCE[errors[kind]]
              : null
            return (
              <li key={kind} className="rounded-xl border border-neet-line p-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-semibold">
                    {LABELS[kind]}{" "}
                    {state === "missing" ? "not connected" : "interrupted"}
                  </span>
                  <button
                    type="button"
                    className="pn-btn pn-btn-secondary"
                    disabled={busy === kind}
                    onClick={() => reconnect(kind)}
                  >
                    {busy === kind
                      ? "Connecting…"
                      : kind === "screen"
                        ? "Share screen"
                        : "Reconnect"}
                  </button>
                </div>
                {guidance && (
                  <p className="mt-2 text-sm text-neet-warning">
                    {guidance.title}. {guidance.help}
                  </p>
                )}
              </li>
            )
          })}
        </ul>
        {missing.length > 0 && !needsFullscreen && (
          <button
            type="button"
            className="mt-5 text-sm font-semibold text-neet-muted underline underline-offset-4"
            onClick={onContinueWithout}
          >
            My device isn't working — continue without it (this will be
            recorded)
          </button>
        )}
      </div>
    </div>
  )
}
