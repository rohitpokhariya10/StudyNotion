// Sequenced autosave queue.
//
// - Every local change carries a monotonically increasing sequence number.
//   The server applies a write only if its sequence is newer than what it
//   stores, so retries are idempotent and late responses cannot regress an
//   answer.
// - Changes are coalesced per question (latest wins), debounced, and sent in
//   batches with at most one request in flight — no request storm per click.
// - Unsent changes are persisted locally, survive reloads and outages, and
//   are retried with backoff (honoring Retry-After) until acknowledged.

export const AUTOSAVE_STATUS = Object.freeze({
  SAVED: "saved",
  PENDING: "pending",
  SAVING: "saving",
  OFFLINE: "offline",
  RETRYING: "retrying",
  BLOCKED: "blocked",
})

const MAX_BATCH = 50
const CLOSED_CODES = new Set([
  "NEET_ATTEMPT_SUBMITTED",
  "NEET_ATTEMPT_EXPIRED",
  "NEET_ATTEMPT_NOT_STARTED",
])
const DROP_CODES = new Set(["NEET_QUESTION_NOT_IN_PAPER", "INVALID_BODY"])

export const createAutosaveQueue = ({
  debounceMs = 700,
  initialPending = [],
  isOnline = () => globalThis.navigator?.onLine !== false,
  maxWaitMs = 3000,
  now = () => Date.now(),
  onConfirmed,
  onFatal,
  onStatus,
  persist,
  random = Math.random,
  send,
}) => {
  const pending = new Map(
    initialPending.map((write) => [write.questionId, write])
  )
  let inFlight = null
  let timer = null
  let firstPendingAt = null
  let failures = 0
  let stopped = false
  let blocked = null
  let status = pending.size ? AUTOSAVE_STATUS.PENDING : AUTOSAVE_STATUS.SAVED
  let lastSavedAt = null
  const drainWaiters = new Set()

  const snapshot = () => ({
    status,
    pendingCount: pending.size,
    lastSavedAt,
    blockedReason: blocked,
  })
  const setStatus = (next) => {
    status = next
    onStatus?.(snapshot())
  }
  const save = () => persist?.([...pending.values()])

  const notifyDrained = () => {
    if (pending.size || inFlight) return
    for (const resolve of drainWaiters) resolve(true)
    drainWaiters.clear()
  }

  const schedule = (delayMs) => {
    if (stopped || blocked) return
    clearTimeout(timer)
    timer = setTimeout(() => {
      timer = null
      void flush()
    }, delayMs)
  }

  async function flush() {
    if (stopped || blocked || inFlight || !pending.size) {
      if (!pending.size && !inFlight) {
        setStatus(AUTOSAVE_STATUS.SAVED)
        notifyDrained()
      }
      return
    }
    if (!isOnline()) {
      setStatus(AUTOSAVE_STATUS.OFFLINE)
      return
    }
    clearTimeout(timer)
    timer = null
    const batch = [...pending.values()].slice(0, MAX_BATCH)
    inFlight = new Map(batch.map((write) => [write.questionId, write.seq]))
    firstPendingAt = null
    setStatus(failures ? AUTOSAVE_STATUS.RETRYING : AUTOSAVE_STATUS.SAVING)
    try {
      const result = await send(batch)
      if (stopped) return
      failures = 0
      for (const state of result.responses) {
        const queued = pending.get(state.questionId)
        // Acknowledge only what the server now holds; a newer local change
        // made while the request was in flight stays queued.
        if (queued && queued.seq <= state.seq) pending.delete(state.questionId)
      }
      for (const write of batch) {
        const queued = pending.get(write.questionId)
        const acknowledged = result.responses.some(
          (state) =>
            state.questionId === write.questionId && state.seq >= write.seq
        )
        if (queued && queued.seq === write.seq && acknowledged)
          pending.delete(write.questionId)
      }
      lastSavedAt = now()
      save()
      onConfirmed?.(result)
      inFlight = null
      if (pending.size) {
        setStatus(AUTOSAVE_STATUS.PENDING)
        schedule(0)
      } else {
        setStatus(AUTOSAVE_STATUS.SAVED)
        notifyDrained()
      }
    } catch (error) {
      if (stopped) return
      inFlight = null
      if (error?.code === "NEET_SESSION_SUPERSEDED") {
        blocked = "superseded"
        setStatus(AUTOSAVE_STATUS.BLOCKED)
        onFatal?.("superseded", error)
      } else if (CLOSED_CODES.has(error?.code)) {
        blocked = "closed"
        setStatus(AUTOSAVE_STATUS.BLOCKED)
        onFatal?.("closed", error)
      } else if (error?.status === 401) {
        blocked = "auth"
        setStatus(AUTOSAVE_STATUS.BLOCKED)
        onFatal?.("auth", error)
      } else if (DROP_CODES.has(error?.code)) {
        // A write the server can never accept would block every later save.
        for (const write of batch) {
          if (pending.get(write.questionId)?.seq === write.seq)
            pending.delete(write.questionId)
        }
        save()
        onFatal?.("invalid", error)
        if (pending.size) schedule(0)
        else {
          setStatus(AUTOSAVE_STATUS.SAVED)
          notifyDrained()
        }
      } else {
        failures += 1
        const backoff = Math.min(1000 * 2 ** (failures - 1), 15_000)
        const jitter = Math.floor(random() * 400)
        setStatus(
          isOnline() ? AUTOSAVE_STATUS.RETRYING : AUTOSAVE_STATUS.OFFLINE
        )
        schedule(error?.retryAfterMs ?? backoff + jitter)
      }
    }
  }

  return {
    enqueue(write) {
      if (stopped) return
      const existing = pending.get(write.questionId)
      if (existing && existing.seq > write.seq) return
      pending.set(write.questionId, write)
      save()
      if (blocked) return
      const time = now()
      if (firstPendingAt === null) firstPendingAt = time
      if (!inFlight) {
        setStatus(
          isOnline() ? AUTOSAVE_STATUS.PENDING : AUTOSAVE_STATUS.OFFLINE
        )
        schedule(time - firstPendingAt >= maxWaitMs ? 0 : debounceMs)
      }
    },
    flush,
    // Sends everything now and resolves true once nothing is pending, or
    // false if the deadline passes first (for example while offline).
    drain({ timeoutMs = 10_000 } = {}) {
      if (!pending.size && !inFlight) return Promise.resolve(true)
      return new Promise((resolve) => {
        const timeout = setTimeout(() => {
          drainWaiters.delete(finish)
          resolve(false)
        }, timeoutMs)
        const finish = (value) => {
          clearTimeout(timeout)
          resolve(value)
        }
        drainWaiters.add(finish)
        failures = 0
        void flush()
      })
    },
    // Called after reconnecting, re-authenticating, or reclaiming a session.
    resume() {
      if (stopped) return
      blocked = null
      failures = 0
      if (pending.size) void flush()
      else setStatus(AUTOSAVE_STATUS.SAVED)
    },
    stop() {
      stopped = true
      clearTimeout(timer)
      for (const resolve of drainWaiters) resolve(false)
      drainWaiters.clear()
    },
    get pendingCount() {
      return pending.size
    },
    get status() {
      return snapshot()
    },
  }
}
