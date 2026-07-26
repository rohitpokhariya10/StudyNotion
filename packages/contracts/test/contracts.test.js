const assert = require("node:assert/strict")
const test = require("node:test")

const contracts = require("..")
const catalogContracts = require("@studynotion/contracts/catalog")
const contractSubpaths = {
  admin: require("@studynotion/contracts/admin"),
  auth: require("@studynotion/contracts/auth"),
  catalog: catalogContracts,
  commerce: require("@studynotion/contracts/commerce"),
  common: require("@studynotion/contracts/common"),
  courses: require("@studynotion/contracts/courses"),
  errors: require("@studynotion/contracts/errors"),
  learning: require("@studynotion/contracts/learning"),
  pagination: require("@studynotion/contracts/pagination"),
  reviews: require("@studynotion/contracts/reviews"),
  users: require("@studynotion/contracts/users"),
}

const ids = {
  course: "64b000000000000000000001",
  lesson: "64b000000000000000000002",
  section: "64b000000000000000000003",
  user: "64b000000000000000000004",
  category: "64b000000000000000000005",
  purchase: "64b000000000000000000006",
}
const timestamp = "2026-07-27T10:30:00.000Z"
const money = { amountMinor: 149_900, currency: "INR" }
const identity = {
  id: ids.user,
  firstName: "Asha",
  lastName: "Rao",
  email: "asha@example.com",
  accountType: "Student",
  imageUrl: null,
  authProviders: ["local"],
}
const policy = {
  termsVersion: "2026-07-18",
  refundPolicyVersion: "2026-07-18",
  refundWindowDays: 7,
}
const lineItem = {
  courseId: ids.course,
  courseName: "Production APIs",
  amount: money,
}

test("common wire primitives use exact request IDs and integer minor money", () => {
  assert.equal(
    contracts.requestIdSchema.safeParse("request_1:edge").success,
    true
  )
  assert.equal(contracts.requestIdSchema.safeParse("request id").success, false)
  assert.equal(
    contracts.objectIdSchema.safeParse(ids.course.toUpperCase()).success,
    true
  )
  assert.equal(contracts.objectIdSchema.safeParse("course-1").success, false)
  assert.equal(contracts.isoDateSchema.safeParse("2000-02-29").success, true)
  assert.equal(contracts.isoDateSchema.safeParse("2000-02-30").success, false)
  assert.equal(contracts.minorMoneySchema.safeParse(money).success, true)
  assert.equal(
    contracts.positiveMinorMoneySchema.safeParse({
      amountMinor: 0,
      currency: "INR",
    }).success,
    false
  )
  assert.equal(
    contracts.minorMoneySchema.safeParse({
      amountMinor: 1499.5,
      currency: "INR",
    }).success,
    false
  )
  assert.equal(
    contracts.minorMoneySchema.safeParse({
      ...money,
      providerAmount: "149900",
    }).success,
    false
  )
  assert.equal(
    contracts.httpUrlSchema.safeParse("http://localhost:3000/media").success,
    true
  )
  assert.equal(
    contracts.httpUrlSchema.safeParse("HTTPS://cdn.example.test/media").success,
    true
  )
  for (const unsafeUrl of [
    "javascript:alert(1)",
    "data:text/plain,private",
    "file:///tmp/private",
  ]) {
    assert.equal(contracts.httpUrlSchema.safeParse(unsafeUrl).success, false)
  }
})

test("pagination and parameter contracts reject duplicates and unknown fields", () => {
  assert.deepEqual(contracts.offsetPaginationQuerySchema.parse({}), {
    page: 1,
    limit: 20,
  })
  assert.deepEqual(
    contracts.cursorPaginationQuerySchema.parse({ limit: "50" }),
    { limit: 50 }
  )
  assert.equal(
    contracts.offsetPaginationQuerySchema.safeParse({ limit: ["10", "20"] })
      .success,
    false
  )
  assert.equal(
    contracts.offsetPaginationQuerySchema.safeParse({ unknown: "value" })
      .success,
    false
  )
  assert.equal(
    contracts.resourceIdParamsSchema.safeParse({
      resourceId: ids.course,
      extra: "value",
    }).success,
    false
  )
  assert.equal(
    contracts.cursorPageInfoSchema.safeParse({
      endCursor: null,
      hasNextPage: true,
    }).success,
    false
  )
})

