const assert = require("node:assert/strict")
const test = require("node:test")
const mongoose = require("mongoose")

const {
  INTERNAL_ENTITLEMENT_PROJECTION,
  createEntitlementRepository,
} = require("../domains/entitlement/entitlementRepository")
const {
  sanitizeOperationalStatus,
} = require("../domains/entitlement/entitlementRecoveryService")

const boundary = new Date("2026-08-11T12:00:00.000Z")
const now = new Date("2026-08-11T13:00:00.000Z")
const ageCutoff = new Date("2026-08-10T13:00:00.000Z")

class FakeQuery {
  constructor(result, calls) {
    this.calls = calls
    this.result = result
  }

  comment(value) {
    this.calls.comment = value
    return this
  }

  lean() {
    this.calls.lean = true
    return Promise.resolve(this.result)
  }

  limit(value) {
    this.calls.limit = value
    return this
  }

  maxTimeMS(value) {
    this.calls.maxTimeMS = value
    return this
  }

  hint(value) {
    this.calls.hint = value
    return this
  }

  select(value) {
    this.calls.select = value
    return this
  }

  setOptions(value) {
    this.calls.queryOptions = value
    return this
  }

  sort(value) {
    this.calls.sort = value
    return this
  }
}

const provisioning = (overrides = {}) => ({
  _id: "episode-1",
  schemaVersion: 1,
  studentId: "student-1",
  courseId: "course-1",
  purchaseId: "purchase-1",
  isCurrent: true,
  status: "provisioning",
  source: "purchase",
  reconciliationAttempts: 0,
  nextReconciliationAt: new Date(now.getTime() - 1),
  revision: 0,
  createdAt: new Date(boundary.getTime() + 1),
  updatedAt: now,
  ...overrides,
})

const dependencies = (EntitlementModel) => ({
  CourseModel: {},
  CourseProgressModel: {},
  EntitlementModel,
  PurchaseModel: {},
  UserModel: { collection: { name: "users" } },
})

const fakeAggregation = (result, calls = {}) => ({
  option(value) {
    calls.options = value
    return this
  },
  then(resolve, reject) {
    return Promise.resolve(
      typeof result === "function" ? result() : result
    ).then(resolve, reject)
  },
})

const operationalRepository = ({
  boundaryDocuments = [],
  courseDocuments = [],
  lifecycleEpisodes = [],
  manualReviewEpisodes = [],
  onBoundaryPipeline,
  onLifecycleQuery,
  purchaseDocuments = [],
  userDocuments = [],
} = {}) => {
  const documentsById = (documents, filter) => {
    const ids = filter?._id?.$in
    if (!ids) return documents
    const expected = new Set(ids.map((value) => value.toString()))
    return documents.filter((document) => expected.has(document._id.toString()))
  }
  const emptyReadModel = { find: () => new FakeQuery([], {}) }
  let lifecycleCallCount = 0
  const EntitlementModel = {
    collection: { name: "entitlements" },
    find(filter) {
      const isLifecycleQuery =
        filter?._id?.$gte && Object.keys(filter).length === 1
      const result = isLifecycleQuery
        ? typeof lifecycleEpisodes === "function"
          ? lifecycleEpisodes(filter, lifecycleCallCount++)
          : lifecycleEpisodes
        : filter?.manualReviewRequiredAt?.$exists === true
          ? manualReviewEpisodes
          : []
      const calls = {}
      if (isLifecycleQuery) onLifecycleQuery?.(filter, calls)
      return new FakeQuery(result, calls)
    },
  }
  let boundaryCallCount = 0
  const PurchaseModel = {
    aggregate(pipeline) {
      onBoundaryPipeline?.(pipeline)
      const result =
        typeof boundaryDocuments === "function"
          ? boundaryDocuments(pipeline, boundaryCallCount)
          : boundaryDocuments
      boundaryCallCount += 1
      return fakeAggregation(result)
    },
    find(filter) {
      return new FakeQuery(documentsById(purchaseDocuments, filter), {})
    },
    schema: { path: () => ({ cast: (value) => value }) },
  }
  return createEntitlementRepository({
    CourseModel: {
      find: (filter) =>
        new FakeQuery(documentsById(courseDocuments, filter), {}),
    },
    CourseProgressModel: emptyReadModel,
    EntitlementModel,
    PurchaseModel,
    UserModel: {
      collection: { name: "users" },
      find: (filter) => new FakeQuery(documentsById(userDocuments, filter), {}),
    },
  })
}

