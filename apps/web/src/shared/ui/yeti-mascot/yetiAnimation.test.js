import {
  AnimationClip,
  BoxGeometry,
  Group,
  Mesh,
  MeshBasicMaterial,
  NumberKeyframeTrack,
  Object3D,
  Quaternion,
  QuaternionKeyframeTrack,
  Vector3,
  VectorKeyframeTrack,
} from "three"
import { describe, expect, it } from "vitest"

import {
  BLINK_GAP,
  createYetiAnimator,
  greetingEnvelope,
  LEAN,
  LOOK_GAP,
} from "./yetiAnimation"
import { prepareYetiClips } from "./yetiAssets"

const FPS = 30
const times = (count, start = 1 / FPS) =>
  Array.from({ length: count }, (_, i) => start + i / FPS)
const zRotation = (degrees) =>
  new Quaternion()
    .setFromAxisAngle(new Vector3(0, 0, 1), (degrees * Math.PI) / 180)
    .toArray()
const yRotation = (degrees) =>
  new Quaternion()
    .setFromAxisAngle(new Vector3(0, 1, 0), (degrees * Math.PI) / 180)
    .toArray()

// The GLB's rig in miniature: the same node names and clip channels.
function buildRig() {
  const root = new Group()
  root.name = "Prahit_Root"
  const body = new Object3D()
  body.name = "Body_CTRL"
  const head = new Object3D()
  head.name = "Head_CTRL"
  const eyes = ["Eye_L_CTRL", "Eye_R_CTRL"].map((name) => {
    const eye = new Object3D()
    eye.name = name
    head.add(eye)
    return eye
  })
  const lid = new Mesh(new BoxGeometry(), new MeshBasicMaterial())
  lid.name = "Lid_L_upper"
  lid.morphTargetDictionary = { Blink: 0 }
  lid.morphTargetInfluences = [0]
  head.add(lid)
  const arm = new Object3D()
  arm.name = "Arm_R_CTRL"
  body.add(head, arm)
  root.add(body)
  return { root, body, head, eyes, lid, arm }
}

// Raw clips shaped like the export: Idle carries blinks at fixed times,
// Blink is 1 s with the closure at frames 8-14.
function rawClips() {
  const idleTimes = times(121)
  const blinkCurve = [0, 0.26, 0.74, 1, 0.74, 0.26, 0]
  const idleBlink = idleTimes.map((_, i) =>
    i >= 43 && i <= 49 ? blinkCurve[i - 43] : 0
  )
  const blinkTimes = times(31)
  const blinkValues = blinkTimes.map((_, i) =>
    i >= 7 && i <= 13 ? blinkCurve[i - 7] : 0
  )
  return [
    new AnimationClip("Idle", -1, [
      new VectorKeyframeTrack(
        "Body_CTRL.scale",
        idleTimes,
        idleTimes.flatMap((_, i) => {
          const s = 1 + 0.005 * Math.sin((i / 120) * Math.PI * 2)
          return [s, s, s]
        })
      ),
      new NumberKeyframeTrack(
        "Lid_L_upper.morphTargetInfluences",
        idleTimes,
        idleBlink
      ),
    ]),
    new AnimationClip("Blink", -1, [
      new NumberKeyframeTrack(
        "Lid_L_upper.morphTargetInfluences",
        blinkTimes,
        blinkValues
      ),
    ]),
    new AnimationClip("Look", -1, [
      new QuaternionKeyframeTrack(
        "Eye_L_CTRL.quaternion",
        [1 / FPS, 0.5, 1.5, 61 / FPS],
        [...yRotation(0), ...yRotation(-11), ...yRotation(10), ...yRotation(0)]
      ),
    ]),
    new AnimationClip("Wave", -1, [
      new QuaternionKeyframeTrack(
        "Arm_R_CTRL.quaternion",
        [1 / FPS, 1, 3, 121 / FPS],
        [...zRotation(0), ...zRotation(74), ...zRotation(74), ...zRotation(0)]
      ),
    ]),
  ]
}

const setup = (random = () => 0.5, options = {}) => {
  const rig = buildRig()
  const clips = prepareYetiClips(rawClips())
  const animator = createYetiAnimator(rig.root, clips, { random, ...options })
  const run = (seconds, each) => {
    const frames = Math.round(seconds * 60)
    for (let i = 0; i < frames; i++) {
      animator.update(1 / 60)
      each?.(animator.state)
    }
  }
  return { ...rig, clips, animator, run }
}

