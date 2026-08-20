const assert = require("node:assert/strict")
const test = require("node:test")
const mongoose = require("mongoose")

const {
  EntitlementSidecarError,
  createEntitlementService,
} = require("../domains/entitlement/entitlementService")
const {
  assertEntitlementMutation,
  assertEntitlementState,
} = require("../domains/entitlement/entitlementPolicy")

const now = new Date("2026-08-11T12:00:00.000Z")
const studentId = "64b000000000000000000001"
const courseA = "64b000000000000000000002"
const courseB = "64b000000000000000000003"
const purchaseA = "64b000000000000000000004"
const purchaseB = "64b000000000000000000005"
const sidecarStartedAt = new Date(now.getTime() - 60_000)

const clone = (value) => {
  if (value === undefined) return value
  if (value instanceof Date) return new Date(value)
  if (value instanceof mongoose.Types.ObjectId) {
    return new mongoose.Types.ObjectId(value.toString())
  }
  if (Array.isArray(value)) return value.map(clone)
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, nested]) => [key, clone(nested)])
    )
  }
  return value
}

const purchase = (overrides = {}) => ({
  _id: new mongoose.Types.ObjectId(purchaseA),
  user: new mongoose.Types.ObjectId(studentId),
  courses: [new mongoose.Types.ObjectId(courseA)],
  createdAt: new Date(now.getTime() - 30_000),
  lineItems: [
    {
      amount: 10000,
      course: new mongoose.Types.ObjectId(courseA),
      courseName: "Course A",
    },
  ],
  paidAt: new Date(now.getTime() - 30_000),
  razorpayPaymentId: "pay_server_owned",
  status: "paid",
  ...overrides,
})

const createMemoryRepository = ({
  initialEpisodes = [],
  initialPurchases = [purchase()],
  userOverrides = {},
} = {}) => {
  const episodes = initialEpisodes.map(clone)
  const purchases = new Map(
    initialPurchases.map((entry) => [entry._id.toString(), clone(entry)])
  )
  const user = {
    _id: studentId,
    accountType: "Student",
    active: true,
    approved: true,
    courses: [courseA, courseB],
    deletionPending: false,
    ...userOverrides,
  }
  const courses = new Map(
    [courseA, courseB].map((courseId) => [
      courseId,
      { _id: courseId, status: "Published", studentsEnroled: [studentId] },
    ])
  )
  const progress = new Set([courseA, courseB])
  const transitions = []
  let sequence = 0

  const findEpisodes = ({ courseIds, purchaseId: selectedPurchaseId }) =>
    episodes
      .filter(
        (episode) =>
          episode.purchaseId.toString() === selectedPurchaseId.toString() &&
          (!courseIds || courseIds.includes(episode.courseId.toString()))
      )
      .map(clone)

  const repository = {
    episodes,
    purchases,
    transitions,
    async findBoundaryPurchaseCandidates({ afterId, limit, startedAt }) {
      const rawPage = [...purchases.values()]
        .filter(
          (entry) =>
            entry.createdAt >= startedAt &&
            entry.paidAt >= startedAt &&
            (!afterId || entry._id.toString() > afterId.toString())
        )
        .sort((left, right) =>
          left._id.toString().localeCompare(right._id.toString())
        )
      const scanned = rawPage.slice(0, limit)
      return {
        candidates: scanned.map((entry) => ({
          episodes: findEpisodes({ purchaseId: entry._id }),
          purchase: clone(entry),
        })),
        hasMore: rawPage.length > limit,
        nextCursor: scanned.at(-1)?._id || null,
        scannedCount: scanned.length,
      }
    },
    async findCurrentPairEpisode({ courseId, studentId: selectedStudent }) {
      return clone(
        episodes.find(
          (episode) =>
            episode.isCurrent === true &&
            episode.courseId.toString() === courseId.toString() &&
            episode.studentId.toString() === selectedStudent.toString()
        ) || null
      )
    },
    async findCurrentPairEpisodes({ courseIds, studentId: selectedStudent }) {
      return episodes
        .filter(
          (episode) =>
            episode.isCurrent === true &&
            courseIds.includes(episode.courseId.toString()) &&
            episode.studentId.toString() === selectedStudent.toString()
        )
        .map(clone)
    },
    async findCurrentStudentEpisodes({
      afterId,
      createdAfter,
      limit,
      studentId: selectedStudent,
    }) {
      return episodes
        .filter(
          (episode) =>
            episode.isCurrent === true &&
            episode.source === "purchase" &&
            (!afterId ||
              episode._id.toString().localeCompare(afterId.toString()) > 0) &&
            (!createdAfter || episode.createdAt >= createdAfter) &&
            episode.studentId.toString() === selectedStudent.toString() &&
            ["active", "provisioning"].includes(episode.status)
        )
        .sort((left, right) =>
          left._id.toString().localeCompare(right._id.toString())
        )
        .slice(0, limit)
        .map(clone)
    },
    async findPurchaseEpisodes(options) {
      return findEpisodes(options)
    },
    async insertEntitlementEpisodes(inputs) {
      for (const input of inputs) {
        assertEntitlementState(input)
        if (
          episodes.some(
            (episode) =>
              episode.purchaseId.toString() === input.purchaseId.toString() &&
              episode.courseId.toString() === input.courseId.toString()
          )
        ) {
          const error = new Error("duplicate Purchase/Course")
          error.code = 11000
          throw error
        }
        if (
          input.isCurrent &&
          episodes.some(
            (episode) =>
              episode.isCurrent &&
              episode.studentId.toString() === input.studentId.toString() &&
              episode.courseId.toString() === input.courseId.toString()
          )
        ) {
          const error = new Error("duplicate current Student/Course")
          error.code = 11000
          throw error
        }
      }
      const inserted = inputs.map((input) => ({
        _id: `episode-${++sequence}`,
        createdAt: now,
        updatedAt: now,
        ...clone(input),
      }))
      episodes.push(...inserted)
      return clone(inserted)
    },
    async loadActivationEvidence({ courseIds, purchaseId: id }) {
      return {
        courses: courseIds.map((courseId) => clone(courses.get(courseId))),
        progress: courseIds
          .filter((courseId) => progress.has(courseId))
          .map((courseId, index) => ({
            _id: `progress-${index}`,
            courseID: courseId,
            userId: studentId,
          })),
        purchase: clone(purchases.get(id.toString())),
        user: clone(user),
      }
    },
    async loadDeletionEvidence() {
      return clone(user)
    },
    async loadPurchaseEvidence({ purchaseId: id }) {
      return clone(purchases.get(id.toString()) || null)
    },
    async loadReservationEvidence({ courseIds }) {
      return {
        courses: courseIds.map((courseId) => clone(courses.get(courseId))),
        user: clone(user),
      }
    },
    async readDatabaseTime() {
      return new Date(now)
    },
    async transitionEpisode({ ageValidAt, leaseValidAt, next, previous }) {
      assertEntitlementMutation(previous, next)
      const index = episodes.findIndex(
        (episode) =>
          episode._id === previous._id && episode.revision === previous.revision
      )
      if (index === -1) return null
      if (
        leaseValidAt &&
        episodes[index].reconciliationLeaseUntil <= leaseValidAt
      ) {
        return null
      }
      if (ageValidAt && episodes[index].createdAt <= ageValidAt) return null
      episodes[index] = clone(next)
      transitions.push({
        ageValidAt: clone(ageValidAt),
        next: clone(next),
        previous: clone(previous),
      })
      return clone(next)
    },
  }
  return repository
}

