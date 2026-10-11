// Browser entry for generate-auth-mascot.mjs.
import * as THREE from "three"

import { buildCreature } from "./creature.js"
import { buildGround } from "./ground.js"
import {
  alphaBounds,
  createRenderer,
  crop,
  encode,
  frameCamera,
  renderToPixels,
  toCanvas,
} from "./render.js"
import { renderSky } from "./sky.js"

// Visible window of the z = 0 plane for the illustration panel (0.87 aspect).
export const FRAME = { left: -1.86, right: 1.74, bottom: -0.55, top: 3.59 }
const aspect = (FRAME.right - FRAME.left) / (FRAME.top - FRAME.bottom)
export const SIZE = { width: 1040, height: Math.round(1040 / aspect) }

// Clouds: [centre x, base y, width, height], x in [0, aspect], y up in [0, 1].
export const PANEL_SKY = {
  top: "#8cb6df",
  bottom: "#d3e3f2",
  seed: 3.1,
  clouds: [
    [0.12, 0.66, 0.5, 0.26],
    [0.5, 0.88, 0.3, 0.12],
    [0.84, 0.46, 0.4, 0.24],
    [0.18, 0.3, 0.62, 0.12],
    [0.76, 0.26, 0.5, 0.1],
  ],
}
export const PAGE_SKY = {
  top: "#a3c7e8",
  bottom: "#d9e7f3",
  seed: 7.4,
  clouds: [
    [1.3, 0.74, 0.72, 0.26],
    [1.62, 0.52, 0.42, 0.22],
    [0.16, 0.0, 0.74, 0.26],
    [-0.06, 0.2, 0.36, 0.2],
    [0.6, 0.8, 0.3, 0.08],
    [1.1, 0.18, 0.34, 0.09],
  ],
}

const layer = (renderer, camera, objects, width, height) => {
  const scene = new THREE.Scene()
  for (const object of objects) scene.add(object)
  const pixels = renderToPixels(renderer, scene, camera, width, height, 2)
  for (const object of objects) scene.remove(object)
  return pixels
}

// Slight softening for the ground behind the creature (depth of field).
const blur = (canvas, px) => {
  const out = document.createElement("canvas")
  out.width = canvas.width
  out.height = canvas.height
  const ctx = out.getContext("2d")
  ctx.filter = `blur(${px}px)`
  ctx.drawImage(canvas, 0, 0)
  return out
}

export async function preview() {
  const t0 = performance.now()
  const renderer = createRenderer()
  const creature = buildCreature({ density: 26000 })
  const ground = buildGround()
  console.log(
    `strands ${creature.strandCount}, blades ${JSON.stringify(ground.counts)} in ${Math.round(performance.now() - t0)} ms`
  )
  const camera = frameCamera(FRAME)
  const { width, height } = SIZE
  const sky = toCanvas(renderSky(renderer, { width, height, ...PANEL_SKY }))
  const back = blur(
    toCanvas(layer(renderer, camera, [ground.back], width, height)),
    1.3
  )
  const body = toCanvas(
    layer(renderer, camera, [creature.groups.body], width, height)
  )
  const head = toCanvas(
    layer(renderer, camera, [creature.groups.head], width, height)
  )
  const front = toCanvas(layer(renderer, camera, [ground.front], width, height))
  const out = document.createElement("canvas")
  out.width = width
  out.height = height
  const ctx = out.getContext("2d")
  for (const c of [sky, back, body, head, front]) ctx.drawImage(c, 0, 0)
  // Face close-up: a sub-window of the same camera, at higher resolution.
  const faceFrame = { left: -0.78, right: 0.78, bottom: 1.72, top: 2.98 }
  const closeCamera = frameCamera(FRAME)
  const k = 0.1 / 9
  const cx = (FRAME.left + FRAME.right) / 2
  closeCamera.projectionMatrix.makePerspective(
    (faceFrame.left - cx) * k,
    (faceFrame.right - cx) * k,
    (faceFrame.top - 1.75) * k,
    (faceFrame.bottom - 1.75) * k,
    0.1,
    100
  )
  closeCamera.projectionMatrixInverse
    .copy(closeCamera.projectionMatrix)
    .invert()
  const cw = 1000
  const ch = Math.round(
    (cw * (faceFrame.top - faceFrame.bottom)) /
      (faceFrame.right - faceFrame.left)
  )
  const face = document.createElement("canvas")
  face.width = cw
  face.height = ch
  const fctx = face.getContext("2d")
  fctx.fillStyle = "#a9c8e8"
  fctx.fillRect(0, 0, cw, ch)
  fctx.drawImage(
    toCanvas(layer(renderer, closeCamera, [creature.groups.body], cw, ch)),
    0,
    0
  )
  fctx.drawImage(
    toCanvas(layer(renderer, closeCamera, [creature.groups.head], cw, ch)),
    0,
    0
  )
  const page = toCanvas(
    renderSky(renderer, { width: 1600, height: 1000, ...PAGE_SKY })
  )
  console.log(`rendered in ${Math.round(performance.now() - t0)} ms`)
  return {
    "panel-preview.png": encode(out),
    "face-preview.png": encode(face),
    "page-sky-preview.png": encode(page, "image/jpeg", 0.9),
  }
}