const validBoundaryPurchase = (overrides = {}) => {
  const purchaseId = new mongoose.Types.ObjectId()
  const studentId = new mongoose.Types.ObjectId()
  const courseId = new mongoose.Types.ObjectId()
  return {
    _id: purchaseId,
    user: studentId,
    courses: [courseId],
    lineItems: [
      {
        amount: 1000,
        course: courseId,
        courseName: "Repository fixture",
      },
    ],
    createdAt: new Date(boundary.getTime() + 1),
    paidAt: new Date(boundary.getTime() + 2),
    status: "paid",
    razorpayPaymentId: `pay_${purchaseId}`,
    entitlementEpisodes: [],
    ...overrides,
  }
}

const validPurchaseEpisode = (purchase, overrides = {}) => ({
  _id: new mongoose.Types.ObjectId(),
  schemaVersion: 1,
  studentId: purchase.user,
  courseId: purchase.courses[0],
  purchaseId: purchase._id,
  isCurrent: true,
  status: "provisioning",
  source: "purchase",
  reconciliationAttempts: 0,
  nextReconciliationAt: new Date(now.getTime() + 60_000),
  revision: 0,
  createdAt: new Date(boundary.getTime() + 3),
  updatedAt: new Date(boundary.getTime() + 3),
  ...overrides,
})

test("internal repository reads explicitly select every private operational field", async () => {
  const calls = {}
  const repository = createEntitlementRepository(
    dependencies({
      find(filter) {
        calls.filter = filter
        return new FakeQuery([], calls)
      },
    })
  )

  await repository.findPurchaseEpisodes({ purchaseId: "purchase-1" })

  assert.equal(calls.lean, true)
  assert.equal(calls.select, INTERNAL_ENTITLEMENT_PROJECTION)
  assert.equal(calls.comment, "studynotion.entitlement-stage2-sidecar.v1")
  assert.equal(calls.maxTimeMS, 2_000)
  assert.deepEqual(calls.queryOptions, { timeoutMS: 2_000 })
  for (const field of [
    "+reconciliationAttempts",
    "+nextReconciliationAt",
    "+reconciliationLeaseId",
    "+reconciliationLeaseUntil",
    "+manualReviewRequiredAt",
    "+replacementDecision",
  ]) {
    assert.equal(calls.select.includes(field), true)
  }
})

test("transition CAS fences identity, revision, exact lease, validity, and deployment boundary", async () => {
  const previous = provisioning({
    nextReconciliationAt: undefined,
    reconciliationAttempts: 1,
    reconciliationLeaseId: "lease-1",
    reconciliationLeaseUntil: new Date(now.getTime() + 60_000),
    revision: 1,
  })
  delete previous.nextReconciliationAt
  const next = {
    ...previous,
    grantedAt: now,
    isCurrent: true,
    revision: 2,
    status: "active",
  }
  delete next.reconciliationLeaseId
  delete next.reconciliationLeaseUntil
  const calls = {}
  const repository = createEntitlementRepository(
    dependencies({
      findOneAndUpdate(filter, update, options) {
        Object.assign(calls, { filter, options, update })
        return new FakeQuery(next, calls)
      },
    })
  )

  const result = await repository.transitionEpisode({
    createdAtGte: boundary,
    leaseValidAt: now,
    next,
    previous,
  })

  assert.equal(result.status, "active")
  assert.equal(calls.filter.source, "purchase")
  assert.equal(calls.filter.revision, 1)
  assert.equal(calls.filter.reconciliationLeaseId, "lease-1")
  assert.deepEqual(calls.filter.$and, [
    { reconciliationLeaseUntil: previous.reconciliationLeaseUntil },
    { reconciliationLeaseUntil: { $gt: now } },
    { createdAt: previous.createdAt },
    { createdAt: { $gte: boundary } },
  ])
  assert.deepEqual(calls.filter.$expr, {
    $gt: ["$reconciliationLeaseUntil", "$$NOW"],
  })
  assert.deepEqual(calls.update.$inc, { revision: 1 })
  assert.deepEqual(calls.update.$unset, {
    reconciliationLeaseId: "",
    reconciliationLeaseUntil: "",
  })
  assert.deepEqual(calls.options, {
    returnDocument: "after",
    runValidators: true,
  })
  assert.deepEqual(calls.queryOptions, { timeoutMS: 2_000 })
  assert.equal(calls.maxTimeMS, 2_000)
})

