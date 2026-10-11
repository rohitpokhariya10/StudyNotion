// Loads and caches the parsed GLB. Part of the lazily imported scene chunk.
//
// Every mounted mascot clones the cached node tree (42 objects) and shares
// its geometry, materials and texture, so revisiting Login/Signup neither
// downloads nor decodes the model again. The parsed model is dropped a
// minute after the last mascot unmounts.
import { AnimationClip, AnimationUtils } from "three"
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js"
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js"

import { YETI_ASSETS } from "./yetiConfig"
import { markYetiModelParsed, takeYetiModelBytes } from "./yetiPrefetch"

const EVICT_AFTER_MS = 60_000
const entries = new Map()

// The WebAssembly decoder is several times faster, but needs CSP
// 'wasm-unsafe-eval'. Blob workers inherit the page's policy, so a tiny
// module compiled here tells whether the workers may compile the decoder.
const wasmAllowed = () => {
  try {
    if (typeof WebAssembly !== "object") return false
    new WebAssembly.Module(Uint8Array.of(0, 97, 115, 109, 1, 0, 0, 0))
    return true
  } catch {
    return false
  }
}

// Clips as exported (inspected in the GLB):
// - Idle, 4 s loop: breathing scale on Body_CTRL, tiny Head_CTRL sway, and
//   blinks at fixed times (1.5 s and 3.3 s of every loop).
// - Blink, 1 s: eyelid morphs closing 0.27-0.47 s, idle otherwise.
// - Look, 2 s: Eye_L_CTRL / Eye_R_CTRL glance left then right (~11°).
// - Wave, 4 s: Arm_R / Forearm_R / Hand_R raise, wave and return to rest.
// Blinks are scheduled at random instead, so Idle keeps only its breathing
// and sway, and Blink is trimmed to the closure itself (frames 8-14).
export function prepareYetiClips(animations = []) {
  const byName = new Map(animations.map((clip) => [clip.name, clip]))
  const idle = byName.get("Idle")
  const blink = byName.get("Blink")
  return {
    idle: idle
      ? new AnimationClip(
          "Idle",
          idle.duration,
          idle.tracks.filter(
            (track) => !track.name.endsWith(".morphTargetInfluences")
          )
        )
      : null,
    blink: blink ? AnimationUtils.subclip(blink, "Blink", 7.5, 14.5, 30) : null,
    look: byName.get("Look") || null,
    wave: byName.get("Wave") || null,
  }
}

async function parse(url) {
  const bytes = await takeYetiModelBytes(url)
  const draco = new DRACOLoader().setDecoderPath(YETI_ASSETS.draco)
  if (!wasmAllowed()) draco.setDecoderConfig({ type: "js" })
  try {
    const gltf = await new GLTFLoader()
      .setDRACOLoader(draco)
      .parseAsync(bytes, "")
    return { scene: gltf.scene, clips: prepareYetiClips(gltf.animations) }
  } finally {
    // Terminates the decoder workers; the model is decoded once.
    draco.dispose()
  }
}

export function acquireYetiModel(url) {
  let entry = entries.get(url)
  if (!entry) {
    const created = { users: 0, timer: 0, promise: parse(url) }
    created.promise.then(
      () => markYetiModelParsed(url, true),
      () => {
        if (entries.get(url) === created) entries.delete(url)
      }
    )
    entries.set(url, created)
    entry = created
  }
  window.clearTimeout(entry.timer)
  entry.users += 1
  const owned = entry
  let released = false
  return {
    promise: owned.promise,
    release() {
      if (released) return
      released = true
      owned.users -= 1
      if (owned.users > 0) return
      owned.timer = window.setTimeout(() => {
        if (owned.users > 0 || entries.get(url) !== owned) return
        entries.delete(url)
        markYetiModelParsed(url, false)
      }, EVICT_AFTER_MS)
    },
  }
}
