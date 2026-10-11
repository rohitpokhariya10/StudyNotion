import { fireEvent, render, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { YETI_ASSETS } from "./yetiConfig"
import YetiMascot from "./YetiMascot"

const scenes = vi.hoisted(() => [])

vi.mock("./yetiScene", () => ({
  createYetiScene: vi.fn((options) => {
    const scene = {
      options,
      load: vi.fn(async () => true),
      start: vi.fn(),
      stop: vi.fn(),
      resize: vi.fn(),
      renderOnce: vi.fn(),
      greet: vi.fn(() => true),
      setClosed: vi.fn(),
      setPointer: vi.fn(),
      clearPointer: vi.fn(),
      invalidateRect: vi.fn(),
      dispose: vi.fn(),
      running: true,
    }
    scenes.push(scene)
    return scene
  }),
}))

const stage = (container) => container.querySelector(".sn-yeti")
const pointer = (type, pointerType = "mouse") => {
  const event = new Event(type)
  Object.assign(event, { pointerType, clientX: 900, clientY: 300 })
  return event
}

// A browser with accelerated WebGL and a `width`-pixel stage.
const enableWebGL = ({ width = 496, ratio = 2 } = {}) => {
  vi.stubGlobal("WebGLRenderingContext", function WebGLRenderingContext() {})
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
    getExtension: () => ({ loseContext() {} }),
  })
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({
    x: 0,
    y: 0,
    left: 0,
    top: 0,
    width,
    height: width / 1.27,
    right: width,
    bottom: width / 1.27,
  })
  vi.stubGlobal("devicePixelRatio", ratio)
  Object.defineProperty(navigator, "hardwareConcurrency", {
    value: 8,
    configurable: true,
  })
}

const mockReducedMotion = (matches) =>
  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => ({
      matches,
      addEventListener() {},
      removeEventListener() {},
    }))
  )

beforeEach(() => {
  scenes.length = 0
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => ({
      ok: true,
      arrayBuffer: async () => new ArrayBuffer(8),
    }))
  )
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      disconnect() {}
    }
  )
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      observe() {}
      disconnect() {}
    }
  )
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  delete navigator.connection
  window.sessionStorage.clear()
})