const createCapturingLogger = () => {
  const records = []
  const record = (level) => (event, fields) =>
    records.push({ event, fields, level })
  return {
    logger: {
      error: record("error"),
      info: record("info"),
      warn: record("warn"),
    },
    records,
  }
}

test("reservation creates one scheduled episode per trusted Purchase line and replay converges", async () => {
  const repository = createMemoryRepository({
    initialPurchases: [
      purchase({
        courses: [
          new mongoose.Types.ObjectId(courseA),
          new mongoose.Types.ObjectId(courseB),
        ],
        lineItems: [
          {
            amount: 10000,
            course: new mongoose.Types.ObjectId(courseA),
            courseName: "Course A",
          },
          {
            amount: 12000,
            course: new mongoose.Types.ObjectId(courseB),
            courseName: "Course B",
          },
        ],
      }),
    ],
  })
  const failpoints = []
  const service = createEntitlementService({
    clock: () => now,
    failpoint: async (name) => failpoints.push(name),
    repository,
    sidecarStartedAt,
    targetLogger: createCapturingLogger().logger,
  })

  const first = await service.reserveForPurchase({
    purchase: repository.purchases.get(purchaseA),
  })
  const replay = await service.reserveForPurchase({
    purchase: repository.purchases.get(purchaseA),
  })

  assert.deepEqual(first, {
    activeCount: 0,
    courseCount: 2,
    createdCount: 2,
    outcome: "reserved",
    provisioningCount: 2,
  })
  assert.equal(replay.createdCount, 0)
  assert.equal(replay.outcome, "replayed")
  assert.equal(repository.episodes.length, 2)
  for (const episode of repository.episodes) {
    assert.equal(episode.status, "provisioning")
    assert.equal(episode.source, "purchase")
    assert.equal(episode.revision, 0)
    assert.equal(episode.reconciliationAttempts, 0)
    assert.equal(episode.nextReconciliationAt.getTime(), now.getTime() + 60_000)
  }
  assert.deepEqual(failpoints, [
    "before_reservation",
    "after_reservation",
    "before_reservation",
    "after_reservation",
  ])
})

test("reservation rejects ambiguous lines, ineligible Students, and another current Purchase", async () => {
  const malformed = purchase({ lineItems: [] })
  await assert.rejects(
    createEntitlementService({
      repository: createMemoryRepository(),
      sidecarStartedAt,
    }).reserveForPurchase({ purchase: malformed }),
    (error) =>
      error instanceof EntitlementSidecarError &&
      error.code === "PURCHASE_EVIDENCE_AMBIGUOUS"
  )

  await assert.rejects(
    createEntitlementService({
      repository: createMemoryRepository({
        userOverrides: { deletionPending: true },
      }),
      sidecarStartedAt,
    }).reserveForPurchase({ purchase: purchase() }),
    (error) => error.code === "STUDENT_INELIGIBLE"
  )

  const uncaptured = purchase({ razorpayPaymentId: "" })
  await assert.rejects(
    createEntitlementService({
      repository: createMemoryRepository({ initialPurchases: [uncaptured] }),
      sidecarStartedAt,
    }).reserveForPurchase({ purchase: uncaptured }),
    (error) => error.code === "PURCHASE_CAPTURE_EVIDENCE_INVALID"
  )

  const competing = {
    _id: "episode-competing",
    schemaVersion: 1,
    studentId,
    courseId: courseA,
    purchaseId: purchaseB,
    isCurrent: true,
    status: "active",
    source: "purchase",
    grantedAt: now,
    reconciliationAttempts: 0,
    revision: 1,
  }
  await assert.rejects(
    createEntitlementService({
      repository: createMemoryRepository({ initialEpisodes: [competing] }),
      sidecarStartedAt,
    }).reserveForPurchase({ purchase: purchase() }),
    (error) => error.code === "CURRENT_PAIR_CONFLICT"
  )
})

