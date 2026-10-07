import copy from "copy-to-clipboard"
import { toast } from "react-hot-toast"
import {
  FiBookOpen,
  FiCheck,
  FiClock,
  FiLayers,
  FiShare2,
  FiUsers,
} from "react-icons/fi"

// Sticky summary of real course facts plus the instructor-provided
// "includes" list and a share action.
export default function CourseGlance({ course, lectureCount, totalDuration }) {
  const facts = [
    [
      FiLayers,
      `${course.courseContent.length} section${course.courseContent.length === 1 ? "" : "s"}`,
    ],
    [FiBookOpen, `${lectureCount} lecture${lectureCount === 1 ? "" : "s"}`],
    totalDuration ? [FiClock, `${totalDuration} total length`] : null,
    [
      FiUsers,
      `${course.totalStudentsEnrolled ?? 0} learner${course.totalStudentsEnrolled === 1 ? "" : "s"} enrolled`,
    ],
  ].filter(Boolean)
  return (
    <div className="sn-card rounded-2xl p-6 lg:sticky lg:top-6">
      <h2 className="text-lg font-semibold">Course at a glance</h2>
      <ul className="mt-4 space-y-3 text-[0.9375rem]">
        {facts.map(([Icon, label]) => (
          <li key={label} className="flex items-center gap-3">
            <span className="grid h-9 w-9 flex-none place-items-center rounded-lg bg-brand-soft text-brand-primary">
              <Icon aria-hidden="true" />
            </span>
            {label}
          </li>
        ))}
      </ul>
      {course.instructions?.length > 0 && (
        <>
          <h3 className="mt-6 border-t border-border-default pt-5 text-base font-semibold">
            Requirements and instructions
          </h3>
          <ul className="mt-3 space-y-2 text-sm text-text-secondary">
            {course.instructions.map((item) => (
              <li key={item} className="flex gap-2">
                <FiCheck
                  aria-hidden="true"
                  className="mt-0.5 flex-none text-brand-primary"
                />
                {item}
              </li>
            ))}
          </ul>
        </>
      )}
      <button
        type="button"
        className="sn-btn sn-btn-ghost mt-5 w-full"
        onClick={() => {
          copy(window.location.href)
          toast.success("Link copied to clipboard")
        }}
      >
        <FiShare2 aria-hidden="true" /> Share this course
      </button>
    </div>
  )
}
