import { useState } from "react"

import { HomePageExplore } from "../../../data/homepage-explore"
import CourseCard from "./CourseCard"
import HighlightText from "./HighlightText"

const tabsName = [
  "Free",
  "New to coding",
  "Most popular",
  "Skills paths",
  "Career paths",
]

const ExploreMore = () => {
  const [currentTab, setCurrentTab] = useState(tabsName[0])
  const [courses, setCourses] = useState(HomePageExplore[0].courses)
  const [currentCard, setCurrentCard] = useState(
    HomePageExplore[0].courses[0].heading
  )

  const setMyCards = (value) => {
    setCurrentTab(value)
    const result = HomePageExplore.filter((course) => course.tag === value)
    setCourses(result[0].courses)
    setCurrentCard(result[0].courses[0].heading)
  }

  return (
    <div>
      {/* Explore more section */}
      <div>
        <div className="my-10 text-center text-4xl font-semibold">
          Unlock the
          <HighlightText text={"Power of Code"} />
          <p className="mt-1 text-center text-lg font-semibold text-richblack-300">
            Learn to Build Anything You Can Imagine
          </p>
        </div>
      </div>

      {/* Tabs Section */}
      <div className="mx-auto -mt-5 hidden w-max gap-5 rounded-full bg-richblack-800 p-1 font-medium text-richblack-200 drop-shadow-[0_1.5px_rgba(255,255,255,0.25)] lg:flex">
        {tabsName.map((ele, index) => {
          return (
            <button
              type="button"
              className={`flex flex-row items-center gap-2 text-[16px] ${
                currentTab === ele
                  ? "bg-richblack-900 font-medium text-richblack-5"
                  : "text-richblack-200"
              } cursor-pointer rounded-full px-7 py-[7px] transition-all duration-200 hover:bg-richblack-900 hover:text-richblack-5`}
              key={index}
              onClick={() => setMyCards(ele)}
              aria-pressed={currentTab === ele}
            >
              {ele}
            </button>
          )
        })}
      </div>
      <div className="hidden lg:block lg:h-[200px]"></div>

      {/* Cards Group */}
      <div className="mb-7 flex w-full flex-wrap justify-center gap-10 px-3 text-black lg:absolute lg:bottom-[0] lg:left-[50%] lg:mb-0 lg:translate-x-[-50%] lg:translate-y-[50%] lg:justify-between lg:gap-0 lg:px-0">
        {courses.map((ele, index) => {
          return (
            <CourseCard
              key={index}
              cardData={ele}
              currentCard={currentCard}
              setCurrentCard={setCurrentCard}
            />
          )
        })}
      </div>
    </div>
  )
}

export default ExploreMore