test("reservation fails closed without a valid boundary and rejects historical Purchases", async () => {
  await assert.rejects(
    createEntitlementService({
      repository: createMemoryRepository(),
      sidecarStartedAt: null,
    }).reserveForPurchase({ purchase: purchase() }),
    (error) => error.code === "SIDECAR_BOUNDARY_REQUIRED"
  )
  await assert.rejects(
    createEntitlementService({
      repository: createMemoryRepository(),
      sidecarStartedAt: "2026-08-11T12:00:00Z",
    }).reserveForPurchase({ purchase: purchase() }),
    (error) => error.code === "SIDECAR_BOUNDARY_INVALID"
  )
  const repository = createMemoryRepository()
  await assert.rejects(
    createEntitlementService({
      repository,
      sidecarStartedAt: now,
    }).reserveForPurchase({ purchase: repository.purchases.get(purchaseA) }),
    (error) => error.code === "PURCHASE_BEFORE_SIDECAR_BOUNDARY"
  )
  assert.equal(repository.episodes.length, 0)

  const inFlight = purchase({
    createdAt: new Date(sidecarStartedAt.getTime() - 1),
    paidAt: new Date(sidecarStartedAt.getTime() + 1),
  })
  await assert.rejects(
    createEntitlementService({
      repository: createMemoryRepository({ initialPurchases: [inFlight] }),
      sidecarStartedAt,
    }).reserveForPurchase({ purchase: inFlight }),
    (error) => error.code === "PURCHASE_BEFORE_SIDECAR_BOUNDARY"
  )
})

test("activation reloads authoritative evidence, proves every legacy mirror, and exact-CAS activates", async () => {
  const fulfilled = purchase({
    fulfilledAt: now,
    status: "fulfilled",
  })
  const repository = createMemoryRepository({ initialPurchases: [fulfilled] })
  const service = createEntitlementService({
    clock: () => new Date(now.getTime() + 1_000),
    repository,
    sidecarStartedAt,
  })
  await service.reserveForPurchase({ purchase: fulfilled, now })

  const result = await service.activateForPurchase({ purchaseId: purchaseA })
  assert.deepEqual(result, {
    activatedCount: 1,
    courseCount: 1,
    outcome: "activated",
  })
  assert.equal(repository.episodes[0].status, "active")
  assert.equal(repository.episodes[0].revision, 1)
  assert.equal(repository.episodes[0].grantedAt.getTime(), now.getTime())
  assert.equal(repository.episodes[0].nextReconciliationAt, undefined)

  const replay = await service.activateForPurchase({ purchaseId: purchaseA })
  assert.equal(replay.outcome, "replayed")
  assert.equal(repository.transitions.length, 1)
})

test("activation replay requires the active grant timestamp to equal fulfillment", async () => {
  const fulfilled = purchase({ fulfilledAt: now, status: "fulfilled" })
  const active = {
    _id: "episode-active-timestamp-conflict",
    schemaVersion: 1,
    studentId: new mongoose.Types.ObjectId(studentId),
    courseId: new mongoose.Types.ObjectId(courseA),
    purchaseId: new mongoose.Types.ObjectId(purchaseA),
    isCurrent: true,
    status: "active",
    source: "purchase",
    grantedAt: new Date(now.getTime() - 1),
    reconciliationAttempts: 0,
    revision: 1,
    createdAt: new Date(now.getTime() - 30_000),
  }
  const repository = createMemoryRepository({
    initialEpisodes: [active],
    initialPurchases: [fulfilled],
  })

  await assert.rejects(
    createEntitlementService({
      repository,
      sidecarStartedAt,
    }).activateForPurchase({ now, purchaseId: purchaseA }),
    (error) => error.code === "ACTIVATION_REPLAY_CONFLICT"
  )
  assert.equal(repository.transitions.length, 0)
  assert.equal(repository.episodes[0].status, "active")
  assert.equal(repository.episodes[0].grantedAt.getTime(), now.getTime() - 1)
})

test("activation cannot bypass manual review or the 24-hour recovery handoff", async () => {
  const fulfilled = purchase({ fulfilledAt: now, status: "fulfilled" })
  const cases = [
    {
      label: "manual review",
      operational: {
        manualReviewRequiredAt: new Date(now.getTime() - 1_000),
        reconciliationAttempts: 5,
      },
      createdAt: new Date(now.getTime() - 30_000),
    },
    {
      label: "aged handoff",
      operational: {
        nextReconciliationAt: new Date(now.getTime() - 1_000),
        reconciliationAttempts: 0,
      },
      createdAt: new Date(now.getTime() - 24 * 60 * 60 * 1_000 - 1),
    },
  ]

  for (const scenario of cases) {
    const episode = {
      _id: `episode-${scenario.label.replaceAll(" ", "-")}`,
      schemaVersion: 1,
      studentId: new mongoose.Types.ObjectId(studentId),
      courseId: new mongoose.Types.ObjectId(courseA),
      purchaseId: new mongoose.Types.ObjectId(purchaseA),
      isCurrent: true,
      status: "provisioning",
      source: "purchase",
      revision: 1,
      createdAt: scenario.createdAt,
      ...scenario.operational,
    }
    const repository = createMemoryRepository({
      initialEpisodes: [episode],
      initialPurchases: [fulfilled],
    })

    await assert.rejects(
      createEntitlementService({
        repository,
        sidecarStartedAt,
      }).activateForPurchase({ now, purchaseId: purchaseA }),
      (error) => error.code === "ENTITLEMENT_REQUIRES_MANUAL_REVIEW",
      scenario.label
    )
    assert.equal(repository.transitions.length, 0, scenario.label)
    assert.equal(repository.episodes[0].status, "provisioning", scenario.label)
  }
})

