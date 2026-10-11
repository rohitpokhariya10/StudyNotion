// Browser module: renders scene layers to transparent images with
// supersampling, and small image helpers shared by the generator.
import * as THREE from "three"

export function createRenderer() {
  const canvas = document.createElement("canvas")
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: false,
    alpha: true,
    premultipliedAlpha: true,
    preserveDrawingBuffer: true,
  })
  renderer.setClearColor(0x000000, 0)
  renderer.autoClear = true
  return renderer
}

// Frame camera: `frame` is the window of the z = 0 plane that fills the image
// ({ left, right, bottom, top } in world units). The camera looks straight
// down -z from (centre x, eyeY, distance) with an off-axis projection, so
// verticals stay vertical. `wide` extends the window left and right by that
// many frame widths with the same projection (for layers that bleed).
export function frameCamera(
  frame,
  { distance = 9, eyeY = 1.75, wide = 0 } = {}
) {
  const width = frame.right - frame.left
  const cx = (frame.left + frame.right) / 2
  const near = 0.1
  const k = near / distance
  const camera = new THREE.PerspectiveCamera()
  camera.position.set(cx, eyeY, distance)
  camera.lookAt(cx, eyeY, 0)
  camera.updateMatrixWorld()
  camera.projectionMatrix.makePerspective(
    (frame.left - width * wide - cx) * k,
    (frame.right + width * wide - cx) * k,
    (frame.top - eyeY) * k,
    (frame.bottom - eyeY) * k,
    near,
    100
  )
  camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert()
  return camera
}

// Renders `scene` into a transparent RGBA buffer of width x height (after
// downsampling by `ss`). Returns unpremultiplied pixels, top row first.
export function renderToPixels(renderer, scene, camera, width, height, ss = 2) {
  const W = width * ss
  const H = height * ss
  const target = new THREE.WebGLRenderTarget(W, H, {
    samples: 4,
    type: THREE.UnsignedByteType,
    format: THREE.RGBAFormat,
    colorSpace: THREE.NoColorSpace,
  })
  renderer.setRenderTarget(target)
  renderer.setClearColor(0x000000, 0)
  renderer.clear()
  renderer.render(scene, camera)
  const raw = new Uint8Array(W * H * 4)
  renderer.readRenderTargetPixels(target, 0, 0, W, H, raw)
  renderer.setRenderTarget(null)
  target.dispose()
  const out = new Uint8ClampedArray(width * height * 4)
  const n = ss * ss
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let r = 0
      let g = 0
      let b = 0
      let a = 0
      for (let sy = 0; sy < ss; sy++) {
        const row = (H - 1 - (y * ss + sy)) * W
        for (let sx = 0; sx < ss; sx++) {
          const i = (row + x * ss + sx) * 4
          // Render targets hold straight colour with alpha coverage from MSAA
          // resolve, i.e. premultiplied against transparent black.
          r += raw[i]
          g += raw[i + 1]
          b += raw[i + 2]
          a += raw[i + 3]
        }
      }
      const o = (y * width + x) * 4
      if (a > 0) {
        out[o] = (r / a) * 255
        out[o + 1] = (g / a) * 255
        out[o + 2] = (b / a) * 255
      }
      out[o + 3] = a / n
    }
  }
  return { data: out, width, height }
}

export function toCanvas({ data, width, height }) {
  const canvas = document.createElement("canvas")
  canvas.width = width
  canvas.height = height
  canvas.getContext("2d").putImageData(new ImageData(data, width, height), 0, 0)
  return canvas
}

export const encode = (canvas, type = "image/png", quality = 0.92) =>
  canvas.toDataURL(type, quality).split(",")[1]

// Tight bounding box of non-transparent pixels, padded.
export function alphaBounds({ data, width, height }, pad = 2) {
  let x0 = width
  let y0 = height
  let x1 = -1
  let y1 = -1
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++)
      if (data[(y * width + x) * 4 + 3] > 1) {
        if (x < x0) x0 = x
        if (x > x1) x1 = x
        if (y < y0) y0 = y
        if (y > y1) y1 = y
      }
  if (x1 < 0) return null
  x0 = Math.max(0, x0 - pad)
  y0 = Math.max(0, y0 - pad)
  x1 = Math.min(width - 1, x1 + pad)
  y1 = Math.min(height - 1, y1 + pad)
  return { x: x0, y: y0, width: x1 - x0 + 1, height: y1 - y0 + 1 }
}

export function crop(canvas, box) {
  const out = document.createElement("canvas")
  out.width = box.width
  out.height = box.height
  out
    .getContext("2d")
    .drawImage(
      canvas,
      box.x,
      box.y,
      box.width,
      box.height,
      0,
      0,
      box.width,
      box.height
    )
  return out
}
