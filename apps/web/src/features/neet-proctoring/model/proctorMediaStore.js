// Holds proctoring streams across client-side route changes (system check ->
// exam) so the student is not re-prompted. A full reload discards them; the
// exam then asks the student to reconnect monitoring explicitly.
const streams = { camera: null, microphone: null, screen: null }
const listeners = new Set()

const isLive = (stream) =>
  Boolean(
    stream && stream.getTracks().some((track) => track.readyState === "live")
  )

const notify = () => {
  for (const listener of listeners) listener()
}

export const proctorMediaStore = Object.freeze({
  get(kind) {
    return isLive(streams[kind]) ? streams[kind] : null
  },
  set(kind, stream) {
    if (streams[kind] && streams[kind] !== stream) {
      for (const track of streams[kind].getTracks()) track.stop()
    }
    streams[kind] = stream
    notify()
  },
  stopAll() {
    for (const kind of Object.keys(streams)) {
      if (streams[kind]) {
        for (const track of streams[kind].getTracks()) track.stop()
        streams[kind] = null
      }
    }
    notify()
  },
  subscribe(listener) {
    listeners.add(listener)
    return () => listeners.delete(listener)
  },
})
