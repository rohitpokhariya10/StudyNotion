import Instructor from "@/shared/assets/Images/Instructor.png"
import HighlightText from "@/shared/ui/HighlightText"
import CTAButton from "@/shared/ui/LinkButton"
import { FaArrowRight } from "react-icons/fa"

const InstructorSection = () => {
  return (
    <div>
      <div className="flex flex-col items-center gap-20 lg:flex-row">
        <div className="lg:w-[50%]">
          <img
            src={Instructor}
            alt=""
            className="shadow-[-20px_-20px_0_0] shadow-white"
          />
        </div>
        <div className="flex flex-col gap-10 lg:w-[50%]">
          <h1 className="text-4xl font-semibold lg:w-[50%]">
            Become an
            <HighlightText text={"instructor"} />
          </h1>

          <p className="w-[90%] text-justify text-[16px] font-medium text-richblack-300">
            Build and publish structured courses with tools for curriculum,
            protected video lessons, learner progress, and verified payments.
          </p>

          <div className="w-fit">
            <CTAButton active={true} linkto={"/signup"}>
              <div className="flex items-center gap-3">
                Start Teaching Today
                <FaArrowRight />
              </div>
            </CTAButton>
          </div>
        </div>
      </div>
    </div>
  )
}

export default InstructorSection
