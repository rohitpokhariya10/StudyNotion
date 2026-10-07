// Original StudyNotion footer landscape (no third-party artwork): misty blue
// ranges with lilac sunlit ridges, forested slopes, three forest depths, two
// bare trees, a flock of birds and soft foreground pines, fading into the
// footer navy. Deterministic (seeded), so regenerating gives the same file.
import { writeFileSync } from "node:fs"

import { renderBirds } from "./footer-birds.mjs"

const W = 1440
const H = 600
const out =
  process.argv[2] ||
  new URL(
    "../../../apps/web/src/shared/assets/editorial/footer-landscape.svg",
    import.meta.url
  )

const rngFrom = (seed) => {
  let v = seed >>> 0
  return () => {
    v = (v + 0x6d2b79f5) >>> 0
    let m = Math.imul(v ^ (v >>> 15), v | 1)
    m ^= m + Math.imul(m ^ (m >>> 7), m | 61)
    return ((m ^ (m >>> 14)) >>> 0) / 4294967296
  }
}
const lerp = (a, b, t) => a + (b - a) * t
const fmt = (precision) => (v) => {
  const r = Math.round(v * precision) / precision
  return Object.is(r, -0) ? "0" : String(r)
}
const n0 = fmt(1)
const n1 = fmt(10)
const join = (nums) => {
  let out = ""
  let prev = ""
  for (const raw of nums) {
    const t = raw.replace(/^(-?)0\./, "$1.")
    const needsSep =
      out && !t.startsWith("-") && !(t.startsWith(".") && prev.includes("."))
    out += (needsSep ? " " : "") + t
    prev = t
  }
  return out
}
const encode = (pts, n, close) => {
  const p = 10 ** (n === n0 ? 0 : 1)
  const r = pts.map(([x, y]) => [Math.round(x * p), Math.round(y * p)])
  const nums = [String(r[0][0] / p), String(r[0][1] / p)]
  const deltas = []
  for (let i = 1; i < r.length; i++) {
    const dx = (r[i][0] - r[i - 1][0]) / p
    const dy = (r[i][1] - r[i - 1][1]) / p
    if (dx || dy) deltas.push(String(dx), String(dy))
  }
  return (
    "M" +
    join(nums) +
    (deltas.length ? "l" + join(deltas) : "") +
    (close ? "z" : "")
  )
}
const poly = (pts, n = n1) => encode(pts, n, true)
const line = (pts, n = n1) => encode(pts, n, false)

// Midpoint displacement between key points for a natural, jagged line.
function jagged(points, rng, rough = 0.2, minSeg = 6) {
  const pts = [points[0]]
  const split = (a, b, depth) => {
    const len = Math.hypot(b[0] - a[0], b[1] - a[1])
    if (len < minSeg || depth > 7) return pts.push(b)
    const m = [
      (a[0] + b[0]) / 2 + (rng() - 0.5) * len * 0.1,
      (a[1] + b[1]) / 2 + (rng() - 0.5) * len * rough,
    ]
    split(a, m, depth + 1)
    split(m, b, depth + 1)
  }
  for (let i = 1; i < points.length; i++) split(points[i - 1], points[i], 0)
  return pts
}
const sampler = (pts) => (x) => {
  for (let i = 1; i < pts.length; i++)
    if (pts[i][0] >= x) {
      const [a, b] = [pts[i - 1], pts[i]]
      return lerp(a[1], b[1], (x - a[0]) / (b[0] - a[0] || 1))
    }
  return pts.at(-1)[1]
}

