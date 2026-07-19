const Course = require("../models/Course")
const Section = require("../models/Section")
const SubSection = require("../models/Subsection")

const normalizeIds = (values = []) =>
  [...new Set(values.filter(Boolean).map((value) => value.toString()))]

const validRequiredText = (value, maxLength) =>
  typeof value === "string" &&
  Boolean(value.trim()) &&
  value.trim().length <= maxLength

const isLessonPublishReady = (lesson) => {
  const duration = Number(lesson.timeDuration)
  return (
    validRequiredText(lesson.title, 200) &&
    validRequiredText(lesson.description, 5000) &&
    validRequiredText(lesson.videoUrl, 2048) &&
    /^https:\/\//i.test(lesson.videoUrl.trim()) &&
    validRequiredText(lesson.videoPublicId, 500) &&
    validRequiredText(lesson.videoFormat, 20) &&
    lesson.videoDeliveryType === "authenticated" &&
    Number.isFinite(duration) &&
    duration > 0 &&
    duration <= 86_400
  )
}

const isCoursePublishReady = async (courseContent = []) => {
  const sectionIds = normalizeIds(courseContent)
  if (!sectionIds.length) return false

  const sections = await Section.find({ _id: { $in: sectionIds } })
    .select("_id subSection")
    .lean()
  if (sections.length !== sectionIds.length) return false

  const subsectionIds = normalizeIds(
    sections.flatMap((section) => section.subSection || [])
  )
  if (!subsectionIds.length) return false
  if (sections.some((section) => !(section.subSection || []).length)) return false

  const realSubsections = await SubSection.find({
    _id: { $in: subsectionIds },
  })
    .select(
      "_id title description timeDuration videoUrl +videoPublicId +videoFormat +videoDeliveryType"
    )
    .lean()
  const realIds = new Set(
    realSubsections
      .filter(isLessonPublishReady)
      .map((subsection) => subsection._id.toString())
  )

  return sections.every((section) =>
    (section.subSection || []).every((subsectionId) =>
      realIds.has(subsectionId.toString())
    )
  )
}

const unpublishIfIncomplete = async (courseId) => {
  const course = await Course.findById(courseId).select(
    "courseContent everPublishedAt status"
  )
  if (!course || course.status !== "Published") return false
  if (await isCoursePublishReady(course.courseContent)) return false

  await Course.updateOne(
    { _id: course._id, status: "Published" },
    {
      $set: {
        everPublishedAt: course.everPublishedAt || new Date(),
        status: "Draft",
      },
    }
  )
  return true
}

module.exports = {
  isCoursePublishReady,
  isLessonPublishReady,
  unpublishIfIncomplete,
}