test("activation never creates missing episodes and rejects incomplete legacy evidence", async () => {
  const fulfilled = purchase({ fulfilledAt: now, status: "fulfilled" })
  const missingRepository = createMemoryRepository({
    initialPurchases: [fulfilled],
  })
  await assert.rejects(
    createEntitlementService({
      repository: missingRepository,
      sidecarStartedAt,
    }).activateForPurchase({ purchaseId: purchaseA }),
    (error) => error.code === "ENTITLEMENT_EPISODE_MISSING"
  )
  assert.equal(missingRepository.episodes.length, 0)

  const incompleteRepository = createMemoryRepository({
    initialPurchases: [fulfilled],
  })
  const service = createEntitlementService({
    repository: incompleteRepository,
    sidecarStartedAt,
  })
  await service.reserveForPurchase({ purchase: fulfilled, now })
  incompleteRepository.loadActivationEvidence = async (input) => {
    const evidence = await createMemoryRepository({
      initialPurchases: [fulfilled],
    }).loadActivationEvidence(input)
    evidence.courses[0].studentsEnroled = []
    return evidence
  }
  await assert.rejects(
    service.activateForPurchase({ purchaseId: purchaseA }),
    (error) => error.code === "LEGACY_ENROLLMENT_INCOMPLETE"
  )
  assert.equal(incompleteRepository.episodes[0].status, "provisioning")

  const changedRepository = createMemoryRepository({
    initialPurchases: [fulfilled],
  })
  const changedService = createEntitlementService({
    repository: changedRepository,
    sidecarStartedAt,
  })
  await changedService.reserveForPurchase({ purchase: fulfilled, now })
  changedRepository.loadActivationEvidence = async (input) => {
    const evidence = await createMemoryRepository({
      initialPurchases: [fulfilled],
    }).loadActivationEvidence(input)
    evidence.purchase.razorpayPaymentId = ""
    return evidence
  }
  await assert.rejects(
    changedService.activateForPurchase({ purchaseId: purchaseA }),
    (error) => error.code === "PURCHASE_EVIDENCE_INVALID"
  )
  assert.equal(changedRepository.episodes[0].status, "provisioning")
})

test("activation rejects a refund that became provider-processed", async () => {
  const pending = purchase({
    fulfilledAt: now,
    refundOriginStatus: "refund_requested",
    refundProviderStatus: "pending",
    status: "refund_pending",
  })
  const repository = createMemoryRepository({ initialPurchases: [pending] })
  const service = createEntitlementService({ repository, sidecarStartedAt })
  await service.reserveForPurchase({ purchase: pending, now })
  repository.purchases.set(
    purchaseA,
    purchase({
      ...pending,
      refundProcessedAt: new Date(now.getTime() + 1_000),
      refundProviderStatus: "processed",
    })
  )

  await assert.rejects(
    service.activateForPurchase({ purchaseId: purchaseA }),
    (error) => error.code === "PURCHASE_NOT_ACTIVATABLE"
  )
  assert.equal(repository.episodes[0].status, "provisioning")
})

test("processed-refund terminalization rejects unknown provider or origin evidence without mutation", async () => {
  const refundAt = new Date(now.getTime() + 60_000)
  const exactProcessed = purchase({
    fulfilledAt: now,
    refundEntitlementsRevokedAt: refundAt,
    refundOriginStatus: "refund_requested",
    refundProcessedAt: refundAt,
    refundProviderStatus: "processed",
    refundedAt: new Date(refundAt.getTime() + 1_000),
    status: "refunded",
  })
  const malformedPurchases = [
    purchase({ ...exactProcessed, refundOriginStatus: "unknown" }),
    purchase({ ...exactProcessed, refundProviderStatus: "unknown" }),
  ]

  for (const malformedPurchase of malformedPurchases) {
    const active = {
      _id: "episode-refund-evidence-conflict",
      schemaVersion: 1,
      studentId: new mongoose.Types.ObjectId(studentId),
      courseId: new mongoose.Types.ObjectId(courseA),
      purchaseId: new mongoose.Types.ObjectId(purchaseA),
      isCurrent: true,
      status: "active",
      source: "purchase",
      grantedAt: now,
      reconciliationAttempts: 0,
      revision: 1,
      createdAt: now,
    }
    const repository = createMemoryRepository({
      initialEpisodes: [active],
      initialPurchases: [malformedPurchase],
    })

    await assert.rejects(
      createEntitlementService({
        repository,
        sidecarStartedAt,
      }).terminalizeProcessedRefund({
        allowCreateMissing: true,
        purchaseId: purchaseA,
      }),
      (error) => error.code === "REFUND_EVIDENCE_INVALID"
    )
    assert.equal(repository.transitions.length, 0)
    assert.equal(repository.episodes[0].status, "active")
  }
})

