const bcrypt = require("bcryptjs")
const crypto = require("crypto")

const Course = require("../models/Course")
const CourseProgress = require("../models/CourseProgress")
const OTP = require("../models/OTP")
const Profile = require("../models/Profile")
const Purchase = require("../models/Purchase")
const RatingAndReview = require("../models/RatingandReview")
const User = require("../models/User")
const { clearSession } = require("../utils/auth")
const { verifyGoogleIdToken } = require("../utils/googleIdentity")
const {
  MediaUploadError,
  deleteAssetFromCloudinary,
  uploadImageToCloudinary,
} = require("../utils/imageUploader")
const { convertSecondsToDuration } = require("../utils/secToDuration")
const {
  isPasswordWithinBcryptLimit,
  isValidEmail,
  normalizeEmail,
} = require("../utils/validation")
const { releaseStaleCheckoutLocks } = require("../utils/purchaseLifecycle")

const GOOGLE_REAUTH_MAX_AGE_MS = 5 * 60 * 1000

const ALLOWED_GENDERS = new Set([
  "Female",
  "Male",
  "Non-Binary",
  "Other",
  "Prefer not to say",
])
const CONTROL_CHARACTERS = /[\u0000-\u001F\u007F]/

class ProfileValidationError extends Error {}

const hasOwn = (object, key) => Object.prototype.hasOwnProperty.call(object, key)

const readString = (value, field, { allowEmpty = false, maxLength }) => {
  if (typeof value !== "string") {
    throw new ProfileValidationError(`${field} must be text`)
  }
  const normalized = value.trim()
  if ((!allowEmpty && !normalized) || normalized.length > maxLength) {
    throw new ProfileValidationError(`${field} is invalid`)
  }
  if (CONTROL_CHARACTERS.test(normalized)) {
    throw new ProfileValidationError(`${field} contains invalid characters`)
  }
  return normalized
}

const readDateOfBirth = (value) => {
  const normalized = readString(value, "Date of birth", {
    allowEmpty: true,
    maxLength: 10,
  })
  if (!normalized) return null
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    throw new ProfileValidationError("Date of birth must use YYYY-MM-DD")
  }

  const [year, month, day] = normalized.split("-").map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))
  const today = new Date()
  const todayUtc = Date.UTC(
    today.getUTCFullYear(),
    today.getUTCMonth(),
    today.getUTCDate()
  )
  if (
    year < 1900 ||
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day ||
    date.getTime() > todayUtc
  ) {
    throw new ProfileValidationError("Date of birth is invalid")
  }
  return normalized
}

const readContactNumber = (value) => {
  const normalized = readString(value, "Contact number", {
    allowEmpty: true,
    maxLength: 30,
  }).replace(/[\s()-]/g, "")
  if (!normalized) return null
  if (!/^\+?[1-9]\d{7,14}$/.test(normalized)) {
    throw new ProfileValidationError("Contact number is invalid")
  }
  return normalized
}

const buildProfileUpdates = (body = {}) => {
  const user = {}
  const profile = {}

  if (hasOwn(body, "firstName")) {
    user.firstName = readString(body.firstName, "First name", { maxLength: 80 })
  }
  if (hasOwn(body, "lastName")) {
    user.lastName = readString(body.lastName, "Last name", { maxLength: 80 })
  }
  if (hasOwn(body, "dateOfBirth")) {
    profile.dateOfBirth = readDateOfBirth(body.dateOfBirth)
  }
  if (hasOwn(body, "about")) {
    profile.about = readString(body.about, "About", {
      allowEmpty: true,
      maxLength: 1000,
    })
  }
  if (hasOwn(body, "contactNumber")) {
    profile.contactNumber = readContactNumber(body.contactNumber)
  }
  if (hasOwn(body, "gender")) {
    const gender = readString(body.gender, "Gender", {
      allowEmpty: true,
      maxLength: 40,
    })
    if (gender && !ALLOWED_GENDERS.has(gender)) {
      throw new ProfileValidationError("Gender is invalid")
    }
    profile.gender = gender || null
  }

  if (!Object.keys(user).length && !Object.keys(profile).length) {
    throw new ProfileValidationError("No supported profile fields were provided")
  }
  return { profile, user }
}

