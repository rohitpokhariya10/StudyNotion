import { getAvatarSource, setInitialsAvatarOnError } from "@/entities/user"
import {
  approveInstructor,
  fetchPendingInstructors,
  rejectInstructor,
} from "@/features/instructor-approval/api/instructorApprovalApi"
import FlaskLoader from "@/shared/ui/FlaskLoader"
import { useEffect, useState } from "react"
import { toast } from "react-hot-toast"

const PAGE_SIZE = 20

const formatSubmittedAt = (value) => {
  if (!value) return "Unknown"
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? "Unknown"
    : new Intl.DateTimeFormat(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(date)
}

export default function InstructorApprovals() {
  const [instructors, setInstructors] = useState([])
  const [pagination, setPagination] = useState({
    page: 1,
    pages: 0,
    total: 0,
  })
  const [page, setPage] = useState(1)
  const [reloadKey, setReloadKey] = useState(0)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState("")
  const [activeInstructorId, setActiveInstructorId] = useState(null)
  const [rejectionReasons, setRejectionReasons] = useState({})

  useEffect(() => {
    let active = true
    fetchPendingInstructors({ page, limit: PAGE_SIZE })
      .then((data) => {
        if (!active) return
        setInstructors(data.instructors || [])
        setPagination(data.pagination || { page, pages: 0, total: 0 })
      })
      .catch((error) => {
        if (active) setLoadError(error.message)
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [page, reloadKey])

  const completeReview = async (instructor, decision) => {
    const reason = rejectionReasons[instructor._id]?.trim() || ""
    if (decision === "reject" && reason.length < 3) {
      toast.error("Add a rejection reason of at least 3 characters.")
      return
    }

    setActiveInstructorId(instructor._id)
    try {
      const result =
        decision === "approve"
          ? await approveInstructor(instructor._id)
          : await rejectInstructor(instructor._id, reason)
      toast.success(result.message)

      if (instructors.length === 1 && page > 1) {
        setLoading(true)
        setPage((currentPage) => currentPage - 1)
      } else {
        setLoading(true)
        setLoadError("")
        setReloadKey((current) => current + 1)
      }
    } catch (error) {
      toast.error(error.message)
    } finally {
      setActiveInstructorId(null)
    }
  }

  return (
    <section aria-labelledby="instructor-approvals-title">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 id="instructor-approvals-title" className="sn-heading">
            Instructor approvals
          </h1>
          <p className="mt-2 text-sm text-text-secondary">
            Review instructor applications before granting publishing access.
          </p>
        </div>
        <p className="rounded-full bg-surface-elevated px-3 py-1 text-sm text-text-secondary">
          {pagination.total} pending
        </p>
      </div>

      {loading ? (
        <div className="grid min-h-64 place-items-center" aria-busy="true">
          <FlaskLoader accessibleLabel="Loading applications" />
        </div>
      ) : loadError ? (
        <div className="rounded-lg border border-danger/30 bg-surface-secondary p-6">
          <p className="text-danger" role="alert">
            {loadError}
          </p>
          <button
            type="button"
            className="mt-4 rounded-md bg-brand-primary px-4 py-2 font-medium text-white"
            onClick={() => {
              setLoading(true)
              setLoadError("")
              setReloadKey((current) => current + 1)
            }}
          >
            Try again
          </button>
        </div>
      ) : instructors.length === 0 ? (
        <div className="rounded-lg border border-border-default bg-surface-secondary p-10 text-center">
          <p className="text-lg font-medium text-text-primary">
            No instructor applications are waiting.
          </p>
          <p className="mt-2 text-sm text-text-secondary">
            Return here to review new instructor applications.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {instructors.map((instructor) => {
            const actionInProgress = activeInstructorId === instructor._id
            const fullName = `${instructor.firstName || ""} ${
              instructor.lastName || ""
            }`.trim()

            return (
              <article
                key={instructor._id}
                className="rounded-lg border border-border-default bg-surface-secondary p-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex min-w-0 items-center gap-4">
                    <img
                      src={getAvatarSource(instructor)}
                      alt=""
                      onError={(event) =>
                        setInitialsAvatarOnError(event, instructor)
                      }
                      className="h-12 w-12 rounded-full object-cover"
                    />
                    <div className="min-w-0">
                      <h2 className="truncate text-lg font-semibold text-text-primary">
                        {fullName || "Unnamed instructor"}
                      </h2>
                      <p className="truncate text-sm text-text-secondary">
                        {instructor.email}
                      </p>
                    </div>
                  </div>
                  <p className="text-xs text-text-secondary">
                    Submitted {formatSubmittedAt(instructor.createdAt)}
                  </p>
                </div>

                <div className="mt-4 grid gap-3 text-sm text-text-secondary md:grid-cols-2">
                  <p>
                    <span className="text-text-secondary">About: </span>
                    {instructor.additionalDetails?.about || "Not provided"}
                  </p>
                  <p>
                    <span className="text-text-secondary">Contact: </span>
                    {instructor.additionalDetails?.contactNumber ||
                      "Not provided"}
                  </p>
                </div>

                <label className="mt-5 block">
                  <span className="mb-2 block text-sm text-text-secondary">
                    Rejection reason
                  </span>
                  <textarea
                    value={rejectionReasons[instructor._id] || ""}
                    maxLength={1000}
                    rows={2}
                    className="form-style w-full resize-y"
                    placeholder="Required only when rejecting this application"
                    onChange={(event) =>
                      setRejectionReasons((current) => ({
                        ...current,
                        [instructor._id]: event.target.value,
                      }))
                    }
                  />
                </label>

                <div className="mt-4 flex flex-wrap justify-end gap-3">
                  <button
                    type="button"
                    disabled={Boolean(activeInstructorId)}
                    className="rounded-md border border-danger/40 px-4 py-2 text-sm font-medium text-danger disabled:cursor-not-allowed disabled:opacity-50"
                    onClick={() => void completeReview(instructor, "reject")}
                  >
                    Reject
                  </button>
                  <button
                    type="button"
                    disabled={Boolean(activeInstructorId)}
                    className="rounded-md bg-brand-primary px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
                    onClick={() => void completeReview(instructor, "approve")}
                  >
                    {actionInProgress ? "Saving…" : "Approve"}
                  </button>
                </div>
              </article>
            )
          })}
        </div>
      )}

      {pagination.pages > 1 && (
        <nav
          className="mt-6 flex items-center justify-between"
          aria-label="Instructor application pages"
        >
          <button
            type="button"
            disabled={page <= 1 || loading}
            className="rounded-md bg-surface-elevated px-4 py-2 text-sm text-text-primary disabled:opacity-40"
            onClick={() => {
              setLoading(true)
              setLoadError("")
              setPage((current) => Math.max(1, current - 1))
            }}
          >
            Previous
          </button>
          <span className="text-sm text-text-secondary">
            Page {pagination.page} of {pagination.pages}
          </span>
          <button
            type="button"
            disabled={page >= pagination.pages || loading}
            className="rounded-md bg-surface-elevated px-4 py-2 text-sm text-text-primary disabled:opacity-40"
            onClick={() => {
              setLoading(true)
              setLoadError("")
              setPage((current) => current + 1)
            }}
          >
            Next
          </button>
        </nav>
      )}
    </section>
  )
}
