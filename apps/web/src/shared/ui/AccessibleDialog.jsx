import { useEffect, useId, useRef } from "react"

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

const dialogs = []
const inertState = new Map()
let bodyOverflow

// Recompute isolation from the top dialog. This also supports a confirmation
// opened from a drawer and independently mounted exam warnings.
function isolateTopDialog() {
  inertState.forEach((value, element) => {
    element.inert = value
  })
  inertState.clear()
  let current = dialogs.at(-1)
  while (current?.parentElement) {
    for (const sibling of current.parentElement.children) {
      if (sibling === current) continue
      inertState.set(sibling, sibling.inert)
      sibling.inert = true
    }
    current = current.parentElement
    if (current === document.body) break
  }
}

// Modal dialog with a focus trap, Escape handling (optional), labelled
// title/description, and focus restoration. Presentation is supplied by the
// caller so product areas can keep their own visual language.
export default function AccessibleDialog({
  children,
  className = "",
  closeOnEscape = true,
  description,
  initialFocusRef,
  onClose,
  closeOnBackdrop = false,
  overlayClassName = "",
  role = "dialog",
  title,
  titleClassName = "",
  descriptionClassName = "",
}) {
  const dialogRef = useRef(null)
  const overlayRef = useRef(null)
  const onCloseRef = useRef(onClose)
  const escapeRef = useRef(closeOnEscape)
  const baseId = useId()
  const titleId = `${baseId}-title`
  const descriptionId = `${baseId}-description`

  useEffect(() => {
    onCloseRef.current = onClose
    escapeRef.current = closeOnEscape
  }, [onClose, closeOnEscape])

  useEffect(() => {
    const previouslyFocused = document.activeElement
    const dialog = dialogRef.current
    const overlay = overlayRef.current
    if (!dialogs.length) bodyOverflow = document.body.style.overflow
    dialogs.push(overlay)
    isolateTopDialog()
    document.body.style.overflow = "hidden"
    const target =
      initialFocusRef?.current || dialog?.querySelector(FOCUSABLE) || dialog
    target?.focus()

    const handleKeyDown = (event) => {
      if (dialogs.at(-1) !== overlay) return
      if (event.key === "Escape" && escapeRef.current) {
        event.preventDefault()
        onCloseRef.current?.()
        return
      }
      if (event.key !== "Tab" || !dialog) return
      const focusable = Array.from(dialog.querySelectorAll(FOCUSABLE)).filter(
        (element) =>
          !element.closest("[inert], [hidden]") &&
          !element.matches(":disabled") &&
          element.type !== "hidden"
      )
      if (!focusable.length) {
        event.preventDefault()
        dialog.focus()
        return
      }
      const first = focusable[0]
      const last = focusable.at(-1)
      const outside = !dialog.contains(document.activeElement)
      if (event.shiftKey && (document.activeElement === first || outside)) {
        event.preventDefault()
        last.focus()
      } else if (
        !event.shiftKey &&
        (document.activeElement === last || outside)
      ) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener("keydown", handleKeyDown)
    // Responsive drawers must release isolation when their desktop layout hides
    // them; otherwise a resized page could remain inert behind an invisible modal.
    const observer =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(() => {
            if (window.getComputedStyle(overlay).display === "none")
              onCloseRef.current?.()
          })
        : null
    observer?.observe(overlay)
    return () => {
      document.removeEventListener("keydown", handleKeyDown)
      observer?.disconnect()
      const wasTop = dialogs.at(-1) === overlay
      dialogs.splice(dialogs.indexOf(overlay), 1)
      isolateTopDialog()
      if (!dialogs.length) document.body.style.overflow = bodyOverflow
      if (wasTop && previouslyFocused?.isConnected) previouslyFocused.focus()
    }
  }, [initialFocusRef])

  return (
    <div
      ref={overlayRef}
      className={`fixed inset-0 z-[1000] grid place-items-center overflow-y-auto p-4 ${overlayClassName}`}
      onMouseDown={(event) => {
        if (closeOnBackdrop && event.target === event.currentTarget)
          onCloseRef.current?.()
      }}
    >
      <div
        ref={dialogRef}
        role={role}
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        tabIndex={-1}
        className={className}
      >
        <h2 id={titleId} className={titleClassName}>
          {title}
        </h2>
        {description && (
          <div id={descriptionId} className={descriptionClassName}>
            {description}
          </div>
        )}
        {children}
      </div>
    </div>
  )
}