// Spruce silhouette: irregular drooping tiers, ragged needles, slight lean.
function spruce(
  x,
  top,
  base,
  rng,
  { ratio = 0.44, tierPx = 9, trunk = 0, n = n0, cut = Infinity } = {}
) {
  const h = base - top
  const w = h * ratio
  const tiers = Math.max(3, Math.round(h / tierPx))
  const lean = (rng() - 0.5) * h * 0.04
  const side = (dir) => {
    const pts = []
    for (let i = 1; i <= tiers; i++) {
      const t = i / tiers
      const y = top + h * 0.92 * t
      const tierH = (h * 0.92) / tiers
      if (y > cut) {
        // Below the fade nothing is visible: run straight down at this width.
        const half = (w / 2) * Math.pow(t, 0.85)
        pts.push([x + dir * half, base])
        break
      }
      const env = Math.pow(t, 0.85) * (0.62 + rng() * 0.66)
      const half = Math.max(1.5, (w / 2) * (0.05 + 0.95 * Math.min(1.12, env)))
      const cx = x + lean * (1 - t)
      pts.push([
        cx + dir * half * (0.25 + rng() * 0.25),
        y - tierH * (0.55 + rng() * 0.25),
      ])
      if (h > 40)
        pts.push([
          cx + dir * half * (0.6 + rng() * 0.2),
          y - tierH * (0.1 + rng() * 0.3),
        ])
      pts.push([
        cx + dir * half * (0.97 + rng() * 0.06),
        y + tierH * (0.1 + rng() * 0.45),
      ])
      pts.push([
        cx + dir * half * (1.02 + rng() * 0.08),
        y - tierH * (0.02 + rng() * 0.12),
      ])
      if (h > 70) {
        pts.push([
          cx + dir * half * (0.86 + rng() * 0.06),
          y + tierH * (0.18 + rng() * 0.2),
        ])
        if (rng() < 0.6)
          pts.push([
            cx + dir * half * (0.74 + rng() * 0.06),
            y + tierH * (0.02 + rng() * 0.15),
          ])
      }
    }
    return pts
  }
  const tip = [x + lean + (rng() - 0.5), top - h * 0.03]
  const bottom = top + h * 0.92
  const tb = trunk
    ? [
        [x - trunk, bottom],
        [x - trunk, base],
        [x + trunk, base],
        [x + trunk, bottom],
      ]
    : [[x, base]]
  return poly([tip, ...side(-1), ...tb, ...side(1).reverse()], n)
}

// Rounded, bushy or flat-topped (umbrella) broadleaf tree.
function broadleaf(x, base, h, w, rng, kind = "round", n = n0) {
  const pts = []
  const steps = 22
  const crownH = kind === "umbrella" ? h * 0.3 : h * 0.62
  const crownBase = base - h + crownH * (kind === "umbrella" ? 1 : 0.9)
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * Math.PI
    const bump = 0.86 + rng() * 0.28
    pts.push([
      x - Math.cos(t) * (w / 2) * bump,
      crownBase - Math.sin(t) * crownH * bump,
    ])
  }
  const tw = Math.max(1, w * 0.04)
  const trunk = [
    [x + tw, crownBase - 1],
    [x + tw * 1.5, base],
    [x - tw * 1.5, base],
    [x - tw, crownBase - 1],
  ]
  let extra = ""
  if (kind === "umbrella") {
    // Spreading limbs under the flat crown.
    extra =
      poly(
        [
          [x - tw, base - h * 0.45],
          [x - w * 0.28, crownBase + 1],
          [x - w * 0.24, crownBase + 2],
          [x, base - h * 0.4],
        ],
        n
      ) +
      poly(
        [
          [x + tw, base - h * 0.42],
          [x + w * 0.3, crownBase + 1],
          [x + w * 0.26, crownBase + 2],
          [x, base - h * 0.36],
        ],
        n
      )
  }
  return poly(pts, n) + poly(trunk, n) + extra
}

// A forest band on an undulating ground line, trees grouped in clumps.
function forest({
  seed,
  ground,
  from = -40,
  to = W + 40,
  step: [s0, s1],
  height: [h0, h1],
  ratio = 0.44,
  tierPx = 9,
  broad = 0,
  clump = 0.5,
  n = n0,
  cut = Infinity,
}) {
  const rng = rngFrom(seed)
  const groundPts = []
  const lift = h0 * 0.22
  for (let x = from; x <= to; x += 12)
    groundPts.push([x, ground(x) - lift + (rng() - 0.5) * 3])
  const parts = [poly([[from, H + 2], ...groundPts, [to, H + 2]], n)]
  let x = from
  let cluster = 1
  while (x < to) {
    if (rng() < 0.12) cluster = 0.55 + rng() * 0.9 // start a new clump
    const h = lerp(h0, h1, Math.pow(rng(), 1.3)) * cluster
    const base = ground(x) + 4 + rng() * 6
    if (broad && rng() < broad) {
      const kind = rng() < 0.4 ? "umbrella" : "round"
      parts.push(
        broadleaf(
          x,
          base,
          h * 0.8,
          h * (kind === "umbrella" ? 1.5 : 0.75),
          rng,
          kind,
          n
        )
      )
    } else {
      parts.push(
        spruce(x, base - h, base, rng, {
          ratio: ratio * (0.8 + rng() * 0.4),
          tierPx,
          n,
          cut,
        })
      )
    }
    if (rng() < 0.75) {
      const ux = x + lerp(s0, s1, rng()) * 0.5
      const uh = lerp(h0, h1, rng()) * (0.28 + rng() * 0.3)
      const ub = ground(ux) + 6 + rng() * 4
      parts.push(
        spruce(ux, ub - uh, ub, rng, {
          ratio: ratio * 1.2,
          tierPx: tierPx * 0.8,
          n,
        })
      )
    }
    x += lerp(s0, s1, rng()) * (rng() < clump ? 0.55 : 1.25)
  }
  return parts.join("")
}

