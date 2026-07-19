import { useForm, useWatch } from "react-hook-form"
import { RxCross2 } from "react-icons/rx"
import { useSelector } from "react-redux"

import { createRating } from "../../../services/operations/courseDetailsAPI"
import IconBtn from "../../Common/IconBtn"
import RatingInput from "../../Common/RatingInput"

export default function CourseReviewModal({ setReviewModal }) {
  const { user } = useSelector((state) => state.profile)
  const { token } = useSelector((state) => state.auth)
  const { courseEntireData } = useSelector((state) => state.viewCourse)

  const {
    register,
    handleSubmit,
    setValue,
    control,
    formState: { errors },
  } = useForm({
    defaultValues: { courseExperience: "", courseRating: 0 },
  })

  const selectedRating = useWatch({ control, name: "courseRating" })

  const onSubmit = async (data) => {
    const created = await createRating(
      {
        courseId: courseEntireData._id,
        rating: data.courseRating,
        review: data.courseExperience,
      },
      token
    )
    if (created) setReviewModal(false)
  }

  return (
    <div className="fixed inset-0 z-[1000] !mt-0 grid h-screen w-screen place-items-center overflow-auto bg-white bg-opacity-10 backdrop-blur-sm">
      <div
        className="my-10 w-11/12 max-w-[700px] rounded-lg border border-richblack-400 bg-richblack-800"
        role="dialog"
        aria-modal="true"
        aria-labelledby="review-dialog-title"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between rounded-t-lg bg-richblack-700 p-5">
          <p
            id="review-dialog-title"
            className="text-xl font-semibold text-richblack-5"
          >
            Add Review
          </p>
          <button
            type="button"
            aria-label="Close review dialog"
            onClick={() => setReviewModal(false)}
          >
            <RxCross2 className="text-2xl text-richblack-5" />
          </button>
        </div>
        {/* Modal Body */}
        <div className="p-6">
          <div className="flex items-center justify-center gap-x-4">
            <img
              src={user?.image}
              alt={user?.firstName + "profile"}
              className="aspect-square w-[50px] rounded-full object-cover"
            />
            <div className="">
              <p className="font-semibold text-richblack-5">
                {user?.firstName} {user?.lastName}
              </p>
              <p className="text-sm text-richblack-5">Posting Publicly</p>
            </div>
          </div>
          <form
            onSubmit={handleSubmit(onSubmit)}
            className="mt-6 flex flex-col items-center"
          >
            <RatingInput
              value={selectedRating}
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
              <span className="mt-1 text-xs text-pink-200" role="alert">
                {errors.courseRating.message}
              </span>
            )}
            <div className="flex w-11/12 flex-col space-y-2">
              <label
                className="text-sm text-richblack-5"
                htmlFor="courseExperience"
              >
                Add Your Experience <sup className="text-pink-200">*</sup>
              </label>
              <textarea
                id="courseExperience"
                placeholder="Add Your Experience"
                {...register("courseExperience", { required: true })}
                className="form-style resize-x-none min-h-[130px] w-full"
              />
              {errors.courseExperience && (
                <span className="ml-2 text-xs tracking-wide text-pink-200">
                  Please Add Your Experience
                </span>
              )}
            </div>
            <div className="mt-6 flex w-11/12 justify-end gap-x-2">
              <button
                type="button"
                onClick={() => setReviewModal(false)}
                className={`flex cursor-pointer items-center gap-x-2 rounded-md bg-richblack-300 py-[8px] px-[20px] font-semibold text-richblack-900`}
              >
                Cancel
              </button>
              <IconBtn text="Save" />
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
