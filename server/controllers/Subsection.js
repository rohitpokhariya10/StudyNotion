const Course = require("../models/Course")
const Section = require("../models/Section")
const SubSection = require("../models/Subsection")
const CourseProgress = require("../models/CourseProgress")
const Purchase = require("../models/Purchase")
const mongoose = require("mongoose")
const {
  MediaUploadError,
  deleteAssetFromCloudinary,
  uploadImageToCloudinary,
} = require("../utils/imageUploader")
const { unpublishIfIncomplete } = require("../utils/courseLifecycle")

const courseVideoFolder = () =>
  `${process.env.FOLDER_NAME || "studynotion"}/course-videos`

const readText = (value, maxLength) => {
  if (typeof value !== "string") return null
  const normalized = value.trim()
  return normalized && normalized.length <= maxLength ? normalized : null
}

const findOwnedSection = async (userId, sectionId, subSectionId) => {
  const sectionQuery = { _id: sectionId }
  if (subSectionId) sectionQuery.subSection = subSectionId

  const [ownedCourse, parentSection] = await Promise.all([
    Course.findOne({ instructor: userId, courseContent: sectionId }).select(
      "_id everPublishedAt status studentsEnroled"
    ),
    Section.findOne(sectionQuery).select("_id"),
  ])
  return ownedCourse && parentSection ? ownedCourse : null
}

exports.createSubSection = async (req, res) => {
  let createdSubSection
  let uploadDetails
  let relationSaved = false

  try {
    const { sectionId } = req.body
    const title = readText(req.body.title, 200)
    const description = readText(req.body.description, 5000)
    const video = req.files?.video

    if (!mongoose.isValidObjectId(sectionId) || !title || !description || !video) {
      return res.status(400).json({
        success: false,
        message: "Section, title, description, and video are required",
      })
    }
    const ownedCourse = await findOwnedSection(req.user.id, sectionId)
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

    uploadDetails = await uploadImageToCloudinary(video, courseVideoFolder(), {
      deliveryType: "authenticated",
      resourceType: "video",
    })

    createdSubSection = await SubSection.create({
      description,
      timeDuration: `${uploadDetails.duration || 0}`,
      title,
      videoDeliveryType: "authenticated",
      videoFormat: uploadDetails.format,
      videoPublicId: uploadDetails.public_id,
      videoUrl: uploadDetails.secure_url,
    })

    const updatedSection = await Section.findByIdAndUpdate(
      sectionId,
      { $push: { subSection: createdSubSection._id } },
      { new: true }
    ).populate("subSection")
    if (!updatedSection) throw new Error("The parent section no longer exists")
    relationSaved = true

    return res.status(201).json({ success: true, data: updatedSection })
  } catch (error) {
    if (!relationSaved) {
      if (createdSubSection?._id) {
        await SubSection.findByIdAndDelete(createdSubSection._id).catch(() => false)
      }
      if (uploadDetails?.public_id) {
        await deleteAssetFromCloudinary(
          uploadDetails.public_id,
          "video",
          "authenticated"
        ).catch(() => false)
      }
    }
    if (error instanceof MediaUploadError) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
      })
    }
    console.error("Subsection creation failed:", error.message)
    return res.status(500).json({
      success: false,
      message: "The lesson could not be created",
    })
  }
}

