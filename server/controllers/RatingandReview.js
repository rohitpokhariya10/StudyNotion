const RatingAndReview = require("../models/RatingandReview")
const Course = require("../models/Course")
const mongoose = require("mongoose")

// Create a new rating and review
exports.createRating = async (req, res) => {
  try {
    const userId = req.user.id
    const { rating, review, courseId } = req.body

    const normalizedRating = Number(rating)
    const normalizedReview = String(review || "").trim()

    if (
      !mongoose.isValidObjectId(courseId) ||
      !Number.isInteger(normalizedRating) ||
      normalizedRating < 1 ||
      normalizedRating > 5 ||
      !normalizedReview ||
      normalizedReview.length > 2000
    ) {
      return res.status(400).json({
        success: false,
        message: "Provide a rating from 1 to 5 and a valid review",
      })
    }

    // Check if the user is enrolled in the course

    const courseDetails = await Course.findOne({
      _id: courseId,
      studentsEnroled: { $elemMatch: { $eq: userId } },
    })

    if (!courseDetails) {
      return res.status(404).json({
        success: false,
        message: "Student is not enrolled in this course",
      })
    }

    // Create a new rating and review
    const ratingReview = await RatingAndReview.create({
      rating: normalizedRating,
      review: normalizedReview,
      course: courseId,
      user: userId,
    })

    // Add the rating and review to the course
    await Course.findByIdAndUpdate(courseId, {
      $addToSet: {
        ratingAndReviews: ratingReview._id,
      },
    })

    return res.status(201).json({
      success: true,
      message: "Rating and review created successfully",
      ratingReview,
    })
  } catch (error) {
    console.error("Rating creation failed:", error.message)
    if (error?.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Course already reviewed by user",
      })
    }
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    })
  }
}

// Get the average rating for a course
exports.getAverageRating = async (req, res) => {
  try {
    const courseId = req.query?.courseId || req.body?.courseId

    if (!mongoose.isValidObjectId(courseId)) {
      return res.status(400).json({
        success: false,
        message: "A valid course is required",
      })
    }

    // Calculate the average rating using the MongoDB aggregation pipeline
    const result = await RatingAndReview.aggregate([
      {
        $match: {
          course: new mongoose.Types.ObjectId(courseId), // Convert courseId to ObjectId
        },
      },
      {
        $group: {
          _id: null,
          averageRating: { $avg: "$rating" },
        },
      },
    ])

    if (result.length > 0) {
      return res.status(200).json({
        success: true,
        averageRating: result[0].averageRating,
      })
    }

    // If no ratings are found, return 0 as the default rating
    return res.status(200).json({ success: true, averageRating: 0 })
  } catch (error) {
    console.error("Average rating lookup failed:", error.message)
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve the rating for the course",
    })
  }
}

// Get all rating and reviews
exports.getAllRatingReview = async (req, res) => {
  try {
    const requestedLimit = Number(req.query?.limit || 20)
    const limit = Number.isInteger(requestedLimit)
      ? Math.min(Math.max(requestedLimit, 1), 50)
      : 20
    const allReviews = await RatingAndReview.find({})
      .sort({ createdAt: -1, _id: -1 })
      .limit(limit)
      .populate({
        path: "user",
        select: "firstName lastName image",
      })
      .populate({
        path: "course",
        select: "courseName", //Specify the fields you want to populate from the "Course" model
      })
      .exec()

    const reviews = allReviews.map((document) => {
      const item =
        typeof document?.toObject === "function"
          ? document.toObject()
          : { ...document }
      return {
        createdAt: item.createdAt,
        course: item.course
          ? { courseName: item.course.courseName }
          : undefined,
        rating: item.rating,
        review: item.review,
        user: item.user
          ? {
              firstName: item.user.firstName,
              image: item.user.image,
              lastName: item.user.lastName,
            }
          : undefined,
      }
    })

    res.status(200).json({
      success: true,
      data: reviews,
      pagination: { limit },
    })
  } catch (error) {
    console.error("Review feed lookup failed:", error.message)
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve the rating and review for the course",
    })
  }
}