test("processed refund terminalizes only the exact Purchase episode and preserves a newer Purchase", async () => {
  const refundAt = new Date(now.getTime() + 60_000)
  const refundedPurchase = purchase({
    fulfilledAt: now,
    refundEntitlementsRevokedAt: refundAt,
    refundOriginStatus: "refund_requested",
    refundProcessedAt: refundAt,
    refundProviderStatus: "processed",
    refundedAt: new Date(refundAt.getTime() + 1_000),
    status: "refunded",
  })
  const oldEpisode = {
    _id: "episode-a",
    schemaVersion: 1,
    studentId,
    courseId: courseA,
    purchaseId: purchaseA,
    isCurrent: true,
    status: "active",
    source: "purchase",
    grantedAt: now,
    reconciliationAttempts: 0,
    revision: 1,
  }
  const repository = createMemoryRepository({
    initialEpisodes: [oldEpisode],
    initialPurchases: [refundedPurchase],
  })
  const service = createEntitlementService({ repository, sidecarStartedAt })
  const result = await service.terminalizeProcessedRefund({
    allowCreateMissing: true,
    purchaseId: purchaseA,
  })
  assert.equal(result.outcome, "terminalized")
  assert.equal(repository.episodes[0].status, "revoked")
  assert.equal(repository.episodes[0].isCurrent, false)
  assert.equal(repository.episodes[0].revocationReason, "refund_completed")

  repository.episodes.push({
    ...oldEpisode,
    _id: "episode-b",
    purchaseId: purchaseB,
    grantedAt: new Date(refundAt.getTime() + 2_000),
    revision: 1,
  })
  const replay = await service.terminalizeProcessedRefund({
    allowCreateMissing: false,
    purchaseId: purchaseA,
  })
  assert.equal(replay.outcome, "terminalized")
  assert.equal(repository.episodes[1].status, "active")
  assert.equal(repository.episodes[1].purchaseId, purchaseB)
})

test("boundary-qualified processed refund may create a deterministic terminal audit episode", async () => {
  const refundAt = new Date(now.getTime() + 60_000)
  const processed = purchase({
    refundEntitlementsRevokedAt: refundAt,
    refundOriginStatus: "payment_review",
    refundProcessedAt: refundAt,
    refundProviderStatus: "processed",
    status: "refund_pending",
  })
  const repository = createMemoryRepository({ initialPurchases: [processed] })
  const service = createEntitlementService({ repository, sidecarStartedAt })

  const skipped = await service.terminalizeProcessedRefund({
    allowCreateMissing: false,
    purchaseId: purchaseA,
  })
  assert.equal(skipped.missingCount, 1)
  assert.equal(repository.episodes.length, 0)

  const created = await service.terminalizeProcessedRefund({
    allowCreateMissing: true,
    purchaseId: purchaseA,
  })
  assert.equal(created.missingCount, 0)
  assert.equal(repository.episodes[0].status, "cancelled")
  assert.equal(
    repository.episodes[0].cancellationReason,
    "refund_completed_before_activation"
  )
  assert.equal(repository.episodes[0].replacementDecision, "none")

  const uncaptured = { ...processed, razorpayPaymentId: "" }
  await assert.rejects(
    createEntitlementService({
      repository: createMemoryRepository({ initialPurchases: [uncaptured] }),
      sidecarStartedAt,
    }).terminalizeProcessedRefund({
      allowCreateMissing: true,
      purchaseId: purchaseA,
    }),
    (error) => error.code === "PURCHASE_CAPTURE_EVIDENCE_INVALID"
  )
})

test("processed refund leaves an existing pre-boundary episode untouched", async () => {
  const refundAt = new Date(now.getTime() + 60_000)
  const historicalPurchase = purchase({
    createdAt: new Date(sidecarStartedAt.getTime() - 30_000),
    paidAt: new Date(sidecarStartedAt.getTime() - 1),
    refundEntitlementsRevokedAt: refundAt,
    refundOriginStatus: "payment_review",
    refundProcessedAt: refundAt,
    refundProviderStatus: "processed",
    status: "refund_pending",
  })
  const historicalEpisode = {
    _id: "episode-pre-boundary-refund",
    schemaVersion: 1,
    studentId: new mongoose.Types.ObjectId(studentId),
    courseId: new mongoose.Types.ObjectId(courseA),
    purchaseId: new mongoose.Types.ObjectId(purchaseA),
    isCurrent: true,
    status: "provisioning",
    source: "purchase",
    reconciliationAttempts: 0,
    nextReconciliationAt: new Date(now.getTime() + 60_000),
    revision: 0,
    createdAt: new Date(sidecarStartedAt.getTime() - 10_000),
  }
  const repository = createMemoryRepository({
    initialEpisodes: [historicalEpisode],
    initialPurchases: [historicalPurchase],
  })

  await assert.rejects(
    createEntitlementService({
      repository,
      sidecarStartedAt,
    }).terminalizeProcessedRefund({
      allowCreateMissing: true,
      purchaseId: purchaseA,
    }),
    (error) => error.code === "PURCHASE_BEFORE_SIDECAR_BOUNDARY"
  )
  assert.equal(repository.transitions.length, 0)
  assert.deepEqual(repository.episodes, [historicalEpisode])
})

test("a boundary learner-refund terminal episode never invents a replacement decision", async () => {
  const refundAt = new Date(now.getTime() + 60_000)
  const processed = purchase({
    fulfilledAt: now,
    refundEntitlementsRevokedAt: refundAt,
    refundOriginStatus: "refund_requested",
    refundProcessedAt: refundAt,
    refundProviderStatus: "processed",
    refundedAt: new Date(refundAt.getTime() + 1_000),
    status: "refunded",
  })
  const repository = createMemoryRepository({ initialPurchases: [processed] })

  const result = await createEntitlementService({
    repository,
    sidecarStartedAt,
  }).terminalizeProcessedRefund({
    allowCreateMissing: true,
    purchaseId: purchaseA,
  })

  assert.equal(result.outcome, "terminalized")
  assert.equal(repository.episodes[0].status, "revoked")
  assert.equal(repository.episodes[0].replacementDecision, undefined)
  assert.equal(repository.episodes[0].replacementOutcome, undefined)
})