describe("YetiMascot", () => {
  it("is decorative and shows the poster where WebGL is unavailable", async () => {
    const { container, rerender } = render(<YetiMascot className="placed" />)
    const element = stage(container)
    expect(element).toHaveAttribute("aria-hidden", "true")
    expect(element).toHaveClass("sn-yeti", "placed")
    await waitFor(() => expect(element).toHaveAttribute("data-state", "static"))
    expect(container.querySelector("canvas")).toBeNull()
    const [open, closed] = container.querySelectorAll("img")
    expect(open).toHaveAttribute("alt", "")
    expect(open).toHaveAttribute("data-visible", "true")
    expect(closed).toHaveAttribute("data-visible", "false")

    rerender(<YetiMascot className="placed" eyesClosed />)
    expect(element).toHaveAttribute("data-eyes", "closed")
    expect(closed).toHaveAttribute("data-visible", "true")
  })

  it("keeps the poster for reduced motion without loading the scene", async () => {
    enableWebGL()
    mockReducedMotion(true)
    const { createYetiScene } = await import("./yetiScene")
    const { container } = render(<YetiMascot />)
    expect(stage(container)).toHaveAttribute("data-state", "static")
    await new Promise((resolve) => setTimeout(resolve, 250))
    expect(createYetiScene).not.toHaveBeenCalled()
    expect(fetch).not.toHaveBeenCalled()
  })

  it("keeps the poster for data saver", async () => {
    enableWebGL()
    Object.defineProperty(navigator, "connection", {
      value: { saveData: true },
      configurable: true,
    })
    const { container } = render(<YetiMascot />)
    await waitFor(() =>
      expect(stage(container)).toHaveAttribute("data-state", "static")
    )
    expect(fetch).not.toHaveBeenCalled()
  })

  it("loads the scene, fades it in and greets once", async () => {
    enableWebGL()
    const { container, rerender } = render(<YetiMascot />)
    const element = stage(container)
    expect(element).toHaveAttribute("data-state", "loading")
    // The model download starts alongside the scene chunk.
    expect(fetch).toHaveBeenCalledWith(YETI_ASSETS.standard, expect.anything())
    await waitFor(() => expect(element).toHaveAttribute("data-state", "live"))
    const [scene] = scenes
    expect(scene.options.canvas).toBe(container.querySelector("canvas"))
    expect(scene.load).toHaveBeenCalledWith(YETI_ASSETS.standard)
    expect(scene.setClosed).toHaveBeenCalledWith(false, true)
    expect(scene.start).toHaveBeenCalled()
    expect(element).toHaveAttribute("data-quality", "standard")
    expect(container.querySelector("canvas")).toHaveAttribute(
      "data-visible",
      "true"
    )
    expect(container.querySelector("img")).toHaveAttribute(
      "data-visible",
      "false"
    )
    await waitFor(() => expect(scene.greet).toHaveBeenCalledOnce(), {
      timeout: 2000,
    })

    rerender(<YetiMascot eyesClosed />)
    expect(scene.setClosed).toHaveBeenLastCalledWith(true)
  })

  it("skips the greeting when asked", async () => {
    enableWebGL()
    const { container } = render(<YetiMascot greet={false} />)
    await waitFor(() =>
      expect(stage(container)).toHaveAttribute("data-state", "live")
    )
    await new Promise((resolve) => setTimeout(resolve, 800))
    expect(scenes[0].greet).not.toHaveBeenCalled()
  })

  it("greets once per browser session when asked", async () => {
    enableWebGL()
    const first = render(<YetiMascot greet="session" />)
    await waitFor(() => expect(scenes[0]?.greet).toHaveBeenCalledOnce(), {
      timeout: 2000,
    })
    first.unmount()
    const second = render(<YetiMascot greet="session" />)
    await waitFor(() =>
      expect(second.container.querySelector(".sn-yeti")).toHaveAttribute(
        "data-state",
        "live"
      )
    )
    await new Promise((resolve) => setTimeout(resolve, 800))
    expect(scenes[1].greet).not.toHaveBeenCalled()
  })

  it("still greets when session storage is unavailable", async () => {
    enableWebGL()
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked")
    })
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked")
    })
    render(<YetiMascot greet="session" />)
    await waitFor(() => expect(scenes[0]?.greet).toHaveBeenCalledOnce(), {
      timeout: 2000,
    })
  })

  it("waves on click only when interactive and live, and passes lean through", async () => {
    enableWebGL()
    const { container, rerender } = render(
      <YetiMascot greet={false} interactive lean priority />
    )
    const element = stage(container)
    expect(container.querySelector("img")).toHaveAttribute(
      "fetchpriority",
      "high"
    )
    // Not live yet: nothing to wave.
    expect(element).not.toHaveAttribute("data-interactive")
    await waitFor(() => expect(element).toHaveAttribute("data-state", "live"))
    expect(scenes[0].options.lean).toBe(true)
    expect(element).toHaveAttribute("data-interactive")
    fireEvent.click(element)
    expect(scenes[0].greet).toHaveBeenCalledOnce()

    rerender(<YetiMascot greet={false} lean />)
    expect(element).not.toHaveAttribute("data-interactive")
    fireEvent.click(element)
    // Same scene (lean unchanged): still only the earlier click's wave.
    expect(scenes).toHaveLength(1)
    expect(scenes[0].greet).toHaveBeenCalledOnce()
  })

  it("uses the light model for a small stage", async () => {
    enableWebGL({ width: 203, ratio: 2 })
    const { container } = render(<YetiMascot />)
    await waitFor(() =>
      expect(stage(container)).toHaveAttribute("data-quality", "light")
    )
    expect(scenes[0].load).toHaveBeenCalledWith(YETI_ASSETS.light)
  })

  it("forwards mouse movement but not touch, and recentres on blur", async () => {
    enableWebGL()
    const { container } = render(<YetiMascot />)
    await waitFor(() =>
      expect(stage(container)).toHaveAttribute("data-state", "live")
    )
    const [scene] = scenes
    window.dispatchEvent(pointer("pointermove", "touch"))
    expect(scene.setPointer).not.toHaveBeenCalled()
    window.dispatchEvent(pointer("pointermove", "mouse"))
    expect(scene.setPointer).toHaveBeenCalledWith(900, 300)
    window.dispatchEvent(new Event("blur"))
    expect(scene.clearPointer).toHaveBeenCalled()
  })

  it("falls back to the poster when the model cannot load", async () => {
    enableWebGL()
    const { createYetiScene } = await import("./yetiScene")
    createYetiScene.mockImplementationOnce((options) => {
      const scene = {
        options,
        load: vi.fn(async () => {
          throw new Error("404")
        }),
        dispose: vi.fn(),
      }
      scenes.push(scene)
      return scene
    })
    vi.spyOn(console, "warn").mockImplementation(() => {})
    const { container } = render(<YetiMascot />)
    await waitFor(() =>
      expect(stage(container)).toHaveAttribute("data-state", "static")
    )
    expect(scenes[0].dispose).toHaveBeenCalled()
    expect(container.querySelector("img")).toHaveAttribute(
      "data-visible",
      "true"
    )
  })

  it("rebuilds once after a lost context without greeting again, then keeps the poster", async () => {
    enableWebGL()
    const { container } = render(<YetiMascot />)
    const element = stage(container)
    await waitFor(() => expect(scenes[0]?.greet).toHaveBeenCalled(), {
      timeout: 2000,
    })
    const firstCanvas = container.querySelector("canvas")

    scenes[0].options.onContextLost()
    await waitFor(() => expect(scenes).toHaveLength(2))
    expect(scenes[0].dispose).toHaveBeenCalled()
    await waitFor(() => expect(element).toHaveAttribute("data-state", "live"))
    expect(container.querySelector("canvas")).not.toBe(firstCanvas)
    await new Promise((resolve) => setTimeout(resolve, 800))
    expect(scenes[1].greet).not.toHaveBeenCalled()

    scenes[1].options.onContextLost()
    await waitFor(() => expect(element).toHaveAttribute("data-state", "static"))
    expect(scenes[1].dispose).toHaveBeenCalled()
    expect(container.querySelector("canvas")).toBeNull()
  })

  it("disposes the scene and stops listening on unmount", async () => {
    enableWebGL()
    const { container, unmount } = render(<YetiMascot />)
    await waitFor(() =>
      expect(stage(container)).toHaveAttribute("data-state", "live")
    )
    const [scene] = scenes
    unmount()
    expect(scene.dispose).toHaveBeenCalled()
    window.dispatchEvent(pointer("pointermove"))
    expect(scene.setPointer).not.toHaveBeenCalled()
  })

  it("abandons a pending load when unmounted early", async () => {
    enableWebGL()
    const { unmount } = render(<YetiMascot />)
    unmount()
    await new Promise((resolve) => setTimeout(resolve, 250))
    expect(scenes).toHaveLength(0)
  })
})