// Bare broadleaf tree: a leader and a side branch at every fork, pulled
// gently upwards, ending in fine stroked twigs. Returns [limbs, twigs].
function bareTree({
  seed,
  x,
  base,
  trunk,
  width,
  depth,
  lean = 0,
  split = [0.55, 1.0],
  crown = null,
}) {
  const rng = rngFrom(seed)
  const limbs = []
  const twigs = []
  const grow = (x1, y1, a, len, w1, d) => {
    const a2 = a + (rng() - 0.5) * 0.22
    const x2 = x1 + Math.cos(a2) * len
    const y2 = y1 - Math.sin(a2) * len
    const w2 = w1 * 0.7
    if (w1 < 0.9)
      twigs.push([
        [x1, y1],
        [x2, y2],
      ])
    else {
      const nx = Math.sin(a2) * 0.5
      const ny = Math.cos(a2) * 0.5
      limbs.push([
        [x1 - nx * w1, y1 - ny * w1],
        [x2 - nx * w2, y2 - ny * w2],
        [x2 + nx * w2, y2 + ny * w2],
        [x1 + nx * w1, y1 + ny * w1],
      ])
    }
    if (d === 0) return
    const side = rng() < 0.5 ? 1 : -1
    const up = (Math.PI / 2 - a2) * 0.05
    grow(
      x2,
      y2,
      a2 + up + side * (0.2 + rng() * 0.25),
      len * (0.72 + rng() * 0.1),
      w2,
      d - 1
    )
    grow(
      x2,
      y2,
      a2 + up - side * lerp(split[0], split[1], rng()),
      len * (0.64 + rng() * 0.14),
      w2 * 0.85,
      d - 1
    )
    if (d > 2 && rng() < 0.18)
      grow(x2, y2, a2 + up + side * 0.9, len * 0.5, w2 * 0.7, d - 2)
  }
  // Trunk, then two or three main limbs fanning into a broad crown.
  const tx = x + Math.cos(Math.PI / 2 + lean) * trunk
  const ty = base - Math.sin(Math.PI / 2 + lean) * trunk
  limbs.push([
    [x - width * 0.75, base],
    [tx - width * 0.4, ty],
    [tx + width * 0.4, ty],
    [x + width * 0.8, base],
  ])
  grow(tx, ty, Math.PI / 2 + 0.62, trunk * 0.5, width * 0.6, depth)
  grow(tx, ty, Math.PI / 2 - 0.55, trunk * 0.52, width * 0.6, depth)
  grow(tx, ty + 2, Math.PI / 2 + 0.08, trunk * 0.42, width * 0.5, depth - 1)
  // Soft mass of fine twigs inside the crown.
  let mass = ""
  if (crown) {
    const [cx, cy, rx, ry] = crown
    const mr = rngFrom(seed + 7)
    for (let i = 0; i < 14; i++) {
      const a = mr() * Math.PI * 2
      const d = Math.sqrt(mr())
      const px = cx + Math.cos(a) * rx * d * 0.8
      const py = cy + Math.sin(a) * ry * d * 0.7
      const r = (0.25 + mr() * 0.25) * Math.min(rx, ry)
      const pts = []
      for (let k = 0; k < 10; k++) {
        const b = (k / 10) * Math.PI * 2
        pts.push([
          px + Math.cos(b) * r * (0.8 + mr() * 0.4),
          py + Math.sin(b) * r * 0.7 * (0.8 + mr() * 0.4),
        ])
      }
      mass += poly(pts)
    }
  }
  return [
    limbs.map((q) => poly(q)).join(""),
    twigs.map((t) => line(t)).join(""),
    mass,
  ]
}

