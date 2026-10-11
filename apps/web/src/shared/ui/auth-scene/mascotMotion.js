// Pure motion model for the authentication mascot. Positions are in canvas
// units (the supplied artwork's pixel grid, see yeti-layers.json) unless
// noted.

export const clamp = (value, min, max) => Math.min(max, Math.max(min, value))

export const smoothstep = (edge0, edge1, x) => {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1)
  return t * t * (3 - 2 * t)
}

// Frame-rate independent exponential approach toward `target`.
export const damp = (current, target, rate, dt) =>
  target + (current - target) * Math.exp(-rate * dt)

// Exact step of a critically damped spring (no overshoot from rest, the same
// result at any frame rate). `state` holds { value, velocity }.
export function spring(state, target, omega, dt) {
  const error = state.value - target
  const temp = (state.velocity + omega * error) * dt
  const decay = Math.exp(-omega * dt)
  return {
    value: target + (error + temp) * decay,
    velocity: (state.velocity - omega * temp) * decay,
  }
}

// Pose limits, applied to the shared gaze (a vector inside the unit disc).
// The artwork's own pose (including its head tilt) is the zero pose. The
// layer build sizes the stage for these extremes (LIMITS in
// docs/growed-redesign/artwork/auth-yeti/build_layers.py), so keep the two
// in step.
export const POSE = Object.freeze({
  headShiftX: 14, // canvas units
  headShiftY: 9,
  headRotate: 5, // degrees, about the neck
  bodyRotate: 1.7, // degrees of upper-body lean, applied as a shear about
  // the feet so they stay planted
})

export const RATES = Object.freeze({
  gaze: 14, // eyes respond first (exponential rate, 1/s)
  head: 7.5, // head follows the eyes (spring frequency, rad/s)
  body: 5, // upper body follows more gently
  lidClose: 22,
  lidOpen: 11,
})

// Shared gaze toward a point from a stable anchor between the eyes (both in
// client pixels). Saturates smoothly with distance instead of snapping to a
// clamp, so slow sweeps stay readable across the whole card.
export function gazeToward(anchor, point, reach) {
  const dx = point.x - anchor.x
  const dy = point.y - anchor.y
  const distance = Math.hypot(dx, dy)
  if (distance < 1e-6) return { x: 0, y: 0 }
  const strength = Math.tanh(distance / reach)
  return { x: (dx / distance) * strength, y: (dy / distance) * strength }
}

// Rotates a vector by `degrees` (screen axes: y down).
export const rotateVector = ({ x, y }, degrees) => {
  const a = (degrees * Math.PI) / 180
  return {
    x: x * Math.cos(a) - y * Math.sin(a),
    y: x * Math.sin(a) + y * Math.cos(a),
  }
}

// Pupil offset (canvas units, in the head's axes, which are turned by
// `degrees` on screen) for a unit-disc gaze: the gaze is turned into the
// head's axes and scaled by the eye's travel, so both eyes point the same
// way and never move further than their travel ellipse.
export function pupilOffset(gaze, travel, degrees = 0) {
  const length = Math.hypot(gaze.x, gaze.y)
  const unit = length > 1 ? 1 / length : 1
  const local = rotateVector({ x: gaze.x * unit, y: gaze.y * unit }, -degrees)
  return { x: local.x * travel.x, y: local.y * travel.y }
}

// Head and upper-body pose for a gaze vector.
export const poseForGaze = (gaze) => ({
  headX: gaze.x * POSE.headShiftX,
  headY: gaze.y * POSE.headShiftY,
  headRotate: gaze.x * POSE.headRotate,
  bodyRotate: gaze.x * POSE.bodyRotate,
})

// Eyelid closure over a blink of `duration` seconds: quick close, slower open.
export function blinkClosure(t, duration = 0.2) {
  if (t <= 0 || t >= duration) return 0
  const close = duration * 0.38
  return t < close
    ? Math.sin(((t / close) * Math.PI) / 2)
    : Math.cos((((t - close) / (duration - close)) * Math.PI) / 2)
}

// Eyelids. The upper lid's edge sweeps over the eyeball like a lid turning
// about it: arched along the top of the eye when open, straight across the
// middle, and curving into the gentle smile of a closed eye just below the
// centre, where the lower lid rises to meet it.
export const LID = Object.freeze({ seam: 0.4 })
const SWEEP = Math.acos(-LID.seam)

// Edge heights at closure `c`, as fractions of the eye's half-height below
// its centre (negative: above): the upper and lower lid edges at mid-eye.
export const lidEdges = (c) => ({
  upper: -Math.cos(clamp(c, 0, 1) * SWEEP),
  lower: 1 - (1 - LID.seam) * smoothstep(0.3, 1, c),
})

const f2 = (n) => n.toFixed(2)
// SVG arc between the eye's corners through height k * ry (k < 0: above).
const arcTo = (toX, cy, rx, ry, k, clockwise) =>
  Math.abs(k) < 0.01
    ? `L ${f2(toX)} ${f2(cy)}`
    : `A ${f2(rx)} ${f2(Math.abs(k) * ry)} 0 0 ${clockwise ? 1 : 0} ${f2(toX)} ${f2(cy)}`

// Paths in the eye's own (untilted) axes for closure `c`: `clip` covers the
// eye between its outline and the lid edges, `edge` is the upper lid's rim
// (stopping short of the corners, where the lids meet).
export function lidPaths({ cx, cy, rx, ry }, c) {
  const { upper, lower } = lidEdges(c)
  const left = cx - rx
  const right = cx + rx
  // Upper: along the top of the eye, back along the lid edge.
  const top = `M ${f2(left)} ${f2(cy)} ${arcTo(right, cy, rx, ry, -1, true)} ${arcTo(left, cy, rx, ry, upper, upper > 0)} Z`
  // Lower: along the bottom of the eye, back along the lower lid's edge.
  const bottom = `M ${f2(left)} ${f2(cy)} ${arcTo(right, cy, rx, ry, 1, false)} ${arcTo(left, cy, rx, ry, lower, true)} Z`
  const rim = []
  for (let i = 0; i <= 16; i++) {
    const u = -0.84 + (1.68 * i) / 16
    rim.push(`${f2(cx + rx * u)} ${f2(cy + upper * ry * Math.sqrt(1 - u * u))}`)
  }
  return { clip: `${top} ${bottom}`, edge: `M ${rim.join(" L ")}` }
}
