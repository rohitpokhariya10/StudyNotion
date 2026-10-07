// Sustained-audio detector. Runs entirely on the device: it measures the
// energy of the speech band (≈300–3400 Hz) against an adaptive noise floor and
// reports AUDIO_ACTIVITY only when activity is sustained for most of a
// configurable window. Coughs, key clicks, a door, or a single word are short
// bursts and never reach the threshold; steady fan noise raises the noise
// floor instead of triggering. No audio is recorded, stored, or uploaded.

export const createSustainedActivityTracker = ({
  activeRatio = 0.6,
  cooldownMs = 45_000,
  sampleMs = 200,
  windowMs,
}) => {
  const capacity = Math.max(1, Math.round(windowMs / sampleMs))
  const samples = []
  let lastSignalAt = -Infinity
  return {
    push(active, now) {
      samples.push(active ? 1 : 0)
      if (samples.length > capacity) samples.shift()
      if (samples.length < capacity) return false
      const ratio =
        samples.reduce((total, value) => total + value, 0) / capacity
      if (ratio >= activeRatio && now - lastSignalAt >= cooldownMs) {
        lastSignalAt = now
        samples.length = 0
        return true
      }
      return false
    },
    reset() {
      samples.length = 0
    },
  }
}

export const createAudioActivityDetector = ({
  audioContextFactory = () =>
    new (globalThis.AudioContext || globalThis.webkitAudioContext)(),
  config,
  onSignal,
  sampleMs = 200,
  stream,
}) => {
  const context = audioContextFactory()
  const source = context.createMediaStreamSource(stream)
  const analyser = context.createAnalyser()
  analyser.fftSize = 1024
  analyser.smoothingTimeConstant = 0.6
  source.connect(analyser)
  const bins = new Uint8Array(analyser.frequencyBinCount)
  const hzPerBin = context.sampleRate / analyser.fftSize
  const lowBin = Math.max(1, Math.floor(300 / hzPerBin))
  const highBin = Math.min(bins.length - 1, Math.ceil(3400 / hzPerBin))
  const tracker = createSustainedActivityTracker({
    sampleMs,
    windowMs: config.audioActivitySeconds * 1000,
  })
  let noiseFloor = null

  const timer = setInterval(() => {
    if (globalThis.document?.hidden) return
    analyser.getByteFrequencyData(bins)
    let energy = 0
    for (let index = lowBin; index <= highBin; index += 1) energy += bins[index]
    const level = energy / (highBin - lowBin + 1)
    if (noiseFloor === null) noiseFloor = level
    const active = level > Math.max(noiseFloor * 1.8, noiseFloor + 18, 28)
    // The floor adapts slowly upward to steady noise, faster downward.
    noiseFloor = active
      ? noiseFloor + (level - noiseFloor) * 0.002
      : noiseFloor + (level - noiseFloor) * 0.05
    if (tracker.push(active, Date.now())) {
      onSignal("AUDIO_ACTIVITY", {
        reason: "SUSTAINED_AUDIO",
        detector: "audio-level",
        durationMs: config.audioActivitySeconds * 1000,
      })
    }
  }, sampleMs)

  return () => {
    clearInterval(timer)
    try {
      source.disconnect()
      analyser.disconnect()
    } catch {
      // already disconnected
    }
    context.close?.().catch?.(() => {})
  }
}
