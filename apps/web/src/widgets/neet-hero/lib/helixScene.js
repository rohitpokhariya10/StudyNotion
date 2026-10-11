// Imperative Three.js scene for the Prahit NEET Mocks hero. Loaded only through a
// dynamic import so `three` never enters the main StudyNotion bundle.
//
// Concept: a calm particle double helix (biology, preparation) that unwinds
// into an ECG trace (medicine, the doctor ahead) as the visitor scrolls.
import {
  BufferAttribute,
  BufferGeometry,
  Color,
  NormalBlending,
  PerspectiveCamera,
  Points,
  Scene,
  ShaderMaterial,
  WebGLRenderer,
} from "three"

import { HERO_TIER_SETTINGS } from "./heroCapabilities"

const VERTEX_SHADER = /* glsl */ `
  uniform float uTime;
  uniform float uMorph;
  uniform float uIntro;
  uniform float uPixelRatio;
  uniform float uSize;
  attribute vec3 aHelix;
  attribute vec3 aWave;
  attribute vec3 aScatter;
  attribute float aSeed;
  attribute float aKind;
  varying float vKind;
  varying float vAlpha;

  vec3 rotateX(vec3 p, float angle) {
    float c = cos(angle);
    float s = sin(angle);
    return vec3(p.x, p.y * c - p.z * s, p.y * s + p.z * c);
  }

  void main() {
    float spin = uTime * 0.32;
    vec3 helix = rotateX(aHelix, spin + aHelix.x * 0.08);
    float morph = smoothstep(0.0, 1.0, clamp(uMorph * 1.15 - aSeed * 0.15, 0.0, 1.0));
    vec3 target = mix(helix, aWave, morph);
    float intro = smoothstep(0.0, 1.0, clamp(uIntro * 1.3 - aSeed * 0.3, 0.0, 1.0));
    vec3 position = mix(aScatter, target, aKind > 2.5 ? 0.0 : intro);
    position += vec3(
      sin(uTime * 0.6 + aSeed * 40.0),
      cos(uTime * 0.5 + aSeed * 31.0),
      sin(uTime * 0.4 + aSeed * 17.0)
    ) * (aKind > 2.5 ? 0.18 : 0.035);

    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    float size = uSize * (0.55 + aSeed * 0.9) * (aKind > 2.5 ? 0.6 : 1.0);
    gl_PointSize = size * uPixelRatio * (10.0 / -mvPosition.z);
    vKind = aKind;
    vAlpha = aKind > 2.5 ? 0.35 : mix(0.55, 1.0, intro);
  }
`

const FRAGMENT_SHADER = /* glsl */ `
  uniform vec3 uColorA;
  uniform vec3 uColorB;
  uniform vec3 uColorC;
  uniform vec3 uColorD;
  varying float vKind;
  varying float vAlpha;

  void main() {
    float distanceToCenter = length(gl_PointCoord - vec2(0.5));
    float glow = smoothstep(0.5, 0.0, distanceToCenter);
    glow *= glow;
    vec3 color = vKind < 0.5 ? uColorA : vKind < 1.5 ? uColorB : vKind < 2.5 ? uColorC : uColorD;
    gl_FragColor = vec4(color, glow * vAlpha);
  }
`

const LENGTH = 16
const RADIUS = 1.35
const TURNS = 3.2

// ECG-like baseline with periodic P-QRS-T complexes along x.
const ecg = (x) => {
  const period = 4
  const phase = (((x + LENGTH / 2) % period) + period) % period
  const bump = (center, width, height) =>
    height * Math.exp(-((phase - center) ** 2) / (2 * width * width))
  return (
    bump(0.9, 0.12, 0.28) +
    bump(1.55, 0.05, -0.45) +
    bump(1.7, 0.05, 2.1) +
    bump(1.86, 0.05, -0.7) +
    bump(2.6, 0.2, 0.42)
  )
}

const createRandom = (seed) => {
  let value = seed >>> 0
  return () => {
    value = (value + 0x6d2b79f5) >>> 0
    let mixed = Math.imul(value ^ (value >>> 15), value | 1)
    mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61)
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296
  }
}

