// Batches proctor signals to the server. Bounded memory, per-type throttling,
// retry with backoff, and idempotent client event IDs (a retried batch is
// de-duplicated by the server and never double-counted).

const IMMEDIATE_TYPES = new Set([
  "TAB_HIDDEN",
  "WINDOW_BLUR",
  "FULLSCREEN_EXIT",
  "SCREEN_SHARE_STOPPED",
  "COPY_ATTEMPT",
  "PASTE_ATTEMPT",
])
const UNTHROTTLED_TYPES = new Set([
  "WINDOW_FOCUS",
  "FULLSCREEN_RESTORED",
  "CAMERA_RESTORED",
  "MIC_RESTORED",
  "NETWORK_OFFLINE",
  "NETWORK_ONLINE",
])
const INFORMATIONAL_TYPES = new Set([...UNTHROTTLED_TYPES])
const CLOSED_CODES = new Set([
  "NEET_ATTEMPT_SUBMITTED",
  "NEET_ATTEMPT_EXPIRED",
  "NEET_ATTEMPT_NOT_STARTED",
  "NEET_NOT_PROCTORED",
])

export const PROCTOR_QUEUE_LIMITS = Object.freeze({
  batchSize: 20,
  maxPending: 200,
  throttleMs: 2000,
  flushDelayMs: 4000,
  maxBackoffMs: 30_000,
})

export const createProctorEventQueue = ({
  isOnline = () => globalThis.navigator?.onLine !== false,
  now = () => Date.now(),
  onResult,
  onStop,
  randomId = () => globalThis.crypto.randomUUID(),
  send,
}) => {
  const pending = []
  const lastQueuedAt = new Map()
  let timer = null
  let dueAt = Infinity
  let inFlight = false
  let stopped = false
  let backoffMs = 0

  const schedule = (delayMs) => {
    if (stopped) return
    const target = now() + delayMs
    if (timer && target >= dueAt) return
    clearTimeout(timer)
    dueAt = target
    timer = setTimeout(() => {
      timer = null
      dueAt = Infinity
      void flush()
    }, delayMs)
  }

  const trim = () => {
    while (pending.length > PROCTOR_QUEUE_LIMITS.maxPending) {
      const informational = pending.findIndex((event) =>
        INFORMATIONAL_TYPES.has(event.type)
      )
      pending.splice(informational >= 0 ? informational : 0, 1)
    }
  }

  async function flush() {
    if (stopped || inFlight || !pending.length) return
    if (!isOnline()) {
      schedule(5000)
      return
    }
    const batch = pending.slice(0, PROCTOR_QUEUE_LIMITS.batchSize)
    inFlight = true
    try {
      const result = await send(batch)
      if (stopped) return
      const sent = new Set(batch.map((event) => event.clientEventId))
      for (let index = pending.length - 1; index >= 0; index -= 1) {
        if (sent.has(pending[index].clientEventId)) pending.splice(index, 1)
      }
      backoffMs = 0
      onResult?.(result)
      if (pending.length) schedule(0)
    } catch (error) {
      if (stopped) return
      if (CLOSED_CODES.has(error?.code)) {
        stop()
        onStop?.("closed")
      } else if (error?.code === "NEET_SESSION_SUPERSEDED") {
        stop()
        onStop?.("superseded")
      } else if (error?.status === 400) {
        // A malformed batch can never succeed; drop it rather than retry forever.
        pending.splice(0, batch.length)
      } else {
        backoffMs = Math.min(
          backoffMs ? backoffMs * 2 : 2000,
          PROCTOR_QUEUE_LIMITS.maxBackoffMs
        )
        schedule(
          error?.retryAfterMs ?? backoffMs + Math.floor(Math.random() * 500)
        )
      }
    } finally {
      inFlight = false
    }
  }

  function stop() {
    stopped = true
    clearTimeout(timer)
    timer = null
  }

  return {
    push(type, metadata) {
      if (stopped) return false
      const time = now()
      if (!UNTHROTTLED_TYPES.has(type)) {
        const last = lastQueuedAt.get(type)
        if (last !== undefined && time - last < PROCTOR_QUEUE_LIMITS.throttleMs)
          return false
      }
      lastQueuedAt.set(type, time)
      pending.push({
        clientEventId: randomId(),
        type,
        occurredAt: new Date(time).toISOString(),
        ...(metadata && Object.keys(metadata).length ? { metadata } : {}),
      })
      trim()
      schedule(
        IMMEDIATE_TYPES.has(type) ? 0 : PROCTOR_QUEUE_LIMITS.flushDelayMs
      )
      return true
    },
    flush,
    stop,
    get size() {
      return pending.length
    },
  }
}
