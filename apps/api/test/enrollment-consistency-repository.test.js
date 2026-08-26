const assert = require("node:assert/strict")
const { test } = require("node:test")

const {
  mapEnrollmentConsistencyDryRun,
} = require("../domains/enrollment/enrollmentConsistency")
const {
  PURCHASE_STATUSES,
  buildEnrollmentConsistencyPipeline,
  mapPairState,
} = require("../domains/enrollment/enrollmentConsistencyRepository")

test("enrollment repository uses one bounded read-only aggregation shape", () => {
  const pipeline = buildEnrollmentConsistencyPipeline()
  const serialized = JSON.stringify(pipeline)

  assert.deepEqual(pipeline[0].$unwind, {
    path: "$courses",
    preserveNullAndEmptyArrays: true,
  })
  assert.equal(pipeline.filter((stage) => stage.$unionWith).length, 4)
  assert.equal(pipeline.filter((stage) => stage.$lookup).length, 2)
  assert.equal(serialized.includes('"$out"'), false)
  assert.equal(serialized.includes('"$merge"'), false)
  assert.equal(serialized.includes("videoUrl"), false)
  assert.equal(serialized.includes("lineItems"), false)
  assert.equal(serialized.includes("razorpay"), false)
  assert.equal(serialized.includes("email"), false)
  assert.equal(serialized.includes("purchaseUnknownStatusCount"), true)
  assert.equal(serialized.includes("courseReferenceState"), true)
  assert.equal(serialized.includes("userReferenceState"), true)
  assert.equal(
    serialized.includes("duplicatePurchaseCourseReferenceCount"),
    true
  )
  assert.equal(
    serialized.includes("duplicatePurchaseActiveCourseReferenceCount"),
    true
  )
  assert.equal(
    serialized.includes("activeCourseOutsideImmutablePurchaseCount"),
    true
  )
  const purchasePairGroup = pipeline.find(
    ({ $group }) => $group?._id?.purchaseId === "$_id"
  )
  assert.deepEqual(purchasePairGroup.$group.purchaseStatus, {
    $first: "$purchaseStatus",
  })
  const userUnion = pipeline.find(
    ({ $unionWith }) => $unionWith?.pipeline?.[0]?.$unwind === "$courses"
  )
  assert.equal(userUnion.$unionWith.pipeline[0].$unwind, "$courses")
  assert.deepEqual(
    userUnion.$unionWith.pipeline[1].$project.studentUserCourseOccurrenceCount,
    { $cond: [{ $eq: ["$accountType", "Student"] }, 1, 0] }
  )
  assert.equal(
    pipeline.some(
      ({ $match }) =>
        Array.isArray($match?.$or) &&
        $match.$or.some(({ nonUserCourseEvidenceCount }) =>
          Boolean(nonUserCourseEvidenceCount)
        )
    ),
    true
  )
  const activePurchaseUnion = pipeline.find(
    ({ $unionWith }) => $unionWith?.pipeline?.[0]?.$unwind === "$activeCourses"
  )
  assert.equal(
    activePurchaseUnion.$unionWith.pipeline[0].$unwind,
    "$activeCourses"
  )
})

test("repository mapping is strict, media-free, and preserves raw duplicate counts", () => {
  const document = {
    userId: { toString: () => "64b000000000000000000001" },
    courseId: { toString: () => "64b000000000000000000002" },
    userDocument: {
      _id: "64b000000000000000000001",
      accountType: "Student",
      active: true,
      approved: true,
      deletionPending: false,
    },
    courseDocument: { _id: "64b000000000000000000002" },
    userCourseCount: 2,
    courseEnrollmentCount: 3,
    progressCount: 1,
    activeCourseOutsideImmutablePurchaseCount: 0,
    duplicatePurchaseActiveCourseReferenceCount: 4,
    duplicatePurchaseCourseReferenceCount: 2,
    activePurchaseUnknownStatusCount: 0,
    purchaseFulfilledCount: 1,
    purchaseUnknownStatusCount: 0,
    activePurchaseFulfilledCount: 0,
    purchaseRefundPendingRefundRequestedCount: 0,
    activePurchaseRefundPendingRefundRequestedCount: 0,
  }

  const mapped = mapPairState(document)
  assert.equal(mapped.userActive, true)
  assert.equal(mapped.userApproved, true)
  assert.equal(mapped.userSecurityDefaultsPresent, true)
  assert.equal(mapped.userCourseCount, 2)
  assert.equal(mapped.courseEnrollmentCount, 3)
  assert.equal(mapped.purchaseStatusCounts.fulfilled, 1)
  assert.equal(mapped.activePurchaseStatusCounts.fulfilled, 0)
  assert.equal(mapped.activeCourseOutsideImmutablePurchaseCount, 0)
  assert.equal(mapped.userReferenceState, "valid")
  assert.equal(mapped.courseReferenceState, "valid")
  assert.equal(mapped.duplicatePurchaseCourseReferenceCount, 2)
  assert.equal(mapped.duplicatePurchaseActiveCourseReferenceCount, 4)
  assert.equal(mapped.unknownActivePurchaseStatusCount, 0)
  assert.equal(mapped.unknownPurchaseStatusCount, 0)
  assert.deepEqual(mapped.refundPendingOriginCounts, {
    payment_review: 0,
    refund_requested: 0,
    unknown: 0,
  })
  assert.deepEqual(Object.keys(mapped.purchaseStatusCounts), PURCHASE_STATUSES)
  assert.equal(JSON.stringify(mapped).includes("video"), false)
})

