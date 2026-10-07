// Browser signal adapters. Each takes its environment explicitly (for tests)
// and returns a stop() that removes every listener it added. They report raw
// signals only; severity and warnings are decided by the server policy.

export const createVisibilityAdapter = ({ doc = document, emit }) => {
  const onChange = () => {
    if (doc.visibilityState === "hidden") emit("TAB_HIDDEN")
  }
  doc.addEventListener("visibilitychange", onChange)
  return () => doc.removeEventListener("visibilitychange", onChange)
}

// A blur that is followed by the page becoming hidden is a tab switch, which
// the visibility adapter already reports; only real window blurs count here.
export const createFocusAdapter = ({
  doc = document,
  emit,
  settleMs = 300,
  win = window,
}) => {
  let timer = null
  let blurred = false
  const onBlur = () => {
    clearTimeout(timer)
    timer = setTimeout(() => {
      if (doc.visibilityState === "hidden" || doc.hasFocus?.()) return
      blurred = true
      emit("WINDOW_BLUR")
    }, settleMs)
  }
  const onFocus = () => {
    clearTimeout(timer)
    if (blurred) {
      blurred = false
      emit("WINDOW_FOCUS")
    }
  }
  win.addEventListener("blur", onBlur)
  win.addEventListener("focus", onFocus)
  return () => {
    clearTimeout(timer)
    win.removeEventListener("blur", onBlur)
    win.removeEventListener("focus", onFocus)
  }
}

export const createFullscreenAdapter = ({
  doc = document,
  emit,
  onStateChange,
}) => {
  let wasFullscreen = Boolean(doc.fullscreenElement)
  const onChange = () => {
    const isFullscreen = Boolean(doc.fullscreenElement)
    if (wasFullscreen && !isFullscreen) emit("FULLSCREEN_EXIT")
    if (!wasFullscreen && isFullscreen) emit("FULLSCREEN_RESTORED")
    wasFullscreen = isFullscreen
    onStateChange?.(isFullscreen)
  }
  doc.addEventListener("fullscreenchange", onChange)
  return () => doc.removeEventListener("fullscreenchange", onChange)
}

// Copy/cut/paste are blocked inside the proctored exam and reported; the
// context menu is suppressed without being treated as a violation.
export const createClipboardAdapter = ({ doc = document, emit }) => {
  const onCopy = (event) => {
    event.preventDefault()
    emit("COPY_ATTEMPT", { reason: "KEYBOARD_SHORTCUT" })
  }
  const onPaste = (event) => {
    event.preventDefault()
    emit("PASTE_ATTEMPT", { reason: "KEYBOARD_SHORTCUT" })
  }
  const onContextMenu = (event) => event.preventDefault()
  doc.addEventListener("copy", onCopy)
  doc.addEventListener("cut", onCopy)
  doc.addEventListener("paste", onPaste)
  doc.addEventListener("contextmenu", onContextMenu)
  return () => {
    doc.removeEventListener("copy", onCopy)
    doc.removeEventListener("cut", onCopy)
    doc.removeEventListener("paste", onPaste)
    doc.removeEventListener("contextmenu", onContextMenu)
  }
}

export const createNetworkAdapter = ({ emit, win = window }) => {
  const onOffline = () => emit("NETWORK_OFFLINE")
  const onOnline = () => emit("NETWORK_ONLINE")
  win.addEventListener("offline", onOffline)
  win.addEventListener("online", onOnline)
  return () => {
    win.removeEventListener("offline", onOffline)
    win.removeEventListener("online", onOnline)
  }
}