const buildGeometry = ({ dust, particles }) => {
  const random = createRandom(20261005)
  const total = particles + dust
  const helix = new Float32Array(total * 3)
  const wave = new Float32Array(total * 3)
  const scatter = new Float32Array(total * 3)
  const seeds = new Float32Array(total)
  const kinds = new Float32Array(total)

  for (let index = 0; index < total; index += 1) {
    const seed = random()
    seeds[index] = seed
    const offset = index * 3
    const isDust = index >= particles
    let kind = 3
    let x = (random() - 0.5) * LENGTH * 1.3
    let y = (random() - 0.5) * 7
    let z = (random() - 0.5) * 6 - 1

    if (!isDust) {
      const t = random()
      const roll = random()
      x = (t - 0.5) * LENGTH
      const angle = t * TURNS * Math.PI * 2
      if (roll < 0.4) {
        kind = 0
        y = Math.cos(angle) * RADIUS
        z = Math.sin(angle) * RADIUS
      } else if (roll < 0.8) {
        kind = 1
        y = Math.cos(angle + Math.PI) * RADIUS
        z = Math.sin(angle + Math.PI) * RADIUS
      } else {
        // Rungs: snap to discrete base pairs and interpolate across.
        kind = 2
        const steps = 44
        const snapped = Math.round(t * steps) / steps
        const rungAngle = snapped * TURNS * Math.PI * 2
        const across = random() * 2 - 1
        x = (snapped - 0.5) * LENGTH
        y = Math.cos(rungAngle) * RADIUS * across
        z = Math.sin(rungAngle) * RADIUS * across
      }
    }

    helix[offset] = x
    helix[offset + 1] = y
    helix[offset + 2] = z
    wave[offset] = isDust ? x : x
    wave[offset + 1] = isDust ? y : ecg(x) - 0.4 + (random() - 0.5) * 0.06
    wave[offset + 2] = isDust ? z : (random() - 0.5) * 0.25
    scatter[offset] = (random() - 0.5) * LENGTH * 1.6
    scatter[offset + 1] = (random() - 0.5) * 9
    scatter[offset + 2] = (random() - 0.5) * 8
    kinds[index] = kind
  }

  const geometry = new BufferGeometry()
  // `position` is required by three; the shader positions from aHelix/aWave.
  geometry.setAttribute("position", new BufferAttribute(helix, 3))
  geometry.setAttribute("aHelix", new BufferAttribute(helix, 3))
  geometry.setAttribute("aWave", new BufferAttribute(wave, 3))
  geometry.setAttribute("aScatter", new BufferAttribute(scatter, 3))
  geometry.setAttribute("aSeed", new BufferAttribute(seeds, 1))
  geometry.setAttribute("aKind", new BufferAttribute(kinds, 1))
  geometry.computeBoundingSphere()
  return geometry
}

const readColor = (element, variable, fallback) => {
  try {
    const value = getComputedStyle(element).getPropertyValue(variable).trim()
    const parts = value.split(/\s+/).map(Number)
    if (parts.length === 3 && parts.every(Number.isFinite)) {
      return new Color(parts[0] / 255, parts[1] / 255, parts[2] / 255)
    }
  } catch {
    // fall through to the fallback color
  }
  return new Color(fallback)
}

