const assert = require("node:assert/strict")
const crypto = require("node:crypto")
const test = require("node:test")

const trustedCourseId = "64b000000000000000000001"
const substitutedCourseId = "64b000000000000000000002"
const userId = "64b000000000000000000003"
const acceptedCheckoutPolicies = {
  acknowledgeCheckoutPolicies: true,
  refundPolicyVersion: "2026-07-18",
  refundWindowDays: 7,
  termsVersion: "2026-07-18",
}

const createResponse = () => ({
  statusCode: 200,
  body: undefined,
  status(code) {
    this.statusCode = code
    return this
  },
  json(body) {
    this.body = body
    return this
  },
})

const installMock = (modulePath, exports) => {
  const filename = require.resolve(modulePath)
  require.cache[filename] = {
    id: filename,
    filename,
    loaded: true,
    exports,
  }
}

const loadPaymentsController = (overrides = {}) => {
  const events = []
  let purchaseCreated = false
  const purchase = {
    _id: "64b000000000000000000006",
    user: userId,
    courses: [trustedCourseId],
    lineItems: [
      { course: trustedCourseId, courseName: "Trusted Course", amount: 10000 },
    ],
    amount: 10000,
    currency: "INR",
    checkoutExpiresAt: new Date(Date.now() + 60_000),
    createdAt: new Date(),
    razorpayOrderId: "order_1",
    status: "order_created",
  }

  const instance = {
    orders: {
      all: async () => ({ items: [] }),
      create: async (options) => {
        events.push(["razorpay-order", options])
        return { id: "order_1", ...options }
      },
    },
    payments: {
      fetch: async () => ({
        order_id: "order_1",
        amount: purchase.amount,
        currency: purchase.currency,
        status: "captured",
      }),
      fetchMultipleRefund: async () => ({ items: [] }),
      fetchRefund: async (_paymentId, refundId) => ({
        amount: purchase.amount,
        id: refundId,
        status: "processed",
      }),
      refund: async (_paymentId, options) => ({
        amount: options.amount,
        id: "rfnd_test_1",
        status: "processed",
      }),
    },
    ...overrides.instance,
  }

  const Course = {
    countDocuments: async () => 1,
    find: () => ({
      select: async () => [
        {
          _id: { toString: () => trustedCourseId },
          courseName: "Trusted Course",
          price: 100,
          studentsEnroled: [],
        },
      ],
    }),
    findByIdAndUpdate: (courseId) => ({
      select: async () => {
        events.push(["enroll", courseId.toString()])
        return { _id: courseId, courseName: "Trusted Course" }
      },
    }),
    updateMany: async (query, update) => {
      if (update.$addToSet?.studentsEnroled) {
        for (const courseId of query._id.$in) {
          events.push(["enroll", courseId.toString()])
        }
      }
      if (update.$pull?.studentsEnroled) {
        events.push(["unenroll", update.$pull.studentsEnroled])
      }
      return { matchedCount: query._id.$in.length }
    },
    ...overrides.Course,
  }

  const Purchase = {
    create: async (payload) => {
      events.push(["purchase", payload])
      purchaseCreated = true
      Object.assign(purchase, { status: "created" }, payload)
      return purchase
    },
    findByIdAndUpdate: async (_id, update) => {
      Object.assign(purchase, update.$set || {})
      if (update.$unset) {
        for (const field of Object.keys(update.$unset)) delete purchase[field]
      }
      return purchase
    },
    findById: () => ({ select: async () => purchase }),
    findOne: async (query) =>
      query?.status?.$in && query?.$or
        ? purchaseCreated && query.status.$in.includes(purchase.status)
          ? purchase
          : null
        : purchase,
    exists: async () => false,
    findOneAndUpdate: async (query, update) => {
      events.push(["purchase-find-one-and-update", query, update])
      Object.assign(purchase, update.$set)
      if (update.$addToSet) {
        for (const [field, value] of Object.entries(update.$addToSet)) {
          purchase[field] = [...new Set([...(purchase[field] || []), value])]
        }
      }
      if (update.$unset) {
        for (const field of Object.keys(update.$unset)) delete purchase[field]
      }
      return purchase
    },
    updateMany: async () => ({ modifiedCount: 0 }),
    updateOne: async (_query, update) => {
      Object.assign(purchase, update.$set || {})
      if (update.$unset) {
        for (const field of Object.keys(update.$unset)) delete purchase[field]
      }
      return { matchedCount: 1 }
    },
    countDocuments: async () => 1,
    ...overrides.Purchase,
  }

  const CourseProgress = {
    deleteMany: async () => ({}),
    distinct: async () => ["progress-1"],
    findOneAndUpdate: async () => ({ _id: "progress-1" }),
    findOne: async () => ({ _id: "progress-1" }),
  }

  const User = {
    findOneAndUpdate: async (_query, update) => {
      if (!update.$set?.paymentOperationLockId) {
        events.push(["student-enrollment-update", update])
      }
      return { _id: userId }
    },
    findByIdAndUpdate: async () => ({}),
    updateOne: async () => ({}),
    findById: () => ({
      select: async () => ({
        email: "student@example.com",
        firstName: "Test",
        lastName: "Student",
      }),
    }),
    ...overrides.User,
  }

  installMock("../config/razorpay", { instance })
  installMock("../config/env", {
    checkoutTtlSeconds: 1800,
    razorpayTimeoutMs: overrides.razorpayTimeoutMs || 1000,
    refundWindowDays: 7,
  })
  installMock("../models/Course", Course)
  installMock("../models/CourseProgress", CourseProgress)
  installMock("../models/Purchase", Purchase)
  installMock("../models/User", User)
  installMock("../utils/mailSender", async () => ({ response: "sent" }))

  const controllerPath = require.resolve("../controllers/payments")
  delete require.cache[controllerPath]

  return {
    controller: require(controllerPath),
    events,
    purchase,
  }
}

