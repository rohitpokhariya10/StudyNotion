const Course = require("../models/Course")
const Category = require("../models/Category")
const Section = require("../models/Section")
const SubSection = require("../models/Subsection")
const User = require("../models/User")
const Purchase = require("../models/Purchase")
const RatingAndReview = require("../models/RatingandReview")
const {
  MediaUploadError,
  createPrivateMediaUrl,
  deleteAssetFromCloudinary,
  uploadImageToCloudinary,
} = require("../utils/imageUploader")
const CourseProgress = require("../models/CourseProgress")
const { convertSecondsToDuration } = require("../utils/secToDuration")
const mongoose = require("mongoose")
const env = require("../config/env")
const { isCoursePublishReady } = require("../utils/courseLifecycle")
const { sanitizeInstructorCourse } = require("../utils/courseDto")
const { releaseStaleCheckoutLocks } = require("../utils/purchaseLifecycle")

const publicInstructorPopulate = {
  path: "instructor",
  select: "firstName lastName image additionalDetails",
  populate: { path: "additionalDetails", select: "about" },
}

const resolveCourseAccess = async (courseId, userId) => {
  const [course, user] = await Promise.all([
    Course.findById(courseId).select("instructor studentsEnroled courseContent"),
    User.findById(userId).select("accountType active approved"),
  ])

  if (!course) {
    return { allowed: false, message: "Course not found", statusCode: 404 }
  }
  if (!user || user.active === false || user.approved === false) {
    return { allowed: false, message: "User is not authorized", statusCode: 401 }
  }

  const normalizedUserId = userId.toString()
  const isOwner =
    user.accountType === "Instructor" &&
    course.instructor?.toString() === normalizedUserId
  const isEnrolled =
    user.accountType === "Student" &&
    (course.studentsEnroled || []).some(
      (studentId) => studentId.toString() === normalizedUserId
    )
  const isAdmin = user.accountType === "Admin"

  return {
    allowed: isOwner || isEnrolled || isAdmin,
    course,
    message: "You do not have access to this course content",
    statusCode: 403,
    user,
  }
}

const sanitizeEntitledCourse = (course) => {
  const sanitized = { ...course }
  sanitized.totalStudentsEnrolled = Array.isArray(sanitized.studentsEnroled)
    ? sanitized.studentsEnroled.length
    : 0
  delete sanitized.studentsEnroled
  delete sanitized.archivedBy
  delete sanitized.__v

  if (sanitized.category && typeof sanitized.category === "object") {
    sanitized.category = {
      _id: sanitized.category._id,
      description: sanitized.category.description,
      name: sanitized.category.name,
    }
  }
  if (Array.isArray(sanitized.ratingAndReviews)) {
    sanitized.ratingAndReviews = sanitized.ratingAndReviews.map((review) => ({
      _id: review._id,
      createdAt: review.createdAt,
      rating: review.rating,
      review: review.review,
    }))
  }
  return sanitized
}

const normalizeRequiredText = (value, maxLength) => {
  if (typeof value !== "string") return null
  const normalized = value.trim()
  return normalized && normalized.length <= maxLength ? normalized : null
}

const normalizeRequiredList = (value, { itemMaxLength, maxItems }) => {
  if (!Array.isArray(value) || !value.length || value.length > maxItems) {
    return null
  }
  const normalized = value.map((item) =>
    normalizeRequiredText(item, itemMaxLength)
  )
  return normalized.every(Boolean) ? normalized : null
}

