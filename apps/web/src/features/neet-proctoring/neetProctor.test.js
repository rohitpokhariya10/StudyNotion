import { afterEach, expect, it, vi } from "vitest"

import { createTrackAdapter } from "./lib/adapters/trackAdapter"
import { createSustainedActivityTracker } from "./lib/detectors/audioActivity"
import {
  analyseObstruction,
  createDurationGate,
  createFaceSignalDetector,
} from "./lib/detectors/faceSignal"
import {
  grantProctorConsent,
  requestCamera,
  requestMicrophone,
} from "./lib/mediaAccess"
import { createProctorEventQueue } from "./model/proctorEventQueue"

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  vi.useRealTimers()
})
it("never asks for media without explicit proctored consent", async () => {
  const devices = { getUserMedia: vi.fn(async () => ({})) }
  vi.stubGlobal("isSecureContext", true)
  await expect(requestCamera(null, devices)).rejects.toMatchObject({
    kind: "CONSENT_REQUIRED",
  })
  const practice = grantProctorConsent({
    attemptId: "a",
    consentVersion: "1",
    mode: "NON_PROCTORED",
  })
  await expect(requestMicrophone(practice, devices)).rejects.toMatchObject({
    kind: "CONSENT_REQUIRED",
  })
  expect(devices.getUserMedia).not.toHaveBeenCalled()
  const grant = grantProctorConsent({
    attemptId: "a",
    consentVersion: "1",
    mode: "PROCTORED",
  })
  await requestCamera(grant, devices)
  expect(devices.getUserMedia).toHaveBeenCalledTimes(1)
  devices.getUserMedia.mockRejectedValue({ name: "NotAllowedError" })
  await expect(requestCamera(grant, devices)).rejects.toMatchObject({
    kind: "PERMISSION_DENIED",
  })
})
it("requires sustained duration and resets after natural movement", () => {
  const gate = createDurationGate(8000)
  expect(gate.update(true, 0).fired).toBe(false)
  expect(gate.update(true, 1000).fired).toBe(false)
  gate.update(false, 1200)
  expect(gate.update(true, 9000).fired).toBe(false)
  expect(gate.update(true, 17000).fired).toBe(true)
  expect(gate.update(true, 18000).fired).toBe(false)
})
it("darkness produces CAMERA_OBSTRUCTION only, never a face or cheating claim", async () => {
  vi.useFakeTimers()
  vi.stubGlobal("FaceDetector", undefined)
  const pixels = new Uint8ClampedArray(48 * 36 * 4)
  expect(analyseObstruction(pixels).obscured).toBe(true)
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
    drawImage() {},
    getImageData: () => ({ data: pixels }),
  })
  const onSignal = vi.fn()
  const detector = createFaceSignalDetector({
    video: { readyState: 4 },
    onSignal,
    config: {
      faceAbsentSeconds: 2,
      multipleFacesSeconds: 2,
      sampleIntervalMs: 500,
    },
  })
  await vi.advanceTimersByTimeAsync(4000)
  expect(onSignal).toHaveBeenCalledWith(
    "CAMERA_OBSTRUCTION",
    expect.objectContaining({ detector: "frame-obstruction" })
  )
  expect(
    onSignal.mock.calls.every(([type]) => type === "CAMERA_OBSTRUCTION")
  ).toBe(true)
  detector.stop()
})
it("one sound never triggers sustained audio and repeated windows respect cooldown", () => {
  const tracker = createSustainedActivityTracker({
    sampleMs: 200,
    windowMs: 1000,
    cooldownMs: 4000,
  })
  expect(
    [true, false, false, false, false].some((active, i) =>
      tracker.push(active, i * 200)
    )
  ).toBe(false)
  let signals = 0
  for (let i = 5; i < 20; i++) if (tracker.push(true, i * 200)) signals++
  expect(signals).toBe(1)
})
it("temporary track mute is tolerated and listeners are cleaned up", async () => {
  vi.useFakeTimers()
  const track = new EventTarget()
  track.readyState = "live"
  const emit = vi.fn()
  const stop = createTrackAdapter({
    kind: "camera",
    stream: { getTracks: () => [track] },
    emit,
  })
  track.dispatchEvent(new Event("mute"))
  await vi.advanceTimersByTimeAsync(1000)
  track.dispatchEvent(new Event("unmute"))
  await vi.advanceTimersByTimeAsync(3000)
  expect(emit).not.toHaveBeenCalled()
  track.dispatchEvent(new Event("ended"))
  expect(emit).toHaveBeenCalledWith("CAMERA_INTERRUPTED", {
    reason: "TRACK_ENDED",
  })
  stop()
})
it("bounds event spam and retries using the same event IDs", async () => {
  vi.useFakeTimers()
  const send = vi
    .fn()
    .mockRejectedValueOnce({ status: 503 })
    .mockResolvedValue({})
  const queue = createProctorEventQueue({ send })
  for (let i = 0; i < 1000; i++) queue.push("TAB_HIDDEN")
  expect(queue.size).toBe(1)
  await queue.flush()
  await vi.advanceTimersByTimeAsync(3000)
  expect(send.mock.calls[0][0][0].clientEventId).toBe(
    send.mock.calls[1][0][0].clientEventId
  )
  queue.stop()
})