exports.updateSubSection = async (req, res) => {
  let previousVideo
  let replacementVideo
  let replacementSaved = false

  try {
    const { sectionId, subSectionId } = req.body
    const hasTitle = Object.prototype.hasOwnProperty.call(req.body, "title")
    const hasDescription = Object.prototype.hasOwnProperty.call(
      req.body,
      "description"
    )
    const title = hasTitle ? readText(req.body.title, 200) : undefined
    const description = hasDescription
      ? readText(req.body.description, 5000)
      : undefined
    const video = req.files?.video

    if (
      !mongoose.isValidObjectId(sectionId) ||
      !mongoose.isValidObjectId(subSectionId) ||
      (!hasTitle && !hasDescription && !video)
    ) {
      return res.status(400).json({
        success: false,
        message: "Section, subsection, and at least one update are required",
      })
    }
    if ((hasTitle && !title) || (hasDescription && !description)) {
      return res.status(400).json({
        success: false,
        message: "The lesson title or description is invalid",
      })
    }
    const ownedCourse = await findOwnedSection(
      req.user.id,
      sectionId,
      subSectionId
    )
    if (!ownedCourse) {
      return res.status(403).json({
        success: false,
        message: "You are not allowed to modify this subsection",
      })
    }
    if (ownedCourse.status === "Archived") {
      return res.status(409).json({
        success: false,
        message: "Archived courses cannot be modified",
      })
    }

    const subSection = await SubSection.findById(subSectionId).select(
      "+videoDeliveryType +videoFormat +videoPublicId"
    )
    if (!subSection) {
      return res.status(404).json({ success: false, message: "Lesson not found" })
    }

    if (hasTitle) subSection.title = title
    if (hasDescription) subSection.description = description
    if (video) {
      previousVideo = {
        deliveryType: subSection.videoDeliveryType || "upload",
        publicId: subSection.videoPublicId,
      }
      replacementVideo = await uploadImageToCloudinary(video, courseVideoFolder(), {
        deliveryType: "authenticated",
        resourceType: "video",
      })
      subSection.videoDeliveryType = "authenticated"
      subSection.videoFormat = replacementVideo.format
      subSection.videoPublicId = replacementVideo.public_id
      subSection.videoUrl = replacementVideo.secure_url
      subSection.timeDuration = `${replacementVideo.duration || 0}`
    }

    await subSection.save()
    replacementSaved = true

    if (previousVideo?.publicId) {
      deleteAssetFromCloudinary(
        previousVideo.publicId,
        "video",
        previousVideo.deliveryType
      ).catch((error) =>
        console.error("Previous course video cleanup failed:", error.message)
      )
    }

    const updatedSection = await Section.findById(sectionId).populate("subSection")
    return res.status(200).json({
      success: true,
      message: "Lesson updated successfully",
      data: updatedSection,
    })
  } catch (error) {
    if (replacementVideo && !replacementSaved) {
      await deleteAssetFromCloudinary(
        replacementVideo.public_id,
        "video",
        "authenticated"
      ).catch(() => false)
    }
    if (error instanceof MediaUploadError) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
      })
    }
    console.error("Subsection update failed:", error.message)
    return res.status(500).json({
      success: false,
      message: "The lesson could not be updated",
    })
  }
}

exports.deleteSubSection = async (req, res) => {
  try {
    const { sectionId, subSectionId } = req.body
    if (
      !mongoose.isValidObjectId(sectionId) ||
      !mongoose.isValidObjectId(subSectionId)
    ) {
      return res.status(400).json({
        success: false,
        message: "Section and subsection IDs are required",
      })
    }
    const ownedCourse = await findOwnedSection(
      req.user.id,
      sectionId,
      subSectionId
    )
    if (!ownedCourse) {
      return res.status(403).json({
        success: false,
        message: "You are not allowed to delete this subsection",
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

    const subSection = await SubSection.findById(subSectionId).select(
      "+videoDeliveryType +videoPublicId"
    )
    if (!subSection) {
      return res.status(404).json({ success: false, message: "Lesson not found" })
    }

    await Promise.all([
      Section.findByIdAndUpdate(sectionId, { $pull: { subSection: subSectionId } }),
      SubSection.findByIdAndDelete(subSectionId),
      CourseProgress.updateMany(
        { completedVideos: subSectionId },
        { $pull: { completedVideos: subSectionId } }
      ),
    ])
    await unpublishIfIncomplete(ownedCourse._id)
    if (subSection.videoPublicId) {
      await deleteAssetFromCloudinary(
        subSection.videoPublicId,
        "video",
        subSection.videoDeliveryType || "upload"
      ).catch((error) =>
        console.error("Course video cleanup failed:", error.message)
      )
    }

    const updatedSection = await Section.findById(sectionId).populate("subSection")
    return res.status(200).json({
      success: true,
      message: "Lesson deleted successfully",
      data: updatedSection,
    })
  } catch (error) {
    console.error("Subsection deletion failed:", error.message)
    return res.status(500).json({
      success: false,
      message: "The lesson could not be deleted",
    })
  }
}
