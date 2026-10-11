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
  // Replaces the earlier per-session isolation test: keying unsent answers by
  // tab session made them unrecoverable in a new tab or after a crash (F-3).
  it("recovers unsent answers across tabs, migrates legacy keys, and rejects corrupt storage", () => {
    examStorage.writeQueue(neetIds.attempt, [write(3)])
    sessionStorage.clear() // a new tab has no session storage
    expect(examStorage.readQueue(neetIds.attempt)).toEqual([write(3)])
    // Queues written per session by older builds merge in (highest seq wins)
    // and are removed.
    const legacy = `pn:exam:${neetIds.attempt}:queue:old-tab`
    localStorage.setItem(legacy, JSON.stringify([write(5, "D")]))
    expect(examStorage.readQueue(neetIds.attempt)).toEqual([write(5, "D")])
    expect(localStorage.getItem(legacy)).toBeNull()
    // Other attempts stay isolated; corrupt data is ignored.
    expect(examStorage.readQueue("507f1f77bcf86cd7994390ff")).toEqual([])
    localStorage.setItem(`pn:exam:${neetIds.attempt}:queue`, "broken")
    expect(examStorage.readQueue(neetIds.attempt)).toEqual([])
  })
  it("sends immediately in urgent mode instead of debouncing", async () => {
    vi.useFakeTimers()
    const send = vi.fn(async (responses) => ({ responses }))
    const queue = createAutosaveQueue({
      send,
      persist: vi.fn(),
      isOnline: () => true,
    })
    queue.setUrgent(true)
    queue.enqueue(write(1))
    await vi.advanceTimersByTimeAsync(1)
    expect(send).toHaveBeenCalledTimes(1)
    queue.stop()
  })
  it("retries offline writes without an online event", async () => {
    vi.useFakeTimers()
    let network = false
    const send = vi.fn(async (responses) => {
      if (!network) throw new TypeError("Failed to fetch")
      return { responses }
    })
    // navigator keeps reporting offline and no "online" event ever fires.
    const queue = createAutosaveQueue({
      send,
      persist: vi.fn(),
      isOnline: () => false,
      random: () => 0,
    })
    queue.enqueue(write(1))
    await vi.advanceTimersByTimeAsync(700 + 5000)
    expect(send).toHaveBeenCalledTimes(1)
    expect(queue.pendingCount).toBe(1)
    network = true
    await vi.advanceTimersByTimeAsync(15_000)
    expect(queue.pendingCount).toBe(0)
    expect(queue.status.status).toBe("saved")
    queue.stop()
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

const setupEngine = async ({ offline = false, peerHolds = false } = {}) => {
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
    // Like a real network: requests fail while offline.
    saveResponses: vi.fn(async (_, __, responses) => {
      if (!online) throw new TypeError("Failed to fetch")
      return response({
        responses,
        lastSeq: Math.max(...responses.map((r) => r.seq)),
        expiresAt: fixture.attempt.expiresAt,
        serverNow: fixture.attempt.serverNow,
      })
    }),
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
    coordinatorFactory: () => ({
      close() {},
      post() {},
      setSessionId() {},
      findPeerWithSession: async () => peerHolds,
    }),
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
  it("a same-tab refresh reuses its session; a duplicated tab gets a new one", async () => {
    const stored = "11111111-1111-4111-8111-111111111111"
    const sessionKey = `pn:exam:${neetIds.attempt}:session`
    sessionStorage.setItem(sessionKey, stored)
    const same = await setupEngine()
    expect(same.client.resumeAttempt).toHaveBeenCalledWith(
      neetIds.attempt,
      stored
    )
    same.controller.stop()
    sessionStorage.setItem(sessionKey, stored)
    const duplicate = await setupEngine({ peerHolds: true })
    const [, used] = duplicate.client.resumeAttempt.mock.calls[0]
    expect(used).not.toBe(stored)
    expect(used).toMatch(/^[0-9a-f-]{36}$/)
    duplicate.controller.stop()
  })
  it("recovers unsent answers in a new tab and sends them", async () => {
    localStorage.setItem(
      `pn:exam:${neetIds.attempt}:queue`,
      JSON.stringify([write(7, "B")])
    )
    const { controller, client } = await setupEngine()
    expect(
      controller.getSnapshot().responses[neetIds.question].selectedOption
    ).toBe("B")
    await vi.advanceTimersByTimeAsync(1)
    expect(client.saveResponses).toHaveBeenCalledWith(
      neetIds.attempt,
      expect.any(String),
      [expect.objectContaining({ seq: 7, selectedOption: "B" })]
    )
    controller.stop()
  })
  it("clears every stored key for the attempt on completion", async () => {
    localStorage.setItem(`pn:exam:${neetIds.attempt}:queue:old-tab`, "[]")
    localStorage.setItem("pn:exam:other:queue", "[]")
    const { controller } = await setupEngine()
    await controller.submit()
    // Enumerate with length/key(): the test storage shim, like the Storage
    // API, does not expose keys through Object.keys.
    const keysOf = (storage) =>
      Array.from({ length: storage.length }, (_, index) => storage.key(index))
    const keys = [...keysOf(localStorage), ...keysOf(sessionStorage)]
    expect(keys.length).toBeGreaterThan(0) // the unrelated attempt's key
    expect(
      keys.filter((key) => key.startsWith(`pn:exam:${neetIds.attempt}:`))
    ).toEqual([])
    expect(localStorage.getItem("pn:exam:other:queue")).toBe("[]")
    controller.stop()
  })
  it("sends final-seconds answers immediately and flushes before timeout submission", async () => {
    const { controller, client, advance } = await setupEngine()
    advance(598_000) // 2 s left of the 600 s fixture
    await vi.advanceTimersByTimeAsync(500)
    controller.change(neetIds.question, { selectedOption: "A" })
    await vi.advanceTimersByTimeAsync(1)
    expect(client.saveResponses).toHaveBeenCalledTimes(1)

    // A save is in flight and a newer change is queued behind it when time
    // runs out: both must reach the server before the timeout submission.
    const gate = deferred()
    const send = client.saveResponses.getMockImplementation()
    client.saveResponses.mockImplementationOnce(async (...args) => {
      await gate.promise
      return send(...args)
    })
    controller.change(neetIds.question, { selectedOption: "C" })
    await vi.advanceTimersByTimeAsync(1)
    controller.change(neetIds.question, { markedForReview: true })
    advance(2_001)
    await vi.advanceTimersByTimeAsync(500)
    expect(client.submitAttempt).not.toHaveBeenCalled()
    gate.resolve()
    await vi.advanceTimersByTimeAsync(10)
    expect(client.submitAttempt).toHaveBeenCalledWith(
      neetIds.attempt,
      expect.any(String),
      "TIME_EXPIRED"
    )
    const lastSave = client.saveResponses.mock.invocationCallOrder.at(-1)
    const lastSaved = client.saveResponses.mock.calls.at(-1)[2][0]
    expect(lastSaved).toMatchObject({
      selectedOption: "C",
      markedForReview: true,
    })
    expect(lastSave).toBeLessThan(
      client.submitAttempt.mock.invocationCallOrder[0]
    )
    controller.stop()
  })
  it("an invalid write does not freeze the exam", async () => {
    const { controller, client } = await setupEngine()
    client.saveResponses.mockRejectedValueOnce({
      status: 400,
      code: "INVALID_BODY",
    })
    controller.change(neetIds.question, { selectedOption: "D" })
    await vi.advanceTimersByTimeAsync(800)
    const snapshot = controller.getSnapshot()
    expect(snapshot.phase).toBe("active")
    expect(snapshot.error.message).toMatch(/could not be saved/)
    // Reconciled with the server on the same session: not a takeover.
    expect(client.resumeAttempt).toHaveBeenCalledTimes(2)
    expect(client.resumeAttempt.mock.calls[1][1]).toBe(
      client.resumeAttempt.mock.calls[0][1]
    )
    expect(snapshot.responses[neetIds.question].selectedOption).toBe(null)
    controller.change(neetIds.question, { selectedOption: "A" })
    expect(
      controller.getSnapshot().responses[neetIds.question].selectedOption
    ).toBe("A")
    controller.stop()
  })
  it("save-error can return to the exam while time remains", async () => {
    const { controller } = await setupEngine({ offline: true })
    controller.change(neetIds.question, { selectedOption: "C" })
    const submit = controller.submit()
    await vi.advanceTimersByTimeAsync(10_001)
    await submit
    expect(controller.getSnapshot().phase).toBe("save-error")
    controller.returnToExam()
    expect(controller.getSnapshot().phase).toBe("active")
    controller.change(neetIds.question, { selectedOption: "B" })
    expect(
      controller.getSnapshot().responses[neetIds.question].selectedOption
    ).toBe("B")
    controller.stop()
  })
  it("completion fires once when finalisation paths race", async () => {
    const { controller, onResult } = await setupEngine()
    await Promise.all([controller.finishFromServer(), controller.submit()])
    expect(onResult).toHaveBeenCalledTimes(1)
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
