import FlaskLoader from "@/shared/ui/FlaskLoader"

function StatusPanel({
  action,
  description,
  requestId,
  title,
  tone = "neutral",
}) {
  const isError = tone === "error" || tone === "denied"

  return (
    <section
      className={`rounded-education-lg border p-6 text-center sm:p-10 ${
        isError
          ? "border-danger/30 bg-surface-secondary"
          : "border-border-default bg-surface-secondary"
      }`}
      role={isError ? "alert" : "status"}
      aria-live={isError ? "assertive" : "polite"}
    >
      {tone === "loading" && (
        <FlaskLoader decorative label={false} className="mb-3" />
      )}
      <h2 className="text-xl font-semibold text-text-primary">{title}</h2>
      <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-text-secondary">
        {description}
      </p>
      {requestId && (
        <p className="mt-2 font-mono text-xs break-all text-text-secondary">
          Request ID: {requestId}
        </p>
      )}
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </section>
  )
}

export default StatusPanel
