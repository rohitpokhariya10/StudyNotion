// Imperative Three.js scene for the Prahit yeti. Loaded only through a
// dynamic import so three.js never enters the main bundle.
//
// Look: the light rig of the V4.2 production viewer (prahit_viewer.js) — a
// soft RoomEnvironment, a sky/ground hemisphere and three directional lights
// (warm key, cool fill, cool rim), no shadows or post-processing — with
// Khronos PBR Neutral tone mapping instead of the viewer's AgX. Compared side
// by side on the auth panel, AgX rendered the white coat light grey; Neutral
// matches the premium Blender renders (white coat, sky-blue face). Slightly
// less ambient fill and a stronger key keep the coat's volume without dark
// striping. The coat is opaque fibre geometry: no transparency sorting.
import {
  DirectionalLight,
  HemisphereLight,
  NeutralToneMapping,
  PerspectiveCamera,
  PMREMGenerator,
  Scene,
  SRGBColorSpace,
  Vector3,
  WebGLRenderer,
} from "three"
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js"

import { gazeFromPointer } from "./pointerFollow"
import { createYetiAnimator } from "./yetiAnimation"
import { acquireYetiModel } from "./yetiAssets"

const CAMERA_FOV = 29
// Framing in model units, measured from rendered silhouettes of both GLBs
// (alpha bounds at this field of view): rest pose x ±2.24, y -0.10..5.05;
// the Wave arm sweeps out to x +3.32 while rising (5.14 at its highest);
// gaze extremes reach y 5.08. Symmetric about the body so it stays centred,
// feet on the bottom edge. Width / height must equal YETI_ASPECT.
export const YETI_FRAME = Object.freeze({
  centerX: 0,
  halfWidth: 3.42,
  bottom: -0.13,
  top: 5.26,
})

const EXPOSURE = 1.25
const ENVIRONMENT_INTENSITY = 0.6
const HEMISPHERE = { sky: 0xf0f8ff, ground: 0x71829b, intensity: 1.6 }
const LIGHTS = [
  // [x, y, z, intensity, colour]: key, fill, rim (positions as the viewer)
  [-4, 7, 6, 2.8, 0xfff4e4],
  [4, 4, 3, 0.8, 0xd9ecff],
  [2, 6, -4, 2.2, 0xe9f5ff],
]

const MAX_PIXEL_RATIO = 2
// High-refresh displays (120/144 Hz) render about every other frame: a gently
// animated mascot gains nothing visible from more, and it halves GPU work.
const MIN_FRAME_MS = 10
// Adaptive resolution: after warming up, a median frame slower than this
// lowers the pixel ratio a step (never below 1).
const SLOW_FRAME_MS = 26
const PERF_WARMUP_MS = 1500
const PERF_SAMPLES = 90
const PIXEL_RATIO_STEP = 0.25

// Frees the GPU copies of everything an instance drew, before the renderer
// itself is disposed. The CPU-side data stays in the shared cache, so another
// mount simply uploads it again.
//
// Disposing is also what detaches each renderer's "dispose" listeners from
// objects that outlive it. That includes textures only the renderer's program
// uniforms reference: three.js r186 binds one module-level DFG LUT texture
// (getDFGLUT) to every physical material and never removes its listener on
// renderer.dispose(), which kept every disposed renderer's WebGL context and
// canvas reachable (one per Login/Signup visit, found in a heap snapshot). A
// renderer still alive elsewhere re-uploads such a texture on its next frame.
export const releaseGpuResources = (root, renderer) => {
  const geometries = new Set()
  const materials = new Set()
  const textures = new Set()
  const collect = (value) => {
    if (value?.isTexture) textures.add(value)
  }
  root.traverse((object) => {
    if (!object.isMesh) return
    geometries.add(object.geometry)
    for (const material of [object.material].flat()) {
      materials.add(material)
      Object.values(material).forEach(collect)
      const uniforms = renderer?.properties?.get(material)?.uniforms
      if (uniforms)
        for (const uniform of Object.values(uniforms)) collect(uniform?.value)
    }
  })
  for (const item of [...geometries, ...materials, ...textures]) item.dispose()
}

const buildEnvironment = (renderer) => {
  const generator = new PMREMGenerator(renderer)
  const room = new RoomEnvironment()
  const target = generator.fromScene(room, 0.02)
  room.dispose?.()
  generator.dispose()
  return target
}

