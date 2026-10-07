import { getFirstLessonPath } from "@/entities/learning"
import { getUserEnrolledCourses } from "@/entities/user"
import CourseImage from "@/shared/ui/CourseImage"
import ProductCollage from "@/shared/ui/ProductCollage"
import { useEffect, useState } from "react"
import { FiBookOpen, FiCheckCircle, FiPlayCircle } from "react-icons/fi"
import { useSelector } from "react-redux"
import { Link, useNavigate } from "react-router"

const progressOf = (course) =>
  Math.max(0, Math.min(100, Number(course?.progressPercentage) || 0))

function SummaryTile({ icon: Icon, label, value }) {
  return (
    <div className="flex flex-col items-start gap-3 rounded-2xl border border-border-default bg-white p-4 sm:flex-row sm:items-center sm:gap-4 sm:p-5">
      <span className="grid h-11 w-11 flex-none place-items-center rounded-xl bg-brand-soft text-xl text-brand-primary">
        <Icon aria-hidden="true" />
      </span>
      <div>
        <p className="text-2xl font-semibold">{value}</p>
        <p className="text-sm text-text-secondary">{label}</p>
      </div>
    </div>
  )
}

export default function EnrolledCourses() {
  const { token } = useSelector((state) => state.auth)
  const { user } = useSelector((state) => state.profile)
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

  const courses = enrolledCourses || []
  const completed = courses.filter((course) => progressOf(course) >= 100)
  const inProgress = courses.filter((course) => {
    const progress = progressOf(course)
    return progress > 0 && progress < 100
  })
  const featuredId = (inProgress[0] || courses[0])?._id

  return (
    <>
      <header className="mb-8">
        <p className="sn-eyebrow">
          {user?.firstName ? `Hello, ${user.firstName}` : "Your learning"}
        </p>
        <h1 className="sn-heading">Enrolled Courses</h1>
        <p className="sn-lead mt-3">
          Your learning, all together. Pick a course and keep your momentum
          going.
        </p>
      </header>

      {!enrolledCourses ? (
        <div
          className="space-y-4"
          role="status"
          aria-label="Loading your courses"
        >
          <div className="grid gap-4 sm:grid-cols-3" aria-hidden="true">
            {[0, 1, 2].map((index) => (
              <div
                key={index}
                className="h-24 animate-pulse rounded-2xl bg-white"
              />
            ))}
          </div>
          <div
            className="h-72 animate-pulse rounded-2xl bg-white"
            aria-hidden="true"
          />
          <span className="sr-only">Preparing your learning space…</span>
        </div>
      ) : !courses.length ? (
        <div className="rounded-2xl border border-border-default bg-white p-8 text-center sm:p-12">
          <ProductCollage variant="empty" className="mx-auto max-w-xs" />
          <h2 className="sn-subheading mt-2">
            You have not enrolled in any course yet.
          </h2>
          <p className="sn-lead mx-auto mt-3">
            Browse the catalog, preview a curriculum, and start learning today.
          </p>
          <Link to="/services" className="sn-btn sn-btn-primary sn-btn-lg mt-7">
            Explore Courses
          </Link>
        </div>
      ) : (
        <>
          <section
            aria-label="Learning summary"
            className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4"
          >
            <SummaryTile
              icon={FiBookOpen}
              value={courses.length}
              label="Enrolled"
            />
            <SummaryTile
              icon={FiPlayCircle}
              value={inProgress.length}
              label="In progress"
            />
            <SummaryTile
              icon={FiCheckCircle}
              value={completed.length}
              label="Completed"
            />
          </section>

          <section aria-labelledby="enrolled-list-title" className="mt-10">
            <h2 id="enrolled-list-title" className="sn-subheading mb-5">
              Continue learning
            </h2>
            <div className="grid gap-6 lg:grid-cols-2">
              {courses.map((course, i) => {
                const lessonPath = getFirstLessonPath(course)
                const description = String(course.courseDescription || "")
                const progress = progressOf(course)
                const featured = course._id === featuredId && courses.length > 1
                return (
                  <article
                    key={course._id || i}
                    className={`flex flex-col overflow-hidden rounded-2xl border border-border-default bg-white transition-shadow hover:shadow-education ${
                      featured ? "lg:col-span-2 lg:flex-row" : ""
                    }`}
                  >
                    <CourseImage
                      src={course.thumbnail}
                      alt=""
                      className={`aspect-[16/9] w-full object-cover ${
                        featured ? "lg:aspect-auto lg:w-[44%]" : ""
                      }`}
                    />
                    <div className="flex flex-1 flex-col p-6 sm:p-7">
                      <div className="flex flex-wrap items-center gap-2">
                        {featured && (
                          <span className="rounded-full bg-brand-soft px-3 py-1 text-xs font-medium text-brand-primary">
                            Pick up where you left off
                          </span>
                        )}
                        {course.status && course.status !== "Published" && (
                          <span className="sn-pill w-fit">{course.status}</span>
                        )}
                      </div>
                      <h3 className="mt-3 text-lg font-semibold">
                        {course.courseName}
                      </h3>
                      {description && (
                        <p className="mt-2 line-clamp-2 text-sm leading-6 text-text-secondary">
                          {description}
                        </p>
                      )}
                      <div className="mt-auto pt-6">
                        <div className="mb-2 flex flex-wrap justify-between gap-2 text-sm text-text-secondary">
                          <span>{course?.totalDuration || "—"}</span>
                          <span className="font-medium text-text-primary">
                            Progress: {course.progressPercentage || 0}%
                          </span>
                        </div>
                        <progress
                          value={course.progressPercentage || 0}
                          max="100"
                          aria-label={`${course.courseName} progress`}
                          className="sn-progress w-full"
                        />
                        <button
                          type="button"
                          disabled={!lessonPath}
                          onClick={() => lessonPath && navigate(lessonPath)}
                          aria-label={
                            lessonPath
                              ? `Continue ${course.courseName}`
                              : `${course.courseName} content coming soon`
                          }
                          className="sn-btn sn-btn-primary mt-5 w-full sm:w-auto"
                        >
                          {lessonPath
                            ? progress >= 100
                              ? "Revisit course →"
                              : "Continue learning →"
                            : "Content coming soon"}
                        </button>
                      </div>
                    </div>
                  </article>
                )
              })}
            </div>
          </section>
        </>
      )}
    </>
  )
}