test("automatic claim uses both inclusive deployment and exclusive 24-hour age fences", async () => {
  const candidate = provisioning()
  const findCalls = {}
  const updateCalls = {}
  const repository = createEntitlementRepository(
    dependencies({
      findOne(filter) {
        findCalls.filter = filter
        return new FakeQuery(candidate, findCalls)
      },
      findOneAndUpdate(filter, update, options) {
        Object.assign(updateCalls, { filter, options, update })
        return new FakeQuery(
          { ...candidate, reconciliationLeaseId: "lease-1" },
          updateCalls
        )
      },
    })
  )

  await repository.claimDueProvisioning({
    createdAfter: boundary,
    createdAfterAge: ageCutoff,
    leaseId: "lease-1",
    leaseUntil: new Date(now.getTime() + 60_000),
    now,
  })

  assert.deepEqual(findCalls.filter.createdAt, {
    $gte: boundary,
    $gt: ageCutoff,
  })
  assert.equal(findCalls.filter.source, "purchase")
  assert.equal(findCalls.filter.status, "provisioning")
  assert.deepEqual(findCalls.filter.reconciliationLeaseId, { $exists: false })
  assert.deepEqual(updateCalls.filter.$and, [
    { createdAt: candidate.createdAt },
    { createdAt: { $gte: boundary } },
    { createdAt: { $gt: ageCutoff } },
  ])
  assert.equal(updateCalls.update.$inc.revision, 1)
  assert.equal(updateCalls.update.$set.reconciliationAttempts, 1)
  assert.equal(updateCalls.update.$set.reconciliationLeaseId, "lease-1")
  assert.deepEqual(updateCalls.update.$unset, { nextReconciliationAt: "" })
})

test("aged recovery lookup uses an exact timestamp fence inside a bounded _id_ range", async () => {
  const calls = {}
  const createdAfter = new Date("2026-08-01T12:00:00.500Z")
  const createdBefore = new Date("2026-08-10T13:00:00.250Z")
  const repository = createEntitlementRepository(
    dependencies({
      findOne(filter) {
        calls.filter = filter
        return new FakeQuery(null, calls)
      },
    })
  )

  await repository.findAgedProvisioning({ createdAfter, createdBefore })

  assert.deepEqual(calls.filter.createdAt, {
    $gte: createdAfter,
    $lte: createdBefore,
  })
  assert.deepEqual(
    calls.filter._id.$gte,
    mongoose.Types.ObjectId.createFromTime(
      Math.floor(createdAfter.getTime() / 1_000)
    )
  )
  assert.deepEqual(
    calls.filter._id.$lt,
    mongoose.Types.ObjectId.createFromTime(
      Math.floor(createdBefore.getTime() / 1_000) + 1
    )
  )
  assert.deepEqual(calls.sort, { _id: 1 })
  assert.equal(calls.hint, "_id_")
})