const buildEnrolledCourseDto = (course, completedVideos = new Set()) => {
  let totalDurationInSeconds = 0
  const subsectionIds = []
  const courseContent = (course.courseContent || []).map((section) => ({
    _id: section._id,
    sectionName: section.sectionName,
    subSection: (section.subSection || []).map((subsection) => {
      const duration = Number.parseFloat(subsection.timeDuration)
      if (Number.isFinite(duration) && duration > 0) {
        totalDurationInSeconds += duration
      }
      subsectionIds.push(subsection._id.toString())
      return {
        _id: subsection._id,
        description: subsection.description,
        timeDuration: subsection.timeDuration,
        title: subsection.title,
      }
    }),
  }))
  const completedCount = subsectionIds.filter((id) => completedVideos.has(id)).length

  return {
    _id: course._id,
    courseContent,
    courseDescription: course.courseDescription,
    courseName: course.courseName,
    progressPercentage: subsectionIds.length
      ? Math.round((completedCount / subsectionIds.length) * 10000) / 100
      : 0,
    thumbnail: course.thumbnail,
    totalDuration: convertSecondsToDuration(totalDurationInSeconds),
  }
}

exports.updateProfile = async (req, res) => {
  try {
    const updates = buildProfileUpdates(req.body)
    const user = await User.findById(req.user.id).select("additionalDetails")
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" })
    }

    let profile = null
    if (user.additionalDetails) {
      profile = Object.keys(updates.profile).length
        ? await Profile.findByIdAndUpdate(
            user.additionalDetails,
            { $set: updates.profile },
            { new: true, runValidators: true }
          )
        : await Profile.findById(user.additionalDetails)
    }

    let createdProfileId
    if (!profile) {
      profile = await Profile.create(updates.profile)
      createdProfileId = profile._id
      updates.user.additionalDetails = profile._id
    }

    try {
      if (Object.keys(updates.user).length) {
        await User.findByIdAndUpdate(
          user._id,
          { $set: updates.user },
          { runValidators: true }
        )
      }
    } catch (error) {
      if (createdProfileId) await Profile.findByIdAndDelete(createdProfileId)
      throw error
    }

    const updatedUserDetails = await User.findById(user._id)
      .populate("additionalDetails")
      .exec()

    return res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      updatedUserDetails,
    })
  } catch (error) {
    if (error instanceof ProfileValidationError) {
      return res.status(400).json({ success: false, message: error.message })
    }
    console.error("Profile update failed:", error.message)
    return res.status(500).json({
      success: false,
      message: "Profile could not be updated",
    })
  }
}