test("success and error envelopes are strict and carry validated request IDs", () => {
  const successSchema = contracts.createSuccessResponseSchema(
    contracts.courseIdParamsSchema
  )
  assert.equal(
    successSchema.safeParse({
      success: true,
      requestId: "request-1",
      data: { courseId: ids.course },
    }).success,
    true
  )
  assert.equal(
    successSchema.safeParse({
      success: true,
      requestId: "request-1",
      data: { courseId: ids.course },
      message: "legacy field",
    }).success,
    false
  )

  const error = {
    error: {
      code: "INVALID_BODY",
      message: "The request body is invalid",
      requestId: "request-2",
      details: {
        fields: [
          { code: "unrecognized_keys", message: "Unknown key", path: "" },
        ],
      },
    },
  }
  assert.equal(contracts.apiErrorResponseSchema.safeParse(error).success, true)
  assert.equal(
    contracts.apiErrorResponseSchema.safeParse({
      ...error,
      success: false,
    }).success,
    false
  )
  assert.equal(
    contracts.apiErrorResponseSchema.safeParse({
      error: {
        code: "INTERNAL_ERROR",
        message: "Internal server error",
        requestId: "request-2",
        details: {
          debug: {
            password: "must-not-pass",
            stack: "private trace",
          },
        },
      },
    }).success,
    false
  )
  assert.equal(
    contracts.apiErrorResponseSchema.safeParse({
      error: {
        code: "INTERNAL_ERROR",
        message: "Safe\u202Emessage",
        requestId: "request-2",
      },
    }).success,
    false
  )
})

test("auth and profile DTOs reject credentials, locks, and raw user fields", () => {
  const session = {
    authenticated: true,
    deletionPending: false,
    requiresPolicyAcceptance: false,
    user: identity,
  }
  assert.equal(contracts.authSessionSchema.safeParse(session).success, true)
  assert.equal(
    contracts.authSessionSchema.safeParse({
      ...session,
      token: "must-not-be-exposed",
    }).success,
    false
  )
  assert.equal(
    contracts.authSessionSchema.safeParse({
      authenticated: false,
      deletionPending: false,
      requiresPolicyAcceptance: false,
      user: null,
    }).success,
    true
  )
  assert.equal(
    contracts.authSessionSchema.safeParse({
      ...session,
      authenticated: false,
    }).success,
    false
  )
  assert.equal(
    contracts.localLoginRequestSchema.safeParse({
      email: "asha@example.com",
      password: "legacy7",
    }).success,
    true
  )
  assert.equal(
    contracts.localLoginRequestSchema.safeParse({
      email: "asha@example.com",
      password: "é".repeat(64),
    }).success,
    false
  )
  assert.equal(
    contracts.userIdentitySchema.safeParse({
      ...identity,
      authProviders: ["local", "local"],
    }).success,
    false
  )
  assert.equal(
    contracts.authSessionSchema.safeParse({
      ...session,
      user: { ...identity, sessionVersion: 4 },
    }).success,
    false
  )

  const profile = {
    ...identity,
    active: true,
    approved: true,
    instructorApprovalStatus: "NotApplicable",
    profile: {
      about: null,
      contactNumber: null,
      dateOfBirth: null,
      gender: null,
    },
    createdAt: timestamp,
    updatedAt: timestamp,
  }
  assert.equal(contracts.userProfileSchema.safeParse(profile).success, true)
  assert.equal(
    contracts.userProfileSchema.safeParse({
      ...profile,
      password: "Password1",
    }).success,
    false
  )
})

