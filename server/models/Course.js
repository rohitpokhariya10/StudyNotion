const mongoose = require("mongoose")

const courseSchema = new mongoose.Schema(
  {
    courseName: { type: String, required: true, trim: true, maxlength: 200 },
    courseDescription: {
      type: String,
      required: true,
      trim: true,
      maxlength: 10000,
    },
    instructor: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "user",
    },
    whatYouWillLearn: {
      type: String,
      required: true,
      trim: true,
      maxlength: 10000,
    },
    courseContent: [{ type: mongoose.Schema.Types.ObjectId, ref: "Section" }],
    ratingAndReviews: [
      { type: mongoose.Schema.Types.ObjectId, ref: "RatingAndReview" },
    ],
    price: { type: Number, required: true, min: 0.01, max: 10000000 },
    thumbnail: { type: String, required: true, trim: true, maxlength: 2048 },
    thumbnailPublicId: { type: String, select: false },
    tag: {
      type: [{ type: String, required: true, trim: true, maxlength: 80 }],
      required: true,
      validate: {
        validator: (tags) => tags.length > 0 && tags.length <= 50,
        message: "A course needs between 1 and 50 tags",
      },
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    },
    level: {
      type: String,
      enum: ["beginner", "intermediate", "advanced"],
    },
    language: {
      type: String,
      lowercase: true,
      trim: true,
      maxlength: 35,
      match: /^[a-z]{2,3}(?:-[a-z0-9]{2,8})*$/,
    },
    studentsEnroled: [
      { type: mongoose.Schema.Types.ObjectId, required: true, ref: "user" },
    ],
    instructions: {
      type: [
        { type: String, required: true, trim: true, maxlength: 1000 },
      ],
      required: true,
      validate: {
        validator: (instructions) =>
          instructions.length > 0 && instructions.length <= 100,
        message: "A course needs between 1 and 100 instructions",
      },
    },
    status: {
      type: String,
      enum: ["Archived", "Draft", "Published"],
      default: "Draft",
    },
    everPublishedAt: Date,
    archivedAt: Date,
    archivedBy: { type: mongoose.Schema.Types.ObjectId, ref: "user" },
  },
  { timestamps: true }
)

courseSchema.index({ status: 1, category: 1 })
courseSchema.index({ instructor: 1, createdAt: -1 })
courseSchema.index(
  { status: 1, createdAt: -1, _id: -1 },
  { name: "catalog_published_newest" }
)
courseSchema.index(
  { status: 1, category: 1, createdAt: -1, _id: -1 },
  { name: "catalog_category_newest" }
)
courseSchema.index(
  { status: 1, price: 1, _id: 1 },
  { name: "catalog_published_price" }
)
courseSchema.index(
  { status: 1, category: 1, price: 1, _id: 1 },
  { name: "catalog_category_price" }
)
courseSchema.index(
  { status: 1, courseName: "text", tag: "text", courseDescription: "text" },
  {
    name: "catalog_published_text",
    weights: { courseName: 10, tag: 5, courseDescription: 1 },
  }
)

module.exports = mongoose.model("Course", courseSchema)
