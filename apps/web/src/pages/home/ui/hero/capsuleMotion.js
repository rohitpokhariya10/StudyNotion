// Motion model for the homepage capsule characters, kept free of three.js so
// it can be unit tested. Ranges and timings were tuned against frame captures
// of the reference hero; they are approximations, not values from its source.

export const clamp = (value, min, max) => Math.min(max, Math.max(min, value))
const easeOutCubic = (t) => 1 - (1 - t) ** 3
const easeInOutSine = (t) => (1 - Math.cos(Math.PI * t)) / 2

// Exact exponential approach: the same result for any frame rate.
export const damp = (current, target, lambda, delta) =>
  target + (current - target) * Math.exp(-lambda * delta)

// Gaze: both characters look at one shared target (the pointer projected onto
// a plane in front of them), each from its own position. The eyes slide over
// the surface and lead; the body turns more slowly behind them. The response
// is isotropic, so the eyes move the same way for a diagonal as the pointer.
export const GAZE = Object.freeze({
  // World z of the shared target plane; nearer the characters = wider turns.
  // At this depth the eye travel grows almost linearly with pointer distance,
  // as on the reference, before easing off towards the silhouette.
  targetDepth: 1.8,
  // Largest gaze angle (radians) in any direction.
  maxAngle: 1,
  // Together these reproduce the reference's overall settling (about two
  // thirds of the way after 0.25 s, no overshoot) with the eyes leading.
  eyeLambda: 6.5,
  bodyLambda: 3.6,
  bodyYawShare: 0.45,
  eyeYawShare: 0.55,
  bodyPitchShare: 0.22,
  // Vertical surface travel of the eyes per radian of gaze pitch, in units of
  // the character's radius. With the body's pitch this matches the sideways
  // travel per radian of yaw, so up/down reads as clearly as left/right.
  eyeTravel: 0.72,
})

// Yaw (positive = towards +x) and pitch (positive = looking down) from an
// eye anchor towards the target. The total angle is softly limited as one,
// which keeps the direction of the gaze exact.
export function gazeToward(target, anchor) {
  const dx = target.x - anchor.x
  const dy = target.y - anchor.y
  const dz = Math.max(0.2, target.z - anchor.z)
  const yaw = Math.atan2(dx, dz)
  const pitch = Math.atan2(-dy, Math.hypot(dx, dz))
  const angle = Math.hypot(yaw, pitch)
  const scale =
    angle > 1e-9
      ? (GAZE.maxAngle * Math.tanh(angle / GAZE.maxAngle)) / angle
      : 1
  return { yaw: yaw * scale, pitch: pitch * scale }
}

// Click jump, matched to the reference's shape: a short squash with squinting
// eyes, an eased rise to the apex, a gravity-like fall, a landing squash and a
// settle. Squash/stretch is applied about the body's centre, as observed.
export const JUMP = Object.freeze({
  // Apex lift in world units (about two thirds of the tall capsule's width),
  // the same for both characters.
  height: 0.63,
  // Deepest squash; each character can pass its own (the reference's short
  // character squashes less). The landing squash is slightly shallower.
  squash: 0.87,
  landingEase: 0.02,
  stretch: 1.07,
  anticipation: 0.16,
  apex: 0.5,
  landing: 0.77,
  duration: 1.1,
})

const REST = Object.freeze({ lift: 0, stretch: 1, squint: 1 })

export function jumpPose(elapsed, height = JUMP.height, squash = JUMP.squash) {
  const { anticipation, apex, duration, landing, stretch: peak } = JUMP
  if (!(elapsed >= 0) || elapsed >= duration) return REST
  if (elapsed < anticipation) {
    const p = easeInOutSine(elapsed / anticipation)
    return { lift: 0, stretch: 1 - (1 - squash) * p, squint: 1 - 0.6 * p }
  }
  if (elapsed < apex) {
    const p = (elapsed - anticipation) / (apex - anticipation)
    const kick = p < 0.2 ? easeOutCubic(p / 0.2) : 1
    const relax = p < 0.2 ? 0 : easeInOutSine((p - 0.2) / 0.8)
    return {
      lift: height * 0.5 * (Math.sin((Math.PI * p) / 2) + easeInOutSine(p)),
      stretch: squash + (peak - squash) * kick - (peak - 1) * relax,
      squint: 0.4 + 0.6 * easeOutCubic(Math.min(1, p / 0.25)),
    }
  }
  if (elapsed < landing) {
    const q = (elapsed - apex) / (landing - apex)
    return { lift: height * (1 - q * q), stretch: 1 + 0.045 * q * q, squint: 1 }
  }
  const r = (elapsed - landing) / (duration - landing)
  const contact = 1 + 0.045
  const flat = squash + JUMP.landingEase
  const stretch =
    r < 0.25
      ? contact + (flat - contact) * easeOutCubic(r / 0.25)
      : r < 0.45
        ? flat
        : flat + (1 - flat) * easeInOutSine((r - 0.45) / 0.55)
  return {
    lift: 0,
    stretch,
    squint: 1 - 0.3 * clamp((1 - stretch) / (1 - flat), 0, 1),
  }
}

// Point on a capsule centred on the origin (radius, cylinder half-length) at
// azimuth `theta` and meridian arc position `s` (0 at the centre; beyond
// ±halfLength it continues over the dome), lifted `offset` off the surface.
export function capsuleSurfacePoint(radius, halfLength, theta, s, offset = 0) {
  const r = radius + offset
  let y = s
  let ring = r
  if (Math.abs(s) > halfLength) {
    const phi = Math.min(
      (Math.abs(s) - halfLength) / radius,
      Math.PI / 2 - 0.05
    )
    y = Math.sign(s) * (halfLength + r * Math.sin(phi))
    ring = r * Math.cos(phi)
  }
  return { x: ring * Math.sin(theta), y, z: ring * Math.cos(theta) }
}
