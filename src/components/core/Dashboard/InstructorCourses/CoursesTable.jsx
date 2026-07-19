import { useEffect, useState } from "react"
import { FaCheck } from "react-icons/fa"
import { FiEdit2 } from "react-icons/fi"
import { HiClock } from "react-icons/hi"
import { RiArchiveLine, RiDeleteBin6Line } from "react-icons/ri"
import { useSelector } from "react-redux"
import { useNavigate } from "react-router-dom"
import { Table, Tbody, Td, Th, Thead, Tr } from "react-super-responsive-table"

import "react-super-responsive-table/dist/SuperResponsiveTableStyle.css"
import { formatDate } from "../../../../services/formatDate"
import {
  deleteCourse,
  fetchInstructorCourses,
} from "../../../../services/operations/courseDetailsAPI"
import { COURSE_STATUS } from "../../../../utils/constants"

const TRUNCATE_LENGTH = 30

function CourseDeletionDialog({
  confirmationName,
  course,
  loading,
  onCancel,
  onChange,
  onConfirm,
}) {
  useEffect(() => {
    if (!course || loading) return undefined
    const handleEscape = (event) => {
      if (event.key === "Escape") onCancel()
    }
    document.addEventListener("keydown", handleEscape)
    return () => document.removeEventListener("keydown", handleEscape)
  }, [course, loading, onCancel])

  if (!course) return null

  const confirmed = confirmationName === course.courseName

  return (
    <div
      className="fixed inset-0 z-[1000] grid place-items-center overflow-y-auto bg-richblack-900/80 p-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !loading) onCancel()
      }}
    >
      <div
        className="w-full max-w-md rounded-lg border border-richblack-500 bg-richblack-800 p-6"
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-course-title"
        aria-describedby="delete-course-description"
      >
        <h2
          id="delete-course-title"
          className="text-2xl font-semibold text-richblack-5"
        >
          Archive or delete course
        </h2>
        <p
          id="delete-course-description"
          className="mb-5 mt-3 leading-6 text-richblack-200"
        >
          Courses with learners or payment history are archived so existing
          learners keep access. Unsold courses are permanently deleted.
        </p>
        <label
          htmlFor="confirmationCourseName"
          className="mb-2 block text-sm text-richblack-100"
        >
          Type <strong className="text-richblack-5">{course.courseName}</strong>{" "}
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
          autoFocus
        />
        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            disabled={!confirmed || loading}
            onClick={onConfirm}
            className="rounded-md bg-pink-600 px-5 py-2 font-semibold text-richblack-5 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Processing..." : "Confirm"}
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={onCancel}
            className="rounded-md bg-richblack-200 px-5 py-2 font-semibold text-richblack-900 disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
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
    if (!courseToDelete || confirmationName !== courseToDelete.courseName) return

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
      <Table className="rounded-xl border border-richblack-800">
        <Thead>
          <Tr className="flex gap-x-10 rounded-t-md border-b border-b-richblack-800 px-6 py-2">
            <Th className="flex-1 text-left text-sm font-medium uppercase text-richblack-100">
              Courses
            </Th>
            <Th className="text-left text-sm font-medium uppercase text-richblack-100">
              Duration
            </Th>
            <Th className="text-left text-sm font-medium uppercase text-richblack-100">
              Price
            </Th>
            <Th className="text-left text-sm font-medium uppercase text-richblack-100">
              Actions
            </Th>
          </Tr>
        </Thead>
        <Tbody>
          {courses?.length === 0 ? (
            <Tr>
              <Td className="py-10 text-center text-2xl font-medium text-richblack-100">
                No courses found
              </Td>
            </Tr>
          ) : (
            courses?.map((course) => {
              const description = String(course.courseDescription || "")
              const isArchived = course.status === "Archived"

              return (
                <Tr
                  key={course._id}
                  className="flex gap-x-10 border-b border-richblack-800 px-6 py-8"
                >
                  <Td className="flex flex-1 gap-x-4">
                    <img
                      src={course.thumbnail}
                      alt=""
                      className="h-[148px] w-[220px] rounded-lg object-cover"
                    />
                    <div className="flex flex-col justify-between">
                      <p className="text-lg font-semibold text-richblack-5">
                        {course.courseName}
                      </p>
                      <p className="text-xs text-richblack-300">
                        {description.split(" ").length > TRUNCATE_LENGTH
                          ? `${description
                              .split(" ")
                              .slice(0, TRUNCATE_LENGTH)
                              .join(" ")}...`
                          : description}
                      </p>
                      <p className="text-xs text-white">
                        Created: {formatDate(course.createdAt)}
                      </p>
                      {course.status === COURSE_STATUS.DRAFT ? (
                        <p className="flex w-fit items-center gap-2 rounded-full bg-richblack-700 px-2 py-0.5 text-xs font-medium text-pink-100">
                          <HiClock size={14} /> Draft
                        </p>
                      ) : isArchived ? (
                        <p className="flex w-fit items-center gap-2 rounded-full bg-richblack-700 px-2 py-0.5 text-xs font-medium text-richblack-200">
                          <RiArchiveLine size={14} /> Archived
                        </p>
                      ) : (
                        <p className="flex w-fit items-center gap-2 rounded-full bg-richblack-700 px-2 py-0.5 text-xs font-medium text-yellow-100">
                          <span className="flex h-3 w-3 items-center justify-center rounded-full bg-yellow-100 text-richblack-700">
                            <FaCheck size={8} />
                          </span>
                          Published
                        </p>
                      )}
                    </div>
                  </Td>
                  <Td className="text-sm font-medium text-richblack-100">
                    {course.totalDuration || "—"}
                  </Td>
                  <Td className="text-sm font-medium text-richblack-100">
                    ₹{course.price}
                  </Td>
                  <Td className="text-sm font-medium text-richblack-100">
                    <button
                      type="button"
                      disabled={loading || isArchived}
                      onClick={() =>
                        navigate(`/dashboard/edit-course/${course._id}`)
                      }
                      title={
                        isArchived ? "Archived courses cannot be edited" : "Edit"
                      }
                      aria-label={`Edit ${course.courseName}`}
                      className="px-2 transition-all duration-200 enabled:hover:scale-110 enabled:hover:text-caribbeangreen-300 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <FiEdit2 size={20} />
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
                      className="px-1 transition-all duration-200 enabled:hover:scale-110 enabled:hover:text-pink-200 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <RiDeleteBin6Line size={20} />
                    </button>
                  </Td>
                </Tr>
              )
            })
          )}
        </Tbody>
      </Table>

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
