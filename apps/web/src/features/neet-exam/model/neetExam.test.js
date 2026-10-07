import { afterEach, describe, expect, it, vi } from "vitest"

import { neetFixture, neetIds } from "../../../../test/neetFixtures"
import { examStorage } from "../lib/examStorage"
import { createTabCoordinator } from "../lib/tabCoordinator"
import { createAutosaveQueue } from "./autosaveQueue"
import { createExamController } from "./examController"
import { createServerClock } from "./serverClock"

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
  localStorage.clear()
  sessionStorage.clear()
})
const deferred = () => {
  let resolve
  const promise = new Promise((r) => {
    resolve = r
  })
  return { promise, resolve }
}
const write = (seq, selectedOption = "A") => ({
  questionId: neetIds.question,
  selectedOption,
  markedForReview: false,
  visited: true,
  timeSpentMs: 0,
  seq,
})

describe("exam integrity helpers", () => {
  it("uses server time and elapsed monotonic time despite device-clock changes", () => {
    let elapsed = 10
    const clock = createServerClock({ perfNow: () => elapsed })
    clock.sync({
      serverNow: "2026-10-05T00:00:00.000Z",
      sentAt: 0,
      receivedAt: 10,
    })
    const first = clock.now()
    vi.spyOn(Date, "now").mockReturnValue(0)
    elapsed += 1000
    expect(clock.now() - first).toBe(1000)
    vi.restoreAllMocks()
  })
  it("does not let an old acknowledgement erase a newer local answer", async () => {
    vi.useFakeTimers()
    const request = deferred()
    const send = vi
      .fn()
      .mockReturnValueOnce(request.promise)
      .mockImplementation(async (responses) => ({ responses }))
    const queue = createAutosaveQueue({
      send,
      persist: vi.fn(),
      isOnline: () => true,
    })
    queue.enqueue(write(10, "B"))
    const saving = queue.flush()
    queue.enqueue(write(11, "C"))
    request.resolve({ responses: [write(10, "B")] })
    await saving
    expect(queue.pendingCount).toBe(1)
    await vi.advanceTimersByTimeAsync(1)
    expect(send.mock.calls[1][0][0]).toEqual(write(11, "C"))
    expect(queue.pendingCount).toBe(0)
    queue.stop()
  })
  it("coalesces rapid writes, persists offline, and drains after reconnect", async () => {
    vi.useFakeTimers()
    let online = false
    const persist = vi.fn()
    const send = vi.fn(async (responses) => ({ responses }))
    const queue = createAutosaveQueue({ send, persist, isOnline: () => online })
    for (let seq = 1; seq <= 30; seq++) queue.enqueue(write(seq))
    await vi.advanceTimersByTimeAsync(800)
    expect(send).not.toHaveBeenCalled()
    expect(persist.mock.lastCall[0]).toEqual([write(30)])
    online = true
    queue.resume()
    expect(await queue.drain()).toBe(true)
    expect(send).toHaveBeenCalledTimes(1)
    queue.stop()
  })
  it("honors Retry-After and stops permanently on session supersession", async () => {
    vi.useFakeTimers()
    const send = vi
      .fn()
      .mockRejectedValueOnce({ status: 429, retryAfterMs: 5000 })
      .mockRejectedValueOnce({ code: "NEET_SESSION_SUPERSEDED" })
    const onFatal = vi.fn()
    const queue = createAutosaveQueue({ send, onFatal })
    queue.enqueue(write(1))
    await queue.flush()
    await vi.advanceTimersByTimeAsync(4999)
    expect(send).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(1)
    expect(onFatal).toHaveBeenCalledWith("superseded", expect.anything())
    expect(queue.status.status).toBe("blocked")
    queue.stop()
  })
  it("isolates pending writes by session and rejects corrupt local storage", () => {
    examStorage.writeQueue(neetIds.attempt, [write(3)], "tab-a")
    expect(examStorage.readQueue(neetIds.attempt, "tab-b")).toEqual([])
    expect(examStorage.readQueue(neetIds.attempt, "tab-a")).toEqual([write(3)])
    localStorage.setItem(`pn:exam:${neetIds.attempt}:queue:tab-a`, "broken")
    expect(examStorage.readQueue(neetIds.attempt, "tab-a")).toEqual([])
  })
  it("announces a takeover to peers and works without BroadcastChannel", async () => {
    const channels = []
    class Channel {
      constructor() {
        channels.push(this)
      }
      postMessage(data) {
        channels
          .filter((c) => c !== this)
          .forEach((c) => c.onmessage?.({ data }))
      }
      close() {}
    }
    vi.stubGlobal("BroadcastChannel", Channel)
    const onMessage = vi.fn()
    const a = createTabCoordinator({ attemptId: "1", tabId: "a", onMessage })
    const b = createTabCoordinator({ attemptId: "1", tabId: "b" })
    a.setSessionId("same")
    expect(await b.findPeerWithSession("same")).toBe(true)
    b.post({ type: "claimed", sessionId: "new" })
    expect(onMessage).toHaveBeenCalledWith(
      expect.objectContaining({ type: "claimed" })
    )
    a.close()
    b.close()
    vi.stubGlobal("BroadcastChannel", undefined)
    const fallback = createTabCoordinator({ attemptId: "1" })
    fallback.setSessionId("x")
    expect(await fallback.findPeerWithSession("x")).toBe(false)
    fallback.close()
  })
})