test("inserts carry the same bounded database budget and privacy-safe comment", async () => {
  const calls = {}
  const episode = provisioning()
  const repository = createEntitlementRepository(
    dependencies({
      async insertMany(documents, options) {
        calls.documents = documents
        calls.options = options
        return documents
      },
    })
  )

  const inserted = await repository.insertEntitlementEpisodes([episode])

  assert.equal(inserted.length, 1)
  assert.equal(calls.options.maxTimeMS, 2_000)
  assert.equal(calls.options.timeoutMS, 2_000)
  assert.equal(
    calls.options.comment,
    "studynotion.entitlement-stage2-sidecar.v1"
  )
  assert.equal(calls.options.ordered, false)
})

test("boundary catch-up limits the raw indexed Purchase page before its lookup", async () => {
  const calls = {}
  const missingPurchase = validBoundaryPurchase()
  const aggregate = {
    option(value) {
      calls.options = value
      return this
    },
    then(resolve, reject) {
      return Promise.resolve([missingPurchase]).then(resolve, reject)
    },
  }
  const EntitlementModel = {
    collection: { name: "entitlements" },
  }
  const PurchaseModel = {
    aggregate(pipeline) {
      calls.pipeline = pipeline
      return aggregate
    },
    schema: { path: () => ({ cast: (value) => value }) },
  }
  const repository = createEntitlementRepository({
    CourseModel: {},
    CourseProgressModel: {},
    EntitlementModel,
    PurchaseModel,
    UserModel: { collection: { name: "users" } },
  })

  const page = await repository.findBoundaryPurchaseCandidates({
    limit: 1,
    startedAt: boundary,
  })

  assert.equal(page.candidates.length, 1)
  assert.equal(page.scannedCount, 1)
  assert.equal(page.nextCursor, missingPurchase._id)
  assert.equal(page.candidates[0].purchase._id, missingPurchase._id)
  assert.deepEqual(page.candidates[0].episodes, [])
  const lookupIndexes = calls.pipeline
    .map((stage, index) => (stage.$lookup ? index : -1))
    .filter((index) => index >= 0)
  const limitIndex = calls.pipeline.findIndex((stage) => stage.$limit)
  assert.equal(lookupIndexes.length, 2)
  assert.equal(
    lookupIndexes.every((lookupIndex) => limitIndex < lookupIndex),
    true
  )
  assert.deepEqual(calls.pipeline[limitIndex], { $limit: 2 })
  const entitlementLookup = calls.pipeline[lookupIndexes[0]].$lookup
  assert.equal(entitlementLookup.from, "entitlements")
  assert.deepEqual(entitlementLookup.let, { purchaseId: "$_id" })
  assert.deepEqual(entitlementLookup.pipeline[0], {
    $match: { $expr: { $eq: ["$purchaseId", "$$purchaseId"] } },
  })
  assert.deepEqual(entitlementLookup.pipeline[1], {
    $sort: { courseId: 1 },
  })
  const episodeLimitIndex = entitlementLookup.pipeline.findIndex(
    (stage) => stage.$limit
  )
  const episodeProjectionIndex = entitlementLookup.pipeline.findIndex(
    (stage) => stage.$project
  )
  assert.deepEqual(entitlementLookup.pipeline[episodeLimitIndex], {
    $limit: 21,
  })
  assert.equal(episodeLimitIndex < episodeProjectionIndex, true)
  const userLookup = calls.pipeline[lookupIndexes[1]].$lookup
  assert.equal(userLookup.from, "users")
  assert.equal(userLookup.localField, "user")
  assert.equal(userLookup.foreignField, "_id")
  assert.equal(userLookup.pipeline[0].$project.deletionStartedAt, 1)
  const serialized = JSON.stringify(calls.pipeline)
  assert.equal(serialized.includes("deletionStartedAt"), true)
  assert.deepEqual(
    calls.pipeline[0].$match._id.$gte,
    mongoose.Types.ObjectId.createFromTime(
      Math.floor(boundary.getTime() / 1_000)
    )
  )
  assert.equal(serialized.includes("_entitlementUnresolved"), false)
  assert.equal(
    serialized.includes("_entitlementFinancialEvidenceMalformed"),
    false
  )
  assert.equal(calls.pipeline.at(-1).$project.user, 1)
  assert.equal(calls.pipeline.at(-1).$project.email, undefined)
  assert.equal(calls.options.maxTimeMS, 2_000)
  assert.equal(calls.options.timeoutMS, 2_000)
  assert.equal(calls.options.hint, "_id_")
})

