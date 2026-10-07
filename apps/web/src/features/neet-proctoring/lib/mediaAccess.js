// The ONLY place Project NEET asks for camera, microphone or screen access.
//
// Every request requires a consent grant created by `grantProctorConsent`,
// which is called solely from the explicit proctored consent step (or, after
// a reload, from an attempt whose server record already holds that consent).
// Practice mode never creates a grant, so it can never start a device.

const grants = new WeakSet()

export class ProctorMediaError extends Error {
  constructor(kind, device, cause) {
    super(kind)
    this.name = "ProctorMediaError"
    this.kind = kind
    this.device = device
    this.cause = cause
  }
}

export const grantProctorConsent = ({ attemptId, consentVersion, mode }) => {
  if (mode !== "PROCTORED" || !attemptId || !consentVersion) return null
  const grant = Object.freeze({ attemptId, consentVersion, mode })
  grants.add(grant)
  return grant
}

export const grantFromAttempt = (attempt) =>
  attempt?.mode === "PROCTORED" && attempt.proctorConsent
    ? grantProctorConsent({
        attemptId: attempt.id,
        consentVersion: attempt.proctorConsent.version,
        mode: attempt.mode,
      })
    : null

const assertGrant = (grant) => {
  if (!grant || !grants.has(grant) || grant.mode !== "PROCTORED") {
    throw new ProctorMediaError("CONSENT_REQUIRED", "any")
  }
}

// Maps DOMException names to stable, student-facing categories. Raw browser
// messages are never shown.
export const classifyMediaError = (error, device) => {
  const name = error?.name || ""
  if (name === "NotAllowedError" || name === "PermissionDeniedError") {
    return new ProctorMediaError(
      device === "screen" ? "SCREEN_SHARE_CANCELLED" : "PERMISSION_DENIED",
      device,
      error
    )
  }
  if (
    name === "NotFoundError" ||
    name === "DevicesNotFoundError" ||
    name === "OverconstrainedError"
  ) {
    return new ProctorMediaError("NO_DEVICE", device, error)
  }
  if (
    name === "NotReadableError" ||
    name === "TrackStartError" ||
    name === "AbortError"
  ) {
    return new ProctorMediaError("DEVICE_BUSY", device, error)
  }
  if (name === "SecurityError")
    return new ProctorMediaError("INSECURE_CONTEXT", device, error)
  if (name === "TypeError")
    return new ProctorMediaError("UNSUPPORTED", device, error)
  return new ProctorMediaError("UNKNOWN", device, error)
}

const userMedia = async (grant, constraints, device, mediaDevices) => {
  assertGrant(grant)
  if (!globalThis.isSecureContext)
    throw new ProctorMediaError("INSECURE_CONTEXT", device)
  if (typeof mediaDevices?.getUserMedia !== "function") {
    throw new ProctorMediaError("UNSUPPORTED", device)
  }
  try {
    return await mediaDevices.getUserMedia(constraints)
  } catch (error) {
    throw classifyMediaError(error, device)
  }
}

export const requestCamera = (
  grant,
  mediaDevices = globalThis.navigator?.mediaDevices
) =>
  userMedia(
    grant,
    {
      video: {
        width: { ideal: 640 },
        height: { ideal: 480 },
        frameRate: { ideal: 15, max: 24 },
      },
      audio: false,
    },
    "camera",
    mediaDevices
  )

export const requestMicrophone = (
  grant,
  mediaDevices = globalThis.navigator?.mediaDevices
) =>
  userMedia(
    grant,
    {
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: false,
      },
      video: false,
    },
    "microphone",
    mediaDevices
  )

export const requestScreen = async (
  grant,
  mediaDevices = globalThis.navigator?.mediaDevices
) => {
  assertGrant(grant)
  if (typeof mediaDevices?.getDisplayMedia !== "function") {
    throw new ProctorMediaError("UNSUPPORTED", "screen")
  }
  let stream
  try {
    stream = await mediaDevices.getDisplayMedia({
      video: { displaySurface: "monitor", frameRate: { ideal: 1, max: 5 } },
      audio: false,
      monitorTypeSurfaces: "include",
      selfBrowserSurface: "exclude",
      surfaceSwitching: "exclude",
    })
  } catch (error) {
    throw classifyMediaError(error, "screen")
  }
  const surface = stream.getVideoTracks()[0]?.getSettings?.().displaySurface
  if (surface && surface !== "monitor") {
    for (const track of stream.getTracks()) track.stop()
    throw new ProctorMediaError("WRONG_SURFACE", "screen")
  }
  return stream
}

export const MEDIA_ERROR_GUIDANCE = Object.freeze({
  PERMISSION_DENIED: {
    title: "Permission blocked",
    action: "Allow access",
    help: "Your browser blocked access. Click the camera or lock icon in the address bar, set camera and microphone to “Allow”, then try again.",
  },
  SCREEN_SHARE_CANCELLED: {
    title: "Screen sharing was cancelled",
    action: "Share screen",
    help: "Choose “Entire screen” in the sharing dialog and press Share.",
  },
  WRONG_SURFACE: {
    title: "Please share your entire screen",
    action: "Share again",
    help: "This mock needs your whole screen, not a single tab or window.",
  },
  NO_DEVICE: {
    title: "No device found",
    action: "Check again",
    help: "Connect a camera or microphone (or enable the built-in one) and try again.",
  },
  DEVICE_BUSY: {
    title: "Device is in use",
    action: "Try again",
    help: "Another app (like a video call) may be using it. Close that app and try again.",
  },
  INSECURE_CONTEXT: {
    title: "Secure connection required",
    action: null,
    help: "Devices can only be used on a secure (HTTPS) page.",
  },
  UNSUPPORTED: {
    title: "Not supported in this browser",
    action: null,
    help: "Use a recent Chrome, Edge or Firefox on a laptop or desktop for proctored mode.",
  },
  CONSENT_REQUIRED: {
    title: "Consent needed first",
    action: null,
    help: "Review and accept the monitoring notice before devices are checked.",
  },
  UNKNOWN: {
    title: "Something went wrong",
    action: "Try again",
    help: "Reconnect the device and try again. If it keeps failing, restart your browser.",
  },
})
