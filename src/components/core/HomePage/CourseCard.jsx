// Importing React Icons
import { HiUsers } from "react-icons/hi"
import { ImTree } from "react-icons/im"

const CourseCard = ({ cardData, currentCard, setCurrentCard }) => {
  return (
    <button
      type="button"
      className={`w-[360px] lg:w-[30%] ${
        currentCard === cardData?.heading
          ? "bg-white shadow-[12px_12px_0_0] shadow-yellow-50"
          : "bg-richblack-800"
      } box-border h-[300px] cursor-pointer text-left text-richblack-25`}
      onClick={() => setCurrentCard(cardData?.heading)}
      aria-pressed={currentCard === cardData?.heading}
    >
      <div className="flex h-[80%] flex-col gap-3 border-b-[2px] border-dashed border-richblack-400 p-6">
        <div
          className={` ${
            currentCard === cardData?.heading && "text-richblack-800"
          } text-[20px] font-semibold`}
        >
          {cardData?.heading}
        </div>

        <div className="text-richblack-400">{cardData?.description}</div>
      </div>

      <div
        className={`flex justify-between ${
          currentCard === cardData?.heading
            ? "text-blue-300"
            : "text-richblack-300"
        } px-6 py-3 font-medium`}
      >
        {/* Level */}
        <div className="flex items-center gap-2 text-[16px]">
          <HiUsers />
          <p>{cardData?.level}</p>
        </div>

        {/* Flow Chart */}
        <div className="flex items-center gap-2 text-[16px]">
          <ImTree />
          <p>{cardData?.lessionNumber} Lession</p>
        </div>
      </div>
    </button>
  )
}

export default CourseCard
