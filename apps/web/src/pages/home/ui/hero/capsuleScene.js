// Imperative Three.js scene for the homepage hero: two glossy capsule
// characters that look at the pointer and jump when clicked. Loaded only
// through a dynamic import so `three` never enters the main StudyNotion
// bundle. The motion model lives in capsuleMotion.js.
//
// Look: a dark and a violet dielectric with a rough base layer (soft,
// frosted silhouettes) under a smooth clear coat (crisp softbox strips), lit
// only by a small studio environment. The environment's walls take the hero's
// studio colour, a soft warm tone the grazing-angle reflections settle into
// at each silhouette; two tall softboxes and an overhead bar give the vertical
// highlight strips and the arch over each dome; a violet panel low behind the
// characters gives the bounce light along their bases.
import {
  BackSide,
  BoxGeometry,
  CapsuleGeometry,
  CircleGeometry,
  Color,
  DoubleSide,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  NoToneMapping,
  PerspectiveCamera,
  Plane,
  PlaneGeometry,
  PMREMGenerator,
  Raycaster,
  Scene,
  SRGBColorSpace,
  Vector2,
  Vector3,
  WebGLRenderer,
} from "three"

import {
  CAMERA_FOV,
  CHARACTERS,
  FRAME,
  FRAME_HEIGHT,
  FRAME_WIDTH,
} from "./capsuleLayout"
import {
  capsuleSurfacePoint,
  clamp,
  damp,
  GAZE,
  gazeToward,
  JUMP,
  jumpPose,
} from "./capsuleMotion"

const MATERIALS = {
  tall: { color: "#0b0b0d", roughness: 0.4, specularIntensity: 0.55 },
  short: { color: "#5c51dc", roughness: 0.4, specularIntensity: 0.6 },
}
// Squash depth per character, as observed on the reference.
const SQUASH = { tall: 0.87, short: 0.92 }

const BLINK_SECONDS = 0.15
// Eyes sit just above the surface so they never sink into or float off it.
const EYE_OFFSET = 0.004
// Keep a little air between a jumping character and the hero's top edge.
const JUMP_MARGIN = 0.025

const readStudioColor = (element) => {
  try {
    const value = getComputedStyle(element)
      .getPropertyValue("--sn-hero-studio")
      .trim()
    if (value) return new Color(value)
  } catch {
    // fall through to the default
  }
  return new Color("#f2f1ed")
}

const buildEnvironment = (renderer, studioColor) => {
  const environment = new Scene()
  const disposables = []
  const add = (geometry, color, setup) => {
    const material = new MeshBasicMaterial({ color, side: DoubleSide })
    const mesh = new Mesh(geometry, material)
    setup(mesh)
    environment.add(mesh)
    disposables.push(geometry, material)
  }
  const bright = (hex, intensity) => new Color(hex).multiplyScalar(intensity)

  const roomGeometry = new BoxGeometry(24, 24, 24)
  const roomMaterial = new MeshBasicMaterial({
    color: studioColor,
    side: BackSide,
  })
  environment.add(new Mesh(roomGeometry, roomMaterial))
  disposables.push(roomGeometry, roomMaterial)

  // Tall softboxes left and right of the viewer, joined by an overhead bar.
  for (const side of [-1, 1]) {
    add(new PlaneGeometry(2.5, 8.6), bright("#ffffff", 4.2), (mesh) => {
      mesh.position.set(side * 5.7, 1.4, 1.8)
      mesh.lookAt(0, 1.4, 0)
    })
  }
  add(new PlaneGeometry(13.6, 2.1), bright("#ffffff", 4), (mesh) => {
    mesh.position.set(0, 5.6, 2.1)
    mesh.lookAt(0, 0, 0)
  })
  // Small hard light for the specular glint near the top of each dome.
  add(new CircleGeometry(0.5, 32), bright("#ffffff", 7), (mesh) => {
    mesh.position.set(2.3, 3.9, 4.2)
    mesh.lookAt(0, 0, 0)
  })
  // Violet bounce from below and behind: only the lowest, grazing part of
  // each base dome reflects it, which reads as a thin rim of violet light.
  add(new PlaneGeometry(9, 3.1), bright("#6f5fff", 1.5), (mesh) => {
    mesh.position.set(0, -2.8, -5.7)
    mesh.lookAt(0, 0, 0)
  })

  const generator = new PMREMGenerator(renderer)
  const target = generator.fromScene(environment, 0.015)
  generator.dispose()
  for (const item of disposables) item.dispose()
  return target
}