test("a later processed refund accepts an exact account-deletion terminal reason", async () => {
  const refundAt = new Date(now.getTime() + 60_000)
  const processed = purchase({
    fulfilledAt: now,
    refundEntitlementsRevokedAt: refundAt,
    refundOriginStatus: "refund_requested",
    refundProcessedAt: refundAt,
    refundProviderStatus: "processed",
    refundedAt: new Date(refundAt.getTime() + 1_000),
    status: "refunded",
  })
  const deletedEpisode = {
    _id: "episode-deleted-before-refund-sidecar",
    schemaVersion: 1,
    studentId,
    courseId: courseA,
    purchaseId: purchaseA,
    isCurrent: false,
    status: "revoked",
    source: "purchase",
    grantedAt: now,
    revokedAt: new Date(now.getTime() + 30_000),
    revocationReason: "account_deleted",
    reconciliationAttempts: 0,
    revision: 2,
    createdAt: now,
  }
  const repository = createMemoryRepository({
    initialEpisodes: [deletedEpisode],
    initialPurchases: [processed],
    userOverrides: {
      active: false,
      approved: false,
      authProviders: [],
      courseProgress: [],
      courses: [],
      deletionPending: false,
      deletionStartedAt: deletedEpisode.revokedAt,
      email: `deleted-${studentId}@users.invalid`,
      firstName: "Deleted",
      image: "",
      instructorApprovalStatus: "NotApplicable",
      lastName: "Account",
      updatedAt: new Date(deletedEpisode.revokedAt.getTime() + 1_000),
    },
  })

  const result = await createEntitlementService({
    repository,
    sidecarStartedAt,
  }).terminalizeProcessedRefund({ purchaseId: purchaseA })

  assert.equal(result.outcome, "terminalized")
  assert.equal(result.terminalizedCount, 0)
  assert.equal(repository.transitions.length, 0)
  assert.equal(repository.episodes[0].revocationReason, "account_deleted")
})

test("account deletion uses pending server evidence and terminalizes active and provisioning episodes", async () => {
  const deletionLockId = "deletion-lock-1"
  const active = {
    _id: "episode-active",
    schemaVersion: 1,
    studentId,
    courseId: courseA,
    purchaseId: purchaseA,
    isCurrent: true,
    status: "active",
    source: "purchase",
    grantedAt: new Date(now.getTime() - 1_000),
    createdAt: now,
    reconciliationAttempts: 0,
    revision: 1,
  }
  const provisioning = {
    _id: "episode-provisioning",
    schemaVersion: 1,
    studentId,
    courseId: courseB,
    purchaseId: purchaseB,
    isCurrent: true,
    status: "provisioning",
    source: "purchase",
    reconciliationAttempts: 0,
    nextReconciliationAt: new Date(now.getTime() + 60_000),
    createdAt: now,
    revision: 0,
  }
  const fulfilledA = purchase({
    fulfilledAt: new Date(now.getTime() - 1_000),
    status: "fulfilled",
  })
  const fulfilledB = purchase({
    _id: new mongoose.Types.ObjectId(purchaseB),
    courses: [new mongoose.Types.ObjectId(courseB)],
    fulfilledAt: new Date(now.getTime() - 1_000),
    lineItems: [
      {
        amount: 12000,
        course: new mongoose.Types.ObjectId(courseB),
        courseName: "Course B",
      },
    ],
    status: "fulfilled",
  })
  const repository = createMemoryRepository({
    initialEpisodes: [active, provisioning],
    initialPurchases: [fulfilledA, fulfilledB],
    userOverrides: {
      deletionLockId,
      deletionLockUntil: new Date(now.getTime() + 5 * 60_000),
      deletionPending: true,
      deletionStartedAt: new Date(now.getTime() - 500),
    },
  })
  const result = await createEntitlementService({
    clock: () => now,
    repository,
    sidecarStartedAt,
  }).terminalizeAccountDeletion({ deletionLockId, studentId })

  assert.equal(result.terminalizedCount, 2)
  assert.deepEqual(repository.episodes.map(({ status }) => status).sort(), [
    "cancelled",
    "revoked",
  ])
  assert.equal(
    repository.episodes.every(({ isCurrent }) => !isCurrent),
    true
  )
  assert.equal(
    repository.episodes
      .find(({ status }) => status === "revoked")
      .revokedAt.getTime(),
    now.getTime() - 500
  )
})

test("account deletion skips malformed provenance and still terminalizes later exact episodes", async () => {
  const missingPurchaseId = new mongoose.Types.ObjectId(
    "64b000000000000000000006"
  )
  const exactPurchase = purchase({
    _id: new mongoose.Types.ObjectId(purchaseB),
    courses: [new mongoose.Types.ObjectId(courseB)],
    fulfilledAt: new Date(now.getTime() - 1_000),
    lineItems: [
      {
        amount: 12000,
        course: new mongoose.Types.ObjectId(courseB),
        courseName: "Course B",
      },
    ],
    status: "fulfilled",
  })
  const repository = createMemoryRepository({
    initialEpisodes: [
      {
        _id: "episode-a-poison",
        schemaVersion: 1,
        studentId,
        courseId: courseA,
        purchaseId: missingPurchaseId,
        isCurrent: true,
        status: "active",
        source: "purchase",
        grantedAt: new Date(now.getTime() - 2_000),
        createdAt: now,
        reconciliationAttempts: 0,
        revision: 1,
      },
      {
        _id: "episode-b-exact",
        schemaVersion: 1,
        studentId,
        courseId: courseB,
        purchaseId: purchaseB,
        isCurrent: true,
        status: "active",
        source: "purchase",
        grantedAt: exactPurchase.fulfilledAt,
        createdAt: now,
        reconciliationAttempts: 0,
        revision: 1,
      },
    ],
    initialPurchases: [exactPurchase],
    userOverrides: {
      active: false,
      approved: false,
      authProviders: [],
      courseProgress: [],
      courses: [],
      deletionPending: false,
      deletionStartedAt: now,
      email: `deleted-${studentId}@users.invalid`,
      firstName: "Deleted",
      image: "",
      instructorApprovalStatus: "NotApplicable",
      lastName: "Account",
      updatedAt: new Date(now.getTime() + 30_000),
    },
  })
  const result = await createEntitlementService({
    repository,
    sidecarStartedAt,
  }).terminalizeAccountDeletion({ studentId })

  assert.deepEqual(result, {
    failedCount: 1,
    hasMore: false,
    outcome: "partial",
    terminalizedCount: 1,
  })
  assert.equal(repository.episodes[0].status, "active")
  assert.equal(repository.episodes[0].isCurrent, true)
  assert.equal(repository.episodes[1].status, "revoked")
  assert.equal(repository.episodes[1].isCurrent, false)
  assert.equal(repository.episodes[1].revokedAt.getTime(), now.getTime())
})

