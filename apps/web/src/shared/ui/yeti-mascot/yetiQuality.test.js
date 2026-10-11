import { afterEach, describe, expect, it, vi } from "vitest"

import { canRender3D, chooseYetiQuality } from "./yetiQuality"

describe("chooseYetiQuality", () => {
  const capable = {
    stageWidth: 496,
    devicePixelRatio: 2,
    deviceMemory: 8,
    hardwareConcurrency: 10,
  }

  it("uses the standard model on a capable device with a large stage", () => {
    expect(chooseYetiQuality(capable)).toMatchObject({
      mode: "3d",
      quality: "standard",
    })
  })

  it("does not demote a phone with a large, dense stage", () => {
    expect(
      chooseYetiQuality({ ...capable, stageWidth: 330, devicePixelRatio: 3 })
    ).toMatchObject({ quality: "standard" })
  })

  it("uses the light model for a small stage", () => {
    expect(
      chooseYetiQuality({ ...capable, stageWidth: 203, devicePixelRatio: 2 })
    ).toMatchObject({ quality: "light", reason: "stage-size" })
  })

  it("uses the light model on low-memory or low-core devices", () => {
    expect(chooseYetiQuality({ ...capable, deviceMemory: 4 })).toMatchObject({
      quality: "light",
      reason: "memory",
    })
    expect(
      chooseYetiQuality({ ...capable, hardwareConcurrency: 4 })
    ).toMatchObject({ quality: "light", reason: "cpu" })
  })

  it("does not penalise browsers that report no hints", () => {
    expect(
      chooseYetiQuality({ stageWidth: 496, devicePixelRatio: 1.5 })
    ).toMatchObject({ quality: "standard" })
  })

  it("keeps the poster for data saver or an explicit request", () => {
    expect(chooseYetiQuality({ ...capable, saveData: true })).toEqual({
      mode: "static",
      reason: "save-data",
    })
    expect(chooseYetiQuality({ ...capable, requested: "static" })).toEqual({
      mode: "static",
      reason: "requested",
    })
  })

  it("honours an explicit model request", () => {
    expect(chooseYetiQuality({ ...capable, requested: "light" })).toMatchObject(
      { quality: "light", reason: "requested" }
    )
    expect(
      chooseYetiQuality({
        ...capable,
        stageWidth: 100,
        requested: "standard",
      })
    ).toMatchObject({ quality: "standard", reason: "requested" })
  })
})

describe("canRender3D", () => {
  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it("is false where WebGL does not exist", () => {
    expect(canRender3D()).toBe(false)
  })

  it("is false when no accelerated context can be created", () => {
    vi.stubGlobal("WebGLRenderingContext", function WebGLRenderingContext() {})
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null)
    expect(canRender3D()).toBe(false)
  })

  it("releases the probe context when WebGL is available", () => {
    vi.stubGlobal("WebGLRenderingContext", function WebGLRenderingContext() {})
    const loseContext = vi.fn()
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
      getExtension: () => ({ loseContext }),
    })
    expect(canRender3D()).toBe(true)
    expect(loseContext).toHaveBeenCalledOnce()
  })
})
