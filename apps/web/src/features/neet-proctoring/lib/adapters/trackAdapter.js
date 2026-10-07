const KIND_EVENTS = Object.freeze({
  camera: { lost: "CAMERA_INTERRUPTED", restored: "CAMERA_RESTORED" },
  microphone: { lost: "MIC_INTERRUPTED", restored: "MIC_RESTORED" },
  screen: { lost: "SCREEN_SHARE_STOPPED", restored: null },
})

// Watches a media stream's tracks. A track that ends (device unplugged,
// permission revoked, "Stop sharing" pressed) is reported immediately; a
// muted track is reported only if it stays muted for `muteGraceMs`.
export const createTrackAdapter = ({
  emit,
  kind,
  muteGraceMs = 3000,
  onStateChange,
  stream,
}) => {
  const events = KIND_EVENTS[kind]
  const tracks = stream?.getTracks?.() || []
  let interrupted = false
  let muteTimer = null
  const cleanups = []

  const markLost = (reason) => {
    if (interrupted) return
    interrupted = true
    emit(events.lost, { reason })
    onStateChange?.("interrupted")
  }
  const markRestored = () => {
    clearTimeout(muteTimer)
    if (!interrupted) return
    interrupted = false
    if (events.restored) emit(events.restored)
    onStateChange?.("live")
  }

  for (const track of tracks) {
    const onEnded = () =>
      markLost(kind === "screen" ? "USER_STOPPED" : "TRACK_ENDED")
    const onMute = () => {
      clearTimeout(muteTimer)
      muteTimer = setTimeout(() => markLost("TRACK_MUTED"), muteGraceMs)
    }
    const onUnmute = () => markRestored()
    track.addEventListener("ended", onEnded)
    track.addEventListener("mute", onMute)
    track.addEventListener("unmute", onUnmute)
    cleanups.push(() => {
      track.removeEventListener("ended", onEnded)
      track.removeEventListener("mute", onMute)
      track.removeEventListener("unmute", onUnmute)
    })
    if (track.readyState === "ended") markLost("TRACK_ENDED")
  }

  return () => {
    clearTimeout(muteTimer)
    for (const cleanup of cleanups) cleanup()
  }
}