const angleOf = (quaternion) =>
  2 * Math.acos(Math.min(1, Math.abs(quaternion.w)))

describe("prepareYetiClips", () => {
  it("keeps Idle's breathing but not its fixed-time blinks", () => {
    const { idle } = prepareYetiClips(rawClips())
    expect(idle.tracks.map((track) => track.name)).toEqual(["Body_CTRL.scale"])
    expect(idle.duration).toBeCloseTo(121 / FPS, 5)
  })

  it("trims Blink to the closure, starting at once", () => {
    const { blink } = prepareYetiClips(rawClips())
    const [track] = blink.tracks
    expect(track.times[0]).toBe(0)
    expect(blink.duration).toBeCloseTo(0.2, 5)
    expect(Math.max(...track.values)).toBe(1)
    expect(track.values.at(0)).toBe(0)
    expect(track.values.at(-1)).toBe(0)
  })

  it("tolerates missing clips", () => {
    expect(prepareYetiClips([])).toEqual({
      idle: null,
      blink: null,
      look: null,
      wave: null,
    })
  })
})

describe("createYetiAnimator", () => {
  it("plays Idle and composes the gaze without accumulating", () => {
    const { animator, head, eyes, run } = setup()
    expect(animator.state.playing.idle).toBe(true)
    animator.lookAt(1, 0)
    run(3, () => animator.lookAt(1, 0))
    const settled = head.quaternion.clone()
    run(3, () => animator.lookAt(1, 0))
    // Same pose after twice as long: rotations are recomposed every frame.
    expect(head.quaternion.angleTo(settled)).toBeLessThan(1e-9)
    expect(angleOf(head.quaternion)).toBeCloseTo(0.14, 2)
    expect(angleOf(eyes[0].quaternion)).toBeCloseTo(0.17, 2)
  })

  it("relaxes a resting pointer to exact neutral", () => {
    const { animator, head, eyes, run } = setup()
    animator.lookAt(-0.8, 0.5)
    run(1)
    expect(animator.state.gaze.target.x).toBeLessThan(0)
    run(0.3)
    expect(animator.state.gaze.target).toEqual({ x: 0, y: 0 })
    run(4)
    expect(head.quaternion.equals(new Quaternion())).toBe(true)
    expect(eyes[1].quaternion.equals(new Quaternion())).toBe(true)
  })

  it("recentres at once when the pointer leaves", () => {
    const { animator, run } = setup()
    animator.lookAt(1, 1)
    run(0.5, () => animator.lookAt(1, 1))
    animator.relax()
    expect(animator.state.gaze.target).toEqual({ x: 0, y: 0 })
  })

  it("closes the eyes for privacy and reopens after a short delay", () => {
    const { animator, lid, head, run } = setup()
    animator.lookAt(1, 0)
    animator.setClosed(true)
    run(0.3)
    expect(lid.morphTargetInfluences[0]).toBeGreaterThan(0.99)
    expect(animator.state.gaze.target).toEqual({ x: 0, y: 0 })
    // The head settles slightly lowered.
    expect(angleOf(head.quaternion)).toBeGreaterThan(0.05)
    animator.setClosed(false)
    run(0.15)
    expect(animator.state.closed).toBe(true)
    run(0.6)
    expect(animator.state.closed).toBe(false)
    expect(lid.morphTargetInfluences[0]).toBeLessThan(0.01)
  })

  it("applies an immediate privacy state without animating", () => {
    const { animator, lid } = setup()
    animator.setClosed(true, true)
    animator.update(0)
    expect(lid.morphTargetInfluences[0]).toBe(1)
  })

  it("blinks on a randomised schedule, never while closed", () => {
    const { run } = setup(() => 0)
    let blinks = 0
    let previous = false
    const count = (state) => {
      if (state.playing.blink && !previous) blinks++
      previous = state.playing.blink
    }
    run(BLINK_GAP.min - 0.1, count)
    expect(blinks).toBe(0)
    run(0.2, count)
    expect(blinks).toBe(1)

    const closedRig = setup(() => 0)
    closedRig.animator.setClosed(true)
    let closedBlinks = 0
    closedRig.run(10, (state) => {
      if (state.playing.blink) closedBlinks++
    })
    expect(closedBlinks).toBe(0)
  })

  it("returns the eyelids to open after a blink", () => {
    const { animator, lid, run } = setup(() => 0)
    let peak = 0
    // random() = 0 makes the first blink a double blink (0.32 s apart).
    run(BLINK_GAP.min + 0.8, () => {
      peak = Math.max(peak, lid.morphTargetInfluences[0])
    })
    expect(peak).toBeGreaterThan(0.9)
    expect(animator.state.playing.blink).toBe(false)
    expect(lid.morphTargetInfluences[0]).toBe(0)
  })

  it("plays the ambient Look only while the pointer is quiet", () => {
    const quiet = setup(() => 0)
    let looked = false
    quiet.run(LOOK_GAP.min + 0.5, (state) => {
      looked ||= state.playing.look
    })
    expect(looked).toBe(true)

    const engaged = setup(() => 0)
    let engagedLook = false
    engaged.run(LOOK_GAP.min + 2, (state) => {
      engaged.animator.lookAt(0.6, 0)
      engagedLook ||= state.playing.look
    })
    expect(engagedLook).toBe(false)
  })

  it("fades Look out when the pointer moves", () => {
    const { animator, run } = setup(() => 0)
    run(LOOK_GAP.min + 0.3)
    expect(animator.state.playing.look).toBe(true)
    animator.lookAt(0.8, 0)
    run(0.5, () => animator.lookAt(0.8, 0))
    expect(animator.state.playing.look).toBe(false)
    expect(animator.state.gaze.eyes.x).toBeGreaterThan(0.5)
  })

  it("waves once, leaving the head and eyes free, then rests", () => {
    const { animator, arm, run } = setup()
    expect(animator.greet()).toBe(true)
    expect(animator.greet()).toBe(false)
    let raised = 0
    run(2, (state) => {
      raised = Math.max(raised, angleOf(arm.quaternion))
      animator.lookAt(1, 0)
      expect(state.playing.wave).toBe(true)
    })
    expect(raised).toBeGreaterThan(1.2)
    expect(animator.state.gaze.eyes.x).toBeGreaterThan(0.9)
    run(2.3)
    expect(animator.state.playing.wave).toBe(false)
    expect(angleOf(arm.quaternion)).toBeLessThan(1e-6)
  })

  it("leans the upper body only when enabled, lagging the head and bounded", () => {
    const still = setup()
    still.run(2, () => still.animator.lookAt(1, 0))
    expect(still.body.quaternion.equals(new Quaternion())).toBe(true)

    const { animator, body, run } = setup(() => 0.5, { lean: true })
    animator.lookAt(1, 0)
    run(0.3, () => animator.lookAt(1, 0))
    const early = animator.state
    expect(early.lean.x).toBeGreaterThan(0)
    expect(early.lean.x).toBeLessThan(early.gaze.head.x)
    run(3, () => animator.lookAt(1, 0))
    const full = Math.hypot(LEAN.yaw, LEAN.roll)
    expect(angleOf(body.quaternion)).toBeGreaterThan(full * 0.9)
    expect(angleOf(body.quaternion)).toBeLessThanOrEqual(full + 1e-6)
    // The pointer rests: the lean eases back to exactly neutral.
    run(8)
    expect(body.quaternion.equals(new Quaternion())).toBe(true)
  })

  it("tilts the head with the greeting and blinks as it settles", () => {
    expect(greetingEnvelope(0)).toBe(0)
    expect(greetingEnvelope(2)).toBe(1)
    expect(greetingEnvelope(4)).toBe(0)

    const { animator, head, run } = setup(() => 0.99)
    animator.greet()
    run(2)
    expect(animator.state.greeting).toBeCloseTo(1, 5)
    expect(angleOf(head.quaternion)).toBeCloseTo(0.07, 3)
    let blinkedAfter = false
    run(2.6, (state) => {
      if (!state.playing.wave && state.playing.blink) blinkedAfter = true
    })
    expect(blinkedAfter).toBe(true)
    expect(head.quaternion.equals(new Quaternion())).toBe(true)
  })

  it("stops all actions on dispose", () => {
    const { animator } = setup()
    animator.dispose()
    expect(animator.state.playing.idle).toBe(false)
  })
})
