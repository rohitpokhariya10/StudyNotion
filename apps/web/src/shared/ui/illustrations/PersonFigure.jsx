// Original flat-vector, half-body people used as "cut-out" figures that
// overlap section cards. Every figure is drawn from simple shapes on a shared
// 420×560 grid and is cropped at the bottom edge so it can sit flush on a
// section boundary. Decorative only.

const INK = "#2a2133"
const BLUE = "#1a66cc"
const SUN = "#ffd23f"

const SKIN = {
  light: ["#f7d2b6", "#e9b391"],
  medium: ["#dca27c", "#c7865f"],
  deep: ["#a9714f", "#8d5a3c"],
}

const FIGURES = {
  tablet: {
    skin: "light",
    hair: "bun",
    hairFill: "#3b2433",
    top: ["#fff1c9", "#efd48c"],
    props: ["headphones", "tablet"],
  },
  books: {
    skin: "medium",
    hair: "curly",
    hairFill: "#1f1a2b",
    top: ["#ef6f5e", "#d4574a"],
    props: ["glasses", "books"],
  },
  pointing: {
    skin: "light",
    hair: "bob",
    hairFill: "#2b1d2a",
    top: ["#26398c", "#1b2a6b"],
    props: ["pointing"],
  },
  teacher: {
    skin: "deep",
    hair: "short",
    hairFill: "#1d1720",
    top: ["#f5f8fd", "#d9e1ee"],
    props: ["beard", "glasses", "collar", "laptop", "mic"],
  },
}

function BackHair({ fill, style }) {
  if (style === "bob")
    return (
      <path
        d="M140 172C132 100 174 78 210 78s78 22 70 94c-2 38 6 68 14 84-26 10-42-4-46-20h-76c-4 16-20 30-46 20 8-16 16-46 14-84Z"
        fill={fill}
      />
    )
  if (style === "bun") return <circle cx="210" cy="90" r="30" fill={fill} />
  return null
}

function FrontHair({ fill, style }) {
  if (style === "bob")
    return (
      <path
        d="M148 170c-4-62 28-84 62-84s68 22 62 84l-4 2c-2-16-6-26-12-32h-92c-6 8-12 20-14 32Z"
        fill={fill}
      />
    )
  if (style === "bun")
    return (
      <>
        <path
          d="M150 168c-4-56 28-76 60-76 34 0 64 20 60 76-8-28-26-44-48-48-12 12-36 18-58 20-8 8-12 18-14 28Z"
          fill={fill}
        />
        <path
          d="M222 122c12 8 26 18 38 34"
          fill="none"
          stroke="#ffffff"
          strokeOpacity="0.18"
          strokeWidth="4"
          strokeLinecap="round"
        />
      </>
    )
  if (style === "curly")
    return (
      <g fill={fill}>
        <path d="M150 160c-4-56 28-76 62-76 38 0 66 22 60 74-4-14-10-24-20-30-20 6-56 6-76 0-12 6-22 18-26 32Z" />
        {[
          [166, 104, 15],
          [186, 90, 16],
          [210, 84, 16],
          [234, 88, 16],
          [256, 102, 15],
          [150, 128, 12],
          [270, 126, 12],
        ].map(([cx, cy, r]) => (
          <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={r} />
        ))}
      </g>
    )
  return (
    <path
      d="M150 158c-4-52 28-72 62-72 36 0 64 20 60 70-4-12-10-22-18-28-22 6-58 6-78 0-12 6-22 16-26 30Z"
      fill={fill}
    />
  )
}

