import { createRating } from "@/entities/course"
import { getAvatarSource, setInitialsAvatarOnError } from "@/entities/user"
import RatingInput from "@/features/course-review/ui/RatingInput"
import AccessibleDialog from "@/shared/ui/AccessibleDialog"
import IconBtn from "@/shared/ui/IconBtn"
import { useForm, useWatch } from "react-hook-form"
import { RxCross2 } from "react-icons/rx"
import { useSelector } from "react-redux"

export default function CourseReviewModal({ courseId, setReviewModal }) {
  const { user } = useSelector((state) => state.profile)
  const { token } = useSelector((state) => state.auth)

  const {
    register,
    handleSubmit,
    setValue,
    control,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues: { courseExperience: "", courseRating: 0 },
  })

  const selectedRating = useWatch({ control, name: "courseRating" })

  const onSubmit = async (data) => {
    const created = await createRating(
      {
        courseId,
        rating: data.courseRating,
        review: data.courseExperience,
      },
      token
    )
    if (created) setReviewModal(false)
  }

  return (
    <AccessibleDialog
      title="Add Review"
      titleClassName="sr-only"
      onClose={() => {
        if (!isSubmitting) setReviewModal(false)
      }}
      closeOnEscape={!isSubmitting}
      className="my-4 w-full max-w-[640px] rounded-xl border border-border-default bg-white"
      overlayClassName="bg-black/40"
    >
      {/* Modal Header */}
      <div className="flex items-center justify-between rounded-t-lg bg-surface-elevated p-5">
        <p
          id="review-dialog-title"
          className="text-xl font-semibold text-text-primary"
        >
          Add Review
        </p>
        <button
          type="button"
          aria-label="Close review dialog"
          disabled={isSubmitting}
          className="sn-btn sn-btn-icon"
          onClick={() => setReviewModal(false)}
        >
          <RxCross2 className="text-2xl text-text-primary" />
        </button>
      </div>
      {/* Modal Body */}
      <div className="p-6">
        <div className="flex items-center justify-center gap-x-4">
          <img
            src={getAvatarSource(user)}
            onError={(event) => setInitialsAvatarOnError(event, user)}
            alt=""
            className="aspect-square w-[50px] rounded-full object-cover"
          />
          <div className="">
            <p className="font-semibold text-text-primary">
              {user?.firstName} {user?.lastName}
            </p>
            <p className="text-sm text-text-primary">Posting Publicly</p>
          </div>
        </div>
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="mt-6 flex flex-col items-center"
        >
          <RatingInput
            value={selectedRating}
            disabled={isSubmitting}
            onChange={(rating) =>
              setValue("courseRating", rating, {
                shouldDirty: true,
                shouldValidate: true,
              })
            }
          />
          <input
            type="hidden"
            {...register("courseRating", {
              min: { value: 1, message: "Please select a rating" },
              required: "Please select a rating",
            })}
          />
          {errors.courseRating && (
            <span className="mt-1 text-xs text-danger" role="alert">
              {errors.courseRating.message}
            </span>
          )}
          <div className="flex w-11/12 flex-col space-y-2">
            <label
              className="text-sm text-text-primary"
              htmlFor="courseExperience"
            >
              Add Your Experience <sup className="text-danger">*</sup>
            </label>
            <textarea
              id="courseExperience"
              placeholder="Add Your Experience"
              {...register("courseExperience", { required: true })}
              className="form-style min-h-[130px] w-full resize-y"
            />
            {errors.courseExperience && (
              <span className="ml-2 text-xs tracking-wide text-danger">
                Please Add Your Experience
              </span>
            )}
          </div>
          <div className="mt-6 flex w-11/12 justify-end gap-x-2">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => setReviewModal(false)}
              className={`flex cursor-pointer items-center gap-x-2 rounded-md bg-surface-elevated px-[20px] py-[8px] font-semibold text-text-primary`}
            >
              Cancel
            </button>
            <IconBtn
              type="submit"
              disabled={isSubmitting}
              text={isSubmitting ? "Saving…" : "Save"}
            />
          </div>
        </form>
      </div>
    </AccessibleDialog>
  )
}