// Sets every material in `group` to a flat colour picked per mesh (or back to
// shaded when `pick` is null).
const flatten = (group, pick) =>
  group.traverse((object) => {
    const uniforms = object.material?.uniforms
    if (!uniforms?.uFlat) return
    uniforms.uFlat.value = pick ? 1 : 0
    if (pick) uniforms.uFlatColor.value.set(...pick(object))
  })

// Ellipse from the second moments of a mask region.
const fitEllipse = (points) => {
  const n = points.length
  let mx = 0
  let my = 0
  for (const [x, y] of points) {
    mx += x
    my += y
  }
  mx /= n
  my /= n
  let sxx = 0
  let syy = 0
  let sxy = 0
  for (const [x, y] of points) {
    sxx += (x - mx) ** 2
    syy += (y - my) ** 2
    sxy += (x - mx) * (y - my)
  }
  sxx /= n
  syy /= n
  sxy /= n
  const tr = (sxx + syy) / 2
  const det = Math.sqrt(((sxx - syy) / 2) ** 2 + sxy ** 2)
  const l1 = tr + det
  const l2 = tr - det
  // Angle of the first axis; report radii along x and y for a near-upright eye.
  const angle = 0.5 * Math.atan2(2 * sxy, sxx - syy)
  const horizontalFirst = Math.abs(Math.cos(angle)) > Math.abs(Math.sin(angle))
  return {
    cx: +(mx + 0.5).toFixed(2),
    cy: +(my + 0.5).toFixed(2),
    rx: +(2 * Math.sqrt(horizontalFirst ? l1 : l2)).toFixed(2),
    ry: +(2 * Math.sqrt(horizontalFirst ? l2 : l1)).toFixed(2),
    // Tilt of the eye's horizontal axis, in (-90, 90] degrees.
    angle: +(
      ((((((horizontalFirst ? angle : angle - Math.PI / 2) * 180) / Math.PI +
        90) %
        180) +
        180) %
        180) -
      90
    ).toFixed(2),
    area: n,
  }
}

// Average skin colour around a point (ignores fur: only bluish pixels count).
const sampleSkin = ({ data, width }, x, y, r = 4) => {
  const sum = [0, 0, 0]
  let count = 0
  for (let j = -r; j <= r; j++)
    for (let i = -r; i <= r; i++) {
      const o = ((Math.round(y) + j) * width + Math.round(x) + i) * 4
      if (data[o + 3] < 250 || data[o + 2] < data[o] + 30) continue
      sum[0] += data[o]
      sum[1] += data[o + 1]
      sum[2] += data[o + 2]
      count++
    }
  return count ? sum.map((v) => v / count) : null
}
const hex = (rgb) =>
  "#" + rgb.map((v) => Math.round(v).toString(16).padStart(2, "0")).join("")
// Mean skin colour over a ring of points around the eye at the given angles.
const ringColour = (pixels, eye, degrees, reach = 1.28) => {
  const found = degrees
    .map((d) => (d * Math.PI) / 180)
    .map((a) =>
      sampleSkin(
        pixels,
        eye.cx + Math.cos(a) * eye.rx * reach,
        eye.cy + Math.sin(a) * eye.ry * reach
      )
    )
    .filter(Boolean)
  return hex(
    [0, 1, 2].map((k) => found.reduce((t, c) => t + c[k], 0) / found.length)
  )
}

const project = (camera, point, { width, height }) => {
  const v = point.clone().project(camera)
  return {
    x: +(((v.x + 1) / 2) * width).toFixed(2),
    y: +(((1 - v.y) / 2) * height).toFixed(2),
  }
}

