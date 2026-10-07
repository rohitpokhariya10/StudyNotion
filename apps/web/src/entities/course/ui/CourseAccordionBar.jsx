import CourseSubSectionAccordion from "@/entities/course/ui/CourseSubSectionAccordion"
import { useId } from "react"
import { AiOutlineDown } from "react-icons/ai"

export default function CourseAccordionBar({ course, isActive, handleActive }) {
  const active = Boolean(isActive?.includes(course?._id))
  const accordionId = useId()
  const triggerId = `${accordionId}-trigger`
  const contentId = `${accordionId}-content`

  return (
    <div className="border-b border-border-default bg-white text-text-primary last:border-b-0">
      <button
        id={triggerId}
        type="button"
        aria-controls={contentId}
        aria-expanded={active}
        className="flex min-h-14 w-full cursor-pointer items-center justify-between gap-4 px-6 py-5 text-left font-medium transition-colors hover:bg-brand-soft"
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
        <span className="flex-none text-sm text-brand-primary">
          {`${course?.subSection?.length || 0} lecture(s)`}
        </span>
      </button>
      <div
        id={contentId}
        role="region"
        aria-labelledby={triggerId}
        aria-hidden={!active}
        className={`relative grid bg-brand-soft/60 transition-[grid-template-rows] duration-300 ease-in-out ${
          active ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        }`}
      >
        <div className="min-h-0 overflow-hidden">
          <div className="flex flex-col gap-2 px-6 py-5 text-[0.9375rem]">
            {course?.subSection?.map((subSec) => (
              <CourseSubSectionAccordion subSec={subSec} key={subSec._id} />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