// --- distant ranges --------------------------------------------------------
const ridgeKeys = [
  [-40, 128],
  [0, 112],
  [40, 116],
  [84, 104],
  [126, 96],
  [166, 88],
  [205, 74],
  [226, 86],
  [258, 104],
  [296, 126],
  [334, 150],
  [362, 144],
  [396, 110],
  [430, 86],
  [450, 100],
  [470, 124],
  [492, 148],
  [524, 138],
  [560, 116],
  [602, 86],
  [640, 60],
  [672, 38],
  [700, 14],
  [720, 3],
  [738, 9],
  [752, 32],
  [772, 58],
  [800, 92],
  [830, 124],
  [860, 150],
  [892, 160],
  [930, 150],
  [968, 130],
  [1004, 108],
  [1032, 90],
  [1062, 70],
  [1086, 82],
  [1112, 100],
  [1150, 96],
  [1188, 80],
  [1216, 66],
  [1268, 64],
  [1300, 80],
  [1338, 90],
  [1380, 76],
  [1420, 60],
  [1446, 70],
  [1480, 84],
]
const ridge = jagged(ridgeKeys, rngFrom(11), 0.2, 5)
const ridgeAt = sampler(ridge)
const farRange = poly([[-40, H], ...ridge, [1480, H]])
const frontLeft = jagged(
  [
    [-40, 150],
    [30, 134],
    [90, 142],
    [150, 122],
    [192, 130],
    [240, 148],
    [284, 162],
    [330, 178],
    [380, 168],
    [424, 184],
    [470, 174],
    [540, 190],
  ],
  rngFrom(12),
  0.22,
  5
)
const frontRight = jagged(
  [
    [930, 186],
    [980, 166],
    [1032, 146],
    [1074, 132],
    [1118, 144],
    [1168, 128],
    [1222, 120],
    [1280, 134],
    [1332, 122],
    [1384, 110],
    [1430, 124],
    [1480, 116],
  ],
  rngFrom(13),
  0.22,
  5
)
const frontRanges =
  poly([[-40, H], ...frontLeft, [540, H]]) +
  poly([[930, H], ...frontRight, [1480, H]])
const frontRims = (() => {
  const band = (pts, from, to, d, seed) => {
    const r = rngFrom(seed)
    const top = pts.filter(([x]) => x >= from && x <= to)
    const inner = top
      .slice()
      .reverse()
      .map(([x, y], i, a) => {
        const t = i / (a.length - 1 || 1)
        const dd = d * Math.sin(Math.PI * (0.1 + 0.9 * (1 - t))) * (0.5 + r())
        return [x - dd * 0.7, y + dd]
      })
    return poly([...top, ...inner.slice(1)])
  }
  return (
    band(frontLeft, 150, 330, 6, 14) +
    band(frontRight, 1074, 1118, 5, 15) +
    band(frontRight, 1384, 1480, 5, 16)
  )
})()

// Sunlit band along a ridge: from the peak down its right slope, then back up
// an inner line `depth` px inside the slope.
function rim(px, ex, depth, seed, broad = 0) {
  const r = rngFrom(seed)
  const top = ridge.filter(([x]) => x >= px && x <= ex)
  const inner = []
  const steps = Math.max(4, Math.round((ex - px) / 14))
  for (let i = steps; i >= 0; i--) {
    const t = i / steps
    const x = lerp(px, ex, t)
    const taper = Math.sin(Math.PI * Math.min(1, 0.08 + t * 1.05))
    const d = (depth + broad * (1 - t)) * taper * (0.6 + r() * 0.8)
    inner.push([x - d * 0.8, ridgeAt(x) + d])
  }
  return poly([...top, ...jagged(inner, r, 0.35, 4).slice(1)])
}
const ribR = rngFrom(17)
const ribs = [
  [728, 22, 64],
  [742, 48, 70],
  [760, 76, 60],
  [786, 100, 50],
  [736, 96, 46],
  [812, 124, 30],
]
  .map(([x, y, len]) => {
    const pts = []
    for (let i = 0; i <= 6; i++)
      pts.push([x + i * len * 0.11 + (ribR() - 0.5) * 3, y + i * len * 0.14])
    const back = pts
      .slice(1)
      .reverse()
      .map(([px, py], i) => [px - 2.2 * (1 - i / 6) - ribR() * 1.2, py - 0.6])
    return poly([...pts, ...back])
  })
  .join("")
