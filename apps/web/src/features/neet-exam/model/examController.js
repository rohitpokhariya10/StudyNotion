import { neetClient } from "@/entities/neet"

import { examStorage } from "../lib/examStorage"
import { createTabCoordinator } from "../lib/tabCoordinator"
import { createAutosaveQueue } from "./autosaveQueue"
import { createServerClock } from "./serverClock"

export const initialExamState = {
  phase: "loading",
  attempt: null,
  session: null,
  responses: {},
  index: 0,
  remainingMs: 0,
  online: true,
  error: null,
  save: { status: "saved", pendingCount: 0 },
}
const scored = (status) => ["SUBMITTED", "AUTO_SUBMITTED"].includes(status)

// A single owner for exam side effects. Views subscribe; renders never send requests.
export function createExamController({
  attemptId,
  onResult,
  client = neetClient,
  storage = examStorage,
  clock = createServerClock(),
  coordinatorFactory = createTabCoordinator,
  isOnline = () => globalThis.navigator?.onLine !== false,
  randomId = () => globalThis.crypto.randomUUID(),
}) {
  let state = { ...initialExamState, online: isOnline() }
  const listeners = new Set()
  let stopped = false
  let generation = 0
  let queue
  let coordinator
  let sessionId
  let sequence = 0
  let timer
  let heartbeatBusy = false
  let nextHeartbeat = 0
  let submitting = false
  let requestedReason = null
  let retryAt = Infinity
  let retryCount = 0
  const patch = (changes) => {
    if (stopped) return
    state = { ...state, ...changes }
    listeners.forEach((listener) => listener())
  }
  const timed = (response) => {
    clock.sync({
      ...response.timing,
      serverNow: response.data.serverNow || response.data.attempt?.serverNow,
    })
    return response.data
  }
  const complete = () => {
    queue?.stop()
    storage.clear(attemptId, sessionId || storage.readSessionId(attemptId))
    patch({ phase: "completed" })
    onResult?.(attemptId)
  }
  const supersede = () => {
    queue?.stop()
    patch({ phase: "duplicate", error: null })
  }
  const handleError = (error) => {
    if (error?.code === "NEET_SESSION_SUPERSEDED") return supersede()
    if (error?.code === "NEET_ATTEMPT_SUBMITTED") return void finishFromServer()
    if (error?.status === 401) {
      queue?.stop()
      patch({ phase: "auth", error })
    } else patch({ error })
  }

  async function load() {
    const token = ++generation
    patch({ phase: "loading", error: null })
    try {
      const attempt = await client.getAttempt(attemptId, {
        signalSession: false,
      })
      if (stopped || token !== generation) return
      patch({ attempt })
      if (attempt.hasResult || scored(attempt.status)) return complete()
      patch({
        phase:
          attempt.status === "READY"
            ? "ready"
            : attempt.status === "IN_PROGRESS"
              ? "resume"
              : "closed",
      })
    } catch (error) {
      if (!stopped && token === generation)
        patch({ phase: error.status === 401 ? "auth" : "error", error })
    }
  }

  async function activate() {
    if (
      !["ready", "resume", "duplicate", "error", "auth"].includes(state.phase)
    )
      return
    const token = ++generation
    const previousSession = storage.readSessionId(attemptId)
    // Always fresh, even when a duplicated window cloned sessionStorage.
    const newSession = randomId()
    patch({ phase: "loading", error: null })
    queue?.stop()
    try {
      const response =
        state.attempt?.status === "READY"
          ? await client.startAttempt(attemptId, newSession)
          : await client.resumeAttempt(attemptId, newSession)
      if (stopped || token !== generation) return
      const session = timed(response)
      sessionId = newSession
      storage.writeSessionId(attemptId, sessionId)
      coordinator?.setSessionId?.(sessionId)
      coordinator?.post({ type: "claimed", sessionId })
      const responses = Object.fromEntries(
        session.responses.map((item) => [item.questionId, item])
      )
      const pending = storage
        .readQueue(attemptId, previousSession)
        .filter(
          (write) =>
            responses[write.questionId] &&
            write.seq > responses[write.questionId].seq
        )
      for (const write of pending) responses[write.questionId] = write
      sequence = Math.max(
        session.lastSeq,
        storage.readSeq(attemptId),
        ...pending.map((write) => write.seq)
      )
      const index = Math.min(
        storage.readPosition(attemptId) || 0,
        session.paper.questions.length - 1
      )
      requestedReason = null
      retryAt = Infinity
      patch({
        phase: "active",
        attempt: session.attempt,
        session,
        responses,
        index,
        remainingMs: Math.max(
          0,
          Date.parse(session.attempt.expiresAt) - clock.now()
        ),
      })
      queue = createAutosaveQueue({
        initialPending: pending,
        isOnline,
        persist: (writes) => storage.writeQueue(attemptId, writes, sessionId),
        send: async (writes) =>
          timed(await client.saveResponses(attemptId, newSession, writes)),
        onStatus: (save) => patch({ save }),
        onConfirmed: (result) => {
          sequence = Math.max(sequence, result.lastSeq)
          const merged = { ...state.responses }
          for (const write of result.responses) {
            if (
              !merged[write.questionId] ||
              write.seq >= merged[write.questionId].seq
            )
              merged[write.questionId] = write
          }
          patch({ responses: merged })
        },
        onFatal: (reason, error) => {
          if (reason === "invalid") patch({ phase: "error", error })
          else handleError(error)
        },
      })
      storage.writeQueue(attemptId, pending, sessionId)
      nextHeartbeat = clock.now() + session.heartbeatIntervalSeconds * 1000
      queue.resume()
      visit(index)
      tick()
    } catch (error) {
      if (stopped || token !== generation) return
      if (error.code === "NEET_ATTEMPT_SUBMITTED")
        return void finishFromServer()
      patch({ phase: error.status === 401 ? "auth" : "error", error })
    }
  }

  function change(questionId, changes) {
    if (
      state.phase !== "active" ||
      clock.now() >= Date.parse(state.attempt.expiresAt)
    )
      return
    const old = state.responses[questionId]
    if (!old) return
    sequence += 1
    const write = { ...old, ...changes, visited: true, seq: sequence }
    storage.writeSeq(attemptId, sequence)
    patch({ responses: { ...state.responses, [questionId]: write } })
    queue.enqueue(write)
  }
  function visit(index) {
    if (
      !state.session ||
      index < 0 ||
      index >= state.session.paper.questions.length
    )
      return
    storage.writePosition(attemptId, index)
    patch({ index })
    const id = state.session.paper.questions[index].id
    if (!state.responses[id]?.visited) change(id, {})
  }
  async function heartbeat() {
    if (heartbeatBusy || !sessionId || !isOnline() || state.phase !== "active")
      return
    heartbeatBusy = true
    nextHeartbeat = clock.now() + state.session.heartbeatIntervalSeconds * 1000
    try {
      const data = timed(await client.heartbeat(attemptId, sessionId))
      if (stopped) return
      if (scored(data.status) || data.status === "SUBMITTING")
        return void finishFromServer()
      if (!data.sessionActive) return supersede()
      patch({ error: null })
    } catch (error) {
      handleError(error)
    } finally {
      heartbeatBusy = false
    }
  }
  async function submit(reason = "MANUAL_SUBMIT", { savedOnly = false } = {}) {
    if (
      submitting ||
      !sessionId ||
      ["duplicate", "auth", "completed"].includes(state.phase)
    )
      return
    submitting = true
    requestedReason = reason
    patch({ phase: "submitting", error: null })
    try {
      if (reason === "MANUAL_SUBMIT" && !savedOnly) {
        const drained = await queue.drain({ timeoutMs: 10_000 })
        if (stopped || ["duplicate", "auth", "completed"].includes(state.phase))
          return
        if (!drained && clock.now() < Date.parse(state.attempt.expiresAt)) {
          patch({
            phase: "save-error",
            error: {
              message:
                "Some answers have not reached the server. Reconnect and retry, or explicitly submit only saved answers.",
            },
          })
          return
        }
      }
      queue?.stop()
      const actualReason =
        clock.now() >= Date.parse(state.attempt.expiresAt)
          ? "TIME_EXPIRED"
          : reason
      timed(await client.submitAttempt(attemptId, sessionId, actualReason))
      if (!stopped) complete()
    } catch (error) {
      if (stopped) return
      if (error.code === "NEET_SESSION_SUPERSEDED" || error.status === 401)
        return handleError(error)
      // The display estimate may reach zero slightly before the server.
      retryCount += 1
      retryAt =
        clock.now() +
        (error.retryAfterMs ??
          Math.min(1000 * 2 ** Math.min(retryCount, 4), 15_000))
      patch({ phase: "submit-error", error })
    } finally {
      submitting = false
    }
  }
  async function finishFromServer() {
    queue?.stop()
    patch({ phase: "submitting" })
    try {
      await client.getResult(attemptId)
      if (!stopped) complete()
    } catch (error) {
      requestedReason = "MANUAL_SUBMIT"
      retryAt = clock.now() + 3000
      patch({ phase: "submit-error", error })
    }
  }
  function tick() {
    if (stopped || !state.session) return
    const remainingMs = Math.max(
      0,
      Date.parse(state.attempt.expiresAt) - clock.now()
    )
    patch({ remainingMs, online: isOnline() })
    if (remainingMs <= 0 && ["active", "save-error"].includes(state.phase))
      void submit("TIME_EXPIRED")
    else if (
      state.phase === "submit-error" &&
      isOnline() &&
      clock.now() >= retryAt
    )
      void submit(requestedReason, { savedOnly: true })
    else if (state.phase === "active" && clock.now() >= nextHeartbeat)
      void heartbeat()
  }
  return {
    getSnapshot: () => state,
    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    start() {
      stopped = false
      coordinator = coordinatorFactory({
        attemptId,
        onMessage: (message) => {
          if (
            message.type === "claimed" &&
            sessionId &&
            message.sessionId !== sessionId
          )
            supersede()
        },
      })
      timer = setInterval(tick, 500)
      void load()
    },
    stop() {
      stopped = true
      generation += 1
      clearInterval(timer)
      queue?.stop()
      coordinator?.close()
    },
    reconnect() {
      patch({ online: isOnline() })
      if (state.phase === "active") {
        queue?.resume()
        void heartbeat()
      }
      if (state.phase === "submit-error") retryAt = 0
      tick()
    },
    activate,
    change,
    visit,
    submit,
    supersede,
    finishFromServer,
    load,
  }
}
