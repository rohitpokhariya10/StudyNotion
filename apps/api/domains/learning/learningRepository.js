const Course = require("../../models/Course")
const CourseProgress = require("../../models/CourseProgress")
const Section = require("../../models/Section")
const SubSection = require("../../models/Subsection")

const COURSE_PROJECTION = "_id courseName thumbnail courseContent"
const PROGRESS_PROJECTION = "courseID completedVideos updatedAt"

const uniqueIds = (values = []) => [
  ...new Set((values || []).filter(Boolean).map((value) => value.toString())),
]

const findEntitledCourse = ({ courseId, userId }) =>
  Course.findOne({ _id: courseId, studentsEnroled: userId })
    .select(COURSE_PROJECTION)
    .lean()

const courseExists = async ({ courseId }) =>
  Boolean(await Course.exists({ _id: courseId }))

const findCurriculum = async ({ sectionIds }) => {
  const orderedSectionIds = uniqueIds(sectionIds)
  if (!orderedSectionIds.length) return { lessons: [], sections: [] }

  const sections = await Section.find({ _id: { $in: orderedSectionIds } })
    .select("_id sectionName subSection")
    .lean()
  const lessonIds = uniqueIds(
    sections.flatMap((section) => section.subSection || [])
  )
  const lessons = lessonIds.length
    ? await SubSection.find({ _id: { $in: lessonIds } })
        .select("_id title description timeDuration")
        .lean()
    : []

  return { lessons, sections }
}

const findCourseProgress = ({ courseId, userId }) =>
  CourseProgress.findOne({ courseID: courseId, userId })
    .select(PROGRESS_PROJECTION)
    .lean()

const updateCompletedLesson = ({ courseId, lessonId, userId, upsert }) =>
  CourseProgress.findOneAndUpdate(
    { courseID: courseId, userId },
    { $addToSet: { completedVideos: lessonId } },
    {
      returnDocument: "after",
      setDefaultsOnInsert: true,
      upsert,
    }
  )
    .select(PROGRESS_PROJECTION)
    .lean()

const markLessonComplete = async ({ courseId, lessonId, userId }) => {
  try {
    return await updateCompletedLesson({
      courseId,
      lessonId,
      userId,
      upsert: true,
    })
  } catch (error) {
    // Two first-time retries may race on the unique user/course index. The
    // winning insert is authoritative; retry the idempotent set without an
    // upsert so the losing request returns the same canonical progress.
    if (error?.code !== 11000) throw error
    return updateCompletedLesson({
      courseId,
      lessonId,
      userId,
      upsert: false,
    })
  }
}

module.exports = {
  courseExists,
  findCourseProgress,
  findCurriculum,
  findEntitledCourse,
  markLessonComplete,
}