export async function exportAll() {
  const renderer = createRenderer()
  const creature = buildCreature({ density: 26000 })
  const ground = buildGround()
  const camera = frameCamera(FRAME)
  const wideCamera = frameCamera(FRAME, { wide: 1 })
  const { width, height } = SIZE
  const files = {}
  const boxes = {}
  const webp = (canvas, quality) => encode(canvas, "image/webp", quality)

  // Layers: cropped to their content; boxes are in frame pixels.
  const put = (
    name,
    pixels,
    { offsetX = 0, quality = 0.9, soften = 0 } = {}
  ) => {
    let canvas = toCanvas(pixels)
    if (soften) canvas = blur(canvas, soften)
    const ctx = canvas.getContext("2d")
    const box = alphaBounds({
      data: ctx.getImageData(0, 0, canvas.width, canvas.height).data,
      width: canvas.width,
      height: canvas.height,
    })
    files[`${name}.webp`] = webp(crop(canvas, box), quality)
    boxes[name] = {
      x: box.x - offsetX,
      y: box.y,
      width: box.width,
      height: box.height,
    }
    return canvas
  }
  put("ledge", layer(renderer, wideCamera, [ground.back], width * 3, height), {
    offsetX: width,
    quality: 0.86,
    soften: 1.3,
  })
  put("body", layer(renderer, camera, [creature.groups.body], width, height), {
    quality: 0.92,
  })
  const headPixels = layer(
    renderer,
    camera,
    [creature.groups.head],
    width,
    height
  )
  put("head", headPixels, { quality: 0.92 })
  put(
    "grass-front",
    layer(renderer, wideCamera, [ground.front], width * 3, height),
    { offsetX: width, quality: 0.88 }
  )

  // Eye mask: eyes white, everything else in the head layer black.
  // The mouth decal has no flat mode; it never overlaps the eyes, so hide it.
  const mouth = creature.groups.head.children.find(
    (child) => child.userData.kind === "mouth"
  )
  flatten(creature.groups.head, (object) =>
    object.userData.part?.material === "eye" ? [1, 1, 1] : [0, 0, 0]
  )
  mouth.visible = false
  const mask = layer(renderer, camera, [creature.groups.head], width, height)
  mouth.visible = true
  flatten(creature.groups.head, null)
  const sides = [[], []]
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      const o = (y * width + x) * 4
      const white =
        mask.data[o] > 127 && mask.data[o + 1] > 127 && mask.data[o + 2] > 127
      if (mask.data[o + 3] > 127 && white)
        sides[x < width / 2 ? 0 : 1].push([x, y])
    }
  const eyes = sides.map(fitEllipse)

  // Lid colours: the rendered face in rings around each eye (y grows down).
  // `skin` is clear of the socket shading (lid centre); `rim` is the shaded
  // ring right at the eye (lid edge), so a closed lid blends into the face.
  const all = Array.from({ length: 12 }, (_, i) => i * 30)
  const lid = eyes.map((eye) => ({
    top: ringColour(headPixels, eye, [-150, -120, -90, -60, -30]),
    middle: ringColour(headPixels, eye, [-170, 170, -10, 10]),
    bottom: ringColour(headPixels, eye, [30, 60, 90, 120, 150]),
    skin: ringColour(headPixels, eye, all, 1.5),
    rim: ringColour(headPixels, eye, all, 1.12),
  }))

  const meta = {
    generator:
      "docs/growed-redesign/artwork/auth-mascot/generate-auth-mascot.mjs",
    frame: { width, height },
    layers: boxes,
    eyes: eyes.map((eye, i) => ({ ...eye, lid: lid[i] })),
    pivots: {
      head: project(camera, new THREE.Vector3(0, 1.72, 0.25), SIZE),
      body: project(camera, new THREE.Vector3(0, 0.02, 0.2), SIZE),
    },
    strands: creature.strandCount,
  }
  files["auth-mascot.json"] = JSON.stringify(meta, null, 2) + "\n"

  files["sky-panel.webp"] = webp(
    toCanvas(renderSky(renderer, { width, height, ...PANEL_SKY })),
    0.86
  )
  files["sky-page.webp"] = webp(
    toCanvas(renderSky(renderer, { width: 2400, height: 1500, ...PAGE_SKY })),
    0.84
  )
  return files
}
