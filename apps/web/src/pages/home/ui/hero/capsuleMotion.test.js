import { describe, expect, it } from "vitest"

import {
  capsuleSurfacePoint,
  damp,
  GAZE,
  gazeToward,
  JUMP,
  jumpPose,
} from "./capsuleMotion"

const settle = (hz, seconds) => {
  let value = 0
  for (let frame = 0; frame < Math.round(seconds * hz); frame += 1)
    value = damp(value, 1, GAZE.bodyLambda, 1 / hz)
  return value
}

describe("capsule motion", () => {
  it("damps identically at different refresh rates", () => {
    expect(settle(30, 0.5)).toBeCloseTo(settle(144, 0.5), 10)
    expect(settle(60, 0.5)).toBeCloseTo(
      1 - Math.exp(-GAZE.bodyLambda * 0.5),
      10
    )
  })

  it("jumps continuously, peaks at the apex and lands exactly at rest", () => {
    const start = jumpPose(0)
    expect(start).toMatchObject({ lift: 0, stretch: 1, squint: 1 })
    expect(jumpPose(JUMP.apex).lift).toBeCloseTo(JUMP.height, 6)
    expect(jumpPose(JUMP.duration)).toEqual({ lift: 0, stretch: 1, squint: 1 })
    expect(jumpPose(-1)).toEqual(jumpPose(JUMP.duration + 1))

    let previous = jumpPose(0)
    for (let t = 0.001; t < JUMP.duration; t += 0.001) {
      const pose = jumpPose(t)
      expect(Math.abs(pose.lift - previous.lift)).toBeLessThan(0.02)
      expect(Math.abs(pose.stretch - previous.stretch)).toBeLessThan(0.01)
      expect(pose.lift).toBeGreaterThanOrEqual(0)
      expect(pose.lift).toBeLessThanOrEqual(JUMP.height + 1e-9)
      expect(pose.stretch).toBeGreaterThanOrEqual(JUMP.squash - 1e-9)
      expect(pose.stretch).toBeLessThanOrEqual(JUMP.stretch + 1e-9)
      previous = pose
    }
  })

  it("scales the jump height without changing its timing", () => {
    expect(jumpPose(JUMP.apex, 0.2).lift).toBeCloseTo(0.2, 6)
    expect(jumpPose(0.3, 0.2).stretch).toBe(jumpPose(0.3).stretch)
  })

  it("looks towards the target and stays within the gaze range", () => {
    const anchor = { x: 0, y: 1, z: 0.4 }
    expect(gazeToward({ x: 1, y: 1, z: 1.2 }, anchor).yaw).toBeGreaterThan(0)
    expect(gazeToward({ x: -1, y: 1, z: 1.2 }, anchor).yaw).toBeLessThan(0)
    expect(gazeToward({ x: 0, y: 0, z: 1.2 }, anchor).pitch).toBeGreaterThan(0)
    expect(gazeToward({ x: 0, y: 2, z: 1.2 }, anchor).pitch).toBeLessThan(0)
    const far = gazeToward({ x: -50, y: 50, z: 1.2 }, anchor)
    expect(Math.hypot(far.yaw, far.pitch)).toBeLessThanOrEqual(GAZE.maxAngle)
  })

  it("keeps the direction of a diagonal gaze while limiting its size", () => {
    const anchor = { x: 0, y: 1, z: 0.4 }
    const near = gazeToward({ x: 0.3, y: 0.7, z: 1.8 }, anchor)
    const far = gazeToward({ x: 3, y: -2, z: 1.8 }, anchor)
    expect(near.yaw).toBeCloseTo(
      near.pitch *
        (Math.atan2(0.3, 1.4) / Math.atan2(0.3, Math.hypot(0.3, 1.4))),
      6
    )
    const raw = {
      yaw: Math.atan2(3, 1.4),
      pitch: Math.atan2(3, Math.hypot(3, 1.4)),
    }
    expect(far.pitch / far.yaw).toBeCloseTo(raw.pitch / raw.yaw, 6)
  })

  it("keeps eye points just above the capsule surface, including the domes", () => {
    const radius = 0.45
    const halfLength = 0.166
    const offset = 0.004
    for (const theta of [-1.4, -0.4, 0, 0.7, 1.4])
      for (const arc of [-0.8, -0.2, 0, 0.15, 0.3, 0.6]) {
        const point = capsuleSurfacePoint(
          radius,
          halfLength,
          theta,
          arc,
          offset
        )
        const axisY = Math.min(halfLength, Math.max(-halfLength, point.y))
        const distance = Math.hypot(point.x, point.y - axisY, point.z)
        expect(distance).toBeCloseTo(radius + offset, 6)
      }
  })
})
