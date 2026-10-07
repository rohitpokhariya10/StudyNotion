import { deleteSection, deleteSubSection, setCourse } from "@/entities/course"
import SubSectionModal from "@/features/course-authoring/ui/AddCourse/CourseBuilder/SubSectionModal"
import ConfirmationModal from "@/shared/ui/ConfirmationModal"
import { useState } from "react"
import { AiFillCaretDown } from "react-icons/ai"
import { FaPlus } from "react-icons/fa"
import { FiPlayCircle } from "react-icons/fi"
import { MdEdit } from "react-icons/md"
import { RiDeleteBin6Line } from "react-icons/ri"
import { useDispatch, useSelector } from "react-redux"

export default function NestedView({ handleChangeEditSectionName }) {
  const { course } = useSelector((state) => state.course)
  const dispatch = useDispatch()
  // States to keep track of mode of modal [add, view, edit]
  const [addSubSection, setAddSubsection] = useState(null)
  const [viewSubSection, setViewSubSection] = useState(null)
  const [editSubSection, setEditSubSection] = useState(null)
  // to keep track of confirmation modal
  const [confirmationModal, setConfirmationModal] = useState(null)

  const handleDeleleSection = async (sectionId) => {
    const result = await deleteSection({
      sectionId,
      courseId: course._id,
    })
    if (result) {
      dispatch(setCourse(result))
    }
    setConfirmationModal(null)
  }

  const handleDeleteSubSection = async (subSectionId, sectionId) => {
    const result = await deleteSubSection({ subSectionId, sectionId })
    if (result) {
      // update the structure of course
      const updatedCourseContent = course.courseContent.map((section) =>
        section._id === sectionId ? result : section
      )
      const updatedCourse = { ...course, courseContent: updatedCourseContent }
      dispatch(setCourse(updatedCourse))
    }
    setConfirmationModal(null)
  }

  return (
    <>
      <div
        className="rounded-lg bg-surface-elevated p-3 sm:p-6"
        id="nestedViewContainer"
      >
        {course?.courseContent?.map((section) => (
          // Section Dropdown
          <details key={section._id} open>
            {/* Section Dropdown Content */}
            <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 border-b-2 border-b-border-default py-2 [&::-webkit-details-marker]:hidden">
              <div className="flex min-w-0 items-center gap-2">
                <p className="font-semibold [overflow-wrap:anywhere] text-text-primary">
                  {section.sectionName}
                </p>
              </div>
              <AiFillCaretDown
                className="shrink-0 text-xl text-text-secondary"
                aria-hidden="true"
              />
            </summary>
            <div className="flex items-center justify-end gap-2 py-2">
              <button
                type="button"
                className="grid h-11 w-11 shrink-0 place-items-center rounded-md hover:bg-brand-soft"
                aria-label={`Edit ${section.sectionName}`}
                onClick={() =>
                  handleChangeEditSectionName(section._id, section.sectionName)
                }
              >
                <MdEdit className="text-xl text-text-secondary" />
              </button>
              <button
                type="button"
                className="grid h-11 w-11 shrink-0 place-items-center rounded-md hover:bg-brand-soft"
                aria-label={`Delete ${section.sectionName}`}
                onClick={() =>
                  setConfirmationModal({
                    text1: "Delete this Section?",
                    text2: "All the lectures in this section will be deleted",
                    btn1Text: "Delete",
                    btn2Text: "Cancel",
                    btn1Handler: () => handleDeleleSection(section._id),
                    btn2Handler: () => setConfirmationModal(null),
                  })
                }
              >
                <RiDeleteBin6Line className="text-xl text-text-secondary" />
              </button>
            </div>
            <div className="px-1 pb-4 sm:px-4">
              {/* Render All Sub Sections Within a Section */}
              {section.subSection.map((data) => (
                <div
                  key={data?._id}
                  className="flex items-center justify-between gap-2 border-b-2 border-b-border-default py-2"
                >
                  <button
                    type="button"
                    onClick={() => setViewSubSection(data)}
                    className="flex min-w-0 flex-1 items-center gap-2 py-2 text-left [overflow-wrap:anywhere]"
                    aria-label={`View ${data.title}`}
                  >
                    <FiPlayCircle
                      className="shrink-0 text-2xl text-text-primary"
                      aria-hidden="true"
                    />
                    <p className="font-semibold text-text-primary">
                      {data.title}
                    </p>
                  </button>
                  <div className="flex min-w-0 items-center gap-2">
                    <button
                      type="button"
                      className="grid h-11 w-11 shrink-0 place-items-center rounded-md hover:bg-brand-soft"
                      aria-label={`Edit ${data.title}`}
                      onClick={() =>
                        setEditSubSection({ ...data, sectionId: section._id })
                      }
                    >
                      <MdEdit className="text-xl text-text-secondary" />
                    </button>
                    <button
                      type="button"
                      className="grid h-11 w-11 shrink-0 place-items-center rounded-md hover:bg-brand-soft"
                      aria-label={`Delete ${data.title}`}
                      onClick={() =>
                        setConfirmationModal({
                          text1: "Delete this Sub-Section?",
                          text2: "This lecture will be deleted",
                          btn1Text: "Delete",
                          btn2Text: "Cancel",
                          btn1Handler: () =>
                            handleDeleteSubSection(data._id, section._id),
                          btn2Handler: () => setConfirmationModal(null),
                        })
                      }
                    >
                      <RiDeleteBin6Line className="text-xl text-text-secondary" />
                    </button>
                  </div>
                </div>
              ))}
              {/* Add New Lecture to Section */}
              <button
                type="button"
                onClick={() => setAddSubsection(section._id)}
                className="mt-3 flex min-h-11 items-center gap-x-1 text-brand-primary"
              >
                <FaPlus className="text-lg" />
                <p>Add Lecture</p>
              </button>
            </div>
          </details>
        ))}
      </div>
      {/* Modal Display */}
      {addSubSection ? (
        <SubSectionModal
          modalData={addSubSection}
          setModalData={setAddSubsection}
          add={true}
        />
      ) : viewSubSection ? (
        <SubSectionModal
          modalData={viewSubSection}
          setModalData={setViewSubSection}
          view={true}
        />
      ) : editSubSection ? (
        <SubSectionModal
          modalData={editSubSection}
          setModalData={setEditSubSection}
          edit={true}
        />
      ) : (
        <></>
      )}
      {/* Confirmation Modal */}
      {confirmationModal ? (
        <ConfirmationModal modalData={confirmationModal} />
      ) : (
        <></>
      )}
    </>
  )
}
