// Same-browser tab coordination for one attempt. The server's session
// ownership is authoritative; this channel only makes takeovers visible
// instantly and detects a duplicated tab that inherited this tab's
// sessionStorage (and therefore its session ID).
export const createTabCoordinator = ({
  attemptId,
  onMessage,
  tabId = globalThis.crypto.randomUUID(),
}) => {
  const Channel = globalThis.BroadcastChannel
  if (typeof Channel !== "function") {
    return {
      tabId,
      post() {},
      setSessionId() {},
      async findPeerWithSession() {
        return false
      },
      close() {},
    }
  }
  const channel = new Channel(`project-neet:attempt:${attemptId}`)
  const pendingProbes = new Map()
  let currentSessionId = null

  channel.onmessage = ({ data }) => {
    if (!data || data.tabId === tabId) return
    if (data.type === "probe") {
      channel.postMessage({
        type: "probe-reply",
        tabId,
        probeId: data.probeId,
        sessionId: currentSessionId,
      })
      return
    }
    if (data.type === "probe-reply") {
      pendingProbes.get(data.probeId)?.(data.sessionId)
      return
    }
    onMessage?.(data)
  }

  return {
    tabId,
    setSessionId(sessionId) {
      currentSessionId = sessionId
    },
    post(message) {
      try {
        channel.postMessage({ ...message, tabId })
      } catch {
        // channel closed
      }
    },
    // Resolves true if another live tab already uses `sessionId`.
    findPeerWithSession(sessionId, timeoutMs = 180) {
      const probeId = globalThis.crypto.randomUUID()
      return new Promise((resolve) => {
        const timer = setTimeout(() => {
          pendingProbes.delete(probeId)
          resolve(false)
        }, timeoutMs)
        pendingProbes.set(probeId, (peerSessionId) => {
          if (peerSessionId !== sessionId) return
          clearTimeout(timer)
          pendingProbes.delete(probeId)
          resolve(true)
        })
        channel.postMessage({ type: "probe", tabId, probeId })
      })
    },
    close() {
      pendingProbes.clear()
      channel.close()
    },
  }
}
