// Project NEET runtime defaults. Test documents may override the policy and
// timing values below; the resolved values are snapshotted into each attempt
// when it starts so later configuration edits never change a running or
// historical attempt.

const NEET_TIMING_DEFAULTS = Object.freeze({
  // A registered attempt that is never started stops holding the open-attempt
  // slot after this window and becomes EXPIRED.
  registrationWindowHours: 24,
  // Answer writes stop at expiresAt, including delayed offline retries.
  networkGraceSeconds: 0,
  heartbeatIntervalSeconds: 45,
})

// A takeover counts as a duplicate session only when the previous session was
// recently alive; resuming after a crash or sleep is not a policy event.
const NEET_SESSION_LIVENESS_SECONDS = 120

const NEET_PROCTOR_EVENT_RETENTION_DAYS = 180
const NEET_MAX_STORED_PROCTOR_EVENTS = 3000
const NEET_MAX_STORED_WARNINGS = 200
const NEET_SCORING_VERSION = 1

// The NEET (UG) 2026 Information Bulletin pattern as reported consistently by
// secondary sources at implementation time. It is sample configuration only;
// future official patterns are expressed by editing test documents.
const NEET_PATTERN_NOTE_2026 =
  "Sample mock following the publicly reported NEET (UG) 2026 pattern: 180 compulsory questions, 180 minutes, +4 / −1 marking. Always verify the current official NTA bulletin."

const NEET_DEFAULT_PROCTOR_POLICY = Object.freeze({
  version: 1,
  consentVersion: "2026-10-05",
  requirements: Object.freeze({
    camera: true,
    microphone: true,
    fullscreen: true,
    screenShare: false,
  }),
  monitoring: Object.freeze({
    visibility: true,
    focus: true,
    clipboard: true,
    network: true,
    faceSignals: true,
    audioSignals: true,
    duplicateSessions: true,
  }),
  signals: Object.freeze({
    faceAbsentSeconds: 8,
    multipleFacesSeconds: 4,
    headAwaySeconds: 10,
    audioActivitySeconds: 6,
    sampleIntervalMs: 1000,
  }),
  warnings: Object.freeze({
    maxWarnings: 3,
    cooldownSeconds: 20,
  }),
  autoSubmit: Object.freeze({
    enabled: true,
    // Camera, face, head and audio signals are uncertain. By default they can
    // warn but can never contribute to automatic submission.
    softSignalsCanSubmit: false,
  }),
  mediaStorage: "NONE",
})

