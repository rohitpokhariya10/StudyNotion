const { loadEnvironment } = require("../config/loadEnvironment")

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
const {
  createEnrollmentConsistencyService,
} = require("../domains/enrollment/enrollmentConsistencyService")
const {
  assertEnrollmentConsistencyReport,
} = require("../domains/enrollment/enrollmentConsistencyReport")
const {
  createEntitlementRecoveryService,
} = require("../domains/entitlement/entitlementRecoveryService")
const {
  parseSidecarStartedAt,
} = require("../domains/entitlement/entitlementService")
const { isLessonPublishReady } = require("../utils/courseLifecycle")
const logger = require("../utils/logger")
const {
  models: indexModels,
  mongoOptions,
  verifyDeclaredIndexes,
} = require("./create-indexes")

const PREFLIGHT_EXIT_CODES = Object.freeze({
  healthy: 0,
  warning: 1,
  blocking: 2,
  operational_error: 3,
})

const PREFLIGHT_ENROLLMENT_SAMPLE_LIMIT = 5
const MAX_BOUNDARY_FUTURE_SKEW_MS = 5 * 60 * 1000
class EnrollmentPreflightReportError extends Error {
  constructor() {
    super("Enrollment consistency audit returned an invalid report")
    this.name = "EnrollmentPreflightReportError"
    this.code = "ENROLLMENT_PREFLIGHT_INVALID_REPORT"
  }
}

class EntitlementPreflightReportError extends Error {
  constructor(message = "Entitlement recovery returned an invalid report") {
    super(message)
    this.name = "EntitlementPreflightReportError"
    this.code = "ENTITLEMENT_PREFLIGHT_INVALID_REPORT"
  }
}

const createPreflightLogger = ({ environment = process.env } = {}) =>
  logger.createRuntimeLogger({
    environment,
    write: (line) => process.stderr.write(`${line}\n`),
  })

const validateEnrollmentConsistencyReport = (report) => {
  try {
    return assertEnrollmentConsistencyReport(report, {
      expectedMode: "read_only",
    })
  } catch {
    throw new EnrollmentPreflightReportError()
  }
}

const parsePreflightSidecarStartedAt = (value, now = Date.now()) => {
  const parsed = parseSidecarStartedAt(value)
  if (!parsed) return parsed
  const nowMilliseconds = now instanceof Date ? now.getTime() : Number(now)
  if (!Number.isFinite(nowMilliseconds)) {
    throw new TypeError("preflight clock must be a valid time")
  }
  if (parsed.getTime() > nowMilliseconds + MAX_BOUNDARY_FUTURE_SKEW_MS) {
    throw new TypeError(
      "ENTITLEMENT_SIDECAR_STARTED_AT cannot be more than 5 minutes in the future"
    )
  }
  return parsed
}

const ENTITLEMENT_COUNT_KEYS = Object.freeze([
  "activeMissingLegacy",
  "ageHandoffRequired",
  "boundaryLifecycleMismatches",
  "boundaryMissingEpisodes",
  "completedDeletionCurrent",
  "dueProvisioning",
  "expiredLeases",
  "malformedEpisodes",
  "manualReview",
  "terminalLegacyConflicts",
])
const ENTITLEMENT_TRUNCATION_KEYS = Object.freeze([
  "ageHandoff",
  "boundary",
  "completedDeletion",
  "due",
  "expiredLease",
  "lifecycle",
  "manualReview",
])
const ENTITLEMENT_REPORT_KEYS = Object.freeze([
  "schemaVersion",
  "status",
  "observedAt",
  "counts",
  "boundaryExaminedCount",
  "truncated",
])

const isRecord = (value) =>
  Boolean(value && typeof value === "object" && !Array.isArray(value))

const hasExactKeys = (value, expectedKeys) => {
  if (!isRecord(value)) return false
  const actualKeys = Object.keys(value).sort()
  const sortedExpectedKeys = [...expectedKeys].sort()
  return (
    actualKeys.length === sortedExpectedKeys.length &&
    actualKeys.every((key, index) => key === sortedExpectedKeys[index])
  )
}

const isStrictIsoTimestamp = (value) => {
  if (
    typeof value !== "string" ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value)
  ) {
    return false
  }
  const parsed = new Date(value)
  return Number.isFinite(parsed.getTime()) && parsed.toISOString() === value
}

