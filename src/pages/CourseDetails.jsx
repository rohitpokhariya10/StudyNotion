import { useEffect, useState } from "react"
import { toast } from "react-hot-toast"
import { BiInfoCircle } from "react-icons/bi"
import { HiOutlineGlobeAlt } from "react-icons/hi"
import { useDispatch, useSelector } from "react-redux"
import { useNavigate, useParams } from "react-router-dom"

import CheckoutPolicyAcknowledgement from "../components/Common/CheckoutPolicyAcknowledgement"
import ConfirmationModal from "../components/Common/ConfirmationModal"
import Footer from "../components/Common/Footer"
import RatingStars from "../components/Common/RatingStars"
import SafeMarkdown from "../components/Common/SafeMarkdown"
import CourseAccordionBar from "../components/core/Course/CourseAccordionBar"
import CourseDetailsCard from "../components/core/Course/CourseDetailsCard"
import { formatDate } from "../services/formatDate"
import { fetchCourseDetails } from "../services/operations/courseDetailsAPI"
import {
  BuyCourse,
  fetchCheckoutConfig,
} from "../services/operations/studentFeaturesAPI"
import { addToCart } from "../slices/cartSlice"
import { getAvatarSource, setInitialsAvatarOnError } from "../utils/avatar"
import GetAvgRating from "../utils/avgRating"
import { ACCOUNT_TYPE } from "../utils/constants"
import Error from "./Error"