test("capture persists the server-priced purchase before creating an order", async () => {
  const { controller, events, purchase } = loadPaymentsController()
  const res = createResponse()

  await controller.capturePayment(
    {
      body: {
        ...acceptedCheckoutPolicies,
        courses: [trustedCourseId],
      },
      user: { id: userId },
    },
    res
  )

  assert.equal(res.body.success, true)
  assert.deepEqual(events.map(([event]) => event).slice(0, 2), [
    "purchase",
    "razorpay-order",
  ])
  assert.equal(events[0][1].amount, 10000)
  assert.deepEqual(
    events[0][1].courses.map((courseId) => courseId.toString()),
    [trustedCourseId]
  )
  assert.deepEqual(events[0][1].activeCourses, events[0][1].courses)
  assert.equal(typeof events[0][1].checkoutKey, "string")
  assert.equal(events[0][1].checkoutExpiresAt instanceof Date, true)
  assert.equal(events[0][1].checkoutAcknowledgedAt instanceof Date, true)
  assert.equal(events[0][1].checkoutTermsVersion, "2026-07-18")
  assert.equal(events[0][1].refundPolicyVersion, "2026-07-18")
  assert.equal(events[0][1].refundWindowDays, 7)
})

test("checkout requires affirmative purchase-policy acknowledgement", async () => {
  const { controller, events } = loadPaymentsController()
  const res = createResponse()

  await controller.capturePayment(
    { body: { courses: [trustedCourseId] }, user: { id: userId } },
    res
  )

  assert.equal(res.statusCode, 400)
  assert.equal(events.some(([event]) => event === "purchase"), false)
})

test("checkout rejects a policy snapshot the learner did not currently view", async () => {
  const { controller, events } = loadPaymentsController()
  const res = createResponse()

  await controller.capturePayment(
    {
      body: {
        ...acceptedCheckoutPolicies,
        courses: [trustedCourseId],
        termsVersion: "2025-01-01",
      },
      user: { id: userId },
    },
    res
  )

  assert.equal(res.statusCode, 409)
  assert.equal(events.some(([event]) => event === "purchase"), false)
})

test("checkout config exposes the server-owned policy contract", () => {
  const { controller } = loadPaymentsController()
  const res = {
    ...createResponse(),
    headers: {},
    setHeader(name, value) {
      this.headers[name] = value
    },
  }

  controller.getCheckoutConfig({}, res)

  assert.equal(res.body.data.refundWindowDays, 7)
  assert.equal(res.body.data.refundPolicyVersion, "2026-07-18")
  assert.equal(res.body.data.termsVersion, "2026-07-18")
  assert.equal(res.headers["cache-control"], "private, no-store, max-age=0")
})

