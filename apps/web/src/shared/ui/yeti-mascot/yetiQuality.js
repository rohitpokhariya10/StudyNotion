// Chooses how the mascot is shown before anything heavy is downloaded.
//
// - "static": the poster only (data saver, explicit request).
// - "light" (205k triangles, 18k fur clusters) when the stage is drawn with
//   too few device pixels for the standard coat's extra fibres to resolve,
//   or the device reports little memory or few cores.
// - "standard" (305k triangles, 38k fur clusters) otherwise.
//
// Being a phone is not a reason by itself: a large, high-density stage on a
// capable phone gets the standard model.
const SMALL_STAGE_DEVICE_PX = 560

export function chooseYetiQuality({
  requested = "auto",
  stageWidth = 0,
  devicePixelRatio = 1,
  deviceMemory,
  hardwareConcurrency,
  saveData = false,
} = {}) {
  if (requested === "static") return { mode: "static", reason: "requested" }
  if (saveData) return { mode: "static", reason: "save-data" }
  if (requested === "standard" || requested === "light")
    return { mode: "3d", quality: requested, reason: "requested" }
  if (Number.isFinite(deviceMemory) && deviceMemory <= 4)
    return { mode: "3d", quality: "light", reason: "memory" }
  if (Number.isFinite(hardwareConcurrency) && hardwareConcurrency <= 4)
    return { mode: "3d", quality: "light", reason: "cpu" }
  const ratio = Math.min(Math.max(devicePixelRatio || 1, 1), 2)
  if (stageWidth > 0 && stageWidth * ratio < SMALL_STAGE_DEVICE_PX)
    return { mode: "3d", quality: "light", reason: "stage-size" }
  return { mode: "3d", quality: "standard", reason: "capable" }
}

// Reads the environment for chooseYetiQuality. Every field is optional:
// browsers that do not report a value are not penalised.
export function readDeviceHints() {
  try {
    return {
      devicePixelRatio: window.devicePixelRatio || 1,
      deviceMemory: navigator.deviceMemory,
      hardwareConcurrency: navigator.hardwareConcurrency,
      saveData: navigator.connection?.saveData === true,
    }
  } catch {
    return {}
  }
}

// WebGL with hardware acceleration. Software rasterisers fail
// `failIfMajorPerformanceCaveat` and keep the poster instead of rendering a
// 300k-triangle coat at a few frames per second.
export function canRender3D() {
  try {
    if (typeof WebGLRenderingContext === "undefined") return false
    const probe = document.createElement("canvas")
    const options = { failIfMajorPerformanceCaveat: true }
    const context =
      probe.getContext("webgl2", options) || probe.getContext("webgl", options)
    if (!context) return false
    context.getExtension("WEBGL_lose_context")?.loseContext()
    return true
  } catch {
    return false
  }
}
