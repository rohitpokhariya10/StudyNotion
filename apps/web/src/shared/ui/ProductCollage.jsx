import { useId } from "react"

// Original StudyNotion visual system: layered fragments of the product's own
// interface (course cards, progress, lesson lists, results) floating over
// soft background shapes. Decorative only; every variant is pure SVG.

const INK = "#101828"
const MUTED = "#98a2b3"
const BLUE = "#1a66cc"
const BLUE_SOFT = "#e8f1fe"
const LINE = "#e3e8ef"
const SUN = "#ffd23f"
const CORAL = "#f0645a"
const MINT = "#2bb17a"

function Backdrop({ ids }) {
  return (
    <>
      <path
        d="M78 116c22-62 104-92 190-80 70 10 110-18 168 6 66 28 82 108 52 172-26 56-6 102-60 140-62 44-140 14-204 26-72 14-132 8-164-48-30-52-6-98 2-138 6-28 4-50 16-78Z"
        fill={BLUE_SOFT}
      />
      <circle cx="446" cy="70" r="30" fill={SUN} />
      <circle cx="58" cy="330" r="14" fill={CORAL} opacity="0.85" />
      <circle
        cx="470"
        cy="352"
        r="46"
        fill="none"
        stroke={BLUE}
        strokeOpacity="0.25"
        strokeWidth="2"
        strokeDasharray="5 7"
      />
      <rect x="28" y="40" width="74" height="74" fill={`url(#${ids.dots})`} />
    </>
  )
}

function Defs({ ids }) {
  return (
    <defs>
      <filter id={ids.shadow} x="-20%" y="-20%" width="140%" height="150%">
        <feDropShadow
          dx="0"
          dy="10"
          stdDeviation="12"
          floodColor="#101828"
          floodOpacity="0.1"
        />
      </filter>
      <pattern
        id={ids.dots}
        width="12"
        height="12"
        patternUnits="userSpaceOnUse"
      >
        <circle cx="2" cy="2" r="1.6" fill={BLUE} opacity="0.35" />
      </pattern>
      <linearGradient id={ids.thumb} x1="0" x2="1" y1="0" y2="1">
        <stop offset="0" stopColor="#3b8bf0" />
        <stop offset="1" stopColor="#1554b0" />
      </linearGradient>
    </defs>
  )
}

const Bar = ({ fill = INK, height = 8, opacity = 0.75, width, x, y }) => (
  <rect
    x={x}
    y={y}
    width={width}
    height={height}
    rx={height / 2}
    fill={fill}
    opacity={opacity}
  />
)

const Stars = ({ x, y }) => (
  <g transform={`translate(${x} ${y})`} fill={SUN}>
    {[0, 1, 2, 3, 4].map((index) => (
      <path
        key={index}
        transform={`translate(${index * 14} 0)`}
        d="M6 0l1.8 3.8 4.2.6-3 2.9.7 4.1L6 9.5 2.3 11.4l.7-4.1-3-2.9 4.2-.6Z"
      />
    ))}
  </g>
)

const Check = ({ x, y, done = true }) => (
  <g transform={`translate(${x} ${y})`}>
    <circle
      r="9"
      fill={done ? BLUE : "#ffffff"}
      stroke={done ? BLUE : "#cfd5de"}
      strokeWidth="1.5"
    />
    {done && (
      <path
        d="M-4 0l3 3 5-6"
        fill="none"
        stroke="#ffffff"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    )}
  </g>
)

function Ring({ label, progress, r = 30, x, y }) {
  const circumference = 2 * Math.PI * r
  return (
    <g transform={`translate(${x} ${y})`}>
      <circle r={r} fill="none" stroke={LINE} strokeWidth="8" />
      <circle
        r={r}
        fill="none"
        stroke={BLUE}
        strokeWidth="8"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={circumference * (1 - progress)}
        transform="rotate(-90)"
      />
      <text
        y="5"
        textAnchor="middle"
        fontFamily="Poppins, sans-serif"
        fontSize="14"
        fontWeight="600"
        fill={INK}
      >
        {label}
      </text>
    </g>
  )
}