test("course and learning DTOs keep learner identities and media metadata out", () => {
  const lesson = {
    id: ids.lesson,
    title: "Introduction",
    description: "Start here.",
    durationSeconds: 60,
    previewAvailable: false,
  }
  const course = {
    id: ids.course,
    name: "Production APIs",
    description: "Build secure services.",
    whatYouWillLearn: "Validated boundaries.",
    thumbnailUrl: "https://cdn.example.test/course.webp",
    price: money,
    status: "Published",
    tags: ["api"],
    instructions: ["Use Node 24"],
    level: "advanced",
    language: "en",
    category: { id: ids.category, name: "Engineering" },
    instructor: {
      id: ids.user,
      name: "Asha Rao",
      imageUrl: null,
      about: null,
    },
    rating: { average: 4.8, count: 20 },
    enrollmentCount: 10,
    curriculum: [{ id: ids.section, name: "Start", lessons: [lesson] }],
    createdAt: timestamp,
    updatedAt: timestamp,
  }
  assert.equal(contracts.courseDetailSchema.safeParse(course).success, true)
  assert.equal(
    contracts.courseDetailSchema.safeParse({
      ...course,
      price: { amountMinor: 0, currency: "INR" },
    }).success,
    false
  )
  assert.equal(
    contracts.courseDetailSchema.safeParse({
      ...course,
      studentsEnroled: [ids.user],
    }).success,
    false
  )
  assert.equal(
    contracts.courseDetailSchema.safeParse({
      ...course,
      curriculum: [
        {
          ...course.curriculum[0],
          lessons: [{ ...lesson, videoPublicId: "private/provider-id" }],
        },
      ],
    }).success,
    false
  )

  const progress = {
    courseId: ids.course,
    completedLessonIds: [ids.lesson],
    completedCount: 1,
    totalLessons: 2,
    progressPercent: 50,
    updatedAt: timestamp,
  }
  assert.equal(contracts.courseProgressSchema.safeParse(progress).success, true)
  assert.equal(
    contracts.courseProgressSchema.safeParse({
      ...progress,
      userId: ids.user,
    }).success,
    false
  )
  assert.equal(
    contracts.courseProgressSchema.safeParse({
      ...progress,
      completedCount: 0,
    }).success,
    false
  )
  assert.equal(
    contracts.courseProgressSchema.safeParse({
      ...progress,
      completedLessonIds: [ids.lesson, ids.lesson],
      completedCount: 2,
      totalLessons: 2,
      progressPercent: 100,
    }).success,
    false
  )
  assert.equal(
    contracts.lessonPlaybackSchema.safeParse({
      lessonId: ids.lesson,
      url: "https://signed.example.test/lesson",
      expiresAt: timestamp,
      providerPublicId: "private/provider-id",
    }).success,
    false
  )
  assert.equal(
    contracts.lessonPlaybackSchema.safeParse({
      lessonId: ids.lesson,
      url: "javascript:alert(1)",
      expiresAt: timestamp,
    }).success,
    false
  )
})

test("review contracts do not expose reviewer, review, or course identifiers", () => {
  const review = {
    createdAt: timestamp,
    course: { name: "Production APIs" },
    rating: 5,
    review: "Clear and useful.",
    reviewer: { firstName: "Asha", lastName: "Rao", imageUrl: null },
  }
  assert.equal(contracts.publicReviewSchema.safeParse(review).success, true)
  assert.equal(
    contracts.publicReviewSchema.safeParse({
      ...review,
      id: ids.lesson,
    }).success,
    false
  )
  assert.equal(
    contracts.publicReviewSchema.safeParse({
      ...review,
      reviewer: { ...review.reviewer, id: ids.user },
    }).success,
    false
  )
})

