import { RatingStars } from "@/entities/review"
import { getAvatarSource, setInitialsAvatarOnError } from "@/entities/user"
import CardCarousel from "@/shared/ui/CardCarousel"

import "./reviewCards.css"

function SpotlightCard({ review }) {
  const user = review.user || {}
  const name =
    [user.firstName, user.lastName].filter(Boolean).join(" ") || "Learner"
  const text = String(review.review || "")
  return (
    <figure className="sn-quote-card">
      <RatingStars Review_Count={Number(review.rating) || 0} Star_Size={18} />
      <blockquote className="sn-quote-text">
        {text.length > 170 ? `${text.slice(0, 170)}…` : text}
      </blockquote>
      {text.length > 170 && (
        <details className="sn-quote-more">
          <summary>Read full review</summary>
          <p>{text}</p>
        </details>
      )}
      <figcaption className="sn-quote-person">
        <img
          src={getAvatarSource(user)}
          onError={(event) => setInitialsAvatarOnError(event, user)}
          alt=""
          width="48"
          height="48"
          loading="lazy"
        />
        <span>
          <strong>{name}</strong>
          <span>
            Learner
            {review.course?.courseName ? ` | ${review.course.courseName}` : ""}
          </span>
        </span>
      </figcaption>
    </figure>
  )
}

export default function ReviewCards({ reviews, variant = "default" }) {
  if (variant === "spotlight")
    return (
      <CardCarousel
        count={reviews.length}
        label="learner reviews"
        inverse
        pagination
      >
        {reviews.map((review, index) => (
          <li key={review._id || index}>
            <SpotlightCard review={review} />
          </li>
        ))}
      </CardCarousel>
    )
  return (
    <CardCarousel count={reviews.length} label="learner reviews">
      {reviews.map((review, index) => {
        const user = review.user || {}
        const name =
          [user.firstName, user.lastName].filter(Boolean).join(" ") || "Learner"
        const text = String(review.review || "")
        return (
          <li key={review._id || index}>
            <figure className="flex h-full flex-col items-center rounded-xl border border-border-default bg-brand-soft p-6 text-center">
              <img
                src={getAvatarSource(user)}
                onError={(event) => setInitialsAvatarOnError(event, user)}
                alt=""
                width="72"
                height="72"
                className="h-18 w-18 rounded-full object-cover"
              />
              <figcaption className="mt-4">
                <span className="block font-semibold">{name}</span>
                {review.course?.courseName && (
                  <span className="mt-1 block text-sm text-text-secondary">
                    {review.course.courseName}
                  </span>
                )}
              </figcaption>
              <div className="mt-4">
                <RatingStars
                  Review_Count={Number(review.rating) || 0}
                  Star_Size={20}
                />
              </div>
              <blockquote className="mt-4 text-sm leading-7">
                {text.length > 190 ? `${text.slice(0, 190)}…` : text}
              </blockquote>
              {text.length > 190 && (
                <details className="mt-4 text-left text-sm leading-7">
                  <summary className="cursor-pointer font-medium text-brand-primary">
                    Read full review
                  </summary>
                  <p className="mt-3">{text}</p>
                </details>
              )}
            </figure>
          </li>
        )
      })}
    </CardCarousel>
  )
}
