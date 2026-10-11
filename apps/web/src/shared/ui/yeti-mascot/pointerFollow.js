// Gaze model of the V4.2 production viewer (prahit_production/
// pointer_follow.mjs), kept value for value: frame-rate independent,
// bounded, with fast eyes and a slower head. Angles are radians applied to
// the Eye_L_CTRL / Eye_R_CTRL / Head_CTRL objects of the GLB. The target is
// a vector in [-1, 1]², x to the yeti's screen right, y up.

export const FOLLOW_LIMITS = Object.freeze({
  eyeYaw: 0.17,
  eyePitch: 0.075,
  headYaw: 0.14,
  headPitch: 0.08,
  headRoll: 0.008,
})

// Exponential approach rates (1/s): the eyes lead, the head follows.
export const FOLLOW_RATES = Object.freeze({ eyes: 12, head: 5 })

// A resting pointer relaxes the gaze to neutral after this delay.
export const POINTER_REST_MS = 1200

const DEAD_ZONE = 0.025

const clampUnit = (value) =>
  Math.max(-1, Math.min(1, Number.isFinite(value) ? value : 0))

// Small offsets around the centre do nothing, then the response is linear.
const response = (value) => {
  const v = clampUnit(value)
  const magnitude = Math.abs(v)
  return magnitude <= DEAD_ZONE
    ? 0
    : Math.sign(v) * ((magnitude - DEAD_ZONE) / (1 - DEAD_ZONE))
}

export function createFollowState() {
  return { target: { x: 0, y: 0 }, eyes: { x: 0, y: 0 }, head: { x: 0, y: 0 } }
}

export function setFollowTarget(state, x, y) {
  state.target.x = response(x)
  state.target.y = response(y)
}

export function stepFollow(state, dt) {
  const step = Math.max(0, Math.min(0.1, Number.isFinite(dt) ? dt : 0))
  for (const key of ["eyes", "head"]) {
    const blend = -Math.expm1(-FOLLOW_RATES[key] * step)
    for (const axis of ["x", "y"]) {
      state[key][axis] += (state.target[axis] - state[key][axis]) * blend
      if (Math.abs(state[key][axis] - state.target[axis]) < 1e-5)
        state[key][axis] = state.target[axis]
    }
  }
  return state
}

export function resetFollow(state) {
  for (const key of ["target", "eyes", "head"]) state[key].x = state[key].y = 0
}

// Euler angles [x, y, z] ('YXZ' order) for the eyes and the head.
export function followAngles(state) {
  return {
    eyes: [
      -state.eyes.y * FOLLOW_LIMITS.eyePitch,
      state.eyes.x * FOLLOW_LIMITS.eyeYaw,
      0,
    ],
    head: [
      -state.head.y * FOLLOW_LIMITS.headPitch,
      state.head.x * FOLLOW_LIMITS.headYaw,
      -state.head.x * FOLLOW_LIMITS.headRoll,
    ],
  }
}

export function relaxRestingPointer(state, now, lastPointerAt) {
  if (
    Number.isFinite(now) &&
    Number.isFinite(lastPointerAt) &&
    now - lastPointerAt >= POINTER_REST_MS
  ) {
    setFollowTarget(state, 0, 0)
    return true
  }
  return false
}

// Follow target for a pointer anywhere on the page. `anchor` is the eyes'
// rest midpoint and `pointer` the pointer, both in client pixels (y down).
// The strength saturates smoothly with distance (`reach` pixels gives ~76%),
// so the yeti can watch the form beside it without snapping to a limit.
export function gazeFromPointer(anchor, pointer, reach) {
  const dx = pointer.x - anchor.x
  const dy = pointer.y - anchor.y
  const distance = Math.hypot(dx, dy)
  if (!Number.isFinite(distance) || distance < 1e-6 || !(reach > 0))
    return { x: 0, y: 0 }
  const strength = Math.tanh(distance / reach)
  return { x: (dx / distance) * strength, y: (-dy / distance) * strength }
}
