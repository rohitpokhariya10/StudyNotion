import { useCallback, useEffect, useRef, useState } from "react"
import { AiOutlineUnorderedList } from "react-icons/ai"
import { useDispatch, useSelector } from "react-redux"
import {
  Outlet,
  useLocation,
  useNavigate,
  useParams,
} from "react-router-dom"

import CourseReviewModal from "../components/core/ViewCourse/CourseReviewModal"
import VideoDetailsSidebar from "../components/core/ViewCourse/VideoDetailsSidebar"
import { getFullDetailsOfCourse } from "../services/operations/courseDetailsAPI"
import {
  setCompletedLectures,
  setCourseSectionData,
  setEntireCourseData,
  setTotalNoOfLectures,
} from "../slices/viewCourseSlice"

export default function ViewCourse() {
  const { courseId } = useParams()
  const { token } = useSelector((state) => state.auth)
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const location = useLocation()
  const [reviewModal, setReviewModal] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadFailed, setLoadFailed] = useState(false)
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

  useEffect(() => {
    let active = true

    ;(async () => {
      setLoading(true)
      setLoadFailed(false)

      const courseData = await getFullDetailsOfCourse(courseId, token)
      if (!active) return

      const courseDetails = courseData?.courseDetails
      const sections = courseDetails?.courseContent
      if (!courseDetails || !Array.isArray(sections)) {
        setLoadFailed(true)
        setLoading(false)
        return
      }

      dispatch(setCourseSectionData(sections))
      dispatch(setEntireCourseData(courseDetails))
      dispatch(
        setCompletedLectures(
          Array.isArray(courseData.completedVideos)
            ? courseData.completedVideos
            : []
        )
      )
      dispatch(
        setTotalNoOfLectures(
          sections.reduce(
            (total, section) => total + (section?.subSection?.length || 0),
            0
          )
        )
      )
      setLoading(false)
    })()

    return () => {
      active = false
    }
  }, [courseId, dispatch, token])

  if (loading) {
    return (
      <div className="grid min-h-[calc(100vh-3.5rem)] place-items-center">
        <div className="spinner" role="status" aria-label="Loading course" />
      </div>
    )
  }

  if (loadFailed) {
    return (
      <div className="grid min-h-[calc(100vh-3.5rem)] place-items-center px-4 text-center text-richblack-5">
        <div>
          <p className="text-xl font-semibold">This course could not be loaded.</p>
          <button
            type="button"
            className="yellowButton mt-4"
            onClick={() => navigate("/dashboard/enrolled-courses", { replace: true })}
          >
            Back to enrolled courses
          </button>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="relative flex min-h-[calc(100vh-3.5rem)]">
        <VideoDetailsSidebar
          setReviewModal={setReviewModal}
          mobileOpen={sidebarOpen}
          onClose={closeSidebar}
        />
        <main className="h-[calc(100vh-3.5rem)] min-w-0 flex-1 overflow-auto">
          <div className="mx-4 py-4 sm:mx-6">
            <button
              ref={sidebarButtonRef}
              type="button"
              className="mb-4 flex items-center gap-2 rounded-md border border-richblack-600 bg-richblack-800 px-3 py-2 text-sm font-medium text-richblack-50 md:hidden"
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
            <Outlet />
          </div>
        </main>
      </div>
      {reviewModal && <CourseReviewModal setReviewModal={setReviewModal} />}
    </>
  )
}