test("an account-deletion lock prevents checkout creation", async () => {
  let lockQuery
  const { controller, events } = loadPaymentsController({
    User: {
      findOneAndUpdate: async (query, update) => {
        if (update.$set?.paymentOperationLockId) lockQuery = query
        return null
      },
    },
  })
  const res = createResponse()

  await controller.capturePayment(
    {
      body: {
        ...acceptedCheckoutPolicies,
        courses: [trustedCourseId],
      },
      user: { id: userId },
    },
    res
  )

  assert.equal(res.statusCode, 409)
  assert.equal(events.some(([event]) => event === "purchase"), false)
  assert.equal(lockQuery.active, true)
  assert.equal(lockQuery.approved, true)
  assert.deepEqual(lockQuery.deletionPending, { $ne: true })
})

test("checkout revalidation stops an order when a course was unpublished", async () => {
  const { controller, events, purchase } = loadPaymentsController({
    Course: { countDocuments: async () => 0 },
  })
  const res = createResponse()

  await controller.capturePayment(
    {
      body: {
        ...acceptedCheckoutPolicies,
        courses: [trustedCourseId],
      },
      user: { id: userId },
    },
    res
  )

  assert.equal(res.statusCode, 409)
  assert.equal(purchase.status, "failed")
  assert.equal(events.some(([event]) => event === "razorpay-order"), false)
})

test("a concurrent created checkout reconciles by receipt and always responds", async () => {
  const existingPurchase = {
    _id: "purchase-existing",
    user: userId,
    courses: [trustedCourseId],
    amount: 10000,
    currency: "INR",
    receipt: "sn_existing_receipt",
    status: "created",
    checkoutExpiresAt: new Date(Date.now() + 60_000),
  }
  const { controller } = loadPaymentsController({
    instance: {
      orders: {
        all: async () => ({
          items: [
            {
              id: "order_recovered",
              amount: 10000,
              currency: "INR",
              receipt: "sn_existing_receipt",
            },
          ],
        }),
        create: async () => {
          throw new Error("a second order must not be created")
        },
      },
    },
    Purchase: {
      findOne: async (query) =>
        query?.status?.$in ? existingPurchase : existingPurchase,
    },
  })
  const res = createResponse()
  await controller.capturePayment(
    {
      body: {
        ...acceptedCheckoutPolicies,
        courses: [trustedCourseId],
      },
      user: { id: userId },
    },
    res
  )

  assert.equal(res.statusCode, 200)
  assert.equal(res.body.success, true)
  assert.equal(res.body.data.id, "order_recovered")
  assert.equal(res.body.data.reused, true)
})

test("a timed-out Razorpay create recovers the provider order by receipt", async () => {
  let orderLookup = 0
  const { controller } = loadPaymentsController({
    razorpayTimeoutMs: 15,
    instance: {
      orders: {
        create: async () => new Promise(() => {}),
        all: async ({ receipt }) => {
          orderLookup += 1
          return {
            items: [
              {
                id: "order_after_timeout",
                amount: 10000,
                currency: "INR",
                receipt,
              },
            ],
          }
        },
      },
    },
  })
  const res = createResponse()
  const startedAt = Date.now()

  await controller.capturePayment(
    {
      body: {
        ...acceptedCheckoutPolicies,
        courses: [trustedCourseId],
      },
      user: { id: userId },
    },
    res
  )

  assert.equal(res.statusCode, 200)
  assert.equal(res.body.data.id, "order_after_timeout")
  assert.equal(orderLookup, 1)
  assert.equal(Date.now() - startedAt < 500, true)
})

test("a failed provider attempt releases its idempotency key for retry", async () => {
  let providerAttempts = 0
  const { controller, purchase } = loadPaymentsController({
    instance: {
      orders: {
        all: async () => ({ items: [] }),
        create: async (options) => {
          providerAttempts += 1
          if (providerAttempts === 1) {
            const error = new Error("provider unavailable")
            error.code = "PROVIDER_UNAVAILABLE"
            throw error
          }
          return { id: "order_retry", ...options }
        },
      },
    },
  })
  const request = {
    body: {
      ...acceptedCheckoutPolicies,
      courses: [trustedCourseId],
    },
    get: (name) => (name === "idempotency-key" ? "same-retry-key" : undefined),
    user: { id: userId },
  }

  const firstResponse = createResponse()
  await controller.capturePayment(request, firstResponse)
  assert.equal(firstResponse.statusCode, 500)
  assert.equal(purchase.status, "failed")
  assert.equal(purchase.idempotencyKey, undefined)

  const retryResponse = createResponse()
  await controller.capturePayment(request, retryResponse)
  assert.equal(retryResponse.statusCode, 200)
  assert.equal(retryResponse.body.data.id, "order_retry")
  assert.equal(providerAttempts, 2)
})