const validateEntitlementRecoveryReport = (report) => {
  const validCount = (value) => Number.isSafeInteger(value) && value >= 0
  if (
    !hasExactKeys(report, ENTITLEMENT_REPORT_KEYS) ||
    report.schemaVersion !== 1 ||
    !["healthy", "warning", "blocking"].includes(report.status) ||
    !isStrictIsoTimestamp(report.observedAt) ||
    !validCount(report.boundaryExaminedCount) ||
    !hasExactKeys(report.counts, ENTITLEMENT_COUNT_KEYS) ||
    !hasExactKeys(report.truncated, ENTITLEMENT_TRUNCATION_KEYS) ||
    !ENTITLEMENT_COUNT_KEYS.every((key) => validCount(report.counts[key])) ||
    !ENTITLEMENT_TRUNCATION_KEYS.every(
      (key) => typeof report.truncated[key] === "boolean"
    )
  ) {
    throw new EntitlementPreflightReportError()
  }
  const blockingTotal =
    report.counts.activeMissingLegacy +
    report.counts.ageHandoffRequired +
    report.counts.boundaryLifecycleMismatches +
    report.counts.boundaryMissingEpisodes +
    report.counts.completedDeletionCurrent +
    report.counts.malformedEpisodes +
    report.counts.manualReview +
    report.counts.terminalLegacyConflicts
  const warningTotal =
    report.counts.dueProvisioning + report.counts.expiredLeases
  const truncated = ENTITLEMENT_TRUNCATION_KEYS.some(
    (key) => report.truncated[key]
  )
  const expectedStatus =
    truncated || blockingTotal > 0
      ? "blocking"
      : warningTotal > 0
        ? "warning"
        : "healthy"
  if (report.status !== expectedStatus) {
    throw new EntitlementPreflightReportError(
      "Entitlement recovery report severity is inconsistent"
    )
  }
  return report
}

const classifyPreflightResult = (
  findings,
  enrollmentConsistency,
  entitlementRecovery
) => {
  validateEnrollmentConsistencyReport(enrollmentConsistency)
  validateEntitlementRecoveryReport(entitlementRecovery)
  if (Object.values(findings).some((count) => count > 0)) return "blocking"
  if (enrollmentConsistency.status === "blocking") return "blocking"
  if (entitlementRecovery.status === "blocking") return "blocking"
  if (enrollmentConsistency.status === "warning") return "warning"
  if (entitlementRecovery.status === "warning") return "warning"
  return "healthy"
}

const entitlementRecoveryForPreflight = (report) => {
  validateEntitlementRecoveryReport(report)
  return {
    schemaVersion: report.schemaVersion,
    status: report.status,
    observedAt: report.observedAt,
    counts: Object.fromEntries(
      ENTITLEMENT_COUNT_KEYS.map((key) => [key, report.counts[key]])
    ),
    boundaryExaminedCount: report.boundaryExaminedCount,
    truncated: Object.fromEntries(
      ENTITLEMENT_TRUNCATION_KEYS.map((key) => [key, report.truncated[key]])
    ),
  }
}

const enrollmentConsistencyForPreflight = (report) => {
  validateEnrollmentConsistencyReport(report)

  const samples = Array.isArray(report.samples) ? report.samples : []
  return {
    schemaVersion: report.schemaVersion,
    status: report.status,
    summary: report.summary,
    samples: samples.slice(0, PREFLIGHT_ENROLLMENT_SAMPLE_LIMIT),
    truncated:
      report.truncated === true ||
      samples.length > PREFLIGHT_ENROLLMENT_SAMPLE_LIMIT,
  }
}

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

const validateRuntimeConfiguration = ({
  environment = process.env,
  loadConfiguration = () => require("../config/env"),
} = {}) => {
  if (
    environment.NODE_ENV === "production" ||
    String(environment.DEPLOYMENT_TIER || "").trim()
  ) {
    loadConfiguration()
    return
  }
  if (
    environment.NODE_ENV === "test" &&
    environment.STUDYNOTION_RUN_PREFLIGHT_INTEGRATION === "1"
  ) {
    return
  }
  throw new Error(
    "Production preflight requires NODE_ENV=production; disposable execution is limited to its guarded integration suite"
  )
}

const verifyPreflightIndexes = ({
  registeredModels = indexModels,
  verifyIndexes = verifyDeclaredIndexes,
} = {}) => verifyIndexes({ registeredModels })

