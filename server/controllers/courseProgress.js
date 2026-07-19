const mongoose = require("mongoose")
const Section = require("../models/Section")
const CourseProgress = require("../models/CourseProgress")
const Course = require("../models/Course")

exports.updateCourseProgress = async (req, res) => {
  const { courseId, subsectionId } = req.body
  const userId = req.user.id

  try {
    if (
      !mongoose.isValidObjectId(courseId) ||
      !mongoose.isValidObjectId(subsectionId)
    ) {
      return res.status(400).json({
        success: false,
        message: "A valid course and subsection are required",
      })
    }

    const course = await Course.findOne({
      _id: courseId,
      studentsEnroled: userId,
    })
      .select("courseContent")
      .lean()

    if (!course) {
      return res.status(403).json({
        success: false,
        message: "You are not enrolled in this course",
      })
    }

    const subsectionBelongsToCourse = await Section.exists({
      _id: { $in: course.courseContent },
      subSection: subsectionId,
    })

    if (!subsectionBelongsToCourse) {
      return res.status(404).json({
        success: false,
        message: "Subsection does not belong to this course",
      })
    }

    const courseProgress = await CourseProgress.findOneAndUpdate(
      { courseID: courseId, userId },
      { $addToSet: { completedVideos: subsectionId } },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    )

    return res.status(200).json({
      success: true,
      message: "Course progress updated",
      data: courseProgress,
    })
  } catch (error) {
    console.error("Course progress update failed:", error.message)
    return res.status(500).json({
      success: false,
      message: "Unable to update course progress",
    })
  }
}

// exports.getProgressPercentage = async (req, res) => {
//   const { courseId } = req.body
//   const userId = req.user.id

//   if (!courseId) {
//     return res.status(400).json({ error: "Course ID not provided." })
//   }

//   try {
//     // Find the course progress document for the user and course
//     let courseProgress = await CourseProgress.findOne({
//       courseID: courseId,
//       userId: userId,
//     })
//       .populate({
//         path: "courseID",
//         populate: {
//           path: "courseContent",
//         },
//       })
//       .exec()

//     if (!courseProgress) {
//       return res
//         .status(400)
//         .json({ error: "Can not find Course Progress with these IDs." })
//     }
//     console.log(courseProgress, userId)
//     let lectures = 0
//     courseProgress.courseID.courseContent?.forEach((sec) => {
//       lectures += sec.subSection.length || 0
//     })

//     let progressPercentage =
//       (courseProgress.completedVideos.length / lectures) * 100

//     // To make it up to 2 decimal point
//     const multiplier = Math.pow(10, 2)
//     progressPercentage =
//       Math.round(progressPercentage * multiplier) / multiplier

//     return res.status(200).json({
//       data: progressPercentage,
//       message: "Succesfully fetched Course progress",
//     })
//   } catch (error) {
//     console.error(error)
//     return res.status(500).json({ error: "Internal server error" })
//   }
// }
