const idOf = (value) => {
  const id = value?._id?.toString?.() || value?.toString?.() || ""
  return /^[a-f\d]{24}$/i.test(id) ? id.toLowerCase() : id
}

const text = (value) => (typeof value === "string" ? value.trim() : "")

const label = (value, fallback) => text(value) || fallback

const durationSeconds = (value) => {
  const duration = Number(value)
  return Number.isFinite(duration) && duration > 0
    ? Math.min(Math.round(duration), 31_536_000)
    : 0
}

const isoDateTime = (value) => {
  if (!value) return null
  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}

const mapLearningCurriculum = ({ course, lessons = [], sections = [] }) => {
  const sectionsById = new Map(
    sections.map((section) => [idOf(section), section]).filter(([id]) => id)
  )
  const lessonsById = new Map(
    lessons.map((lesson) => [idOf(lesson), lesson]).filter(([id]) => id)
  )
  const seenSectionIds = new Set()
  const seenLessonIds = new Set()
  const curriculum = []

  for (const sectionReference of course?.courseContent || []) {
    const sectionId = idOf(sectionReference)
    if (!sectionId || seenSectionIds.has(sectionId)) continue
    seenSectionIds.add(sectionId)

    const section = sectionsById.get(sectionId)
    if (!section) continue

    const mappedLessons = []
    for (const lessonReference of section.subSection || []) {
      const lessonId = idOf(lessonReference)
      if (!lessonId || seenLessonIds.has(lessonId)) continue
      const lesson = lessonsById.get(lessonId)
      if (!lesson) continue

      seenLessonIds.add(lessonId)
      mappedLessons.push({
        id: lessonId,
        title: label(lesson.title, "Untitled lesson"),
        description: text(lesson.description),
        durationSeconds: durationSeconds(lesson.timeDuration),
      })
    }

    curriculum.push({
      id: sectionId,
      name: label(section.sectionName, "Untitled section"),
      lessons: mappedLessons,
    })
  }

  return curriculum
}

const curriculumLessonIds = (curriculum = []) =>
  curriculum.flatMap((section) =>
    (section.lessons || []).map((lesson) => lesson.id)
  )

const mapLearningProgress = ({ courseId, curriculum, progress }) => {
  const validLessonIds = curriculumLessonIds(curriculum)
  const storedCompletedIds = new Set(
    (progress?.completedVideos || []).map((lessonId) => idOf(lessonId))
  )
  const completedLessonIds = validLessonIds.filter((lessonId) =>
    storedCompletedIds.has(lessonId)
  )
  const completedCount = completedLessonIds.length
  const totalLessons = validLessonIds.length

  return {
    courseId: idOf(courseId),
    completedLessonIds,
    completedCount,
    totalLessons,
    progressPercent: totalLessons
      ? Math.round((completedCount / totalLessons) * 10_000) / 100
      : 0,
    updatedAt: isoDateTime(progress?.updatedAt),
  }
}

const mapLearningCourseState = ({ course, curriculum, progress }) => ({
  course: {
    id: idOf(course),
    name: label(course?.courseName, "Untitled course"),
    thumbnailUrl: text(course?.thumbnail) || null,
  },
  curriculum,
  progress: mapLearningProgress({
    courseId: course?._id,
    curriculum,
    progress,
  }),
})

module.exports = {
  curriculumLessonIds,
  mapLearningCourseState,
  mapLearningCurriculum,
  mapLearningProgress,
}