test("account deletion accepts only the exact persisted completed-deletion tombstone", async () => {
  const terminalAt = new Date(now.getTime() + 30_000)
  const episode = {
    _id: "episode-deleted",
    schemaVersion: 1,
    studentId,
    courseId: courseA,
    purchaseId: purchaseA,
    isCurrent: true,
    status: "active",
    source: "purchase",
    grantedAt: now,
    reconciliationAttempts: 0,
    revision: 1,
    createdAt: now,
  }
  const repository = createMemoryRepository({
    initialEpisodes: [episode],
    initialPurchases: [purchase({ fulfilledAt: now, status: "fulfilled" })],
    userOverrides: {
      active: false,
      approved: false,
      authProviders: [],
      courseProgress: [],
      courses: [],
      deletionPending: false,
      deletionStartedAt: now,
      email: `deleted-${studentId}@users.invalid`,
      firstName: "Deleted",
      image: "",
      instructorApprovalStatus: "NotApplicable",
      lastName: "Account",
      updatedAt: terminalAt,
    },
  })
  const result = await createEntitlementService({
    repository,
    sidecarStartedAt,
  }).terminalizeAccountDeletion({ studentId })

  assert.equal(result.terminalizedCount, 1)
  assert.equal(repository.episodes[0].status, "revoked")
  assert.equal(repository.episodes[0].revokedAt.getTime(), now.getTime())
})

test("boundary catch-up creates a missing terminal episode only from an exact deletion tombstone", async () => {
  const terminalAt = new Date(now.getTime() + 30_000)
  const fulfilled = purchase({ fulfilledAt: now, status: "fulfilled" })
  const repository = createMemoryRepository({
    initialPurchases: [fulfilled],
    userOverrides: {
      active: false,
      approved: false,
      authProviders: [],
      courseProgress: [],
      courses: [],
      deletionPending: false,
      deletionStartedAt: now,
      email: `deleted-${studentId}@users.invalid`,
      firstName: "Deleted",
      image: "",
      instructorApprovalStatus: "NotApplicable",
      lastName: "Account",
      updatedAt: terminalAt,
    },
  })

  const report = await createEntitlementService({
    repository,
    sidecarStartedAt,
  }).catchUpBoundaryPurchases({ limit: 1 })

  assert.equal(report.failedCount, 0)
  assert.equal(report.terminalizedCount, 1)
  assert.equal(repository.episodes.length, 1)
  assert.equal(repository.episodes[0].status, "revoked")
  assert.equal(repository.episodes[0].revocationReason, "account_deleted")
  assert.equal(repository.episodes[0].revokedAt.getTime(), now.getTime())
})

test("catch-up requires the immutable paidAt boundary and returns bounded cursor counts", async () => {
  const oldPurchase = purchase({
    _id: new mongoose.Types.ObjectId("64a000000000000000000001"),
    paidAt: new Date(now.getTime() - 1),
  })
  const newPurchase = purchase({
    _id: new mongoose.Types.ObjectId("64c000000000000000000001"),
    createdAt: now,
    paidAt: now,
  })
  const preBoundaryInFlightPurchase = purchase({
    _id: new mongoose.Types.ObjectId("64b000000000000000000099"),
    createdAt: new Date(now.getTime() - 1),
    paidAt: now,
  })
  const repository = createMemoryRepository({
    initialPurchases: [oldPurchase, preBoundaryInFlightPurchase, newPurchase],
  })
  const unconfiguredService = createEntitlementService({
    clock: () => now,
    repository,
  })

  await assert.rejects(
    unconfiguredService.catchUpBoundaryPurchases({}),
    (error) => error.code === "SIDECAR_BOUNDARY_REQUIRED"
  )
  const service = createEntitlementService({
    clock: () => now,
    repository,
    sidecarStartedAt: now,
  })
  const report = await service.catchUpBoundaryPurchases({
    limit: 1,
  })
  assert.equal(report.examinedCount, 1)
  assert.equal(report.reservedCount, 1)
  assert.equal(report.failedCount, 0)
  assert.equal(report.nextCursor, newPurchase._id.toString())
  assert.equal(
    repository.episodes.some(
      (episode) => episode.purchaseId.toString() === oldPurchase._id.toString()
    ),
    false
  )
  assert.equal(
    repository.episodes.some(
      (episode) =>
        episode.purchaseId.toString() ===
        preBoundaryInFlightPurchase._id.toString()
    ),
    false
  )
})

