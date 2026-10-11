// Capability probes for the proctored mode. Each probe is wrapped so a
// browser that throws on feature access simply reports "unsupported".
const safe = (probe) => {
  try {
    return Boolean(probe())
  } catch {
    return false
  }
}

export const probeBrowserSupport = ({
  doc = globalThis.document,
  nav = globalThis.navigator,
  win = globalThis.window,
} = {}) => ({
  secureContext: safe(() => win.isSecureContext),
  mediaDevices: safe(
    () => typeof nav.mediaDevices?.getUserMedia === "function"
  ),
  displayMedia: safe(
    () => typeof nav.mediaDevices?.getDisplayMedia === "function"
  ),
  fullscreen: safe(
    () =>
      doc.fullscreenEnabled === true &&
      typeof doc.documentElement.requestFullscreen === "function"
  ),
  pageVisibility: safe(() => typeof doc.visibilityState === "string"),
  audioContext: safe(
    () => typeof (win.AudioContext || win.webkitAudioContext) === "function"
  ),
  nativeFaceDetector: safe(() => typeof win.FaceDetector === "function"),
  broadcastChannel: safe(() => typeof win.BroadcastChannel === "function"),
  coarsePointer: safe(() => win.matchMedia("(pointer: coarse)").matches),
  narrowViewport: safe(() => win.innerWidth < 900),
})

// Whether this device can satisfy a proctor policy. Explained to the student
// before they choose the mode, so unsupported devices are never surprised.
export const evaluateProctoredSupport = (
  policy,
  support = probeBrowserSupport()
) => {
  const requirements = policy?.requirements || {}
  if (!support.secureContext) {
    return {
      supported: false,
      reason: "Monitored mode needs a secure (HTTPS) connection.",
    }
  }
  if (
    (requirements.camera || requirements.microphone) &&
    !support.mediaDevices
  ) {
    return {
      supported: false,
      reason:
        "This browser cannot share a camera or microphone. Use a recent Chrome, Edge or Firefox on a laptop or desktop.",
    }
  }
  if (requirements.fullscreen && !support.fullscreen) {
    return {
      supported: false,
      reason:
        "This device doesn't support full-screen exams. Use a laptop or desktop browser.",
    }
  }
  if (
    requirements.screenShare &&
    (!support.displayMedia || support.coarsePointer)
  ) {
    return {
      supported: false,
      reason:
        "Screen sharing isn't available on this device. Use Chrome, Edge or Firefox on a laptop or desktop.",
    }
  }
  if (support.coarsePointer && support.narrowViewport) {
    return {
      supported: false,
      reason:
        "Monitored mode is designed for laptops and desktops. Practice mode works on this device.",
    }
  }
  return { supported: true, reason: null }
}
