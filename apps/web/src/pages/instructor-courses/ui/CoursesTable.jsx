import {
  COURSE_STATUS,
  deleteCourse,
  fetchInstructorCourses,
} from "@/entities/course"
import { formatDate } from "@/shared/lib/formatDate"
import AccessibleDialog from "@/shared/ui/AccessibleDialog"
import CourseImage from "@/shared/ui/CourseImage"
import { useState } from "react"
import { FaCheck } from "react-icons/fa"
import { FiEdit2 } from "react-icons/fi"
import { HiClock } from "react-icons/hi"
import { RiArchiveLine, RiDeleteBin6Line } from "react-icons/ri"
import { useSelector } from "react-redux"
import { useNavigate } from "react-router"

const TRUNCATE_LENGTH = 30

function CourseDeletionDialog({
  confirmationName,
  course,
  loading,
  onCancel,
  onChange,
  onConfirm,
}) {
  if (!course) return null

  const confirmed = confirmationName === course.courseName

  return (
    <AccessibleDialog
      title="Archive or delete course"
      description="Courses with learners or payment history are archived so existing learners keep access. Unsold courses are permanently deleted."
      onClose={onCancel}
      closeOnEscape={!loading}
      closeOnBackdrop={!loading}
      className="w-full max-w-md rounded-xl border border-border-default bg-white p-6"
      overlayClassName="bg-black/40"
      titleClassName="text-2xl font-semibold text-text-primary"
      descriptionClassName="mt-3 mb-5 leading-6 text-text-secondary"
    >
      <label
        htmlFor="confirmationCourseName"
        className="mb-2 block text-sm text-text-secondary"
      >
        Type <strong className="text-text-primary">{course.courseName}</strong>{" "}
        to confirm
      </label>
      <input
        id="confirmationCourseName"
        type="text"
        value={confirmationName}
        onChange={(event) => onChange(event.target.value)}
        className="form-style w-full"
        autoComplete="off"
        disabled={loading}
      />
      <div className="mt-6 flex flex-wrap gap-3">
        <button
          type="button"
          disabled={!confirmed || loading}
          onClick={onConfirm}
          className="sn-btn bg-danger text-white"
        >
          {loading ? "Processing..." : "Confirm"}
        </button>
        <button
          type="button"
          disabled={loading}
          onClick={onCancel}
          className="sn-btn sn-btn-secondary"
        >
          Cancel
        </button>
      </div>
    </AccessibleDialog>
  )
}

export default function CoursesTable({ courses, setCourses }) {
  const navigate = useNavigate()
  const { token } = useSelector((state) => state.auth)
  const [loading, setLoading] = useState(false)
  const [courseToDelete, setCourseToDelete] = useState(null)
  const [confirmationName, setConfirmationName] = useState("")

  const closeDeletionDialog = () => {
    setCourseToDelete(null)
    setConfirmationName("")
  }

  const handleCourseDelete = async () => {
    if (!courseToDelete || confirmationName !== courseToDelete.courseName)
      return

    setLoading(true)
    const result = await deleteCourse(
      {
        courseId: courseToDelete._id,
        confirmationCourseName: confirmationName,
      },
      token
    )
    if (result) {
      const refreshedCourses = await fetchInstructorCourses(token)
      if (refreshedCourses) setCourses(refreshedCourses)
      closeDeletionDialog()
    }
    setLoading(false)
  }

  return (
    <>
      <div className="grid gap-5">
        {courses?.length === 0 ? (
          <p className="sn-card text-center text-text-secondary">
            No courses found
          </p>
        ) : (
          courses?.map((course) => {
            const description = String(course.courseDescription || "")
            const isArchived = course.status === "Archived"
            return (
              <article
                key={course._id}
                className="sn-card grid gap-5 p-5 lg:grid-cols-[180px_1fr]"
              >
                <CourseImage
                  src={course.thumbnail}
                  alt=""
                  className="aspect-video w-full rounded-xl object-cover"
                />
                <div className="min-w-0">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <h2 className="text-xl font-bold">{course.courseName}</h2>
                    <span className="sn-pill text-xs">
                      {course.status === COURSE_STATUS.DRAFT ? (
                        <>
                          <HiClock aria-hidden="true" /> Draft
                        </>
                      ) : isArchived ? (
                        <>
                          <RiArchiveLine aria-hidden="true" /> Archived
                        </>
                      ) : (
                        <>
                          <FaCheck aria-hidden="true" /> Published
                        </>
                      )}
                    </span>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-text-secondary">
                    {description.split(" ").length > TRUNCATE_LENGTH
                      ? `${description.split(" ").slice(0, TRUNCATE_LENGTH).join(" ")}...`
                      : description}
                  </p>
                  <p className="mt-3 text-xs text-text-secondary">
                    Created: {formatDate(course.createdAt)}
                  </p>
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-4 border-t border-border-default pt-4">
                    <div className="flex gap-5 text-sm">
                      <span>{course.totalDuration || "—"}</span>
                      <strong>₹{course.price}</strong>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={loading || isArchived}
                        onClick={() =>
                          navigate(`/dashboard/edit-course/${course._id}`)
                        }
                        title={
                          isArchived
                            ? "Archived courses cannot be edited"
                            : "Edit"
                        }
                        aria-label={`Edit ${course.courseName}`}
                        className="sn-btn sn-btn-secondary min-h-11 px-4 text-sm"
                      >
                        <FiEdit2 aria-hidden="true" /> Edit
                      </button>
                      <button
                        type="button"
                        disabled={loading || isArchived}
                        onClick={() => {
                          setCourseToDelete(course)
                          setConfirmationName("")
                        }}
                        title={
                          isArchived
                            ? "This course is retained for existing learners"
                            : "Archive or delete"
                        }
                        aria-label={`Archive or delete ${course.courseName}`}
                        className="sn-btn sn-btn-outline min-h-11 px-4 text-danger"
                      >
                        <RiDeleteBin6Line aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            )
          })
        )}
      </div>

      <CourseDeletionDialog
        course={courseToDelete}
        confirmationName={confirmationName}
        loading={loading}
        onChange={setConfirmationName}
        onCancel={closeDeletionDialog}
        onConfirm={handleCourseDelete}
      />
    </>
  )
}
