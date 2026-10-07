// Privacy-conscious camera signals, analysed locally on small frames that are
// never stored or uploaded. This is NOT face recognition: it never identifies
// who is on camera, only whether a face-like region is present.
//
// - Where the browser exposes the Shape Detection FaceDetector (experimental;
//   unavailable in most browsers), only face counts are used; head pose is not inferred.
// - Otherwise only a covered or blacked-out camera is detected, from frame
//   brightness and uniformity. Face presence is not claimed in that mode.
// Signals require sustained duration; brief look-aways never report.

export const createDurationGate = (thresholdMs) => {
  let since = null
  let reported = false
  return {
    update(condition, now) {
      if (!condition) {
        const duration = since === null ? 0 : now - since
        since = null
        reported = false
        return { fired: false, ended: duration }
      }
      if (since === null) since = now
      if (!reported && now - since >= thresholdMs) {
        reported = true
        return { fired: true, duration: now - since }
      }
      return { fired: false }
    },
  }
}

export const analyseObstruction = (pixels) => {
  let sum = 0
  let sumSquares = 0
  const count = pixels.length / 4
  for (let index = 0; index < pixels.length; index += 4) {
    const luminance =
      0.2126 * pixels[index] +
      0.7152 * pixels[index + 1] +
      0.0722 * pixels[index + 2]
    sum += luminance
    sumSquares += luminance * luminance
  }
  const mean = sum / count
  const deviation = Math.sqrt(Math.max(0, sumSquares / count - mean * mean))
  return { mean, deviation, obscured: mean < 14 || deviation < 5 }
}

export const createFaceSignalDetector = ({ config, onSignal, video }) => {
  const NativeFaceDetector = globalThis.FaceDetector
  let nativeDetector = null
  try {
    if (typeof NativeFaceDetector === "function")
      nativeDetector = new NativeFaceDetector({
        fastMode: true,
        maxDetectedFaces: 3,
      })
  } catch {
    /* fall back to camera health only */
  }
  const canvas = globalThis.document.createElement("canvas")
  canvas.width = 48
  canvas.height = 36
  const context = canvas.getContext("2d", { willReadFrequently: true })
  const absentGate = createDurationGate(config.faceAbsentSeconds * 1000)
  const multipleGate = createDurationGate(config.multipleFacesSeconds * 1000)
  let busy = false
  let stopped = false

  const tick = async () => {
    if (stopped || busy || globalThis.document?.hidden || video.readyState < 2)
      return
    busy = true
    const now = performance.now()
    try {
      if (nativeDetector) {
        const faces = await nativeDetector.detect(video)
        if (stopped) return
        const absent = absentGate.update(faces.length === 0, now)
        if (absent.fired) {
          onSignal("FACE_ABSENT", {
            reason: "NO_FACE_DETECTED",
            detector: "native-face-detector",
            faces: 0,
            durationMs: absent.duration,
          })
        }
        const multiple = multipleGate.update(faces.length > 1, now)
        if (multiple.fired) {
          onSignal("MULTIPLE_FACE_SIGNAL", {
            detector: "native-face-detector",
            faces: faces.length,
            durationMs: multiple.duration,
          })
        }
      } else if (context) {
        context.drawImage(video, 0, 0, canvas.width, canvas.height)
        const { obscured } = analyseObstruction(
          context.getImageData(0, 0, canvas.width, canvas.height).data
        )
        const absent = absentGate.update(obscured, now)
        if (absent.fired) {
          onSignal("CAMERA_OBSTRUCTION", {
            reason: "CAMERA_OBSCURED",
            detector: "frame-obstruction",
            durationMs: absent.duration,
          })
        }
      }
    } catch {
      nativeDetector = null // Degrade to camera health after an experimental detector fails.
    } finally {
      busy = false
    }
  }

  const timer = setInterval(tick, config.sampleIntervalMs)
  return {
    detectorKind: nativeDetector ? "native-face-detector" : "frame-obstruction",
    stop() {
      stopped = true
      clearInterval(timer)
      canvas.width = 0
      canvas.height = 0
    },
  }
}