const normalizeCourseMetadata = (course) => {
  const courseName = normalizeRequiredText(course.courseName, 200)
  const courseDescription = normalizeRequiredText(
    course.courseDescription,
    10000
  )
  const whatYouWillLearn = normalizeRequiredText(
    course.whatYouWillLearn,
    10000
  )
  const thumbnail = normalizeRequiredText(course.thumbnail, 2048)
  const tag = normalizeRequiredList(course.tag, {
    itemMaxLength: 80,
    maxItems: 50,
  })
  const instructions = normalizeRequiredList(course.instructions, {
    itemMaxLength: 1000,
    maxItems: 100,
  })
  const price = Number(course.price)

  if (
    !courseName ||
    !courseDescription ||
    !whatYouWillLearn ||
    !thumbnail ||
    !tag ||
    !instructions ||
    !mongoose.isValidObjectId(course.category) ||
    !Number.isFinite(price) ||
    price <= 0 ||
    price > 10_000_000
  ) {
    return false
  }

  course.courseName = courseName
  course.courseDescription = courseDescription
  course.whatYouWillLearn = whatYouWillLearn
  course.thumbnail = thumbnail
  course.tag = tag
  course.instructions = instructions
  course.price = price
  return true
}
// Function to create a new course
exports.createCourse = async (req, res) => {
  try {
    // Get user ID from request object
    const userId = req.user.id

    // Get all required fields from request body
    let {
      courseName,
      courseDescription,
      whatYouWillLearn,
      price,
      tag: _tag,
      category,
      status,
      instructions: _instructions,
    } = req.body
    // Get thumbnail image from request files
    const thumbnail = req.files?.thumbnailImage

    // Convert the tag and instructions from stringified Array to Array
    let tag
    let instructions
    try {
      tag = typeof _tag === "string" ? JSON.parse(_tag) : _tag
      instructions =
        typeof _instructions === "string"
          ? JSON.parse(_instructions)
          : _instructions
    } catch {
      return res.status(400).json({
        success: false,
        message: "Tags and instructions must be valid arrays",
      })
    }
    const normalizedPrice = Number(price)
    const normalizedCourseName = normalizeRequiredText(courseName, 200)
    const normalizedCourseDescription = normalizeRequiredText(
      courseDescription,
      10000
    )
    const normalizedLearningOutcome = normalizeRequiredText(
      whatYouWillLearn,
      10000
    )
    const normalizedTags = normalizeRequiredList(tag, {
      itemMaxLength: 80,
      maxItems: 50,
    })
    const normalizedInstructions = normalizeRequiredList(instructions, {
      itemMaxLength: 1000,
      maxItems: 100,
    })

    // Check if any of the required fields are missing
    if (
      !normalizedCourseName ||
      !normalizedCourseDescription ||
      !normalizedLearningOutcome ||
      !Number.isFinite(normalizedPrice) ||
      normalizedPrice <= 0 ||
      normalizedPrice > 10_000_000 ||
      !normalizedTags ||
      !thumbnail ||
      !category ||
      !mongoose.isValidObjectId(category) ||
      !normalizedInstructions
    ) {
      return res.status(400).json({
        success: false,
        message: "All Fields are Mandatory",
      })
    }
    status = status || "Draft"
    if (!["Draft", "Published"].includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid course status" })
    }
    if (status === "Published") {
      return res.status(409).json({
        success: false,
        message: "Create the course curriculum before publishing",
      })
    }
    // Check if the user is an instructor
    const instructorDetails = await User.findById(userId, {
      accountType: "Instructor",
    })

    if (!instructorDetails) {
      return res.status(404).json({
        success: false,
        message: "Instructor Details Not Found",
      })
    }

    // Check if the tag given is valid
    const categoryDetails = await Category.findById(category)
    if (!categoryDetails) {
      return res.status(404).json({
        success: false,
        message: "Category Details Not Found",
      })
    }
    // Upload the Thumbnail to Cloudinary
    const thumbnailImage = await uploadImageToCloudinary(
      thumbnail,
      `${process.env.FOLDER_NAME || "studynotion"}/course-thumbnails`,
      {
        height: 900,
        quality: "auto:good",
        resourceType: "image",
        width: 1600,
      }
    )
    // Create a new course with the given details
    let newCourse
    try {
      newCourse = await Course.create({
        courseName: normalizedCourseName,
        courseDescription: normalizedCourseDescription,
        instructor: instructorDetails._id,
        whatYouWillLearn: normalizedLearningOutcome,
        price: normalizedPrice,
        tag: normalizedTags,
        category: categoryDetails._id,
        thumbnail: thumbnailImage.secure_url,
        thumbnailPublicId: thumbnailImage.public_id,
        status: status,
        instructions: normalizedInstructions,
      })
    } catch (error) {
      await deleteAssetFromCloudinary(thumbnailImage.public_id, "image").catch(
        () => false
      )
      throw error
    }

    // Keep denormalized instructor/category references coherent. Compensating
    // cleanup also works with a standalone local MongoDB where transactions are unavailable.
    try {
      await Promise.all([
        User.findByIdAndUpdate(instructorDetails._id, {
          $addToSet: { courses: newCourse._id },
        }),
        Category.findByIdAndUpdate(category, {
          $addToSet: { courses: newCourse._id },
        }),
      ])
    } catch (error) {
      await Promise.allSettled([
        User.findByIdAndUpdate(instructorDetails._id, {
          $pull: { courses: newCourse._id },
        }),
        Category.findByIdAndUpdate(category, {
          $pull: { courses: newCourse._id },
        }),
        Course.findByIdAndDelete(newCourse._id),
        deleteAssetFromCloudinary(thumbnailImage.public_id, "image"),
      ])
      throw error
    }
    // Return the new course and a success message
    res.status(200).json({
      success: true,
      data: sanitizeInstructorCourse(newCourse),
      message: "Course Created Successfully",
    })
  } catch (error) {
    // Handle any errors that occur during the creation of the course
    if (error instanceof MediaUploadError) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
      })
    }
    if (error.name === "ValidationError" || error.name === "CastError") {
      return res.status(400).json({
        success: false,
        message: "Course details are invalid",
      })
    }
    console.error("Course creation failed:", error.message)
    res.status(500).json({
      success: false,
      message: "Failed to create course",
    })
  }
}
// Edit Course Details
exports.editCourse = async (req, res) => {
  let previousThumbnailPublicId
  let replacementThumbnail
  let replacementSaved = false
  let categoryRelationChanged = false
  let originalCategoryId
  let nextCategoryId
  try {
    const { courseId } = req.body
    const updates = req.body
    if (!mongoose.isValidObjectId(courseId)) {
      return res.status(400).json({
        success: false,
        message: "A valid courseId is required",
      })
    }
    if (updates.category && !mongoose.isValidObjectId(updates.category)) {
      return res.status(400).json({
        success: false,
        message: "A valid category is required",
      })
    }
    const course = await Course.findOne({
      _id: courseId,
      instructor: req.user.id,
    }).select("+thumbnailPublicId")

    if (!course) {
      return res.status(404).json({ success: false, message: "Course not found" })
    }
    if (course.status === "Archived") {
      return res.status(409).json({
        success: false,
        message: "Archived courses cannot be edited",
      })
    }
    const wasPublished = course.status === "Published"

    originalCategoryId = course.category?.toString()
    nextCategoryId = updates.category?.toString() || originalCategoryId
    if (updates.category && !(await Category.exists({ _id: updates.category }))) {
      return res.status(404).json({
        success: false,
        message: "Category Details Not Found",
      })
    }
    if (updates.status && !["Draft", "Published"].includes(updates.status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid course status",
      })
    }

    // Only permit editable course fields. Relational and ownership fields must
    // never be mass-assigned from an instructor request.
    const editableFields = new Set([
      "courseName",
      "courseDescription",
      "whatYouWillLearn",
      "price",
      "tag",
      "category",
      "status",
      "instructions",
    ])

    try {
      for (const key of Object.keys(updates)) {
        if (editableFields.has(key)) {
          if (key === "tag" || key === "instructions") {
            course[key] =
              typeof updates[key] === "string"
                ? JSON.parse(updates[key])
                : updates[key]
            if (!Array.isArray(course[key])) throw new Error("Expected an array")
          } else if (key === "price") {
            course[key] = Number(updates[key])
          } else {
            course[key] = updates[key]
          }
        }
      }
    } catch {
      return res.status(400).json({
        success: false,
        message: "Tags and instructions must be valid arrays",
      })
    }

    if (!normalizeCourseMetadata(course)) {
      return res.status(400).json({
        success: false,
        message:
          "Course metadata requires a name, description, learning outcome, thumbnail, valid category, positive price, tags, and instructions",
      })
    }

    if (!updates.category && !(await Category.exists({ _id: course.category }))) {
      return res.status(404).json({
        success: false,
        message: "Category Details Not Found",
      })
    }

    if (
      course.status === "Published" &&
      !(await isCoursePublishReady(course.courseContent))
    ) {
      return res.status(409).json({
        success: false,
        message: "A published course needs at least one lesson in every section",
      })
    }
    if ((wasPublished || course.status === "Published") && !course.everPublishedAt) {
      course.everPublishedAt = new Date()
    }

    // Upload only after all text updates have been validated.
    if (req.files?.thumbnailImage) {
      const thumbnail = req.files.thumbnailImage
      previousThumbnailPublicId = course.thumbnailPublicId
      replacementThumbnail = await uploadImageToCloudinary(
        thumbnail,
        `${process.env.FOLDER_NAME || "studynotion"}/course-thumbnails`,
        {
          height: 900,
          quality: "auto:good",
          resourceType: "image",
          width: 1600,
        }
      )
      course.thumbnail = replacementThumbnail.secure_url
      course.thumbnailPublicId = replacementThumbnail.public_id
    }

    if (nextCategoryId && nextCategoryId !== originalCategoryId) {
      const addedToNewCategory = await Category.updateOne(
        { _id: nextCategoryId },
        { $addToSet: { courses: course._id } }
      )
      if (!addedToNewCategory.matchedCount) {
        throw new Error("The selected category no longer exists")
      }
      try {
        if (originalCategoryId) {
          await Category.updateOne(
            { _id: originalCategoryId },
            { $pull: { courses: course._id } }
          )
        }
        categoryRelationChanged = true
      } catch (error) {
        await Category.updateOne(
          { _id: nextCategoryId },
          { $pull: { courses: course._id } }
        ).catch(() => false)
        throw error
      }
    }

    try {
      await course.save()
    } catch (error) {
      if (categoryRelationChanged) {
        await Promise.allSettled([
          originalCategoryId
            ? Category.updateOne(
                { _id: originalCategoryId },
                { $addToSet: { courses: course._id } }
              )
            : Promise.resolve(),
          Category.updateOne(
            { _id: nextCategoryId },
            { $pull: { courses: course._id } }
          ),
        ])
        categoryRelationChanged = false
      }
      throw error
    }
    replacementSaved = true

    if (
      previousThumbnailPublicId &&
      previousThumbnailPublicId !== replacementThumbnail?.public_id
    ) {
      deleteAssetFromCloudinary(previousThumbnailPublicId, "image").catch(
        (error) =>
          console.error("Previous course thumbnail cleanup failed:", error.message)
      )
    }

    const updatedCourse = await Course.findOne({
      _id: courseId,
    })
      .populate(publicInstructorPopulate)
      .populate({ path: "category", select: "name description" })
      .populate({ path: "ratingAndReviews", select: "rating review createdAt" })
      .populate({
        path: "courseContent",
        populate: {
          path: "subSection",
        },
      })
      .exec()

    res.json({
      success: true,
      message: "Course updated successfully",
      data: sanitizeInstructorCourse(updatedCourse),
    })
  } catch (error) {
    if (replacementThumbnail && !replacementSaved) {
      await deleteAssetFromCloudinary(replacementThumbnail.public_id, "image").catch(
        () => false
      )
    }
    if (error instanceof MediaUploadError) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
      })
    }
    if (error.name === "ValidationError" || error.name === "CastError") {
      return res.status(400).json({
        success: false,
        message: "Course details are invalid",
      })
    }
    console.error("Course update failed:", error.message)
    res.status(500).json({
      success: false,
      message: "Internal server error",
    })
  }
}
// Get Course List
exports.getAllCourses = async (req, res) => {
  try {
    const allCourses = await Course.find(
      { status: "Published" },
      {
        courseName: true,
        price: true,
        thumbnail: true,
        instructor: true,
        ratingAndReviews: true,
        studentsEnroled: true,
      }
    )
      .populate(publicInstructorPopulate)
      .lean()
      .exec()

    const publicCourses = allCourses.map(({ studentsEnroled = [], ...course }) => ({
      ...course,
      totalStudentsEnrolled: studentsEnroled.length,
    }))

    return res.status(200).json({
      success: true,
      data: publicCourses,
    })
  } catch (error) {
    console.error("Unable to fetch courses", error.message)
    return res.status(500).json({
      success: false,
      message: `Can't Fetch Course Data`,
    })
  }
}
// Get One Single Course Details
// exports.getCourseDetails = async (req, res) => {
//   try {
//     const { courseId } = req.body
//     const courseDetails = await Course.findOne({
//       _id: courseId,
//     })
//       .populate({
//         path: "instructor",
//         populate: {
//           path: "additionalDetails",
//         },
//       })
//       .populate("category")
//       .populate("ratingAndReviews")
//       .populate({
//         path: "courseContent",
//         populate: {
//           path: "subSection",
//         },
//       })
//       .exec()
//     // console.log(
//     //   "###################################### course details : ",
//     //   courseDetails,
//     //   courseId
//     // );
//     if (!courseDetails || !courseDetails.length) {
//       return res.status(400).json({
//         success: false,
//         message: `Could not find course with id: ${courseId}`,
//       })
//     }