exports.deleteAccount = async (req, res) => {
  let deletionLockAcquired = false
  let deletionLockId
  let deletionUserId
  try {
    const user = await User.findById(req.user.id).select(
      "email additionalDetails accountType active approved authProviders +deletionPending +deletionStartedAt +googleId +imagePublicId +password"
    )
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" })
    }

    const confirmationEmail = normalizeEmail(req.body?.confirmationEmail)
    if (!isValidEmail(confirmationEmail) || confirmationEmail !== user.email) {
      return res.status(400).json({
        success: false,
        message: "Type your account email to confirm deletion",
      })
    }

    if (user.authProviders?.includes("local")) {
      const currentPassword = req.body?.currentPassword
      if (
        !isPasswordWithinBcryptLimit(currentPassword) ||
        !user.password ||
        !(await bcrypt.compare(currentPassword, user.password))
      ) {
        return res.status(401).json({
          success: false,
          message: "Current password is incorrect",
        })
      }
    } else if (user.authProviders?.includes("google")) {
      const googleCredential = req.body?.googleCredential
      if (!process.env.GOOGLE_CLIENT_ID) {
        return res.status(503).json({
          success: false,
          message: "Google re-authentication is unavailable",
        })
      }
      if (typeof googleCredential !== "string" || !googleCredential) {
        return res.status(400).json({
          success: false,
          message: "A fresh Google credential is required",
        })
      }

      let payload
      try {
        const ticket = await verifyGoogleIdToken({
          idToken: googleCredential,
          audience: process.env.GOOGLE_CLIENT_ID,
        })
        payload = ticket.getPayload()
      } catch {
        return res.status(401).json({
          success: false,
          message: "Google re-authentication failed",
        })
      }

      const issuedAt = Number(payload?.iat) * 1000
      const tokenAge = Date.now() - issuedAt
      if (
        !payload?.sub ||
        payload.email_verified !== true ||
        normalizeEmail(payload.email) !== user.email ||
        (user.googleId && payload.sub !== user.googleId) ||
        !Number.isFinite(issuedAt) ||
        tokenAge < -60 * 1000 ||
        tokenAge > GOOGLE_REAUTH_MAX_AGE_MS
      ) {
        return res.status(401).json({
          success: false,
          message: "Google re-authentication is invalid or expired",
        })
      }
    } else {
      return res.status(409).json({
        success: false,
        message: "This account has no supported re-authentication method",
      })
    }

    if (
      user.accountType === "Instructor" &&
      (await Course.exists({ instructor: user._id }))
    ) {
      return res.status(409).json({
        success: false,
        message:
          "Instructor accounts with course history require an administrator-assisted ownership transfer before deletion",
      })
    }

    if (user.accountType === "Admin") {
      return res.status(409).json({
        success: false,
        message:
          "Administrator accounts require an audited ownership-transfer process and cannot self-delete",
      })
    }

    await releaseStaleCheckoutLocks({ userId: user._id })
    if (
      await Purchase.exists({
        user: user._id,
        status: {
          $in: [
            "created",
            "order_created",
            "paid",
            "payment_review",
            "refund_pending",
            "refund_requested",
          ],
        },
      })
    ) {
      return res.status(409).json({
        success: false,
        message:
          "Account deletion is blocked while a checkout or payment requires completion or support reconciliation",
      })
    }

    const lockNow = new Date()
    deletionLockId = crypto.randomUUID()
    const deletionLock = await User.findOneAndUpdate(
      {
        _id: user._id,
        active: true,
        $and: [
          {
            $or: [
              { paymentOperationLockUntil: { $exists: false } },
              { paymentOperationLockUntil: { $lte: lockNow } },
            ],
          },
          {
            $or: [
              { deletionLockUntil: { $exists: false } },
              { deletionLockUntil: { $lte: lockNow } },
            ],
          },
        ],
      },
      {
        $set: {
          deletionLockId,
          deletionLockUntil: new Date(lockNow.getTime() + 5 * 60 * 1000),
          deletionPending: true,
          deletionStartedAt: user.deletionStartedAt || lockNow,
        },
      },
      { new: true }
    )
    if (!deletionLock) {
      return res.status(409).json({
        success: false,
        message:
          "Account state or payment activity changed; refresh and try again",
      })
    }
    deletionLockAcquired = true
    deletionUserId = user._id

    // Close the window between the first payment check and acquiring the
    // account lock. Checkout creation uses the complementary User lock.
    if (
      await Purchase.exists({
        user: user._id,
        status: {
          $in: [
            "created",
            "order_created",
            "paid",
            "payment_review",
            "refund_pending",
            "refund_requested",
          ],
        },
      })
    ) {
      await User.updateOne(
        { _id: user._id, deletionLockId, deletionPending: true },
        {
          $set: { deletionPending: false },
          $unset: {
            deletionLockId: 1,
            deletionLockUntil: 1,
            deletionStartedAt: 1,
          },
        }
      )
      deletionLockAcquired = false
      return res.status(409).json({
        success: false,
        message:
          "Account deletion is blocked while a checkout or payment requires completion or support reconciliation",
      })
    }

    const reviewIds = await RatingAndReview.find({ user: user._id }).distinct("_id")
    const anonymizedEmail = `deleted-${user._id.toString()}@users.invalid`
    const cleanupOperations = [
      Course.updateMany(
        { studentsEnroled: user._id },
        { $pull: { studentsEnroled: user._id } }
      ),
      CourseProgress.deleteMany({ userId: user._id }),
      RatingAndReview.deleteMany({ user: user._id }),
      OTP.deleteMany({ email: user.email }),
    ]

    if (reviewIds.length) {
      cleanupOperations.push(
        Course.updateMany(
          { ratingAndReviews: { $in: reviewIds } },
          { $pull: { ratingAndReviews: { $in: reviewIds } } }
        )
      )
    }
    if (user.additionalDetails) {
      cleanupOperations.push(
        Profile.findByIdAndUpdate(user.additionalDetails, {
          $unset: { about: 1, contactNumber: 1, dateOfBirth: 1, gender: 1 },
        })
      )
    }
    await Promise.all(cleanupOperations)

    if (
      user.imagePublicId &&
      !(await deleteAssetFromCloudinary(user.imagePublicId, "image"))
    ) {
      throw new Error("Profile image deletion is awaiting provider recovery")
    }

    const deactivatedUser = await User.findOneAndUpdate(
      {
        _id: user._id,
        active: true,
        deletionLockId,
        deletionPending: true,
      },
      {
        $set: {
          active: false,
          approved: false,
          authProviders: [],
          courses: [],
          courseProgress: [],
          deletionPending: false,
          email: anonymizedEmail,
          firstName: "Deleted",
          image: "",
          instructorApprovalStatus: "NotApplicable",
          lastName: "Account",
        },
        $unset: {
          deletionLockId: 1,
          deletionLockUntil: 1,
          deletionStartedAt: 1,
          googleId: 1,
          imagePublicId: 1,
          instructorReviewNote: 1,
          instructorReviewedAt: 1,
          instructorReviewedBy: 1,
          password: 1,
          paymentOperationLockId: 1,
          paymentOperationLockUntil: 1,
          resetPasswordExpires: 1,
          resetPasswordTokenHash: 1,
          token: 1,
        },
      },
      { new: true, runValidators: true }
    )
    if (!deactivatedUser) {
      throw new Error("Account finalization lost its deletion lock")
    }
    deletionLockAcquired = false

    clearSession(res)

    return res.status(200).json({
      success: true,
      message: "Account deleted successfully",
    })
  } catch (error) {
    if (deletionLockAcquired && deletionUserId) {
      await User.updateOne(
        { _id: deletionUserId, deletionLockId, deletionPending: true },
        { $unset: { deletionLockId: 1, deletionLockUntil: 1 } }
      ).catch(() => undefined)
    }
    console.error("Account deletion failed:", error.message)
    return res.status(500).json({
      success: false,
      code: "ACCOUNT_DELETION_PENDING",
      message: "Account deletion is pending and can be retried safely",
    })
  }
}

