import { TiStarFullOutline, TiStarOutline } from "react-icons/ti"

const RATINGS = [1, 2, 3, 4, 5]

export default function RatingInput({ value, onChange, disabled = false }) {
  const selectedRating = Number(value) || 0

  return (
    <fieldset disabled={disabled}>
      <legend className="sr-only">Course rating</legend>
      <div className="flex gap-1">
        {RATINGS.map((rating) => {
          const selected = rating <= selectedRating
          const Icon = selected ? TiStarFullOutline : TiStarOutline

          return (
            <label
              key={rating}
              className="relative cursor-pointer rounded-xs p-2 text-brand-primary transition-transform hover:scale-110 has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-60 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand-primary"
            >
              <input
                className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                type="radio"
                name="course-rating"
                value={rating}
                checked={rating === selectedRating}
                disabled={disabled}
                aria-label={`${rating} out of 5 stars`}
                onChange={() => {
                  if (!disabled) onChange(rating)
                }}
              />
              <Icon
                aria-hidden="true"
                size={30}
                className="pointer-events-none"
              />
            </label>
          )
        })}
      </div>
    </fieldset>
  )
}
