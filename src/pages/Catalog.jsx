import { useEffect, useState } from "react"
import { useSelector } from "react-redux"
import { useParams } from "react-router-dom"

// import CourseCard from "../components/Catalog/CourseCard"
// import CourseSlider from "../components/Catalog/CourseSlider"
import Footer from "../components/Common/Footer"
import Course_Card from "../components/core/Catalog/Course_Card"
import Course_Slider from "../components/core/Catalog/Course_Slider"
import { apiConnector } from "../services/apiConnector"
import { categories } from "../services/apis"
import { getCatalogPageData } from "../services/operations/pageAndComponntDatas"
import Error from "./Error"

function Catalog() {
  const { loading } = useSelector((state) => state.profile)
  const { catalogName } = useParams()
  const [active, setActive] = useState(1)
  const [catalogPageData, setCatalogPageData] = useState(null)
  const [categoryId, setCategoryId] = useState("")
  const [catalogError, setCatalogError] = useState(false)
  // Fetch All Categories
  useEffect(() => {
    ;(async () => {
      setCatalogError(false)
      setCatalogPageData(null)
      setCategoryId("")
      try {
        const res = await apiConnector("GET", categories.CATEGORIES_API)
        const categoryList = res?.data?.data
        const selectedCategory = Array.isArray(categoryList)
          ? categoryList.find(
              (category) =>
                category?.name?.split(" ").join("-").toLowerCase() ===
                catalogName
            )
          : null

        if (!selectedCategory?._id) {
          setCatalogError(true)
          return
        }

        setCategoryId(selectedCategory._id)
      } catch {
        setCatalogError(true)
      }
    })()
  }, [catalogName])
  useEffect(() => {
    if (categoryId) {
      ;(async () => {
        try {
          const res = await getCatalogPageData(categoryId)
          if (!res?.success) {
            setCatalogError(true)
            return
          }
          setCatalogPageData(res)
        } catch {
          setCatalogError(true)
        }
      })()
    }
  }, [categoryId])

  if (catalogError) {
    return <Error />
  }

  if (loading || !catalogPageData) {
    return (
      <div className="grid min-h-[calc(100vh-3.5rem)] place-items-center">
        <div className="spinner"></div>
      </div>
    )
  }
  if (!loading && !catalogPageData.success) {
    return <Error />
  }

  const selectedCourses = [
    ...(catalogPageData?.data?.selectedCategory?.courses || []),
  ].sort((first, second) =>
    active === 1
      ? (second.totalStudentsEnrolled || 0) -
        (first.totalStudentsEnrolled || 0)
      : new Date(second.createdAt || 0) - new Date(first.createdAt || 0)
  )
  const differentCategory = catalogPageData?.data?.differentCategory

  return (
    <>
      {/* Hero Section */}
      <div className=" box-content bg-richblack-800 px-4">
        <div className="mx-auto flex min-h-[260px] max-w-maxContentTab flex-col justify-center gap-4 lg:max-w-maxContent ">
          <p className="text-sm text-richblack-300">
            {`Home / Catalog / `}
            <span className="text-yellow-25">
              {catalogPageData?.data?.selectedCategory?.name}
            </span>
          </p>
          <p className="text-3xl text-richblack-5">
            {catalogPageData?.data?.selectedCategory?.name}
          </p>
          <p className="max-w-[870px] text-richblack-200">
            {catalogPageData?.data?.selectedCategory?.description}
          </p>
        </div>
      </div>

      {/* Section 1 */}
      <div className=" mx-auto box-content w-full max-w-maxContentTab px-4 py-12 lg:max-w-maxContent">
        <div className="section_heading">Courses to get you started</div>
        <div className="my-4 flex border-b border-b-richblack-600 text-sm">
          <button
            type="button"
            aria-pressed={active === 1}
            className={`px-4 py-2 ${
              active === 1
                ? "border-b border-b-yellow-25 text-yellow-25"
                : "text-richblack-50"
            } cursor-pointer`}
            onClick={() => setActive(1)}
          >
            Most Popular
          </button>
          <button
            type="button"
            aria-pressed={active === 2}
            className={`px-4 py-2 ${
              active === 2
                ? "border-b border-b-yellow-25 text-yellow-25"
                : "text-richblack-50"
            } cursor-pointer`}
            onClick={() => setActive(2)}
          >
            New
          </button>
        </div>
        <div>
          <Course_Slider Courses={selectedCourses} />
        </div>
      </div>
      {/* Section 2 */}
      {differentCategory?.courses?.length > 0 && (
        <div className=" mx-auto box-content w-full max-w-maxContentTab px-4 py-12 lg:max-w-maxContent">
          <div className="section_heading">
            Top courses in {differentCategory.name}
          </div>
          <div className="py-8">
            <Course_Slider Courses={differentCategory.courses} />
          </div>
        </div>
      )}

      {/* Section 3 */}
      <div className=" mx-auto box-content w-full max-w-maxContentTab px-4 py-12 lg:max-w-maxContent">
        <div className="section_heading">Popular across StudyNotion</div>
        <div className="py-8">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {catalogPageData?.data?.mostSellingCourses
              ?.slice(0, 4)
              .map((course) => (
                <Course_Card
                  course={course}
                  key={course._id}
                  Height={"h-[400px]"}
                />
              ))}
          </div>
        </div>
      </div>

      <Footer />
    </>
  )
}

export default Catalog
