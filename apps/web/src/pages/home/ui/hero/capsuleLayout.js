// Shared composition for the homepage capsule characters. The WebGL scene and
// the static SVG fallback both read these values, so the fallback lines up
// with the rendered scene. Units are world units; each capsule stands on y = 0.
//
// Proportions were refined against captures of the reference hero: the tall
// capsule is ~1.95x as tall as it is wide, the short one ~1.37x, ~0.9x the
// width, with their lower edges aligned. Eye placement is a fraction of the
// capsule's height (from its base) and width.

export const CHARACTERS = Object.freeze([
  Object.freeze({
    id: "tall",
    x: 0,
    radius: 0.5,
    height: 1.95,
    eyeY: 0.67,
    eyeSpread: 0.376,
    eyeWidth: 0.133,
    eyeHeight: 0.26,
  }),
  Object.freeze({
    id: "short",
    x: 1.12,
    radius: 0.45,
    height: 1.232,
    eyeY: 0.573,
    eyeSpread: 0.37,
    eyeWidth: 0.128,
    eyeHeight: 0.252,
  }),
])

// Visible region of the scene. The extra headroom keeps the click hop and the
// pointer lean inside the canvas.
export const FRAME = Object.freeze({
  left: -0.64,
  right: 1.71,
  bottom: -0.1,
  top: 2.3,
})

export const FRAME_WIDTH = FRAME.right - FRAME.left
export const FRAME_HEIGHT = FRAME.top - FRAME.bottom

// Vertical field of view of the scene camera, in degrees. The camera looks
// at the centre of FRAME from just far enough away to fit it.
export const CAMERA_FOV = 22
