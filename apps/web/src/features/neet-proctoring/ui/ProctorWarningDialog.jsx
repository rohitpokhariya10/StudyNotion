import AccessibleDialog from "@/shared/ui/AccessibleDialog"
import { useRef } from "react"

const toneFor = (warning, maxWarnings) => {
  if (!warning.counted)
    return { title: "A quick heads-up", accent: "border-neet-line" }
  if (warning.level > maxWarnings)
    return { title: "Warning limit reached", accent: "border-neet-danger" }
  if (warning.level === maxWarnings)
    return { title: "Final warning", accent: "border-neet-danger" }
  if (warning.level === 1)
    return { title: "Please stay with the exam", accent: "border-neet-warning" }
  return {
    title: `Warning ${warning.level} of ${maxWarnings}`,
    accent: "border-neet-warning",
  }
}

// Calm, specific, non-shaming warning. The timer keeps running underneath;
// acknowledging returns focus to the question.
export function ProctorWarningDialog({ maxWarnings, onAcknowledge, warning }) {
  const buttonRef = useRef(null)
  const tone = toneFor(warning, maxWarnings)
  return (
    <AccessibleDialog
      role="alertdialog"
      title={tone.title}
      description={<p>{warning.message}</p>}
      onClose={onAcknowledge}
      initialFocusRef={buttonRef}
      overlayClassName="bg-neet-ink/40"
      className={`w-full max-w-md rounded-2xl border-l-4 ${tone.accent} bg-neet-surface p-6 shadow-xl`}
      titleClassName="text-xl font-bold text-neet-ink"
      descriptionClassName="mt-3 leading-7 text-neet-muted"
    >
      {warning.counted && warning.level <= maxWarnings && (
        <p className="mt-3 text-sm text-neet-muted">
          Counted warnings: {warning.level} of {maxWarnings}.
        </p>
      )}
      <button
        ref={buttonRef}
        type="button"
        className="pn-btn pn-btn-primary mt-6 w-full"
        onClick={onAcknowledge}
      >
        I understand — back to my exam
      </button>
    </AccessibleDialog>
  )
}