function Face({ hair, skin }) {
  return (
    <>
      <g fill={INK}>
        <ellipse cx="188" cy="176" rx="5.5" ry="7" />
        <ellipse cx="232" cy="176" rx="5.5" ry="7" />
      </g>
      <g fill="#ffffff">
        <circle cx="190" cy="173" r="1.8" />
        <circle cx="234" cy="173" r="1.8" />
      </g>
      <g fill="none" stroke={hair} strokeWidth="4" strokeLinecap="round">
        <path d="M176 159q12-7 23-1" />
        <path d="M221 158q11-6 23 1" />
      </g>
      <path
        d="M209 182q-5 13 3 16"
        fill="none"
        stroke={skin[1]}
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path d="M192 207q18 22 36 0Z" fill="#a3443a" />
      <path d="M195 208q15 5 30 0v2q-15 6-30 0Z" fill="#ffffff" />
      <g fill="#ff8a80" opacity="0.32">
        <circle cx="171" cy="198" r="11" />
        <circle cx="249" cy="198" r="11" />
      </g>
    </>
  )
}

function Torso({ top }) {
  return (
    <>
      <path
        d="M52 560c2-110 18-200 76-242 22-16 44-24 62-28q20 16 40 0c18 4 40 12 62 28 58 42 74 132 76 242Z"
        fill={top[0]}
      />
      <g
        fill="none"
        stroke={top[1]}
        strokeWidth="3"
        strokeLinecap="round"
        opacity="0.9"
      >
        <path d="M126 332c-14 60-18 140-14 228" />
        <path d="M294 332c14 60 18 140 14 228" />
      </g>
    </>
  )
}

function Tablet({ skin }) {
  return (
    <>
      <g transform="rotate(-5 210 436)">
        <rect
          x="122"
          y="372"
          width="176"
          height="128"
          rx="14"
          fill="#eef2f8"
          stroke="#c3cfe2"
          strokeWidth="3"
        />
        <rect x="134" y="384" width="152" height="104" rx="8" fill={BLUE} />
        <circle cx="210" cy="426" r="17" fill="#ffffff" opacity="0.95" />
        <path d="M205 417l15 9-15 9Z" fill={BLUE} />
        <rect
          x="150"
          y="466"
          width="120"
          height="6"
          rx="3"
          fill="#ffffff"
          opacity="0.35"
        />
        <rect x="150" y="466" width="74" height="6" rx="3" fill={SUN} />
      </g>
      <g fill={skin[0]}>
        <ellipse cx="124" cy="444" rx="16" ry="22" />
        <ellipse cx="294" cy="434" rx="16" ry="22" />
      </g>
      <g fill={skin[1]}>
        <ellipse cx="135" cy="432" rx="6" ry="9" />
        <ellipse cx="284" cy="422" rx="6" ry="9" />
      </g>
    </>
  )
}

function Books({ skin }) {
  return (
    <>
      <g transform="rotate(-12 214 430)">
        <rect x="114" y="380" width="200" height="36" rx="6" fill={SUN} />
        <rect x="122" y="410" width="184" height="4" fill="#fff6d2" />
        <rect x="150" y="392" width="62" height="8" rx="4" fill="#ffffff" />
        <rect x="124" y="418" width="194" height="38" rx="6" fill={BLUE} />
        <rect x="132" y="450" width="178" height="4" fill="#e6efff" />
        <rect
          x="236"
          y="430"
          width="54"
          height="8"
          rx="4"
          fill="#ffffff"
          opacity="0.6"
        />
      </g>
      <g fill={skin[0]}>
        <ellipse cx="128" cy="452" rx="17" ry="20" />
        <ellipse cx="296" cy="398" rx="18" ry="22" />
      </g>
      <path
        d="M286 392h18M286 402h18"
        stroke={skin[1]}
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </>
  )
}

function Pointing({ skin, top }) {
  return (
    <>
      <path
        d="M140 336C112 306 88 272 72 242"
        fill="none"
        stroke={top[0]}
        strokeWidth="46"
        strokeLinecap="round"
      />
      <path
        d="M118 300c-12-14-22-30-30-44"
        fill="none"
        stroke={top[1]}
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path
        d="M60 222L34 188"
        fill="none"
        stroke={skin[0]}
        strokeWidth="13"
        strokeLinecap="round"
      />
      <circle cx="64" cy="230" r="20" fill={skin[0]} />
      <ellipse
        cx="78"
        cy="222"
        rx="7"
        ry="10"
        fill={skin[1]}
        transform="rotate(-35 78 222)"
      />
    </>
  )
}