test("non-authoritative wrapper catches every failure and logs no domain identifiers", async () => {
  const captured = createCapturingLogger()
  const ticks = [1_000, 1_025]
  const service = createEntitlementService({
    clock: () => ticks.shift(),
    repository: createMemoryRepository(),
    targetLogger: captured.logger,
  })
  let observedDeadline
  const result = await service.runNonAuthoritativeSidecar({
    flow: "purchase_reservation",
    operation: async ({ deadlineAt }) => {
      observedDeadline = deadlineAt
      const error = new Error(
        `purchase ${purchaseA} student ${studentId} entitlement-secret`
      )
      error.code = "SIMULATED_FAILURE"
      throw error
    },
    requestId: "request-safe-1",
  })

  assert.deepEqual(result, { ok: false })
  assert.equal(observedDeadline.getTime(), 6_000)
  assert.equal(captured.records.length, 1)
  assert.equal(captured.records[0].event, "entitlement.sidecar.failed")
  assert.equal(captured.records[0].fields.durationMs, 25)
  const serialized = JSON.stringify(captured.records[0])
  for (const secret of [purchaseA, studentId, "entitlement-secret"]) {
    assert.equal(serialized.includes(secret), false)
  }
})

test("catch-up advances a protected cursor when its deadline expires mid-page", async () => {
  const repository = createMemoryRepository()
  repository.findBoundaryPurchaseCandidates = async () => ({
    candidates: [
      {
        financialEvidenceMalformed: true,
        purchase: purchase(),
      },
      {
        financialEvidenceMalformed: true,
        purchase: purchase({ _id: new mongoose.Types.ObjectId(purchaseB) }),
      },
    ],
    hasMore: true,
    nextCursor: new mongoose.Types.ObjectId(purchaseB),
    scannedCount: 2,
  })
  let current = new Date(now)
  let failedItems = 0
  const deadlineAt = new Date(now.getTime() + 1_000)
  const service = createEntitlementService({
    clock: () => current,
    repository,
    sidecarStartedAt,
    targetLogger: {
      error() {},
      info() {},
      warn(event) {
        if (event === "entitlement.sidecar.catch_up_item_failed") {
          failedItems += 1
          if (failedItems === 1) current = new Date(deadlineAt)
        }
      },
    },
  })

  const report = await service.catchUpBoundaryPurchases({
    deadlineAt,
    limit: 2,
  })

  assert.equal(report.hasMore, true)
  assert.equal(report.examinedCount, 2)
  assert.equal(report.failedCount, 2)
  assert.equal(report.nextCursor, purchaseB)
})

test("non-authoritative wrapper hard-bounds a stalled operation at an outer deadline", async () => {
  const captured = createCapturingLogger()
  const service = createEntitlementService({
    repository: createMemoryRepository(),
    targetLogger: captured.logger,
  })
  let operationStarted = false
  const startedAt = Date.now()

  const result = await service.runNonAuthoritativeSidecar({
    deadlineAt: new Date(startedAt + 50),
    flow: "purchase_activation",
    operation: async ({ signal }) => {
      operationStarted = true
      return new Promise((resolve, reject) => {
        signal.addEventListener("abort", () => reject(signal.reason), {
          once: true,
        })
      })
    },
    requestId: "request-hard-deadline",
  })
  const elapsedMilliseconds = Date.now() - startedAt
  assert.deepEqual(result, { ok: false })
  assert.equal(operationStarted, true)
  assert.ok(elapsedMilliseconds < 1_000)
  assert.equal(captured.records.length, 1)
  assert.equal(captured.records[0].event, "entitlement.sidecar.failed")
  assert.equal(
    captured.records[0].fields.reasonCode,
    "SIDECAR_BUDGET_EXHAUSTED"
  )
})

test("a shared deadline can expire between sidecar repository operations", async () => {
  const captured = createCapturingLogger()
  const repository = createMemoryRepository()
  const loadReservationEvidence = repository.loadReservationEvidence
  let clockNow = 1_000
  let purchaseEpisodesRead = false
  repository.loadReservationEvidence = async (options) => {
    const evidence = await loadReservationEvidence(options)
    clockNow = 6_000
    return evidence
  }
  repository.findPurchaseEpisodes = async () => {
    purchaseEpisodesRead = true
    return []
  }
  const service = createEntitlementService({
    clock: () => clockNow,
    repository,
    sidecarStartedAt,
    targetLogger: captured.logger,
  })

  const result = await service.runNonAuthoritativeSidecar({
    deadlineAt: new Date(6_000),
    flow: "purchase_reservation",
    operation: ({ deadlineAt }) =>
      service.reserveForPurchase({ deadlineAt, now, purchase: purchase() }),
    requestId: "request-mid-flow-deadline",
  })

  assert.deepEqual(result, { ok: false })
  assert.equal(purchaseEpisodesRead, false)
  assert.equal(captured.records.length, 1)
  assert.equal(
    captured.records[0].fields.reasonCode,
    "SIDECAR_BUDGET_EXHAUSTED"
  )
})

test("deadline checks fail closed before starting another repository operation", async () => {
  let repositoryRead = false
  const repository = createMemoryRepository()
  repository.loadReservationEvidence = async () => {
    repositoryRead = true
    throw new Error("must not run")
  }
  await assert.rejects(
    createEntitlementService({
      clock: () => 6_000,
      repository,
      sidecarStartedAt,
    }).reserveForPurchase({
      deadlineAt: new Date(5_000),
      purchase: purchase(),
    }),
    (error) => error.code === "SIDECAR_BUDGET_EXHAUSTED"
  )
  assert.equal(repositoryRead, false)
})
