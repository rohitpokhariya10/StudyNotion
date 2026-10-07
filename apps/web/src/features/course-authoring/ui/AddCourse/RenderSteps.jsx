import CourseBuilderForm from "@/features/course-authoring/ui/AddCourse/CourseBuilder/CourseBuilderForm"
import CourseInformationForm from "@/features/course-authoring/ui/AddCourse/CourseInformation/CourseInformationForm"
import PublishCourse from "@/features/course-authoring/ui/AddCourse/PublishCourse"
import React from "react"
import { FaCheck } from "react-icons/fa"
import { useSelector } from "react-redux"

export default function RenderSteps() {
  const { step } = useSelector((state) => state.course)

  const steps = [
    { id: 1, title: "Course Information" },
    { id: 2, title: "Course Builder" },
    { id: 3, title: "Publish" },
  ]

  return (
    <>
      <div className="relative mb-2 flex w-full justify-center">
        {steps.map((item) => (
          <React.Fragment key={item.id}>
            <div className="flex flex-col items-center">
              <span
                aria-current={step === item.id ? "step" : undefined}
                className={`grid aspect-square w-[34px] cursor-default place-items-center rounded-full border-[1px] ${
                  step > item.id
                    ? "border-brand-primary bg-brand-primary text-white"
                    : step === item.id
                      ? "border-brand-primary bg-brand-soft text-brand-primary"
                      : "border-border-default bg-surface-secondary text-text-secondary"
                } `}
              >
                {step > item.id ? (
                  <>
                    <FaCheck aria-hidden="true" />
                    <span className="sr-only">{item.title} complete</span>
                  </>
                ) : (
                  item.id
                )}
              </span>
            </div>

            {item.id !== steps.length && (
              <div
                className={`h-[calc(34px/2)] w-[33%] border-b-2 border-dashed ${
                  step > item.id
                    ? "border-brand-primary"
                    : "border-border-default"
                } `}
              ></div>
            )}
          </React.Fragment>
        ))}
      </div>

      <div className="relative mb-8 grid w-full grid-cols-3 gap-2 select-none">
        {steps.map((item) => (
          <React.Fragment key={item.id}>
            <div className="flex min-w-0 flex-col items-center gap-y-2 text-center">
              <p
                className={`text-sm ${
                  step >= item.id ? "text-text-primary" : "text-text-secondary"
                }`}
              >
                {item.title}
              </p>
            </div>
          </React.Fragment>
        ))}
      </div>

      {/* Render specific component based on current step */}
      {step === 1 && <CourseInformationForm />}
      {step === 2 && <CourseBuilderForm />}
      {step === 3 && <PublishCourse />}
    </>
  )
}
