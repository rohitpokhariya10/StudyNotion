import { removeFromCart } from "@/entities/cart"
import {
  getAverageRating as GetAvgRating,
  RatingStars,
} from "@/entities/review"
import CourseImage from "@/shared/ui/CourseImage"
import { RiDeleteBin6Line } from "react-icons/ri"
import { useDispatch, useSelector } from "react-redux"

export default function RenderCartCourses() {
  const { cart } = useSelector((state) => state.cart)
  const dispatch = useDispatch()
  return (
    <div className="sn-card flex w-full min-w-0 flex-1 flex-col">
      {cart.map((course, indx) => {
        const averageRating = GetAvgRating(course?.ratingAndReviews || [])

        return (
          <div
            key={course._id}
            className={`flex w-full flex-wrap items-start justify-between gap-6 ${
              indx !== cart.length - 1 &&
              "border-b border-b-border-default pb-6"
            } ${indx !== 0 && "mt-6"} `}
          >
            <div className="flex flex-1 flex-col gap-4 xl:flex-row">
              <CourseImage
                src={course?.thumbnail}
                alt={course?.courseName}
                className="h-[148px] w-[220px] rounded-lg object-cover"
              />
              <div className="flex flex-col space-y-1">
                <p className="text-lg font-medium text-text-primary">
                  {course?.courseName}
                </p>
                <p className="text-sm text-text-secondary">
                  {course?.category?.name}
                </p>
                <div className="flex items-center gap-2">
                  <span className="text-brand-primary">
                    {averageRating.toFixed(1)}
                  </span>
                  <RatingStars Review_Count={averageRating} Star_Size={20} />
                  <span className="text-text-secondary">
                    {course?.ratingAndReviews?.length} Ratings
                  </span>
                </div>
              </div>
            </div>
            <div className="flex flex-col items-end space-y-2">
              <button
                type="button"
                aria-label={`Remove ${course.courseName} from cart`}
                onClick={() => dispatch(removeFromCart(course._id))}
                className="flex items-center gap-x-1 rounded-md border border-border-default bg-surface-elevated px-[12px] py-3 text-danger"
              >
                <RiDeleteBin6Line aria-hidden="true" />
                <span>Remove</span>
              </button>
              <p className="mb-6 text-3xl font-medium text-brand-primary">
                ₹ {course?.price}
              </p>
            </div>
          </div>
        )
      })}
    </div>
  )
}