test("commerce and admin contracts keep provider and internal audit data scoped out", () => {
  const purchase = {
    id: ids.purchase,
    status: "fulfilled",
    amount: money,
    lineItems: [lineItem],
    policy,
    createdAt: timestamp,
    paidAt: timestamp,
    fulfilledAt: timestamp,
    refundRequestedAt: null,
    refundedAt: null,
    refundEligible: true,
    refundEligibleUntil: timestamp,
    refundProviderStatus: null,
  }
  assert.equal(
    contracts.learnerPurchaseSchema.safeParse(purchase).success,
    true
  )
  assert.equal(
    contracts.learnerPurchaseSchema.safeParse({
      ...purchase,
      razorpayPaymentId: "pay_private",
    }).success,
    false
  )
  assert.equal(
    contracts.learnerPurchaseSchema.safeParse({
      ...purchase,
      amount: {
        amountMinor: money.amountMinor * 2,
        currency: "INR",
      },
      lineItems: [
        lineItem,
        { ...lineItem, courseName: "Duplicate course snapshot" },
      ],
    }).success,
    false
  )
  assert.equal(
    contracts.checkoutRequestSchema.safeParse({
      courses: [ids.course],
      acknowledgeCheckoutPolicies: true,
      ...policy,
      idempotencyKey: "header-only-key",
    }).success,
    false
  )
  assert.equal(
    contracts.checkoutRequestSchema.safeParse({
      courses: [ids.course, ids.course],
      acknowledgeCheckoutPolicies: true,
      ...policy,
    }).success,
    false
  )
  assert.equal(
    contracts.learnerPurchaseSchema.safeParse({
      ...purchase,
      amount: { amountMinor: 0, currency: "INR" },
      lineItems: [
        {
          ...lineItem,
          amount: { amountMinor: 0, currency: "INR" },
        },
      ],
    }).success,
    false
  )
  assert.equal(
    contracts.learnerPurchaseSchema.safeParse({
      ...purchase,
      amount: { amountMinor: money.amountMinor + 1, currency: "INR" },
    }).success,
    false
  )
  assert.equal(
    contracts.refundRequestSchema.safeParse({
      confirmation: "REQUEST REFUND",
      reason: "The course did not match its description.",
    }).success,
    true
  )
  assert.equal(
    contracts.refundRequestSchema.safeParse({
      confirmation: "refund",
      reason: "The course did not match its description.",
    }).success,
    false
  )
  assert.equal(
    contracts.refundRequestSchema.safeParse({
      confirmation: "REQUEST REFUND",
      reason: "Too short",
    }).success,
    false
  )

  const queueItem = {
    purchaseId: ids.purchase,
    learner: {
      id: ids.user,
      firstName: "Asha",
      lastName: "Rao",
      email: "asha@example.com",
      accountType: "Student",
      active: true,
      approved: true,
    },
    amount: money,
    lineItems: [lineItem],
    status: "payment_review",
    policy,
    queuedAt: timestamp,
    refundRequestedAt: null,
    refundProviderStatus: null,
  }
  assert.equal(
    contracts.reconciliationQueueItemSchema.safeParse(queueItem).success,
    true
  )
  assert.equal(
    contracts.reconciliationQueueItemSchema.safeParse({
      ...queueItem,
      reconciliationNote: "private operations note",
    }).success,
    false
  )
  assert.equal(
    contracts.instructorApprovalQueueItemSchema.safeParse({
      id: ids.user,
      firstName: "Asha",
      lastName: "Rao",
      email: "asha@example.com",
      imageUrl: null,
      about: null,
      contactNumber: null,
      status: "Pending",
      active: true,
      approved: false,
      submittedAt: timestamp,
      reviewedAt: null,
    }).success,
    true
  )
  assert.equal(
    contracts.instructorApprovalQueueItemSchema.safeParse({
      id: ids.user,
      firstName: "Asha",
      lastName: "Rao",
      email: "asha@example.com",
      imageUrl: null,
      about: null,
      contactNumber: null,
      status: "Approved",
      active: true,
      approved: true,
      submittedAt: timestamp,
      reviewedAt: timestamp,
    }).success,
    false
  )
  assert.equal(
    contracts.reconciliationQueueItemSchema.safeParse({
      ...queueItem,
      status: "fulfilled",
    }).success,
    false
  )
})

