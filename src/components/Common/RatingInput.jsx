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
              className="cursor-pointer rounded-sm p-1 text-yellow-100 transition-transform hover:scale-110 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-yellow-50 has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-60"
            >
              <input
                className="sr-only"
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
              <Icon aria-hidden="true" size={30} />
            </label>
          )
        })}
      </div>
    </fieldset>
  )
}