function CourseCard({ ids, x, y, width = 220 }) {
  return (
    <g transform={`translate(${x} ${y})`} filter={`url(#${ids.shadow})`}>
      <rect width={width} height="214" rx="14" fill="#ffffff" />
      <rect
        x="10"
        y="10"
        width={width - 20}
        height="98"
        rx="10"
        fill={`url(#${ids.thumb})`}
      />
      <circle cx={width - 44} cy="40" r="26" fill="#ffffff" opacity="0.14" />
      <path
        d={`M${width / 2 - 12} 46 l26 13 -26 13Z`}
        fill="#ffffff"
        opacity="0.95"
      />
      <Bar x={16} y={124} width={width - 70} height={10} opacity={0.85} />
      <Bar x={16} y={142} width={width - 110} fill={MUTED} opacity={0.6} />
      <Stars x={16} y={162} />
      <text
        x="16"
        y="200"
        fontFamily="Poppins, sans-serif"
        fontSize="15"
        fontWeight="600"
        fill={INK}
      >
        Self-paced
      </text>
      <rect
        x={width - 74}
        y="184"
        width="58"
        height="22"
        rx="11"
        fill={BLUE_SOFT}
      />
      <text
        x={width - 45}
        y="199"
        textAnchor="middle"
        fontFamily="Poppins, sans-serif"
        fontSize="11"
        fontWeight="600"
        fill={BLUE}
      >
        Enrol
      </text>
    </g>
  )
}

function LessonList({ ids, x, y }) {
  return (
    <g transform={`translate(${x} ${y})`} filter={`url(#${ids.shadow})`}>
      <rect width="196" height="150" rx="14" fill="#ffffff" />
      <text
        x="16"
        y="28"
        fontFamily="Poppins, sans-serif"
        fontSize="12"
        fontWeight="600"
        fill={INK}
      >
        Section 2 · Lessons
      </text>
      {[0, 1, 2].map((index) => (
        <g key={index} transform={`translate(16 ${46 + index * 34})`}>
          <rect
            width="164"
            height="26"
            rx="8"
            fill={index < 2 ? BLUE_SOFT : "#ffffff"}
            stroke={index < 2 ? "#cfe1fa" : LINE}
          />
          <Check x={14} y={13} done={index < 2} />
          <Bar
            x={30}
            y={9}
            width={[96, 80, 110][index]}
            opacity={index < 2 ? 0.55 : 0.3}
          />
        </g>
      ))}
    </g>
  )
}

function ProgressChip({ ids, x, y }) {
  return (
    <g transform={`translate(${x} ${y})`} filter={`url(#${ids.shadow})`}>
      <rect width="150" height="78" rx="14" fill="#ffffff" />
      <Ring x={40} y={39} r={22} progress={0.7} label="70%" />
      <text
        x="74"
        y="34"
        fontFamily="Poppins, sans-serif"
        fontSize="11"
        fill={MUTED}
      >
        Progress
      </text>
      <text
        x="74"
        y="54"
        fontFamily="Poppins, sans-serif"
        fontSize="14"
        fontWeight="600"
        fill={INK}
      >
        On track
      </text>
    </g>
  )
}

function Pill({
  fill = BLUE,
  ids,
  text,
  textFill = "#ffffff",
  width = 132,
  x,
  y,
}) {
  return (
    <g transform={`translate(${x} ${y})`} filter={`url(#${ids.shadow})`}>
      <rect width={width} height="36" rx="18" fill={fill} />
      <text
        x={width / 2}
        y="23"
        textAnchor="middle"
        fontFamily="Poppins, sans-serif"
        fontSize="12.5"
        fontWeight="600"
        fill={textFill}
      >
        {text}
      </text>
    </g>
  )
}

function LearningScene({ ids }) {
  return (
    <>
      <CourseCard ids={ids} x={74} y={70} />
      <LessonList ids={ids} x={300} y={158} />
      <ProgressChip ids={ids} x={316} y={56} />
      <Pill
        ids={ids}
        x={60}
        y={318}
        text="✓ Lesson complete"
        width={150}
        fill="#ffffff"
        textFill={MINT}
      />
    </>
  )
}