// A white oval laid onto the capsule surface. Its vertices are recomputed from
// the gaze (where on the face it sits) and the blink/squint (how open it is),
// so it always follows the curved body, including over the dome.
const buildEye = (spec, side, material) => {
  const { radius, height } = spec
  const angle = Math.asin(clamp(spec.eyeSpread, 0, 0.9))
  const geometry = new CircleGeometry(0.5, 48)
  const position = geometry.attributes.position
  const disc = Float32Array.from(position.array)
  const mesh = new Mesh(geometry, material)
  mesh.renderOrder = 1
  // Positions are rewritten every pose; skip culling against stale bounds.
  mesh.frustumCulled = false
  return {
    mesh,
    disc,
    theta: angle * side,
    arc: spec.eyeY * height - height / 2,
    width: (spec.eyeWidth * radius * 2) / Math.cos(angle),
    height: spec.eyeHeight * radius * 2,
    key: "",
  }
}

const poseEye = (eye, spec, halfLength, yaw, travel, openness) => {
  const key = `${yaw.toFixed(5)}|${travel.toFixed(5)}|${openness.toFixed(4)}`
  if (key === eye.key) return false
  eye.key = key
  const position = eye.mesh.geometry.attributes.position
  for (let index = 0; index < position.count; index += 1) {
    const u = eye.disc[index * 3] * eye.width
    const v = eye.disc[index * 3 + 1] * eye.height * openness
    const point = capsuleSurfacePoint(
      spec.radius,
      halfLength,
      eye.theta + yaw + u / spec.radius,
      eye.arc + travel + v,
      EYE_OFFSET
    )
    position.setXYZ(index, point.x, point.y, point.z)
  }
  position.needsUpdate = true
  return true
}

const buildCharacter = (spec, eyeMaterial) => {
  const { radius, height } = spec
  const halfLength = height / 2 - radius

  // root: x position and jump lift. squash: scale about the body's centre.
  // body: gaze rotation. Jump and gaze are composed, never overwritten.
  const root = new Group()
  root.position.x = spec.x
  const squash = new Group()
  squash.position.y = height / 2
  const body = new Group()
  root.add(squash)
  squash.add(body)

  const material = MATERIALS[spec.id]
  const shell = new Mesh(
    new CapsuleGeometry(radius, halfLength * 2, 32, 96),
    new MeshPhysicalMaterial({
      color: material.color,
      roughness: material.roughness,
      metalness: 0,
      specularIntensity: material.specularIntensity,
      clearcoat: 1,
      clearcoatRoughness: 0.05,
    })
  )
  body.add(shell)

  const eyes = [-1, 1].map((side) => buildEye(spec, side, eyeMaterial))
  for (const eye of eyes) body.add(eye.mesh)

  const angle = Math.asin(clamp(spec.eyeSpread, 0, 0.9))
  return {
    spec,
    halfLength,
    root,
    squash,
    body,
    shell,
    eyes,
    // Midpoint between the eyes at rest, relative to the character's base.
    anchor: { x: spec.x, y: spec.eyeY * height, z: Math.cos(angle) * radius },
    pose: { bodyYaw: 0, bodyPitch: 0, eyeYaw: 0, eyeTravel: 0 },
    blink: { start: -1, next: 1.2 + Math.random() * 2.4, double: false },
    jump: { start: -1, height: JUMP.height },
  }
}

