import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { createMascotController } from "./mascotController"

const rig = {
  frame: { x: 0, y: 0, width: 1000, height: 1000 },
  pivots: {
    neck: { x: 500, y: 550 },
    shoulder: { x: 750, y: 550 },
    wrist: { x: 800, y: 450 },
    feet: { x: 500, y: 980 },
  },
  eyes: [
    { cx: 400, cy: 300, rx: 50, ry: 60, angle: 0, travel: { x: 15, y: 10 } },
    { cx: 600, cy: 300, rx: 50, ry: 60, angle: 0, travel: { x: 15, y: 10 } },
  ],
}

const setup = (options = {}) => {
  const svg = (tag) =>
    document.createElementNS("http://www.w3.org/2000/svg", tag)
  const area = document.createElement("div")
  const stage = document.createElement("div")
  stage.getBoundingClientRect = () => ({
    left: 0,
    top: 0,
    width: 500,
    height: 500,
  })
  const lid = () => ({
    group: svg("g"),
    clip: svg("path"),
    edge: svg("path"),
    shade: svg("path"),
    ring: svg("g"),
  })
  const elements = {
    stage,
    head: document.createElement("div"),
    body: document.createElement("div"),
    pupils: [svg("g"), svg("g")],
    lids: [lid(), lid()],
  }
  document.body.append(area)
  const controller = createMascotController({
    area,
    elements,
    rig,
    ...options,
  })
  const closure = () => controller.state.lid
  const lidShown = () => elements.lids[0].group.style.display !== "none"
  const pupil = () => elements.pupils[0].getAttribute("transform")
  return { area, controller, closure, lidShown, pupil, elements }
}

const move = (area, x, y) =>
  area.dispatchEvent(
    Object.assign(new Event("pointermove"), {
      clientX: x,
      clientY: y,
      pointerType: "mouse",
    })
  )

describe("mascot controller", () => {
  beforeEach(() =>
    vi.useFakeTimers({
      toFake: [
        "setTimeout",
        "clearTimeout",
        "requestAnimationFrame",
        "cancelAnimationFrame",
        "performance",
      ],
    })
  )
  afterEach(() => {
    vi.useRealTimers()
    document.body.innerHTML = ""
  })

  it("follows the pointer and settles", () => {
    const { area, controller } = setup()
    move(area, 480, 150)
    // Settled before the first scheduled blink (at least 2.8 s in).
    vi.advanceTimersByTime(2700)
    expect(controller.state.gaze.x).toBeGreaterThan(0.3)
    expect(controller.state.headRotate).toBeGreaterThan(0)
    expect(controller.state.animating).toBe(false)
    controller.dispose()
  })

  it("keeps the eyes closed for privacy over pointer movement and blinks", () => {
    const { area, controller, closure, lidShown, pupil } = setup()
    expect(lidShown()).toBe(false) // open eyes are the artwork untouched
    controller.setClosed(true)
    vi.advanceTimersByTime(1000)
    expect(closure()).toBeGreaterThan(0.99)
    expect(lidShown()).toBe(true)
    const before = pupil()
    move(area, 10, 10)
    // Long enough for several scheduled blinks.
    vi.advanceTimersByTime(15000)
    expect(closure()).toBeGreaterThan(0.99)
    expect(pupil()).toBe(before)
    expect(controller.state.gaze).toEqual({ x: 0, y: 0 })
    controller.dispose()
  })

  it("reopens after the privacy state clears", () => {
    const { controller, closure, lidShown } = setup()
    controller.setClosed(true)
    vi.advanceTimersByTime(800)
    controller.setClosed(false)
    vi.advanceTimersByTime(100)
    expect(closure()).toBeGreaterThan(0.99) // brief hold avoids flutter
    vi.advanceTimersByTime(1500)
    expect(closure()).toBe(0)
    expect(lidShown()).toBe(false)
    controller.dispose()
  })

  it("keeps the same standing body from creation through idle and tracking", () => {
    const { area, controller, elements } = setup()
    expect(controller).not.toHaveProperty("greet")
    const initial = elements.body.style.transform
    vi.advanceTimersByTime(8000) // includes several natural blinks
    expect(elements.body.style.transform).toBe(initial)
    expect(elements.body.style.opacity).toBe("")
    move(area, 480, 20)
    vi.advanceTimersByTime(1500)
    expect(controller.state.gaze.x).toBeGreaterThan(0)
    expect(elements.body.style.transform).not.toBe(initial)
    expect(elements.body.style.opacity).toBe("")
    controller.dispose()
  })

  it("returns to neutral on pointer exit without repeating the greeting", () => {
    const { area, controller } = setup()
    move(area, 480, 20)
    vi.advanceTimersByTime(1500)
    expect(controller.state.gaze.x).toBeGreaterThan(0)
    area.dispatchEvent(new Event("pointerleave"))
    vi.advanceTimersByTime(2500)
    expect(controller.state.gaze.x).toBeCloseTo(0, 5)
    expect(controller.state.headRotate).toBeCloseTo(0, 3)
    controller.dispose()
  })

  it("ignores touch movement and shows a static resting pose for reduced motion", () => {
    const { area, controller, elements } = setup({
      animated: false,
      tracking: false,
    })
    area.dispatchEvent(
      Object.assign(new Event("pointermove"), {
        clientX: 480,
        clientY: 10,
        pointerType: "touch",
      })
    )
    vi.advanceTimersByTime(5000)
    expect(controller.state.gaze).toEqual({ x: 0, y: 0 })
    expect(controller.state.animating).toBe(false)
    expect(elements.body.style.transform).toBe("skewX(0.000deg)")
    controller.setClosed(true)
    vi.advanceTimersByTime(100)
    expect(controller.state.lid).toBe(1)
    controller.dispose()
  })

  it("stops listening after dispose", () => {
    const { area, controller } = setup()
    controller.dispose()
    move(area, 480, 150)
    vi.advanceTimersByTime(1000)
    expect(controller.state.gaze).toEqual({ x: 0, y: 0 })
    expect(controller.state.animating).toBe(false)
  })
})
