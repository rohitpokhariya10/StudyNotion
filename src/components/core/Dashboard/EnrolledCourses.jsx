import { useEffect, useState } from "react"
import ProgressBar from "@ramonak/react-progress-bar"
import { useSelector } from "react-redux"
import { useNavigate } from "react-router-dom"

import { getUserEnrolledCourses } from "../../../services/operations/profileAPI"
import { getFirstLessonPath } from "../../../utils/courseNavigation"

export default function EnrolledCourses() {
  const { token } = useSelector((state) => state.auth)
  const navigate = useNavigate()

  const [enrolledCourses, setEnrolledCourses] = useState(null)

  useEffect(() => {
    let active = true

    ;(async () => {
      try {
        const res = await getUserEnrolledCourses(token)

        // Enrolment is an entitlement. Keep purchased courses visible even if
        // the instructor later archives or drafts the catalog listing.
        if (active) setEnrolledCourses(Array.isArray(res) ? res : [])
      } catch {
        if (active) setEnrolledCourses([])
      }
    })()

    return () => {
      active = false
    }
  }, [token])

  return (
    <>
      <div className="text-3xl text-richblack-50">Enrolled Courses</div>
      {!enrolledCourses ? (
        <div className="grid min-h-[calc(100vh-3.5rem)] place-items-center">
          <div className="spinner"></div>
        </div>
      ) : !enrolledCourses.length ? (
        <p className="grid h-[10vh] w-full place-content-center text-richblack-5">
          You have not enrolled in any course yet.
        </p>
      ) : (
        <div className="my-8 text-richblack-5">
          {/* Headings */}
          <div className="flex rounded-t-lg bg-richblack-500 ">
            <p className="w-[45%] px-5 py-3">Course Name</p>
            <p className="w-1/4 px-2 py-3">Duration</p>
            <p className="flex-1 px-2 py-3">Progress</p>
          </div>
          {/* Course Names */}
          {enrolledCourses.map((course, i, arr) => {
            const lessonPath = getFirstLessonPath(course)
            const description = String(course.courseDescription || "")

            return (
              <div
                className={`flex items-center border border-richblack-700 ${
                  i === arr.length - 1 ? "rounded-b-lg" : "rounded-none"
                }`}
                key={course._id || i}
              >
                <button
                  type="button"
                  className="flex w-[45%] items-center gap-4 px-5 py-3 text-left enabled:cursor-pointer disabled:cursor-not-allowed disabled:opacity-70"
                  disabled={!lessonPath}
                  onClick={() => lessonPath && navigate(lessonPath)}
                  aria-label={
                    lessonPath
                      ? `Continue ${course.courseName}`
                      : `${course.courseName} content coming soon`
                  }
                >
                  <img
                    src={course.thumbnail}
                    alt=""
                    className="h-14 w-14 rounded-lg object-cover"
                  />
                  <span className="flex max-w-xs flex-col gap-2">
                    <span className="font-semibold">{course.courseName}</span>
                    {course.status && course.status !== "Published" && (
                      <span className="w-fit rounded-full bg-richblack-700 px-2 py-1 text-xs text-richblack-200">
                        {course.status}
                      </span>
                    )}
                    {description && (
                      <span className="text-xs text-richblack-300">
                        {description.length > 50
                          ? `${description.slice(0, 50)}...`
                          : description}
                      </span>
                    )}
                    {!lessonPath && (
                      <span className="w-fit rounded-full bg-richblack-700 px-2 py-1 text-xs font-medium text-yellow-50">
                        Content coming soon
                      </span>
                    )}
                  </span>
                </button>
                <div className="w-1/4 px-2 py-3">
                  {course?.totalDuration || "—"}
                </div>
                <div className="flex w-1/5 flex-col gap-2 px-2 py-3">
                  <p>Progress: {course.progressPercentage || 0}%</p>
                  <ProgressBar
                    completed={course.progressPercentage || 0}
                    height="8px"
                    isLabelVisible={false}
                  />
                </div>
              </div>
            )
          })}
        </div>
      )}
    </>
  )
}
