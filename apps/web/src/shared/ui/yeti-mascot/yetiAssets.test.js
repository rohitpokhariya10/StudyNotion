import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const loader = vi.hoisted(() => ({
  parseAsync: vi.fn(),
  decoderConfig: vi.fn(),
  dracoDispose: vi.fn(),
}))

vi.mock("three/addons/loaders/GLTFLoader.js", () => ({
  GLTFLoader: class {
    setDRACOLoader() {
      return this
    }
    parseAsync(...args) {
      return loader.parseAsync(...args)
    }
  },
}))
vi.mock("three/addons/loaders/DRACOLoader.js", () => ({
  DRACOLoader: class {
    setDecoderPath() {
      return this
    }
    setDecoderConfig(config) {
      loader.decoderConfig(config)
      return this
    }
    dispose() {
      loader.dracoDispose()
      return this
    }
  },
}))

const URL = "/mascot/yeti-v4.2/prahit_mascot_web.glb"
const okResponse = () => ({
  ok: true,
  status: 200,
  arrayBuffer: async () => new ArrayBuffer(8),
})

// Fresh module state (cache, prefetch) for every test.
const load = async () => {
  vi.resetModules()
  return import("./yetiAssets")
}

beforeEach(() => {
  loader.parseAsync.mockReset()
  loader.parseAsync.mockResolvedValue({
    scene: { name: "root" },
    animations: [],
  })
  loader.decoderConfig.mockReset()
  loader.dracoDispose.mockReset()
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => okResponse())
  )
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe("acquireYetiModel", () => {
  it("downloads and parses once for every mounted mascot", async () => {
    const { acquireYetiModel } = await load()
    const first = acquireYetiModel(URL)
    const second = acquireYetiModel(URL)
    expect(second.promise).toBe(first.promise)
    const model = await first.promise
    expect(model.scene.name).toBe("root")
    expect(fetch).toHaveBeenCalledTimes(1)
    expect(loader.parseAsync).toHaveBeenCalledTimes(1)
    // The decoder workers are released once the model is decoded.
    expect(loader.dracoDispose).toHaveBeenCalledTimes(1)
  })

  it("keeps the parsed model while in use and drops it a minute after the last release", async () => {
    vi.useFakeTimers()
    const { acquireYetiModel } = await load()
    const first = acquireYetiModel(URL)
    const second = acquireYetiModel(URL)
    await first.promise
    first.release()
    first.release() // idempotent
    vi.advanceTimersByTime(120_000)
    second.release()
    vi.advanceTimersByTime(59_000)
    const revisit = acquireYetiModel(URL)
    await revisit.promise
    expect(loader.parseAsync).toHaveBeenCalledTimes(1)
    revisit.release()
    vi.advanceTimersByTime(60_000)
    await acquireYetiModel(URL).promise
    expect(loader.parseAsync).toHaveBeenCalledTimes(2)
    expect(fetch).toHaveBeenCalledTimes(2)
  })

  it("retries after a failed parse", async () => {
    const { acquireYetiModel } = await load()
    loader.parseAsync.mockRejectedValueOnce(new Error("bad glb"))
    await expect(acquireYetiModel(URL).promise).rejects.toThrow("bad glb")
    await acquireYetiModel(URL).promise
    expect(loader.parseAsync).toHaveBeenCalledTimes(2)
  })

  it("rejects on an HTTP error instead of parsing an error page", async () => {
    const { acquireYetiModel } = await load()
    fetch.mockResolvedValueOnce({ ok: false, status: 404 })
    await expect(acquireYetiModel(URL).promise).rejects.toThrow("404")
    expect(loader.parseAsync).not.toHaveBeenCalled()
  })

  it("uses the WebAssembly decoder when allowed, the JS decoder otherwise", async () => {
    let assets = await load()
    await assets.acquireYetiModel(URL).promise
    expect(loader.decoderConfig).not.toHaveBeenCalled()

    // A CSP without 'wasm-unsafe-eval' makes compiling throw.
    vi.stubGlobal("WebAssembly", {
      Module: class {
        constructor() {
          throw new Error("Refused to compile WebAssembly")
        }
      },
    })
    assets = await load()
    await assets.acquireYetiModel(URL).promise
    expect(loader.decoderConfig).toHaveBeenCalledWith({ type: "js" })
  })

  it("reuses bytes prefetched before the scene chunk arrived", async () => {
    vi.resetModules()
    const { prefetchYetiModel } = await import("./yetiPrefetch")
    const { acquireYetiModel } = await import("./yetiAssets")
    prefetchYetiModel(URL)
    prefetchYetiModel(URL)
    await acquireYetiModel(URL).promise
    expect(fetch).toHaveBeenCalledTimes(1)
  })
})
