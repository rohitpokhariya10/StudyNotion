const mongoose = require("mongoose")

const Category = require("../../models/Category")
const Course = require("../../models/Course")
const RatingAndReview = require("../../models/RatingandReview")
const Section = require("../../models/Section")
const SubSection = require("../../models/Subsection")
const User = require("../../models/User")
const { SORT_DEFINITIONS } = require("./catalogCursor")

const buildBaseMatch = (query) => {
  const match = { status: "Published" }
  if (query.q) match.$text = { $search: query.q }
  if (query.categoryId) {
    match.category = new mongoose.Types.ObjectId(query.categoryId)
  }
  if (query.level) match.level = query.level
  if (query.language) match.language = query.language
  if (query.minPrice !== undefined || query.maxPrice !== undefined) {
    match.price = {}
    if (query.minPrice !== undefined) match.price.$gte = query.minPrice
    if (query.maxPrice !== undefined) match.price.$lte = query.maxPrice
  }
  return match
}

const buildComputedMatch = (query) => {
  const match = {}
  if (query.minRating !== undefined) {
    match.ratingAverage = { $gte: query.minRating }
  }
  if (
    query.minDurationSeconds !== undefined ||
    query.maxDurationSeconds !== undefined
  ) {
    match.durationSeconds = {}
    if (query.minDurationSeconds !== undefined) {
      match.durationSeconds.$gte = query.minDurationSeconds
    }
    if (query.maxDurationSeconds !== undefined) {
      match.durationSeconds.$lte = query.maxDurationSeconds
    }
  }
  return match
}

const buildCursorMatch = (query, cursor) => {
  if (!cursor) return null
  const definition = SORT_DEFINITIONS[query.sort]
  const comparison = definition.direction === 1 ? "$gt" : "$lt"
  const key = definition.kind === "date" ? new Date(cursor.key) : cursor.key
  const id = new mongoose.Types.ObjectId(cursor.id)
  return {
    $or: [
      { [definition.field]: { [comparison]: key } },
      {
        [definition.field]: key,
        _id: { [comparison]: id },
      },
    ],
  }
}

const ratingStages = () => [
  {
    $lookup: {
      from: RatingAndReview.collection.name,
      let: { courseId: "$_id" },
      pipeline: [
        {
          $match: {
            $expr: { $eq: ["$course", "$$courseId"] },
          },
        },
        {
          $group: {
            _id: null,
            average: { $avg: "$rating" },
            count: { $sum: 1 },
          },
        },
      ],
      as: "catalogRating",
    },
  },
  {
    $set: {
      ratingAverage: {
        $ifNull: [{ $arrayElemAt: ["$catalogRating.average", 0] }, 0],
      },
      ratingCount: {
        $ifNull: [{ $arrayElemAt: ["$catalogRating.count", 0] }, 0],
      },
    },
  },
]

const durationStages = () => [
  {
    $lookup: {
      from: Section.collection.name,
      let: { sectionIds: { $ifNull: ["$courseContent", []] } },
      pipeline: [
        {
          $match: {
            $expr: { $in: ["$_id", "$$sectionIds"] },
          },
        },
        { $project: { _id: 0, subSection: 1 } },
      ],
      as: "catalogSections",
    },
  },
  {
    $set: {
      catalogLessonIds: {
        $reduce: {
          input: "$catalogSections",
          initialValue: [],
          in: {
            $concatArrays: ["$$value", { $ifNull: ["$$this.subSection", []] }],
          },
        },
      },
    },
  },
  {
    $lookup: {
      from: SubSection.collection.name,
      let: { lessonIds: "$catalogLessonIds" },
      pipeline: [
        {
          $match: {
            $expr: { $in: ["$_id", "$$lessonIds"] },
          },
        },
        {
          $project: {
            _id: 0,
            duration: {
              $convert: {
                input: "$timeDuration",
                to: "double",
                onError: 0,
                onNull: 0,
              },
            },
          },
        },
      ],
      as: "catalogLessons",
    },
  },
  {
    $set: {
      durationSeconds: {
        $round: [
          {
            $sum: {
              $map: {
                input: "$catalogLessons",
                as: "lesson",
                in: {
                  $cond: [
                    { $gt: ["$$lesson.duration", 0] },
                    "$$lesson.duration",
                    0,
                  ],
                },
              },
            },
          },
          0,
        ],
      },
    },
  },
]

const enrollmentStage = {
  $set: {
    enrollmentCount: {
      $size: { $ifNull: ["$studentsEnroled", []] },
    },
  },
}

const buildCatalogPipeline = (query, cursor, requestedLimit) => {
  const definition = SORT_DEFINITIONS[query.sort]
  const computedMatch = buildComputedMatch(query)
  const cursorMatch = buildCursorMatch(query, cursor)
  const ratingBeforePage =
    query.sort === "rating_desc" || query.minRating !== undefined
  const durationBeforePage =
    query.minDurationSeconds !== undefined ||
    query.maxDurationSeconds !== undefined
  const enrollmentBeforePage = query.sort === "popular"
  const pipeline = [{ $match: buildBaseMatch(query) }]

  if (query.q) {
    pipeline.push({ $set: { searchScore: { $meta: "textScore" } } })
  }

  if (ratingBeforePage) pipeline.push(...ratingStages())
  if (durationBeforePage) pipeline.push(...durationStages())
  if (enrollmentBeforePage) pipeline.push(enrollmentStage)

  if (Object.keys(computedMatch).length)
    pipeline.push({ $match: computedMatch })
  if (cursorMatch) pipeline.push({ $match: cursorMatch })

  pipeline.push(
    {
      $sort: {
        [definition.field]: definition.direction,
        _id: definition.direction,
      },
    },
    { $limit: requestedLimit }
  )

  pipeline.push(
    {
      $lookup: {
        from: Category.collection.name,
        localField: "category",
        foreignField: "_id",
        pipeline: [{ $project: { _id: 1, name: 1 } }],
        as: "catalogCategory",
      },
    },
    {
      $lookup: {
        from: User.collection.name,
        localField: "instructor",
        foreignField: "_id",
        pipeline: [
          { $project: { _id: 1, firstName: 1, lastName: 1, image: 1 } },
        ],
        as: "catalogInstructor",
      },
    }
  )

  if (!ratingBeforePage) pipeline.push(...ratingStages())
  if (!durationBeforePage) pipeline.push(...durationStages())
  if (!enrollmentBeforePage) pipeline.push(enrollmentStage)

  pipeline.push(
    {
      $set: {
        category: { $arrayElemAt: ["$catalogCategory", 0] },
        instructor: { $arrayElemAt: ["$catalogInstructor", 0] },
      },
    },
    {
      $project: {
        _id: 1,
        courseName: 1,
        courseDescription: 1,
        thumbnail: 1,
        price: 1,
        createdAt: 1,
        level: 1,
        language: 1,
        category: 1,
        instructor: 1,
        ratingAverage: 1,
        ratingCount: 1,
        durationSeconds: 1,
        enrollmentCount: 1,
        searchScore: 1,
      },
    }
  )
  return pipeline
}

const listPublishedCourses = async (query, cursor) => {
  const pipeline = buildCatalogPipeline(query, cursor, query.limit + 1)
  return Course.aggregate(pipeline).option({ maxTimeMS: 15_000 }).exec()
}

module.exports = {
  buildCatalogPipeline,
  listPublishedCourses,
}
