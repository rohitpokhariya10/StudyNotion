export const getFirstLessonPath = (course) => {
  if (!course?._id || !Array.isArray(course.courseContent)) return null

  const section = course.courseContent.find(
    (candidate) =>
      candidate?._id &&
      Array.isArray(candidate.subSection) &&
      candidate.subSection.some((lesson) => lesson?._id)
  )
  const lesson = section?.subSection.find((candidate) => candidate?._id)

  if (!section?._id || !lesson?._id) return null

  return `/view-course/${encodeURIComponent(
    course._id
  )}/section/${encodeURIComponent(section._id)}/sub-section/${encodeURIComponent(
    lesson._id
  )}`
}