const malformedBoundaryPurchaseCases = () => [
  ["missing createdAt", validBoundaryPurchase({ createdAt: undefined })],
  [
    "non-Date createdAt",
    validBoundaryPurchase({ createdAt: "2026-08-11T12:00:01.000Z" }),
  ],
  ["missing paidAt", validBoundaryPurchase({ paidAt: undefined })],
  [
    "non-Date paidAt",
    validBoundaryPurchase({ paidAt: "2026-08-11T12:00:02.000Z" }),
  ],
  ["unknown status", validBoundaryPurchase({ status: "unknown_status" })],
  [
    "unknown refund origin",
    validBoundaryPurchase({
      status: "refund_pending",
      refundOriginStatus: "provider_unknown",
      refundProviderStatus: "pending",
    }),
  ],
]

test("boundary scanner classifies every malformed post-boundary financial row in JavaScript", async (t) => {
  const malformedCases = malformedBoundaryPurchaseCases()
  for (const [name, malformedPurchase] of malformedCases) {
    await t.test(name, async () => {
      const repository = operationalRepository({
        boundaryDocuments: [malformedPurchase],
      })
      const page = await repository.findBoundaryPurchaseCandidates({
        limit: 10,
        startedAt: boundary,
      })

      assert.equal(page.candidates.length, 1)
      assert.equal(page.candidates[0].financialEvidenceMalformed, true)
    })
  }

  const validPreBoundary = validBoundaryPurchase({
    createdAt: new Date(boundary.getTime() - 1),
  })
  const preBoundaryPage = await operationalRepository({
    boundaryDocuments: [validPreBoundary],
  }).findBoundaryPurchaseCandidates({ limit: 10, startedAt: boundary })
  assert.equal(preBoundaryPage.candidates.length, 0)
})

test("operational status blocks each unresolved malformed financial row", async (t) => {
  for (const [name, malformedPurchase] of malformedBoundaryPurchaseCases()) {
    await t.test(name, async () => {
      const repository = operationalRepository({
        boundaryDocuments: [malformedPurchase],
      })

      const status = await repository.getRecoveryOperationalStatus({
        limit: 1,
        now,
        sidecarStartedAt: boundary,
      })

      assert.equal(status.boundaryLifecycleMismatchCount, 1)
      assert.equal(sanitizeOperationalStatus(status, now).status, "blocking")
    })
  }
})

test("operational status rejects ObjectId-looking strings in persisted Entitlement references", async () => {
  const stringReferenceEpisode = {
    _id: "64b000000000000000000001",
    schemaVersion: 1,
    studentId: "64b000000000000000000002",
    courseId: "64b000000000000000000003",
    purchaseId: "64b000000000000000000004",
    isCurrent: true,
    status: "provisioning",
    source: "purchase",
    reconciliationAttempts: 0,
    nextReconciliationAt: new Date(now.getTime() + 60_000),
    revision: 0,
    createdAt: new Date(boundary.getTime() + 1),
    updatedAt: now,
  }
  const repository = operationalRepository({
    lifecycleEpisodes: [stringReferenceEpisode],
  })

  const status = await repository.getRecoveryOperationalStatus({
    limit: 10,
    now,
    sidecarStartedAt: boundary,
  })

  assert.equal(status.malformedEpisodeCount, 1)
  assert.equal(status.activeMissingLegacyCount, 0)
  assert.equal(sanitizeOperationalStatus(status, now).status, "blocking")
})

