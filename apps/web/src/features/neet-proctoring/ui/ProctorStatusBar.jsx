import { FiCamera, FiMic, FiMonitor, FiShield } from "react-icons/fi"

const DEVICE_LABELS = {
  camera: "Camera",
  microphone: "Microphone",
  screen: "Screen share",
}
const STATE_LABELS = {
  live: "on",
  interrupted: "interrupted",
  missing: "not connected",
}

// Compact, non-animated proctoring indicator for the exam header. Each
// device state is conveyed by text and a symbol, not color alone.
export function ProctorStatusBar({
  devices,
  fullscreen,
  fullscreenRequired,
  maxWarnings,
  warningCount,
}) {
  const items = Object.entries(devices).filter(
    ([, state]) => state !== "not-required"
  )
  const healthy =
    items.every(([, state]) => state === "live") &&
    (!fullscreenRequired || fullscreen)
  const description = [
    ...items.map(
      ([kind, state]) => `${DEVICE_LABELS[kind]} ${STATE_LABELS[state]}`
    ),
    fullscreenRequired ? `Full screen ${fullscreen ? "on" : "off"}` : null,
  ]
    .filter(Boolean)
    .join(", ")

  return (
    <div
      className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-semibold ${
        healthy
          ? "border-neet-line text-neet-muted"
          : "border-neet-warning text-neet-warning"
      }`}
      role="status"
      aria-label={`Proctored mode. ${description}. Warnings ${warningCount ?? 0} of ${maxWarnings}.`}
    >
      <FiShield aria-hidden="true" />
      <span className="hidden lg:inline">Proctored</span>
      <span aria-hidden="true" className="flex items-center gap-1">
        {items.map(([kind, state]) => (
          <span
            key={kind}
            className="flex items-center"
            title={`${DEVICE_LABELS[kind]}: ${STATE_LABELS[state]}`}
          >
            {kind === "camera" ? (
              <FiCamera />
            ) : kind === "microphone" ? (
              <FiMic />
            ) : (
              <FiMonitor />
            )}
            {state !== "live" && <span className="text-neet-warning">!</span>}
          </span>
        ))}
      </span>
      <span
        aria-hidden="true"
        className="pn-tabular rounded-full bg-neet-surface-muted px-2 text-neet-ink"
      >
        {warningCount ?? 0}/{maxWarnings}
      </span>
    </div>
  )
}
