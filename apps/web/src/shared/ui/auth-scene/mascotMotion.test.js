import { describe, expect, it } from "vitest"

import {
  blinkClosure,
  damp,
  gazeToward,
  lidEdges,
  lidPaths,
  POSE,
  poseForGaze,
  pupilOffset,
  rotateVector,
  spring,
} from "./mascotMotion"

const run = (steps, dt, omega, target = 1) => {
  let state = { value: 0, velocity: 0 }
  let peak = 0
  for (let i = 0; i < steps; i++) {
    state = spring(state, target, omega, dt)
    peak = Math.max(peak, state.value)
  }
  return { state, peak }
}

describe("mascot motion", () => {
  it("damps independently of the frame rate", () => {
    let fast = 0
    for (let i = 0; i < 60; i++) fast = damp(fast, 1, 5, 1 / 60)
    let slow = 0
    for (let i = 0; i < 20; i++) slow = damp(slow, 1, 5, 1 / 20)
    expect(fast).toBeCloseTo(slow, 10)
  })

  it("follows with a critically damped spring: no overshoot, any frame rate", () => {
    const at60 = run(60, 1 / 60, 8.5)
    const at144 = run(144, 1 / 144, 8.5)
    const at30 = run(30, 1 / 30, 8.5)
    expect(at60.state.value).toBeCloseTo(at144.state.value, 10)
    expect(at60.state.value).toBeCloseTo(at30.state.value, 10)
    expect(at60.peak).toBeLessThanOrEqual(1)
    expect(run(400, 1 / 60, 8.5).state.value).toBeCloseTo(1, 6)
  })

  it("aims one shared gaze from a stable anchor and saturates smoothly", () => {
    const anchor = { x: 100, y: 100 }
    const right = gazeToward(anchor, { x: 400, y: 100 }, 200)
    expect(right.y).toBeCloseTo(0)
    expect(right.x).toBeCloseTo(Math.tanh(1.5))
    const up = gazeToward(anchor, { x: 100, y: -100 }, 200)
    expect(up.x).toBeCloseTo(0)
    expect(up.y).toBeLessThan(0)
    // Further away keeps easing toward the edge instead of jumping to it.
    const near = Math.hypot(
      ...Object.values(gazeToward(anchor, { x: 200, y: 100 }, 200))
    )
    const far = Math.hypot(
      ...Object.values(gazeToward(anchor, { x: 900, y: 100 }, 200))
    )
    expect(near).toBeLessThan(far)
    expect(far).toBeLessThan(1)
    expect(gazeToward(anchor, anchor, 200)).toEqual({ x: 0, y: 0 })
  })

  it("keeps the pupil within its travel ellipse", () => {
    const travel = { x: 16, y: 12 }
    for (let a = 0; a < Math.PI * 2; a += Math.PI / 12) {
      const offset = pupilOffset(
        { x: Math.cos(a) * 3, y: Math.sin(a) * 3 },
        travel,
        20
      )
      const inside = (offset.x / travel.x) ** 2 + (offset.y / travel.y) ** 2
      expect(inside).toBeLessThanOrEqual(1 + 1e-9)
    }
    expect(pupilOffset({ x: 0, y: 0 }, travel)).toEqual({ x: 0, y: 0 })
  })

  it("points both eyes the same way on screen in a turned head", () => {
    const travel = { x: 18, y: 18 }
    const gaze = { x: 0.7, y: -0.6 }
    // Back in screen axes, the pupil moves in the gaze direction.
    const offset = rotateVector(pupilOffset(gaze, travel, 3.5), 3.5)
    const angle = (v) => Math.atan2(v.y, v.x)
    expect(angle(offset)).toBeCloseTo(angle(gaze), 6)
  })

  it("turns the head more than the body and stays within limits", () => {
    const pose = poseForGaze({ x: 1, y: -1 })
    expect(pose.headRotate).toBe(POSE.headRotate)
    expect(pose.headY).toBe(-POSE.headShiftY)
    expect(Math.abs(pose.bodyRotate)).toBeLessThan(Math.abs(pose.headRotate))
    expect(poseForGaze({ x: 0, y: 0 })).toEqual({
      headX: 0,
      headY: 0,
      headRotate: 0,
      bodyRotate: 0,
    })
  })

  it("rotates vectors in screen axes", () => {
    const v = rotateVector({ x: 10, y: 0 }, 90)
    expect(v.x).toBeCloseTo(0)
    expect(v.y).toBeCloseTo(10)
  })

  it("sweeps the lids from the top of the eye to a closed seam", () => {
    expect(lidEdges(0)).toEqual({ upper: -1, lower: 1 })
    const closed = lidEdges(1)
    expect(closed.upper).toBeCloseTo(closed.lower, 10)
    expect(closed.upper).toBeGreaterThan(0) // just below the centre
    let previous = -1
    for (let c = 0.05; c <= 1; c += 0.05) {
      const { upper } = lidEdges(c)
      expect(upper).toBeGreaterThan(previous)
      previous = upper
    }
    const eye = { cx: 100, cy: 100, rx: 50, ry: 60 }
    // Open: both lid regions are empty arcs back along the outline.
    expect(lidPaths(eye, 0).clip).toContain("A 50.00 60.00 0 0 1 150.00 100.00")
    expect(lidPaths(eye, 0.5).edge.startsWith("M ")).toBe(true)
  })

  it("blinks closed and open again", () => {
    expect(blinkClosure(0)).toBe(0)
    expect(blinkClosure(0.2 * 0.38)).toBeCloseTo(1)
    expect(blinkClosure(0.15)).toBeGreaterThan(0)
    expect(blinkClosure(0.2)).toBe(0)
  })
})