const lilac = [
  rim(205, 336, 12, 1),
  rim(430, 494, 11, 2),
  rim(721, 892, 34, 3, 46),
  rim(1062, 1112, 8, 4),
  rim(1216, 1300, 7, 5),
  rim(1420, 1480, 9, 6),
  rim(126, 166, 5, 7),
  rim(1268, 1338, 7, 8),
  rim(560, 602, 4, 9),
].join("")

// Forested slopes: a misty, low-contrast forest climbing the ranges.
const slopeGround = jagged(
  [
    [-40, 176],
    [80, 160],
    [170, 150],
    [260, 170],
    [340, 186],
    [420, 160],
    [500, 182],
    [590, 170],
    [680, 150],
    [760, 168],
    [850, 190],
    [930, 176],
    [1010, 150],
    [1090, 162],
    [1170, 150],
    [1250, 160],
    [1330, 150],
    [1420, 140],
    [1480, 150],
  ],
  rngFrom(31),
  0.18,
  10
)
const slopeAt = sampler(slopeGround)
const slopes = forest({
  seed: 33,
  ground: (x) => slopeAt(x),
  step: [5, 12],
  height: [10, 30],
  ratio: 0.5,
  tierPx: 5,
  broad: 0.12,
})

// --- forests -----------------------------------------------------------------
const farGround = jagged(
  [
    [-40, 226],
    [120, 214],
    [240, 236],
    [330, 220],
    [430, 246],
    [540, 228],
    [640, 248],
    [740, 226],
    [840, 244],
    [930, 230],
    [1040, 248],
    [1140, 228],
    [1240, 240],
    [1340, 222],
    [1480, 236],
  ],
  rngFrom(41),
  0.15,
  12
)
const farForest = forest({
  seed: 42,
  ground: sampler(farGround),
  step: [6, 15],
  height: [22, 58],
  ratio: 0.46,
  tierPx: 6,
  broad: 0.1,
})

const midGround = jagged(
  [
    [-40, 312],
    [140, 300],
    [300, 318],
    [420, 296],
    [560, 316],
    [700, 300],
    [820, 318],
    [960, 302],
    [1100, 320],
    [1240, 300],
    [1360, 314],
    [1480, 304],
  ],
  rngFrom(51),
  0.12,
  14
)
const midForest = forest({
  seed: 52,
  ground: sampler(midGround),
  step: [10, 22],
  height: [50, 112],
  ratio: 0.44,
  tierPx: 8,
  broad: 0.04,
})

const nearForest = forest({
  seed: 61,
  ground: (x) => 408 + Math.sin(x / 150) * 10 + Math.sin(x / 61) * 5,
  step: [14, 28],
  height: [96, 184],
  ratio: 0.46,
  tierPx: 10,
  cut: 470,
})

// Foreground giants at both edges (soft focus).
const fgRng = rngFrom(71)
const giants = [
  [48, 34, 0.54],
  [-22, 96, 0.56],
  [130, 152, 0.5],
  [214, 196, 0.48],
  [-6, 236, 0.56],
  [1188, 78, 0.5],
  [1122, 196, 0.5],
  [1262, 168, 0.5],
  [1338, 214, 0.48],
  [1420, 84, 0.52],
  [1474, 132, 0.56],
]
  .map(([x, top, ratio]) =>
    spruce(x, top, H + 6, fgRng, { ratio, tierPx: 11, trunk: 3, cut: 500 })
  )
  .join("")

// Bare trees: [offset from trunk top, angle°, width, length] per main limb.
const bigTree = bareTree({
  seed: 91,
  x: 950,
  base: 262,
  trunk: 78,
  width: 11,
  depth: 8,
  lean: -0.03,
  crown: [952, 132, 112, 52],
})
const smallTree = bareTree({
  seed: 94,
  x: 1344,
  base: 300,
  trunk: 82,
  width: 7,
  depth: 7,
  lean: 0.04,
  crown: [1344, 168, 66, 50],
})
const farTree = bareTree({
  seed: 93,
  x: 1104,
  base: 214,
  trunk: 16,
  width: 2,
  depth: 5,
})