export function createCapsuleScene({ canvas, onContextLost, reducedMotion }) {
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
  renderer.toneMapping = NoToneMapping

  const scene = new Scene()
  const environment = buildEnvironment(renderer, readStudioColor(canvas))
  scene.environment = environment.texture

  const camera = new PerspectiveCamera(CAMERA_FOV, 1, 0.1, 60)
  const eyeMaterial = new MeshBasicMaterial({
    color: "#ffffff",
    toneMapped: false,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
  })
  const characters = CHARACTERS.map((spec) => {
    const character = buildCharacter(spec, eyeMaterial)
    scene.add(character.root)
    return character
  })

  const raycaster = new Raycaster()
  const ndc = new Vector2()
  const targetPlane = new Plane(new Vector3(0, 0, 1), -GAZE.targetDepth)
  const target = new Vector3()
  const state = {
    canvasWidth: 1,
    canvasHeight: 1,
    disposed: false,
    hasTarget: false,
    lastTime: 0,
    motion: !reducedMotion,
    needsRender: true,
    pointer: null,
    running: false,
    time: 0,
  }

  const resize = () => {
    const width = canvas.clientWidth || 1
    const height = canvas.clientHeight || 1
    state.canvasWidth = width
    state.canvasHeight = height
    const ratio = Math.min(globalThis.devicePixelRatio || 1, 1.75)
    renderer.setPixelRatio(ratio)
    renderer.setSize(width, height, false)
    camera.aspect = width / height
    // Fit the whole frame inside the canvas regardless of its aspect ratio.
    const tangent = Math.tan((CAMERA_FOV * Math.PI) / 360)
    const distance = Math.max(
      FRAME_HEIGHT / 2 / tangent,
      FRAME_WIDTH / 2 / (tangent * camera.aspect)
    )
    const centerX = (FRAME.left + FRAME.right) / 2
    const centerY = (FRAME.bottom + FRAME.top) / 2
    camera.position.set(centerX, centerY, distance)
    camera.lookAt(centerX, centerY, 0)
    camera.updateProjectionMatrix()
    camera.updateMatrixWorld()
    updateTarget()
    state.needsRender = true
  }

  // The pointer (canvas CSS px, possibly outside the canvas) projected onto a
  // plane in front of the characters: one shared target for both of them.
  function updateTarget() {
    const { pointer } = state
    if (!pointer) return
    ndc.set(
      (pointer.x / state.canvasWidth) * 2 - 1,
      -(pointer.y / state.canvasHeight) * 2 + 1
    )
    raycaster.setFromCamera(ndc, camera)
    state.hasTarget = Boolean(raycaster.ray.intersectPlane(targetPlane, target))
  }

  const updateBlink = (character, time) => {
    const { blink } = character
    if (!state.motion) {
      blink.start = -1
      return 1
    }
    if (blink.start < 0 && time >= blink.next) {
      blink.start = time
      blink.double = Math.random() < 0.18
    }
    if (blink.start < 0) return 1
    const length = blink.double ? BLINK_SECONDS * 2.2 : BLINK_SECONDS
    const progress = (time - blink.start) / length
    if (progress >= 1) {
      blink.start = -1
      blink.next = time + 2.4 + Math.random() * 4.2
      return 1
    }
    const phase = blink.double ? (progress * 2.2) % 1.1 : progress
    return 1 - 0.9 * Math.sin(Math.min(1, phase) * Math.PI)
  }

  const step = (value, next) => {
    if (Math.abs(next - value) > 1e-5) state.needsRender = true
    return Math.abs(next) < 1e-6 ? 0 : next
  }

  const frame = (now) => {
    if (state.disposed) return
    const seconds = now / 1000
    const delta = state.lastTime ? clamp(seconds - state.lastTime, 0, 0.1) : 0
    state.lastTime = seconds
    state.time += delta

    for (const character of characters) {
      const { jump, pose, spec } = character
      const elapsed = state.time - jump.start
      const leap =
        state.motion && jump.start >= 0
          ? jumpPose(elapsed, jump.height, SQUASH[spec.id])
          : jumpPose(-1)
      if (jump.start >= 0 && elapsed >= JUMP.duration) jump.start = -1

      // Gaze from the character's current eye position (including the jump),
      // so tracking carries on while it is in the air.
      let yaw = 0
      let pitch = 0
      if (state.motion && state.hasTarget) {
        const { anchor } = character
        ;({ yaw, pitch } = gazeToward(target, {
          x: anchor.x,
          y: anchor.y + leap.lift,
          z: anchor.z,
        }))
      }
      pose.eyeYaw = step(
        pose.eyeYaw,
        damp(pose.eyeYaw, yaw * GAZE.eyeYawShare, GAZE.eyeLambda, delta)
      )
      pose.eyeTravel = step(
        pose.eyeTravel,
        damp(
          pose.eyeTravel,
          -pitch * GAZE.eyeTravel * spec.radius,
          GAZE.eyeLambda,
          delta
        )
      )
      pose.bodyYaw = step(
        pose.bodyYaw,
        damp(pose.bodyYaw, yaw * GAZE.bodyYawShare, GAZE.bodyLambda, delta)
      )
      pose.bodyPitch = step(
        pose.bodyPitch,
        damp(
          pose.bodyPitch,
          pitch * GAZE.bodyPitchShare,
          GAZE.bodyLambda,
          delta
        )
      )
      character.body.rotation.set(pose.bodyPitch, pose.bodyYaw, 0, "YXZ")

      // Stretch is about the body's centre; lift it just enough that its base
      // never dips below the floor (as on the reference).
      const rise = leap.lift + Math.max(0, leap.stretch - 1) * (spec.height / 2)
      if (
        character.root.position.y !== rise ||
        character.squash.scale.y !== leap.stretch
      )
        state.needsRender = true
      character.root.position.y = rise
      const widen = 1 / Math.sqrt(leap.stretch)
      character.squash.scale.set(widen, leap.stretch, widen)

      const openness = updateBlink(character, state.time) * leap.squint
      for (const eye of character.eyes) {
        if (
          poseEye(
            eye,
            spec,
            character.halfLength,
            pose.eyeYaw,
            pose.eyeTravel,
            openness
          )
        )
          state.needsRender = true
      }
    }

    // Skip GPU work entirely while everything is at rest.
    if (state.needsRender) {
      renderer.render(scene, camera)
      state.needsRender = false
    }
  }

  // Highest jump that keeps a character below `visibleTop` (canvas CSS px):
  // the world height of that canvas row on the characters' plane, checked
  // against the whole jump curve (lift plus stretch), not just the apex.
  const jumpHeightFor = (character, visibleTop) => {
    if (!Number.isFinite(visibleTop)) return JUMP.height
    const tangent = Math.tan((CAMERA_FOV * Math.PI) / 360)
    const rowNdc = 1 - (2 * visibleTop) / state.canvasHeight
    const room =
      camera.position.y + rowNdc * tangent * camera.position.z - JUMP_MARGIN
    const size = character.spec.height
    let height = JUMP.height
    for (let t = 0; t < JUMP.duration; t += 0.01) {
      const pose = jumpPose(t, 1, SQUASH[character.spec.id])
      const top = Math.max(1, pose.stretch) * size
      if (pose.lift > 1e-3) height = Math.min(height, (room - top) / pose.lift)
    }
    return clamp(height, 0, JUMP.height)
  }

  const handleContextLost = (event) => {
    event.preventDefault()
    stop()
    onContextLost?.()
  }
  canvas.addEventListener("webglcontextlost", handleContextLost)

  const start = () => {
    if (state.disposed || state.running) return
    state.running = true
    state.lastTime = 0
    state.needsRender = true
    renderer.setAnimationLoop(frame)
  }

  function stop() {
    if (!state.running) return
    state.running = false
    renderer.setAnimationLoop(null)
  }

  const renderOnce = () => {
    if (state.disposed) return
    state.needsRender = true
    frame(performance.now())
  }

  const dispose = () => {
    if (state.disposed) return
    stop()
    state.disposed = true
    canvas.removeEventListener("webglcontextlost", handleContextLost)
    scene.traverse((object) => {
      if (object.isMesh) {
        object.geometry.dispose()
        if (object.material !== eyeMaterial) object.material.dispose()
      }
    })
    eyeMaterial.dispose()
    environment.dispose()
    renderer.dispose()
    // Release the GPU context immediately instead of waiting for GC.
    renderer.forceContextLoss()
  }

  resize()
  renderOnce()

  return {
    dispose,
    renderOnce,
    resize,
    start,
    stop,
    setMotion(enabled) {
      state.motion = Boolean(enabled)
      state.needsRender = true
    },
    // Pointer in canvas CSS pixels (it may lie outside the canvas). The last
    // target is kept when the pointer leaves, as on the reference.
    setPointer(x, y) {
      state.pointer = { x, y }
      updateTarget()
    },
    // Canvas CSS-pixel click; `visibleTop` is the highest canvas row the
    // character may reach. Returns true when a character was hit.
    poke(x, y, visibleTop) {
      if (!state.motion) return false
      ndc.set(
        (x / state.canvasWidth) * 2 - 1,
        -(y / state.canvasHeight) * 2 + 1
      )
      raycaster.setFromCamera(ndc, camera)
      const hit = raycaster.intersectObjects(
        characters.map((character) => character.shell),
        false
      )[0]
      const character = characters.find(({ shell }) => shell === hit?.object)
      if (!character) return false
      // One jump at a time: clicks while airborne are ignored.
      if (character.jump.start < 0) {
        character.jump.start = state.time
        character.jump.height = jumpHeightFor(character, visibleTop)
      }
      return true
    },
  }
}
