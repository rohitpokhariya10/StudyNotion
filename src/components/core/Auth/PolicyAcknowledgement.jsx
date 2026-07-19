import { Link } from "react-router-dom"

export default function PolicyAcknowledgement({
  idPrefix = "policy",
  value,
  onChange,
}) {
  const update = (field, checked) => onChange({ ...value, [field]: checked })
  const linkClass = "text-yellow-100 underline underline-offset-2"

  return (
    <fieldset className="space-y-3 rounded-md border border-richblack-600 bg-richblack-800/60 p-4 text-sm leading-5 text-richblack-100">
      <legend className="px-1 font-medium text-richblack-25">
        Account agreement
      </legend>

      <label className="flex items-start gap-3" htmlFor={`${idPrefix}-terms`}>
        <input
          id={`${idPrefix}-terms`}
          type="checkbox"
          required
          checked={Boolean(value?.acceptTerms)}
          onChange={(event) => update("acceptTerms", event.target.checked)}
          className="mt-1 h-4 w-4 accent-yellow-50"
        />
        <span>
          I agree to the{" "}
          <Link className={linkClass} to="/terms" target="_blank" rel="noreferrer">
            Terms of Use
          </Link>
          .
        </span>
      </label>

      <label className="flex items-start gap-3" htmlFor={`${idPrefix}-privacy`}>
        <input
          id={`${idPrefix}-privacy`}
          type="checkbox"
          required
          checked={Boolean(value?.acknowledgePrivacy)}
          onChange={(event) => update("acknowledgePrivacy", event.target.checked)}
          className="mt-1 h-4 w-4 accent-yellow-50"
        />
        <span>
          I have read the{" "}
          <Link
            className={linkClass}
            to="/privacy-policy"
            target="_blank"
            rel="noreferrer"
          >
            Privacy Notice
          </Link>
          . This acknowledges the notice; it is not consent to unrelated data use.
        </span>
      </label>

      <label className="flex items-start gap-3" htmlFor={`${idPrefix}-eligibility`}>
        <input
          id={`${idPrefix}-eligibility`}
          type="checkbox"
          required
          checked={Boolean(value?.confirmEligibility)}
          onChange={(event) => update("confirmEligibility", event.target.checked)}
          className="mt-1 h-4 w-4 accent-yellow-50"
        />
        <span>
          I can lawfully use this service in my location, or my parent or guardian
          has authorized me to create this account.
        </span>
      </label>
    </fieldset>
  )
}
