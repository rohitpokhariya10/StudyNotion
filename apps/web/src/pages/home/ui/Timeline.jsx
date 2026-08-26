import TimeLineImage from "@/shared/assets/Images/TimelineImage.png"
import Logo1 from "@/shared/assets/TimeLineLogo/Logo1.svg"
import Logo2 from "@/shared/assets/TimeLineLogo/Logo2.svg"
import Logo3 from "@/shared/assets/TimeLineLogo/Logo3.svg"
import Logo4 from "@/shared/assets/TimeLineLogo/Logo4.svg"

const TimeLine = [
  {
    Logo: Logo1,
    Heading: "Leadership",
    Description: "Fully committed to the success company",
  },
  {
    Logo: Logo2,
    Heading: "Responsibility",
    Description: "Students will always be our top priority",
  },
  {
    Logo: Logo3,
    Heading: "Flexibility",
    Description: "The ability to switch is an important skills",
  },
  {
    Logo: Logo4,
    Heading: "Solve the problem",
    Description: "Code your way to a solution",
  },
]

const TimelineSection = () => {
  return (
    <div>
      <div className="mb-20 flex flex-col items-center gap-20 lg:flex-row">
        <div className="flex flex-col gap-14 lg:w-[45%] lg:gap-3">
          {TimeLine.map((ele, i) => {
            return (
              <div className="flex flex-col lg:gap-3" key={i}>
                <div className="flex gap-6" key={i}>
                  <div className="flex h-[52px] w-[52px] items-center justify-center rounded-full bg-white shadow-[0_0_62px_0] shadow-[#00000012]">
                    <img src={ele.Logo} alt="" />
                  </div>
                  <div>
                    <h2 className="text-[18px] font-semibold">{ele.Heading}</h2>
                    <p className="text-base">{ele.Description}</p>
                  </div>
                </div>
                <div
                  className={`hidden ${
                    TimeLine.length - 1 === i ? "hidden" : "lg:block"
                  } h-14 w-[26px] border-r border-dotted border-richblack-100 bg-richblack-400/0`}
                ></div>
              </div>
            )
          })}
        </div>
        <div className="relative h-fit w-fit shadow-[0px_0px_30px_0px] shadow-blue-200">
          <div className="absolute flex flex-col gap-4 bg-caribbeangreen-700 py-5 text-white uppercase lg:bottom-0 lg:left-[50%] lg:translate-x-[-50%] lg:translate-y-[50%] lg:flex-row lg:gap-0 lg:py-10">
            {/* Section 1 */}
            <div className="flex items-center gap-5 border-caribbeangreen-300 px-7 lg:border-r lg:px-14">
              <h1 className="w-[75px] text-3xl font-bold">10</h1>
              <h1 className="w-[75px] text-sm text-caribbeangreen-300">
                Years experiences
              </h1>
            </div>

            {/* Section 2 */}
            <div className="flex items-center gap-5 px-7 lg:px-14">
              <h1 className="w-[75px] text-3xl font-bold">250</h1>
              <h1 className="w-[75px] text-sm text-caribbeangreen-300">
                types of courses
              </h1>
            </div>
            <div></div>
          </div>
          <img
            src={TimeLineImage}
            alt="timelineImage"
            className="h-[400px] object-cover shadow-[20px_20px_0px_0px] shadow-white lg:h-fit"
          />
        </div>
      </div>
    </div>
  )
}

export default TimelineSection
