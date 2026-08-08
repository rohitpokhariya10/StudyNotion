import { useEffect, useRef, useState } from "react"
import { BsChevronDown } from "react-icons/bs"
import { IoIosArrowBack } from "react-icons/io"
import { Link, useParams } from "react-router"

import IconBtn from "../../Common/IconBtn"

const lessonPath = (courseId, sectionId, lessonId) =>
  `/view-course/${encodeURIComponent(
    courseId
  )}/section/${encodeURIComponent(sectionId)}/sub-section/${encodeURIComponent(
    lessonId
  )}`

export default function VideoDetailsSidebar({
  learningCourse,
  mobileOpen = false,
  onClose,
  setReviewModal,
}) {
  const [expandedSectionId, setExpandedSectionId] = useState(undefined)
  const { sectionId, subSectionId } = useParams()
  const mobileDrawerRef = useRef(null)
  const mobileBackRef = useRef(null)
  const { course, curriculum, progress } = learningCourse
  const completedLessonIds = new Set(progress.completedLessonIds)
  const activeSectionId =
    expandedSectionId === undefined ? sectionId : expandedSectionId

  useEffect(() => {
    if (!mobileOpen) return undefined
    const timeoutId = window.setTimeout(() => mobileBackRef.current?.focus(), 0)
    return () => window.clearTimeout(timeoutId)
  }, [mobileOpen])

  const trapMobileFocus = (event) => {
    if (event.key !== "Tab") return
    const focusable = mobileDrawerRef.current?.querySelectorAll(
      'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
    )
    if (!focusable?.length) return
    const first = focusable[0]
    const last = focusable[focusable.length - 1]
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault()
      first.focus()
    }
  }

  const renderContent = (instance, { mobile = false } = {}) => (
    <>
      <div className="border-b border-richblack-700 px-5 py-5">
        <div className="flex items-center justify-between gap-3">
          <Link
            ref={mobile ? mobileBackRef : undefined}
            to="/dashboard/enrolled-courses"
            onClick={onClose}
            className="grid min-h-11 min-w-11 place-items-center rounded-md border border-richblack-600 text-richblack-100 hover:border-richblack-400 hover:text-richblack-5"
            aria-label="Back to enrolled courses"
          >
            <IoIosArrowBack size={24} aria-hidden="true" />
          </Link>
          <IconBtn
            text="Add review"
            customClasses="ml-auto min-h-11"
            onclick={() => {
              onClose?.()
              setReviewModal(true)
            }}
          />
        </div>

        <h2 className="mt-5 text-lg font-semibold break-words text-richblack-5">
          {course.name}
        </h2>
        <div className="mt-4" aria-label="Course progress">
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="font-medium text-richblack-50">
              {progress.completedCount} of {progress.totalLessons} lessons
              completed
            </span>
            <span className="shrink-0 text-richblack-200">
              {progress.progressPercent}%
            </span>
          </div>
          <progress
            className="mt-2 h-2 w-full accent-caribbeangreen-200"
            max={progress.totalLessons || 1}
            value={progress.completedCount}
            aria-label={`${progress.progressPercent}% complete`}
          />
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto pb-5" aria-label="Course lessons">
        {curriculum.map((section) => {
          const expanded = activeSectionId === section.id
          const contentId = `${instance}-section-${section.id}`

          return (
            <section className="border-b border-richblack-700" key={section.id}>
              <h3>
                <button
                  type="button"
                  className="flex min-h-12 w-full items-center justify-between gap-3 bg-richblack-800 px-5 py-3 text-left text-sm text-richblack-5 hover:bg-richblack-700"
                  onClick={() =>
                    setExpandedSectionId((current) =>
                      (current === undefined ? sectionId : current) ===
                      section.id
                        ? ""
                        : section.id
                    )
                  }
                  aria-controls={contentId}
                  aria-expanded={expanded}
                >
                  <span className="font-semibold">{section.name}</span>
                  <span className="flex shrink-0 items-center gap-2 text-xs text-richblack-300">
                    {section.lessons.length}
                    <span className="sr-only">lessons</span>
                    <BsChevronDown
                      className={`transition-transform ${
                        expanded ? "rotate-0" : "-rotate-90"
                      }`}
                      aria-hidden="true"
                    />
                  </span>
                </button>
              </h3>

              {expanded && (
                <div id={contentId}>
                  {section.lessons.length ? (
                    section.lessons.map((lesson) => {
                      const completed = completedLessonIds.has(lesson.id)
                      const active = subSectionId === lesson.id

                      return (
                        <Link
                          className={`flex min-h-12 items-center gap-3 border-l-2 px-5 py-3 text-left text-sm ${
                            active
                              ? "border-yellow-50 bg-richblack-700 text-richblack-5"
                              : "border-transparent text-richblack-100 hover:bg-richblack-800 hover:text-richblack-5"
                          }`}
                          key={lesson.id}
                          to={lessonPath(course.id, section.id, lesson.id)}
                          onClick={() => {
                            setExpandedSectionId(undefined)
                            onClose?.()
                          }}
                          aria-current={active ? "page" : undefined}
                        >
                          <span
                            className={`grid h-5 w-5 shrink-0 place-items-center rounded-full border text-xs ${
                              completed
                                ? "border-caribbeangreen-200 bg-caribbeangreen-200 text-richblack-900"
                                : "border-richblack-400 text-richblack-300"
                            }`}
                            aria-hidden="true"
                          >
                            {completed ? "✓" : ""}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block break-words">
                              {lesson.title}
                            </span>
                            <span
                              className={`mt-0.5 block text-xs ${
                                completed
                                  ? "text-caribbeangreen-100"
                                  : "text-richblack-400"
                              }`}
                            >
                              {completed ? "Completed" : "Not completed"}
                            </span>
                          </span>
                        </Link>
                      )
                    })
                  ) : (
                    <p className="px-5 py-4 text-sm text-richblack-400">
                      No lessons in this section.
                    </p>
                  )}
                </div>
              )}
            </section>
          )
        })}
      </nav>
    </>
  )

  return (
    <>
      {mobileOpen && (
        <>
          <button
            type="button"
            className="fixed inset-x-0 top-14 bottom-0 z-30 bg-richblack-900/80 md:hidden"
            onClick={onClose}
            aria-label="Close course content"
          />
          <aside
            ref={mobileDrawerRef}
            id="course-mobile-navigation"
            className="fixed top-14 bottom-0 left-0 z-40 flex w-[min(90vw,360px)] flex-col border-r border-richblack-700 bg-richblack-900 shadow-2xl md:hidden"
            role="dialog"
            aria-modal="true"
            aria-label="Course content"
            onKeyDown={trapMobileFocus}
          >
            {renderContent("mobile", { mobile: true })}
          </aside>
        </>
      )}

      <aside
        className="hidden h-[calc(100vh-3.5rem)] w-[340px] max-w-[360px] shrink-0 flex-col border-r border-richblack-700 bg-richblack-900 md:flex"
        aria-label="Course content"
      >
        {renderContent("desktop")}
      </aside>
    </>
  )
}
