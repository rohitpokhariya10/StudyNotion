// Per-attempt browser persistence. Every access is guarded: private modes,
// blocked storage, or quota errors degrade to in-memory behavior and never
// break the exam.
//
// Unsent answers are keyed by attempt, not by tab session, so a new tab or a
// restored crash recovers them. localStorage writes are synchronous, so a
// change persisted before a crash survives it. Older builds stored queues per
// session ("…:queue:<session>"); those are merged in and removed on read.
const KEY_PREFIX = (attemptId) => `pn:exam:${attemptId}:`
const QUEUE_KEY = (attemptId) => `pn:exam:${attemptId}:queue`
const LEGACY_QUEUE_PREFIX = (attemptId) => `pn:exam:${attemptId}:queue:`
const SEQ_KEY = (attemptId) => `pn:exam:${attemptId}:seq`
const POSITION_KEY = (attemptId) => `pn:exam:${attemptId}:position`
const SESSION_KEY = (attemptId) => `pn:exam:${attemptId}:session`

const read = (storage, key) => {
  try {
    return storage?.getItem(key) ?? null
  } catch {
    return null
  }
}
const write = (storage, key, value) => {
  try {
    storage?.setItem(key, value)
    return true
  } catch {
    return false
  }
}
const remove = (storage, key) => {
  try {
    storage?.removeItem(key)
  } catch {
    // ignore
  }
}

const local = () => {
  try {
    return globalThis.localStorage
  } catch {
    return null
  }
}
const session = () => {
  try {
    return globalThis.sessionStorage
  } catch {
    return null
  }
}

const OPTION_KEYS = new Set(["A", "B", "C", "D"])
const isWrite = (value) =>
  value &&
  typeof value.questionId === "string" &&
  /^[a-f\d]{24}$/i.test(value.questionId) &&
  (value.selectedOption === null || OPTION_KEYS.has(value.selectedOption)) &&
  typeof value.markedForReview === "boolean" &&
  Number.isSafeInteger(value.seq) &&
  value.seq > 0 &&
  Number.isSafeInteger(value.timeSpentMs) &&
  value.timeSpentMs >= 0

const parseWrites = (raw) => {
  try {
    const parsed = JSON.parse(raw || "[]")
    return Array.isArray(parsed)
      ? parsed.filter(isWrite).map((item) => ({
          questionId: item.questionId,
          selectedOption: item.selectedOption,
          markedForReview: item.markedForReview,
          visited: true,
          timeSpentMs: item.timeSpentMs,
          seq: item.seq,
        }))
      : []
  } catch {
    return []
  }
}

const keysWithPrefix = (storage, prefix) => {
  const keys = []
  try {
    for (let index = 0; index < (storage?.length || 0); index += 1) {
      const key = storage.key(index)
      if (key?.startsWith(prefix)) keys.push(key)
    }
  } catch {
    // storage unavailable
  }
  return keys
}

// Latest write per question wins (highest sequence).
const mergeWrites = (lists) => {
  const latest = new Map()
  for (const write of lists.flat()) {
    const existing = latest.get(write.questionId)
    if (!existing || write.seq > existing.seq) {
      latest.set(write.questionId, write)
    }
  }
  return [...latest.values()]
}

export const examStorage = Object.freeze({
  // Every unsent write for the attempt, from any earlier tab or session.
  readQueue(attemptId) {
    const store = local()
    const legacyKeys = keysWithPrefix(store, LEGACY_QUEUE_PREFIX(attemptId))
    const merged = mergeWrites([
      parseWrites(read(store, QUEUE_KEY(attemptId))),
      ...legacyKeys.map((key) => parseWrites(read(store, key))),
    ])
    if (legacyKeys.length) {
      if (merged.length)
        write(store, QUEUE_KEY(attemptId), JSON.stringify(merged))
      legacyKeys.forEach((key) => remove(store, key))
    }
    return merged
  },
  writeQueue(attemptId, writes) {
    if (!writes.length) return remove(local(), QUEUE_KEY(attemptId))
    return write(local(), QUEUE_KEY(attemptId), JSON.stringify(writes))
  },
  readSeq(attemptId) {
    const value = Number(read(local(), SEQ_KEY(attemptId)))
    return Number.isSafeInteger(value) && value > 0 ? value : 0
  },
  writeSeq(attemptId, value) {
    write(local(), SEQ_KEY(attemptId), String(value))
  },
  readPosition(attemptId) {
    const value = Number(read(session(), POSITION_KEY(attemptId)))
    return Number.isSafeInteger(value) && value >= 0 ? value : null
  },
  writePosition(attemptId, index) {
    write(session(), POSITION_KEY(attemptId), String(index))
  },
  readSessionId(attemptId) {
    const value = read(session(), SESSION_KEY(attemptId))
    return value && /^[0-9a-f-]{36}$/i.test(value) ? value : null
  },
  writeSessionId(attemptId, value) {
    write(session(), SESSION_KEY(attemptId), value)
  },
  // Removes everything stored for the attempt, in both storages, including
  // queues left by earlier tabs (important on shared computers).
  clear(attemptId) {
    for (const store of [local(), session()]) {
      keysWithPrefix(store, KEY_PREFIX(attemptId)).forEach((key) =>
        remove(store, key)
      )
    }
  },
})