function TeachingScene({ ids }) {
  return (
    <>
      <g transform="translate(70 66)" filter={`url(#${ids.shadow})`}>
        <rect width="250" height="232" rx="14" fill="#ffffff" />
        <text
          x="18"
          y="32"
          fontFamily="Poppins, sans-serif"
          fontSize="13"
          fontWeight="600"
          fill={INK}
        >
          Course builder
        </text>
        {[0, 1, 2].map((section) => (
          <g key={section} transform={`translate(18 ${50 + section * 58})`}>
            <rect
              width="214"
              height="46"
              rx="10"
              fill={section === 0 ? BLUE_SOFT : "#f8fafc"}
              stroke={section === 0 ? "#cfe1fa" : LINE}
            />
            <rect
              x="12"
              y="12"
              width="22"
              height="22"
              rx="6"
              fill={section === 0 ? BLUE : "#dfe6f0"}
            />
            <Bar x={44} y={14} width={[120, 96, 132][section]} opacity={0.7} />
            <Bar
              x={44}
              y={28}
              width={70}
              fill={MUTED}
              height={6}
              opacity={0.5}
            />
          </g>
        ))}
      </g>
      <g transform="translate(292 168)" filter={`url(#${ids.shadow})`}>
        <rect width="176" height="128" rx="14" fill="#ffffff" />
        <text
          x="16"
          y="28"
          fontFamily="Poppins, sans-serif"
          fontSize="12"
          fontWeight="600"
          fill={INK}
        >
          Lecture video
        </text>
        <rect x="16" y="42" width="144" height="52" rx="8" fill={BLUE_SOFT} />
        <path d="M82 56l18 12-18 12Z" fill={BLUE} />
        <Bar x={16} y={106} width={106} height={6} fill={MUTED} />
      </g>
      <Pill ids={ids} x={300} y={86} text="Published" width={112} fill={MINT} />
    </>
  )
}

function ScienceScene({ ids }) {
  const states = [
    "a",
    "a",
    "m",
    "n",
    "a",
    "v",
    "a",
    "m",
    "a",
    "n",
    "v",
    "a",
    "a",
    "v",
    "a",
    "a",
  ]
  return (
    <>
      <g transform="translate(66 62)" filter={`url(#${ids.shadow})`}>
        <rect width="250" height="246" rx="14" fill="#ffffff" />
        <text
          x="18"
          y="32"
          fontFamily="Poppins, sans-serif"
          fontSize="13"
          fontWeight="600"
          fill={INK}
        >
          Digital OMR
        </text>
        <rect x="160" y="16" width="74" height="24" rx="12" fill={BLUE_SOFT} />
        <text
          x="197"
          y="32"
          textAnchor="middle"
          fontFamily="Poppins, sans-serif"
          fontSize="11"
          fontWeight="600"
          fill={BLUE}
        >
          02:41:09
        </text>
        {states.map((state, index) => {
          const cx = 40 + (index % 4) * 56
          const cy = 76 + Math.floor(index / 4) * 50
          const fill =
            state === "a" ? MINT : state === "m" ? "#6d4dd6" : "#ffffff"
          const stroke =
            state === "n" ? CORAL : state === "v" ? "#cfd5de" : fill
          return (
            <g key={index}>
              <circle
                cx={cx}
                cy={cy}
                r="17"
                fill={fill}
                stroke={stroke}
                strokeWidth="2"
              />
              <text
                x={cx}
                y={cy + 4.5}
                textAnchor="middle"
                fontFamily="Poppins, sans-serif"
                fontSize="12"
                fontWeight="600"
                fill={
                  state === "a" || state === "m"
                    ? "#ffffff"
                    : state === "n"
                      ? CORAL
                      : MUTED
                }
              >
                {index + 1}
              </text>
            </g>
          )
        })}
      </g>
      <g transform="translate(300 170)" filter={`url(#${ids.shadow})`}>
        <rect width="168" height="128" rx="14" fill="#ffffff" />
        <Ring x={50} y={64} r={30} progress={0.78} label="78%" />
        <text
          x="94"
          y="56"
          fontFamily="Poppins, sans-serif"
          fontSize="11"
          fill={MUTED}
        >
          Accuracy
        </text>
        <text
          x="94"
          y="78"
          fontFamily="Poppins, sans-serif"
          fontSize="15"
          fontWeight="600"
          fill={INK}
        >
          Mock 01
        </text>
      </g>
      <g
        transform="translate(370 88)"
        stroke={BLUE}
        strokeWidth="2"
        fill="none"
        opacity="0.8"
      >
        <ellipse rx="38" ry="14" />
        <ellipse rx="38" ry="14" transform="rotate(60)" />
        <ellipse rx="38" ry="14" transform="rotate(-60)" />
        <circle r="5" fill={CORAL} stroke="none" />
      </g>
    </>
  )
}

