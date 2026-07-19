import copy from "copy-to-clipboard"
import { toast } from "react-hot-toast"
import { BsFillCaretRightFill } from "react-icons/bs"
import { FaShareSquare } from "react-icons/fa"
import { useSelector } from "react-redux"
import { useNavigate } from "react-router-dom"

import CheckoutPolicyAcknowledgement from "../../Common/CheckoutPolicyAcknowledgement"

function CourseDetailsCard({
  checkoutPolicyAccepted,
  course,
  isEnrolled,
  handleBuyCourse,
  handleAddToCart,
  policyConfig,
  policyError,
  policyLoading,
  reloadPolicyConfig,
  setCheckoutPolicyAccepted,
}) {
  const { user } = useSelector((state) => state.profile)
  const navigate = useNavigate()

  const { thumbnail: ThumbnailImage, price: CurrentPrice } = course

  const handleShare = () => {
    copy(window.location.href)
    toast.success("Link copied to clipboard")
  }
  return (
    <>
      <div
        className={`flex flex-col gap-4 rounded-md bg-richblack-700 p-4 text-richblack-5`}
      >
        {/* Course Image */}
        <img
          src={ThumbnailImage}
          alt={course?.courseName}
          className="max-h-[300px] min-h-[180px] w-[400px] overflow-hidden rounded-2xl object-cover md:max-w-full"
        />

        <div className="px-4">
          <div className="space-x-3 pb-4 text-3xl font-semibold">
            Rs. {CurrentPrice}
          </div>
          <div className="flex flex-col gap-4">
            {(!user || !isEnrolled) && (
              <CheckoutPolicyAcknowledgement
                checked={checkoutPolicyAccepted}
                disabled={policyLoading}
                id="desktop-checkout-policy"
                onChange={setCheckoutPolicyAccepted}
                policyConfig={policyConfig}
              />
            )}
            {policyLoading && !isEnrolled && (
              <p className="text-xs text-richblack-300" role="status">
                Loading current checkout policies…
              </p>
            )}
            {policyError && !isEnrolled && (
              <div className="text-xs text-pink-100" role="alert">
                <p>{policyError}</p>
                <button
                  type="button"
                  className="mt-1 font-medium text-yellow-100 underline"
                  onClick={reloadPolicyConfig}
                >
                  Try again
                </button>
              </div>
            )}
            <button
              className="yellowButton"
              disabled={
                !isEnrolled &&
                (!checkoutPolicyAccepted || !policyConfig || policyLoading)
              }
              onClick={
                user && isEnrolled
                  ? () => navigate("/dashboard/enrolled-courses")
                  : handleBuyCourse
              }
            >
              {user && isEnrolled ? "Go To Course" : "Buy Now"}
            </button>
            {(!user || !isEnrolled) && (
              <button onClick={handleAddToCart} className="blackButton">
                Add to Cart
              </button>
            )}
          </div>
          <div>
            <p className="pb-3 pt-6 text-center text-sm text-richblack-25">
              Secure checkout &bull; Access after verified payment
            </p>
          </div>

          <div className={``}>
            <p className={`my-2 text-xl font-semibold`}>
              This Course Includes :
            </p>
            <div className="flex flex-col gap-3 text-sm text-caribbeangreen-100">
              {course?.instructions?.map((item, i) => {
                return (
                  <p className={`flex gap-2`} key={i}>
                    <BsFillCaretRightFill />
                    <span>{item}</span>
                  </p>
                )
              })}
            </div>
          </div>
          <div className="text-center">
            <button
              className="mx-auto flex items-center gap-2 py-6 text-yellow-100"
              onClick={handleShare}
            >
              <FaShareSquare size={15} /> Share
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

export default CourseDetailsCard