test("a repeated capture reuses the active Razorpay order", async () => {
  const { controller, events } = loadPaymentsController()
  const request = {
    body: {
      ...acceptedCheckoutPolicies,
      courses: [trustedCourseId],
    },
    get: (name) => (name === "idempotency-key" ? "checkout-retry-1" : undefined),
    user: { id: userId },
  }

  const firstResponse = createResponse()
  await controller.capturePayment(request, firstResponse)
  const secondResponse = createResponse()
  await controller.capturePayment(request, secondResponse)

  assert.equal(firstResponse.body.success, true)
  assert.equal(secondResponse.body.success, true)
  assert.equal(secondResponse.body.data.reused, true)
  assert.equal(secondResponse.body.data.id, "order_1")
  assert.equal(events.filter(([event]) => event === "purchase").length, 1)
  assert.equal(events.filter(([event]) => event === "razorpay-order").length, 1)
})

test("verification ignores substituted client course IDs and is idempotent", async () => {
  process.env.RAZORPAY_SECRET = "test-payment-secret"
  const { controller, events } = loadPaymentsController()
  const res = createResponse()
  const signature = crypto
    .createHmac("sha256", process.env.RAZORPAY_SECRET)
    .update("order_1|payment_1")
    .digest("hex")

  const request = {
    user: { id: userId },
    body: {
      razorpay_order_id: "order_1",
      razorpay_payment_id: "payment_1",
      razorpay_signature: signature,
      courses: [substitutedCourseId],
    },
  }

  await controller.verifyPayment(request, res)

  assert.equal(res.body.success, true)
  assert.deepEqual(
    events
      .filter(([event]) => event === "enroll")
      .map(([, courseId]) => courseId),
    [trustedCourseId]
  )

  const secondResponse = createResponse()
  await controller.verifyPayment(request, secondResponse)
  assert.equal(secondResponse.body.success, true)
  assert.equal(secondResponse.body.message, "Payment Verified")
  assert.equal(events.filter(([event]) => event === "enroll").length, 1)
})

test("signed Razorpay webhooks fulfill the server-owned purchase once", async () => {
  process.env.RAZORPAY_WEBHOOK_SECRET = "test-webhook-secret"
  const { controller, events, purchase } = loadPaymentsController()
  const payload = Buffer.from(
    JSON.stringify({
      event: "payment.captured",
      payload: {
        payment: {
          entity: {
            id: "payment_1",
            order_id: "order_1",
            amount: 10000,
            currency: "INR",
            status: "captured",
          },
        },
      },
    })
  )
  const signature = crypto
    .createHmac("sha256", process.env.RAZORPAY_WEBHOOK_SECRET)
    .update(payload)
    .digest("hex")
  const request = {
    body: payload,
    get: (name) =>
      name.toLowerCase() === "x-razorpay-signature" ? signature : undefined,
  }

  const firstResponse = createResponse()
  await controller.razorpayWebhook(request, firstResponse)
  assert.equal(firstResponse.statusCode, 200)
  assert.equal(firstResponse.body.success, true)
  assert.equal(events.filter(([event]) => event === "enroll").length, 1)

  const duplicateResponse = createResponse()
  purchase.checkoutExpiresAt = new Date(Date.now() - 60_000)
  await controller.razorpayWebhook(request, duplicateResponse)
  assert.equal(duplicateResponse.statusCode, 200)
  assert.equal(duplicateResponse.body.success, true)
  assert.equal(events.filter(([event]) => event === "enroll").length, 1)
})

test("a captured payment for an expired checkout is held without enrollment", async () => {
  process.env.RAZORPAY_WEBHOOK_SECRET = "test-webhook-secret"
  const { controller, events, purchase } = loadPaymentsController()
  purchase.status = "expired"
  purchase.checkoutExpiresAt = new Date(Date.now() - 60_000)
  const payload = Buffer.from(
    JSON.stringify({
      event: "payment.captured",
      payload: {
        payment: {
          entity: {
            id: "payment_late",
            order_id: "order_1",
            amount: 10000,
            currency: "INR",
            status: "captured",
          },
        },
      },
    })
  )
  const signature = crypto
    .createHmac("sha256", process.env.RAZORPAY_WEBHOOK_SECRET)
    .update(payload)
    .digest("hex")
  const res = createResponse()
  await controller.razorpayWebhook(
    {
      body: payload,
      get: (name) =>
        name.toLowerCase() === "x-razorpay-signature" ? signature : undefined,
    },
    res
  )

  assert.equal(res.statusCode, 200)
  assert.equal(res.body.reconciliationRequired, true)
  assert.equal(purchase.status, "payment_review")
  assert.equal(events.some(([event]) => event === "enroll"), false)
})

