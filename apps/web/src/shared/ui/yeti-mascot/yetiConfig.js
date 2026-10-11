// Prahit Yeti V4.2: the October 11 2026 Blender production exports, copied
// unchanged into public/mascot (SHA-256 in
// docs/growed-redesign/YETI_MASCOT_3D.md). The folders
// are versioned so Nginx can cache them long term: bump the folder name
// whenever a file inside changes.
const base = import.meta.env.BASE_URL || "/"

export const YETI_ASSETS = Object.freeze({
  standard: `${base}mascot/yeti-v4.2/prahit_mascot_web.glb`,
  light: `${base}mascot/yeti-v4.2/prahit_mascot_web_light.glb`,
  // Decoder shipped with the installed three.js (examples/jsm/libs/draco/gltf).
  draco: `${base}mascot/draco-r186/`,
})

// Width / height of the mascot stage: the camera framing (YETI_FRAME in
// yetiScene.js), which holds the standing yeti centred with room for the
// Wave arm's widest sweep on its right and the tracking extremes, feet on
// the bottom edge. The body spans the middle 66% of the width, so 17% on each
// side is empty except while waving (right side only). Any stage aspect
// still fits the whole frame; this one wastes no space.
export const YETI_ASPECT = 1.27

// The poster and the live canvas cross-fade over this many milliseconds.
export const YETI_FADE_MS = 420