// --- compose ----------------------------------------------------------------
const lin = (id, y1, y2, stops) =>
  `<linearGradient id="${id}" x1="0" y1="${y1}" x2="0" y2="${y2}" gradientUnits="userSpaceOnUse">${stops
    .map(
      ([o, c, a = 1]) =>
        `<stop offset="${o}" stop-color="${c}"${a < 1 ? ` stop-opacity="${a}"` : ""}/>`
    )
    .join("")}</linearGradient>`

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
<!-- Original StudyNotion footer landscape (generated; no third-party artwork). Bottom fades to #12366f. -->
<defs>
${lin("far", 0, 260, [
  [0, "#5b87c5"],
  [0.5, "#5381c0"],
  [1, "#4373b8"],
])}
${lin("lilac", 0, 200, [
  [0, "#9ea2d2"],
  [1, "#8d94c9"],
])}
${lin("slope", 130, 260, [
  [0, "#4576bb"],
  [1, "#3a6db5"],
])}
${lin("farF", 190, 330, [
  [0, "#3770bb"],
  [1, "#2b63b0"],
])}
${lin("midF", 220, 430, [
  [0, "#235aa7"],
  [1, "#1a4c96"],
])}
${lin("nearF", 250, 560, [
  [0, "#17478d"],
  [0.6, "#133d7b"],
  [1, "#123a74"],
])}
${lin("fg", 30, 600, [
  [0, "#0f2a5c"],
  [0.55, "#10295a"],
  [1, "#152f5e"],
])}
<linearGradient id="mist" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6f95d0" stop-opacity="0"/><stop offset="1" stop-color="#6f95d0" stop-opacity=".3"/></linearGradient>
<linearGradient id="fade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".36" stop-color="#fff" stop-opacity=".72"/><stop offset=".64" stop-color="#fff"/></linearGradient>
<mask id="fadeMask" maskUnits="userSpaceOnUse" x="0" y="320" width="${W}" height="${H - 320}"><rect y="320" width="${W}" height="${H - 320}" fill="url(#fade)"/></mask>
<filter id="soft" x="-2%" y="-2%" width="104%" height="104%"><feGaussianBlur stdDeviation=".6"/></filter>
<filter id="crown" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation="2.2"/></filter>
<filter id="focus" x="-2%" y="-2%" width="104%" height="104%"><feGaussianBlur stdDeviation="1.3"/></filter>
</defs>
<path fill="url(#far)" d="${farRange}"/>
<path fill="url(#lilac)" d="${lilac}"/>
<path fill="#7d86bf" fill-opacity=".55" d="${ribs}"/>
<path fill="#5f88c7" d="${farTree[0]}"/><path fill="none" stroke="#5f88c7" stroke-width=".5" stroke-linecap="round" d="${farTree[1]}"/>
<path fill="#4574b9" d="${frontRanges}"/>
<path fill="#8f96ca" d="${frontRims}"/>
<path fill="url(#slope)" filter="url(#soft)" d="${slopes}"/>
<rect y="196" width="${W}" height="50" fill="url(#mist)"/>
<path fill="url(#farF)" filter="url(#soft)" d="${farForest}"/>
<path fill="#1b4f9e" fill-opacity=".34" filter="url(#crown)" d="${bigTree[2]}"/><path fill="#1b4f9e" d="${bigTree[0]}"/><path fill="none" stroke="#1b4f9e" stroke-width=".85" stroke-linecap="round" d="${bigTree[1]}"/>
<rect y="268" width="${W}" height="52" fill="url(#mist)" opacity=".7"/>
<path fill="url(#midF)" filter="url(#soft)" d="${midForest}"/>
<path fill="#123c7e" fill-opacity=".2" filter="url(#crown)" d="${smallTree[2]}"/><path fill="#123c7e" d="${smallTree[0]}"/><path fill="none" stroke="#123c7e" stroke-width=".85" stroke-linecap="round" d="${smallTree[1]}"/>
<path fill="url(#nearF)" d="${nearForest}"/>
<path fill="url(#fg)" filter="url(#focus)" d="${giants}"/>
${renderBirds()}
<rect y="320" width="${W}" height="${H - 320}" fill="#12366f" mask="url(#fadeMask)"/>
</svg>
`
writeFileSync(out, svg)
console.log(out, (svg.length / 1024).toFixed(1) + " KB")