//     if (courseDetails.status === "Draft") {
//       return res.status(403).json({
//         success: false,
//         message: `Accessing a draft course is forbidden`,
//       })
//     }

//     return res.status(200).json({
//       success: true,
//       data: courseDetails,
//     })
//   } catch (error) {
//     return res.status(500).json({
//       success: false,
//       message: error.message,
//     })
//   }
// }
exports.getCourseDetails = async (req, res) => {
  try {
    const { courseId } = req.body
    if (!mongoose.isValidObjectId(courseId)) {
      return res.status(400).json({ success: false, message: "A valid courseId is required" })
    }
    const courseDetails = await Course.findOne({
      _id: courseId,
      status: "Published",
    })
      .populate(publicInstructorPopulate)
      .populate({ path: "category", select: "name description" })
      .populate({ path: "ratingAndReviews", select: "rating review createdAt" })
      .populate({
        path: "courseContent",
        populate: {
          path: "subSection",
          select: "-videoUrl",
        },
      })
      .exec()

    if (!courseDetails) {
      return res.status(400).json({
        success: false,
        message: `Could not find course with id: ${courseId}`,
      })
    }

    let totalDurationInSeconds = 0
    courseDetails.courseContent.forEach((content) => {
      content.subSection.forEach((subSection) => {
        const timeDurationInSeconds = parseInt(subSection.timeDuration)
        totalDurationInSeconds += timeDurationInSeconds
      })
    })

    const totalDuration = convertSecondsToDuration(totalDurationInSeconds)

    const publicCourseDetails = sanitizeEntitledCourse(courseDetails.toObject())

    return res.status(200).json({
      success: true,
      data: {
        courseDetails: publicCourseDetails,
        totalDuration,
      },
    })
  } catch (error) {
    console.error("Unable to fetch course details", error.message)
    return res.status(500).json({
      success: false,
      message: "Unable to fetch course details",
    })
  }
}
exports.getFullCourseDetails = async (req, res) => {
  try {
    const { courseId } = req.body
    const userId = req.user.id

    if (!mongoose.isValidObjectId(courseId)) {
      return res.status(400).json({ success: false, message: "A valid courseId is required" })
    }

    const access = await resolveCourseAccess(courseId, userId)
    if (!access.allowed) {
      return res.status(access.statusCode).json({
        success: false,
        message: access.message,
      })
    }

    const courseDetails = await Course.findOne({
      _id: courseId,
    })
      .populate(publicInstructorPopulate)
      .populate("category")
      .populate("ratingAndReviews")
      .populate({
        path: "courseContent",
        populate: {
          path: "subSection",
          select: "+videoDeliveryType +videoFormat +videoPublicId",
        },
      })
      .exec()

    let courseProgressCount = await CourseProgress.findOne({
      courseID: courseId,
      userId: userId,
    })

    if (!courseDetails) {
      return res.status(400).json({
        success: false,
        message: `Could not find course with id: ${courseId}`,
      })
    }

    // if (courseDetails.status === "Draft") {
    //   return res.status(403).json({
    //     success: false,
    //     message: `Accessing a draft course is forbidden`,
    //   });
    // }

    let totalDurationInSeconds = 0
    courseDetails.courseContent.forEach((content) => {
      content.subSection.forEach((subSection) => {
        const timeDurationInSeconds = parseInt(subSection.timeDuration)
        totalDurationInSeconds += timeDurationInSeconds
      })
    })

    const totalDuration = convertSecondsToDuration(totalDurationInSeconds)

    const entitledCourseDetails = sanitizeEntitledCourse(courseDetails.toObject())
    for (const content of entitledCourseDetails.courseContent || []) {
      for (const subSection of content.subSection || []) {
        if (
          subSection.videoDeliveryType === "authenticated" &&
          subSection.videoPublicId &&
          subSection.videoFormat
        ) {
          subSection.videoUrl = createPrivateMediaUrl(
            subSection.videoPublicId,
            subSection.videoFormat,
            {
              deliveryType: "authenticated",
              expiresInSeconds: env.mediaUrlTtlSeconds,
              resourceType: "video",
            }
          )
        } else if (env.isProduction) {
          // Legacy public videos must be re-uploaded before they can be served in production.
          delete subSection.videoUrl
        }
        delete subSection.videoDeliveryType
        delete subSection.videoFormat
        delete subSection.videoPublicId
      }
    }

    return res.status(200).json({
      success: true,
      data: {
        courseDetails: entitledCourseDetails,
        totalDuration,
        completedVideos: courseProgressCount?.completedVideos
          ? courseProgressCount?.completedVideos
          : [],
      },
    })
  } catch (error) {
    console.error("Unable to fetch full course details", error.message)
    return res.status(500).json({
      success: false,
      message: "Unable to fetch course details",
    })
  }
}

