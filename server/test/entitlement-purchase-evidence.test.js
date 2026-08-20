const assert = require("node:assert/strict")
const { test } = require("node:test")
const mongoose = require("mongoose")

const {
  analyzePurchaseCourseEvidence,
  purchaseAllowsActivation,
  purchaseFinancialState,
  purchaseHasActivationEvidence,
  purchaseHasProcessedRefundEvidence,
  purchaseHasVerifiedCapture,
  purchaseIsInSidecarCohort,
  purchaseMatchesEpisode,
} = require("../domains/entitlement/entitlementPurchaseEvidence")

const boundary = new Date("2026-08-11T10:00:00.000Z")
const studentId = "64b000000000000000000001"
const courseId = "64b000000000000000000002"
const purchaseId = "64b000000000000000000003"

const purchase = (overrides = {}) => ({
  _id: new mongoose.Types.ObjectId(purchaseId),
  user: new mongoose.Types.ObjectId(studentId),
  courses: [new mongoose.Types.ObjectId(courseId)],
  lineItems: [
    {
      amount: 100,
      course: new mongoose.Types.ObjectId(courseId),
      courseName: "Course",
    },
  ],
  createdAt: new Date(boundary.getTime() + 1),
  paidAt: new Date(boundary.getTime() + 2),
  razorpayPaymentId: "pay_exact_evidence",
  status: "fulfilled",
  fulfilledAt: new Date(boundary.getTime() + 3),
  ...overrides,
})

const episode = {
  studentId,
  courseId,
  purchaseId,
}

test("exact Purchase evidence accepts one immutable line for every unique Course", () => {
  assert.deepEqual(analyzePurchaseCourseEvidence(purchase()), {
    courseIds: [courseId],
    ok: true,
  })
  assert.equal(purchaseHasVerifiedCapture(purchase()), true)
  assert.equal(purchaseHasActivationEvidence(purchase()), true)
  assert.equal(purchaseIsInSidecarCohort(purchase(), boundary), true)
  assert.equal(
    purchaseMatchesEpisode(episode, purchase(), {
      sidecarStartedAt: boundary,
    }),
    true
  )
})

test("exact Purchase evidence normalizes native ObjectIds without recursion", () => {
  const objectStudent = new mongoose.Types.ObjectId(studentId)
  const objectCourse = new mongoose.Types.ObjectId(courseId)
  const objectPurchase = new mongoose.Types.ObjectId(purchaseId)
  assert.equal(
    purchaseMatchesEpisode(
      {
        studentId: objectStudent,
        courseId: objectCourse,
        purchaseId: objectPurchase,
      },
      purchase({
        _id: objectPurchase,
        user: objectStudent,
        courses: [objectCourse],
        lineItems: [
          { amount: 100, course: objectCourse, courseName: "Course" },
        ],
      }),
      { sidecarStartedAt: boundary }
    ),
    true
  )
})

test("exact Purchase evidence rejects malformed bundle-wide and boundary evidence", () => {
  const extraLine = purchase({
    lineItems: [
      {
        amount: 100,
        course: new mongoose.Types.ObjectId(courseId),
        courseName: "Course",
      },
      {
        amount: 100,
        course: new mongoose.Types.ObjectId("64b000000000000000000099"),
        courseName: "Extra",
      },
    ],
  })
  assert.equal(analyzePurchaseCourseEvidence(extraLine).ok, false)
  assert.equal(
    purchaseMatchesEpisode(episode, extraLine, {
      sidecarStartedAt: boundary,
    }),
    false
  )
  assert.equal(
    purchaseMatchesEpisode(
      episode,
      purchase({ createdAt: new Date(boundary.getTime() - 1) }),
      { sidecarStartedAt: boundary }
    ),
    false
  )
  assert.equal(
    purchaseHasVerifiedCapture(purchase({ paidAt: undefined })),
    false
  )
  assert.equal(
    purchaseIsInSidecarCohort(
      purchase({
        createdAt: new Date(boundary.getTime() + 2),
        paidAt: new Date(boundary.getTime() + 1),
      }),
      boundary
    ),
    false
  )
  assert.equal(
    purchaseHasActivationEvidence(
      purchase({ fulfilledAt: new Date(boundary.getTime() + 1) })
    ),
    false
  )
})

