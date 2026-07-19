import {
  TiStarFullOutline,
  TiStarHalfOutline,
  TiStarOutline,
} from "react-icons/ti"

function RatingStars({ Review_Count, Star_Size }) {
  const rating = Math.min(5, Math.max(0, Number(Review_Count) || 0))
  const wholeStars = Math.floor(rating)
  const hasHalfStar = rating > wholeStars
  const starCount = {
    full: wholeStars,
    half: hasHalfStar ? 1 : 0,
    empty: 5 - wholeStars - (hasHalfStar ? 1 : 0),
  }

  return (
    <div
      className="flex gap-1 text-yellow-100"
      role="img"
      aria-label={`${rating.toFixed(1)} out of 5 stars`}
    >
      {[...new Array(starCount.full)].map((_, i) => {
        return <TiStarFullOutline key={i} size={Star_Size || 20} />
      })}
      {[...new Array(starCount.half)].map((_, i) => {
        return <TiStarHalfOutline key={i} size={Star_Size || 20} />
      })}
      {[...new Array(starCount.empty)].map((_, i) => {
        return <TiStarOutline key={i} size={Star_Size || 20} />
      })}
    </div>
  )
}

export default RatingStars
