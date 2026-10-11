// Animation controller for one yeti instance.
//
// The exported clips drive disjoint channels, so they never blend against
// each other:
//   Idle  -> Body_CTRL scale, Head_CTRL rotation (looping breath and sway)
//   Blink -> the 16 eyelid/eye "Blink" morph weights (random schedule)
//   Look  -> Eye_L_CTRL / Eye_R_CTRL rotation (ambient glance)
//   Wave  -> Arm_R / Forearm_R / Hand_R rotation (one greeting)
// Runtime layers are composed on top of the mixer's output each frame:
//   pointer gaze  -> multiplied onto the head and eye rotations
//   body lean     -> optional Body_CTRL turn toward the pointer, lagging
//                    the head (no clip animates Body_CTRL's rotation)
//   greeting      -> a head tilt and weight shift that follow the Wave
//                    clip's own raise and lower, and a blink as it settles
//   privacy lids  -> max() with the Blink morph weights
// Every runtime-driven channel is reset to its rest value before the mixer
// runs, so nothing accumulates from frame to frame and a channel no clip is
// playing returns to rest.
import { AnimationMixer, Euler, LoopOnce, LoopRepeat, Quaternion } from "three"

import {
  createFollowState,
  followAngles,
  POINTER_REST_MS,
  relaxRestingPointer,
  setFollowTarget,
  stepFollow,
} from "./pointerFollow"

// Seconds between blinks; one in eight is a double blink.
export const BLINK_GAP = Object.freeze({ min: 2.8, max: 6.4 })
const DOUBLE_BLINK = { chance: 0.125, gap: 0.32 }
// A sudden large change of gaze brings a blink, at most this often.
const GLANCE_BLINK = { jump: 0.9, gap: 2.6 }
// The ambient Look glance plays only once the pointer has been quiet for
// this long after its own rest delay, and fades out when it moves again.
export const LOOK_GAP = Object.freeze({ min: 8, max: 15 })
const LOOK_QUIET = 3
const LOOK_FADE = 0.3
// Closing for privacy is immediate; reopening waits briefly so moving focus
// from a password field to its visibility toggle does not flutter the eyes.
const REOPEN_DELAY = 0.18
const LID_RATE = { close: 22, open: 11 }
// With the eyes closed the head settles slightly lowered.
const PRIVATE_HEAD_PITCH = 0.06
// Upper-body lean toward the pointer (radians at full gaze), following the
// head's smoothed gaze at a slower rate; pivots at the feet.
export const LEAN = Object.freeze({ yaw: 0.05, pitch: 0.015, roll: 0.012 })
const LEAN_RATE = 3
// While waving, the head tilts toward the raised hand and the weight shifts
// with it, easing in and out with the arm (Wave clip seconds).
const GREETING = Object.freeze({
  headRoll: 0.07,
  bodyRoll: 0.014,
  rise: [0.15, 0.95],
  settle: [3.05, 3.95],
})

const smoothstep = (edge0, edge1, x) => {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)))
  return t * t * (3 - 2 * t)
}
// 0 → 1 → 0 over the Wave clip: the arm's raise, hold and lowering.
export const greetingEnvelope = (t) =>
  smoothstep(GREETING.rise[0], GREETING.rise[1], t) *
  (1 - smoothstep(GREETING.settle[0], GREETING.settle[1], t))

const between = (random, { min, max }) => min + random() * (max - min)

