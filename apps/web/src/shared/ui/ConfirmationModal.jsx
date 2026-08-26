import IconBtn from "@/shared/ui/IconBtn"
import { useEffect, useId, useRef } from "react"

export default function ConfirmationModal({ modalData }) {
  const dialogRef = useRef(null)
  const cancelButtonRef = useRef(null)
  const cancelHandlerRef = useRef(modalData?.btn2Handler)
  const dialogId = useId()
  const titleId = `${dialogId}-title`
  const descriptionId = `${dialogId}-description`

  useEffect(() => {
    cancelHandlerRef.current = modalData?.btn2Handler
  }, [modalData?.btn2Handler])

  useEffect(() => {
    const previouslyFocused = document.activeElement
    const dialog = dialogRef.current

    cancelButtonRef.current?.focus()

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault()
        cancelHandlerRef.current?.()
        return
      }

      if (event.key !== "Tab" || !dialog) return

      const focusableElements = Array.from(
        dialog.querySelectorAll(
          'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
      )

      if (focusableElements.length === 0) {
        event.preventDefault()
        dialog.focus()
        return
      }

      const firstElement = focusableElements[0]
      const lastElement = focusableElements.at(-1)
      const activeElement = document.activeElement
      const focusIsOutsideDialog = !dialog.contains(activeElement)

      if (
        event.shiftKey &&
        (activeElement === firstElement || focusIsOutsideDialog)
      ) {
        event.preventDefault()
        lastElement.focus()
      } else if (
        !event.shiftKey &&
        (activeElement === lastElement || focusIsOutsideDialog)
      ) {
        event.preventDefault()
        firstElement.focus()
      }
    }

    document.addEventListener("keydown", handleKeyDown)

    return () => {
      document.removeEventListener("keydown", handleKeyDown)
      if (previouslyFocused?.isConnected) previouslyFocused.focus()
    }
  }, [])

  return (
    <div className="fixed inset-0 z-[1000] mt-0! grid place-items-center overflow-auto bg-white/10 backdrop-blur-xs">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        tabIndex={-1}
        className="w-11/12 max-w-[350px] rounded-lg border border-richblack-400 bg-richblack-800 p-6"
      >
        <h2 id={titleId} className="text-2xl font-semibold text-richblack-5">
          {modalData?.text1}
        </h2>
        <p
          id={descriptionId}
          className="mt-3 mb-5 leading-6 text-richblack-200"
        >
          {modalData?.text2}
        </p>
        <div className="flex items-center gap-x-4">
          <IconBtn
            onclick={modalData?.btn1Handler}
            text={modalData?.btn1Text}
          />
          <button
            ref={cancelButtonRef}
            type="button"
            className="cursor-pointer rounded-md bg-richblack-200 px-[20px] py-[8px] font-semibold text-richblack-900"
            onClick={modalData?.btn2Handler}
          >
            {modalData?.btn2Text}
          </button>
        </div>
      </div>
    </div>
  )
}
