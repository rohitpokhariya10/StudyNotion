import {
  blinkClosure,
  damp,
  gazeToward,
  lidPaths,
  poseForGaze,
  pupilOffset,
  RATES,
  smoothstep,
  spring,
} from "./mascotMotion"

const BLINK = 0.2
const SETTLED = 0.0015
// Closing is immediate; reopening waits briefly so moving focus from a
// password field to its visibility toggle does not flutter the eyes.
const REOPEN_DELAY = 180
// A glance (the pointer suddenly far from where the eyes are looking)
// brings a blink with it, at most this often (ms).
const GLANCE_BLINK = { jump: 0.9, gap: 2600 }

// Drives the mascot's DOM. Priorities: privacy (eyes closed) > blink >
// pointer tracking > neutral rest. The eyes follow the pointer over `area`
// first; the head follows the eyes on a critically damped spring; the upper
// body leans more gently (sheared about the feet so they stay planted) and
// carries the head with it. Both arms belong to the standing body, so
// shoulder joints cannot separate. One
// rAF loop runs only while something is still moving, and pauses while the
// page or the stage is hidden.
//
// `rig`: { frame: { x, y, width, height }, pivots: { neck,
// feet }, eyes: [{ cx, cy, rx, ry, angle, travel: { x, y } }] } in canvas
// units. `elements`: stage, body, head, and per eye the pupil and
// the lid parts { clip, edge, shade, ring }.
export function createMascotController({
  area,
  elements,
  rig,
  tracking = true,
  animated = true,
}) {
  const { stage, head, body, pupils, lids } = elements
  const { eyes, frame, pivots } = rig
  // Stable anchor for the gaze: the eyes' rest midpoint (frame units). It
  // never includes the animated head pose, so motion cannot feed back.
  const anchor = {
    x: (eyes[0].cx + eyes[1].cx) / 2 - frame.x,
    y: (eyes[0].cy + eyes[1].cy) / 2 - frame.y,
  }

  const state = {
    gaze: { x: 0, y: 0 },
    headX: { value: 0, velocity: 0 },
    headY: { value: 0, velocity: 0 },
    headRotate: { value: 0, velocity: 0 },
    bodyRotate: { value: 0, velocity: 0 },
    lid: 0,
  }
  // Blink start time in the animation frame's own clock.
  let pointer = null
  let lastGlanceBlink = 0
  let closed = false
  let closedTarget = false
  let reopenTimer = 0
  let blinkStart = -1
  let blinkTimer = 0
  let frameRequest = 0
  let last = 0
  let rect = null
  let pageVisible = document.visibilityState !== "hidden"
  let onScreen = true
  let disposed = false
  let lidShown = null

  const running = () => !disposed && pageVisible && onScreen

  const targetGaze = () => {
    if (closed || !pointer || !tracking) return { x: 0, y: 0 }
    if (!rect) rect = stage.getBoundingClientRect()
    const scale = rect.width / frame.width
    return gazeToward(
      { x: rect.left + anchor.x * scale, y: rect.top + anchor.y * scale },
      pointer,
      Math.max(90, rect.width * 0.5)
    )
  }

  const PENDING = -2
  const startBlink = () => {
    if (closed || !animated) return
    blinkStart = PENDING
  }

  const pct = (value, of) => (value / of) * 100
  const write = (now) => {
    // Lean the entire connected body about the feet and carry the head
    // by the shear at the neck before adding its own tracking movement.
    const lean = state.bodyRotate.value
    const shear = Math.tan((lean * Math.PI) / 180)
    const carried = (pivot) =>
      pct(shear * (pivots.feet.y - pivot.y), frame.width)
    body.style.transform = `skewX(${(-lean).toFixed(3)}deg)`
    const headX = carried(pivots.neck) + pct(state.headX.value, frame.width)
    const headY = pct(state.headY.value, frame.height)
    head.style.transform = `translate(${headX.toFixed(3)}%, ${headY.toFixed(3)}%) rotate(${state.headRotate.value.toFixed(3)}deg)`
    // Privacy wins over blinking: a blink only adds closure when open.
    const blink =
      !closed && blinkStart >= 0
        ? blinkClosure(now / 1000 - blinkStart, BLINK)
        : 0
    const lid = Math.max(state.lid, blink)
    eyes.forEach((eye, i) => {
      // The gaze is in screen axes; the pupils live in the turned head.
      const offset = pupilOffset(state.gaze, eye.travel, state.headRotate.value)
      pupils[i]?.setAttribute(
        "transform",
        `translate(${(offset.x + (eye.iris ? eye.cx - eye.iris.cx : 0)).toFixed(2)} ${(offset.y + (eye.iris ? eye.cy - eye.iris.cy : 0)).toFixed(2)})`
      )
    })
    // Lids are only drawn while closing at all, so the open eyes are the
    // supplied artwork untouched.
    const shown = lid > 0.004
    lids.forEach((parts, i) => {
      if (!parts) return
      if (shown !== lidShown) parts.group.style.display = shown ? "" : "none"
      if (!shown) return
      const { clip, edge } = lidPaths(eyes[i], lid)
      parts.clip.setAttribute("d", clip)
      parts.edge.setAttribute("d", edge)
      parts.shade.setAttribute("d", edge)
      // The rim line darkens in as the lid comes down; the soft shadow it
      // casts on the eye fades out as the eye closes; the skin over the eye's outline
      // fades in so a closed eye has none.
      parts.edge.style.opacity = smoothstep(0.04, 0.3, lid).toFixed(3)
      parts.shade.style.opacity = (Math.min(1, lid * 6) * (1 - lid)).toFixed(3)
      parts.ring.style.opacity = smoothstep(0.2, 0.85, lid).toFixed(3)
    })
    lidShown = shown
  }

  const step = (now) => {
    frameRequest = 0
    if (!running()) {
      last = 0
      return
    }
    if (blinkStart === PENDING) blinkStart = now / 1000
    const dt = last ? Math.min(0.05, (now - last) / 1000) : 1 / 60
    last = now
    let moving = false

    const gaze = targetGaze()
    // A glance across the card brings a blink, like the eyes refocusing.
    if (
      pointer &&
      blinkStart < 0 &&
      now - lastGlanceBlink > GLANCE_BLINK.gap &&
      Math.hypot(gaze.x - state.gaze.x, gaze.y - state.gaze.y) >
        GLANCE_BLINK.jump
    ) {
      lastGlanceBlink = now
      blinkStart = now / 1000
    }
    const gx = animated ? damp(state.gaze.x, gaze.x, RATES.gaze, dt) : gaze.x
    const gy = animated ? damp(state.gaze.y, gaze.y, RATES.gaze, dt) : gaze.y
    if (Math.abs(gx - gaze.x) > SETTLED || Math.abs(gy - gaze.y) > SETTLED)
      moving = true
    state.gaze = { x: gx, y: gy }

    // Head and body follow the smoothed gaze (so they lag the eyes); with
    // the eyes closed they settle to a calm, slightly lowered pose. The
    // connected standing body leans gently beneath the head.
    const pose = closed
      ? { headX: 0, headY: 2, headRotate: 0, bodyRotate: 0 }
      : poseForGaze(state.gaze)
    for (const [key, omega] of [
      ["headX", RATES.head],
      ["headY", RATES.head],
      ["headRotate", RATES.head],
      ["bodyRotate", RATES.body],
    ]) {
      state[key] = animated
        ? spring(state[key], pose[key], omega, dt)
        : { value: pose[key], velocity: 0 }
      if (
        Math.abs(state[key].value - pose[key]) > SETTLED ||
        Math.abs(state[key].velocity) > SETTLED
      )
        moving = true
    }

    const lidTarget = closed ? 1 : 0
    state.lid = animated
      ? damp(state.lid, lidTarget, closed ? RATES.lidClose : RATES.lidOpen, dt)
      : lidTarget
    if (Math.abs(state.lid - lidTarget) > SETTLED) moving = true
    else state.lid = lidTarget

    if (blinkStart >= 0) {
      if (closed || now / 1000 - blinkStart >= BLINK) blinkStart = -1
      else moving = true
    }
    write(now)
    if (moving) frameRequest = requestAnimationFrame(step)
    else last = 0
  }

  function start() {
    if (!frameRequest && running()) frameRequest = requestAnimationFrame(step)
  }
  function stop() {
    if (frameRequest) cancelAnimationFrame(frameRequest)
    frameRequest = 0
    last = 0
  }

  const scheduleBlink = () => {
    window.clearTimeout(blinkTimer)
    if (!animated || !running()) return
    blinkTimer = window.setTimeout(
      () => {
        if (!closed && running()) {
          startBlink()
          start()
        }
        scheduleBlink()
      },
      2800 + Math.random() * 3600
    )
  }

  const invalidate = () => {
    rect = null
    if (pointer) start()
  }
  const onMove = (event) => {
    if (event.pointerType === "touch") return
    pointer = { x: event.clientX, y: event.clientY }
    start()
  }
  const onLeave = () => {
    pointer = null
    start()
  }
  const onVisibility = () => {
    pageVisible = document.visibilityState !== "hidden"
    if (pageVisible) {
      start()
      scheduleBlink()
    } else {
      stop()
      window.clearTimeout(blinkTimer)
    }
  }
  const resizeObserver =
    typeof ResizeObserver === "function" ? new ResizeObserver(invalidate) : null
  const intersection =
    typeof IntersectionObserver === "function"
      ? new IntersectionObserver(([entry]) => {
          onScreen = entry.isIntersecting
          if (onScreen) {
            start()
            scheduleBlink()
          } else {
            stop()
            window.clearTimeout(blinkTimer)
          }
        })
      : null

  if (tracking) {
    area.addEventListener("pointermove", onMove, { passive: true })
    area.addEventListener("pointerenter", onMove, { passive: true })
    area.addEventListener("pointerleave", onLeave)
    window.addEventListener("blur", onLeave)
  }
  window.addEventListener("scroll", invalidate, {
    passive: true,
    capture: true,
  })
  window.addEventListener("resize", invalidate, { passive: true })
  document.addEventListener("visibilitychange", onVisibility)
  resizeObserver?.observe(stage)
  intersection?.observe(stage)
  scheduleBlink()
  write(performance.now())

  return {
    setClosed(next) {
      if (next === closedTarget) return
      closedTarget = next
      window.clearTimeout(reopenTimer)
      if (next) {
        closed = true
        blinkStart = -1
        start()
      } else {
        reopenTimer = window.setTimeout(
          () => {
            closed = false
            start()
          },
          animated ? REOPEN_DELAY : 0
        )
      }
    },
    // For tests and verification only.
    get state() {
      return {
        gaze: { ...state.gaze },
        headRotate: state.headRotate.value,
        bodyRotate: state.bodyRotate.value,
        lid: state.lid,
        closed,
        animating: Boolean(frameRequest),
      }
    },
    dispose() {
      disposed = true
      stop()
      window.clearTimeout(blinkTimer)
      window.clearTimeout(reopenTimer)
      area.removeEventListener("pointermove", onMove)
      area.removeEventListener("pointerenter", onMove)
      area.removeEventListener("pointerleave", onLeave)
      window.removeEventListener("blur", onLeave)
      window.removeEventListener("scroll", invalidate, { capture: true })
      window.removeEventListener("resize", invalidate)
      document.removeEventListener("visibilitychange", onVisibility)
      resizeObserver?.disconnect()
      intersection?.disconnect()
    },
  }
}
