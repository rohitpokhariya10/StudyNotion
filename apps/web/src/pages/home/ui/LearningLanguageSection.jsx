import Compare_with_others from "@/shared/assets/Images/Compare_with_others.svg"
import Know_your_progress from "@/shared/assets/Images/Know_your_progress.png"
import Plan_your_lessons from "@/shared/assets/Images/Plan_your_lessons.svg"
import HighlightText from "@/shared/ui/HighlightText"
import CTAButton from "@/shared/ui/LinkButton"

const LearningLanguageSection = () => {
  return (
    <div>
      <div className="my-10 text-center text-4xl font-semibold">
        Your swiss knife for
        <HighlightText text={"learning any language"} />
        <div className="mx-auto mt-3 text-center text-base leading-6 font-medium text-richblack-700 lg:w-[75%]">
          Using spin making learning multiple languages easy. with 20+ languages
          realistic voice-over, progress tracking, custom schedule and more.
        </div>
        <div className="mt-8 flex flex-col items-center justify-center lg:mt-0 lg:flex-row">
          <img
            src={Know_your_progress}
            alt=""
            className="object-contain lg:-mr-32"
          />
          <img
            src={Compare_with_others}
            alt=""
            className="-mt-12 object-contain lg:-mt-0 lg:-mb-10"
          />
          <img
            src={Plan_your_lessons}
            alt=""
            className="-mt-16 object-contain lg:-mt-5 lg:-ml-36"
          />
        </div>
      </div>

      <div className="mx-auto -mt-5 mb-8 w-fit lg:mb-20">
        <CTAButton active={true} linkto={"/signup"}>
          <div className="">Learn More</div>
        </CTAButton>
      </div>
    </div>
  )
}

export default LearningLanguageSection
