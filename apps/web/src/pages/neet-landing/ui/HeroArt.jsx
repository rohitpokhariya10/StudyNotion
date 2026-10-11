// Original flat illustration for the landing hero, drawn in code. Each motif
// comes from the exam itself: a stopwatch, answer bubbles, an OMR card, a
// pulse line, and Physics, Chemistry and Biology marks. Characters are separate
// SVGs so their idle motion stays on the compositor instead of repainting the
// whole scene.

const INK = "#2b2b2b"
const BLUE = "#5ec1ff"
const BLUE_DEEP = "#2fa8f5"
const RED = "#ff4a1c"
const CORAL = "#ff7350"
const YELLOW = "#ffcd5e"
const AMBER = "#ffb01f"
const GREEN = "#00c46f"
const GREEN_DEEP = "#00a85c"
const BEIGE = "#e8dfd2"
const SAND = "#f3eee6"
const MIST = "#f6f3ee"

const round = (value) => Math.round(value * 10) / 10
const STAR_POINTS = Array.from({ length: 10 }, (_, index) => {
  const angle = (Math.PI / 5) * index - Math.PI / 2
  const radius = index % 2 ? 0.46 : 1
  return `${round(Math.cos(angle) * radius * 10)},${round(Math.sin(angle) * radius * 10)}`
}).join(" ")

function Star({ x, y, size = 12, fill = YELLOW, rotate = 0 }) {
  return (
    <polygon
      points={STAR_POINTS}
      fill={fill}
      stroke={fill}
      strokeWidth="3.4"
      strokeLinejoin="round"
      transform={`translate(${x} ${y}) rotate(${rotate}) scale(${size / 10})`}
    />
  )
}

function Sparkle({ x, y, size = 12, fill = BEIGE }) {
  return (
    <path
      d="M0-10C1.2-3 3-1.2 10 0 3 1.2 1.2 3 0 10-1.2 3-3 1.2-10 0-3-1.2-1.2-3 0-10Z"
      fill={fill}
      transform={`translate(${x} ${y}) scale(${size / 10})`}
    />
  )
}

function Floret({ x, y }) {
  return (
    <path
      d="M0-8V8M-7-4 7 4M-7 4 7-4"
      stroke={BLUE}
      strokeWidth="6"
      strokeLinecap="round"
      transform={`translate(${x} ${y})`}
    />
  )
}

// A tilted answer bubble: darker rim, lighter face, optional option letter.
function AnswerBubble({ x, y, letter, rotate = 0, clipId }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${rotate})`}>
      <ellipse cx="0" cy="7" rx="38" ry="33" fill={AMBER} />
      <ellipse cx="0" cy="0" rx="38" ry="32" fill={YELLOW} />
      <clipPath id={clipId}>
        <ellipse cx="0" cy="0" rx="38" ry="32" />
      </clipPath>
      <path
        d="M-6-40 22-40-18 40-46 40Z"
        fill="#fff"
        opacity="0.32"
        clipPath={`url(#${clipId})`}
      />
      {letter && (
        <text
          x="0"
          y="11"
          fill="#b06a00"
          fontFamily="inherit"
          fontSize="30"
          fontWeight="700"
          textAnchor="middle"
        >
          {letter}
        </text>
      )}
    </g>
  )
}

function Tile({ x, y, rotate = 0, size = 112, fill = SAND, children }) {
  const half = size / 2
  return (
    <g transform={`translate(${x} ${y}) rotate(${rotate})`}>
      <rect
        x={-half}
        y={-half}
        width={size}
        height={size}
        rx={size * 0.24}
        fill={fill}
      />
      {children}
    </g>
  )
}

function Limbs({ paths, width = 13 }) {
  return (
    <g
      fill="none"
      stroke={INK}
      strokeWidth={width}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {paths.map((d) => (
        <path key={d} d={d} />
      ))}
    </g>
  )
}

function Shoe({ x, y, rotate = 0, fill }) {
  return (
    <rect
      x={x - 17}
      y={y - 10}
      width="34"
      height="20"
      rx="10"
      fill={fill}
      transform={`rotate(${rotate} ${x} ${y})`}
    />
  )
}

