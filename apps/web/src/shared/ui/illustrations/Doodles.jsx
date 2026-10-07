import cloudArtwork from "@/shared/assets/editorial/cloud.svg"

// Small hand-drawn accents shared by the public pages: marker underlines,
// sketch numerals, dashed connector arrows, soft clouds and squiggles.
// The cloud uses the supplied SVG asset; the other accents are original.
// All are decorative and hidden from assistive technology.

const BLUE = "#1a66cc"

export function MarkerUnderline({ className = "" }) {
  return (
    <svg
      viewBox="0 0 400 20"
      preserveAspectRatio="none"
      className={`block h-3 ${className}`}
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M4 8C92 4 214 3 396 6"
        fill="none"
        stroke={BLUE}
        strokeWidth="3.2"
        strokeLinecap="round"
      />
      <path
        d="M70 13c88-3 196-5 300-4"
        fill="none"
        stroke={BLUE}
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.85"
      />
    </svg>
  )
}

// Long pen stroke that doubles back on itself, used under editorial headings.
// It inherits `currentColor`, so headings on blue bands can draw it in white.
export function SketchUnderline({ className = "" }) {
  return (
    <svg
      viewBox="0 0 520 14"
      preserveAspectRatio="none"
      className={`block ${className}`}
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M2 4C136 6 329 10 516 4c-1 4-104 4-141 5C246 8 165 7 56 10c99 1 244-3 329-2"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

// Outlined numeral drawn twice with a slight offset, like a pen doodle.
export function SketchNumber({ className = "", value }) {
  return (
    <svg
      viewBox="0 0 40 40"
      className={`h-10 w-10 ${className}`}
      aria-hidden="true"
      focusable="false"
    >
      <circle
        cx="20"
        cy="20"
        r="16"
        fill="none"
        stroke={BLUE}
        strokeWidth="1"
        strokeDasharray="2.5 2.5"
        opacity="0.55"
      />
      {[0, 1.4].map((offset) => (
        <text
          key={offset}
          x={20 + offset}
          y={28 + offset * 0.4}
          textAnchor="middle"
          fontFamily="Poppins, sans-serif"
          fontSize="24"
          fontWeight="600"
          fill="none"
          stroke={BLUE}
          strokeWidth="1"
          opacity={offset ? 0.5 : 1}
        >
          {value}
        </text>
      ))}
    </svg>
  )
}

// Dashed curve that leads the eye from one zig-zag row to the next.
export function DashedConnector({ className = "", direction = "right" }) {
  const path =
    direction === "right"
      ? "M226 6c0 46 40 54 220 50s210 6 222 42"
      : "M926 6c0 44-40 52-240 50S460 52 452 98"
  const head =
    direction === "right" ? "M656 86l12 14 8-17" : "M444 84l8 16 13-11"
  return (
    <svg
      viewBox="0 0 1152 108"
      className={`h-auto w-full ${className}`}
      aria-hidden="true"
      focusable="false"
    >
      <g
        fill="none"
        stroke="#c6ccd6"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d={path} strokeDasharray="11 10" />
        <path d={head} />
      </g>
    </svg>
  )
}

export function SoftCloud({ className = "" }) {
  return (
    <img
      src={cloudArtwork}
      width="458"
      height="283"
      className={`pointer-events-none h-auto select-none ${className}`}
      alt=""
      aria-hidden="true"
      decoding="async"
      draggable={false}
    />
  )
}

export function Squiggle({ className = "" }) {
  return (
    <svg
      viewBox="0 0 48 48"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M6 38c6-22 22-32 28-24 6 9-14 18-14 6 0-10 14-16 22-12"
        fill="none"
        stroke="#f0645a"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  )
}
