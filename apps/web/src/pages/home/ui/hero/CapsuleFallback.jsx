import { useId } from "react"

import {
  CAMERA_FOV,
  CHARACTERS,
  FRAME,
  FRAME_HEIGHT,
  FRAME_WIDTH,
} from "./capsuleLayout"

// Static rendering of the two capsule characters at rest. It is the complete
// experience without WebGL, and sits underneath the canvas until the first
// 3D frame is ready. Colours were sampled from the reference captures.
const PALETTES = {
  tall: {
    body: "#424141",
    edge: "#5f5e5d",
    rim: "#bdbcb8",
    stripOpacity: 0.38,
    bounce: "#5a4ef2",
  },
  short: {
    body: "#736aec",
    edge: "#8a83ee",
    rim: "#cdcbe9",
    stripOpacity: 0.36,
    bounce: "#6a5ff6",
  },
}

const toX = (x) => x - FRAME.left
const toY = (y) => FRAME.top - y

// Same perspective as the scene camera, so the eyes (which sit on the front
// of each capsule) line up with the rendered ones.
const CAMERA_DISTANCE =
  FRAME_HEIGHT / 2 / Math.tan((CAMERA_FOV * Math.PI) / 360)
const CENTER_X = (FRAME.left + FRAME.right) / 2
const CENTER_Y = (FRAME.bottom + FRAME.top) / 2
const project = (x, y, z) => {
  const scale = CAMERA_DISTANCE / (CAMERA_DISTANCE - z)
  return {
    x: CENTER_X + (x - CENTER_X) * scale,
    y: CENTER_Y + (y - CENTER_Y) * scale,
    scale,
  }
}

function Capsule({ spec, id }) {
  const palette = PALETTES[spec.id]
  const { radius: r, height } = spec
  const left = toX(spec.x - r)
  const centerX = toX(spec.x)
  const top = toY(height)
  const bottom = toY(0)
  const domeY = top + r
  const baseY = bottom - r
  const strip = r * 0.6
  const lower = bottom - r * 0.6
  const angle = Math.asin(spec.eyeSpread)
  const bounce = (degrees) => {
    const radians = (degrees * Math.PI) / 180
    return `${centerX + Math.cos(radians) * r * 0.97} ${baseY + Math.sin(radians) * r * 0.97}`
  }
  return (
    <g>
      <defs>
        <linearGradient id={`${id}-body`} x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor={palette.rim} />
          <stop offset="0.035" stopColor={palette.edge} />
          <stop offset="0.09" stopColor={palette.body} />
          <stop offset="0.91" stopColor={palette.body} />
          <stop offset="0.965" stopColor={palette.edge} />
          <stop offset="1" stopColor={palette.rim} />
        </linearGradient>
        <linearGradient id={`${id}-strip`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#ffffff" stopOpacity="1" />
          <stop offset="0.75" stopColor="#ffffff" stopOpacity="1" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
        <clipPath id={`${id}-clip`}>
          <rect x={left} y={top} width={r * 2} height={height} rx={r} />
        </clipPath>
      </defs>
      <rect
        x={left}
        y={top}
        width={r * 2}
        height={height}
        rx={r}
        fill={`url(#${id}-body)`}
        filter={`url(#${id}-soft)`}
      />
      <g clipPath={`url(#${id}-clip)`}>
        {/* Violet bounce along the base. */}
        <path
          d={`M ${bounce(142)} A ${r * 0.97} ${r * 0.97} 0 0 0 ${bounce(38)}`}
          fill="none"
          stroke={palette.bounce}
          strokeWidth={r * 0.1}
          strokeLinecap="round"
          filter={`url(#${id}-soft)`}
        />
        <path
          d={`M ${centerX - strip} ${lower} V ${domeY} A ${strip} ${strip} 0 0 1 ${centerX + strip} ${domeY} V ${lower}`}
          fill="none"
          stroke={`url(#${id}-strip)`}
          strokeOpacity={palette.stripOpacity}
          strokeWidth={r * 0.13}
        />
        <circle
          cx={centerX + r * 0.2}
          cy={domeY - r * 0.36}
          r={r * 0.04}
          fill="#ffffff"
          opacity="0.85"
          filter={`url(#${id}-soft)`}
        />
      </g>
      {[-1, 1].map((side) => {
        const eye = project(
          spec.x + side * Math.sin(angle) * r,
          spec.eyeY * height,
          Math.cos(angle) * r
        )
        return (
          <ellipse
            key={side}
            cx={toX(eye.x)}
            cy={toY(eye.y)}
            rx={spec.eyeWidth * r * eye.scale}
            ry={spec.eyeHeight * r * eye.scale}
            fill="#ffffff"
          />
        )
      })}
    </g>
  )
}

export default function CapsuleFallback({ className = "" }) {
  const id = useId().replace(/:/g, "")
  return (
    <svg
      className={className}
      viewBox={`0 0 ${FRAME_WIDTH} ${FRAME_HEIGHT}`}
      preserveAspectRatio="xMidYMid meet"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        {CHARACTERS.map((spec) => (
          <filter
            key={spec.id}
            id={`${id}-${spec.id}-soft`}
            x="-10%"
            y="-10%"
            width="120%"
            height="120%"
          >
            <feGaussianBlur stdDeviation={spec.radius * 0.012} />
          </filter>
        ))}
      </defs>
      {CHARACTERS.map((spec) => (
        <Capsule key={spec.id} spec={spec} id={`${id}-${spec.id}`} />
      ))}
    </svg>
  )
}
