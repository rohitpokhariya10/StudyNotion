import { describe, expect, it } from "vitest"

import {
  createFollowState,
  FOLLOW_LIMITS,
  followAngles,
  gazeFromPointer,
  POINTER_REST_MS,
  relaxRestingPointer,
  resetFollow,
  setFollowTarget,
  stepFollow,
} from "./pointerFollow"

const run = (state, seconds, fps) => {
  const frames = Math.round(seconds * fps)
  const trace = []
  for (let i = 0; i < frames; i++) {
    stepFollow(state, 1 / fps)
    trace.push({ eyes: state.eyes.x, head: state.head.x })
  }
  return trace
}

describe("pointer follow (production V4.2 model)", () => {
  it("keeps the production limits and rest delay", () => {
    expect(FOLLOW_LIMITS).toEqual({
      eyeYaw: 0.17,
      eyePitch: 0.075,
      headYaw: 0.14,
      headPitch: 0.08,
      headRoll: 0.008,
    })
    expect(POINTER_REST_MS).toBe(1200)
  })

  it.each([30, 60, 120])(
    "approaches the target without overshoot at %i fps",
    (fps) => {
      const state = createFollowState()
      setFollowTarget(state, 0.75, 0.4)
      const trace = run(state, 3, fps)
      for (let i = 1; i < trace.length; i++) {
        expect(trace[i].eyes).toBeGreaterThanOrEqual(trace[i - 1].eyes)
        expect(trace[i].eyes).toBeLessThanOrEqual(state.target.x)
        expect(trace[i].head).toBeLessThanOrEqual(state.target.x)
      }
      expect(state.eyes.x).toBe(state.target.x)
      expect(state.head.x).toBeCloseTo(state.target.x, 5)
    }
  )

  it("is frame-rate independent", () => {
    const at = (fps) => {
      const state = createFollowState()
      setFollowTarget(state, 1, -1)
      run(state, 0.5, fps)
      return state
    }
    const slow = at(30)
    const fast = at(120)
    expect(fast.eyes.x).toBeCloseTo(slow.eyes.x, 6)
    expect(fast.head.y).toBeCloseTo(slow.head.y, 6)
  })

  it("moves the eyes before the head", () => {
    const state = createFollowState()
    setFollowTarget(state, 1, 0)
    run(state, 0.1, 60)
    expect(state.eyes.x).toBeGreaterThan(state.head.x * 1.5)
  })

  it("bounds every angle by the limits", () => {
    const state = createFollowState()
    setFollowTarget(state, 5, -9)
    run(state, 5, 60)
    const { eyes, head } = followAngles(state)
    expect(Math.abs(eyes[1])).toBeCloseTo(FOLLOW_LIMITS.eyeYaw, 6)
    expect(Math.abs(eyes[0])).toBeCloseTo(FOLLOW_LIMITS.eyePitch, 6)
    expect(Math.abs(head[1])).toBeCloseTo(FOLLOW_LIMITS.headYaw, 6)
    expect(Math.abs(head[0])).toBeCloseTo(FOLLOW_LIMITS.headPitch, 6)
    expect(Math.abs(head[2])).toBeCloseTo(FOLLOW_LIMITS.headRoll, 6)
  })

  it("ignores tiny offsets and non-finite input", () => {
    const state = createFollowState()
    setFollowTarget(state, 0.02, -0.01)
    expect(state.target).toEqual({ x: 0, y: 0 })
    setFollowTarget(state, Number.NaN, Infinity)
    expect(state.target).toEqual({ x: 0, y: 0 })
    stepFollow(state, Number.NaN)
    expect(state.eyes).toEqual({ x: 0, y: 0 })
  })

  it("relaxes a resting pointer only after the delay", () => {
    const state = createFollowState()
    setFollowTarget(state, 0.8, 0)
    expect(relaxRestingPointer(state, 1000 + POINTER_REST_MS - 1, 1000)).toBe(
      false
    )
    expect(state.target.x).toBeGreaterThan(0)
    expect(relaxRestingPointer(state, 1000 + POINTER_REST_MS, 1000)).toBe(true)
    expect(state.target).toEqual({ x: 0, y: 0 })
    run(state, 4, 60)
    expect(state.eyes).toEqual({ x: 0, y: 0 })
    expect(state.head).toEqual({ x: 0, y: 0 })
  })

  it("resets to neutral", () => {
    const state = createFollowState()
    setFollowTarget(state, 1, 1)
    run(state, 1, 60)
    resetFollow(state)
    expect(state).toEqual(createFollowState())
  })
})

describe("gazeFromPointer", () => {
  const anchor = { x: 300, y: 400 }

  it("points toward the pointer with y up", () => {
    const right = gazeFromPointer(anchor, { x: 900, y: 400 }, 300)
    expect(right.x).toBeGreaterThan(0.9)
    expect(right.y).toBeCloseTo(0, 6)
    const above = gazeFromPointer(anchor, { x: 300, y: 100 }, 300)
    expect(above.y).toBeGreaterThan(0.7)
    const below = gazeFromPointer(anchor, { x: 300, y: 700 }, 300)
    expect(below.y).toBeLessThan(-0.7)
  })

  it("saturates smoothly below 1 and keeps the direction", () => {
    const near = gazeFromPointer(anchor, { x: 360, y: 400 }, 300)
    const far = gazeFromPointer(anchor, { x: 3000, y: 400 }, 300)
    expect(near.x).toBeGreaterThan(0)
    expect(near.x).toBeLessThan(far.x)
    expect(Math.hypot(far.x, far.y)).toBeLessThanOrEqual(1)
    const diagonal = gazeFromPointer(anchor, { x: 600, y: 100 }, 300)
    expect(diagonal.x).toBeCloseTo(diagonal.y, 6)
  })

  it("returns neutral at the anchor or for invalid input", () => {
    expect(gazeFromPointer(anchor, anchor, 300)).toEqual({ x: 0, y: 0 })
    expect(gazeFromPointer(anchor, { x: 500, y: 400 }, 0)).toEqual({
      x: 0,
      y: 0,
    })
    expect(gazeFromPointer(anchor, { x: Number.NaN, y: 1 }, 300)).toEqual({
      x: 0,
      y: 0,
    })
  })
})