test("repository mapping keeps missing-user defaults ineligible", () => {
  const mapped = mapPairState({
    userId: "64b000000000000000000001",
    courseId: "64b000000000000000000002",
    courseDocument: { _id: "64b000000000000000000002" },
  })

  assert.equal(mapped.userExists, false)
  assert.equal(mapped.userAccountType, null)
  assert.equal(mapped.userActive, false)
  assert.equal(mapped.userApproved, false)
  assert.equal(mapped.userDeletionPending, false)
  assert.equal(mapped.userSecurityDefaultsPresent, false)
})

test("repository mapping treats malformed security defaults as unknown and preserves financial integrity counts", () => {
  const mapped = mapPairState({
    activeCourseOutsideImmutablePurchaseCount: 1,
    activePurchaseUnknownStatusCount: 1,
    courseDocument: { _id: "64b000000000000000000002" },
    courseId: "64b000000000000000000002",
    purchaseUnknownStatusCount: 2,
    userDocument: {
      _id: "64b000000000000000000001",
      accountType: "Student",
      active: 1,
      approved: "true",
      deletionPending: null,
    },
    userId: "64b000000000000000000001",
  })

  assert.equal(mapped.userExists, true)
  assert.equal(mapped.userSecurityDefaultsPresent, false)
  assert.equal(mapped.userActive, false)
  assert.equal(mapped.userApproved, false)
  assert.equal(mapped.userDeletionPending, false)
  assert.equal(mapped.activeCourseOutsideImmutablePurchaseCount, 1)
  assert.equal(mapped.unknownActivePurchaseStatusCount, 1)
  assert.equal(mapped.unknownPurchaseStatusCount, 2)
})

test("repository maps malformed references to bounded nullable discriminators", () => {
  const rawUserReference = "private-user-reference@example.test"
  const mapped = mapPairState({
    courseDocument: { _id: "64b000000000000000000002" },
    courseId: "64b000000000000000000002",
    purchaseUnknownStatusCount: 1,
    userDocument: {
      _id: "private-user-document@example.test",
      accountType: "Student",
      active: true,
      approved: true,
      deletionPending: false,
    },
    userId: rawUserReference,
  })

  assert.equal(mapped.userId, null)
  assert.equal(mapped.userReferenceState, "invalid")
  assert.equal(mapped.userExists, false)
  assert.equal(mapped.userAccountType, null)
  assert.equal(mapped.courseReferenceState, "valid")
  assert.equal(JSON.stringify(mapped).includes(rawUserReference), false)
  assert.equal(JSON.stringify(mapped).includes("private-user-document"), false)

  const rawCourseReference = "private-course-reference@example.test"
  const mappedCourse = mapPairState({
    courseDocument: { _id: "private-course-document@example.test" },
    courseId: rawCourseReference,
    purchaseUnknownStatusCount: 1,
    userDocument: {
      _id: "64b000000000000000000001",
      accountType: "Student",
      active: true,
      approved: true,
      deletionPending: false,
    },
    userId: "64b000000000000000000001",
  })
  assert.equal(mappedCourse.courseId, null)
  assert.equal(mappedCourse.courseReferenceState, "invalid")
  assert.equal(mappedCourse.courseExists, false)
  assert.equal(JSON.stringify(mappedCourse).includes(rawCourseReference), false)
  assert.equal(
    JSON.stringify(mappedCourse).includes("private-course-document"),
    false
  )
})

test("repository bounds unexpected account types before classification", () => {
  const rawAccountType = "private-account-type@example.test"
  const mapped = mapPairState({
    courseDocument: { _id: "64b000000000000000000002" },
    courseId: "64b000000000000000000002",
    userDocument: {
      _id: "64b000000000000000000001",
      accountType: rawAccountType,
      active: true,
      approved: true,
      deletionPending: false,
    },
    userId: "64b000000000000000000001",
  })

  assert.equal(mapped.userAccountType, "Unknown")
  assert.equal(JSON.stringify(mapped).includes(rawAccountType), false)
})

test("empty immutable Purchase courses become blocking nullable evidence", () => {
  const mapped = mapPairState({
    courseId: null,
    purchasePaidCount: 1,
    userDocument: {
      _id: "64b000000000000000000001",
      accountType: "Student",
      active: true,
      approved: true,
      deletionPending: false,
    },
    userId: "64b000000000000000000001",
  })
  const result = mapEnrollmentConsistencyDryRun(mapped)

  assert.equal(mapped.courseId, null)
  assert.equal(mapped.courseReferenceState, "invalid")
  assert.deepEqual(
    result.issues.map(({ code }) => code),
    ["MALFORMED_COURSE_REFERENCE", "CAPTURED_PAYMENT_REQUIRES_RECONCILIATION"]
  )
  assert.equal(
    result.proposals.every(({ proposedWrites }) => proposedWrites.length === 0),
    true
  )
})
