import { useEffect, useMemo, useSyncExternalStore } from "react"

import { createExamController } from "./examController"

export function useExamEngine({ attemptId, onResult }) {
  const controller = useMemo(
    () => createExamController({ attemptId, onResult }),
    [attemptId, onResult]
  )
  const state = useSyncExternalStore(
    controller.subscribe,
    controller.getSnapshot
  )
  useEffect(() => {
    controller.start()
    const reconnect = () => controller.reconnect()
    const wake = () => {
      if (!document.hidden) reconnect()
    }
    window.addEventListener("online", reconnect)
    window.addEventListener("offline", reconnect)
    document.addEventListener("visibilitychange", wake)
    const beforeUnload = (event) => {
      const snapshot = controller.getSnapshot()
      // Warn whenever the timer is running; the deadline does not pause.
      if (snapshot.phase === "active" || snapshot.save.pendingCount) {
        event.preventDefault()
        event.returnValue = ""
      }
    }
    window.addEventListener("beforeunload", beforeUnload)
    return () => {
      controller.stop()
      window.removeEventListener("online", reconnect)
      window.removeEventListener("offline", reconnect)
      document.removeEventListener("visibilitychange", wake)
      window.removeEventListener("beforeunload", beforeUnload)
    }
  }, [controller])
  return { ...state, controller }
}
