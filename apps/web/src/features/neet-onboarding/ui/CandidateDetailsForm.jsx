import {
  candidateFromProfile,
  validateCandidate,
} from "@/features/neet-onboarding/lib/candidateValidation"
import { useId, useState } from "react"

const FIELDS = [
  {
    name: "fullName",
    label: "Full name",
    autoComplete: "name",
    hint: "As you would like it to appear on your attempt summary.",
    type: "text",
  },
]

export function CandidateDetailsForm({
  initialCandidate,
  onSubmit,
  profileUser,
  submitting = false,
  submitLabel = "Continue",
}) {
  const formId = useId()
  const [values, setValues] = useState(() => ({
    ...candidateFromProfile(profileUser),
    ...(initialCandidate?.fullName
      ? { fullName: initialCandidate.fullName }
      : {}),
  }))
  const [touched, setTouched] = useState({})
  const [submitAttempted, setSubmitAttempted] = useState(false)
  const errors = validateCandidate(values)
  const prefilled = Boolean(profileUser && !initialCandidate)

  const handleSubmit = (event) => {
    event.preventDefault()
    setSubmitAttempted(true)
    if (Object.keys(errors).length) {
      const firstInvalid = FIELDS.find((field) => errors[field.name])
      document.getElementById(`${formId}-${firstInvalid.name}`)?.focus()
      return
    }
    onSubmit({ fullName: values.fullName.trim() })
  }

  return (
    <form
      noValidate
      onSubmit={handleSubmit}
      className="space-y-6"
      aria-describedby={`${formId}-privacy`}
    >
      {prefilled && (
        <p className="pn-chip border-neet-accent/40 text-neet-accent">
          Prefilled from your Prahit profile — check and edit if needed.
        </p>
      )}
      {FIELDS.map((field) => {
        const showError =
          (touched[field.name] || submitAttempted) && errors[field.name]
        const inputId = `${formId}-${field.name}`
        return (
          <div key={field.name}>
            <label htmlFor={inputId} className="block text-base font-bold">
              {field.label}
            </label>
            <p id={`${inputId}-hint`} className="mt-1 text-sm text-neet-muted">
              {field.hint}
            </p>
            <input
              id={inputId}
              name={field.name}
              type={field.type}
              inputMode={field.inputMode}
              autoComplete={field.autoComplete}
              value={values[field.name]}
              maxLength={80}
              onChange={(event) =>
                setValues((current) => ({
                  ...current,
                  [field.name]: event.target.value,
                }))
              }
              onBlur={() =>
                setTouched((current) => ({ ...current, [field.name]: true }))
              }
              aria-invalid={showError ? "true" : "false"}
              aria-describedby={`${inputId}-hint${showError ? ` ${inputId}-error` : ""}`}
              className="pn-field mt-2"
              required
            />
            {showError && (
              <p
                id={`${inputId}-error`}
                className="mt-2 text-sm font-semibold text-neet-danger"
                role="alert"
              >
                {errors[field.name]}
              </p>
            )}
          </div>
        )
      })}
      <p
        id={`${formId}-privacy`}
        className="rounded-2xl border border-neet-line bg-neet-surface-muted/60 p-4 text-sm leading-6 text-neet-muted"
      >
        We only ask for the name to show on your result. Your attempt is linked
        to your Prahit account, so we do not ask for your phone number or email
        again. Prahit NEET Mocks will never ask for your Aadhaar number, NTA
        application password or any OTP.
      </p>
      <button
        type="submit"
        className="pn-btn pn-btn-primary pn-btn-lg w-full sm:w-auto"
        disabled={submitting}
      >
        {submitting && <span className="pn-spinner" aria-hidden="true" />}
        {submitting ? "Saving your details…" : submitLabel}
      </button>
    </form>
  )
}