exports.getAllUserDetails = async (req, res) => {
  try {
    const deletionPending = Boolean(req.user.deletionPending)
    const userDetails = deletionPending
      ? await User.findById(req.user.id)
          .select("firstName lastName email accountType authProviders image")
          .lean()
      : await User.findById(req.user.id)
          .populate("additionalDetails")
          .exec()
    if (!userDetails) {
      return res.status(404).json({ success: false, message: "User not found" })
    }

    const safeUserDetails = deletionPending
      ? { ...userDetails, deletionPending: true }
      : userDetails.toJSON()

    return res.status(200).json({
      success: true,
      message: "User data fetched successfully",
      data: safeUserDetails,
      deletionPending,
      requiresPolicyAcceptance: Boolean(req.user.requiresPolicyAcceptance),
    })
  } catch (error) {
    console.error("Profile lookup failed:", error.message)
    return res.status(500).json({
      success: false,
      message: "User data could not be fetched",
    })
  }
}

exports.updateDisplayPicture = async (req, res) => {
  const file = req.files?.displayPicture
  if (!file) {
    return res.status(400).json({ success: false, message: "No file uploaded" })
  }

  let uploadedImage
  try {
    const user = await User.findById(req.user.id).select("+imagePublicId")
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" })
    }

    uploadedImage = await uploadImageToCloudinary(
      file,
      `${process.env.FOLDER_NAME || "studynotion"}/profile-pictures`,
      { height: 1000, quality: "auto:good", resourceType: "image", width: 1000 }
    )

    let updatedProfile
    try {
      updatedProfile = await User.findByIdAndUpdate(
        user._id,
        {
          $set: {
            image: uploadedImage.secure_url,
            imagePublicId: uploadedImage.public_id,
          },
        },
        { new: true, runValidators: true }
      ).populate("additionalDetails")
    } catch (error) {
      await deleteAssetFromCloudinary(uploadedImage.public_id, "image").catch(
        () => false
      )
      throw error
    }

    if (user.imagePublicId && user.imagePublicId !== uploadedImage.public_id) {
      deleteAssetFromCloudinary(user.imagePublicId, "image").catch((error) =>
        console.error("Previous profile image cleanup failed:", error.message)
      )
    }

    return res.status(200).json({
      success: true,
      message: "Profile picture updated successfully",
      data: updatedProfile,
    })
  } catch (error) {
    if (error instanceof MediaUploadError) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
      })
    }
    console.error("Profile picture update failed:", error.message)
    return res.status(502).json({
      success: false,
      message: "Profile picture could not be updated",
    })
  }
}

