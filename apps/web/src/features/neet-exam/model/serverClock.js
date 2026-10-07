// Server-time estimate for the countdown. It is anchored on performance.now()
// (monotonic), so changing the device clock never moves the timer. Each sync
// estimates server time at receipt as serverNow + RTT/2; low-latency samples
// are preferred, and a fresh sample always replaces an old anchor so that a
// suspended laptop re-anchors on wake.
const STALE_ANCHOR_MS = 120_000

export const createServerClock = ({
  perfNow = () => performance.now(),
} = {}) => {
  let anchor = null
  return {
    sync({ receivedAt, sentAt, serverNow }) {
      const serverMs = Date.parse(serverNow)
      if (
        !Number.isFinite(serverMs) ||
        !Number.isFinite(sentAt) ||
        !Number.isFinite(receivedAt)
      )
        return
      const rtt = Math.max(0, receivedAt - sentAt)
      const candidate = {
        serverMs: serverMs + rtt / 2,
        perfMs: receivedAt,
        rtt,
      }
      if (
        !anchor ||
        rtt <= anchor.rtt * 1.5 + 20 ||
        receivedAt - anchor.perfMs > STALE_ANCHOR_MS
      ) {
        anchor = candidate
      }
    },
    now() {
      return anchor ? anchor.serverMs + (perfNow() - anchor.perfMs) : Date.now()
    },
    get synced() {
      return Boolean(anchor)
    },
  }
}
