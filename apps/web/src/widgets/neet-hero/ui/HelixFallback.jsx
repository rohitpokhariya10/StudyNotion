import { useMemo } from "react"

const WIDTH = 1200
const HEIGHT = 640
const MID = HEIGHT / 2

const strandPath = (phase, amplitude) => {
  const points = []
  for (let x = -40; x <= WIDTH + 40; x += 12) {
    const y = MID + Math.sin(x / 95 + phase) * amplitude
    points.push(`${x === -40 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`)
  }
  return points.join(" ")
}

const ECG_PATH =
  "M0 470 H260 l18 -16 l14 16 H340 l10 22 l16 -120 l18 150 l12 -52 H470 l26 -24 l26 24 H700 l18 -16 l14 16 H780 l10 22 l16 -120 l18 150 l12 -52 H910 l26 -24 l26 24 H1200"

// Static, CSS-only hero art: the same helix-to-heartbeat concept as the WebGL
// scene. It is the complete experience when WebGL is unavailable, disabled
// by reduced motion, or still loading.
export function HelixFallback({ animated = true, className = "" }) {
  const rungs = useMemo(() => {
    const items = []
    for (let x = 0; x <= WIDTH; x += 38) {
      const a = MID + Math.sin(x / 95) * 120
      const b = MID + Math.sin(x / 95 + Math.PI) * 120
      const depth = Math.abs(Math.cos(x / 95))
      items.push({ x, a, b, opacity: 0.12 + depth * 0.32 })
    }
    return items
  }, [])

  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      preserveAspectRatio="xMidYMid slice"
      className={`absolute inset-0 h-full w-full ${className}`}
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id="pn-strand-a" x1="0" x2="1">
          <stop offset="0" stopColor="rgb(var(--pn-accent))" stopOpacity="0" />
          <stop
            offset="0.35"
            stopColor="rgb(var(--pn-accent))"
            stopOpacity="0.9"
          />
          <stop offset="1" stopColor="rgb(var(--pn-cell))" stopOpacity="0.5" />
        </linearGradient>
        <linearGradient id="pn-strand-b" x1="0" x2="1">
          <stop offset="0" stopColor="rgb(var(--pn-cell))" stopOpacity="0" />
          <stop
            offset="0.45"
            stopColor="rgb(var(--pn-cell))"
            stopOpacity="0.8"
          />
          <stop
            offset="1"
            stopColor="rgb(var(--pn-accent))"
            stopOpacity="0.4"
          />
        </linearGradient>
        <radialGradient id="pn-glow" cx="0.68" cy="0.42" r="0.6">
          <stop
            offset="0"
            stopColor="rgb(var(--pn-accent))"
            stopOpacity="0.22"
          />
          <stop offset="1" stopColor="rgb(var(--pn-accent))" stopOpacity="0" />
        </radialGradient>
        <filter id="pn-soft" x="-10%" y="-10%" width="120%" height="120%">
          <feGaussianBlur stdDeviation="2.2" />
        </filter>
      </defs>
      <rect width={WIDTH} height={HEIGHT} fill="url(#pn-glow)" />
      <g transform={`rotate(-9 ${WIDTH / 2} ${MID})`} opacity="0.85">
        {rungs.map((rung) => (
          <line
            key={rung.x}
            x1={rung.x}
            x2={rung.x}
            y1={rung.a}
            y2={rung.b}
            stroke="rgb(var(--pn-ink))"
            strokeOpacity={rung.opacity}
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        ))}
        <path
          d={strandPath(0, 120)}
          fill="none"
          stroke="url(#pn-strand-a)"
          strokeWidth="5"
          filter="url(#pn-soft)"
        />
        <path
          d={strandPath(Math.PI, 120)}
          fill="none"
          stroke="url(#pn-strand-b)"
          strokeWidth="5"
          filter="url(#pn-soft)"
        />
        <path
          d={strandPath(0, 120)}
          fill="none"
          stroke="url(#pn-strand-a)"
          strokeWidth="2"
        />
        <path
          d={strandPath(Math.PI, 120)}
          fill="none"
          stroke="url(#pn-strand-b)"
          strokeWidth="2"
        />
      </g>
      <path
        d={ECG_PATH}
        fill="none"
        stroke="rgb(var(--pn-pulse))"
        strokeOpacity="0.55"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={animated ? "pn-ecg-line" : undefined}
        style={{ "--pn-ecg-length": 1700 }}
      />
    </svg>
  )
}
