import AccessibleDialog from "@/shared/ui/AccessibleDialog"
import IconBtn from "@/shared/ui/IconBtn"
import { useRef } from "react"

export default function ConfirmationModal({ modalData }) {
  const cancel = useRef(null)
  return (
    <AccessibleDialog
      title={modalData?.text1}
      description={modalData?.text2}
      onClose={modalData?.btn2Handler}
      initialFocusRef={cancel}
      className="w-full max-w-sm rounded-xl border border-border-default bg-white p-6 shadow-education"
      overlayClassName="bg-black/40"
      titleClassName="text-2xl font-semibold text-text-primary"
      descriptionClassName="mt-3 mb-5 leading-6 text-text-secondary"
    >
      <div className="flex flex-wrap gap-3">
        <IconBtn onclick={modalData?.btn1Handler} text={modalData?.btn1Text} />
        <button
          ref={cancel}
          type="button"
          className="sn-btn sn-btn-secondary"
          onClick={modalData?.btn2Handler}
        >
          {modalData?.btn2Text}
        </button>
      </div>
    </AccessibleDialog>
  )
}
