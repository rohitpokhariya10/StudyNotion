import RenderSteps from "@/features/course-authoring/ui/AddCourse/RenderSteps"
import PageIntro from "@/shared/ui/PageIntro"

export default function AddCourse() {
  return (
    <>
      <div className="flex w-full items-start gap-x-6">
        <div className="flex min-w-0 flex-1 flex-col">
          <PageIntro
            eyebrow="Teaching studio"
            title="Add Course"
            description="Turn your knowledge into a thoughtful learning experience."
          />
          <div className="flex-1">
            <RenderSteps />
          </div>
        </div>
        {/* Course Upload Tips */}
        <div className="sticky top-10 hidden max-w-[280px] rounded-xl border-[1px] border-border-default bg-surface-secondary p-6 xl:block">
          <p className="mb-8 text-lg text-text-primary">
            ⚡ Course Upload Tips
          </p>
          <ul className="ml-5 list-disc space-y-4 text-sm leading-6 text-text-secondary">
            <li>
              Give your course a clear title and a description of what learners
              will study.
            </li>
            <li>Use a 16:9 thumbnail. Recommended size: 1024 × 576.</li>
            <li>
              Organise your curriculum into sections, then add video lessons.
            </li>
            <li>Images can be up to 10 MB; videos can be up to 25 MB.</li>
            <li>
              Review your uploaded lessons before making the course public.
            </li>
            <li>Save as a draft while you are still preparing your content.</li>
          </ul>
        </div>
      </div>
    </>
  )
}