exports.getLessonPlaybackUrl = async (req, res) => {
  try {
    const { courseId, subSectionId } = req.body || {}
    if (
      !mongoose.isValidObjectId(courseId) ||
      !mongoose.isValidObjectId(subSectionId)
    ) {
      return res.status(400).json({
        success: false,
        message: "Valid courseId and subSectionId values are required",
      })
    }

    const access = await resolveCourseAccess(courseId, req.user.id)
    if (!access.allowed) {
      return res.status(access.statusCode).json({
        success: false,
        message: access.message,
      })
    }

    const belongsToCourse = await Section.exists({
      _id: { $in: access.course.courseContent || [] },
      subSection: subSectionId,
    })
    if (!belongsToCourse) {
      return res.status(404).json({
        success: false,
        message: "Lesson not found in this course",
      })
    }

    const subSection = await SubSection.findById(subSectionId).select(
      "videoUrl +videoDeliveryType +videoFormat +videoPublicId"
    )
    if (!subSection) {
      return res.status(404).json({
        success: false,
        message: "Lesson not found",
      })
    }

    if (
      subSection.videoDeliveryType !== "authenticated" ||
      !subSection.videoPublicId ||
      !subSection.videoFormat
    ) {
      if (env.isProduction) {
        return res.status(409).json({
          success: false,
          message: "This legacy lesson must be re-uploaded for secure playback",
        })
      }
      return res.status(200).json({
        success: true,
        data: {
          expiresAt: null,
          subSectionId,
          url: subSection.videoUrl,
        },
      })
    }

    const expiresAt = new Date(Date.now() + env.mediaUrlTtlSeconds * 1000)
    const url = createPrivateMediaUrl(
      subSection.videoPublicId,
      subSection.videoFormat,
      {
        deliveryType: "authenticated",
        expiresInSeconds: env.mediaUrlTtlSeconds,
        resourceType: "video",
      }
    )

    return res.status(200).json({
      success: true,
      data: { expiresAt: expiresAt.toISOString(), subSectionId, url },
    })
  } catch (error) {
    console.error("Lesson playback URL generation failed:", error.message)
    return res.status(500).json({
      success: false,
      message: "A secure playback URL could not be generated",
    })
  }
}