function CourseDetails() {
  const { user } = useSelector((state) => state.profile)
  const { token } = useSelector((state) => state.auth)
  const { loading } = useSelector((state) => state.profile)
  const { paymentLoading } = useSelector((state) => state.course)
  const dispatch = useDispatch()
  const navigate = useNavigate()

  // Getting courseId from url parameter
  const { courseId } = useParams()
  // console.log(`course id: ${courseId}`)

  // Declear a state to save the course details
  const [response, setResponse] = useState(null)
  const [confirmationModal, setConfirmationModal] = useState(null)
  const [checkoutPolicyAccepted, setCheckoutPolicyAccepted] = useState(false)
  const [policyConfig, setPolicyConfig] = useState(null)
  const [policyError, setPolicyError] = useState("")
  const [policyLoading, setPolicyLoading] = useState(true)
  const [policyReloadKey, setPolicyReloadKey] = useState(0)
  useEffect(() => {
    let active = true

    // Calling fetchCourseDetails fucntion to fetch the details
    ;(async () => {
      const result = await fetchCourseDetails(courseId)
      if (active) setResponse(result)
    })()

    return () => {
      active = false
    }
  }, [courseId])

  useEffect(() => {
    let active = true

    fetchCheckoutConfig()
      .then((config) => {
        if (active) setPolicyConfig(config)
      })
      .catch((error) => {
        if (!active) return
        setPolicyConfig(null)
        setPolicyError(error.message)
      })
      .finally(() => {
        if (active) setPolicyLoading(false)
      })

    return () => {
      active = false
    }
  }, [policyReloadKey])

  const reloadPolicyConfig = () => {
    setPolicyLoading(true)
    setPolicyError("")
    setPolicyConfig(null)
    setCheckoutPolicyAccepted(false)
    setPolicyReloadKey((current) => current + 1)
  }

  // console.log("response: ", response)

  const courseDetails = response?.data?.courseDetails
  const avgReviewCount = GetAvgRating(courseDetails?.ratingAndReviews || [])
  const totalNoOfLectures = (courseDetails?.courseContent || []).reduce(
    (total, section) => total + (section?.subSection?.length || 0),
    0
  )

  // // Collapse all
  // const [collapse, setCollapse] = useState("")
  const [isActive, setIsActive] = useState(Array(0))
  const handleActive = (id) => {
    // console.log("called", id)
    setIsActive(
      !isActive.includes(id)
        ? isActive.concat([id])
        : isActive.filter((e) => e != id)
    )
  }

  if (loading || !response) {
    return (
      <div className="grid min-h-[calc(100vh-3.5rem)] place-items-center">
        <div className="spinner"></div>
      </div>
    )
  }
  if (!response.success || !courseDetails) {
    return <Error />
  }

  const {
    courseName,
    courseDescription,
    thumbnail,
    price,
    whatYouWillLearn,
    courseContent,
    ratingAndReviews,
    instructor,
    totalStudentsEnrolled,
    createdAt,
  } = courseDetails

  const handleBuyCourse = () => {
    if (user?.accountType === ACCOUNT_TYPE.INSTRUCTOR) {
      toast.error("Instructor accounts cannot purchase courses.")
      return
    }
    if (token) {
      if (!checkoutPolicyAccepted || !policyConfig) {
        toast.error("Review and accept the checkout policies before payment")
        return
      }
      BuyCourse(token, [courseId], user, navigate, dispatch, {
        ...policyConfig,
        acknowledged: checkoutPolicyAccepted,
      })
      return
    }
    setConfirmationModal({
      text1: "You are not logged in!",
      text2: "Please login to Purchase Course.",
      btn1Text: "Login",
      btn2Text: "Cancel",
      btn1Handler: () => navigate("/login"),
      btn2Handler: () => setConfirmationModal(null),
    })
  }

  const handleAddToCart = () => {
    if (user?.accountType === ACCOUNT_TYPE.INSTRUCTOR) {
      toast.error("Instructor accounts cannot purchase courses.")
      return
    }
    if (token) {
      dispatch(addToCart(courseDetails))
      return
    }
    setConfirmationModal({
      text1: "You are not logged in!",
      text2: "Please login to add this course to your cart.",
      btn1Text: "Login",
      btn2Text: "Cancel",
      btn1Handler: () => navigate("/login"),
      btn2Handler: () => setConfirmationModal(null),
    })
  }

  const isEnrolled = Boolean(
    courseId &&
    user?.courses?.some(
      (enrolledCourse) =>
        String(enrolledCourse?._id || enrolledCourse) === String(courseId)
    )
  )

  if (paymentLoading) {
    // console.log("payment loading")
    return (
      <div className="grid min-h-[calc(100vh-3.5rem)] place-items-center">
        <div className="spinner"></div>
      </div>
    )
  }

  return (
    <>
      <div className={`relative w-full bg-richblack-800`}>
        {/* Hero Section */}
        <div className="mx-auto box-content px-4 lg:w-[1260px] 2xl:relative">
          <div className="mx-auto grid min-h-[450px] max-w-maxContentTab justify-items-center py-8 lg:mx-0 lg:justify-items-start lg:py-0 xl:max-w-[810px]">
            <div className="relative block max-h-[30rem] lg:hidden">
              <div className="absolute bottom-0 left-0 h-full w-full shadow-[#161D29_0px_-64px_36px_-28px_inset]"></div>
              <img
                src={thumbnail}
                alt="course thumbnail"
                className="aspect-auto w-full"
              />
            </div>
            <div
              className={`z-30 my-5 flex flex-col justify-center gap-4 py-5 text-lg text-richblack-5`}
            >
              <div>
                <p className="text-4xl font-bold text-richblack-5 sm:text-[42px]">
                  {courseName}
                </p>
              </div>
              <p className={`text-richblack-200`}>{courseDescription}</p>
              <div className="text-md flex flex-wrap items-center gap-2">
                <span className="text-yellow-25">{avgReviewCount}</span>
                <RatingStars Review_Count={avgReviewCount} Star_Size={24} />
                <span>{`(${ratingAndReviews.length} reviews)`}</span>
                <span>{`${totalStudentsEnrolled ?? 0} students enrolled`}</span>
              </div>
              <div>
                <p className="">
                  Created By {`${instructor.firstName} ${instructor.lastName}`}
                </p>
              </div>
              <div className="flex flex-wrap gap-5 text-lg">
                <p className="flex items-center gap-2">
                  {" "}
                  <BiInfoCircle /> Created at {formatDate(createdAt)}
                </p>
                <p className="flex items-center gap-2">
                  {" "}
                  <HiOutlineGlobeAlt /> English
                </p>
              </div>
            </div>
            <div className="flex w-full flex-col gap-4 border-y border-y-richblack-500 py-4 lg:hidden">
              <p className="space-x-3 pb-4 text-3xl font-semibold text-richblack-5">
                Rs. {price}
              </p>
              <button
                className="yellowButton"
                disabled={
                  !isEnrolled &&
                  (!checkoutPolicyAccepted || !policyConfig || policyLoading)
                }
                onClick={
                  isEnrolled
                    ? () => navigate("/dashboard/enrolled-courses")
                    : handleBuyCourse
                }
              >
                {isEnrolled ? "Go To Course" : "Buy Now"}
              </button>
              {!isEnrolled && (
                <>
                  <CheckoutPolicyAcknowledgement
                    checked={checkoutPolicyAccepted}
                    disabled={policyLoading}
                    id="mobile-checkout-policy"
                    onChange={setCheckoutPolicyAccepted}
                    policyConfig={policyConfig}
                  />
                  {policyLoading && (
                    <p className="text-xs text-richblack-300" role="status">
                      Loading current checkout policies…
                    </p>
                  )}
                  {policyError && (
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
                  <button className="blackButton" onClick={handleAddToCart}>
                    Add to Cart
                  </button>
                </>
              )}
            </div>
          </div>
          {/* Courses Card */}
          <div className="right-[1rem] top-[60px] mx-auto hidden min-h-[600px] w-1/3 max-w-[410px] translate-y-24 md:translate-y-0 lg:absolute lg:block">
            <CourseDetailsCard
              course={courseDetails}
              isEnrolled={isEnrolled}
              handleBuyCourse={handleBuyCourse}
              handleAddToCart={handleAddToCart}
              checkoutPolicyAccepted={checkoutPolicyAccepted}
              policyConfig={policyConfig}
              policyError={policyError}
              policyLoading={policyLoading}
              reloadPolicyConfig={reloadPolicyConfig}
              setCheckoutPolicyAccepted={setCheckoutPolicyAccepted}
            />
          </div>
        </div>
      </div>
      <div className="mx-auto box-content px-4 text-start text-richblack-5 lg:w-[1260px]">
        <div className="mx-auto max-w-maxContentTab lg:mx-0 xl:max-w-[810px]">
          {/* What will you learn section */}
          <div className="my-8 border border-richblack-600 p-8">
            <p className="text-3xl font-semibold">What you'll learn</p>
            <div className="mt-5">
              <SafeMarkdown>{whatYouWillLearn}</SafeMarkdown>
            </div>
          </div>

          {/* Course Content Section */}
          <div className="max-w-[830px]">
            <div className="flex flex-col gap-3">
              <p className="text-[28px] font-semibold">Course Content</p>
              <div className="flex flex-wrap justify-between gap-2">
                <div className="flex gap-2">
                  <span>
                    {courseContent.length} {`section(s)`}
                  </span>
                  <span>
                    {totalNoOfLectures} {`lecture(s)`}
                  </span>
                  <span>{response.data?.totalDuration} total length</span>
                </div>
                <div>
                  <button
                    className="text-yellow-25"
                    onClick={() => setIsActive([])}
                  >
                    Collapse all sections
                  </button>
                </div>
              </div>
            </div>

            {/* Course Details Accordion */}
            <div className="py-4">
              {courseContent?.map((course, index) => (
                <CourseAccordionBar
                  course={course}
                  key={index}
                  isActive={isActive}
                  handleActive={handleActive}
                />
              ))}
            </div>

            {/* Author Details */}
            <div className="mb-12 py-4">
              <p className="text-[28px] font-semibold">Author</p>
              <div className="flex items-center gap-4 py-4">
                <img
                  src={getAvatarSource(instructor)}
                  alt="Author"
                  onError={(event) =>
                    setInitialsAvatarOnError(event, instructor)
                  }
                  className="h-14 w-14 rounded-full object-cover"
                />
                <p className="text-lg">{`${instructor.firstName} ${instructor.lastName}`}</p>
              </div>
              <p className="text-richblack-50">
                {instructor?.additionalDetails?.about}
              </p>
            </div>
          </div>
        </div>
      </div>
      <Footer />
      {confirmationModal && <ConfirmationModal modalData={confirmationModal} />}
    </>
  )
}

export default CourseDetails