test("operational lifecycle status pages beyond 1,000 healthy rows and still finds a later mismatch", async (t) => {
  const createFixture = ({ mismatchAt }) => {
    const courseDocuments = []
    const episodes = []
    const purchaseDocuments = []
    const userDocuments = []
    for (let index = 0; index < 1_001; index += 1) {
      const purchase = validBoundaryPurchase()
      const episode = validPurchaseEpisode(purchase)
      if (index === mismatchAt) purchase.user = new mongoose.Types.ObjectId()
      purchaseDocuments.push(purchase)
      episodes.push(episode)
      userDocuments.push({
        _id: episode.studentId,
        accountType: "Student",
        active: true,
        approved: true,
        courses: [],
        deletionPending: false,
      })
      courseDocuments.push({
        _id: episode.courseId,
        studentsEnroled: [],
      })
    }
    const lifecycleQueries = []
    let pageCount = 0
    const repository = operationalRepository({
      courseDocuments,
      lifecycleEpisodes(_filter, callCount) {
        pageCount += 1
        const offset = callCount * 100
        return episodes.slice(offset, offset + 101)
      },
      onLifecycleQuery(filter, calls) {
        lifecycleQueries.push({ calls, filter })
      },
      purchaseDocuments,
      userDocuments,
    })
    return {
      episodes,
      lifecycleQueries,
      pageCount: () => pageCount,
      repository,
    }
  }

  await t.test(
    "healthy volume is fully examined without truncation",
    async () => {
      const fixture = createFixture({ mismatchAt: -1 })
      const status = await fixture.repository.getRecoveryOperationalStatus({
        limit: 10,
        now,
        sidecarStartedAt: boundary,
      })

      assert.equal(status.malformedEpisodeCount, 0)
      assert.equal(status.truncated.lifecycle, false)
      assert.equal(sanitizeOperationalStatus(status, now).status, "healthy")
      assert.equal(fixture.pageCount(), 11)
      assert.equal(
        fixture.lifecycleQueries.every(
          ({ calls }) =>
            calls.hint === "_id_" &&
            calls.limit === 101 &&
            calls.maxTimeMS === 2_000
        ),
        true
      )
      assert.deepEqual(fixture.lifecycleQueries[0].calls.sort, { _id: 1 })
      assert.deepEqual(
        fixture.lifecycleQueries[0].filter._id.$gte,
        mongoose.Types.ObjectId.createFromTime(
          Math.floor(boundary.getTime() / 1_000)
        )
      )
      assert.equal(
        fixture.lifecycleQueries[1].filter._id.$gt.toString(),
        fixture.episodes[99]._id.toString()
      )
    }
  )

  await t.test("a mismatch after row 1,000 remains blocking", async () => {
    const fixture = createFixture({ mismatchAt: 1_000 })
    const status = await fixture.repository.getRecoveryOperationalStatus({
      limit: 10,
      now,
      sidecarStartedAt: boundary,
    })

    assert.equal(status.malformedEpisodeCount, 1)
    assert.equal(status.truncated.lifecycle, false)
    assert.equal(sanitizeOperationalStatus(status, now).status, "blocking")
    assert.equal(fixture.pageCount(), 11)
  })
})

test("operational status pages past a healthy raw Purchase page to a later mismatch", async () => {
  const documents = Array.from({ length: 102 }, (_, index) => {
    const purchase = validBoundaryPurchase()
    if (index !== 100) {
      purchase.entitlementEpisodes = [validPurchaseEpisode(purchase)]
    }
    return purchase
  })
  const pipelines = []
  const repository = operationalRepository({
    boundaryDocuments(pipeline, callCount) {
      pipelines.push(pipeline)
      return callCount === 0 ? documents.slice(0, 101) : documents.slice(100)
    },
  })

  const status = await repository.getRecoveryOperationalStatus({
    limit: 1,
    now,
    sidecarStartedAt: boundary,
  })

  assert.equal(status.boundaryExaminedCount, 102)
  assert.equal(status.boundaryMissingEpisodeCount, 1)
  assert.equal(status.boundaryLifecycleMismatchCount, 0)
  assert.equal(status.truncated.boundary, false)
  assert.equal(sanitizeOperationalStatus(status, now).status, "blocking")
  assert.equal(pipelines.length, 2)
  assert.deepEqual(
    pipelines.map((pipeline) => pipeline.find((stage) => stage.$limit)),
    [{ $limit: 101 }, { $limit: 101 }]
  )
  assert.equal(
    pipelines[1][0].$match._id.$gt.toString(),
    documents[99]._id.toString()
  )
})