test("checkout expiry racing the payment claim is held for reconciliation", async () => {
  process.env.RAZORPAY_WEBHOOK_SECRET = "test-webhook-secret"
  let racePurchase
  let claimQuery
  const { controller, events, purchase } = loadPaymentsController({
    Purchase: {
      findOne: async () => racePurchase,
      findOneAndUpdate: async (query, update) => {
        if (update.$set?.status === "paid") {
          claimQuery = query
          racePurchase.status = "expired"
          racePurchase.checkoutExpiresAt = new Date(Date.now() - 1)
          return null
        }
        if (update.$set?.status === "payment_review") {
          Object.assign(racePurchase, update.$set)
          return racePurchase
        }
        return racePurchase
      },
    },
  })
  racePurchase = purchase
  const payload = Buffer.from(
    JSON.stringify({
      event: "payment.captured",
      payload: {
        payment: {
          entity: {
            id: "payment_race",
            order_id: "order_1",
            amount: 10000,
            currency: "INR",
            status: "captured",
          },
        },
      },
    })
  )
  const signature = crypto
    .createHmac("sha256", process.env.RAZORPAY_WEBHOOK_SECRET)
    .update(payload)
    .digest("hex")
  const res = createResponse()

  await controller.razorpayWebhook(
    {
      body: payload,
      get: (name) =>
        name.toLowerCase() === "x-razorpay-signature" ? signature : undefined,
    },
    res
  )

  assert.equal(res.statusCode, 200)
  assert.equal(res.body.reconciliationRequired, true)
  assert.equal(racePurchase.status, "payment_review")
  assert.equal(events.some(([event]) => event === "enroll"), false)
  assert.equal(Array.isArray(claimQuery.$and), true)
  assert.equal(
    claimQuery.$and[0].$or.some(
      (condition) =>
        condition.status === "order_created" && condition.checkoutExpiresAt?.$gt
    ),
    true
  )
})

test("fulfillment holds payment when the Student became inactive", async () => {
  process.env.RAZORPAY_WEBHOOK_SECRET = "test-webhook-secret"
  const { controller, events, purchase } = loadPaymentsController({
    User: { findOneAndUpdate: async () => null },
  })
  const payload = Buffer.from(
    JSON.stringify({
      event: "payment.captured",
      payload: {
        payment: {
          entity: {
            id: "payment_inactive_student",
            order_id: "order_1",
            amount: 10000,
            currency: "INR",
            status: "captured",
          },
        },
      },
    })
  )
  const signature = crypto
    .createHmac("sha256", process.env.RAZORPAY_WEBHOOK_SECRET)
    .update(payload)
    .digest("hex")
  const res = createResponse()

  await controller.razorpayWebhook(
    {
      body: payload,
      get: (name) =>
        name.toLowerCase() === "x-razorpay-signature" ? signature : undefined,
    },
    res
  )

  assert.equal(res.statusCode, 200)
  assert.equal(res.body.reconciliationRequired, true)
  assert.equal(purchase.status, "payment_review")
  assert.equal(events.some(([event]) => event === "enroll"), false)
})

test("a captured payment for a missing course becomes payment_review", async () => {
  process.env.RAZORPAY_WEBHOOK_SECRET = "test-webhook-secret"
  const { controller, events, purchase } = loadPaymentsController({
    Course: { find: () => ({ select: async () => [] }) },
  })
  const payload = Buffer.from(
    JSON.stringify({
      event: "payment.captured",
      payload: {
        payment: {
          entity: {
            id: "payment_missing_course",
            order_id: "order_1",
            amount: 10000,
            currency: "INR",
            status: "captured",
          },
        },
      },
    })
  )
  const signature = crypto
    .createHmac("sha256", process.env.RAZORPAY_WEBHOOK_SECRET)
    .update(payload)
    .digest("hex")
  const res = createResponse()

  await controller.razorpayWebhook(
    {
      body: payload,
      get: (name) =>
        name.toLowerCase() === "x-razorpay-signature" ? signature : undefined,
    },
    res
  )

  assert.equal(res.statusCode, 200)
  assert.equal(res.body.reconciliationRequired, true)
  assert.equal(purchase.status, "payment_review")
  assert.equal(events.some(([event]) => event === "enroll"), false)
})

