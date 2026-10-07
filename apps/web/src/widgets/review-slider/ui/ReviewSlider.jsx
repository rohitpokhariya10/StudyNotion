import { fetchPublicReviews } from "@/entities/review"
import StatusPanel from "@/shared/ui/StatusPanel"
import { useEffect, useState } from "react"

import ReviewCards from "./ReviewCards"

// `variant="spotlight"` renders white quote cards with page dots for the
// blue review band; the default keeps the existing cards.
export default function ReviewSlider({ variant = "default" }) {
  const [attempt, setAttempt] = useState(0)
  const [state, setState] = useState({ status: "loading", reviews: [] })
  useEffect(() => {
    let active = true
    fetchPublicReviews()
      .then((reviews) => {
        if (active) setState({ status: "ready", reviews })
      })
      .catch(() => {
        if (active) setState({ status: "error", reviews: [] })
      })
    return () => {
      active = false
    }
  }, [attempt])
  if (state.status === "loading")
    return (
      <div
        className="mt-10 grid gap-6 sm:grid-cols-3"
        role="status"
        aria-label="Loading learner reviews"
      >
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className={`h-64 animate-pulse rounded-xl ${
              variant === "spotlight" ? "bg-white/20" : "bg-brand-soft"
            }`}
            aria-hidden="true"
          />
        ))}
      </div>
    )
  if (state.status === "error")
    return (
      <div className="mt-10">
        <StatusPanel
          tone="error"
          title="Reviews are temporarily unavailable"
          description="Please try again to hear from our learners."
          action={
            <button
              type="button"
              className="sn-btn sn-btn-secondary"
              onClick={() => {
                setState({ status: "loading", reviews: [] })
                setAttempt((value) => value + 1)
              }}
            >
              Retry reviews
            </button>
          }
        />
      </div>
    )
  if (!state.reviews.length)
    return (
      <div className="mt-10">
        <StatusPanel
          title="Every learning story starts somewhere"
          description="No reviews yet. Learner reviews will appear here when they are shared."
        />
      </div>
    )
  return <ReviewCards reviews={state.reviews} variant={variant} />
}
