const STORAGE_PREFIX = "studynotion.checkout.v1"

const randomKey = () => {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return globalThis.crypto.randomUUID()
  }

  const bytes = new Uint8Array(16)
  if (typeof globalThis.crypto?.getRandomValues === "function") {
    globalThis.crypto.getRandomValues(bytes)
    return Array.from(bytes, (byte) =>
      byte.toString(16).padStart(2, "0")
    ).join("")
  }

  return `${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2)}`
}

const checkoutStorageKey = (userId, courses) => {
  const normalizedCourses = [...new Set(courses.map(String))].sort()
  return `${STORAGE_PREFIX}:${String(userId || "session")}:${normalizedCourses.join(",")}`
}

export const getCheckoutIdempotency = ({ courses, userId }) => {
  const storageKey = checkoutStorageKey(userId, courses)
  let idempotencyKey

  try {
    idempotencyKey = window.sessionStorage.getItem(storageKey)
  } catch {
    // Checkout still works when session storage is disabled; this page attempt
    // simply cannot reuse its key after a reload.
  }

  if (!idempotencyKey) {
    idempotencyKey = randomKey()
    try {
      window.sessionStorage.setItem(storageKey, idempotencyKey)
    } catch {
      // See the storage note above.
    }
  }

  return { idempotencyKey, storageKey }
}

export const clearCheckoutIdempotency = (storageKey) => {
  try {
    window.sessionStorage.removeItem(storageKey)
  } catch {
    // A completed checkout does not depend on storage cleanup succeeding.
  }
}
