function StatusPanel({
  action,
  description,
  requestId,
  title,
  tone = "neutral",
}) {
  const isError = tone === "error"

  return (
    <section
      className={`rounded-product-lg border p-6 text-center sm:p-10 ${
        isError
          ? "border-catalog-danger/30 bg-catalog-surface"
          : "border-catalog-border bg-catalog-surface"
      }`}
      role={isError ? "alert" : "status"}
      aria-live={isError ? "assertive" : "polite"}
    >
      <h2 className="text-xl font-semibold text-catalog-text">{title}</h2>
      <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-catalog-muted">
        {description}
      </p>
      {requestId && (
        <p className="mt-2 break-all font-mono text-xs text-catalog-muted">
          Request ID: {requestId}
        </p>
      )}
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </section>
  )
}

export default StatusPanel
