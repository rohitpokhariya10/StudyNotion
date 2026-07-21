import { useState } from "react"
import { Link } from "react-router-dom"

import GetAvgRating from "../../../utils/avgRating"
import {
  formatCatalogDuration,
  formatCatalogLanguage,
  formatCatalogLevel,
  formatCatalogPrice,
} from "../../../utils/catalogPresentation"
import RatingStars from "../../Common/RatingStars"

function Course_Card({ course, Height, priority = false }) {
  const [failedImageUrl, setFailedImageUrl] = useState(null)
  const legacyRatings = course.ratingAndReviews || []
  const category = course.category
  const currency = course.currency || "INR"
  const durationSeconds = course.durationSeconds
  const id = course.id || course._id
  const instructor = course.instructor?.name
    ? course.instructor
    : course.instructor
      ? {
          ...course.instructor,
          name: [course.instructor.firstName, course.instructor.lastName]
            .filter(Boolean)
            .join(" "),
        }
      : null
  const language = course.language
  const level = course.level
  const name = course.name || course.courseName
  const price = course.price
  const rating = course.rating || {
    average: GetAvgRating(legacyRatings),
    count: legacyRatings.length,
  }
  const thumbnailUrl = course.thumbnailUrl || course.thumbnail
  const description = course.description || course.courseDescription
  const enrollmentCount =
    course.enrollmentCount ?? course.totalStudentsEnrolled ?? 0
  const duration = formatCatalogDuration(durationSeconds)
  const languageName = formatCatalogLanguage(language)
  const levelName = formatCatalogLevel(level)
  const ratingAverage = Number(rating?.average)
  const ratingCount = Number(rating?.count) || 0
  const imageFailed = Boolean(thumbnailUrl && failedImageUrl === thumbnailUrl)

  return (
    <article className="catalog-theme catalog-course-card h-full overflow-hidden rounded-product-lg border border-catalog-border bg-catalog-surface shadow-sm transition-[border-color,box-shadow,transform] hover:-translate-y-0.5 hover:border-catalog-brand/50 hover:shadow-product">
      <Link
        to={`/courses/${id}`}
        aria-label={`View ${name} course details`}
        className="group flex h-full flex-col"
      >
        <div
          className={`${Height || "aspect-video"} overflow-hidden bg-catalog-surface-muted`}
        >
          {thumbnailUrl && !imageFailed ? (
            <img
              src={thumbnailUrl}
              alt={`${name} course thumbnail`}
              width="640"
              height="360"
              loading={priority ? "eager" : "lazy"}
              decoding="async"
              onError={() => setFailedImageUrl(thumbnailUrl)}
              className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-[1.02]"
            />
          ) : (
            <div
              className="grid h-full place-items-center px-6 text-center text-sm font-medium text-catalog-muted"
              role="img"
              aria-label={`${name} course image unavailable`}
            >
              Course image unavailable
            </div>
          )}
        </div>

        <div className="flex flex-1 flex-col p-5">
          {category?.name && (
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-catalog-brand">
              {category.name}
            </p>
          )}
          <h2 className="mt-2 text-lg font-semibold leading-6 text-catalog-text group-hover:text-catalog-info">
            {name}
          </h2>
          {instructor?.name && (
            <p className="mt-2 text-sm text-catalog-muted">
              By {instructor.name}
            </p>
          )}
          {description && (
            <p className="catalog-line-clamp mt-3 text-sm leading-6 text-catalog-muted">
              {description}
            </p>
          )}

          <div className="mt-4 flex min-h-6 flex-wrap items-center gap-x-2 gap-y-1 text-sm text-catalog-muted">
            {ratingCount > 0 && Number.isFinite(ratingAverage) ? (
              <>
                <span className="font-semibold text-catalog-brand">
                  {ratingAverage.toFixed(1)}
                </span>
                <RatingStars Review_Count={ratingAverage} Star_Size={18} />
                <span>
                  {ratingCount.toLocaleString("en-IN")} rating
                  {ratingCount === 1 ? "" : "s"}
                </span>
              </>
            ) : (
              <span>Not yet rated</span>
            )}
          </div>

          {(levelName || languageName || duration) && (
            <p className="mt-3 text-xs leading-5 text-catalog-muted">
              {[levelName, languageName, duration].filter(Boolean).join(" · ")}
            </p>
          )}

          <div className="mt-auto flex items-end justify-between gap-4 pt-5">
            <p className="text-xl font-semibold text-catalog-text">
              {formatCatalogPrice(price, currency)}
            </p>
            {Number(enrollmentCount) > 0 && (
              <p className="text-xs text-catalog-muted">
                {Number(enrollmentCount).toLocaleString("en-IN")} learners
              </p>
            )}
          </div>
        </div>
      </Link>
    </article>
  )
}

export default Course_Card