function EmptyScene({ ids }) {
  return (
    <>
      <g transform="translate(120 96)" filter={`url(#${ids.shadow})`}>
        <rect width="280" height="200" rx="16" fill="#ffffff" />
        <rect x="20" y="20" width="240" height="70" rx="10" fill={BLUE_SOFT} />
        <path d="M120 40l26 15-26 15Z" fill={BLUE} opacity="0.7" />
        <Bar x={20} y={108} width={170} height={10} opacity={0.6} />
        <Bar x={20} y={128} width={120} fill={MUTED} opacity={0.5} />
        <rect x="20" y="156" width="110" height="28" rx="8" fill={BLUE} />
      </g>
      <Pill
        ids={ids}
        x={300}
        y={70}
        text="Your next course"
        width={150}
        fill="#ffffff"
        textFill={BLUE}
      />
    </>
  )
}

function ProgressScene({ ids }) {
  const rows = [0.82, 0.46, 1]
  return (
    <>
      <g transform="translate(64 78)" filter={`url(#${ids.shadow})`}>
        <rect width="292" height="236" rx="14" fill="#ffffff" />
        <text
          x="18"
          y="32"
          fontFamily="Poppins, sans-serif"
          fontSize="13"
          fontWeight="600"
          fill={INK}
        >
          My learning
        </text>
        {rows.map((progress, index) => (
          <g key={progress} transform={`translate(18 ${52 + index * 60})`}>
            <rect width="44" height="44" rx="10" fill={`url(#${ids.thumb})`} />
            <path d="M18 15l12 7-12 7Z" fill="#ffffff" opacity="0.9" />
            <Bar x={58} y={6} width={[150, 120, 136][index]} opacity={0.7} />
            <rect x="58" y="26" width="180" height="8" rx="4" fill={LINE} />
            <rect
              x="58"
              y="26"
              width={180 * progress}
              height="8"
              rx="4"
              fill={progress === 1 ? MINT : BLUE}
            />
            {progress === 1 && <Check x={246} y={30} />}
          </g>
        ))}
      </g>
      <g transform="translate(318 46)" filter={`url(#${ids.shadow})`}>
        <rect width="160" height="80" rx="14" fill="#ffffff" />
        <circle cx="40" cy="40" r="24" fill="#fff6d6" />
        <path
          d="M30 28h20v8c0 7-4 12-10 12s-10-5-10-12Zm6 20h8v6h-8Zm-4 6h16"
          fill={SUN}
          stroke="#e0a800"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        <text
          x="74"
          y="36"
          fontFamily="Poppins, sans-serif"
          fontSize="11"
          fill={MUTED}
        >
          Course
        </text>
        <text
          x="74"
          y="54"
          fontFamily="Poppins, sans-serif"
          fontSize="14"
          fontWeight="600"
          fill={INK}
        >
          Complete
        </text>
      </g>
      <Pill
        ids={ids}
        x={312}
        y={300}
        text="Resume lesson ▸"
        width={150}
        fill={BLUE}
      />
    </>
  )
}

const SCENES = {
  learning: LearningScene,
  teaching: TeachingScene,
  science: ScienceScene,
  empty: EmptyScene,
  progress: ProgressScene,
}

export default function ProductCollage({
  backdrop = true,
  className = "",
  variant = "learning",
}) {
  const base = useId().replace(/:/g, "")
  const ids = {
    shadow: `${base}-shadow`,
    dots: `${base}-dots`,
    thumb: `${base}-thumb`,
  }
  const Scene = SCENES[variant] || LearningScene
  return (
    <svg
      viewBox="0 0 520 400"
      className={`block h-auto w-full ${className}`}
      aria-hidden="true"
      focusable="false"
    >
      <Defs ids={ids} />
      {backdrop && <Backdrop ids={ids} />}
      <Scene ids={ids} />
    </svg>
  )
}