// Policy rules per event type.
//   counted:   hard signal; its warnings count toward automatic submission.
//   warnEvery: occurrences needed (outside the cooldown) to issue a warning;
//              0 means the event is recorded but never warns.
//   escalateAfter: total occurrences after which severity becomes HIGH.
//   monitor / requires: the policy switch that must be enabled for the rule.
const NEET_DEFAULT_PROCTOR_RULES = Object.freeze({
  TAB_HIDDEN: Object.freeze({
    severity: "MEDIUM",
    counted: true,
    warnEvery: 1,
    escalateAfter: 3,
    monitor: "visibility",
    message:
      "The exam tab was hidden. Please stay on this tab until you submit.",
  }),
  WINDOW_BLUR: Object.freeze({
    severity: "LOW",
    counted: true,
    warnEvery: 3,
    escalateAfter: 6,
    monitor: "focus",
    message:
      "The exam window lost focus several times. Keep the exam window active.",
  }),
  WINDOW_FOCUS: Object.freeze({ severity: "INFO", warnEvery: 0 }),
  FULLSCREEN_EXIT: Object.freeze({
    severity: "MEDIUM",
    counted: true,
    warnEvery: 1,
    escalateAfter: 3,
    requires: "fullscreen",
    message: "Full screen was exited. Return to full screen to continue.",
  }),
  FULLSCREEN_RESTORED: Object.freeze({ severity: "INFO", warnEvery: 0 }),
  CAMERA_INTERRUPTED: Object.freeze({
    severity: "MEDIUM",
    counted: false,
    warnEvery: 1,
    requires: "camera",
    message:
      "Your camera stopped sending video. Check the camera so monitoring can continue.",
  }),
  CAMERA_RESTORED: Object.freeze({ severity: "INFO", warnEvery: 0 }),
  MIC_INTERRUPTED: Object.freeze({
    severity: "MEDIUM",
    counted: false,
    warnEvery: 1,
    requires: "microphone",
    message:
      "Your microphone stopped. Check the microphone so monitoring can continue.",
  }),
  MIC_RESTORED: Object.freeze({ severity: "INFO", warnEvery: 0 }),
  SCREEN_SHARE_STOPPED: Object.freeze({
    severity: "HIGH",
    counted: true,
    warnEvery: 1,
    requires: "screenShare",
    message:
      "Screen sharing stopped. This mock requires screen sharing for its full duration.",
  }),
  COPY_ATTEMPT: Object.freeze({
    severity: "LOW",
    counted: true,
    warnEvery: 3,
    monitor: "clipboard",
    message: "Copying exam content is not allowed in this mock.",
  }),
  PASTE_ATTEMPT: Object.freeze({
    severity: "LOW",
    counted: true,
    warnEvery: 3,
    monitor: "clipboard",
    message: "Pasting is not allowed in this mock.",
  }),
  CAMERA_OBSTRUCTION: Object.freeze({
    severity: "LOW",
    counted: false,
    warnEvery: 2,
    monitor: "faceSignals",
    requires: "camera",
    message:
      "The camera view may be dark or covered. Please check lighting and the lens.",
  }),
  FACE_ABSENT: Object.freeze({
    severity: "MEDIUM",
    counted: false,
    warnEvery: 2,
    monitor: "faceSignals",
    requires: "camera",
    message:
      "We could not see you on camera for a while. Please stay in view of the camera.",
  }),
  MULTIPLE_FACE_SIGNAL: Object.freeze({
    severity: "MEDIUM",
    counted: false,
    warnEvery: 2,
    monitor: "faceSignals",
    requires: "camera",
    message:
      "More than one face may be visible. Please take the mock alone in a private space.",
  }),
  HEAD_AWAY_SIGNAL: Object.freeze({
    severity: "LOW",
    counted: false,
    warnEvery: 3,
    monitor: "faceSignals",
    requires: "camera",
    message: "You appear to be looking away from the screen for long periods.",
  }),
  AUDIO_ACTIVITY: Object.freeze({
    severity: "LOW",
    counted: false,
    warnEvery: 3,
    monitor: "audioSignals",
    requires: "microphone",
    message: "Sustained sound was detected. Please keep your space quiet.",
  }),
  NETWORK_OFFLINE: Object.freeze({
    severity: "INFO",
    warnEvery: 0,
    monitor: "network",
  }),
  NETWORK_ONLINE: Object.freeze({
    severity: "INFO",
    warnEvery: 0,
    monitor: "network",
  }),
  DUPLICATE_SESSION: Object.freeze({
    severity: "MEDIUM",
    counted: true,
    warnEvery: 1,
    monitor: "duplicateSessions",
    message:
      "This attempt was opened in another tab or window. Use a single exam window.",
  }),
})

module.exports = {
  NEET_DEFAULT_PROCTOR_POLICY,
  NEET_DEFAULT_PROCTOR_RULES,
  NEET_MAX_STORED_PROCTOR_EVENTS,
  NEET_MAX_STORED_WARNINGS,
  NEET_PATTERN_NOTE_2026,
  NEET_PROCTOR_EVENT_RETENTION_DAYS,
  NEET_SCORING_VERSION,
  NEET_SESSION_LIVENESS_SECONDS,
  NEET_TIMING_DEFAULTS,
}
