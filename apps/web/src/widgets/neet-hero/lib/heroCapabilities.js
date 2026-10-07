// Decides whether (and how richly) the WebGL hero may run. Every probe is
// defensive: any failure means "no WebGL", and the static hero is complete.

export const HERO_TIERS = Object.freeze({
  OFF: "off",
  LOW: "low",
  MEDIUM: "medium",
  HIGH: "high",
})

export const HERO_TIER_SETTINGS = Object.freeze({
  low: { particles: 900, dust: 120, maxPixelRatio: 1 },
  medium: { particles: 1600, dust: 220, maxPixelRatio: 1.25 },
  high: { particles: 2600, dust: 360, maxPixelRatio: 1.75 },
})

export const prefersReducedMotion = (win = globalThis.window) => {
  try {
    return Boolean(
      win?.matchMedia?.("(prefers-reduced-motion: reduce)").matches
    )
  } catch {
    return false
  }
}

export const supportsWebGL = (doc = globalThis.document) => {
  try {
    const canvas = doc.createElement("canvas")
    const context =
      canvas.getContext("webgl2", { failIfMajorPerformanceCaveat: true }) ||
      canvas.getContext("webgl", { failIfMajorPerformanceCaveat: true })
    if (!context) return false
    context.getExtension("WEBGL_lose_context")?.loseContext()
    return true
  } catch {
    return false
  }
}

export const detectHeroTier = ({
  doc = globalThis.document,
  nav = globalThis.navigator,
  win = globalThis.window,
} = {}) => {
  if (!win || !doc) return HERO_TIERS.OFF
  if (prefersReducedMotion(win)) return HERO_TIERS.OFF
  if (nav?.connection?.saveData === true) return HERO_TIERS.OFF
  if (!supportsWebGL(doc)) return HERO_TIERS.OFF

  const memory = Number(nav?.deviceMemory) || 4
  const cores = Number(nav?.hardwareConcurrency) || 4
  const narrow = (win.innerWidth || 1024) < 768
  if (memory <= 2 || cores <= 2) return HERO_TIERS.LOW
  if (narrow || memory <= 4 || cores <= 4) return HERO_TIERS.MEDIUM
  return HERO_TIERS.HIGH
}
