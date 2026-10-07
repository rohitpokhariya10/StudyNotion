// Per-attempt browser persistence. Every access is guarded: private modes,
// blocked storage, or quota errors degrade to in-memory behavior and never
// break the exam.
const QUEUE_KEY = (attemptId, sessionId) =>
  `pn:exam:${attemptId}:queue:${sessionId || "legacy"}`
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

export const examStorage = Object.freeze({
  readQueue(attemptId, sessionId) {
    try {
      const parsed = JSON.parse(
        read(local(), QUEUE_KEY(attemptId, sessionId)) || "[]"
      )
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
  },
  writeQueue(attemptId, writes, sessionId) {
    if (!writes.length) return remove(local(), QUEUE_KEY(attemptId, sessionId))
    return write(
      local(),
      QUEUE_KEY(attemptId, sessionId),
      JSON.stringify(writes)
    )
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
  clear(attemptId, sessionId) {
    remove(local(), QUEUE_KEY(attemptId, sessionId))
    remove(local(), SEQ_KEY(attemptId))
    remove(session(), POSITION_KEY(attemptId))
    remove(session(), SESSION_KEY(attemptId))
  },
})

export const ensureExamSessionId = (attemptId) => {
  const existing = examStorage.readSessionId(attemptId)
  if (existing) return existing
  const created = globalThis.crypto.randomUUID()
  examStorage.writeSessionId(attemptId, created)
  return created
}
