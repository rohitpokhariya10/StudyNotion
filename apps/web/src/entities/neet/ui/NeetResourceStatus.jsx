import { describeNeetError } from "../lib/errors"

// Loading / failure presentation for Prahit NEET Mocks reads. Success renders
// nothing; the caller owns the content.
export function NeetResourceStatus({ loading, resource }) {
  if (resource.status === "loading") {
    return (
      loading || (
        <div
          role="status"
          aria-label="Loading Prahit NEET Mocks"
          className="space-y-4 py-6"
        >
          <div className="pn-skeleton h-10 w-2/3" />
          <div className="pn-skeleton h-5 w-1/2" />
          <div className="pn-skeleton h-40 w-full" />
        </div>
      )
    )
  }
  if (resource.status !== "error") return null
  const error = describeNeetError(resource.error)
  return (
    <div role="alert" className="pn-card my-4 p-6">
      <h2 className="text-xl font-bold">{error.title}</h2>
      <p className="my-4 text-neet-muted">{error.message}</p>
      {error.requestId && (
        <p className="mb-4 font-mono text-xs break-all text-neet-muted">
          Reference: {error.requestId}
        </p>
      )}
      <button
        type="button"
        className="pn-btn pn-btn-secondary"
        onClick={resource.reload}
      >
        Try again
      </button>
    </div>
  )
}
