import { Link } from "react-router"

export default function CheckoutPolicyAcknowledgement({
  checked,
  disabled = false,
  id,
  onChange,
  policyConfig,
}) {
  return (
    <label
      htmlFor={id}
      className="flex items-start gap-3 rounded-md border border-border-default bg-surface-secondary/70 p-3 text-left text-xs leading-5 text-text-secondary"
    >
      <input
        id={id}
        type="checkbox"
        required
        checked={checked}
        disabled={disabled || !policyConfig}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-1 h-4 w-4 shrink-0 accent-brand-primary disabled:cursor-not-allowed disabled:opacity-50"
      />
      <span>
        I reviewed the course details and agree to the{" "}
        <Link
          to="/terms"
          target="_blank"
          rel="noreferrer"
          className="text-brand-primary underline underline-offset-2"
        >
          Terms
        </Link>{" "}
        and{" "}
        <Link
          to="/refund-policy"
          target="_blank"
          rel="noreferrer"
          className="text-brand-primary underline underline-offset-2"
        >
          Refund &amp; Cancellation Policy
        </Link>
        . Access starts only after server-verified payment.
        {policyConfig && (
          <span className="mt-1 block text-text-secondary">
            Terms {policyConfig.termsVersion} · Refund policy{" "}
            {policyConfig.refundPolicyVersion} · {policyConfig.refundWindowDays}{" "}
            calendar-day refund request window
          </span>
        )}
      </span>
    </label>
  )
}