test("Razorpay webhook rejects a payload whose raw-body signature is invalid", async () => {
  process.env.RAZORPAY_WEBHOOK_SECRET = "test-webhook-secret"
  const { controller, events } = loadPaymentsController()
  const response = createResponse()

  await controller.razorpayWebhook(
    {
      body: Buffer.from('{"event":"payment.captured"}'),
      get: () => "0".repeat(64),
    },
    response
  )

  assert.equal(response.statusCode, 401)
  assert.equal(response.body.success, false)
  assert.equal(events.length, 0)
})

test("an admin refund resolves payment_review with an auditable provider ID", async () => {
  const { controller, events, purchase } = loadPaymentsController()
  purchase.status = "payment_review"
  purchase.paidAt = new Date()
  purchase.reconciliationRequiredAt = new Date()
  purchase.refundWindowDays = 7
  purchase.razorpayPaymentId = "pay_review_1"
  const res = createResponse()

  await controller.resolvePaymentReview(
    {
      body: {
        action: "refund",
        confirmation: "REFUND PAYMENT",
        note: "Customer requested a refund for the held late payment.",
      },
      params: { purchaseId: purchase._id },
      user: { id: "64b000000000000000000009" },
    },
    res
  )

  assert.equal(res.statusCode, 200)
  assert.equal(res.body.data.refundId, "rfnd_test_1")
  assert.equal(purchase.status, "refunded")
  assert.equal(purchase.reconciliationResolution, "refunded")
  assert.equal(events.some(([event]) => event === "unenroll"), true)
})

test("a learner refund request is processed and revokes its entitlements", async () => {
  const { controller, events, purchase } = loadPaymentsController()
  purchase.status = "fulfilled"
  purchase.paidAt = new Date()
  purchase.refundWindowDays = 7
  purchase.razorpayPaymentId = "pay_fulfilled_1"
  const requestResponse = createResponse()

  await controller.requestRefund(
    {
      body: {
        confirmation: "REQUEST REFUND",
        reason: "The course is not suitable for my learning needs.",
      },
      params: { purchaseId: purchase._id },
      user: { id: userId },
    },
    requestResponse
  )

  assert.equal(requestResponse.statusCode, 202)
  assert.equal(purchase.status, "refund_requested")

  const resolutionResponse = createResponse()
  await controller.resolvePaymentReview(
    {
      body: {
        action: "refund",
        confirmation: "REFUND PAYMENT",
        note: "Approved within the recorded public refund window.",
      },
      params: { purchaseId: purchase._id },
      user: { id: "64b000000000000000000009" },
    },
    resolutionResponse
  )

  assert.equal(resolutionResponse.statusCode, 200)
  assert.equal(purchase.status, "refunded")
  assert.equal(purchase.refundOriginStatus, "refund_requested")
  assert.equal(events.some(([event]) => event === "unenroll"), true)
})

test("a timely learner request remains valid when support processes it later", async () => {
  const { controller, purchase } = loadPaymentsController()
  purchase.status = "refund_requested"
  purchase.paidAt = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000)
  purchase.refundRequestedAt = new Date(Date.now() - 6 * 24 * 60 * 60 * 1000)
  purchase.refundWindowDays = 7
  purchase.razorpayPaymentId = "pay_timely_request"
  const res = createResponse()

  await controller.resolvePaymentReview(
    {
      body: {
        action: "refund",
        confirmation: "REFUND PAYMENT",
        note: "The learner submitted this request inside the recorded window.",
      },
      params: { purchaseId: purchase._id },
      user: { id: "64b000000000000000000009" },
    },
    res
  )

  assert.equal(res.statusCode, 200)
  assert.equal(purchase.status, "refunded")
})