function Stopwatch() {
  return (
    <svg viewBox="0 0 260 310" className="np-actor np-actor-watch">
      <Limbs
        paths={[
          "M44 168 12 190",
          "M218 164 248 140",
          "M104 236 92 278",
          "M158 236 170 276",
        ]}
      />
      <Shoe x={88} y={284} rotate={-10} fill={YELLOW} />
      <Shoe x={176} y={282} rotate={12} fill={YELLOW} />
      <rect x="117" y="14" width="26" height="30" rx="6" fill={BLUE_DEEP} />
      <rect x="98" y="2" width="64" height="22" rx="11" fill={BLUE} />
      <rect
        x="194"
        y="44"
        width="36"
        height="20"
        rx="10"
        fill={BLUE}
        transform="rotate(42 212 54)"
      />
      <circle cx="130" cy="148" r="106" fill={BLUE} />
      <circle cx="130" cy="152" r="78" fill="#eaf6ff" />
      <g fill="#a9dcff">
        <rect x="126" y="82" width="8" height="16" rx="4" />
        <rect x="126" y="206" width="8" height="16" rx="4" />
        <rect x="60" y="148" width="16" height="8" rx="4" />
        <rect x="184" y="148" width="16" height="8" rx="4" />
      </g>
      <ellipse cx="106" cy="146" rx="10" ry="15" fill={INK} />
      <ellipse cx="154" cy="146" rx="10" ry="15" fill={INK} />
      <circle cx="109" cy="140" r="3.2" fill="#fff" />
      <circle cx="157" cy="140" r="3.2" fill="#fff" />
      <circle cx="86" cy="178" r="10" fill="#ffc6b8" />
      <circle cx="174" cy="178" r="10" fill="#ffc6b8" />
      <path
        d="M115 180Q130 194 145 180"
        fill="none"
        stroke={INK}
        strokeWidth="7"
        strokeLinecap="round"
      />
    </svg>
  )
}

function Sprout() {
  return (
    <svg viewBox="0 0 270 262" className="np-actor np-actor-sprout">
      <Limbs
        paths={[
          "M50 130 20 116",
          "M226 142 252 170",
          "M112 196 96 232",
          "M166 196 180 230",
        ]}
        width={12}
      />
      <Shoe x={88} y={238} rotate={-14} fill={RED} />
      <Shoe x={188} y={236} rotate={12} fill={RED} />
      <path
        d="M138 60C138 44 140 34 146 24"
        fill="none"
        stroke={GREEN_DEEP}
        strokeWidth="7"
        strokeLinecap="round"
      />
      <path
        d="M141 42C121 43 108 31 105 15 122 12 137 23 141 42Z"
        fill={GREEN_DEEP}
      />
      <path
        d="M146 30C150 12 166 3 183 5 181 22 166 32 146 30Z"
        fill="#43d991"
      />
      <path
        d="M44 126C44 78 84 58 140 58 198 58 234 82 232 130 230 178 194 200 136 200 80 200 44 174 44 126Z"
        fill={GREEN}
      />
      <circle cx="94" cy="140" r="10" fill="#4ddd98" />
      <circle cx="182" cy="140" r="10" fill="#4ddd98" />
      <g
        fill="none"
        stroke={INK}
        strokeWidth="7"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M99 120Q109 107 119 120" />
        <path d="M157 120Q167 107 177 120" />
        <path d="M122 142Q138 157 154 142" />
      </g>
    </svg>
  )
}

function Flask() {
  return (
    <svg viewBox="0 0 220 292" className="np-actor np-actor-flask">
      <circle cx="126" cy="30" r="12" fill={CORAL} />
      <circle cx="150" cy="10" r="7" fill={CORAL} />
      <circle cx="102" cy="14" r="6" fill={CORAL} />
      <Limbs
        paths={[
          "M44 198 16 216",
          "M178 190 206 218",
          "M90 238 82 272",
          "M134 238 146 272",
        ]}
        width={12}
      />
      <Shoe x={74} y={278} rotate={-8} fill={GREEN} />
      <Shoe x={154} y={278} rotate={8} fill={GREEN} />
      <rect x="84" y="50" width="52" height="64" rx="6" fill="#ffe3a3" />
      <rect x="74" y="44" width="72" height="16" rx="8" fill={YELLOW} />
      <path
        d="M84 106H136L198 210C206 226 196 242 178 242H42C24 242 14 226 22 210Z"
        fill="#ffe3a3"
      />
      <path
        d="M56 152Q83 141 110 152T164 152L198 210C206 226 196 242 178 242H42C24 242 14 226 22 210Z"
        fill={YELLOW}
      />
      <circle cx="78" cy="206" r="8" fill="#ffae7a" />
      <circle cx="142" cy="206" r="8" fill="#ffae7a" />
      <circle cx="93" cy="192" r="6" fill={INK} />
      <circle cx="127" cy="192" r="6" fill={INK} />
      <path
        d="M101 207Q110 215 119 207"
        fill="none"
        stroke={INK}
        strokeWidth="6"
        strokeLinecap="round"
      />
    </svg>
  )
}

