import { useGetCatalogCategoriesQuery } from "@/entities/catalog"
import { usePublicInstructors } from "@/widgets/instructor-strip"

// Facts panel under the hero. Numbers appear only when they are complete,
// platform-wide totals: published courses and subjects come from the full
// category list; instructors only once every published course has been read.
// Otherwise each slot keeps a plain, true fact about how learning works here.
const FALLBACK = [
  ["Explore", "Subjects & courses"],
  ["Self-paced", "Recorded video lessons"],
  ["Structured", "Step-by-step curriculum"],
  ["Your progress", "Saved lesson completion"],
]

export default function StatsStrip() {
  const categories = useGetCatalogCategoriesQuery()
  const instructors = usePublicInstructors()
  const list = categories.data || []
  const courses = list.reduce(
    (sum, item) => sum + (Number(item.publishedCourseCount) || 0),
    0
  )
  const subjects = list.filter((item) => item.publishedCourseCount > 0).length
  const teachers = instructors.complete ? instructors.instructors.length : 0
  const loading = categories.isLoading || instructors.isLoading
  const items = [
    courses > 0 ? [courses, "Published courses"] : FALLBACK[0],
    subjects > 0
      ? [subjects, subjects === 1 ? "Subject" : "Subjects"]
      : FALLBACK[1],
    teachers > 0
      ? [teachers, teachers === 1 ? "Course instructor" : "Course instructors"]
      : FALLBACK[2],
    FALLBACK[3],
  ]
  return (
    <ul
      className="sn-stats"
      aria-label="Learning with Prahit"
      aria-busy={loading || undefined}
    >
      {items.map(([value, label], index) => (
        <li key={label}>
          {loading && index < 3 ? (
            <span className="sn-stats-pending" aria-hidden="true" />
          ) : (
            <strong>{value}</strong>
          )}
          <span>{label}</span>
        </li>
      ))}
    </ul>
  )
}
