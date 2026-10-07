const pad = (value) => String(value).padStart(2, "0")

// 10800 -> "3 hours", 1500 -> "25 minutes", 5400 -> "1 h 30 min"
export const formatNeetDuration = (seconds) => {
  const totalMinutes = Math.round(seconds / 60)
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  if (!hours) return `${minutes} minute${minutes === 1 ? "" : "s"}`
  if (!minutes) return `${hours} hour${hours === 1 ? "" : "s"}`
  return `${hours} h ${minutes} min`
}

// Countdown display. Hours are always shown for long papers so the layout
// does not shift when the timer crosses the one-hour mark.
export const formatNeetClock = (milliseconds, { showHours = true } = {}) => {
  const totalSeconds = Math.max(0, Math.ceil(milliseconds / 1000))
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  return showHours || hours
    ? `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
    : `${pad(minutes)}:${pad(seconds)}`
}

export const formatNeetClockForSpeech = (milliseconds) => {
  const totalMinutes = Math.max(0, Math.ceil(milliseconds / 60000))
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  const parts = []
  if (hours) parts.push(`${hours} hour${hours === 1 ? "" : "s"}`)
  if (minutes || !hours)
    parts.push(`${minutes} minute${minutes === 1 ? "" : "s"}`)
  return `${parts.join(" ")} remaining`
}

export const formatNeetMarks = (value) => {
  if (!Number.isFinite(value)) return "—"
  const rounded = Math.round(value * 100) / 100
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(2)
}

export const formatSignedMarks = (value) =>
  value > 0
    ? `+${formatNeetMarks(value)}`
    : value < 0
      ? `−${formatNeetMarks(Math.abs(value))}`
      : "0"

export const NEET_DIFFICULTY_LABELS = Object.freeze({
  FOUNDATION: "Foundation",
  STANDARD: "Standard",
  ADVANCED: "Advanced",
})

export const NEET_MODE_LABELS = Object.freeze({
  NON_PROCTORED: "Practice mode",
  PROCTORED: "Proctored mode",
})

export const NEET_SUBMISSION_REASON_LABELS = Object.freeze({
  MANUAL_SUBMIT: "Submitted by you",
  TIME_EXPIRED: "Submitted when time ran out",
  PROCTOR_POLICY: "Submitted under the proctoring policy",
  ADMIN_RECOVERY: "Submitted by support",
})
