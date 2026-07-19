const mongoose = require("mongoose")

const User = require("../models/User")

const INSTRUCTOR_FIELDS = [
  "firstName",
  "lastName",
  "email",
  "image",
  "active",
  "approved",
  "instructorApprovalStatus",
  "instructorReviewedAt",
  "createdAt",
  "additionalDetails",
  "+instructorReviewedBy",
  "+instructorReviewNote",
].join(" ")
const MAX_PAGE_SIZE = 100
const MAX_PAGE = 1_000_000
const MAX_REVIEW_NOTE_LENGTH = 1000

const pendingInstructorFilter = () => ({
  accountType: "Instructor",
  active: { $ne: false },
  approved: false,
  $or: [
    { instructorApprovalStatus: "Pending" },
    { instructorApprovalStatus: { $exists: false } },
  ],
})

const parsePositiveInteger = (value, fallback, max = Number.MAX_SAFE_INTEGER) => {
  if (value === undefined || value === "") return fallback
  if (!/^\d+$/.test(String(value))) return null
  const parsed = Number(value)
  return Number.isSafeInteger(parsed) && parsed >= 1 && parsed <= max
    ? parsed
    : null
}

const normalizeReviewNote = (value) =>
  typeof value === "string" ? value.trim() : ""

const deriveApprovalStatus = (instructor) => {
  if (instructor.instructorApprovalStatus) {
    return instructor.instructorApprovalStatus
  }
  if (instructor.approved) return "Approved"
  return instructor.active === false ? "Rejected" : "Pending"
}

const findInstructor = (instructorId) =>
  User.findOne({ _id: instructorId, accountType: "Instructor" })
    .select(INSTRUCTOR_FIELDS)
    .populate({
      path: "additionalDetails",
      select: "about contactNumber",
    })
    .lean()

exports.listPendingInstructors = async (req, res) => {
  const page = parsePositiveInteger(req.query?.page, 1, MAX_PAGE)
  const limit = parsePositiveInteger(req.query?.limit, 20, MAX_PAGE_SIZE)

  if (!page || !limit) {
    return res.status(400).json({
      success: false,
      message: `page and limit must be positive integers; page cannot exceed ${MAX_PAGE} and limit cannot exceed ${MAX_PAGE_SIZE}`,
    })
  }

  try {
    const filter = pendingInstructorFilter()
    const [instructors, total] = await Promise.all([
      User.find(filter)
        .select(INSTRUCTOR_FIELDS)
        .populate({
          path: "additionalDetails",
          select: "about contactNumber",
        })
        .sort({ createdAt: 1, _id: 1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      User.countDocuments(filter),
    ])

    return res.status(200).json({
      success: true,
      data: {
        instructors,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      },
    })
  } catch (error) {
    console.error("Unable to list pending instructors:", error.message)
    return res.status(500).json({
      success: false,
      message: "Pending instructors could not be loaded",
    })
  }
}

const reviewInstructor = (decision) => async (req, res) => {
  const { instructorId } = req.params
  const note = normalizeReviewNote(
    decision === "Rejected" ? req.body?.reason : req.body?.note
  )

  if (!mongoose.isValidObjectId(instructorId)) {
    return res.status(400).json({
      success: false,
      message: "A valid instructorId is required",
    })
  }
  if (note.length > MAX_REVIEW_NOTE_LENGTH) {
    return res.status(400).json({
      success: false,
      message: `Review notes cannot exceed ${MAX_REVIEW_NOTE_LENGTH} characters`,
    })
  }
  if (decision === "Rejected" && note.length < 3) {
    return res.status(400).json({
      success: false,
      message: "A rejection reason of at least 3 characters is required",
    })
  }

  try {
    const instructor = await findInstructor(instructorId)
    if (!instructor) {
      return res.status(404).json({
        success: false,
        message: "Instructor application not found",
      })
    }

    const currentStatus = deriveApprovalStatus(instructor)
    if (currentStatus === decision) {
      return res.status(200).json({
        success: true,
        message: `Instructor is already ${decision.toLowerCase()}`,
        data: { instructor },
      })
    }
    if (currentStatus !== "Pending") {
      return res.status(409).json({
        success: false,
        message: `A ${currentStatus.toLowerCase()} application cannot be changed`,
      })
    }

    const reviewedAt = new Date()
    const approved = decision === "Approved"
    const updatedInstructor = await User.findOneAndUpdate(
      {
        _id: instructorId,
        accountType: "Instructor",
        active: { $ne: false },
        approved: false,
        $or: [
          { instructorApprovalStatus: "Pending" },
          { instructorApprovalStatus: { $exists: false } },
        ],
      },
      {
        $set: {
          active: approved,
          approved,
          instructorApprovalStatus: decision,
          instructorReviewedAt: reviewedAt,
          instructorReviewedBy: req.user.id,
          instructorReviewNote: note,
        },
        $inc: { sessionVersion: 1 },
      },
      { new: true, runValidators: true }
    )
      .select(INSTRUCTOR_FIELDS)
      .populate({
        path: "additionalDetails",
        select: "about contactNumber",
      })
      .lean()

    if (!updatedInstructor) {
      const concurrentlyReviewed = await findInstructor(instructorId)
      if (deriveApprovalStatus(concurrentlyReviewed || {}) === decision) {
        return res.status(200).json({
          success: true,
          message: `Instructor is already ${decision.toLowerCase()}`,
          data: { instructor: concurrentlyReviewed },
        })
      }
      return res.status(409).json({
        success: false,
        message: "This instructor application was reviewed by another admin",
      })
    }

    return res.status(200).json({
      success: true,
      message: approved
        ? "Instructor approved successfully"
        : "Instructor application rejected",
      data: { instructor: updatedInstructor },
    })
  } catch (error) {
    console.error(`Unable to mark instructor as ${decision}:`, error.message)
    return res.status(500).json({
      success: false,
      message: "Instructor application could not be reviewed",
    })
  }
}

exports.approveInstructor = reviewInstructor("Approved")
exports.rejectInstructor = reviewInstructor("Rejected")
