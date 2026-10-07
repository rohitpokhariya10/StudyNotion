import {
  createSubSection,
  setCourse,
  updateSubSection,
} from "@/entities/course"
import Upload from "@/features/course-authoring/ui/AddCourse/Upload"
import AccessibleDialog from "@/shared/ui/AccessibleDialog"
import IconBtn from "@/shared/ui/IconBtn"
import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { toast } from "react-hot-toast"
import { RxCross2 } from "react-icons/rx"
import { useDispatch, useSelector } from "react-redux"

export default function SubSectionModal({
  modalData,
  setModalData,
  add = false,
  view = false,
  edit = false,
}) {
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
    getValues,
  } = useForm()

  // console.log("view", view)
  // console.log("edit", edit)
  // console.log("add", add)

  const dispatch = useDispatch()
  const [loading, setLoading] = useState(false)
  const { token } = useSelector((state) => state.auth)
  const { course } = useSelector((state) => state.course)

  useEffect(() => {
    if (view || edit) {
      // console.log("modalData", modalData)
      setValue("lectureTitle", modalData.title)
      setValue("lectureDesc", modalData.description)
      setValue("lectureVideo", modalData.videoUrl)
    }
  }, [
    edit,
    modalData.description,
    modalData.title,
    modalData.videoUrl,
    setValue,
    view,
  ])

  // detect whether form is updated or not
  const isFormUpdated = () => {
    const currentValues = getValues()
    // console.log("changes after editing form values:", currentValues)
    if (
      currentValues.lectureTitle !== modalData.title ||
      currentValues.lectureDesc !== modalData.description ||
      currentValues.lectureVideo !== modalData.videoUrl
    ) {
      return true
    }
    return false
  }

  // handle the editing of subsection
  const handleEditSubsection = async () => {
    const currentValues = getValues()
    // console.log("changes after editing form values:", currentValues)
    const formData = new FormData()
    // console.log("Values After Editing form values:", currentValues)
    formData.append("sectionId", modalData.sectionId)
    formData.append("subSectionId", modalData._id)
    if (currentValues.lectureTitle !== modalData.title) {
      formData.append("title", currentValues.lectureTitle)
    }
    if (currentValues.lectureDesc !== modalData.description) {
      formData.append("description", currentValues.lectureDesc)
    }
    if (currentValues.lectureVideo !== modalData.videoUrl) {
      formData.append("video", currentValues.lectureVideo)
    }
    setLoading(true)
    const result = await updateSubSection(formData, token)
    if (result) {
      // console.log("result", result)
      // update the structure of course
      const updatedCourseContent = course.courseContent.map((section) =>
        section._id === modalData.sectionId ? result : section
      )
      const updatedCourse = { ...course, courseContent: updatedCourseContent }
      dispatch(setCourse(updatedCourse))
    }
    setModalData(null)
    setLoading(false)
  }

  const onSubmit = async (data) => {
    // console.log(data)
    if (view) return

    if (edit) {
      if (!isFormUpdated()) {
        toast.error("No changes made to the form")
      } else {
        handleEditSubsection()
      }
      return
    }

    const formData = new FormData()
    formData.append("sectionId", modalData)
    formData.append("title", data.lectureTitle)
    formData.append("description", data.lectureDesc)
    formData.append("video", data.lectureVideo)
    setLoading(true)
    const result = await createSubSection(formData, token)
    if (result) {
      // update the structure of course
      const updatedCourseContent = course.courseContent.map((section) =>
        section._id === modalData ? result : section
      )
      const updatedCourse = { ...course, courseContent: updatedCourseContent }
      dispatch(setCourse(updatedCourse))
    }
    setModalData(null)
    setLoading(false)
  }

  return (
    <AccessibleDialog
      title={`${view ? "Viewing" : add ? "Adding" : "Editing"} Lecture`}
      titleClassName="sr-only"
      onClose={() => {
        if (!loading) setModalData(null)
      }}
      closeOnEscape={!loading}
      className="my-4 w-full max-w-[700px] rounded-xl border border-border-default bg-white"
      overlayClassName="bg-black/40"
    >
      {/* Modal Header */}
      <div className="flex items-center justify-between rounded-t-lg bg-surface-elevated p-5">
        <p className="text-xl font-semibold text-text-primary">
          {view && "Viewing"} {add && "Adding"} {edit && "Editing"} Lecture
        </p>
        <button
          type="button"
          onClick={() => (!loading ? setModalData(null) : {})}
          aria-label="Close lecture dialog"
          disabled={loading}
          className="sn-btn sn-btn-icon"
        >
          <RxCross2 className="text-2xl text-text-primary" aria-hidden="true" />
        </button>
      </div>
      {/* Modal Form */}
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="space-y-7 px-5 py-7 sm:px-8"
      >
        {/* Lecture Video Upload */}
        <Upload
          name="lectureVideo"
          label="Lecture Video"
          register={register}
          setValue={setValue}
          errors={errors}
          video={true}
          viewData={view ? modalData.videoUrl : null}
          editData={edit ? modalData.videoUrl : null}
        />
        {/* Lecture Title */}
        <div className="flex flex-col space-y-2">
          <label className="text-sm text-text-primary" htmlFor="lectureTitle">
            Lecture Title {!view && <sup className="text-danger">*</sup>}
          </label>
          <input
            disabled={view || loading}
            id="lectureTitle"
            placeholder="Enter Lecture Title"
            {...register("lectureTitle", { required: true })}
            className="form-style w-full"
          />
          {errors.lectureTitle && (
            <span className="ml-2 text-xs tracking-wide text-danger">
              Lecture title is required
            </span>
          )}
        </div>
        {/* Lecture Description */}
        <div className="flex flex-col space-y-2">
          <label className="text-sm text-text-primary" htmlFor="lectureDesc">
            Lecture Description {!view && <sup className="text-danger">*</sup>}
          </label>
          <textarea
            disabled={view || loading}
            id="lectureDesc"
            placeholder="Enter Lecture Description"
            {...register("lectureDesc", { required: true })}
            className="form-style resize-x-none min-h-[130px] w-full"
          />
          {errors.lectureDesc && (
            <span className="ml-2 text-xs tracking-wide text-danger">
              Lecture Description is required
            </span>
          )}
        </div>
        {!view && (
          <div className="flex justify-end">
            <IconBtn
              type="submit"
              disabled={loading}
              text={loading ? "Loading.." : edit ? "Save Changes" : "Save"}
            />
          </div>
        )}
      </form>
    </AccessibleDialog>
  )
}
