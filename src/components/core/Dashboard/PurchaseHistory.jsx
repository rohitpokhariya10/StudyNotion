import { useEffect, useState } from "react"
import { toast } from "react-hot-toast"
import { Link } from "react-router-dom"

import {
  fetchPurchaseHistory,
  requestPurchaseRefund,
} from "../../../services/operations/studentFeaturesAPI"
import {
  formatPaymentDate,
  formatPaymentMoney,
  getPaymentStatus,
} from "../../../utils/paymentPresentation"

const PAGE_SIZE = 20

export default function PurchaseHistory() {
  const [purchases, setPurchases] = useState([])
  const [pagination, setPagination] = useState({ page: 1, pages: 0, total: 0 })
  const [page, setPage] = useState(1)
  const [reloadKey, setReloadKey] = useState(0)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState("")
  const [refundPurchaseId, setRefundPurchaseId] = useState(null)
  const [refundReason, setRefundReason] = useState("")
  const [submittingRefund, setSubmittingRefund] = useState(false)

  useEffect(() => {
    let active = true

    fetchPurchaseHistory({ page, limit: PAGE_SIZE })
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

  const closeRefundForm = () => {
    setRefundPurchaseId(null)
    setRefundReason("")
  }

  const submitRefundRequest = async (event, purchaseId) => {
    event.preventDefault()
    const reason = refundReason.trim()
    if (reason.length < 10 || reason.length > 1000) {
      toast.error("Add a refund reason between 10 and 1000 characters.")
      return
    }

    setSubmittingRefund(true)
    try {
      const result = await requestPurchaseRefund(purchaseId, reason)
      toast.success(result.message || "Refund request submitted for review")
      closeRefundForm()
      setLoading(true)
      setLoadError("")
      setReloadKey((current) => current + 1)
    } catch (error) {
      toast.error(error.message)
    } finally {
      setSubmittingRefund(false)
    }
  }

  return (
    <section aria-labelledby="purchase-history-title">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1
            id="purchase-history-title"
            className="text-3xl font-medium text-richblack-5"
          >
            Purchases &amp; refunds
          </h1>
          <p className="mt-2 text-sm text-richblack-300">
            Track verified payments, course access, and refund requests.
          </p>
        </div>
        <p className="rounded-full bg-richblack-700 px-3 py-1 text-sm text-richblack-100">
          {pagination.total} purchases
        </p>
      </div>

      {loading ? (
        <div className="grid min-h-64 place-items-center">
          <div
            className="spinner"
            role="status"
            aria-label="Loading purchases"
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
            No verified purchases yet.
          </p>
          <p className="mt-2 text-sm text-richblack-300">
            Completed course payments will appear here.
          </p>
          <Link
            to="/"
            className="mt-5 inline-flex rounded-md bg-yellow-50 px-4 py-2 font-medium text-richblack-900"
          >
            Browse courses
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {purchases.map((purchase) => {
            const status = purchase.refundRejectedAt
              ? {
                  label: "Refund not approved",
                  description:
                    "The reviewed request was not approved. Contact support to appeal.",
                  classes: "bg-richblack-600 text-richblack-100",
                }
              : purchase.status === "refund_pending" &&
                  purchase.refundProviderStatus === "failed"
                ? {
                    label: "Refund needs support",
                    description:
                      "The provider marked the attempt failed; support will reconcile it.",
                    classes: "bg-pink-900 text-pink-100",
                  }
                : getPaymentStatus(purchase.status)
            const refundFormOpen = refundPurchaseId === purchase._id

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
                    <p className="mt-1 text-xs text-richblack-400">
                      Purchased{" "}
                      {formatPaymentDate(purchase.paidAt || purchase.createdAt)}
                    </p>
                  </div>
                  <div className="max-w-xs text-right">
                    <span
                      className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${status.classes}`}
                    >
                      {status.label}
                    </span>
                    <p className="mt-2 text-xs leading-5 text-richblack-300">
                      {status.description}
                    </p>
                  </div>
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

                <dl className="mt-4 grid gap-3 text-xs text-richblack-300 sm:grid-cols-2">
                  <div>
                    <dt className="text-richblack-400">Order ID</dt>
                    <dd className="mt-1 break-all font-mono text-richblack-100">
                      {purchase.razorpayOrderId || "Not recorded"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-richblack-400">Policy at checkout</dt>
                    <dd className="mt-1 text-richblack-100">
                      Terms {purchase.checkoutTermsVersion || "—"} · Refunds{" "}
                      {purchase.refundPolicyVersion || "—"}
                    </dd>
                  </div>
                </dl>

                {purchase.refundEligible && !refundFormOpen && (
                  <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-richblack-700 pt-4">
                    <p className="text-xs text-richblack-300">
                      Request by{" "}
                      {formatPaymentDate(purchase.refundEligibleUntil)}
                    </p>
                    <button
                      type="button"
                      className="rounded-md border border-yellow-100 px-4 py-2 text-sm font-medium text-yellow-50"
                      onClick={() => {
                        setRefundPurchaseId(purchase._id)
                        setRefundReason("")
                      }}
                    >
                      Request refund
                    </button>
                  </div>
                )}

                {purchase.refundRejectedAt && (
                  <p className="mt-4 border-t border-richblack-700 pt-4 text-xs text-richblack-300">
                    Reviewed {formatPaymentDate(purchase.refundRejectedAt)}.
                    Your course access remains active; contact support if you
                    need to appeal this decision.
                  </p>
                )}

                {!purchase.refundRejectedAt &&
                  purchase.status === "fulfilled" &&
                  !purchase.refundEligible && (
                    <p className="mt-4 border-t border-richblack-700 pt-4 text-xs text-richblack-400">
                      The recorded {purchase.refundWindowDays ?? "—"}-day refund
                      request window has closed. Statutory rights are
                      unaffected.
                    </p>
                  )}

                {refundFormOpen && (
                  <form
                    className="mt-5 border-t border-richblack-700 pt-4"
                    onSubmit={(event) =>
                      void submitRefundRequest(event, purchase._id)
                    }
                  >
                    <label htmlFor={`refund-reason-${purchase._id}`}>
                      <span className="mb-2 block text-sm font-medium text-richblack-50">
                        Why are you requesting a refund?
                      </span>
                      <textarea
                        id={`refund-reason-${purchase._id}`}
                        autoFocus
                        required
                        minLength={10}
                        maxLength={1000}
                        rows={4}
                        className="form-style w-full resize-y"
                        value={refundReason}
                        onChange={(event) =>
                          setRefundReason(event.target.value)
                        }
                        placeholder="Describe the issue so support can review it (10–1000 characters)."
                      />
                    </label>
                    <p className="mt-2 text-xs text-richblack-300">
                      This submits a review request; approval and provider
                      processing are separate steps.
                    </p>
                    <div className="mt-4 flex justify-end gap-3">
                      <button
                        type="button"
                        disabled={submittingRefund}
                        className="rounded-md bg-richblack-600 px-4 py-2 text-sm text-richblack-50 disabled:opacity-50"
                        onClick={closeRefundForm}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={submittingRefund}
                        className="rounded-md bg-yellow-50 px-4 py-2 text-sm font-medium text-richblack-900 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {submittingRefund
                          ? "Submitting…"
                          : "Submit refund request"}
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
          aria-label="Purchase history pages"
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