test("operational status counts duplicate Purchase episodes as one lifecycle mismatch", async () => {
  const purchase = validBoundaryPurchase()
  purchase.entitlementEpisodes = [
    validPurchaseEpisode(purchase),
    validPurchaseEpisode(purchase),
  ]
  const repository = operationalRepository({ boundaryDocuments: [purchase] })

  const status = await repository.getRecoveryOperationalStatus({
    limit: 10,
    now,
    sidecarStartedAt: boundary,
  })

  assert.equal(status.boundaryMissingEpisodeCount, 0)
  assert.equal(status.boundaryLifecycleMismatchCount, 1)
  assert.equal(sanitizeOperationalStatus(status, now).status, "blocking")
})

test("operational status keeps manual-review provisioning as a blocking condition", async () => {
  const purchase = validBoundaryPurchase()
  const manualReviewEpisode = validPurchaseEpisode(purchase, {
    manualReviewRequiredAt: new Date(now.getTime() - 1),
    nextReconciliationAt: undefined,
    reconciliationAttempts: 5,
  })
  delete manualReviewEpisode.nextReconciliationAt
  const repository = operationalRepository({
    manualReviewEpisodes: [manualReviewEpisode],
  })

  const status = await repository.getRecoveryOperationalStatus({
    limit: 10,
    now,
    sidecarStartedAt: boundary,
  })

  assert.equal(status.manualReviewCount, 1)
  assert.equal(sanitizeOperationalStatus(status, now).status, "blocking")
})

test("bounded Purchase scan makes a completed-deletion active episode impossible to report healthy", async () => {
  let boundaryPipeline
  const purchase = validBoundaryPurchase({
    status: "fulfilled",
    fulfilledAt: new Date(boundary.getTime() + 3),
    _entitlementAccountDeleted: true,
    _entitlementDeletionTerminalAt: now,
  })
  purchase.entitlementEpisodes = [
    validPurchaseEpisode(purchase, {
      status: "active",
      grantedAt: purchase.fulfilledAt,
      nextReconciliationAt: undefined,
      revision: 1,
    }),
  ]
  delete purchase.entitlementEpisodes[0].nextReconciliationAt
  const repository = operationalRepository({
    boundaryDocuments: [purchase],
    onBoundaryPipeline(pipeline) {
      boundaryPipeline = pipeline
    },
  })

  const status = await repository.getRecoveryOperationalStatus({
    limit: 1,
    now,
    sidecarStartedAt: boundary,
  })

  assert.equal(status.completedDeletionCurrentCount, 1)
  assert.equal(sanitizeOperationalStatus(status, now).status, "blocking")
  const limitIndex = boundaryPipeline.findIndex((stage) => stage.$limit)
  const lookupIndexes = boundaryPipeline
    .map((stage, index) => (stage.$lookup ? index : -1))
    .filter((index) => index >= 0)
  assert.equal(lookupIndexes.length >= 2, true)
  assert.equal(
    lookupIndexes.every((index) => limitIndex < index),
    true
  )
  assert.equal(boundaryPipeline[lookupIndexes[1]].$lookup.from, "users")
  const serialized = JSON.stringify(boundaryPipeline)
  for (const exactTombstoneField of [
    "authProviders",
    "courseProgress",
    "courses",
    "deletionPending",
    "deletionStartedAt",
    "deletionLockId",
    "deletionLockUntil",
    "deleted-",
    "@users.invalid",
  ]) {
    assert.equal(serialized.includes(exactTombstoneField), true)
  }
})
