import { useId } from "react"
import { AiOutlineDown } from "react-icons/ai"

import CourseSubSectionAccordion from "./CourseSubSectionAccordion"

export default function CourseAccordionBar({ course, isActive, handleActive }) {
  const active = Boolean(isActive?.includes(course?._id))
  const accordionId = useId()
  const triggerId = `${accordionId}-trigger`
  const contentId = `${accordionId}-content`

  return (
    <div className="overflow-hidden border border-solid border-richblack-600 bg-richblack-700 text-richblack-5 last:mb-0">
      <button
        id={triggerId}
        type="button"
        aria-controls={contentId}
        aria-expanded={active}
        className="flex w-full cursor-pointer items-start justify-between bg-opacity-20 px-7 py-6 text-left transition-[0.3s]"
        onClick={() => handleActive(course?._id)}
      >
        <span className="flex items-center gap-2">
          <span
            className={active ? "rotate-180" : "rotate-0"}
            aria-hidden="true"
          >
            <AiOutlineDown />
          </span>
          <span>{course?.sectionName}</span>
        </span>
        <span className="space-x-4 text-yellow-25">
          {`${course?.subSection?.length || 0} lecture(s)`}
        </span>
      </button>
      <div
        id={contentId}
        role="region"
        aria-labelledby={triggerId}
        aria-hidden={!active}
        className={`relative grid bg-richblack-900 transition-[grid-template-rows] duration-300 ease-in-out ${
          active ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        }`}
      >
        <div className="min-h-0 overflow-hidden">
          <div className="text-textHead flex flex-col gap-2 px-7 py-6 font-semibold">
            {course?.subSection?.map((subSec) => (
              <CourseSubSectionAccordion subSec={subSec} key={subSec._id} />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