test("an admin can reject a learner refund request without revoking access", async () => {
  const { controller, events, purchase } = loadPaymentsController()
  purchase.status = "fulfilled"
  purchase.paidAt = new Date()
  purchase.refundWindowDays = 7

  const requestResponse = createResponse()
  await controller.requestRefund(
    {
      body: {
        confirmation: "REQUEST REFUND",
        reason: "I would like support to review this purchase.",
      },
      params: { purchaseId: purchase._id },
      user: { id: userId },
    },
    requestResponse
  )
  assert.equal(requestResponse.statusCode, 202)

  const rejectionResponse = createResponse()
  await controller.resolvePaymentReview(
    {
      body: {
        action: "reject_refund",
        confirmation: "REJECT REFUND",
        note: "Request reviewed against the recorded course and refund policy.",
      },
      params: { purchaseId: purchase._id },
      user: { id: "64b000000000000000000009" },
    },
    rejectionResponse
  )

  assert.equal(rejectionResponse.statusCode, 200)
  assert.equal(purchase.status, "fulfilled")
  assert.equal(purchase.reconciliationResolution, "refund_rejected")
  assert.equal(purchase.refundRejectedAt instanceof Date, true)
  assert.equal(events.some(([event]) => event === "unenroll"), false)

  const repeatedRequest = createResponse()
  await controller.requestRefund(
    {
      body: {
        confirmation: "REQUEST REFUND",
        reason: "Please submit this exact purchase for another review.",
      },
      params: { purchaseId: purchase._id },
      user: { id: userId },
    },
    repeatedRequest
  )
  assert.equal(repeatedRequest.statusCode, 409)
})

test("purchase history exposes refund eligibility and a usable purchase ID", async () => {
  const history = {
    _id: "64b000000000000000000007",
    amount: 10000,
    currency: "INR",
    lineItems: [
      { course: trustedCourseId, courseName: "Trusted Course", amount: 10000 },
    ],
    paidAt: new Date(),
    refundPolicyVersion: "2026-07-18",
    refundWindowDays: 7,
    status: "fulfilled",
  }
  const query = {
    lean: async () => [history],
    limit: () => query,
    select: () => query,
    skip: () => query,
    sort: () => query,
  }
  const { controller } = loadPaymentsController({
    Purchase: {
      countDocuments: async () => 1,
      find: () => query,
    },
  })
  const res = createResponse()

  await controller.listMyPurchases(
    { query: {}, user: { id: userId } },
    res
  )

  assert.equal(res.statusCode, 200)
  assert.equal(res.body.data.purchases[0]._id, history._id)
  assert.equal(res.body.data.purchases[0].refundEligible, true)
  assert.equal(res.body.data.purchases[0].refundEligibleUntil instanceof Date, true)
})

test("a pending provider refund stays queued until Razorpay processes it", async () => {
  let providerStatus = "pending"
  const { controller, purchase } = loadPaymentsController({
    instance: {
      payments: {
        fetchMultipleRefund: async () => ({ items: [] }),
        fetchRefund: async (_paymentId, refundId) => ({
          amount: 10000,
          id: refundId,
          status: providerStatus,
        }),
        refund: async () => ({
          amount: 10000,
          id: "rfnd_pending_1",
          status: providerStatus,
        }),
      },
    },
  })
  purchase.status = "payment_review"
  purchase.paidAt = new Date()
  purchase.refundWindowDays = 7
  purchase.razorpayPaymentId = "pay_pending_refund"
  const request = {
    body: {
      action: "refund",
      confirmation: "REFUND PAYMENT",
      note: "Refunding a captured payment that could not be enrolled.",
    },
    params: { purchaseId: purchase._id },
    user: { id: "64b000000000000000000009" },
  }

  const pendingResponse = createResponse()
  await controller.resolvePaymentReview(request, pendingResponse)
  assert.equal(pendingResponse.statusCode, 202)
  assert.equal(purchase.status, "refund_pending")

  providerStatus = "processed"
  const processedResponse = createResponse()
  await controller.resolvePaymentReview(request, processedResponse)
  assert.equal(processedResponse.statusCode, 200)
  assert.equal(purchase.status, "refunded")
})

test("an ambiguous provider timeout is durably queued without issuing a second refund", async () => {
  let refundAttempts = 0
  const { controller, purchase } = loadPaymentsController({
    instance: {
      payments: {
        fetchMultipleRefund: async () => ({ items: [] }),
        refund: async () => {
          refundAttempts += 1
          const error = new Error("provider timeout")
          error.code = "RAZORPAY_TIMEOUT"
          throw error
        },
      },
    },
  })
  purchase.status = "payment_review"
  purchase.paidAt = new Date()
  purchase.refundWindowDays = 7
  purchase.razorpayPaymentId = "pay_ambiguous_refund"
  const request = {
    body: {
      action: "refund",
      confirmation: "REFUND PAYMENT",
      note: "Refund approved after reviewing the captured payment.",
    },
    params: { purchaseId: purchase._id },
    user: { id: "64b000000000000000000009" },
  }

  const firstResponse = createResponse()
  await controller.resolvePaymentReview(request, firstResponse)
  assert.equal(firstResponse.statusCode, 202)
  assert.equal(purchase.status, "refund_pending")
  assert.equal(purchase.refundAttemptedAt instanceof Date, true)

  const retryResponse = createResponse()
  await controller.resolvePaymentReview(request, retryResponse)
  assert.equal(retryResponse.statusCode, 202)
  assert.equal(refundAttempts, 1)
})