function Cell() {
  const lobes = Array.from({ length: 9 }, (_, index) => {
    const angle = (Math.PI * 2 * index) / 9
    return [
      round(120 + Math.cos(angle) * 70),
      round(120 + Math.sin(angle) * 70),
    ]
  })
  return (
    <svg viewBox="0 0 240 250" className="np-actor np-actor-cell">
      <Limbs paths={["M76 196 58 232"]} width={12} />
      <Shoe x={50} y={238} rotate={-16} fill={YELLOW} />
      <g fill={RED}>
        {lobes.map(([cx, cy]) => (
          <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="38" />
        ))}
        <circle cx="120" cy="120" r="78" />
      </g>
      <circle cx="70" cy="134" r="10" fill="#ff8a6b" />
      <circle cx="158" cy="134" r="10" fill="#ff8a6b" />
      <g fill="none" stroke={INK} strokeWidth="7" strokeLinecap="round">
        <path d="M76 112Q88 125 100 112" />
        <path d="M126 112Q138 125 150 112" />
        <path d="M102 136Q113 146 124 136" />
      </g>
    </svg>
  )
}

function LeftScene() {
  return (
    <svg viewBox="0 0 480 600" className="np-scene">
      <circle cx="252" cy="160" r="74" fill={MIST} />
      <circle cx="232" cy="404" r="62" fill={MIST} />
      <circle cx="14" cy="474" r="92" fill={MIST} />
      <AnswerBubble x={112} y={52} rotate={-12} clipId="np-bubble-plain" />
      <Floret x={78} y={110} />
      <Floret x={110} y={100} />
      <Floret x={144} y={110} />
      <Star x={330} y={40} size={15} rotate={10} />
      <Star x={262} y={80} size={12} rotate={-8} />
      {/* Pencil, writing towards the stopwatch. */}
      <g transform="translate(382 118) rotate(225)">
        <rect x="-15" y="-62" width="30" height="104" rx="4" fill={YELLOW} />
        <rect
          x="-5"
          y="-62"
          width="10"
          height="104"
          fill={AMBER}
          opacity="0.55"
        />
        <rect x="-15" y="40" width="30" height="14" fill={BEIGE} />
        <rect x="-15" y="50" width="30" height="20" rx="7" fill="#ff8a73" />
        <path d="M-15-62 0-96 15-62Z" fill="#f6dcb4" />
        <path d="M-5.6-83 0-96 5.6-83Z" fill={INK} />
      </g>
      {/* Paper plane: a submitted sitting. */}
      <g transform="translate(438 196) rotate(-18)">
        <path d="M-30 4 30-22 8 30 0 12Z" fill={BLUE} />
        <path d="M0 12 30-22-6 8Z" fill={BLUE_DEEP} />
      </g>
      {/* Heart with a pulse line: the medical goal. */}
      <g transform="translate(400 262) rotate(14)">
        <path
          d="M0-16C0-40-36-46-46-20-56 6-28 30 0 46 28 30 56 6 46-20 36-46 0-40 0-16Z"
          fill={RED}
        />
        <path
          d="M-34 4H-18L-10-12 0 20 8-4 13 4H32"
          fill="none"
          stroke="#fff"
          strokeWidth="6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <ellipse
          cx="-26"
          cy="-22"
          rx="8"
          ry="5"
          fill="#fff"
          opacity="0.35"
          transform="rotate(-35 -26 -22)"
        />
      </g>
      <Star x={316} y={232} size={14} rotate={-12} />
      <circle cx="342" cy="300" r="11" fill={BEIGE} />
      <AnswerBubble
        x={366}
        y={366}
        letter="A"
        rotate={8}
        clipId="np-bubble-a"
      />
      {/* Benzene ring for Chemistry. */}
      <g transform="translate(322 482) rotate(8)">
        <path
          d="M0-38 33-19V19L0 38-33 19V-19Z"
          fill="none"
          stroke={BEIGE}
          strokeWidth="15"
          strokeLinejoin="round"
        />
        <circle r="14" fill="none" stroke={BEIGE} strokeWidth="7" />
      </g>
      {/* Atom for Physics. */}
      <g
        transform="translate(414 510)"
        fill="none"
        stroke={BLUE}
        strokeWidth="6"
      >
        <ellipse rx="34" ry="13" />
        <ellipse rx="34" ry="13" transform="rotate(60)" />
        <ellipse rx="34" ry="13" transform="rotate(120)" />
        <circle r="7" fill={BLUE_DEEP} stroke="none" />
      </g>
      <Sparkle x={232} y={470} size={13} />
      <Sparkle x={398} y={432} size={10} />
      <circle cx="156" cy="548" r="30" fill={RED} />
      <circle cx="248" cy="512" r="13" fill={BLUE} />
      <Star x={282} y={566} size={13} fill={BEIGE} rotate={14} />
      <Star x={46} y={532} size={13} rotate={-10} />
    </svg>
  )
}

