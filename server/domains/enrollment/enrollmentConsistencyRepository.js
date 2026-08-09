const Course = require("../../models/Course")
const CourseProgress = require("../../models/CourseProgress")
const Purchase = require("../../models/Purchase")
const User = require("../../models/User")
const {
  MAX_PAIR_COUNT,
  PURCHASE_STATUSES,
  REFUND_PENDING_ORIGINS,
  REFERENCE_STATES,
} = require("./enrollmentConsistency")

const AUDIT_QUERY_COMMENT = "studynotion.enrollment-consistency.v1"
const DEFAULT_BATCH_SIZE = 250
const DEFAULT_MAX_TIME_MS = 15_000

const counterName = (prefix, status) =>
  `${prefix}${status
    .split("_")
    .map((part) => `${part[0].toUpperCase()}${part.slice(1)}`)
    .join("")}Count`

const referenceStateExpression = (value) => ({
  $cond: [
    { $eq: [{ $type: value }, "objectId"] },
    REFERENCE_STATES.VALID,
    REFERENCE_STATES.INVALID,
  ],
})

const nullableObjectIdExpression = (value) => ({
  $cond: [{ $eq: [{ $type: value }, "objectId"] }, value, null],
})

const purchasePairStages = (field, source, { preserveEmpty = false } = {}) => {
  const courseReference = `$${field}`
  return [
    {
      $unwind: preserveEmpty
        ? { path: courseReference, preserveNullAndEmptyArrays: true }
        : courseReference,
    },
    {
      $project: {
        _id: 1,
        activeCourseOutsideImmutablePurchaseCount:
          field === "activeCourses"
            ? {
                $cond: [
                  { $isArray: "$courses" },
                  { $cond: [{ $in: [courseReference, "$courses"] }, 0, 1] },
                  1,
                ],
              }
            : { $literal: 0 },
        courseId: nullableObjectIdExpression(courseReference),
        courseReferenceState: referenceStateExpression(courseReference),
        purchaseStatus: "$status",
        refundOriginStatus: 1,
        userId: nullableObjectIdExpression("$user"),
        userReferenceState: referenceStateExpression("$user"),
      },
    },
    {
      $group: {
        _id: {
          courseId: "$courseId",
          courseReferenceState: "$courseReferenceState",
          purchaseId: "$_id",
          userId: "$userId",
          userReferenceState: "$userReferenceState",
        },
        occurrenceCount: { $sum: 1 },
        activeCourseOutsideImmutablePurchaseCount: {
          $max: "$activeCourseOutsideImmutablePurchaseCount",
        },
        refundOriginStatus: { $first: "$refundOriginStatus" },
        purchaseStatus: { $first: "$purchaseStatus" },
      },
    },
    {
      $project: {
        _id: 0,
        courseId: "$_id.courseId",
        courseReferenceState: "$_id.courseReferenceState",
        activeCourseOutsideImmutablePurchaseCount: 1,
        occurrenceCount: 1,
        purchaseId: "$_id.purchaseId",
        refundOriginStatus: 1,
        purchaseStatus: 1,
        source: { $literal: source },
        userId: "$_id.userId",
        userReferenceState: "$_id.userReferenceState",
      },
    },
  ]
}

const mirrorPairStages = ({
  arrayField,
  courseExpression,
  source,
  userExpression,
}) => [
  { $unwind: `$${arrayField}` },
  {
    $project: {
      _id: 0,
      courseId: nullableObjectIdExpression(courseExpression),
      courseReferenceState: referenceStateExpression(courseExpression),
      occurrenceCount: { $literal: 1 },
      source: { $literal: source },
      studentUserCourseOccurrenceCount:
        source === "userCourse"
          ? { $cond: [{ $eq: ["$accountType", "Student"] }, 1, 0] }
          : { $literal: 0 },
      userId: nullableObjectIdExpression(userExpression),
      userReferenceState: referenceStateExpression(userExpression),
    },
  },
]

const sourceCount = (source) => ({
  $sum: {
    $cond: [{ $eq: ["$source", source] }, "$occurrenceCount", 0],
  },
})

const nonUserCourseEvidenceCount = () => ({
  $sum: {
    $cond: [{ $ne: ["$source", "userCourse"] }, "$occurrenceCount", 0],
  },
})

