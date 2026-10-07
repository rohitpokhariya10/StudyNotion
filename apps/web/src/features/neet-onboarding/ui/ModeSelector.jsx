import { useId } from "react"

const MODES = [
  {
    value: "NON_PROCTORED",
    title: "Practice mode",
    kicker: "Serious practice, no monitoring",
    points: [
      "Server-kept timer and autosave",
      "Digital OMR and review marking",
      "Full result and subject breakdown",
      "No camera or microphone needed",
    ],
  },
  {
    value: "PROCTORED",
    title: "Proctored mode",
    kicker: "Rehearse disciplined exam conditions",
    points: [
      "Everything in practice mode",
      "Full screen, tab and focus monitoring",
      "Camera and microphone activity signals, analysed on your device",
      "Calm warnings, with policy-based submission if limits are exceeded",
    ],
  },
]

const requirementLabels = (policy) =>
  [
    policy?.requirements?.camera && "camera",
    policy?.requirements?.microphone && "microphone",
    policy?.requirements?.fullscreen && "full screen",
    policy?.requirements?.screenShare && "screen sharing",
  ].filter(Boolean)

// Accessible radio group rendered as two comparison cards.
export function ModeSelector({
  availableModes,
  onChange,
  proctorPolicy,
  proctoredSupport,
  value,
}) {
  const groupId = useId()
  return (
    <fieldset className="space-y-4">
      <legend className="sr-only">Choose an exam mode</legend>
      <div className="grid gap-4 md:grid-cols-2">
        {MODES.map((mode) => {
          const offered = availableModes.includes(mode.value)
          const unsupported =
            mode.value === "PROCTORED" &&
            proctoredSupport &&
            !proctoredSupport.supported
          const disabled = !offered || unsupported
          const checked = value === mode.value
          const inputId = `${groupId}-${mode.value}`
          const requirements =
            mode.value === "PROCTORED" ? requirementLabels(proctorPolicy) : []
          return (
            <label
              key={mode.value}
              htmlFor={inputId}
              className={`pn-card relative flex cursor-pointer flex-col gap-4 p-6 transition-[border-color,transform] ${
                checked
                  ? "border-neet-accent shadow-[0_0_0_1px_rgb(var(--pn-accent))]"
                  : ""
              } ${disabled ? "cursor-not-allowed opacity-60" : "hover:-translate-y-0.5"}`}
            >
              <input
                id={inputId}
                type="radio"
                name={groupId}
                value={mode.value}
                aria-label={mode.title}
                checked={checked}
                disabled={disabled}
                onChange={() => onChange(mode.value)}
                className="absolute top-7 right-6 z-10 h-7 w-7 cursor-pointer accent-[rgb(var(--pn-accent))]"
              />
              <span className="flex items-start justify-between gap-3">
                <span>
                  <span className="pn-eyebrow text-neet-accent">
                    {mode.kicker}
                  </span>
                  <span className="pn-display mt-2 block text-3xl font-bold">
                    {mode.title}
                  </span>
                </span>
                <span
                  aria-hidden="true"
                  className={`invisible mt-1 grid h-7 w-7 flex-none place-items-center rounded-full border-2 ${
                    checked
                      ? "border-neet-accent bg-neet-accent"
                      : "border-neet-line"
                  }`}
                >
                  {checked && (
                    <span className="h-2.5 w-2.5 rounded-full bg-neet-accent-ink" />
                  )}
                </span>
              </span>
              <ul className="space-y-2 text-[0.95rem] leading-6 text-neet-muted">
                {mode.points.map((point) => (
                  <li key={point} className="flex gap-2">
                    <span aria-hidden="true" className="text-neet-accent">
                      ✓
                    </span>
                    {point}
                  </li>
                ))}
              </ul>
              {requirements.length > 0 && (
                <p className="text-sm font-semibold text-neet-ink">
                  Requires: {requirements.join(", ")}. No video or audio is
                  recorded or stored.
                </p>
              )}
              {!offered && (
                <p className="text-sm font-semibold text-neet-warning">
                  Not offered for this mock.
                </p>
              )}
              {offered && unsupported && (
                <p className="text-sm font-semibold text-neet-warning">
                  {proctoredSupport.reason}
                </p>
              )}
            </label>
          )
        })}
      </div>
    </fieldset>
  )
}
