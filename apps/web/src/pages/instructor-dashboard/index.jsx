import { fetchInstructorCourses } from "@/entities/course"
import { getInstructorData } from "@/entities/user"
import InstructorChart from "@/pages/instructor-dashboard/ui/InstructorChart"
import CourseImage from "@/shared/ui/CourseImage"
import FlaskLoader from "@/shared/ui/FlaskLoader"
import PageIntro from "@/shared/ui/PageIntro"
import ProductCollage from "@/shared/ui/ProductCollage"
import { useEffect, useState } from "react"
import { useSelector } from "react-redux"
import { Link } from "react-router"

export default function Instructor() {
  const { token } = useSelector((state) => state.auth)
  const { user } = useSelector((state) => state.profile)
  const [loading, setLoading] = useState(false)
  const [instructorData, setInstructorData] = useState(null)
  const [courses, setCourses] = useState([])

  useEffect(() => {
    ;(async () => {
      setLoading(true)
      const instructorApiData = await getInstructorData(token)
      const result = await fetchInstructorCourses(token)
      if (instructorApiData.length) setInstructorData(instructorApiData)
      if (result) {
        setCourses(result)
      }
      setLoading(false)
    })()
  }, [token])

  const totalAmount = instructorData?.reduce(
    (acc, curr) => acc + curr.totalAmountGenerated,
    0
  )

  const totalStudents = instructorData?.reduce(
    (acc, curr) => acc + curr.totalStudentsEnrolled,
    0
  )

  return (
    <div>
      <PageIntro
        eyebrow="Teaching studio"
        title={`Hi ${user?.firstName || "there"} 👋`}
        description="Your courses, your learners, and the next idea worth sharing."
      />
      {loading ? (
        <div className="grid min-h-80 place-items-center" aria-busy="true">
          <FlaskLoader accessibleLabel="Loading instructor dashboard" />
        </div>
      ) : courses.length > 0 ? (
        <div>
          <div className="my-8 flex flex-col gap-4 lg:h-[450px] lg:flex-row">
            {/* Render chart / graph */}
            {totalAmount > 0 || totalStudents > 0 ? (
              <InstructorChart courses={instructorData} />
            ) : (
              <div className="sn-card flex-1 bg-surface-secondary p-6">
                <p className="text-lg font-bold text-text-primary">Visualize</p>
                <p className="mt-4 text-xl font-medium text-text-primary">
                  Not Enough Data To Visualize
                </p>
              </div>
            )}
            {/* Total Statistics */}
            <div className="sn-card flex min-w-0 flex-col bg-surface-secondary p-6 lg:min-w-[250px]">
              <p className="text-lg font-bold text-text-primary">Statistics</p>
              <div className="mt-4 space-y-4">
                <div>
                  <p className="text-lg text-text-secondary">Total Courses</p>
                  <p className="text-3xl font-semibold text-text-primary">
                    {courses.length}
                  </p>
                </div>
                <div>
                  <p className="text-lg text-text-secondary">
                    Course enrollments
                  </p>
                  <p className="text-3xl font-semibold text-text-primary">
                    {totalStudents ?? 0}
                  </p>
                </div>
                <div>
                  <p className="text-lg text-text-secondary">Course revenue</p>
                  <p className="text-3xl font-semibold text-text-primary">
                    Rs. {totalAmount ?? 0}
                  </p>
                </div>
              </div>
            </div>
          </div>
          <div className="sn-card bg-surface-secondary p-6">
            {/* Render 3 courses */}
            <div className="flex items-center justify-between">
              <p className="text-lg font-bold text-text-primary">
                Your Courses
              </p>
              <Link to="/dashboard/my-courses">
                <p className="text-xs font-semibold text-brand-primary">
                  View All
                </p>
              </Link>
            </div>
            <div className="my-4 grid items-start gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {courses.slice(0, 3).map((course) => (
                <div key={course._id} className="min-w-0">
                  <CourseImage
                    src={course.thumbnail}
                    alt={course.courseName}
                    className="h-[201px] w-full rounded-md object-cover"
                  />
                  <div className="mt-3 w-full">
                    <p className="text-sm font-medium text-text-primary">
                      {course.courseName}
                    </p>
                    <div className="mt-1 flex items-center space-x-2">
                      <p className="text-xs font-medium text-text-secondary">
                        {course.totalStudentsEnrolled ?? 0} students
                      </p>
                      <p className="text-xs font-medium text-text-secondary">
                        |
                      </p>
                      <p className="text-xs font-medium text-text-secondary">
                        Rs. {course.price}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="sn-card mt-8 bg-surface-secondary p-6 py-20">
          <ProductCollage
            variant="teaching"
            className="mx-auto mb-5 max-w-xs"
          />
          <p className="text-center text-2xl font-bold text-text-primary">
            You have not created any courses yet
          </p>
          <Link to="/dashboard/add-course">
            <p className="mt-1 text-center text-lg font-semibold text-brand-primary">
              Create a course
            </p>
          </Link>
        </div>
      )}
    </div>
  )
}