function RightScene() {
  return (
    <svg viewBox="0 0 480 600" className="np-scene">
      <circle cx="196" cy="300" r="92" fill={MIST} />
      <circle cx="462" cy="430" r="104" fill={MIST} />
      <Star x={232} y={30} size={12} rotate={8} />
      <Sparkle x={330} y={36} size={13} />
      {/* Pulse tile: the Prahit NEET Mocks mark. */}
      <Tile x={276} y={100} rotate={8} size={116}>
        <path
          d="M-42 8H-22L-12-14 2 28 14-6 22 8H34"
          fill="none"
          stroke={BLUE}
          strokeWidth="8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle
          cx="38"
          cy="8"
          r="9"
          fill={BLUE}
          stroke="#fff"
          strokeWidth="4"
        />
      </Tile>
      <g transform="translate(410 64)">
        <circle r="40" fill={SAND} />
        <path
          d="M-17 1-5 13 18-12"
          fill="none"
          stroke={GREEN}
          strokeWidth="11"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
      <circle cx="366" cy="166" r="13" fill={BEIGE} />
      <circle cx="226" cy="196" r="12" fill={YELLOW} />
      <Sparkle x={86} y={170} size={13} />
      {/* OMR answer sheet: one marked bubble per question row. */}
      <g transform="translate(292 238) rotate(-9)">
        <rect x="-52" y="-64" width="104" height="128" rx="22" fill={YELLOW} />
        <rect x="-32" y="-46" width="44" height="8" rx="4" fill={AMBER} />
        {[-20, 2, 24, 46].map((cy, row) =>
          [-27, -9, 9, 27].map((cx, column) => (
            <circle
              key={`${row}-${column}`}
              cx={cx}
              cy={cy}
              r="7"
              fill={[1, 3, 0, 2][row] === column ? INK : "#ffe9b5"}
            />
          ))
        )}
      </g>
      <Sparkle x={350} y={312} size={20} fill={YELLOW} />
      {/* Magnifier: reviewing a result. */}
      <g transform="translate(232 380) rotate(-28)">
        <path
          d="M0 34V70"
          stroke={BLUE}
          strokeWidth="16"
          strokeLinecap="round"
        />
        <circle r="32" fill="#fff" stroke={BLUE} strokeWidth="15" />
      </g>
      <AnswerBubble
        x={424}
        y={338}
        letter="B"
        rotate={-8}
        clipId="np-bubble-b"
      />
      {/* Arrow towards the call to action. */}
      <path
        d="M0-22-34 0 0 22V9H38V-9H0Z"
        fill={GREEN}
        stroke={GREEN}
        strokeWidth="10"
        strokeLinejoin="round"
        transform="translate(78 404) rotate(-28)"
      />
      <circle cx="62" cy="474" r="14" fill={BLUE} />
      <Star x={136} y={426} size={12} fill={BEIGE} rotate={-6} />
      {/* DNA tile for Biology. */}
      <Tile x={150} y={520} rotate={-6} size={108}>
        <g fill="none" strokeWidth="7" strokeLinecap="round">
          <path d="M-12-30H12M-14 0H14M-12 30H12" stroke={BEIGE} />
          <path
            d="M-16-40C-16-18 16-16 16 0 16 16-16 18-16 40"
            stroke={CORAL}
          />
          <path d="M16-40C16-18-16-16-16 0-16 16 16 18 16 40" stroke={BLUE} />
        </g>
      </Tile>
      <circle cx="248" cy="482" r="12" fill={GREEN} />
      {/* Capsule, cropped by the page edge. */}
      <g transform="translate(470 512) rotate(-28)">
        <path d="M0-26H-40A26 26 0 0 0-40 26H0Z" fill={BLUE} />
        <path d="M0-26H40A26 26 0 0 1 40 26H0Z" fill="#c4e8ff" />
        <path
          d="M-50-10H-20"
          stroke="#fff"
          strokeWidth="6"
          strokeLinecap="round"
          opacity="0.6"
        />
      </g>
      <Star x={338} y={590} size={11} rotate={20} />
      <Sparkle x={404} y={584} size={12} />
    </svg>
  )
}

export function HeroCluster({ side }) {
  return (
    <div className={`np-cluster np-cluster-${side}`} aria-hidden="true">
      {side === "left" ? (
        <>
          <LeftScene />
          <span className="np-actor-slot np-slot-watch">
            <Stopwatch />
          </span>
        </>
      ) : (
        <>
          <RightScene />
          <span className="np-actor-slot np-slot-sprout">
            <Sprout />
          </span>
          <span className="np-actor-slot np-slot-cell">
            <Cell />
          </span>
          <span className="np-actor-slot np-slot-flask">
            <Flask />
          </span>
        </>
      )}
    </div>
  )
}
