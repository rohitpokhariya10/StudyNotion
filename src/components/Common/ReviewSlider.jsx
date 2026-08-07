import { useEffect, useState } from "react"
// Swiper
import { Swiper, SwiperSlide } from "swiper/react"

import "swiper/css"
import "swiper/css/free-mode"
import "swiper/css/pagination"
import "../../App.css"

// Swiper modules
import { Autoplay, FreeMode, Pagination } from "swiper/modules"

// API
import { apiConnector } from "../../services/apiConnector"
import { ratingsEndpoints } from "../../services/apis"
import { getAvatarSource, setInitialsAvatarOnError } from "../../utils/avatar"
import RatingStars from "./RatingStars"

function ReviewSlider() {
  const [reviews, setReviews] = useState([])
  const truncateWords = 15

  useEffect(() => {
    ;(async () => {
      try {
        const { data } = await apiConnector(
          "GET",
          ratingsEndpoints.REVIEWS_DETAILS_API
        )
        if (data?.success && Array.isArray(data?.data)) {
          setReviews(data.data)
        } else {
          setReviews([])
        }
      } catch {
        setReviews([])
      }
    })()
  }, [])

  const safeTruncate = (text = "", words = truncateWords) => {
    const toks = String(text).split(/\s+/).filter(Boolean)
    if (toks.length <= words) return toks.join(" ")
    return toks.slice(0, words).join(" ") + " ..."
  }

  return (
    <div className="text-white">
      {/* Outer spacing */}
      <div className="mx-auto my-12 max-w-[1200px] px-4">
        <Swiper
          slidesPerView={4}
          spaceBetween={20}
          loop={reviews.length > 4}
          freeMode={true}
          autoplay={{
            delay: 2500,
            disableOnInteraction: false,
          }}
          modules={[FreeMode, Pagination, Autoplay]}
          pagination={{ clickable: true }}
          // Responsive breakpoints
          breakpoints={{
            320: { slidesPerView: 1, spaceBetween: 12 },
            640: { slidesPerView: 2, spaceBetween: 16 },
            1024: { slidesPerView: 3, spaceBetween: 20 },
            1280: { slidesPerView: 4, spaceBetween: 24 },
          }}
          className="w-full"
        >
          {reviews.length === 0 ? (
            <SwiperSlide>
              <div className="flex h-40 items-center justify-center rounded-md bg-richblack-800 p-4 text-richblack-400">
                No reviews yet
              </div>
            </SwiperSlide>
          ) : (
            reviews.map((review, i) => {
              const user = review?.user || {}
              const course = review?.course || {}
              const name =
                `${user.firstName || ""} ${user.lastName || ""}`.trim() ||
                "Anonymous"
              const imgSrc = getAvatarSource(user)

              return (
                <SwiperSlide key={review?._id || i}>
                  <div className="flex h-full flex-col gap-3 rounded-xl bg-richblack-800 p-4 text-[14px] text-richblack-25 shadow-xs transition-shadow duration-200 hover:shadow-md">
                    <div className="flex items-center gap-4">
                      <img
                        src={imgSrc}
                        alt={name}
                        onError={(event) =>
                          setInitialsAvatarOnError(event, user)
                        }
                        className="h-10 w-10 shrink-0 rounded-full object-cover"
                      />
                      <div className="flex flex-col">
                        <h3 className="text-sm font-semibold text-richblack-5">
                          {name}
                        </h3>
                        <span className="text-[12px] font-medium text-richblack-500">
                          {course.courseName || "Course"}
                        </span>
                      </div>
                    </div>

                    <p className="text-sm font-medium text-richblack-25">
                      {safeTruncate(review?.review, truncateWords)}
                    </p>

                    <div className="mt-auto flex items-center gap-2">
                      <h4 className="font-semibold text-yellow-100">
                        {typeof review?.rating === "number"
                          ? review.rating.toFixed(1)
                          : "0.0"}
                      </h4>

                      <RatingStars
                        Review_Count={Number(review?.rating) || 0}
                        Star_Size={20}
                      />
                    </div>
                  </div>
                </SwiperSlide>
              )
            })
          )}
        </Swiper>
      </div>
    </div>
  )
}

export default ReviewSlider
