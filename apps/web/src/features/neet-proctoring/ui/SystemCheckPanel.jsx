import { probeBrowserSupport } from "@/features/neet-proctoring/lib/browserSupport"
import {
  MEDIA_ERROR_GUIDANCE,
  requestCamera,
  requestMicrophone,
  requestScreen,
} from "@/features/neet-proctoring/lib/mediaAccess"
import { proctorMediaStore } from "@/features/neet-proctoring/model/proctorMediaStore"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"

const STATUS_PRESENTATION = Object.freeze({
  CHECKING: {
    label: "Checking…",
    className: "border-neet-line text-neet-muted",
    icon: "…",
  },
  READY: {
    label: "Ready",
    className: "border-neet-success/60 text-neet-success",
    icon: "✓",
  },
  ACTION_REQUIRED: {
    label: "Action required",
    className: "border-neet-warning/60 text-neet-warning",
    icon: "!",
  },
  UNAVAILABLE: {
    label: "Unavailable",
    className: "border-neet-danger/60 text-neet-danger",
    icon: "×",
  },
})

const storageAvailable = () => {
  try {
    const key = "pn:storage-probe"
    window.localStorage.setItem(key, "1")
    window.localStorage.removeItem(key)
    return true
  } catch {
    return false
  }
}

function StatusChip({ status }) {
  const presentation = STATUS_PRESENTATION[status]
  return (
    <span
      className={`pn-chip flex-none bg-neet-canvas/40 ${presentation.className}`}
    >
      {status === "CHECKING" ? (
        <span className="pn-spinner h-3.5 w-3.5" aria-hidden="true" />
      ) : (
        <span aria-hidden="true" className="font-bold">
          {presentation.icon}
        </span>
      )}
      {presentation.label}
    </span>
  )
}

function SystemCheckItem({ action, children, detail, status, title }) {
  return (
    <li className="pn-card flex flex-col gap-4 p-5 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-3">
          <h3 className="text-lg font-bold">{title}</h3>
          <StatusChip status={status} />
        </div>
        {detail && (
          <p className="mt-2 max-w-xl text-[0.95rem] leading-6 text-neet-muted">
            {detail}
          </p>
        )}
        {children}
      </div>
      {action && <div className="flex-none">{action}</div>}
    </li>
  )
}

function CameraPreview({ stream }) {
  const videoRef = useRef(null)
  useEffect(() => {
    const video = videoRef.current
    if (!video) return undefined
    video.srcObject = stream
    void video.play().catch(() => {})
    return () => {
      video.srcObject = null
    }
  }, [stream])
  return (
    <video
      ref={videoRef}
      muted
      playsInline
      aria-label="Your camera preview, visible only to you"
      className="mt-4 aspect-video w-full max-w-xs -scale-x-100 rounded-2xl border border-neet-line bg-black object-cover"
    />
  )
}

function MicrophoneMeter({ stream }) {
  const barRef = useRef(null)
  useEffect(() => {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext
    if (!AudioContextClass) return undefined
    const context = new AudioContextClass()
    const source = context.createMediaStreamSource(stream)
    const analyser = context.createAnalyser()
    analyser.fftSize = 256
    source.connect(analyser)
    const data = new Uint8Array(analyser.fftSize)
    let frame = 0
    const draw = () => {
      analyser.getByteTimeDomainData(data)
      let sum = 0
      for (const value of data) sum += ((value - 128) / 128) ** 2
      const level = Math.min(1, Math.sqrt(sum / data.length) * 4)
      if (barRef.current) barRef.current.style.transform = `scaleX(${level})`
      frame = requestAnimationFrame(draw)
    }
    draw()
    return () => {
      cancelAnimationFrame(frame)
      source.disconnect()
      void context.close().catch(() => {})
    }
  }, [stream])
  return (
    <div className="mt-4 max-w-xs">
      <p className="text-sm text-neet-muted">
        Speak to see the level move. Nothing is recorded.
      </p>
      <div
        className="mt-2 h-2.5 overflow-hidden rounded-full bg-neet-surface-muted"
        aria-hidden="true"
      >
        <div
          ref={barRef}
          className="h-full origin-left scale-x-0 rounded-full bg-neet-accent transition-transform duration-75"
        />
      </div>
    </div>
  )
}

const DEVICE_REQUESTERS = Object.freeze({
  camera: requestCamera,
  microphone: requestMicrophone,
  screen: requestScreen,
})