export function createHelixScene({ canvas, onFallback, onPerformance, tier }) {
  const settings = HERO_TIER_SETTINGS[tier] || HERO_TIER_SETTINGS.medium
  const renderer = new WebGLRenderer({
    canvas,
    alpha: true,
    antialias: false,
    powerPreference: tier === "high" ? "high-performance" : "low-power",
  })
  renderer.setClearColor(0x000000, 0)
  let pixelRatio = Math.min(
    globalThis.devicePixelRatio || 1,
    settings.maxPixelRatio
  )
  renderer.setPixelRatio(pixelRatio)

  const scene = new Scene()
  const camera = new PerspectiveCamera(40, 1, 0.1, 100)
  camera.position.set(0, 0, 13)

  const geometry = buildGeometry(settings)
  const material = new ShaderMaterial({
    vertexShader: VERTEX_SHADER,
    fragmentShader: FRAGMENT_SHADER,
    transparent: true,
    depthWrite: false,
    // Normal blending keeps particles visible on the light canvas.
    blending: NormalBlending,
    uniforms: {
      uTime: { value: 0 },
      uMorph: { value: 0 },
      uIntro: { value: 0 },
      uPixelRatio: { value: pixelRatio },
      uSize: { value: tier === "low" ? 5.2 : 4.4 },
      uColorA: { value: readColor(canvas, "--pn-accent", "#5eeac4") },
      uColorB: { value: readColor(canvas, "--pn-cell", "#b9a7ff") },
      uColorC: { value: readColor(canvas, "--pn-pulse", "#ff7a6b") },
      uColorD: { value: readColor(canvas, "--pn-sun", "#ffc870") },
    },
  })
  const points = new Points(geometry, material)
  points.rotation.z = -0.22
  points.position.set(3.1, 0.2, 0)
  scene.add(points)

  const state = {
    disposed: false,
    morphTarget: 0,
    pointerX: 0,
    pointerY: 0,
    running: false,
    startedAt: performance.now(),
    lastFrame: 0,
    frameSamples: [],
    degraded: false,
  }

  const resize = () => {
    const width = canvas.clientWidth || 1
    const height = canvas.clientHeight || 1
    renderer.setSize(width, height, false)
    camera.aspect = width / height
    // Keep the helix comfortably framed on portrait screens.
    camera.position.z = width < height ? 19 : width < 900 ? 15 : 13
    // Keep the helix clear of the headline on wide screens.
    points.position.x = width < 900 ? 0 : width < 1280 ? 2.2 : 3.1
    camera.updateProjectionMatrix()
  }

  const degrade = () => {
    if (state.degraded) return
    state.degraded = true
    pixelRatio = 1
    renderer.setPixelRatio(1)
    material.uniforms.uPixelRatio.value = 1
    geometry.setDrawRange(0, Math.floor(geometry.attributes.aSeed.count * 0.55))
    resize()
  }

  const frame = (time) => {
    if (state.disposed) return
    const elapsed = (time - state.startedAt) / 1000
    if (state.lastFrame) {
      const delta = time - state.lastFrame
      if (state.frameSamples.length < 120) {
        state.frameSamples.push(delta)
        if (state.frameSamples.length === 120) {
          const sorted = [...state.frameSamples].sort(
            (left, right) => left - right
          )
          const median = sorted[60]
          onPerformance?.({
            medianFrameMs: median,
            tier,
            degraded: median > 28,
          })
          if (median > 28) degrade()
        }
      }
    }
    state.lastFrame = time
    const uniforms = material.uniforms
    uniforms.uTime.value = elapsed
    uniforms.uIntro.value = Math.min(1, elapsed / 2.2)
    uniforms.uMorph.value += (state.morphTarget - uniforms.uMorph.value) * 0.06
    camera.position.x += (state.pointerX * 0.6 - camera.position.x) * 0.04
    camera.position.y += (-state.pointerY * 0.4 - camera.position.y) * 0.04
    camera.lookAt(0, 0, 0)
    renderer.render(scene, camera)
  }

  const handleContextLost = (event) => {
    event.preventDefault()
    stop()
    onFallback?.("context-lost")
  }
  canvas.addEventListener("webglcontextlost", handleContextLost)

  const start = () => {
    if (state.disposed || state.running) return
    state.running = true
    state.lastFrame = 0
    renderer.setAnimationLoop(frame)
  }

  function stop() {
    if (!state.running) return
    state.running = false
    renderer.setAnimationLoop(null)
  }

  const dispose = () => {
    if (state.disposed) return
    stop()
    state.disposed = true
    canvas.removeEventListener("webglcontextlost", handleContextLost)
    scene.remove(points)
    geometry.dispose()
    material.dispose()
    renderer.dispose()
    // Release the GPU context immediately instead of waiting for GC.
    renderer.forceContextLoss()
  }

  resize()
  return {
    dispose,
    resize,
    setMorph(value) {
      state.morphTarget = Math.max(0, Math.min(1, value))
    },
    setPointer(x, y) {
      state.pointerX = x
      state.pointerY = y
    },
    start,
    stop,
  }
}
