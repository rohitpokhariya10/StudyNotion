import "@testing-library/jest-dom/vitest"

const values = new Map()
const memoryStorage = {
  get length() {
    return values.size
  },
  clear() {
    values.clear()
  },
  getItem(key) {
    const value = values.get(String(key))
    return value === undefined ? null : value
  },
  key(index) {
    return [...values.keys()][index] ?? null
  },
  removeItem(key) {
    values.delete(String(key))
  },
  setItem(key, value) {
    values.set(String(key), String(value))
  },
}

// Node 26 exposes an experimental, disabled localStorage global. Tests use a
// deterministic browser-compatible implementation instead.
Object.defineProperty(window, "localStorage", {
  configurable: true,
  value: memoryStorage,
})
