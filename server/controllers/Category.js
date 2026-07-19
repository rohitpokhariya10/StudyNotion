const Category = require("../models/Category")
const Course = require("../models/Course")
const mongoose = require("mongoose")

function getRandomInt(max) {
  return Math.floor(Math.random() * max)
}

const coursePopulate = [
  { path: "ratingAndReviews", select: "rating review createdAt" },
  { path: "instructor", select: "firstName lastName image" },
]

const courseSelection =
  "courseName courseDescription instructor price thumbnail ratingAndReviews studentsEnroled createdAt"

const topSellingPipeline = [
  { $match: { status: "Published" } },
  {
    $project: {
      enrollmentCount: {
        $size: { $ifNull: ["$studentsEnroled", []] },
      },
    },
  },
  { $sort: { enrollmentCount: -1, _id: 1 } },
  { $limit: 10 },
]

const publicCourse = (course) => {
  const value = course?.toObject ? course.toObject() : { ...course }
  value.totalStudentsEnrolled = value.studentsEnroled?.length || 0
  delete value.studentsEnroled
  delete value.archivedBy
  delete value.__v
  if (Array.isArray(value.ratingAndReviews)) {
    value.ratingAndReviews = value.ratingAndReviews.map((review) => ({
      _id: review._id,
      createdAt: review.createdAt,
      rating: review.rating,
      review: review.review,
    }))
  }
  return value
}

const publicCategory = (category) => {
  if (!category) return null
  const value = category.toObject ? category.toObject() : { ...category }
  value.courses = (value.courses || []).map(publicCourse)
  delete value.__v
  return value
}

exports.createCategory = async (req, res) => {
  try {
    const name = String(req.body?.name || "").trim()
    const description = String(req.body?.description || "").trim()
    if (!name || name.length > 120 || description.length > 1000) {
      return res
        .status(400)
        .json({ success: false, message: "All fields are required" })
    }
    const category = await Category.create({ name, description })
    return res.status(201).json({
      success: true,
      message: "Category created successfully",
      data: category,
    })
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "A category with this name already exists",
      })
    }
    console.error("Category creation failed:", error.message)
    return res.status(500).json({
      success: false,
      message: "Category could not be created",
    })
  }
}

exports.showAllCategories = async (req, res) => {
  try {
    const [categories, publishedCounts] = await Promise.all([
      Category.find().select("name description").sort({ name: 1 }).lean(),
      Course.aggregate([
        { $match: { status: "Published" } },
        { $group: { _id: "$category", count: { $sum: 1 } } },
      ]),
    ])
    const countsByCategory = new Map(
      publishedCounts.map(({ _id, count }) => [_id?.toString(), count])
    )
    const publicCategories = categories.map((category) => ({
      _id: category._id,
      description: category.description,
      name: category.name,
      publishedCourseCount: countsByCategory.get(category._id.toString()) || 0,
    }))
    res.status(200).json({
      success: true,
      data: publicCategories,
    })
  } catch (error) {
    console.error("Category lookup failed:", error.message)
    return res.status(500).json({
      success: false,
      message: "Categories could not be fetched",
    })
  }
}

exports.categoryPageDetails = async (req, res) => {
  try {
    const { categoryId } = req.body

    if (!mongoose.isValidObjectId(categoryId)) {
      return res.status(400).json({
        success: false,
        message: "A valid categoryId is required",
      })
    }

    // Get courses for the specified category
    const selectedCategory = await Category.findById(categoryId)
      .populate({
        path: "courses",
        match: { status: "Published" },
        select: courseSelection,
        populate: coursePopulate,
      })
      .exec()

    // Handle the case when the category is not found
    if (!selectedCategory) {
      return res
        .status(404)
        .json({ success: false, message: "Category not found" })
    }
    // Handle the case when there are no courses
    if (selectedCategory.courses.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No courses found for the selected category.",
      })
    }

    // Get courses for other categories
    const publishedCategoryIds = await Course.distinct("category", {
      category: { $ne: categoryId },
      status: "Published",
    })
    const categoriesExceptSelected = await Category.find({
      _id: { $in: publishedCategoryIds, $ne: categoryId },
    }).select("_id")
    const randomCategory = categoriesExceptSelected.length
      ? categoriesExceptSelected[getRandomInt(categoriesExceptSelected.length)]
      : null
    const differentCategory = randomCategory
      ? await Category.findById(randomCategory._id)
          .populate({
            path: "courses",
            match: { status: "Published" },
            select: courseSelection,
            populate: coursePopulate,
          })
          .exec()
      : null
    // Rank in MongoDB and hydrate only the ten cards the response needs.
    const topSellingRanks = await Course.aggregate(topSellingPipeline)
    const topSellingIds = topSellingRanks.map((course) => course._id)
    const topSellingDocuments = topSellingIds.length
      ? await Course.find({ _id: { $in: topSellingIds } })
          .select(courseSelection)
          .populate(coursePopulate)
          .exec()
      : []
    const topSellingById = new Map(
      topSellingDocuments.map((course) => [String(course._id), course])
    )
    const mostSellingCourses = topSellingIds
      .map((courseId) => topSellingById.get(String(courseId)))
      .filter(Boolean)

    res.status(200).json({
      success: true,
      data: {
        selectedCategory: publicCategory(selectedCategory),
        differentCategory: publicCategory(differentCategory),
        mostSellingCourses: mostSellingCourses.map(publicCourse),
      },
    })
  } catch (error) {
    console.error("Category page lookup failed:", error.message)
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    })
  }
}

exports._test = { publicCategory, publicCourse, topSellingPipeline }