const setupEngine = async ({ offline = false } = {}) => {
  vi.useFakeTimers()
  let now = Date.parse("2026-10-05T00:00:00Z")
  let online = !offline
  const fixture = neetFixture({ now })
  const response = (data) => ({ data, timing: { sentAt: 0, receivedAt: 1 } })
  const client = {
    getAttempt: vi.fn(async () => fixture.attempt),
    resumeAttempt: vi.fn(async (_, sessionId) =>
      response({ ...fixture.session, sessionId })
    ),
    saveResponses: vi.fn(async (_, __, responses) =>
      response({
        responses,
        lastSeq: Math.max(...responses.map((r) => r.seq)),
        expiresAt: fixture.attempt.expiresAt,
        serverNow: fixture.attempt.serverNow,
      })
    ),
    heartbeat: vi.fn(async () =>
      response({
        status: "IN_PROGRESS",
        sessionActive: true,
        serverNow: fixture.attempt.serverNow,
      })
    ),
    submitAttempt: vi.fn(async () => response(fixture.result)),
    getResult: vi.fn(async () => fixture.result),
  }
  const onResult = vi.fn()
  const controller = createExamController({
    attemptId: neetIds.attempt,
    client,
    onResult,
    clock: { now: () => now, sync() {} },
    isOnline: () => online,
    coordinatorFactory: () => ({ close() {}, post() {}, setSessionId() {} }),
  })
  controller.start()
  await vi.advanceTimersByTimeAsync(0)
  await controller.activate()
  return {
    controller,
    client,
    fixture,
    onResult,
    advance: (ms) => {
      now += ms
    },
    connect: () => {
      online = true
      controller.reconnect()
    },
  }
}
describe("exam controller", () => {
  it("resumes using the existing deadline and locks edits after submission", async () => {
    const { controller, client, fixture, onResult } = await setupEngine()
    expect(controller.getSnapshot().attempt.expiresAt).toBe(
      fixture.attempt.expiresAt
    )
    controller.change(neetIds.question, { selectedOption: "A" })
    await controller.submit()
    expect(client.saveResponses).toHaveBeenCalledTimes(1)
    expect(onResult).toHaveBeenCalledWith(neetIds.attempt)
    controller.change(neetIds.question, { selectedOption: "B" })
    expect(
      controller.getSnapshot().responses[neetIds.question].selectedOption
    ).toBe("A")
    controller.stop()
  })
  it("deduplicates concurrent submit clicks", async () => {
    const { controller, client } = await setupEngine()
    await Promise.all([controller.submit(), controller.submit()])
    expect(client.submitAttempt).toHaveBeenCalledTimes(1)
    controller.stop()
  })
  it("locks at expiry and asks the server to finalize", async () => {
    const { controller, client, advance } = await setupEngine()
    advance(600001)
    await vi.advanceTimersByTimeAsync(500)
    expect(client.submitAttempt).toHaveBeenCalledWith(
      neetIds.attempt,
      expect.any(String),
      "TIME_EXPIRED"
    )
    expect(controller.getSnapshot().phase).toBe("completed")
    controller.stop()
  })
  it("does not silently discard unsaved offline answers on manual submit", async () => {
    const { controller, client, connect } = await setupEngine({ offline: true })
    controller.change(neetIds.question, { selectedOption: "C" })
    const submit = controller.submit()
    await vi.advanceTimersByTimeAsync(10001)
    await submit
    expect(controller.getSnapshot().phase).toBe("save-error")
    expect(client.submitAttempt).not.toHaveBeenCalled()
    connect()
    await controller.submit()
    expect(client.submitAttempt).toHaveBeenCalledTimes(1)
    controller.stop()
  })
  it("supersession blocks edits and sends no old queued writes", async () => {
    const { controller, client } = await setupEngine()
    controller.supersede()
    controller.change(neetIds.question, { selectedOption: "B" })
    await vi.advanceTimersByTimeAsync(5000)
    expect(client.saveResponses).not.toHaveBeenCalled()
    expect(controller.getSnapshot().phase).toBe("duplicate")
    controller.stop()
  })
})
