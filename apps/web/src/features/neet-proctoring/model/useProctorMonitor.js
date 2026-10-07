import { neetClient } from "@/entities/neet"
import {
  createClipboardAdapter,
  createFocusAdapter,
  createFullscreenAdapter,
  createNetworkAdapter,
  createVisibilityAdapter,
} from "@/features/neet-proctoring/lib/adapters/pageAdapters"
import { createTrackAdapter } from "@/features/neet-proctoring/lib/adapters/trackAdapter"
import { createAudioActivityDetector } from "@/features/neet-proctoring/lib/detectors/audioActivity"
import { createFaceSignalDetector } from "@/features/neet-proctoring/lib/detectors/faceSignal"
import {
  requestCamera,
  requestMicrophone,
  requestScreen,
} from "@/features/neet-proctoring/lib/mediaAccess"
import { createProctorEventQueue } from "@/features/neet-proctoring/model/proctorEventQueue"
import { proctorMediaStore } from "@/features/neet-proctoring/model/proctorMediaStore"
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react"

const readStreams = () => ({
  camera: proctorMediaStore.get("camera"),
  microphone: proctorMediaStore.get("microphone"),
  screen: proctorMediaStore.get("screen"),
})

const useMediaStreams = () => {
  const cache = useRef(readStreams())
  const subscribe = useCallback(
    (listener) =>
      proctorMediaStore.subscribe(() => {
        cache.current = readStreams()
        listener()
      }),
    []
  )
  return useSyncExternalStore(subscribe, () => cache.current)
}

// Runs every proctoring signal source for an in-progress proctored attempt
// and forwards events to the server. All listeners, timers, detectors and
// media are released on unmount or when the session changes.
export function useProctorMonitor({
  enabled,
  grant,
  onClosed,
  onSuperseded,
  onWarnings,
  policy,
  sessionId,
  signalConfig,
  attemptId,
}) {
  const streams = useMediaStreams()
  const [fullscreen, setFullscreen] = useState(() =>
    Boolean(globalThis.document?.fullscreenElement)
  )
  const [trackStates, setTrackStates] = useState({})
  const [warningCount, setWarningCount] = useState(null)
  const queueRef = useRef(null)
  const enabledRef = useRef(enabled)
  useEffect(() => {
    enabledRef.current = enabled
    return () => {
      enabledRef.current = false
    }
  }, [enabled])
  const callbacks = useRef({ onClosed, onSuperseded, onWarnings })

  useEffect(() => {
    callbacks.current = { onClosed, onSuperseded, onWarnings }
  }, [onClosed, onSuperseded, onWarnings])

  // Event queue + page-level adapters.
  useEffect(() => {
    if (!enabled || !sessionId || !policy) return undefined
    const queue = createProctorEventQueue({
      send: async (events) =>
        (await neetClient.recordProctorEvents(attemptId, sessionId, events))
          .data,
      onResult: (result) => {
        setWarningCount(result.warningCount)
        if (result.newWarnings.length)
          callbacks.current.onWarnings?.(result.newWarnings, result)
        if (result.autoSubmitted || result.status !== "IN_PROGRESS")
          callbacks.current.onClosed?.(result)
      },
      onStop: (reason) => {
        if (reason === "superseded") callbacks.current.onSuperseded?.()
        else callbacks.current.onClosed?.(null)
      },
    })
    queueRef.current = queue
    const emit = (type, metadata) => queue.push(type, metadata)
    const stops = []
    if (policy.monitoring.visibility)
      stops.push(createVisibilityAdapter({ emit }))
    if (policy.monitoring.focus) stops.push(createFocusAdapter({ emit }))
    if (policy.monitoring.clipboard)
      stops.push(createClipboardAdapter({ emit }))
    if (policy.monitoring.network) stops.push(createNetworkAdapter({ emit }))
    if (policy.requirements.fullscreen) {
      stops.push(
        createFullscreenAdapter({ emit, onStateChange: setFullscreen })
      )
    }
    return () => {
      for (const stop of stops) stop()
      queue.stop()
      queueRef.current = null
    }
  }, [attemptId, enabled, policy, sessionId])

  // Media tracks and on-device detectors; rewired whenever streams change.
  useEffect(() => {
    if (!enabled || !policy || !signalConfig) return undefined
    const emit = (type, metadata) => queueRef.current?.push(type, metadata)
    const stops = []
    for (const kind of ["camera", "microphone", "screen"]) {
      const required =
        kind === "screen"
          ? policy.requirements.screenShare
          : policy.requirements[kind]
      const stream = streams[kind]
      if (!required || !stream) continue
      stops.push(
        createTrackAdapter({
          emit,
          kind,
          stream,
          onStateChange: (state) =>
            setTrackStates((current) => ({
              ...current,
              [kind]: { id: stream.id, state },
            })),
        })
      )
    }

    let video = null
    if (streams.camera && policy.monitoring.faceSignals) {
      video = document.createElement("video")
      video.muted = true
      video.playsInline = true
      video.srcObject = streams.camera
      void video.play().catch(() => {})
      const detector = createFaceSignalDetector({
        config: signalConfig,
        onSignal: emit,
        video,
      })
      stops.push(() => detector.stop())
    }
    if (streams.microphone && policy.monitoring.audioSignals) {
      try {
        stops.push(
          createAudioActivityDetector({
            config: signalConfig,
            onSignal: emit,
            stream: streams.microphone,
          })
        )
      } catch {
        // Audio analysis is optional; track-level monitoring continues.
      }
    }
    return () => {
      for (const stop of stops) stop()
      if (video) {
        video.pause()
        video.srcObject = null
      }
    }
  }, [enabled, policy, signalConfig, streams])

  const deviceState = (kind) => {
    const required =
      kind === "screen"
        ? policy?.requirements?.screenShare
        : policy?.requirements?.[kind]
    if (!required) return "not-required"
    if (!streams[kind]) return "missing"
    const entry = trackStates[kind]
    return entry?.id === streams[kind].id && entry.state === "interrupted"
      ? "interrupted"
      : "live"
  }

  const enterFullscreen = useCallback(async () => {
    try {
      await document.documentElement.requestFullscreen({ navigationUI: "hide" })
      return true
    } catch {
      return false
    }
  }, [])

  const reconnect = useCallback(
    async (kind) => {
      const stream =
        kind === "camera"
          ? await requestCamera(grant)
          : kind === "microphone"
            ? await requestMicrophone(grant)
            : await requestScreen(grant)
      if (!enabledRef.current) {
        for (const track of stream.getTracks()) track.stop()
        return null
      }
      proctorMediaStore.set(kind, stream)
      return stream
    },
    [grant]
  )

  return {
    devices: {
      camera: deviceState("camera"),
      microphone: deviceState("microphone"),
      screen: deviceState("screen"),
    },
    enterFullscreen,
    fullscreen,
    fullscreenRequired: Boolean(policy?.requirements?.fullscreen),
    reconnect,
    reportEvent: (type, metadata) => queueRef.current?.push(type, metadata),
    warningCount,
  }
}