exports.getEnrolledCourses = async (req, res) => {
  try {
    const userDetails = await User.findById(req.user.id)
      .select("courses")
      .populate({
        path: "courses",
        select: "courseName courseDescription thumbnail courseContent",
        populate: {
          path: "courseContent",
          select: "sectionName subSection",
          populate: {
            path: "subSection",
            select: "title timeDuration description",
          },
        },
      })
      .lean()

    if (!userDetails) {
      return res.status(404).json({ success: false, message: "User not found" })
    }

    const courses = userDetails.courses || []
    const progressDocuments = await CourseProgress.find({
      courseID: { $in: courses.map((course) => course._id) },
      userId: req.user.id,
    })
      .select("courseID completedVideos")
      .lean()
    const progressByCourse = new Map(
      progressDocuments.map((progress) => [
        progress.courseID.toString(),
        new Set((progress.completedVideos || []).map((id) => id.toString())),
      ])
    )

    const enrolledCourseDtos = courses.map((course) =>
      buildEnrolledCourseDto(
        course,
        progressByCourse.get(course._id.toString()) || new Set()
      )
    )

    return res.status(200).json({ success: true, data: enrolledCourseDtos })
  } catch (error) {
    console.error("Enrolled course lookup failed:", error.message)
    return res.status(500).json({
      success: false,
      message: "Enrolled courses could not be fetched",
    })
  }
}

exports.instructorDashboard = async (req, res) => {
  try {
    const courseDetails = await Course.find({ instructor: req.user.id }).lean()
    const courseIds = courseDetails.map((course) => course._id)
    const purchases = courseIds.length
      ? await Purchase.find({
          status: { $in: ["fulfilled", "refund_requested", "refund_pending"] },
          "lineItems.course": { $in: courseIds },
        })
          .select("lineItems")
          .lean()
      : []
    const revenueByCourse = new Map()
    const ownedCourseIds = new Set(courseIds.map((courseId) => courseId.toString()))
    for (const purchase of purchases) {
      for (const lineItem of purchase.lineItems || []) {
        const courseId = lineItem.course?.toString()
        if (!ownedCourseIds.has(courseId)) continue
        revenueByCourse.set(
          courseId,
          (revenueByCourse.get(courseId) || 0) + Number(lineItem.amount || 0)
        )
      }
    }
    const courseData = courseDetails.map((course) => {
      const totalStudentsEnrolled = Array.isArray(course.studentsEnroled)
        ? course.studentsEnroled.length
        : 0
      return {
        _id: course._id,
        courseName: course.courseName,
        courseDescription: course.courseDescription,
        totalStudentsEnrolled,
        totalAmountGenerated:
          Math.round((revenueByCourse.get(course._id.toString()) || 0)) / 100,
      }
    })

    return res.status(200).json({ success: true, courses: courseData })
  } catch (error) {
    console.error("Instructor dashboard lookup failed:", error.message)
    return res.status(500).json({ success: false, message: "Server error" })
  }
}

exports._test = {
  buildEnrolledCourseDto,
  buildProfileUpdates,
  ProfileValidationError,
}