test("root and all domain subpaths load while preserving catalog identity", () => {
  assert.equal(
    contracts.catalogCourseListQuerySchema,
    catalogContracts.catalogCourseListQuerySchema
  )
  assert.equal(contracts.objectIdSchema, catalogContracts.objectIdSchema)
  for (const [subpath, subpathContract] of Object.entries(contractSubpaths)) {
    assert.equal(
      typeof subpathContract,
      "object",
      `Expected ${subpath} subpath exports`
    )
    assert.ok(Object.keys(subpathContract).length > 0)
  }
  assert.ok(Object.keys(contracts.contractSchemas).length >= 60)
})

test("the shipped catalog contract retains legacy image-string compatibility", () => {
  const catalogCourse = {
    id: ids.course,
    name: "Production APIs",
    description: "Build secure services.",
    thumbnailUrl: "/uploads/catalog-thumbnail.webp",
    price: 1499,
    currency: "INR",
    instructor: {
      id: ids.user,
      name: "Asha Rao",
      imageUrl: "/uploads/legacy-instructor.webp",
    },
    category: { id: ids.category, name: "Engineering" },
    rating: { average: 4.8, count: 20 },
    durationSeconds: 3600,
    level: "advanced",
    language: "en",
    enrollmentCount: 10,
    createdAt: timestamp,
  }

  assert.equal(
    catalogContracts.catalogCourseSchema.safeParse(catalogCourse).success,
    true
  )
})

test("OpenAPI 3.1 is deterministic and generated from every registered schema", () => {
  const first = contracts.createOpenApiDocument()
  const second = contracts.createOpenApiDocument()
  assert.deepEqual(first, second)
  assert.equal(first.openapi, "3.1.0")
  assert.ok(first.paths["/api/v2/courses"])
  assert.deepEqual(
    Object.keys(first.components.schemas),
    Object.keys(contracts.contractSchemas)
  )
  assert.equal(first.components.schemas.AuthSession.oneOf.length, 2)
  for (const sessionVariant of first.components.schemas.AuthSession.oneOf) {
    assert.equal(sessionVariant.additionalProperties, false)
  }
  assert.equal(
    first.components.schemas.MinorMoney.properties.amountMinor.type,
    "integer"
  )
  assert.equal(first.components.schemas.CatalogPriceMajor.type, "number")
  assert.match(
    first.components.schemas.CatalogCourse.properties.price.description,
    /major units/
  )
  assert.equal(
    new RegExp(first.components.schemas.HttpUrl.pattern).test(
      "HTTPS://cdn.example.test/media"
    ),
    true
  )
  assert.equal(first.components.schemas.HttpUrl.format, "uri")
  assert.equal(
    first.components.schemas.OffsetPaginationQuery.required,
    undefined
  )
  assert.equal(
    first.components.schemas.CatalogCourseListQuery.required?.includes(
      "limit"
    ) ?? false,
    false
  )
  for (const component of [
    "CursorPaginationQuery",
    "ResourceIdParams",
    "PurchaseStatus",
    "RefundProviderStatus",
    "ReconciliationResolution",
  ]) {
    assert.ok(first.components.schemas[component])
  }
  const catalogOperation = first.paths["/api/v2/courses"].get
  assert.deepEqual(catalogOperation.parameters[0], {
    $ref: "#/components/parameters/RequestId",
  })
  assert.ok(catalogOperation.responses[415])
  for (const response of Object.values(catalogOperation.responses)) {
    assert.deepEqual(response.headers["x-request-id"], {
      $ref: "#/components/headers/RequestId",
    })
  }
})
