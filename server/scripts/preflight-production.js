require("dotenv").config({ quiet: true })

const mongoose = require("mongoose")

const Category = require("../models/Category")
const Course = require("../models/Course")
const CourseProgress = require("../models/CourseProgress")
const OTP = require("../models/OTP")
const Profile = require("../models/Profile")
const Purchase = require("../models/Purchase")
const RatingAndReview = require("../models/RatingandReview")
const Section = require("../models/Section")
const SubSection = require("../models/Subsection")
const User = require("../models/User")
const { isLessonPublishReady } = require("../utils/courseLifecycle")

const duplicateGroupCount = async (model, groupId, match = {}) => {
  const [result] = await model.aggregate([
    { $match: match },
    { $group: { _id: groupId, count: { $sum: 1 } } },
    { $match: { count: { $gt: 1 } } },
    { $count: "groups" },
  ])
  return result?.groups || 0
}

const duplicateArrayGroupCount = async (model, arrayField, match = {}) => {
  const [result] = await model.aggregate([
    { $match: match },
    { $unwind: `$${arrayField}` },
    {
      $group: {
        _id: { user: "$user", value: `$${arrayField}` },
        count: { $sum: 1 },
      },
    },
    { $match: { count: { $gt: 1 } } },
    { $count: "groups" },
  ])
  return result?.groups || 0
}