const studentUserCourseCount = () => ({
  $sum: {
    $cond: [
      { $eq: ["$source", "userCourse"] },
      { $ifNull: ["$studentUserCourseOccurrenceCount", 0] },
      0,
    ],
  },
})

const duplicateSourceReferenceCount = (source) => ({
  $sum: {
    $cond: [
      {
        $and: [
          { $eq: ["$source", source] },
          { $eq: ["$courseReferenceState", REFERENCE_STATES.VALID] },
          { $gt: ["$occurrenceCount", 1] },
        ],
      },
      { $subtract: ["$occurrenceCount", 1] },
      0,
    ],
  },
})

const purchaseStatusCount = (source, status) => ({
  $sum: {
    $cond: [
      {
        $and: [
          { $eq: ["$source", source] },
          { $eq: ["$purchaseStatus", status] },
        ],
      },
      1,
      0,
    ],
  },
})

const unknownPurchaseStatusCount = (source) => ({
  $sum: {
    $cond: [
      {
        $and: [
          { $eq: ["$source", source] },
          { $not: [{ $in: ["$purchaseStatus", PURCHASE_STATUSES] }] },
        ],
      },
      1,
      0,
    ],
  },
})

const refundPendingOriginCount = (source, origin) => ({
  $sum: {
    $cond: [
      {
        $and: [
          { $eq: ["$source", source] },
          { $eq: ["$purchaseStatus", "refund_pending"] },
          origin === "unknown"
            ? {
                $not: [
                  {
                    $in: [
                      "$refundOriginStatus",
                      ["payment_review", "refund_requested"],
                    ],
                  },
                ],
              }
            : { $eq: ["$refundOriginStatus", origin] },
        ],
      },
      1,
      0,
    ],
  },
})

const refundOriginCounterName = (prefix, origin) =>
  counterName(`${prefix}RefundPending`, origin)