export function createYetiAnimator(
  model,
  clips,
  { random = Math.random, lean = false } = {}
) {
  const mixer = new AnimationMixer(model)
  const action = (clip, loop) => {
    if (!clip) return null
    const created = mixer.clipAction(clip)
    created.setLoop(loop, loop === LoopRepeat ? Infinity : 1)
    created.clampWhenFinished = false
    return created
  }
  const idle = action(clips.idle, LoopRepeat)
  const blink = action(clips.blink, LoopOnce)
  const look = action(clips.look, LoopOnce)
  const wave = action(clips.wave, LoopOnce)

  const head = model.getObjectByName("Head_CTRL") || null
  const eyes = ["Eye_L_CTRL", "Eye_R_CTRL"]
    .map((name) => model.getObjectByName(name))
    .filter(Boolean)
  const body = model.getObjectByName("Body_CTRL") || null
  const tracked = [head, ...eyes, body].filter(Boolean)
  const rest = tracked.map((object) => object.quaternion.clone())
  const lids = []
  model.traverse((object) => {
    const index = object.morphTargetDictionary?.Blink
    if (object.morphTargetInfluences && index !== undefined)
      lids.push({ influences: object.morphTargetInfluences, index })
  })

  const gaze = createFollowState()
  const bodyGaze = { x: 0, y: 0 }
  const turn = new Quaternion()
  const angles = new Euler(0, 0, 0, "YXZ")
  let time = 0
  let lastPointerAt = -Infinity
  let pointerActive = false
  let closedTarget = false
  let closed = false
  let reopenAt = Infinity
  let lid = 0
  let nextBlink = between(random, BLINK_GAP)
  let doubleBlink = false
  let lastGlanceBlink = -Infinity
  let nextLook = between(random, LOOK_GAP)
  let lookFading = false
  let wasWaving = false

  idle?.play()

  const running = (candidate) => Boolean(candidate?.isRunning())
  const startBlink = () => {
    if (blink && !closed) blink.reset().play()
  }

  return {
    // Pointer gaze target from gazeFromPointer (x right, y up, |v| <= 1).
    lookAt(x, y) {
      lastPointerAt = time
      pointerActive = true
      if (closed) return
      if (
        time - lastGlanceBlink > GLANCE_BLINK.gap &&
        Math.hypot(x - gaze.eyes.x, y - gaze.eyes.y) > GLANCE_BLINK.jump
      ) {
        lastGlanceBlink = time
        startBlink()
      }
      setFollowTarget(gaze, x, y)
    },
    // The pointer left the page or the window lost focus.
    relax() {
      pointerActive = false
      setFollowTarget(gaze, 0, 0)
    },
    setClosed(next, immediate = false) {
      if (next !== closedTarget) {
        closedTarget = next
        if (next) {
          closed = true
          reopenAt = Infinity
        } else reopenAt = time + REOPEN_DELAY
      }
      if (immediate) {
        closed = next
        lid = next ? 1 : 0
      }
    },
    // One Wave greeting; ignored while one is already playing.
    greet() {
      if (!wave || running(wave)) return false
      wave.reset().play()
      return true
    },
    update(dt) {
      const step = Math.max(0, Math.min(0.1, Number.isFinite(dt) ? dt : 0))
      time += step
      if (closed && !closedTarget && time >= reopenAt) closed = false

      for (let i = 0; i < tracked.length; i += 1)
        tracked[i].quaternion.copy(rest[i])
      for (const { influences, index } of lids) influences[index] = 0

      if (time >= nextBlink) {
        startBlink()
        doubleBlink = !doubleBlink && random() < DOUBLE_BLINK.chance
        nextBlink =
          time + (doubleBlink ? DOUBLE_BLINK.gap : between(random, BLINK_GAP))
      }

      if (look) {
        const engaged =
          time - lastPointerAt < POINTER_REST_MS / 1000 + LOOK_QUIET
        if (running(look)) {
          if ((engaged || closed) && !lookFading) {
            look.fadeOut(LOOK_FADE)
            lookFading = true
          }
        } else if (time >= nextLook) {
          const settled =
            gaze.head.x === 0 && gaze.head.y === 0 && gaze.target.x === 0
          if (!engaged && !closed && !running(wave) && settled) {
            look.reset().play()
            lookFading = false
            nextLook =
              time + look.getClip().duration + between(random, LOOK_GAP)
          } else nextLook = time + 1
        }
      }

      mixer.update(step)

      // A blink as the greeting settles.
      const waving = running(wave)
      if (wasWaving && !waving) {
        startBlink()
        nextBlink = Math.max(nextBlink, time + BLINK_GAP.min)
      }
      wasWaving = waving
      const greeting = waving ? greetingEnvelope(wave.time) : 0

      if (closed) setFollowTarget(gaze, 0, 0)
      else if (
        pointerActive &&
        relaxRestingPointer(gaze, time * 1000, lastPointerAt * 1000)
      )
        pointerActive = false
      stepFollow(gaze, step)

      const lidTarget = closed ? 1 : 0
      lid =
        lidTarget +
        (lid - lidTarget) *
          Math.exp(-(closed ? LID_RATE.close : LID_RATE.open) * step)
      if (Math.abs(lid - lidTarget) < 1e-3) lid = lidTarget

      // While Look plays the pointer's share of the eye rotation gives way,
      // so the two are blended rather than added.
      const lookWeight = running(look) ? look.getEffectiveWeight() : 0
      const { eyes: eyeAngles, head: headAngles } = followAngles(gaze)
      const eyeShare = 1 - lookWeight
      angles.set(eyeAngles[0] * eyeShare, eyeAngles[1] * eyeShare, 0)
      turn.setFromEuler(angles)
      for (const eye of eyes) eye.quaternion.multiply(turn)
      if (head) {
        angles.set(
          headAngles[0] + lid * PRIVATE_HEAD_PITCH,
          headAngles[1],
          headAngles[2] - greeting * GREETING.headRoll
        )
        head.quaternion.multiply(turn.setFromEuler(angles))
      }

      if (body) {
        const blend = -Math.expm1(-LEAN_RATE * step)
        for (const axis of ["x", "y"]) {
          const target = lean ? gaze.head[axis] : 0
          bodyGaze[axis] += (target - bodyGaze[axis]) * blend
          if (Math.abs(bodyGaze[axis] - target) < 1e-5) bodyGaze[axis] = target
        }
        angles.set(
          -bodyGaze.y * LEAN.pitch,
          bodyGaze.x * LEAN.yaw,
          -bodyGaze.x * LEAN.roll - greeting * GREETING.bodyRoll
        )
        body.quaternion.multiply(turn.setFromEuler(angles))
      }

      for (const { influences, index } of lids)
        influences[index] = Math.max(influences[index], lid)
    },
    // For tests and development telemetry.
    get state() {
      return {
        time,
        closed,
        lid,
        gaze: {
          target: { ...gaze.target },
          eyes: { ...gaze.eyes },
          head: { ...gaze.head },
        },
        playing: {
          idle: running(idle),
          blink: running(blink),
          look: running(look),
          wave: running(wave),
        },
        lookWeight: running(look) ? look.getEffectiveWeight() : 0,
        greeting: running(wave) ? greetingEnvelope(wave.time) : 0,
        lean: { ...bodyGaze },
        head: head?.quaternion.toArray() || null,
        body: body?.quaternion.toArray() || null,
        eye: eyes[0]?.quaternion.toArray() || null,
        blink: lids[0] ? lids[0].influences[lids[0].index] : 0,
      }
    },
    dispose() {
      mixer.stopAllAction()
      mixer.uncacheRoot(model)
    },
  }
}
