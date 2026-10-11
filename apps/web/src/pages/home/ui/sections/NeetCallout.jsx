import { SoftCloud } from "@/shared/ui/illustrations/Doodles"
import { Link } from "react-router"

// Small original spot illustration: answer sheet, pencil and a check badge.
function AnswerSheetSpot({ className = "" }) {
  const rows = [
    [1, 0, 0, 0],
    [0, 0, 1, 0],
    [0, 1, 0, 0],
    [0, 0, 0, 1],
  ]
  return (
    <svg
      viewBox="0 0 260 150"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <g fill="#f0645a" opacity="0.8">
        <rect x="18" y="20" width="3" height="9" rx="1.5" />
        <rect x="236" y="48" width="3" height="9" rx="1.5" />
        <rect x="200" y="12" width="3" height="8" rx="1.5" />
      </g>
      <g fill="#1a66cc" opacity="0.7">
        <rect
          x="40"
          y="8"
          width="3"
          height="8"
          rx="1.5"
          transform="rotate(-30 41 12)"
        />
        <rect x="224" y="24" width="3" height="8" rx="1.5" />
        <circle cx="30" cy="120" r="3" />
      </g>
      <g transform="rotate(-8 130 78)">
        <rect
          x="72"
          y="16"
          width="112"
          height="128"
          rx="10"
          fill="#ffffff"
          stroke="#cfdcef"
          strokeWidth="2"
        />
        <rect x="86" y="30" width="56" height="7" rx="3.5" fill="#1a66cc" />
        {rows.map((row, rowIndex) =>
          row.map((filled, column) => (
            <circle
              key={`${rowIndex}-${column}`}
              cx={96 + column * 22}
              cy={58 + rowIndex * 21}
              r="7"
              fill={filled ? "#1a66cc" : "#ffffff"}
              stroke={filled ? "#1a66cc" : "#b9c6da"}
              strokeWidth="1.6"
            />
          ))
        )}
      </g>
      <g transform="rotate(38 196 92)">
        <rect x="186" y="42" width="18" height="86" rx="3" fill="#ffd23f" />
        <rect x="186" y="42" width="18" height="12" rx="3" fill="#f59ab0" />
        <rect x="186" y="54" width="18" height="5" fill="#c7cfdb" />
        <path d="M186 128h18l-9 18Z" fill="#f4d9b4" />
        <path d="M192 140h6l-3 6Z" fill="#2a2133" />
      </g>
      <circle cx="62" cy="40" r="17" fill="#17a589" />
      <path
        d="M54 40l6 6 11-12"
        fill="none"
        stroke="#ffffff"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

// Bordered call-out between soft clouds, linking to the Prahit NEET Mocks space.
export default function NeetCallout() {
  return (
    <section
      className="sn-block relative overflow-hidden"
      aria-labelledby="neet-callout-title"
    >
      <SoftCloud className="absolute top-8 -left-4 hidden w-[16.5rem] md:block" />
      <SoftCloud className="absolute -right-2 bottom-2 hidden w-60 md:block lg:right-24" />
      <div className="sn-container relative">
        <div className="mx-auto grid max-w-[56rem] items-center gap-6 rounded-xl border border-brand-primary bg-white px-8 py-8 text-center md:grid-cols-[minmax(0,1fr)_16rem] md:py-9 md:text-left">
          <div className="md:order-first">
            <h2
              id="neet-callout-title"
              className="sn-subheading mx-auto max-w-[27rem] md:mx-0"
            >
              Preparing for NEET? Rehearse with full-length mock tests
            </h2>
            <Link
              to="/neet"
              className="sn-btn sn-btn-primary mt-6 w-full max-w-60"
            >
              Explore Prahit NEET Mocks
            </Link>
          </div>
          <AnswerSheetSpot className="order-first mx-auto w-60 md:order-none" />
        </div>
      </div>
    </section>
  )
}