const DEVICE_COPY = Object.freeze({
  camera: {
    title: "Camera",
    allow: "Allow camera",
    ready: "Camera is working. Keep your face clearly visible and well lit.",
  },
  microphone: {
    title: "Microphone",
    allow: "Allow microphone",
    ready:
      "Microphone is working. Only sustained sound levels are analysed, on this device.",
  },
  screen: {
    title: "Screen sharing",
    allow: "Share entire screen",
    ready:
      "Your entire screen is being shared for monitoring signals only. Nothing is recorded.",
  },
})

// Pre-exam checks, limited to what the selected mode and policy require.
export function SystemCheckPanel({
  grant,
  mode,
  onComplete,
  policy,
  probeConnectivity,
  submitting = false,
}) {
  const proctored = mode === "PROCTORED"
  const requirements = useMemo(
    () => ({
      camera: proctored && Boolean(policy?.requirements?.camera),
      microphone: proctored && Boolean(policy?.requirements?.microphone),
      screen: proctored && Boolean(policy?.requirements?.screenShare),
      fullscreen: proctored && Boolean(policy?.requirements?.fullscreen),
    }),
    [policy, proctored]
  )
  const support = useMemo(() => probeBrowserSupport(), [])
  const mounted = useRef(false)
  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])
  const [network, setNetwork] = useState({ status: "CHECKING", detail: null })
  const [devices, setDevices] = useState(() => {
    const initial = {}
    for (const kind of ["camera", "microphone", "screen"]) {
      const stream = proctorMediaStore.get(kind)
      initial[kind] = stream
        ? { status: "READY", error: null, stream }
        : { status: "ACTION_REQUIRED", error: null, stream: null }
    }
    return initial
  })

  const runNetworkCheck = useCallback(async () => {
    setNetwork({ status: "CHECKING", detail: null })
    if (navigator.onLine === false) {
      setNetwork({
        status: "ACTION_REQUIRED",
        detail: "You're offline. Reconnect to the internet, then check again.",
      })
      return
    }
    const startedAt = performance.now()
    try {
      await probeConnectivity()
      const latency = Math.round(performance.now() - startedAt)
      setNetwork({
        status: "READY",
        detail:
          latency > 1500
            ? `Connected, but slow (${latency} ms). Answers will still save — just give each save a moment.`
            : `Connected to Project NEET (${latency} ms).`,
      })
    } catch {
      setNetwork({
        status: "ACTION_REQUIRED",
        detail:
          "We couldn't reach the Project NEET servers. Check your connection and try again.",
      })
    }
  }, [probeConnectivity])

  useEffect(() => {
    // Initial connectivity probe on mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void runNetworkCheck()
  }, [runNetworkCheck])

  // Reflect device loss (unplugged, permission revoked, sharing stopped).
  useEffect(() => {
    const cleanups = []
    for (const [kind, entry] of Object.entries(devices)) {
      if (!entry.stream) continue
      for (const track of entry.stream.getTracks()) {
        const onEnded = () =>
          setDevices((current) => ({
            ...current,
            [kind]: {
              status: "ACTION_REQUIRED",
              error: kind === "screen" ? "SCREEN_SHARE_CANCELLED" : "NO_DEVICE",
              stream: null,
            },
          }))
        track.addEventListener("ended", onEnded)
        cleanups.push(() => track.removeEventListener("ended", onEnded))
      }
    }
    return () => cleanups.forEach((cleanup) => cleanup())
  }, [devices])

  const requestDevice = async (kind) => {
    setDevices((current) => ({
      ...current,
      [kind]: { ...current[kind], status: "CHECKING", error: null },
    }))
    try {
      const stream = await DEVICE_REQUESTERS[kind](grant)
      if (!mounted.current) {
        for (const track of stream.getTracks()) track.stop()
        return
      }
      proctorMediaStore.set(kind, stream)
      setDevices((current) => ({
        ...current,
        [kind]: { status: "READY", error: null, stream },
      }))
    } catch (error) {
      const kindOfError = error?.kind || "UNKNOWN"
      const unavailable = [
        "UNSUPPORTED",
        "INSECURE_CONTEXT",
        "CONSENT_REQUIRED",
      ].includes(kindOfError)
      setDevices((current) => ({
        ...current,
        [kind]: {
          status: unavailable ? "UNAVAILABLE" : "ACTION_REQUIRED",
          error: kindOfError,
          stream: null,
        },
      }))
    }
  }

  const browserStatus = support.pageVisibility ? "READY" : "UNAVAILABLE"
  const fullscreenStatus = !requirements.fullscreen
    ? null
    : support.fullscreen
      ? "READY"
      : "UNAVAILABLE"
  const statusFor = (kind) =>
    requirements[kind] ? devices[kind].status : "NOT_REQUIRED"

  const summary = {
    browser: browserStatus,
    network: network.status === "CHECKING" ? "ACTION_REQUIRED" : network.status,
    fullscreen: fullscreenStatus || "NOT_REQUIRED",
    camera:
      statusFor("camera") === "CHECKING"
        ? "ACTION_REQUIRED"
        : statusFor("camera"),
    microphone:
      statusFor("microphone") === "CHECKING"
        ? "ACTION_REQUIRED"
        : statusFor("microphone"),
    screenShare:
      statusFor("screen") === "CHECKING"
        ? "ACTION_REQUIRED"
        : statusFor("screen"),
  }
  const allReady = Object.values(summary).every(
    (value) => value === "READY" || value === "NOT_REQUIRED"
  )

  return (
    <div className="space-y-6">
      <ul className="space-y-3" aria-label="System check results">
        <SystemCheckItem
          title="Browser"
          status={browserStatus}
          detail={
            browserStatus === "READY"
              ? storageAvailable()
                ? "Your browser supports the exam and can keep unsaved answers safe during short outages."
                : "Supported. Private browsing may limit how answers are kept on this device during outages, so keep a steady connection."
              : "Please use a recent version of Chrome, Edge, Firefox or Safari."
          }
        />
        <SystemCheckItem
          title="Internet connection"
          status={network.status}
          detail={network.detail}
          action={
            network.status !== "CHECKING" && network.status !== "READY" ? (
              <button
                type="button"
                className="pn-btn pn-btn-secondary"
                onClick={runNetworkCheck}
              >
                Check again
              </button>
            ) : null
          }
        />
        {fullscreenStatus && (
          <SystemCheckItem
            title="Full screen"
            status={fullscreenStatus}
            detail={
              fullscreenStatus === "READY"
                ? "Supported. The exam will switch to full screen when you press Start."
                : "This browser can't run the exam in full screen. Use a laptop or desktop browser."
            }
          />
        )}
        {["camera", "microphone", "screen"]
          .filter((kind) => requirements[kind])
          .map((kind) => {
            const entry = devices[kind]
            const guidance = entry.error
              ? MEDIA_ERROR_GUIDANCE[entry.error] ||
                MEDIA_ERROR_GUIDANCE.UNKNOWN
              : null
            const copy = DEVICE_COPY[kind]
            return (
              <SystemCheckItem
                key={kind}
                title={copy.title}
                status={entry.status}
                detail={
                  entry.status === "READY"
                    ? copy.ready
                    : guidance
                      ? `${guidance.title}. ${guidance.help}`
                      : "Not checked yet. Your browser will ask for permission."
                }
                action={
                  entry.status !== "READY" &&
                  entry.status !== "CHECKING" &&
                  entry.status !== "UNAVAILABLE" ? (
                    <button
                      type="button"
                      className="pn-btn pn-btn-primary"
                      onClick={() => requestDevice(kind)}
                    >
                      {guidance?.action || copy.allow}
                    </button>
                  ) : null
                }
              >
                {kind === "camera" && entry.stream && (
                  <CameraPreview stream={entry.stream} />
                )}
                {kind === "microphone" && entry.stream && (
                  <MicrophoneMeter stream={entry.stream} />
                )}
              </SystemCheckItem>
            )
          })}
      </ul>

      <div className="flex flex-wrap items-center gap-4">
        <button
          type="button"
          className="pn-btn pn-btn-primary pn-btn-lg"
          disabled={!allReady || submitting}
          onClick={() => onComplete(summary)}
        >
          {submitting && <span className="pn-spinner" aria-hidden="true" />}
          {allReady ? "All set — continue" : "Complete the checks to continue"}
        </button>
        {!allReady && (
          <p className="text-sm text-neet-muted" role="status">
            {
              Object.values(summary).filter(
                (value) => value === "ACTION_REQUIRED"
              ).length
            }{" "}
            item(s) need your attention.
          </p>
        )}
      </div>
    </div>
  )
}
