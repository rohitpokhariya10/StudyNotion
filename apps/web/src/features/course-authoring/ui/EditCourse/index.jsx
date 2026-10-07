import {
  getFullDetailsOfCourse,
  setCourse,
  setEditCourse,
} from "@/entities/course"
import RenderSteps from "@/features/course-authoring/ui/AddCourse/RenderSteps"
import FlaskLoader from "@/shared/ui/FlaskLoader"
import { useEffect, useState } from "react"
import { useDispatch, useSelector } from "react-redux"
import { useParams } from "react-router"

export default function EditCourse() {
  const dispatch = useDispatch()
  const { courseId } = useParams()
  const { course } = useSelector((state) => state.course)
  const [loading, setLoading] = useState(false)
  const { token } = useSelector((state) => state.auth)

  useEffect(() => {
    ;(async () => {
      setLoading(true)
      const result = await getFullDetailsOfCourse(courseId, token)
      if (result?.courseDetails) {
        dispatch(setEditCourse(true))
        dispatch(setCourse(result?.courseDetails))
      }
      setLoading(false)
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (loading) {
    return (
      <div className="grid min-h-80 flex-1 place-items-center" aria-busy="true">
        <FlaskLoader accessibleLabel="Loading course editor" />
      </div>
    )
  }

  return (
    <div>
      <h1 className="sn-heading mb-8">Edit Course</h1>
      <div className="mx-auto max-w-[600px]">
        {course ? (
          <RenderSteps />
        ) : (
          <p className="mt-14 text-center text-3xl font-semibold text-text-secondary">
            Course not found
          </p>
        )}
      </div>
    </div>
  )
}