function Headphones() {
  return (
    <>
      <path
        d="M146 302c4 36 124 36 128 0"
        fill="none"
        stroke="#2c3148"
        strokeWidth="9"
        strokeLinecap="round"
      />
      <rect x="132" y="282" width="26" height="38" rx="11" fill="#2c3148" />
      <rect x="262" y="282" width="26" height="38" rx="11" fill="#2c3148" />
      <rect x="137" y="288" width="16" height="26" rx="7" fill={BLUE} />
      <rect x="267" y="288" width="16" height="26" rx="7" fill={BLUE} />
    </>
  )
}

function Glasses() {
  return (
    <g fill="#ffffff" fillOpacity="0.12" stroke="#2c3148" strokeWidth="3.5">
      <rect x="168" y="162" width="36" height="28" rx="10" />
      <rect x="216" y="162" width="36" height="28" rx="10" />
      <path d="M204 174q6-5 12 0M168 172l-16-4M252 172l16-4" fill="none" />
    </g>
  )
}

function Beard({ fill }) {
  return (
    <>
      <path
        d="M152 186c2 50 28 66 58 66s56-16 58-66c-6 28-22 40-36 40-10-6-34-6-44 0-14 0-30-12-36-40Z"
        fill={fill}
      />
      <path d="M194 205q16-9 32 0-16 6-32 0Z" fill={fill} />
    </>
  )
}

function Collar() {
  return (
    <g fill="#ffffff" stroke="#c9d3e3" strokeWidth="2.5" strokeLinejoin="round">
      <path d="M186 284l24 26-30 14-12-30Z" />
      <path d="M234 284l-24 26 30 14 12-30Z" />
    </g>
  )
}

function Laptop() {
  return (
    <>
      <rect x="92" y="446" width="236" height="132" rx="14" fill="#d6deeb" />
      <rect x="92" y="446" width="236" height="10" rx="5" fill="#c2cddd" />
      <circle cx="210" cy="512" r="13" fill="#c2cddd" />
    </>
  )
}

function Microphone() {
  return (
    <>
      <path
        d="M338 560V430m-22 0h44"
        fill="none"
        stroke="#2c3148"
        strokeWidth="6"
        strokeLinecap="round"
      />
      <rect x="322" y="360" width="32" height="64" rx="16" fill="#2c3148" />
      <path
        d="M328 378h20M328 390h20M328 402h20"
        stroke="#4a5272"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </>
  )
}

export default function PersonFigure({ className = "", variant = "tablet" }) {
  const figure = FIGURES[variant] || FIGURES.tablet
  const skin = SKIN[figure.skin]
  const has = (prop) => figure.props.includes(prop)

  return (
    <svg
      viewBox="0 0 420 560"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <BackHair fill={figure.hairFill} style={figure.hair} />
      <path
        d="M186 216v66q24 16 48 0v-66Z"
        fill={skin[1]}
        stroke={skin[1]}
        strokeWidth="2"
      />
      <Torso top={figure.top} />
      {has("collar") && <Collar />}
      {has("headphones") && <Headphones />}
      <g fill={skin[0]}>
        <ellipse cx="150" cy="176" rx="10" ry="14" />
        <ellipse cx="270" cy="176" rx="10" ry="14" />
        <ellipse cx="210" cy="168" rx="60" ry="70" />
      </g>
      {has("beard") && <Beard fill={figure.hairFill} />}
      <Face hair={figure.hairFill} skin={skin} />
      <FrontHair fill={figure.hairFill} style={figure.hair} />
      {has("glasses") && <Glasses />}
      {has("tablet") && <Tablet skin={skin} />}
      {has("books") && <Books skin={skin} />}
      {has("pointing") && <Pointing skin={skin} top={figure.top} />}
      {has("laptop") && <Laptop />}
      {has("mic") && <Microphone />}
    </svg>
  )
}
