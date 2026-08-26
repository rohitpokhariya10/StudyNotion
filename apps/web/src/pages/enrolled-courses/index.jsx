import { getFirstLessonPath } from "@/entities/learning"
import { getUserEnrolledCourses } from "@/entities/user"
import ProgressBar from "@ramonak/react-progress-bar"
import { useEffect, useState } from "react"
import { useSelector } from "react-redux"
import { useNavigate } from "react-router"

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
      <h1 className="text-3xl text-richblack-50">Enrolled Courses</h1>
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
          <div className="hidden rounded-t-lg bg-richblack-500 sm:flex">
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
                className={`flex flex-col border border-richblack-700 sm:flex-row sm:items-center ${
                  i === arr.length - 1 ? "rounded-b-lg" : "rounded-none"
                }`}
                key={course._id || i}
              >
                <button
                  type="button"
                  className="flex w-full items-center gap-4 px-5 py-4 text-left enabled:cursor-pointer disabled:cursor-not-allowed disabled:opacity-70 sm:w-[45%] sm:py-3"
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
                <div className="grid w-full grid-cols-2 gap-5 border-t border-richblack-700 px-5 py-4 sm:contents">
                  <div className="w-auto sm:w-1/4 sm:px-2 sm:py-3">
                    <span className="mb-1 block text-xs tracking-wide text-richblack-300 uppercase sm:hidden">
                      Duration
                    </span>
                    {course?.totalDuration || "—"}
                  </div>
                  <div className="flex w-auto flex-col gap-2 sm:w-1/5 sm:px-2 sm:py-3">
                    <p>Progress: {course.progressPercentage || 0}%</p>
                    <ProgressBar
                      completed={course.progressPercentage || 0}
                      height="8px"
                      isLabelVisible={false}
                    />
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </>
  )
}
