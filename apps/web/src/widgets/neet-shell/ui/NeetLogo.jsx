// Original Prahit NEET Mocks mark: a pulse line resolving into a rising arc,
// suggesting a heartbeat that becomes forward momentum.
export function NeetMark({ className = "h-8 w-8" }) {
  return (
    <svg
      viewBox="0 0 40 40"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <rect
        x="1"
        y="1"
        width="38"
        height="38"
        rx="12"
        fill="rgb(var(--pn-accent))"
      />
      <path
        d="M7 22h6.5l2.6-6.5 4.2 13 3.4-9.5 1.9 3H33"
        fill="none"
        stroke="rgb(var(--pn-accent-ink))"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="33" cy="22" r="2.4" fill="rgb(var(--pn-accent-ink))" />
    </svg>
  )
}

export function NeetWordmark({ className = "" }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <NeetMark />
      <span className="flex flex-col leading-none">
        <span className="text-[0.62rem] font-bold tracking-[0.32em] text-neet-muted uppercase">
          Prahit
        </span>
        <span className="pn-display text-[1.32rem] font-extrabold tracking-tight">
          NEET Mocks
        </span>
      </span>
    </span>
  )
}
