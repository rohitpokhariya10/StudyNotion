const mongoose = require("mongoose")

// Define the RatingAndReview schema
const ratingAndReviewSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "user",
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    review: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000,
    },
    course: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "Course",
      index: true,
    },
  },
  { timestamps: true },
)

ratingAndReviewSchema.index({ user: 1, course: 1 }, { unique: true })

// Export the RatingAndReview model
module.exports = mongoose.model("RatingAndReview", ratingAndReviewSchema)