test("a failed provider refund requires an explicit audited retry", async () => {
  let providerRefunds = 0
  const { controller, purchase } = loadPaymentsController({
    instance: {
      payments: {
        fetchMultipleRefund: async () => ({ items: [] }),
        refund: async () => {
          providerRefunds += 1
          return {
            amount: 10000,
            id: `rfnd_attempt_${providerRefunds}`,
            status: providerRefunds === 1 ? "failed" : "processed",
          }
        },
      },
    },
  })
  purchase.status = "payment_review"
  purchase.paidAt = new Date()
  purchase.refundWindowDays = 7
  purchase.razorpayPaymentId = "pay_failed_then_retried"

  const firstResponse = createResponse()
  await controller.resolvePaymentReview(
    {
      body: {
        action: "refund",
        confirmation: "REFUND PAYMENT",
        note: "Initial refund requested after reviewing the held payment.",
      },
      params: { purchaseId: purchase._id },
      user: { id: "64b000000000000000000009" },
    },
    firstResponse
  )
  assert.equal(firstResponse.statusCode, 409)
  assert.equal(purchase.refundProviderStatus, "failed")
  assert.equal(providerRefunds, 1)

  const retryResponse = createResponse()
  await controller.resolvePaymentReview(
    {
      body: {
        action: "retry_refund",
        confirmation: "RETRY FAILED REFUND",
        note: "Razorpay confirms the prior refund failed; retry is approved.",
      },
      params: { purchaseId: purchase._id },
      user: { id: "64b000000000000000000009" },
    },
    retryResponse
  )

  assert.equal(retryResponse.statusCode, 200)
  assert.equal(purchase.status, "refunded")
  assert.deepEqual(purchase.failedRefundIds, ["rfnd_attempt_1"])
  assert.equal(purchase.refundId, "rfnd_attempt_2")
  assert.equal(providerRefunds, 2)
})

test("processed refunds retry idempotent entitlement cleanup before finalizing", async () => {
  let providerRefunds = 0
  let revocationAttempts = 0
  const { controller, purchase } = loadPaymentsController({
    Course: {
      updateMany: async (_query, update) => {
        if (update.$pull?.studentsEnroled) {
          revocationAttempts += 1
          if (revocationAttempts === 1) {
            throw new Error("simulated entitlement cleanup failure")
          }
        }
        return { matchedCount: 1 }
      },
    },
    instance: {
      payments: {
        fetchMultipleRefund: async () => ({ items: [] }),
        fetchRefund: async (_paymentId, refundId) => ({
          amount: 10000,
          id: refundId,
          status: "processed",
        }),
        refund: async () => {
          providerRefunds += 1
          return {
            amount: 10000,
            id: "rfnd_cleanup_retry",
            status: "processed",
          }
        },
      },
    },
  })
  purchase.status = "refund_requested"
  purchase.paidAt = new Date()
  purchase.refundRequestedAt = new Date()
  purchase.refundWindowDays = 7
  purchase.razorpayPaymentId = "pay_cleanup_retry"
  const request = {
    body: {
      action: "refund",
      confirmation: "REFUND PAYMENT",
      note: "Approved learner refund with entitlement cleanup required.",
    },
    params: { purchaseId: purchase._id },
    user: { id: "64b000000000000000000009" },
  }

  const failedCleanup = createResponse()
  await controller.resolvePaymentReview(request, failedCleanup)
  assert.equal(failedCleanup.statusCode, 502)
  assert.equal(purchase.status, "refund_pending")
  assert.equal(purchase.refundProviderStatus, "processed")

  const completedCleanup = createResponse()
  await controller.resolvePaymentReview(request, completedCleanup)
  assert.equal(completedCleanup.statusCode, 200)
  assert.equal(purchase.status, "refunded")
  assert.equal(purchase.refundEntitlementsRevokedAt instanceof Date, true)
  assert.equal(providerRefunds, 1)
  assert.equal(revocationAttempts, 2)
})