const run = async ({ targetLogger = createPreflightLogger() } = {}) => {
  // A release preflight must prove that the exact production/staging runtime
  // contract is valid before it reaches MongoDB. Unit and disposable integration
  // fixtures use NODE_ENV=test and continue to exercise the read-only data gate
  // without requiring credentials for external providers.
  validateRuntimeConfiguration()

  const mongoUrl = process.env.MONGODB_URI || process.env.MONGODB_URL
  if (!mongoUrl) throw new Error("MONGODB_URI is required")
  const sidecarStartedAt = parsePreflightSidecarStartedAt(
    process.env.ENTITLEMENT_SIDECAR_STARTED_AT
  )
  if (!sidecarStartedAt) {
    throw new Error("ENTITLEMENT_SIDECAR_STARTED_AT is required")
  }

  await mongoose.connect(mongoUrl, mongoOptions(process.env))

  // diffIndexes only performs index metadata reads. Production startup never
  // creates or drops indexes; the controlled index job owns those operations.
  const indexVerification = await verifyPreflightIndexes({
    registeredModels: indexModels,
  })

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
    ? await Category.find({ _id: { $in: publishedCategoryIds } }).distinct(
        "_id"
      )
    : []
  const existingCategoryIdSet = new Set(existingCategoryIds.map(String))

  const paidCourseIds = await Purchase.distinct("courses", {
    status: {
      $in: ["paid", "fulfilled", "refund_pending", "refund_requested"],
    },
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
  const entitledCourseIdSet = new Set(
    entitledCourses.map((course) => String(course._id))
  )
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
  const [userCourseMirrorResult, courseStudentMirrorResult] = await Promise.all(
    [
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
    ]
  )
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
          $in: publishedCourses
            .map((course) => course.instructor)
            .filter(Boolean),
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
  const coursesById = new Map(
    allCourses.map((course) => [String(course._id), course])
  )
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
    duplicateGroupCount(
      User,
      { $toLower: "$email" },
      {
        email: { $type: "string" },
      }
    ),
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
    duplicateGroupCount(
      OTP,
      { $toLower: "$email" },
      {
        email: { $type: "string" },
      }
    ),
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
    missingRequiredIndexes: indexVerification.missingIndexCount,
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

  const enrollmentConsistency = await createEnrollmentConsistencyService({
    targetLogger,
  }).audit({ sampleLimit: PREFLIGHT_ENROLLMENT_SAMPLE_LIMIT })
  const entitlementRecovery = await createEntitlementRecoveryService({
    sidecarStartedAt,
    targetLogger,
  }).getOperationalStatus()
  const status = classifyPreflightResult(
    findings,
    enrollmentConsistency,
    entitlementRecovery
  )
  const result = {
    database: mongoose.connection.name,
    status,
    exitCode: PREFLIGHT_EXIT_CODES[status],
    indexes: {
      modelsChecked: indexVerification.modelCount,
      missingRequiredIndexes: indexVerification.missingIndexCount,
    },
    findings,
    enrollmentConsistency: enrollmentConsistencyForPreflight(
      enrollmentConsistency
    ),
    entitlementRecovery: entitlementRecoveryForPreflight(entitlementRecovery),
  }

  console.log(JSON.stringify(result, null, 2))
  if (status === "healthy") console.log("Production data preflight passed")
  return result
}

const main = async ({
  disconnect = mongoose.disconnect.bind(mongoose),
  lifecycleLogger = createPreflightLogger(),
  runPreflight = run,
  setExitCode = (exitCode) => {
    process.exitCode = exitCode
  },
  targetLogger = createPreflightLogger(),
} = {}) => {
  try {
    const result = await runPreflight({ targetLogger: lifecycleLogger })
    setExitCode(result.exitCode)
    return result
  } catch (error) {
    targetLogger.error("production.preflight_failed", {
      error: logger.errorMetadata(error),
      status: "operational_error",
    })
    setExitCode(PREFLIGHT_EXIT_CODES.operational_error)
    return undefined
  } finally {
    await disconnect()
  }
}

const startCli = ({
  createTargetLogger = createPreflightLogger,
  environment = process.env,
  loadRuntimeEnvironment = loadEnvironment,
  runMain = main,
} = {}) => {
  loadRuntimeEnvironment()
  const targetLogger = createTargetLogger({ environment })
  return runMain({ lifecycleLogger: targetLogger, targetLogger })
}

if (require.main === module) void startCli()

module.exports = {
  EntitlementPreflightReportError,
  EnrollmentPreflightReportError,
  PREFLIGHT_ENROLLMENT_SAMPLE_LIMIT,
  PREFLIGHT_EXIT_CODES,
  classifyPreflightResult,
  entitlementRecoveryForPreflight,
  enrollmentConsistencyForPreflight,
  isPublishedLessonMetadataValid: isLessonPublishReady,
  main,
  parsePreflightSidecarStartedAt,
  run,
  startCli,
  validateRuntimeConfiguration,
  validateEntitlementRecoveryReport,
  verifyPreflightIndexes,
}
