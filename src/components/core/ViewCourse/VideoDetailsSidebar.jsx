import { useState } from "react"
import { BsChevronDown } from "react-icons/bs"
import { IoIosArrowBack } from "react-icons/io"
import { useSelector } from "react-redux"
import { useNavigate, useParams } from "react-router-dom"

import IconBtn from "../../Common/IconBtn"

export default function VideoDetailsSidebar({
  mobileOpen = false,
  onClose,
  setReviewModal,
}) {
  const [expandedSectionId, setExpandedSectionId] = useState(undefined)
  const navigate = useNavigate()
  const { sectionId, subSectionId } = useParams()
  const {
    courseSectionData,
    courseEntireData,
    totalNoOfLectures,
    completedLectures,
  } = useSelector((state) => state.viewCourse)

  const activeStatus =
    expandedSectionId === undefined ? sectionId : expandedSectionId

  const renderContent = (instance) => (
    <>
      <div className="mx-5 flex flex-col items-start justify-between gap-y-4 border-b border-richblack-600 py-5 text-lg font-bold text-richblack-25">
        <div className="flex w-full items-center justify-between">
          <button
            type="button"
            onClick={() => {
              onClose?.()
              navigate("/dashboard/enrolled-courses")
            }}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-richblack-100 p-1 text-richblack-700 transition-transform hover:scale-95"
            aria-label="Back to enrolled courses"
          >
            <IoIosArrowBack size={30} aria-hidden="true" />
          </button>
          <IconBtn
            text="Add Review"
            customClasses="ml-auto"
            onclick={() => {
              onClose?.()
              setReviewModal(true)
            }}
          />
        </div>
        <div className="flex min-w-0 flex-col">
          <p className="break-words">{courseEntireData?.courseName}</p>
          <p className="text-sm font-semibold text-richblack-400">
            {completedLectures?.length || 0} / {totalNoOfLectures || 0} lessons
          </p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto" aria-label="Course lessons">
        {courseSectionData.map((section) => {
          const expanded = activeStatus === section?._id
          const contentId = `${instance}-section-${section._id}`

          return (
            <section className="mt-2 text-sm text-richblack-5" key={section._id}>
              <button
                type="button"
                className="flex w-full flex-row justify-between bg-richblack-600 px-5 py-4 text-left"
                onClick={() =>
                  setExpandedSectionId((current) =>
                    (current === undefined ? sectionId : current) === section._id
                      ? ""
                      : section._id
                  )
                }
                aria-controls={contentId}
                aria-expanded={expanded}
              >
                <span className="w-[80%] font-semibold">
                  {section.sectionName}
                </span>
                <BsChevronDown
                  className={`transition-transform ${
                    expanded ? "rotate-0" : "-rotate-90"
                  }`}
                  aria-hidden="true"
                />
              </button>

              {expanded && (
                <div id={contentId}>
                  {section.subSection?.map((topic) => {
                    const completed = completedLectures?.includes(topic._id)
                    const active = subSectionId === topic._id

                    return (
                      <button
                        type="button"
                        className={`flex w-full items-center gap-3 px-5 py-3 text-left ${
                          active
                            ? "bg-yellow-200 font-semibold text-richblack-800"
                            : "hover:bg-richblack-900"
                        }`}
                        key={topic._id}
                        onClick={() => {
                          setExpandedSectionId(undefined)
                          onClose?.()
                          navigate(
                            `/view-course/${courseEntireData?._id}/section/${section._id}/sub-section/${topic._id}`
                          )
                        }}
                        aria-current={active ? "page" : undefined}
                      >
                        <span
                          className={`grid h-4 w-4 shrink-0 place-items-center rounded-sm border text-[10px] ${
                            completed
                              ? "border-caribbeangreen-300 bg-caribbeangreen-300 text-richblack-900"
                              : "border-richblack-300"
                          }`}
                          aria-hidden="true"
                        >
                          {completed ? "✓" : ""}
                        </span>
                        <span>{topic.title}</span>
                      </button>
                    )
                  })}
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
            className="fixed inset-x-0 bottom-0 top-14 z-30 bg-richblack-900/70 md:hidden"
            onClick={onClose}
            aria-label="Close course content"
          />
          <aside
            id="course-mobile-navigation"
            className="fixed bottom-0 left-0 top-14 z-40 flex w-[min(88vw,350px)] flex-col border-r border-richblack-700 bg-richblack-800 shadow-2xl md:hidden"
          >
            {renderContent("mobile")}
          </aside>
        </>
      )}

      <aside className="hidden h-[calc(100vh-3.5rem)] w-[320px] max-w-[350px] shrink-0 flex-col border-r border-richblack-700 bg-richblack-800 md:flex">
        {renderContent("desktop")}
      </aside>
    </>
  )
}
