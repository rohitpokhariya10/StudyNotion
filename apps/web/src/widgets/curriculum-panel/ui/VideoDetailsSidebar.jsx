import AccessibleDialog from "@/shared/ui/AccessibleDialog"
import IconBtn from "@/shared/ui/IconBtn"
import { useState } from "react"
import { BsChevronDown } from "react-icons/bs"
import { IoIosArrowBack } from "react-icons/io"
import { Link, useParams } from "react-router"

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
  const { course, curriculum, progress } = learningCourse
  const completedLessonIds = new Set(progress.completedLessonIds)
  const activeSectionId =
    expandedSectionId === undefined ? sectionId : expandedSectionId

  const renderContent = (instance) => (
    <>
      <div className="border-b border-border-default px-5 py-5">
        <div className="flex items-center justify-between gap-3">
          <Link
            to="/dashboard/enrolled-courses"
            onClick={onClose}
            className="grid min-h-11 min-w-11 place-items-center rounded-md border border-border-default text-text-secondary hover:border-border-default hover:text-text-primary"
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

        <h2 className="mt-5 text-lg font-semibold break-words text-text-primary">
          {course.name}
        </h2>
        <div className="mt-4" aria-label="Course progress">
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="font-medium text-text-primary">
              {progress.completedCount} of {progress.totalLessons} lessons
              completed
            </span>
            <span className="shrink-0 text-text-secondary">
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
            <section
              className="border-b border-border-default"
              key={section.id}
            >
              <h3>
                <button
                  type="button"
                  className="flex min-h-12 w-full items-center justify-between gap-3 bg-surface-secondary px-5 py-3 text-left text-sm text-text-primary hover:bg-surface-elevated"
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
                  <span className="flex shrink-0 items-center gap-2 text-xs text-text-secondary">
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
                              ? "border-brand-primary bg-brand-soft text-brand-primary"
                              : "border-transparent text-text-secondary hover:bg-surface-secondary hover:text-text-primary"
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
                                ? "border-caribbeangreen-200 bg-caribbeangreen-200 text-text-primary"
                                : "border-border-default text-text-secondary"
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
                                  ? "text-success"
                                  : "text-text-secondary"
                              }`}
                            >
                              {completed ? "Completed" : "Not completed"}
                            </span>
                          </span>
                        </Link>
                      )
                    })
                  ) : (
                    <p className="px-5 py-4 text-sm text-text-secondary">
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
        <AccessibleDialog
          title="Course content"
          titleClassName="sr-only"
          onClose={onClose}
          className="flex h-dvh w-[min(90vw,320px)] flex-col bg-white"
          overlayClassName="bg-black/40 p-0! place-items-start! md:hidden"
        >
          <div
            id="course-mobile-navigation"
            className="flex min-h-0 flex-1 flex-col"
          >
            {renderContent("mobile")}
          </div>
          <button
            type="button"
            className="sn-btn sn-btn-secondary m-4"
            onClick={onClose}
            aria-label="Close course content"
          >
            Close course content
          </button>
        </AccessibleDialog>
      )}

      <aside
        className="hidden h-[calc(100dvh-var(--sn-header-height))] w-[310px] max-w-[320px] shrink-0 flex-col border-r border-border-default bg-surface-primary md:flex"
        aria-label="Course content"
      >
        {renderContent("desktop")}
      </aside>
    </>
  )
}
