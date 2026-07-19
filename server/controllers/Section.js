const Section = require("../models/Section")
const Course = require("../models/Course")
const SubSection = require("../models/Subsection")
const CourseProgress = require("../models/CourseProgress")
const Purchase = require("../models/Purchase")
const { deleteAssetFromCloudinary } = require("../utils/imageUploader")
const { unpublishIfIncomplete } = require("../utils/courseLifecycle")
const { sanitizeInstructorCourse } = require("../utils/courseDto")
const mongoose = require("mongoose")
// CREATE a new section
exports.createSection = async (req, res) => {
  try {
    // Extract the required properties from the request body
    const { courseId } = req.body
    const sectionName =
      typeof req.body.sectionName === "string" ? req.body.sectionName.trim() : ""

    // Validate the input
    if (
      !sectionName ||
      sectionName.length > 200 ||
      !mongoose.isValidObjectId(courseId)
    ) {
      return res.status(400).json({
        success: false,
        message: "Missing required properties",
      })
    }

    const ownedCourse = await Course.findOne({
      _id: courseId,
      instructor: req.user.id,
    }).select("_id status")

    if (!ownedCourse) {
      return res.status(403).json({
        success: false,
        message: "You are not allowed to modify this course",
      })
    }
    if (ownedCourse.status === "Archived") {
      return res.status(409).json({
        success: false,
        message: "Archived courses cannot be modified",
      })
    }

    // Create a new section with the given name
    const newSection = await Section.create({ sectionName })

    // Add the new section to the course's content array
    let updatedCourse
    try {
      updatedCourse = await Course.findOneAndUpdate(
        {
          _id: courseId,
          instructor: req.user.id,
          status: { $ne: "Archived" },
        },
        {
          $addToSet: { courseContent: newSection._id },
          // A newly-created section is empty, so a Published course is no
          // longer publish-ready. Keeping Draft courses as Draft is harmless
          // and makes this status transition atomic with the new relation.
          $set: {
            ...(ownedCourse.status === "Published"
              ? { everPublishedAt: new Date() }
              : {}),
            status: "Draft",
          },
        },
        { new: true }
      )
        .populate({
          path: "courseContent",
          populate: { path: "subSection" },
        })
        .exec()
      if (!updatedCourse) throw new Error("The parent course no longer exists")
    } catch (error) {
      await Section.findByIdAndDelete(newSection._id).catch(() => false)
      throw error
    }

    // Return the updated course object in the response
    res.status(200).json({
      success: true,
      message: "Section created successfully",
      updatedCourse: sanitizeInstructorCourse(updatedCourse),
    })
  } catch (error) {
    console.error("Section creation failed:", error.message)
    res.status(500).json({
      success: false,
      message: "Section could not be created",
    })
  }
}

// UPDATE a section
exports.updateSection = async (req, res) => {
  try {
    const { sectionId, courseId } = req.body
    const sectionName =
      typeof req.body.sectionName === "string" ? req.body.sectionName.trim() : ""

    if (
      !sectionName ||
      sectionName.length > 200 ||
      !mongoose.isValidObjectId(sectionId) ||
      !mongoose.isValidObjectId(courseId)
    ) {
      return res.status(400).json({
        success: false,
        message: "Missing required properties",
      })
    }

    const ownedCourse = await Course.findOne({
      _id: courseId,
      instructor: req.user.id,
      courseContent: sectionId,
    }).select("_id everPublishedAt status studentsEnroled")

    if (!ownedCourse) {
      return res.status(403).json({
        success: false,
        message: "You are not allowed to modify this section",
      })
    }
    if (ownedCourse.status === "Archived") {
      return res.status(409).json({
        success: false,
        message: "Archived courses cannot be modified",
      })
    }

    const section = await Section.findByIdAndUpdate(
      sectionId,
      { sectionName },
      { new: true, runValidators: true }
    )
    if (!section) {
      return res.status(404).json({ success: false, message: "Section not found" })
    }
    const course = await Course.findById(courseId)
      .populate({
        path: "courseContent",
        populate: {
          path: "subSection",
        },
      })
      .exec()
    res.status(200).json({
      success: true,
      message: "Section updated successfully",
      data: sanitizeInstructorCourse(course),
    })
  } catch (error) {
    console.error("Section update failed:", error.message)
    res.status(500).json({
      success: false,
      message: "Section could not be updated",
    })
  }
}

// DELETE a section
exports.deleteSection = async (req, res) => {
  try {
    const { sectionId, courseId } = req.body

    if (!mongoose.isValidObjectId(sectionId) || !mongoose.isValidObjectId(courseId)) {
      return res.status(400).json({
        success: false,
        message: "Missing required properties",
      })
    }

    const ownedCourse = await Course.findOne({
      _id: courseId,
      instructor: req.user.id,
      courseContent: sectionId,
    }).select("_id everPublishedAt status studentsEnroled")

    if (!ownedCourse) {
      return res.status(403).json({
        success: false,
        message: "You are not allowed to delete this section",
      })
    }

    if (
      ownedCourse.status !== "Draft" ||
      ownedCourse.everPublishedAt ||
      (ownedCourse.studentsEnroled || []).length ||
      (await Purchase.exists({
        courses: ownedCourse._id,
        status: {
          $in: [
            "created",
            "order_created",
            "paid",
            "fulfilled",
            "payment_review",
          ],
        },
      }))
    ) {
      return res.status(409).json({
        success: false,
        message:
          "Only never-published draft courses with no enrollments or active purchases can remove lessons",
      })
    }

    const section = await Section.findById(sectionId)
    if (!section) {
      return res.status(404).json({
        success: false,
        message: "Section not found",
      })
    }
    // Delete the associated subsections
    const subSections = await SubSection.find({
      _id: { $in: section.subSection },
    }).select("+videoDeliveryType +videoPublicId")

    await Promise.all([
      Course.findByIdAndUpdate(courseId, {
        $pull: { courseContent: sectionId },
      }),
      SubSection.deleteMany({ _id: { $in: section.subSection } }),
      Section.findByIdAndDelete(sectionId),
      CourseProgress.updateMany(
        { completedVideos: { $in: section.subSection } },
        { $pull: { completedVideos: { $in: section.subSection } } }
      ),
    ])
    await unpublishIfIncomplete(courseId)
    await Promise.allSettled(
      subSections
        .filter((subSection) => subSection.videoPublicId)
        .map((subSection) =>
          deleteAssetFromCloudinary(
            subSection.videoPublicId,
            "video",
            subSection.videoDeliveryType || "upload"
          )
        )
    )

    // find the updated course and return it
    const course = await Course.findById(courseId)
      .populate({
        path: "courseContent",
        populate: {
          path: "subSection",
        },
      })
      .exec()

    res.status(200).json({
      success: true,
      message: "Section deleted",
      data: sanitizeInstructorCourse(course),
    })
  } catch (error) {
    console.error("Section deletion failed:", error.message)
    res.status(500).json({
      success: false,
      message: "Section could not be deleted",
    })
  }
}