export function createYetiScene({
  canvas,
  onContextLost,
  lean = false,
  debug = false,
}) {
  const renderer = new WebGLRenderer({
    canvas,
    alpha: true,
    antialias: true,
    premultipliedAlpha: true,
    powerPreference: "low-power",
    failIfMajorPerformanceCaveat: true,
  })
  renderer.setClearColor(0x000000, 0)
  renderer.outputColorSpace = SRGBColorSpace
  renderer.toneMapping = NeutralToneMapping
  renderer.toneMappingExposure = EXPOSURE

  const scene = new Scene()
  const environment = buildEnvironment(renderer)
  scene.environment = environment.texture
  scene.environmentIntensity = ENVIRONMENT_INTENSITY
  scene.add(
    new HemisphereLight(HEMISPHERE.sky, HEMISPHERE.ground, HEMISPHERE.intensity)
  )
  for (const [x, y, z, intensity, color] of LIGHTS) {
    const light = new DirectionalLight(color, intensity)
    light.position.set(x, y, z)
    scene.add(light)
  }

  const camera = new PerspectiveCamera(CAMERA_FOV, 1, 0.1, 60)
  const state = {
    disposed: false,
    running: false,
    last: 0,
    pixelRatio: Math.min(globalThis.devicePixelRatio || 1, MAX_PIXEL_RATIO),
    rect: null,
    // Eyes' rest midpoint as a fraction of the canvas (x right, y down).
    anchor: { x: 0.5, y: 0.3 },
    eyesWorld: null,
    pointer: null,
    pointerDirty: false,
    perf: { since: 0, previous: 0, samples: [], medianFrameMs: 0 },
  }
  let frame = YETI_FRAME
  let model = null
  let clips = null
  let animator = null
  let lease = null

  const fitCamera = (aspect) => {
    const tangent = Math.tan((CAMERA_FOV * Math.PI) / 360)
    const { centerX, halfWidth, bottom, top } = frame
    const distance = Math.max(
      (top - bottom) / 2 / tangent,
      halfWidth / (tangent * aspect)
    )
    // Feet stay on the bottom edge whichever dimension limits the fit.
    const centerY = bottom + distance * tangent
    camera.aspect = aspect
    camera.position.set(centerX, centerY, distance)
    camera.lookAt(centerX, centerY, 0)
    camera.updateProjectionMatrix()
    camera.updateMatrixWorld()
  }

  const updateAnchor = () => {
    if (!state.eyesWorld) return
    const projected = state.eyesWorld.clone().project(camera)
    state.anchor = { x: (projected.x + 1) / 2, y: (1 - projected.y) / 2 }
  }

  const resize = () => {
    if (state.disposed) return
    const width = canvas.clientWidth || 1
    const height = canvas.clientHeight || 1
    renderer.setPixelRatio(state.pixelRatio)
    renderer.setSize(width, height, false)
    fitCamera(width / height)
    updateAnchor()
    state.rect = null
    if (state.pointer) state.pointerDirty = true
  }

  const flushPointer = () => {
    if (!state.pointerDirty || !animator) return
    state.pointerDirty = false
    if (!state.pointer) return
    if (!state.rect) state.rect = canvas.getBoundingClientRect()
    const { left, top, width, height } = state.rect
    const anchor = {
      x: left + state.anchor.x * width,
      y: top + state.anchor.y * height,
    }
    const gaze = gazeFromPointer(
      anchor,
      state.pointer,
      Math.max(140, width * 0.75)
    )
    animator.lookAt(gaze.x, gaze.y)
  }

  const trackPerformance = (now) => {
    const perf = state.perf
    if (!perf.since) perf.since = now
    const interval = now - perf.previous
    perf.previous = now
    if (now - perf.since < PERF_WARMUP_MS || interval > 250) return
    perf.samples.push(interval)
    if (perf.samples.length < PERF_SAMPLES) return
    const sorted = [...perf.samples].sort((a, b) => a - b)
    perf.medianFrameMs = sorted[Math.floor(sorted.length / 2)]
    perf.samples = []
    if (perf.medianFrameMs > SLOW_FRAME_MS && state.pixelRatio > 1) {
      state.pixelRatio = Math.max(1, state.pixelRatio - PIXEL_RATIO_STEP)
      perf.since = now
      resize()
    }
  }

  const render = () => renderer.render(scene, camera)

  const tick = (now) => {
    if (state.last && now - state.last < MIN_FRAME_MS) return
    const dt = state.last ? Math.min(0.05, (now - state.last) / 1000) : 1 / 60
    state.last = now
    flushPointer()
    animator?.update(dt)
    render()
    trackPerformance(now)
  }

  const start = () => {
    if (state.disposed || state.running || !model) return
    state.running = true
    state.last = 0
    state.perf.since = 0
    state.perf.samples = []
    renderer.setAnimationLoop(tick)
  }

  const stop = () => {
    if (!state.running) return
    state.running = false
    renderer.setAnimationLoop(null)
  }

  const handleContextLost = (event) => {
    event.preventDefault()
    stop()
    onContextLost?.()
  }
  canvas.addEventListener("webglcontextlost", handleContextLost)

  // Resolves true once the model is in the scene, its shaders are compiled
  // and a first frame (the rest pose) has been drawn.
  const load = async (url) => {
    lease = acquireYetiModel(url)
    const template = await lease.promise
    if (state.disposed) return false
    model = template.scene.clone(true)
    clips = template.clips
    scene.add(model)
    animator = createYetiAnimator(model, clips, { lean })
    model.updateMatrixWorld(true)
    const eyes = ["Eye_L_CTRL", "Eye_R_CTRL"]
      .map((name) => model.getObjectByName(name))
      .filter(Boolean)
    if (eyes.length === 2)
      state.eyesWorld = eyes[0]
        .getWorldPosition(new Vector3())
        .add(eyes[1].getWorldPosition(new Vector3()))
        .multiplyScalar(0.5)
    resize()
    await renderer.compileAsync(scene, camera)
    if (state.disposed) return false
    animator.update(0)
    render()
    return true
  }

  const dispose = () => {
    if (state.disposed) return
    stop()
    state.disposed = true
    canvas.removeEventListener("webglcontextlost", handleContextLost)
    animator?.dispose()
    if (model) {
      releaseGpuResources(model, renderer)
      scene.remove(model)
    }
    environment.dispose()
    renderer.dispose()
    // Release the GPU context immediately instead of waiting for GC.
    renderer.forceContextLoss()
    lease?.release()
    if (import.meta.env.DEV && globalThis.__prahitYeti?.renderer === renderer)
      delete globalThis.__prahitYeti
  }

  const api = {
    load,
    start,
    stop,
    resize,
    dispose,
    renderOnce() {
      if (state.disposed || !model) return
      animator?.update(0)
      render()
    },
    greet: () => animator?.greet() ?? false,
    setClosed(closed, immediate = false) {
      animator?.setClosed(closed, immediate)
    },
    // Pointer in client pixels; touch input never reaches here.
    setPointer(x, y) {
      state.pointer = { x, y }
      state.pointerDirty = true
    },
    clearPointer() {
      state.pointer = null
      state.pointerDirty = false
      animator?.relax()
    },
    // The canvas moved (scroll, layout): re-read its rectangle.
    invalidateRect() {
      state.rect = null
      if (state.pointer) state.pointerDirty = true
    },
    get pixelRatio() {
      return state.pixelRatio
    },
    get running() {
      return state.running
    },
  }

  if (import.meta.env.DEV && debug) {
    // Development-only telemetry and capture hooks (?yeti-debug).
    globalThis.__prahitYeti = {
      renderer,
      scene,
      camera,
      api,
      get model() {
        return model
      },
      get animator() {
        return animator
      },
      // Overrides the framing (model units) for measurement.
      setFrame(next) {
        frame = { ...frame, ...next }
        resize()
        return frame
      },
      get stats() {
        return {
          pixelRatio: state.pixelRatio,
          medianFrameMs: state.perf.medianFrameMs,
          calls: renderer.info.render.calls,
          triangles: renderer.info.render.triangles,
          anchor: { ...state.anchor },
          running: state.running,
        }
      },
      // Renders now and returns the bounding box of covered pixels as
      // fractions of the canvas (read before the frame is presented).
      alphaBounds(threshold = 8) {
        render()
        const gl = renderer.getContext()
        const { width, height } = gl.canvas
        const pixels = new Uint8Array(width * height * 4)
        gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels)
        let minX = width
        let minY = height
        let maxX = -1
        let maxY = -1
        for (let y = 0; y < height; y += 1)
          for (let x = 0; x < width; x += 1)
            if (pixels[(y * width + x) * 4 + 3] > threshold) {
              if (x < minX) minX = x
              if (x > maxX) maxX = x
              if (y < minY) minY = y
              if (y > maxY) maxY = y
            }
        return {
          left: minX / width,
          right: (maxX + 1) / width,
          top: 1 - (maxY + 1) / height,
          bottom: 1 - minY / height,
          width,
          height,
        }
      },
      // PNG of the rest pose at `width` CSS pixels (1x), for the poster.
      snapshot({ width = 960, closed = false } = {}) {
        const wasRunning = state.running
        stop()
        const height = Math.round(
          width / (canvas.clientWidth / canvas.clientHeight)
        )
        animator?.dispose()
        animator = createYetiAnimator(model, clips)
        animator.setClosed(closed, true)
        animator.update(0)
        renderer.setPixelRatio(1)
        renderer.setSize(width, height, false)
        fitCamera(width / height)
        render()
        const url = canvas.toDataURL("image/png")
        resize()
        if (wasRunning) start()
        return url
      },
    }
  }

  return api
}
