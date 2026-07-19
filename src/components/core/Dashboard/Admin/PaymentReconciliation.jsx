import { useEffect, useState } from "react"
import { toast } from "react-hot-toast"

import {
  fetchPaymentReconciliation,
  resolvePaymentReconciliation,
} from "../../../../services/operations/adminAPI"
import {
  formatPaymentDate,
  formatPaymentMoney,
  getPaymentStatus,
  getRefundDeadline,
  requiresRefundWindowOverride,
} from "../../../../utils/paymentPresentation"

const PAGE_SIZE = 20

export default function PaymentReconciliation() {
  const [purchases, setPurchases] = useState([])
  const [pagination, setPagination] = useState({ page: 1, pages: 0, total: 0 })
  const [page, setPage] = useState(1)
  const [reloadKey, setReloadKey] = useState(0)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState("")
  const [reviewAction, setReviewAction] = useState(null)
  const [reviewNote, setReviewNote] = useState("")
  const [overrideRefundWindow, setOverrideRefundWindow] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let active = true

    fetchPaymentReconciliation({ page, limit: PAGE_SIZE })
      .then((data) => {
        if (!active) return
        setPurchases(Array.isArray(data.purchases) ? data.purchases : [])
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

  const closeAction = () => {
    setReviewAction(null)
    setReviewNote("")
    setOverrideRefundWindow(false)
  }

  const openAction = (purchaseId, action) => {
    setReviewAction({ action, purchaseId })
    setReviewNote("")
    setOverrideRefundWindow(false)
  }

  const submitAction = async (event) => {
    event.preventDefault()
    if (!reviewAction) return
    const note = reviewNote.trim()
    if (note.length < 10 || note.length > 1000) {
      toast.error("Add an audit note between 10 and 1000 characters.")
      return
    }

    setSaving(true)
    try {
      const result = await resolvePaymentReconciliation({
        ...reviewAction,
        note,
        overrideRefundWindow,
      })
      toast.success(result.message || "Payment review updated")
      closeAction()

      const remainsPending = result.data?.status === "refund_pending"
      setLoading(true)
      setLoadError("")
      if (!remainsPending && purchases.length === 1 && page > 1) {
        setPage((current) => current - 1)
      } else {
        setReloadKey((current) => current + 1)
      }
    } catch (error) {
      toast.error(error.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <section aria-labelledby="payment-reconciliation-title">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1
            id="payment-reconciliation-title"
            className="text-3xl font-medium text-richblack-5"
          >
            Payment reconciliation
          </h1>
          <p className="mt-2 text-sm text-richblack-300">
            Resolve captured-payment exceptions and learner refund requests.
          </p>
        </div>
        <p className="rounded-full bg-richblack-700 px-3 py-1 text-sm text-richblack-100">
          {pagination.total} require review
        </p>
      </div>

      <div className="mb-6 rounded-lg border border-yellow-700 bg-richblack-800 p-4 text-sm leading-6 text-richblack-200">
        Provider IDs, account status, course snapshots, and the recorded policy
        window must be checked before resolving an item. Every action stores the
        signed-in administrator and audit note.
      </div>

      {loading ? (
        <div className="grid min-h-64 place-items-center">
          <div
            className="spinner"
            role="status"
            aria-label="Loading payment reviews"
          />
        </div>
      ) : loadError ? (
        <div className="rounded-lg border border-pink-700 bg-richblack-800 p-6">
          <p className="text-pink-100" role="alert">
            {loadError}
          </p>
          <button
            type="button"
            className="mt-4 rounded-md bg-yellow-50 px-4 py-2 font-medium text-richblack-900"
            onClick={() => {
              setLoading(true)
              setLoadError("")
              setReloadKey((current) => current + 1)
            }}
          >
            Try again
          </button>
        </div>
      ) : purchases.length === 0 ? (
        <div className="rounded-lg border border-richblack-700 bg-richblack-800 p-10 text-center">
          <p className="text-lg font-medium text-richblack-25">
            Reconciliation queue is clear.
          </p>
          <p className="mt-2 text-sm text-richblack-300">
            Held payments and refund requests will appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {purchases.map((purchase) => {
            const status =
              purchase.status === "refund_pending" &&
              purchase.refundProviderStatus === "failed"
                ? {
                    label: "Provider refund failed",
                    description: "An explicit audited retry is required.",
                    classes: "bg-pink-900 text-pink-100",
                  }
                : getPaymentStatus(purchase.status)
            const user = purchase.user
            const fullName = `${user?.firstName || ""} ${
              user?.lastName || ""
            }`.trim()
            const canFulfill =
              purchase.status === "payment_review" &&
              user?.accountType === "Student" &&
              user?.active === true &&
              user?.approved === true
            const refundDeadline = getRefundDeadline(purchase)
            const refundOverrideRequired = requiresRefundWindowOverride(
              purchase,
              refundDeadline
            )
            const actionOpen = reviewAction?.purchaseId === purchase._id
            const refundActionOpen =
              actionOpen &&
              ["refund", "retry_refund"].includes(reviewAction?.action)
            const retryRefundActionOpen =
              actionOpen && reviewAction?.action === "retry_refund"
            const rejectRefundActionOpen =
              actionOpen && reviewAction?.action === "reject_refund"

            return (
              <article
                key={purchase._id}
                className="rounded-lg border border-richblack-700 bg-richblack-800 p-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-xl font-semibold text-richblack-5">
                      {formatPaymentMoney(purchase.amount, purchase.currency)}
                    </p>
                    <p className="mt-1 text-sm text-richblack-200">
                      {fullName || "Unavailable learner"}
                    </p>
                    <p className="text-xs text-richblack-400">
                      {user?.email || "User record unavailable"}
                    </p>
                  </div>
                  <div className="max-w-xs text-right">
                    <span
                      className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${status.classes}`}
                    >
                      {status.label}
                    </span>
                    <p className="mt-2 text-xs text-richblack-300">
                      Queued{" "}
                      {formatPaymentDate(purchase.reconciliationRequiredAt)}
                    </p>
                  </div>
                </div>

                <div className="mt-5 grid gap-4 text-xs sm:grid-cols-2">
                  <dl className="space-y-3 rounded-md border border-richblack-700 p-4">
                    <div>
                      <dt className="text-richblack-400">Purchase ID</dt>
                      <dd className="mt-1 break-all font-mono text-richblack-100">
                        {purchase._id}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-richblack-400">Razorpay order</dt>
                      <dd className="mt-1 break-all font-mono text-richblack-100">
                        {purchase.razorpayOrderId || "Not recorded"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-richblack-400">Razorpay payment</dt>
                      <dd className="mt-1 break-all font-mono text-richblack-100">
                        {purchase.razorpayPaymentId || "Not recorded"}
                      </dd>
                    </div>
                    {purchase.refundId && (
                      <div>
                        <dt className="text-richblack-400">Razorpay refund</dt>
                        <dd className="mt-1 break-all font-mono text-richblack-100">
                          {purchase.refundId}
                        </dd>
                      </div>
                    )}
                    {purchase.refundProviderStatus && (
                      <div>
                        <dt className="text-richblack-400">Provider status</dt>
                        <dd className="mt-1 text-richblack-100">
                          {purchase.refundProviderStatus}
                          {purchase.refundLastCheckedAt
                            ? ` · checked ${formatPaymentDate(
                                purchase.refundLastCheckedAt
                              )}`
                            : ""}
                        </dd>
                      </div>
                    )}
                  </dl>

                  <dl className="space-y-3 rounded-md border border-richblack-700 p-4">
                    <div>
                      <dt className="text-richblack-400">Account state</dt>
                      <dd className="mt-1 text-richblack-100">
                        {user
                          ? `${user.accountType} · ${
                              user.active ? "active" : "inactive"
                            } · ${user.approved ? "approved" : "unapproved"}`
                          : "Unavailable"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-richblack-400">Recorded policies</dt>
                      <dd className="mt-1 text-richblack-100">
                        Terms {purchase.checkoutTermsVersion || "—"} · Refunds{" "}
                        {purchase.refundPolicyVersion || "—"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-richblack-400">Refund deadline</dt>
                      <dd className="mt-1 text-richblack-100">
                        {formatPaymentDate(refundDeadline)}
                      </dd>
                    </div>
                  </dl>
                </div>

                <div className="mt-5 divide-y divide-richblack-700 rounded-md border border-richblack-700">
                  {(purchase.lineItems || []).map((lineItem, index) => (
                    <div
                      key={String(
                        lineItem.course || `${purchase._id}-${index}`
                      )}
                      className="flex items-center justify-between gap-4 px-4 py-3 text-sm"
                    >
                      <span className="min-w-0 truncate text-richblack-100">
                        {lineItem.courseName || "Course"}
                      </span>
                      <span className="shrink-0 text-richblack-300">
                        {formatPaymentMoney(lineItem.amount, purchase.currency)}
                      </span>
                    </div>
                  ))}
                </div>

                {purchase.refundRequestNote && (
                  <div className="mt-4 rounded-md border border-blue-800 bg-richblack-900 p-4">
                    <p className="text-xs font-medium uppercase tracking-wide text-blue-100">
                      Learner refund reason
                    </p>
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-richblack-100">
                      {purchase.refundRequestNote}
                    </p>
                  </div>
                )}

                {!actionOpen && (
                  <div className="mt-5 flex flex-wrap justify-end gap-3 border-t border-richblack-700 pt-4">
                    {canFulfill && (
                      <button
                        type="button"
                        className="rounded-md border border-caribbeangreen-300 px-4 py-2 text-sm font-medium text-caribbeangreen-100"
                        onClick={() => openAction(purchase._id, "fulfill")}
                      >
                        Fulfill enrollment
                      </button>
                    )}
                    <button
                      type="button"
                      className="rounded-md border border-pink-300 px-4 py-2 text-sm font-medium text-pink-100"
                      onClick={() =>
                        openAction(
                          purchase._id,
                          purchase.status === "refund_pending" &&
                            purchase.refundProviderStatus === "failed"
                            ? "retry_refund"
                            : "refund"
                        )
                      }
                    >
                      {purchase.refundProviderStatus === "failed"
                        ? "Retry failed refund"
                        : purchase.status === "refund_pending"
                          ? "Check refund status"
                          : purchase.status === "refund_requested"
                            ? "Approve & refund"
                            : "Refund payment"}
                    </button>
                    {purchase.status === "refund_requested" && (
                      <button
                        type="button"
                        className="rounded-md border border-richblack-400 px-4 py-2 text-sm font-medium text-richblack-100"
                        onClick={() =>
                          openAction(purchase._id, "reject_refund")
                        }
                      >
                        Reject request
                      </button>
                    )}
                  </div>
                )}

                {purchase.status === "payment_review" && !canFulfill && (
                  <p className="mt-3 text-right text-xs text-yellow-100">
                    Enrollment cannot be fulfilled for this account state;
                    validate and refund the captured payment.
                  </p>
                )}

                {actionOpen && (
                  <form
                    className="mt-5 border-t border-richblack-700 pt-4"
                    onSubmit={(event) => void submitAction(event)}
                  >
                    <h2 className="text-lg font-semibold text-richblack-25">
                      {rejectRefundActionOpen
                        ? "Reject learner refund request"
                        : retryRefundActionOpen
                          ? "Retry failed provider refund"
                          : refundActionOpen
                            ? purchase.status === "refund_pending"
                              ? "Recheck provider refund"
                              : "Confirm full refund"
                            : "Confirm enrollment fulfillment"}
                    </h2>
                    <p className="mt-2 text-sm leading-6 text-richblack-300">
                      {rejectRefundActionOpen
                        ? "The learner keeps course access. Record clear policy and evidence for the audited decision."
                        : retryRefundActionOpen
                          ? "Razorpay marked the previous refund failed. This explicit audited action retires that provider refund ID before one new retry."
                          : refundActionOpen
                            ? "The backend verifies or creates one full Razorpay refund and records this admin action."
                            : "Use only after validating the captured provider payment, learner, and complete course snapshot."}
                    </p>

                    <label
                      className="mt-4 block"
                      htmlFor={`review-note-${purchase._id}`}
                    >
                      <span className="mb-2 block text-sm text-richblack-100">
                        Audit note
                      </span>
                      <textarea
                        id={`review-note-${purchase._id}`}
                        autoFocus
                        required
                        minLength={10}
                        maxLength={1000}
                        rows={4}
                        className="form-style w-full resize-y"
                        value={reviewNote}
                        onChange={(event) => setReviewNote(event.target.value)}
                        placeholder="Record the provider evidence and reason for this decision."
                      />
                    </label>

                    {refundActionOpen && refundOverrideRequired && (
                      <label className="mt-4 flex items-start gap-3 rounded-md border border-pink-700 p-3 text-sm text-richblack-100">
                        <input
                          type="checkbox"
                          checked={overrideRefundWindow}
                          className="mt-1 h-4 w-4 accent-yellow-50"
                          onChange={(event) =>
                            setOverrideRefundWindow(event.target.checked)
                          }
                        />
                        <span>
                          Apply an audited refund-window override. The recorded
                          deadline is absent or has elapsed.
                        </span>
                      </label>
                    )}

                    <div className="mt-4 flex justify-end gap-3">
                      <button
                        type="button"
                        disabled={saving}
                        className="rounded-md bg-richblack-600 px-4 py-2 text-sm text-richblack-50 disabled:opacity-50"
                        onClick={closeAction}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={
                          saving ||
                          (refundActionOpen &&
                            refundOverrideRequired &&
                            !overrideRefundWindow)
                        }
                        className="rounded-md bg-yellow-50 px-4 py-2 text-sm font-medium text-richblack-900 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {saving
                          ? "Saving…"
                          : rejectRefundActionOpen
                            ? "Confirm request rejection"
                            : retryRefundActionOpen
                              ? "Confirm one refund retry"
                              : refundActionOpen
                                ? "Confirm refund action"
                                : "Confirm fulfillment"}
                      </button>
                    </div>
                  </form>
                )}
              </article>
            )
          })}
        </div>
      )}

      {pagination.pages > 1 && (
        <nav
          className="mt-6 flex items-center justify-between"
          aria-label="Payment reconciliation pages"
        >
          <button
            type="button"
            disabled={page <= 1 || loading}
            className="rounded-md bg-richblack-700 px-4 py-2 text-sm text-richblack-25 disabled:opacity-40"
            onClick={() => {
              setLoading(true)
              setLoadError("")
              setPage((current) => Math.max(1, current - 1))
            }}
          >
            Previous
          </button>
          <span className="text-sm text-richblack-300">
            Page {pagination.page} of {pagination.pages}
          </span>
          <button
            type="button"
            disabled={page >= pagination.pages || loading}
            className="rounded-md bg-richblack-700 px-4 py-2 text-sm text-richblack-25 disabled:opacity-40"
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
