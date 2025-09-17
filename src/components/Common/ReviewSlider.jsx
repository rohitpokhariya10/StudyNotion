import React, { useEffect, useState } from "react"
import ReactStars from "react-rating-stars-component"
// Swiper
import { Swiper, SwiperSlide } from "swiper/react"
import "swiper/css"
import "swiper/css/free-mode"
import "swiper/css/pagination"
import "../../App.css"
// Icons
import { FaStar } from "react-icons/fa"
// Swiper modules
import { Autoplay, FreeMode, Pagination } from "swiper"
// API
import { apiConnector } from "../../services/apiConnector"
import { ratingsEndpoints } from "../../services/apis"

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
      } catch (err) {
        console.error("Failed to fetch reviews:", err)
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
      <div className="my-12 max-w-[1200px] mx-auto px-4">
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
              <div className="flex items-center justify-center h-40 bg-richblack-800 rounded-md p-4 text-richblack-400">
                No reviews yet
              </div>
            </SwiperSlide>
          ) : (
            reviews.map((review, i) => {
              const user = review?.user || {}
              const course = review?.course || {}
              const name = `${user.firstName || ""} ${user.lastName || ""}`.trim() || "Anonymous"
              const imgSrc =
                user.image ||
                `https://api.dicebear.com/5.x/initials/svg?seed=${encodeURIComponent(
                  (user.firstName || "A") + " " + (user.lastName || "")
                )}`

              return (
                <SwiperSlide key={review?._id || i}>
                  <div className="flex h-full flex-col gap-3 bg-richblack-800 p-4 rounded-xl text-[14px] text-richblack-25 shadow-sm hover:shadow-md transition-shadow duration-200">
                    <div className="flex items-center gap-4">
                      <img
                        src={imgSrc}
                        alt={name}
                        onError={(e) => {
                          // fallback to initials avatar if image fails
                          e.currentTarget.onerror = null
                          e.currentTarget.src = `https://api.dicebear.com/5.x/initials/svg?seed=${encodeURIComponent(
                            name || "User"
                          )}`
                        }}
                        className="h-10 w-10 flex-shrink-0 rounded-full object-cover"
                      />
                      <div className="flex flex-col">
                        <h3 className="font-semibold text-richblack-5 text-sm">{name}</h3>
                        <span className="text-[12px] font-medium text-richblack-500">
                          {course.courseName || "Course"}
                        </span>
                      </div>
                    </div>

                    <p className="font-medium text-richblack-25 text-sm">
                      {safeTruncate(review?.review, truncateWords)}
                    </p>

                    <div className="mt-auto flex items-center gap-2">
                      <h4 className="font-semibold text-yellow-100">
                        {typeof review?.rating === "number" ? review.rating.toFixed(1) : "0.0"}
                      </h4>

                      <ReactStars
                        count={5}
                        value={Number(review?.rating) || 0}
                        size={20}
                        edit={false}
                        activeColor="#ffd700"
                        emptyIcon={<FaStar />}
                        fullIcon={<FaStar />}
                        isHalf={true}
                        aria-label={`Rating: ${review?.rating || 0} out of 5`}
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