test("activation semantics preserve learner refunds and reject processed refunds", () => {
  assert.equal(purchaseAllowsActivation(purchase()), true)
  assert.equal(
    purchaseAllowsActivation(
      purchase({
        refundOriginStatus: "refund_requested",
        refundProviderStatus: "pending",
        status: "refund_pending",
      })
    ),
    true
  )
  assert.equal(
    purchaseAllowsActivation(
      purchase({
        refundOriginStatus: "refund_requested",
        refundProviderStatus: "processed",
        status: "refund_pending",
      })
    ),
    false
  )
  assert.equal(
    purchaseAllowsActivation(
      purchase({
        refundOriginStatus: "refund_requested",
        refundProviderStatus: "unknown",
        status: "refund_pending",
      })
    ),
    false
  )
  assert.equal(
    purchaseAllowsActivation(
      purchase({ refundProviderStatus: "processed", status: "fulfilled" })
    ),
    false
  )
  assert.equal(
    purchaseAllowsActivation(purchase({ status: "payment_review" })),
    false
  )
})

test("processed-refund evidence requires exact origin-specific chronology", () => {
  const refundProcessedAt = new Date(boundary.getTime() + 4)
  const refundEntitlementsRevokedAt = new Date(boundary.getTime() + 5)
  const refundedAt = new Date(boundary.getTime() + 6)
  const learnerRefund = purchase({
    refundEntitlementsRevokedAt,
    refundedAt,
    refundOriginStatus: "refund_requested",
    refundProcessedAt,
    refundProviderStatus: "processed",
    status: "refunded",
  })
  assert.equal(purchaseHasProcessedRefundEvidence(learnerRefund), true)
  assert.equal(purchaseFinancialState(learnerRefund), "processed_refund")
  assert.equal(
    purchaseHasProcessedRefundEvidence({
      ...learnerRefund,
      refundEntitlementsRevokedAt: new Date(boundary.getTime() + 2),
    }),
    false
  )
  assert.equal(
    purchaseHasProcessedRefundEvidence({
      ...learnerRefund,
      refundOriginStatus: "unknown",
    }),
    false
  )
  assert.equal(
    purchaseHasProcessedRefundEvidence({
      ...learnerRefund,
      refundProviderStatus: "unknown",
    }),
    false
  )
  assert.equal(
    purchaseFinancialState({
      ...learnerRefund,
      refundProviderStatus: "unknown",
    }),
    "malformed"
  )

  const heldRefund = purchase({
    fulfilledAt: undefined,
    refundEntitlementsRevokedAt,
    refundedAt,
    refundOriginStatus: "payment_review",
    refundProcessedAt,
    refundProviderStatus: "processed",
    status: "refunded",
  })
  assert.equal(purchaseHasProcessedRefundEvidence(heldRefund), true)
  assert.equal(
    purchaseHasProcessedRefundEvidence({
      ...heldRefund,
      refundedAt: undefined,
    }),
    false
  )
})

test("persisted Purchase evidence rejects string references and partial line snapshots", () => {
  assert.equal(
    analyzePurchaseCourseEvidence({ ...purchase(), _id: purchaseId }).ok,
    false
  )
  assert.equal(
    analyzePurchaseCourseEvidence({ ...purchase(), user: studentId }).ok,
    false
  )
  assert.equal(
    analyzePurchaseCourseEvidence({ ...purchase(), courses: [courseId] }).ok,
    false
  )
  assert.equal(
    analyzePurchaseCourseEvidence({
      ...purchase(),
      lineItems: [{ amount: 100, course: courseId, courseName: "Course" }],
    }).ok,
    false
  )
  assert.equal(
    analyzePurchaseCourseEvidence({
      ...purchase(),
      lineItems: [{ course: new mongoose.Types.ObjectId(courseId) }],
    }).ok,
    false
  )
  assert.equal(
    analyzePurchaseCourseEvidence({
      ...purchase(),
      lineItems: [
        {
          amount: -1,
          course: new mongoose.Types.ObjectId(courseId),
          courseName: "Course",
        },
      ],
    }).ok,
    false
  )
  assert.equal(
    analyzePurchaseCourseEvidence({
      ...purchase(),
      lineItems: [
        {
          amount: 100,
          course: new mongoose.Types.ObjectId(courseId),
          courseName: "",
        },
      ],
    }).ok,
    false
  )
})