const run = async () => {
  const mongoUrl = process.env.MONGODB_URI || process.env.MONGODB_URL
  if (!mongoUrl) throw new Error("MONGODB_URI is required")

  await mongoose.connect(mongoUrl, { autoIndex: false })

  const publishedCourses = await Course.find({ status: "Published" })
    .select(
      "_id category courseContent courseDescription courseName everPublishedAt instructor instructions price tag thumbnail whatYouWillLearn"
    )
    .lean()
  const publishedSectionIds = publishedCourses.flatMap(
    (course) => course.courseContent || []
  )
  const publishedSections = publishedSectionIds.length
    ? await Section.find({ _id: { $in: publishedSectionIds } })
        .select("_id subSection")
        .lean()
    : []
  const publishedLessonIds = publishedSections.flatMap(
    (section) => section.subSection || []
  )
  const uniquePublishedSectionIds = new Set(publishedSectionIds.map(String))
  const uniquePublishedLessonIds = new Set(publishedLessonIds.map(String))
  const publishedCategoryIds = [
    ...new Map(
      publishedCourses
        .filter((course) => course.category)
        .map((course) => [String(course.category), course.category])
    ).values(),
  ]
  const existingCategoryIds = publishedCategoryIds.length
    ? await Category.find({ _id: { $in: publishedCategoryIds } }).distinct("_id")
    : []
  const existingCategoryIdSet = new Set(existingCategoryIds.map(String))

  const paidCourseIds = await Purchase.distinct("courses", {
    status: { $in: ["paid", "fulfilled", "refund_pending", "refund_requested"] },
  })
  const entitledCourses = await Course.find({
    $or: [
      { "studentsEnroled.0": { $exists: true } },
      { _id: { $in: paidCourseIds } },
    ],
  })
    .select("_id courseContent")
    .lean()
  const entitledSectionIds = entitledCourses.flatMap(
    (course) => course.courseContent || []
  )
  const entitledSections = entitledSectionIds.length
    ? await Section.find({ _id: { $in: entitledSectionIds } })
        .select("_id subSection")
        .lean()
    : []
  const entitledLessonIds = entitledSections.flatMap(
    (section) => section.subSection || []
  )
  const entitledLessons = entitledLessonIds.length
    ? await SubSection.find({ _id: { $in: entitledLessonIds } })
        .select(
          "title description timeDuration videoUrl +videoPublicId +videoFormat +videoDeliveryType"
        )
        .lean()
    : []
  const uniqueEntitledSectionIds = new Set(entitledSectionIds.map(String))
  const uniqueEntitledLessonIds = new Set(entitledLessonIds.map(String))
  const entitledCourseIdSet = new Set(entitledCourses.map((course) => String(course._id)))
  const [unledgeredEnrollmentResult] = await Course.aggregate([
    { $match: { "studentsEnroled.0": { $exists: true } } },
    { $unwind: "$studentsEnroled" },
    {
      $lookup: {
        from: Purchase.collection.name,
        let: { courseId: "$_id", userId: "$studentsEnroled" },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ["$user", "$$userId"] },
                  { $in: ["$$courseId", "$courses"] },
                  {
                    $in: [
                      "$status",
                      ["fulfilled", "refund_pending", "refund_requested"],
                    ],
                  },
                ],
              },
            },
          },
          { $limit: 1 },
        ],
        as: "purchaseLedger",
      },
    },
    { $match: { purchaseLedger: { $size: 0 } } },
    { $count: "count" },
  ])
  const enrollmentsWithoutPurchaseLedger =
    unledgeredEnrollmentResult?.count || 0
  const [unledgeredUserEntitlementResult] = await User.aggregate([
    {
      $match: {
        accountType: "Student",
        "courses.0": { $exists: true },
      },
    },
    { $unwind: "$courses" },
    {
      $lookup: {
        from: Purchase.collection.name,
        let: { courseId: "$courses", userId: "$_id" },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ["$user", "$$userId"] },
                  { $in: ["$$courseId", "$courses"] },
                  {
                    $in: [
                      "$status",
                      ["fulfilled", "refund_pending", "refund_requested"],
                    ],
                  },
                ],
              },
            },
          },
          { $limit: 1 },
        ],
        as: "purchaseLedger",
      },
    },
    { $match: { purchaseLedger: { $size: 0 } } },
    { $count: "count" },
  ])
  const userEntitlementsWithoutPurchaseLedger =
    unledgeredUserEntitlementResult?.count || 0
  const [userCourseMirrorResult, courseStudentMirrorResult] = await Promise.all([
    User.aggregate([
      {
        $match: {
          accountType: "Student",
          "courses.0": { $exists: true },
        },
      },
      { $unwind: "$courses" },
      {
        $lookup: {
          from: Course.collection.name,
          localField: "courses",
          foreignField: "_id",
          as: "courseMirror",
        },
      },
      {
        $facet: {
          danglingCourseReferences: [
            { $match: { courseMirror: { $size: 0 } } },
            { $count: "count" },
          ],
          missingCourseEnrollmentMirror: [
            { $match: { "courseMirror.0": { $exists: true } } },
            {
              $match: {
                $expr: {
                  $eq: [
                    {
                      $in: [
                        "$_id",
                        {
                          $ifNull: [
                            {
                              $arrayElemAt: [
                                "$courseMirror.studentsEnroled",
                                0,
                              ],
                            },
                            [],
                          ],
                        },
                      ],
                    },
                    false,
                  ],
                },
              },
            },
            { $count: "count" },
          ],
        },
      },
    ]),
    Course.aggregate([
      { $match: { "studentsEnroled.0": { $exists: true } } },
      { $unwind: "$studentsEnroled" },
      {
        $lookup: {
          from: User.collection.name,
          localField: "studentsEnroled",
          foreignField: "_id",
          as: "userMirror",
        },
      },
      {
        $facet: {
          danglingStudentReferences: [
            { $match: { userMirror: { $size: 0 } } },
            { $count: "count" },
          ],
          missingUserCourseMirror: [
            { $match: { "userMirror.0": { $exists: true } } },
            {
              $match: {
                $expr: {
                  $eq: [
                    {
                      $in: [
                        "$_id",
                        {
                          $ifNull: [
                            { $arrayElemAt: ["$userMirror.courses", 0] },
                            [],
                          ],
                        },
                      ],
                    },
                    false,
                  ],
                },
              },
            },
            { $count: "count" },
          ],
          invalidStudentAccountTypes: [
            { $match: { "userMirror.0": { $exists: true } } },
            {
              $match: {
                $expr: {
                  $ne: [
                    { $arrayElemAt: ["$userMirror.accountType", 0] },
                    "Student",
                  ],
                },
              },
            },
            { $count: "count" },
          ],
        },
      },
    ]),
  ])
  const countFacet = (result, key) => result?.[0]?.[key]?.[0]?.count || 0
  const danglingUserCourseReferences = countFacet(
    userCourseMirrorResult,
    "danglingCourseReferences"
  )
  const userEntitlementsMissingCourseMirror = countFacet(
    userCourseMirrorResult,
    "missingCourseEnrollmentMirror"
  )
  const danglingCourseStudentReferences = countFacet(
    courseStudentMirrorResult,
    "danglingStudentReferences"
  )
  const courseEnrollmentsMissingUserMirror = countFacet(
    courseStudentMirrorResult,
    "missingUserCourseMirror"
  )
  const courseEnrollmentsWithInvalidAccountType = countFacet(
    courseStudentMirrorResult,
    "invalidStudentAccountTypes"
  )

  const [publishedLessons, publishedInstructors, allCourses, allCategories] =
    await Promise.all([
      publishedLessonIds.length
        ? SubSection.find({ _id: { $in: publishedLessonIds } })
            .select(
              "title description timeDuration videoUrl +videoPublicId +videoFormat +videoDeliveryType"
            )
            .lean()
        : [],
      User.find({
        _id: {
          $in: publishedCourses.map((course) => course.instructor).filter(Boolean),
        },
      })
        .select("_id accountType active approved")
        .lean(),
      Course.find({}).select("_id category").lean(),
      Category.find({}).select("_id name courses").lean(),
    ])
  const validPublishedInstructorIds = new Set(
    publishedInstructors
      .filter(
        (user) =>
          user.accountType === "Instructor" &&
          user.active === true &&
          user.approved === true
      )
      .map((user) => String(user._id))
  )
  const coursesById = new Map(allCourses.map((course) => [String(course._id), course]))
  const categoriesById = new Map(
    allCategories.map((category) => [String(category._id), category])
  )

  const [
    usersMissingSecurityDefaults,
    usersMissingProfiles,
    usersWithDanglingProfiles,
    invalidUserEmails,
    nonNormalizedUserEmails,
    duplicateEmails,
    duplicateProgress,
    duplicateReviews,
    duplicateReceipts,
    duplicateOrderIds,
    duplicatePaymentIds,
    duplicateCategoryNames,
    duplicateGoogleIds,
    duplicateOtpEmails,
    nonNormalizedOtpEmails,
    duplicateActivePurchaseCourses,
    duplicateCheckoutKeys,
    duplicateIdempotencyKeys,
  ] = await Promise.all([
    User.collection.countDocuments({
      $or: [
        { active: { $exists: false } },
        { approved: { $exists: false } },
        { authProviders: { $exists: false } },
        { deletionPending: { $exists: false } },
        { instructorApprovalStatus: { $exists: false } },
        { sessionVersion: { $exists: false } },
      ],
    }),
    User.collection.countDocuments({
      $or: [
        { additionalDetails: { $exists: false } },
        { additionalDetails: null },
      ],
    }),
    User.aggregate([
      { $match: { additionalDetails: { $type: "objectId" } } },
      {
        $lookup: {
          from: Profile.collection.name,
          localField: "additionalDetails",
          foreignField: "_id",
          as: "profile",
        },
      },
      { $match: { profile: { $size: 0 } } },
      { $count: "count" },
    ]).then(([result]) => result?.count || 0),
    User.collection.countDocuments({
      $or: [
        { email: { $not: { $type: "string" } } },
        { email: { $not: /^[^\s@]+@[^\s@]+\.[^\s@]+$/i } },
      ],
    }),
    User.collection.countDocuments({
      email: { $type: "string" },
      $expr: {
        $ne: ["$email", { $toLower: { $trim: { input: "$email" } } }],
      },
    }),
    duplicateGroupCount(User, { $toLower: "$email" }, {
      email: { $type: "string" },
    }),
    duplicateGroupCount(CourseProgress, {
      userId: "$userId",
      courseID: "$courseID",
    }),
    duplicateGroupCount(RatingAndReview, {
      user: "$user",
      course: "$course",
    }),
    duplicateGroupCount(Purchase, "$receipt", { receipt: { $type: "string" } }),
    duplicateGroupCount(Purchase, "$razorpayOrderId", {
      razorpayOrderId: { $type: "string" },
    }),
    duplicateGroupCount(Purchase, "$razorpayPaymentId", {
      razorpayPaymentId: { $type: "string" },
    }),
    duplicateGroupCount(Category, "$name", { name: { $type: "string" } }),
    duplicateGroupCount(User, "$googleId", { googleId: { $type: "string" } }),
    duplicateGroupCount(OTP, { $toLower: "$email" }, {
      email: { $type: "string" },
    }),
    OTP.collection.countDocuments({
      email: { $type: "string" },
      $expr: {
        $ne: ["$email", { $toLower: { $trim: { input: "$email" } } }],
      },
    }),
    duplicateArrayGroupCount(Purchase, "activeCourses", {
      "activeCourses.0": { $exists: true },
    }),
    duplicateGroupCount(
      Purchase,
      { user: "$user", checkoutKey: "$checkoutKey" },
      { checkoutKey: { $type: "string" } }
    ),
    duplicateGroupCount(
      Purchase,
      { user: "$user", idempotencyKey: "$idempotencyKey" },
      { idempotencyKey: { $type: "string" } }
    ),
  ])

  const findings = {
    insecurePublishedLessons: publishedLessons.filter(
      (lesson) =>
        !lesson.videoPublicId ||
        !lesson.videoFormat ||
        lesson.videoDeliveryType !== "authenticated"
    ).length,
    publishedLessonsWithInvalidMetadata: publishedLessons.filter(
      (lesson) => !isLessonPublishReady(lesson)
    ).length,
    insecureEntitledLessons: entitledLessons.filter(
      (lesson) =>
        !lesson.videoPublicId ||
        !lesson.videoFormat ||
        lesson.videoDeliveryType !== "authenticated"
    ).length,
    entitledLessonsWithInvalidMetadata: entitledLessons.filter(
      (lesson) => !isLessonPublishReady(lesson)
    ).length,
    entitledCoursesWithoutContent: entitledCourses.filter(
      (course) => !course.courseContent?.length
    ).length,
    missingEntitledSectionReferences:
      uniqueEntitledSectionIds.size - entitledSections.length,
    entitledSectionsWithoutLessons: entitledSections.filter(
      (section) => !section.subSection?.length
    ).length,
    missingEntitledLessonReferences:
      uniqueEntitledLessonIds.size - entitledLessons.length,
    missingPaidCourseReferences: new Set(
      paidCourseIds
        .map(String)
        .filter((courseId) => !entitledCourseIdSet.has(courseId))
    ).size,
    enrollmentsWithoutPurchaseLedger,
    userEntitlementsWithoutPurchaseLedger,
    danglingUserCourseReferences,
    userEntitlementsMissingCourseMirror,
    danglingCourseStudentReferences,
    courseEnrollmentsMissingUserMirror,
    courseEnrollmentsWithInvalidAccountType,
    publishedCoursesWithInvalidMetadata: publishedCourses.filter((course) => {
      const requiredText = [
        [course.courseName, 200],
        [course.courseDescription, 10000],
        [course.whatYouWillLearn, 10000],
        [course.thumbnail, 2048],
      ]
      const textIsInvalid = requiredText.some(
        ([value, maxLength]) =>
          typeof value !== "string" ||
          !value.trim() ||
          value.trim().length > maxLength
      )
      const tagsAreInvalid =
        !Array.isArray(course.tag) ||
        !course.tag.length ||
        course.tag.length > 50 ||
        course.tag.some(
          (tag) =>
            typeof tag !== "string" || !tag.trim() || tag.trim().length > 80
        )
      const instructionsAreInvalid =
        !Array.isArray(course.instructions) ||
        !course.instructions.length ||
        course.instructions.length > 100 ||
        course.instructions.some(
          (instruction) =>
            typeof instruction !== "string" ||
            !instruction.trim() ||
            instruction.trim().length > 1000
        )
      return (
        textIsInvalid ||
        tagsAreInvalid ||
        instructionsAreInvalid ||
        !Number.isFinite(course.price) ||
        course.price <= 0 ||
        course.price > 10000000
      )
    }).length,
    publishedCoursesWithoutContent: publishedCourses.filter(
      (course) => !course.courseContent?.length
    ).length,
    missingPublishedSectionReferences:
      uniquePublishedSectionIds.size - publishedSections.length,
    publishedSectionsWithoutLessons: publishedSections.filter(
      (section) => !section.subSection?.length
    ).length,
    missingPublishedLessonReferences:
      uniquePublishedLessonIds.size - publishedLessons.length,
    publishedCoursesWithMissingCategories: publishedCourses.filter(
      (course) =>
        !course.category || !existingCategoryIdSet.has(String(course.category))
    ).length,
    publishedCoursesWithInvalidInstructors: publishedCourses.filter(
      (course) =>
        !course.instructor ||
        !validPublishedInstructorIds.has(String(course.instructor))
    ).length,
    publishedCoursesMissingLifecycleMarker: publishedCourses.filter(
      (course) => !course.everPublishedAt
    ).length,
    coursesMissingCategoryBackReference: allCourses.filter((course) => {
      const category = categoriesById.get(String(course.category))
      return (
        !category ||
        !(category.courses || []).some(
          (courseId) => String(courseId) === String(course._id)
        )
      )
    }).length,
    invalidCategoryCourseReferences: allCategories.reduce(
      (count, category) =>
        count +
        (category.courses || []).filter((courseId) => {
          const course = coursesById.get(String(courseId))
          return !course || String(course.category) !== String(category._id)
        }).length,
      0
    ),
    usersMissingSecurityDefaults,
    usersMissingProfiles,
    usersWithDanglingProfiles,
    invalidUserEmails,
    nonNormalizedUserEmails,
    duplicateEmails,
    duplicateProgress,
    duplicateReviews,
    duplicateReceipts,
    duplicateOrderIds,
    duplicatePaymentIds,
    duplicateCategoryNames,
    duplicateGoogleIds,
    duplicateOtpEmails,
    nonNormalizedOtpEmails,
    duplicateActivePurchaseCourses,
    duplicateCheckoutKeys,
    duplicateIdempotencyKeys,
  }

  console.log(JSON.stringify({ database: mongoose.connection.name, findings }, null, 2))

  if (Object.values(findings).some((count) => count > 0)) {
    throw new Error(
      "Production preflight failed; resolve every non-zero finding before deployment"
    )
  }

  console.log("Production data preflight passed")
}

if (require.main === module) {
  run()
    .catch((error) => {
      console.error("Production preflight failed:", error.message)
      process.exitCode = 1
    })
    .finally(async () => {
      await mongoose.disconnect()
    })
}

module.exports = { isPublishedLessonMetadataValid: isLessonPublishReady }
