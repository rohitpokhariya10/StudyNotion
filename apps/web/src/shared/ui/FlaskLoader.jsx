import { useCallback, useId, useLayoutEffect } from "react"
import { toast, useToasterStore } from "react-hot-toast"

import "./flaskLoader.css"

// One cycle of the liquid, in milliseconds (matches the CSS).
const CYCLE_MS = 1920

// Interior of the flask (also the liquid's clip) and its outline, which adds
// the small outward lip at the top of the neck. Proportions follow the
// reference flask: a narrow neck about a third of the body's width, flared
// shoulders, a round bulb widest below its middle and a flattened base.
// viewBox 0 0 100 110.
const INTERIOR =
  "M36 9V43C36 51 23 57 18 64C13 70 12 76 12 82C12 90 15 97 21 101C24 103.5 26 106 30 106H70C74 106 76 103.5 79 101C85 97 88 90 88 82C88 76 87 70 82 64C77 57 64 51 64 43V9Z"
const OUTLINE =
  "M31 6C34 6 36 7 36 10V43C36 51 23 57 18 64C13 70 12 76 12 82C12 90 15 97 21 101C24 103.5 26 106 30 106H70C74 106 76 103.5 79 101C85 97 88 90 88 82C88 76 87 70 82 64C77 57 64 51 64 43V10C64 7 66 6 69 6"
// A smooth periodic wave (wavelength 80) wide enough to cover the flask at
// every point of its one-wavelength slide, filled down past the base.
const wave = (level, amplitude) => {
  const crest = level - 2 * amplitude
  const rest = [0, 40, 80, 120, 160, 200].map((x) => `T${x} ${level}`)
  return `M-80 ${level}Q-60 ${crest} -40 ${level}${rest.join("")}V120H-80Z`
}
const BACK_WAVE = wave(69, 4)
const FRONT_WAVE = wave(72, 4.5)
const BUBBLES = [
  { cx: 43, r: 2.8 },
  { cx: 56, r: 2 },
  { cx: 49, r: 2.4 },
  { cx: 61, r: 1.7 },
]

// While its loader is on screen, the loader is the operation's progress
// indicator: pending "loading" toasts raised for the same operation are
// retired before paint, so only one indicator shows. Success and error
// toasts are never touched.
function LoadingToastHandoff() {
  const { toasts } = useToasterStore()
  useLayoutEffect(() => {
    for (const item of toasts)
      if (item.type === "loading") toast.remove(item.id)
  }, [toasts])
  return null
}

const VARIANT_CLASS = {
  page: "sn-loader sn-loader-page",
  section: "sn-loader sn-loader-section",
  compact: "sn-loader sn-loader-compact",
}

/**
 * Shared loading indicator: a laboratory flask whose liquid moves in the
 * brand colour. One component covers every context:
 * - `page`: centred in the main content area (route and session loading).
 * - `section`: centred in a card or region; give the caller's wrapper the
 *   space it should reserve.
 * - `compact`: small inline indicator for menus and lists.
 * The visible `label` can be hidden with `label={false}`; `accessibleLabel`
 * gives screen readers a contextual status (it is announced once, not on
 * every animation cycle). Callers mark the region being loaded with
 * `aria-busy`. Use `tone="inverse"` on dark surfaces, and `decorative` when
 * the loader sits inside a region that already announces its status.
 * `replacesLoadingToast` lets an in-place loader stand in for the loading
 * toast raised by the same action (success/error toasts still show).
 */
export default function FlaskLoader({
  accessibleLabel,
  className = "",
  decorative = false,
  label = "Loading",
  replacesLoadingToast = false,
  tone = "default",
  variant = "section",
}) {
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, "")
  const clip = `sn-flask-${id}`
  const status = accessibleLabel || (label ? String(label) : "Loading")

  // Every loader shares one global phase, so several on screen move together
  // and a loader handed from one pending state to the next keeps flowing.
  const setPhase = useCallback((node) => {
    node?.style.setProperty(
      "--sn-flask-phase",
      `${-(performance.now() % CYCLE_MS)}ms`
    )
  }, [])

  return (
    <div
      ref={setPhase}
      className={`${VARIANT_CLASS[variant] || VARIANT_CLASS.section} ${
        tone === "inverse" ? "sn-loader-inverse" : ""
      } ${className}`}
      {...(decorative
        ? { "aria-hidden": "true" }
        : { role: "status", "aria-live": "polite", "aria-label": status })}
    >
      <svg
        className="sn-flask"
        viewBox="0 0 100 110"
        aria-hidden="true"
        focusable="false"
      >
        <defs>
          <clipPath id={clip}>
            <path d={INTERIOR} />
          </clipPath>
        </defs>
        <g clipPath={`url(#${clip})`}>
          <path className="sn-flask-wave sn-flask-wave-back" d={BACK_WAVE} />
          <path className="sn-flask-wave sn-flask-wave-front" d={FRONT_WAVE} />
          {variant !== "compact" &&
            BUBBLES.map((bubble, index) => (
              <circle
                key={bubble.cx}
                className="sn-flask-bubble"
                style={{ "--sn-bubble": index }}
                cx={bubble.cx}
                cy={70}
                r={bubble.r}
              />
            ))}
        </g>
        <path className="sn-flask-outline" d={OUTLINE} />
      </svg>
      {label && (
        <span className="sn-loader-label" aria-hidden="true">
          {label}
          <span className="sn-loader-dots">
            <span>.</span>
            <span>.</span>
            <span>.</span>
          </span>
        </span>
      )}
      {!decorative && <span className="sr-only">{status}</span>}
      {replacesLoadingToast && <LoadingToastHandoff />}
    </div>
  )
}