const buildEnrollmentConsistencyPipeline = () => {
  const group = {
    _id: {
      courseId: "$courseId",
      courseReferenceState: "$courseReferenceState",
      userId: "$userId",
      userReferenceState: "$userReferenceState",
    },
    activeCourseOutsideImmutablePurchaseCount: {
      $sum: {
        $cond: [
          { $eq: ["$source", "purchaseActiveCourse"] },
          "$activeCourseOutsideImmutablePurchaseCount",
          0,
        ],
      },
    },
    activePurchaseUnknownStatusCount: unknownPurchaseStatusCount(
      "purchaseActiveCourse"
    ),
    courseEnrollmentCount: sourceCount("courseStudent"),
    duplicatePurchaseActiveCourseReferenceCount: duplicateSourceReferenceCount(
      "purchaseActiveCourse"
    ),
    duplicatePurchaseCourseReferenceCount:
      duplicateSourceReferenceCount("purchaseCourse"),
    progressCount: sourceCount("courseProgress"),
    purchaseUnknownStatusCount: unknownPurchaseStatusCount("purchaseCourse"),
    nonUserCourseEvidenceCount: nonUserCourseEvidenceCount(),
    rawUserCourseCount: sourceCount("userCourse"),
    studentUserCourseCount: studentUserCourseCount(),
  }

  for (const status of PURCHASE_STATUSES) {
    group[counterName("purchase", status)] = purchaseStatusCount(
      "purchaseCourse",
      status
    )
    group[counterName("activePurchase", status)] = purchaseStatusCount(
      "purchaseActiveCourse",
      status
    )
  }
  for (const origin of REFUND_PENDING_ORIGINS) {
    group[refundOriginCounterName("purchase", origin)] =
      refundPendingOriginCount("purchaseCourse", origin)
    group[refundOriginCounterName("activePurchase", origin)] =
      refundPendingOriginCount("purchaseActiveCourse", origin)
  }

  return [
    ...purchasePairStages("courses", "purchaseCourse", {
      preserveEmpty: true,
    }),
    {
      $unionWith: {
        coll: Purchase.collection.name,
        pipeline: purchasePairStages("activeCourses", "purchaseActiveCourse"),
      },
    },
    {
      $unionWith: {
        coll: User.collection.name,
        pipeline: mirrorPairStages({
          arrayField: "courses",
          courseExpression: "$courses",
          source: "userCourse",
          userExpression: "$_id",
        }),
      },
    },
    {
      $unionWith: {
        coll: Course.collection.name,
        pipeline: mirrorPairStages({
          arrayField: "studentsEnroled",
          courseExpression: "$_id",
          source: "courseStudent",
          userExpression: "$studentsEnroled",
        }),
      },
    },
    {
      $unionWith: {
        coll: CourseProgress.collection.name,
        pipeline: [
          {
            $project: {
              _id: 0,
              courseId: nullableObjectIdExpression("$courseID"),
              courseReferenceState: referenceStateExpression("$courseID"),
              occurrenceCount: { $literal: 1 },
              source: { $literal: "courseProgress" },
              userId: nullableObjectIdExpression("$userId"),
              userReferenceState: referenceStateExpression("$userId"),
            },
          },
        ],
      },
    },
    { $group: group },
    {
      $match: {
        $or: [
          { nonUserCourseEvidenceCount: { $gt: 0 } },
          { studentUserCourseCount: { $gt: 0 } },
        ],
      },
    },
    {
      $sort: {
        "_id.userReferenceState": 1,
        "_id.userId": 1,
        "_id.courseReferenceState": 1,
        "_id.courseId": 1,
      },
    },
    {
      $lookup: {
        as: "userDocument",
        from: User.collection.name,
        let: { userId: "$_id.userId" },
        pipeline: [
          { $match: { $expr: { $eq: ["$_id", "$$userId"] } } },
          {
            $project: {
              _id: 1,
              accountType: 1,
              active: 1,
              approved: 1,
              deletionPending: 1,
            },
          },
          { $limit: 1 },
        ],
      },
    },
    {
      $lookup: {
        as: "courseDocument",
        from: Course.collection.name,
        let: { courseId: "$_id.courseId" },
        pipeline: [
          { $match: { $expr: { $eq: ["$_id", "$$courseId"] } } },
          { $project: { _id: 1 } },
          { $limit: 1 },
        ],
      },
    },
    {
      $project: {
        _id: 0,
        activeCourseOutsideImmutablePurchaseCount: 1,
        activePurchaseUnknownStatusCount: 1,
        courseDocument: { $arrayElemAt: ["$courseDocument", 0] },
        courseEnrollmentCount: 1,
        courseId: "$_id.courseId",
        courseReferenceState: "$_id.courseReferenceState",
        duplicatePurchaseActiveCourseReferenceCount: 1,
        duplicatePurchaseCourseReferenceCount: 1,
        progressCount: 1,
        purchaseUnknownStatusCount: 1,
        userCourseCount: {
          $cond: [
            { $gt: ["$nonUserCourseEvidenceCount", 0] },
            "$rawUserCourseCount",
            "$studentUserCourseCount",
          ],
        },
        userDocument: { $arrayElemAt: ["$userDocument", 0] },
        userId: "$_id.userId",
        userReferenceState: "$_id.userReferenceState",
        ...Object.fromEntries([
          ...PURCHASE_STATUSES.flatMap((status) => [
            [counterName("purchase", status), 1],
            [counterName("activePurchase", status), 1],
          ]),
          ...REFUND_PENDING_ORIGINS.flatMap((origin) => [
            [refundOriginCounterName("purchase", origin), 1],
            [refundOriginCounterName("activePurchase", origin), 1],
          ]),
        ]),
      },
    },
  ]
}

const nonNegativeInteger = (value) => {
  const number = Number(value)
  if (!Number.isFinite(number) || number < 0) return 0
  return Math.min(Math.trunc(number), MAX_PAIR_COUNT)
}

const OBJECT_ID_PATTERN = /^[a-f\d]{24}$/i
const safeObjectId = (value) => {
  let candidate = null
  if (typeof value === "string") candidate = value
  else if (typeof value?.toHexString === "function") {
    candidate = value.toHexString()
  } else if (typeof value?.toString === "function") {
    candidate = value.toString()
  }
  return typeof candidate === "string" && OBJECT_ID_PATTERN.test(candidate)
    ? candidate.toLowerCase()
    : null
}

const SAFE_ACCOUNT_TYPES = new Set(["Admin", "Instructor", "Student"])

const statusCounts = (document, prefix) =>
  Object.fromEntries(
    PURCHASE_STATUSES.map((status) => [
      status,
      nonNegativeInteger(document[counterName(prefix, status)]),
    ])
  )