// Get a list of Course for a given Instructor
exports.getInstructorCourses = async (req, res) => {
  try {
    // Get the instructor ID from the authenticated user or request body
    const instructorId = req.user.id

    // Find all courses belonging to the instructor
    const instructorCourses = await Course.find({
      instructor: instructorId,
    }).sort({ createdAt: -1 })

    // Return the instructor's courses
    res.status(200).json({
      success: true,
      data: instructorCourses.map(sanitizeInstructorCourse),
    })
  } catch (error) {
    console.error("Instructor course lookup failed:", error.message)
    res.status(500).json({
      success: false,
      message: "Failed to retrieve instructor courses",
    })
  }
}
// Delete the Course
exports.deleteCourse = async (req, res) => {
  try {
    const { courseId, confirmationCourseName } = req.body || {}
    if (!mongoose.isValidObjectId(courseId)) {
      return res.status(400).json({
        success: false,
        message: "A valid courseId is required",
      })
    }

    // Scope destructive access to the authenticated instructor's own course.
    const course = await Course.findOne({
      _id: courseId,
      instructor: req.user.id,
    }).select("+thumbnailPublicId")
    if (!course) {
      return res.status(404).json({ success: false, message: "Course not found" })
    }

    if (
      typeof confirmationCourseName !== "string" ||
      confirmationCourseName.trim() !== course.courseName
    ) {
      return res.status(400).json({
        success: false,
        message: "Type the exact course name to confirm deletion",
      })
    }

    const archiveCourse = async () => {
      await Course.updateOne(
        { _id: course._id, instructor: req.user.id },
        {
          $set: {
            archivedAt: course.archivedAt || new Date(),
            archivedBy: req.user.id,
            status: "Archived",
          },
        }
      )
      return res.status(200).json({
        success: true,
        archived: true,
        message:
          "Course archived. Existing learners keep access to their purchased content.",
      })
    }

    // Published content is never physically deleted. Moving it out of the
    // catalogue first also makes concurrent checkout queries stop matching it.
    if (course.status !== "Draft" || course.everPublishedAt) {
      return archiveCourse()
    }

    await releaseStaleCheckoutLocks({ courseId: course._id })
    const hasPaidPurchaseHistory = Boolean(
      await Purchase.exists({
        courses: course._id,
        status: {
          $in: [
            "paid",
            "fulfilled",
            "payment_review",
            "refund_pending",
            "refund_requested",
            "refunded",
          ],
        },
      })
    )
    if ((course.studentsEnroled || []).length || hasPaidPurchaseHistory) {
      return archiveCourse()
    }

    if (
      await Purchase.exists({
        courses: course._id,
        status: { $in: ["created", "order_created"] },
      })
    ) {
      return res.status(409).json({
        success: false,
        message: "This course has an active checkout and cannot be deleted yet",
      })
    }

    // Unenroll students from the course
    const mediaAssets = course.thumbnailPublicId
      ? [
          {
            deliveryType: "upload",
            publicId: course.thumbnailPublicId,
            resourceType: "image",
          },
        ]
      : []

    // Delete sections and sub-sections
    const courseSections = course.courseContent
    for (const sectionId of courseSections) {
      // Delete sub-sections of the section
      const section = await Section.findById(sectionId)
      if (section) {
        const subSections = section.subSection
        for (const subSectionId of subSections) {
          const subSection = await SubSection.findByIdAndDelete(
            subSectionId
          ).select("+videoDeliveryType +videoPublicId")
          if (subSection?.videoPublicId) {
            mediaAssets.push({
              deliveryType: subSection.videoDeliveryType || "upload",
              publicId: subSection.videoPublicId,
              resourceType: "video",
            })
          }
        }
      }

      // Delete the section
      await Section.findByIdAndDelete(sectionId)
    }

    // Delete the course
    await Course.findByIdAndDelete(courseId)

    const progressDocuments = await CourseProgress.find({ courseID: courseId })
      .select("_id")
      .lean()
    const progressIds = progressDocuments.map((progress) => progress._id)
    const userPull = { courses: courseId }
    if (progressIds.length) userPull.courseProgress = { $in: progressIds }

    const cleanupOperations = [
      User.updateMany(
        {
          $or: [
            { courses: courseId },
            ...(progressIds.length
              ? [{ courseProgress: { $in: progressIds } }]
              : []),
          ],
        },
        { $pull: userPull }
      ),
      CourseProgress.deleteMany({ courseID: courseId }),
      RatingAndReview.deleteMany({ course: courseId }),
      Purchase.deleteMany({ courses: courseId, status: "failed" }),
    ]

    if (course.category) {
      cleanupOperations.push(
        Category.findByIdAndUpdate(course.category, {
          $pull: { courses: courseId },
        })
      )
    }

    await Promise.all(cleanupOperations)
    await Promise.allSettled(
      mediaAssets.map(({ deliveryType, publicId, resourceType }) =>
        deleteAssetFromCloudinary(publicId, resourceType, deliveryType)
      )
    )

    return res.status(200).json({
      success: true,
      archived: false,
      message: "Course deleted successfully",
    })
  } catch (error) {
    console.error("Course deletion failed:", error.message)
    return res.status(500).json({
      success: false,
      message: "Server error",
    })
  }
}

exports._test = {
  normalizeCourseMetadata,
  sanitizeEntitledCourse,
  sanitizeInstructorCourse,
}
