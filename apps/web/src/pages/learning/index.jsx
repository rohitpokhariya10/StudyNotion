import {
  getLearningErrorPresentation,
  useGetLearningCourseQuery,
} from "@/entities/learning"
import { CourseReviewModal } from "@/features/course-review"
import VideoDetailsSidebar from "@/widgets/curriculum-panel"
import { useCallback, useEffect, useRef, useState } from "react"
import { AiOutlineUnorderedList } from "react-icons/ai"
import { Outlet, useLocation, useNavigate, useParams } from "react-router"

export default function ViewCourse() {
  const { courseId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const {
    data: learningCourse,
    error,
    isError,
    isLoading,
    isFetching,
    refetch,
  } = useGetLearningCourseQuery(courseId, { skip: !courseId })
  const [reviewModal, setReviewModal] = useState(false)
  const [sidebarLocationKey, setSidebarLocationKey] = useState(null)
  const sidebarButtonRef = useRef(null)
  const previousLocationKeyRef = useRef(location.key)
  const sidebarOpen = sidebarLocationKey === location.key
  const closeSidebar = useCallback(() => setSidebarLocationKey(null), [])

  useEffect(() => {
    if (previousLocationKeyRef.current === location.key) return undefined
    previousLocationKeyRef.current = location.key
    const timeoutId = window.setTimeout(closeSidebar, 0)
    return () => window.clearTimeout(timeoutId)
  }, [closeSidebar, location.key])

  useEffect(() => {
    if (!sidebarOpen) return undefined
    const handleEscape = (event) => {
      if (event.key !== "Escape") return
      closeSidebar()
      sidebarButtonRef.current?.focus()
    }
    document.addEventListener("keydown", handleEscape)
    return () => document.removeEventListener("keydown", handleEscape)
  }, [closeSidebar, sidebarOpen])

  if (isLoading) {
    return (
      <main
        className="grid min-h-[calc(100vh-3.5rem)] place-items-center bg-richblack-900 px-6 text-center text-richblack-5"
        aria-busy="true"
      >
        <div role="status" aria-label="Loading course learning state">
          <h1 className="sr-only">Loading course</h1>
          <div className="spinner mx-auto" aria-hidden="true" />
          <p className="mt-4 text-sm text-richblack-200">
            Preparing your course…
          </p>
        </div>
      </main>
    )
  }

  if (isError || !learningCourse) {
    const presentation = getLearningErrorPresentation(error)
    const accessDenied = error?.status === 403

    return (
      <main className="grid min-h-[calc(100vh-3.5rem)] place-items-center bg-richblack-900 px-6 text-center text-richblack-5">
        <div className="max-w-lg" role="alert">
          <p className="text-sm font-semibold tracking-wide text-yellow-50 uppercase">
            {accessDenied ? "Course access" : "Learning unavailable"}
          </p>
          <h1 className="mt-2 text-2xl font-semibold">
            {accessDenied
              ? "This course is not available to this account."
              : "This course could not be loaded."}
          </h1>
          <p className="mt-3 text-richblack-200">{presentation.message}</p>
          {presentation.requestId && (
            <p className="mt-2 text-xs text-richblack-200">
              Reference: {presentation.requestId}
            </p>
          )}
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            {!accessDenied && (
              <button type="button" className="yellowButton" onClick={refetch}>
                Try again
              </button>
            )}
            <button
              type="button"
              className="blackButton border border-richblack-600"
              onClick={() =>
                navigate("/dashboard/enrolled-courses", { replace: true })
              }
            >
              Back to enrolled courses
            </button>
          </div>
        </div>
      </main>
    )
  }

  const hasLessons = learningCourse.progress.totalLessons > 0

  return (
    <>
      <div className="relative flex min-h-[calc(100vh-3.5rem)] bg-richblack-900">
        <VideoDetailsSidebar
          learningCourse={learningCourse}
          setReviewModal={setReviewModal}
          mobileOpen={sidebarOpen}
          onClose={closeSidebar}
        />
        <main
          className="h-[calc(100vh-3.5rem)] min-w-0 flex-1 overflow-auto"
          aria-busy={isFetching}
        >
          <div className="mx-auto max-w-6xl px-4 py-5 sm:px-6 lg:px-10 lg:py-8">
            <button
              ref={sidebarButtonRef}
              type="button"
              className="mb-5 flex min-h-11 items-center gap-2 rounded-md border border-richblack-600 bg-richblack-800 px-4 py-2 text-sm font-medium text-richblack-50 md:hidden"
              onClick={() =>
                sidebarOpen
                  ? closeSidebar()
                  : setSidebarLocationKey(location.key)
              }
              aria-controls="course-mobile-navigation"
              aria-expanded={sidebarOpen}
            >
              <AiOutlineUnorderedList className="text-xl" aria-hidden="true" />
              Course content
            </button>

            {hasLessons ? (
              <Outlet context={{ learningCourse }} />
            ) : (
              <section className="grid min-h-[60vh] place-items-center text-center text-richblack-5">
                <div className="max-w-md">
                  <p className="text-sm font-semibold tracking-wide text-yellow-50 uppercase">
                    Course content
                  </p>
                  <h1 className="mt-2 text-2xl font-semibold">
                    Lessons are being prepared.
                  </h1>
                  <p className="mt-3 text-richblack-200">
                    This enrolled course does not have any available lessons
                    yet. Your progress will remain at 0% until content is added.
                  </p>
                </div>
              </section>
            )}
          </div>
        </main>
      </div>
      {reviewModal && (
        <CourseReviewModal
          courseId={learningCourse.course.id}
          setReviewModal={setReviewModal}
        />
      )}
    </>
  )
}