const refundPendingOriginCounts = (document, prefix) =>
  Object.fromEntries(
    REFUND_PENDING_ORIGINS.map((origin) => [
      origin,
      nonNegativeInteger(document[refundOriginCounterName(prefix, origin)]),
    ])
  )

const mapPairState = (document) => {
  const userId = safeObjectId(document.userId)
  const courseId = safeObjectId(document.courseId)
  const userReferenceState = userId
    ? REFERENCE_STATES.VALID
    : REFERENCE_STATES.INVALID
  const courseReferenceState = courseId
    ? REFERENCE_STATES.VALID
    : REFERENCE_STATES.INVALID
  const user = document.userDocument
  const userExists =
    userReferenceState === REFERENCE_STATES.VALID && Boolean(user?._id)
  const userSecurityDefaultsPresent =
    userExists &&
    Object.hasOwn(user, "active") &&
    typeof user.active === "boolean" &&
    Object.hasOwn(user, "approved") &&
    typeof user.approved === "boolean" &&
    Object.hasOwn(user, "deletionPending") &&
    typeof user.deletionPending === "boolean"
  return {
    userId,
    userReferenceState,
    courseId,
    courseReferenceState,
    userExists,
    userAccountType: userExists
      ? SAFE_ACCOUNT_TYPES.has(user.accountType)
        ? user.accountType
        : "Unknown"
      : null,
    userActive: userExists && user.active === true,
    userApproved: userExists && user.approved === true,
    userDeletionPending: userExists && user.deletionPending === true,
    userSecurityDefaultsPresent,
    activeCourseOutsideImmutablePurchaseCount: nonNegativeInteger(
      document.activeCourseOutsideImmutablePurchaseCount
    ),
    courseExists:
      courseReferenceState === REFERENCE_STATES.VALID &&
      Boolean(document.courseDocument?._id),
    duplicatePurchaseActiveCourseReferenceCount: nonNegativeInteger(
      document.duplicatePurchaseActiveCourseReferenceCount
    ),
    duplicatePurchaseCourseReferenceCount: nonNegativeInteger(
      document.duplicatePurchaseCourseReferenceCount
    ),
    userCourseCount: nonNegativeInteger(document.userCourseCount),
    courseEnrollmentCount: nonNegativeInteger(document.courseEnrollmentCount),
    progressCount: nonNegativeInteger(document.progressCount),
    purchaseStatusCounts: statusCounts(document, "purchase"),
    activePurchaseStatusCounts: statusCounts(document, "activePurchase"),
    unknownActivePurchaseStatusCount: nonNegativeInteger(
      document.activePurchaseUnknownStatusCount
    ),
    unknownPurchaseStatusCount: nonNegativeInteger(
      document.purchaseUnknownStatusCount
    ),
    refundPendingOriginCounts: refundPendingOriginCounts(document, "purchase"),
    activeRefundPendingOriginCounts: refundPendingOriginCounts(
      document,
      "activePurchase"
    ),
  }
}

const validatePositiveInteger = (value, name, maximum) => {
  if (!Number.isSafeInteger(value) || value < 1 || value > maximum) {
    throw new Error(`${name} must be an integer between 1 and ${maximum}`)
  }
}

const createEnrollmentConsistencyRepository = ({
  batchSize = DEFAULT_BATCH_SIZE,
  maxTimeMS = DEFAULT_MAX_TIME_MS,
  PurchaseModel = Purchase,
} = {}) => {
  validatePositiveInteger(batchSize, "batchSize", 10_000)
  validatePositiveInteger(maxTimeMS, "maxTimeMS", 120_000)

  const configuredAggregation = () =>
    PurchaseModel.aggregate(buildEnrollmentConsistencyPipeline())
      .allowDiskUse(true)
      .read("primary")
      .readConcern("majority")
      .option({ comment: AUDIT_QUERY_COMMENT, maxTimeMS })

  return Object.freeze({
    explain: () => configuredAggregation().explain("executionStats"),
    streamPairStates: async function* streamPairStates() {
      const cursor = configuredAggregation().cursor({ batchSize })
      for await (const document of cursor) yield mapPairState(document)
    },
  })
}

module.exports = {
  AUDIT_QUERY_COMMENT,
  PURCHASE_STATUSES,
  buildEnrollmentConsistencyPipeline,
  createEnrollmentConsistencyRepository,
  mapPairState,
}
