import { EditorialHeading } from "@/widgets/marketing"

// Line icons drawn for Prahit features, in the reference's coloured
// circles. Decorative: each item's heading carries the meaning.
const stroke = {
  fill: "none",
  stroke: "#16181d",
  strokeWidth: 2.4,
  strokeLinecap: "round",
  strokeLinejoin: "round",
}
const ICONS = {
  curriculum: (
    <>
      <rect
        x="30"
        y="26"
        width="40"
        height="32"
        rx="3"
        {...stroke}
        fill="#fff"
      />
      <path
        d="M38 36h4M46 36h16M38 44h4M46 44h12M38 52h4M46 52h14"
        {...stroke}
      />
      <path d="M44 58l-6 16M56 58l6 16M50 58v12" {...stroke} />
    </>
  ),
  progress: (
    <>
      <path d="M28 72h46" {...stroke} />
      <rect
        x="32"
        y="56"
        width="8"
        height="16"
        rx="1.5"
        {...stroke}
        fill="#fff"
      />
      <rect
        x="45"
        y="48"
        width="8"
        height="24"
        rx="1.5"
        {...stroke}
        fill="#fff"
      />
      <rect
        x="58"
        y="40"
        width="8"
        height="32"
        rx="1.5"
        {...stroke}
        fill="#fff"
      />
      <path d="M32 46l12-10 8 6 16-14" {...stroke} />
      <path d="M62 28h6v6" {...stroke} />
      <circle cx="36" cy="30" r="7" {...stroke} fill="#fff" />
      <path d="M33 30l2.4 2.4 4-4.4" {...stroke} />
    </>
  ),
  instructor: (
    <>
      <rect
        x="44"
        y="26"
        width="30"
        height="22"
        rx="2"
        {...stroke}
        fill="#fff"
      />
      <path d="M50 34h18M50 40h10" {...stroke} />
      <circle cx="34" cy="38" r="7" {...stroke} fill="#fff" />
      <path d="M22 72c0-12 5-18 12-18s10 4 12 8l8-8" {...stroke} />
      <circle cx="66" cy="62" r="9" {...stroke} fill="#fff" />
      <path d="M62 62l3 3 5-6" {...stroke} />
    </>
  ),
  pace: (
    <>
      <rect
        x="26"
        y="34"
        width="40"
        height="28"
        rx="3"
        {...stroke}
        fill="#fff"
      />
      <path d="M42 42v12l10-6z" {...stroke} />
      <path d="M20 68h52" {...stroke} />
      <circle cx="70" cy="32" r="9" {...stroke} fill="#fff" />
      <path d="M70 27v5l3 3" {...stroke} />
    </>
  ),
}
const FEATURES = [
  [
    "curriculum",
    "#6cb6f5",
    "Structured curricula",
    "Sections and lessons you can preview before you enrol.",
  ],
  [
    "progress",
    "#4cd36a",
    "Progress tracking",
    "Completed lessons saved to your learning dashboard.",
  ],
  [
    "instructor",
    "#f4604f",
    "Approved instructors",
    "Courses are created by instructors approved to teach.",
  ],
  [
    "pace",
    "#fbd645",
    "Learn at your pace",
    "Recorded video lessons you can revisit any time.",
  ],
]

export default function Differentiators() {
  return (
    <section className="sn-diff" aria-labelledby="services-different">
      <span className="sn-diff-dot sn-diff-dot-coral" aria-hidden="true" />
      <span className="sn-diff-dot sn-diff-dot-sun" aria-hidden="true" />
      <EditorialHeading
        id="services-different"
        title="What makes Prahit different?"
        intro="Every course is built by an approved instructor and organised into a clear curriculum. Learn through recorded lessons at your own pace, and let your saved progress show you what comes next."
      />
      <ul className="sn-diff-grid">
        {FEATURES.map(([icon, color, title, text]) => (
          <li key={title}>
            <svg
              viewBox="0 0 100 100"
              className="sn-diff-icon"
              aria-hidden="true"
              focusable="false"
            >
              <circle cx="50" cy="50" r="48" fill={color} />
              {ICONS[icon]}
            </svg>
            <h3>{title}</h3>
            <p>{text}</p>
          </li>
        ))}
      </ul>
    </section>
  )
}
