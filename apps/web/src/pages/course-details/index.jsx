import { addToCart } from "@/entities/cart"
import { formatCatalogLanguage } from "@/entities/catalog"
import { CourseAccordionBar, fetchCourseDetails } from "@/entities/course"
import {
  getAverageRating as GetAvgRating,
  RatingStars,
} from "@/entities/review"
import {
  ACCOUNT_TYPE,
  getAvatarSource,
  setInitialsAvatarOnError,
} from "@/entities/user"
import { BuyCourse, fetchCheckoutConfig } from "@/features/course-purchase"
import Error from "@/pages/not-found"
import { formatDate } from "@/shared/lib/formatDate"
import ConfirmationModal from "@/shared/ui/ConfirmationModal"
import PageLoadingFallback from "@/shared/ui/PageLoadingFallback"
import SafeMarkdown from "@/shared/ui/SafeMarkdown"
import Footer from "@/widgets/footer"
import { ReviewCards } from "@/widgets/review-slider"
import { useEffect, useState } from "react"
import { toast } from "react-hot-toast"
import { FiCalendar, FiGlobe, FiStar, FiUsers } from "react-icons/fi"
import { useDispatch, useSelector } from "react-redux"
import { Link, useNavigate, useParams } from "react-router"

import CourseGlance from "./ui/CourseGlance"
import PurchaseCard from "./ui/PurchaseCard"

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
      <div
        className="sn-hero min-h-[calc(100dvh-var(--sn-header-height))]"
        role="status"
        aria-label="Loading course"
      >
        <div className="sn-container grid gap-10 lg:grid-cols-[minmax(0,1fr)_24rem]">
          <div className="space-y-5" aria-hidden="true">
            <div className="h-4 w-40 animate-pulse rounded bg-white" />
            <div className="h-12 w-3/4 animate-pulse rounded-lg bg-white" />
            <div className="h-5 w-full animate-pulse rounded bg-white" />
            <div className="h-5 w-2/3 animate-pulse rounded bg-white" />
          </div>
          <div
            aria-hidden="true"
            className="h-96 animate-pulse rounded-2xl bg-white"
          />
        </div>
      </div>
    )
  }
  if (!response.success || !courseDetails) {
    return <Error />
  }

  const {
    courseName,
    courseDescription,
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
      <PageLoadingFallback
        label="Processing checkout"
        accessibleLabel="Processing checkout"
      />
    )
  }

  const instructorName = [instructor?.firstName, instructor?.lastName]
    .filter(Boolean)
    .join(" ")
  const reviewCount = ratingAndReviews?.length || 0
  const metadata = [
    reviewCount > 0
      ? {
          icon: FiStar,
          label: (
            <span className="flex items-center gap-2">
              <span className="font-semibold text-brand-primary">
                {avgReviewCount}
              </span>
              <RatingStars Review_Count={avgReviewCount} Star_Size={16} />
              <span>
                ({reviewCount} review{reviewCount === 1 ? "" : "s"})
              </span>
            </span>
          ),
        }
      : { icon: FiStar, label: "Not yet rated" },
    {
      icon: FiUsers,
      label: `${totalStudentsEnrolled ?? 0} student${totalStudentsEnrolled === 1 ? "" : "s"} enrolled`,
    },
    { icon: FiCalendar, label: `Created ${formatDate(createdAt)}` },
    ...(courseDetails.language
      ? [
          {
            icon: FiGlobe,
            label: formatCatalogLanguage(courseDetails.language),
          },
        ]
      : []),
  ]

  return (
    <>
      <main>
        <section className="sn-hero" aria-labelledby="course-title">
          <div className="sn-container grid items-start gap-10 lg:grid-cols-[minmax(0,1fr)_24rem] lg:gap-14">
            <div className="max-w-2xl lg:pt-4">
              <nav aria-label="Breadcrumb">
                <ol className="flex flex-wrap items-center gap-2 text-sm text-text-secondary">
                  <li>
                    <Link
                      to="/"
                      className="inline-flex min-h-11 items-center hover:text-brand-primary"
                    >
                      Home
                    </Link>
                  </li>
                  <li aria-hidden="true">/</li>
                  <li>Course</li>
                </ol>
              </nav>
              <h1 id="course-title" className="sn-display mt-3">
                {courseName}
              </h1>
              <p className="sn-lead mt-5 text-[1.0625rem]">
                {courseDescription}
              </p>
              <ul className="mt-7 flex flex-wrap gap-3 text-sm">
                {metadata.map(({ icon: Icon, label }, index) => (
                  <li
                    key={index}
                    className="inline-flex min-h-10 items-center gap-2 rounded-full border border-border-default bg-white px-4"
                  >
                    <Icon aria-hidden="true" className="text-brand-primary" />
                    {label}
                  </li>
                ))}
              </ul>
              {instructorName && (
                <div className="mt-8 flex items-center gap-3">
                  <img
                    src={getAvatarSource(instructor)}
                    alt=""
                    onError={(event) =>
                      setInitialsAvatarOnError(event, instructor)
                    }
                    className="h-12 w-12 rounded-full object-cover ring-4 ring-white"
                  />
                  <p className="text-[0.9375rem]">
                    <span className="block text-text-secondary">
                      Created by
                    </span>
                    <span className="font-semibold">{instructorName}</span>
                  </p>
                </div>
              )}
            </div>
            <PurchaseCard
              course={courseDetails}
              isEnrolled={isEnrolled}
              handleBuyCourse={handleBuyCourse}
              handleAddToCart={handleAddToCart}
              onGoToCourse={() => navigate("/dashboard/enrolled-courses")}
              checkoutPolicyAccepted={checkoutPolicyAccepted}
              policyConfig={policyConfig}
              policyError={policyError}
              policyLoading={policyLoading}
              reloadPolicyConfig={reloadPolicyConfig}
              setCheckoutPolicyAccepted={setCheckoutPolicyAccepted}
            />
          </div>
        </section>

        <div className="sn-container grid items-start gap-10 py-14 lg:grid-cols-[minmax(0,1fr)_24rem] lg:gap-14 lg:py-20">
          <div className="min-w-0 space-y-14">
            <section
              aria-labelledby="learn-title"
              className="sn-card sn-card-tint rounded-2xl p-7 sm:p-9"
            >
              <h2 id="learn-title" className="sn-subheading">
                What you'll learn
              </h2>
              <div className="sn-prose mt-5 text-text-primary">
                <SafeMarkdown>{whatYouWillLearn}</SafeMarkdown>
              </div>
            </section>

            <section aria-labelledby="curriculum-title">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <h2 id="curriculum-title" className="sn-subheading">
                    Course Content
                  </h2>
                  <p className="mt-2 text-sm text-text-secondary">
                    {courseContent.length} section
                    {courseContent.length === 1 ? "" : "s"} ·{" "}
                    {totalNoOfLectures} lecture
                    {totalNoOfLectures === 1 ? "" : "s"}
                    {response.data?.totalDuration
                      ? ` · ${response.data.totalDuration} total length`
                      : ""}
                  </p>
                </div>
                <button
                  type="button"
                  className="sn-btn sn-btn-ghost"
                  onClick={() => setIsActive([])}
                >
                  Collapse all sections
                </button>
              </div>
              <div className="mt-6 overflow-hidden rounded-2xl border border-border-default">
                {courseContent?.map((course, index) => (
                  <CourseAccordionBar
                    course={course}
                    key={index}
                    isActive={isActive}
                    handleActive={handleActive}
                  />
                ))}
              </div>
            </section>

            <section aria-labelledby="course-reviews-title">
              <h2 id="course-reviews-title" className="sn-subheading">
                Learner reviews
              </h2>
              {ratingAndReviews?.length ? (
                <ReviewCards reviews={ratingAndReviews} />
              ) : (
                <p className="sn-card mt-5 text-text-secondary">
                  No learner reviews have been shared for this course yet.
                </p>
              )}
            </section>
            <section
              aria-labelledby="author-title"
              className="sn-card rounded-2xl p-7 sm:p-9"
            >
              <h2 id="author-title" className="sn-subheading">
                Author
              </h2>
              <div className="mt-6 flex items-center gap-4">
                <img
                  src={getAvatarSource(instructor)}
                  alt=""
                  onError={(event) =>
                    setInitialsAvatarOnError(event, instructor)
                  }
                  className="h-16 w-16 rounded-full object-cover"
                />
                <div>
                  <p className="text-lg font-semibold">{instructorName}</p>
                  <p className="text-sm text-text-secondary">
                    Course instructor
                  </p>
                </div>
              </div>
              {instructor?.additionalDetails?.about && (
                <p className="mt-5 leading-relaxed text-text-secondary">
                  {instructor.additionalDetails.about}
                </p>
              )}
            </section>
          </div>
          <CourseGlance
            course={courseDetails}
            lectureCount={totalNoOfLectures}
            totalDuration={response.data?.totalDuration}
          />
        </div>
      </main>
      <Footer />
      {confirmationModal && <ConfirmationModal modalData={confirmationModal} />}
    </>
  )
}

export default CourseDetails
