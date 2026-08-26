const { AsyncLocalStorage } = require("node:async_hooks")

const mongoose = require("mongoose")

const Course = require("../../models/Course")
const CourseProgress = require("../../models/CourseProgress")
const Entitlement = require("../../models/Entitlement")
const Purchase = require("../../models/Purchase")
const User = require("../../models/User")
const {
  assertEntitlementMutation,
  assertEntitlementState,
} = require("./entitlementPolicy")
const {
  MAX_PURCHASE_COURSES,
  analyzePurchaseCourseEvidence,
  purchaseFinancialState,
  purchaseHasVerifiedCapture,
  purchaseIsInSidecarCohort,
} = require("./entitlementPurchaseEvidence")

const INTERNAL_ENTITLEMENT_PROJECTION = [
  "_id",
  "schemaVersion",
  "studentId",
  "courseId",
  "purchaseId",
  "isCurrent",
  "status",
  "source",
  "grantedAt",
  "revokedAt",
  "revocationReason",
  "cancelledAt",
  "cancellationReason",
  "+replacementPurchaseId",
  "+replacementDecision",
  "+replacementOutcome",
  "+replacementAbandonReason",
  "+reconciliationAttempts",
  "+nextReconciliationAt",
  "+reconciliationLeaseId",
  "+reconciliationLeaseUntil",
  "+manualReviewRequiredAt",
  "+lastReconciliationCode",
  "+supersededByEntitlementId",
  "+lastManualOperationId",
  "+migrationRunId",
  "revision",
  "createdAt",
  "updatedAt",
].join(" ")
const INTERNAL_ENTITLEMENT_AGGREGATION_PROJECTION = Object.freeze(
  Object.fromEntries(
    INTERNAL_ENTITLEMENT_PROJECTION.split(" ").map((field) => [
      field.replace(/^\+/, ""),
      1,
    ])
  )
)

const PURCHASE_EVIDENCE_PROJECTION = [
  "_id",
  "user",
  "courses",
  "lineItems",
  "status",
  "paidAt",
  "fulfilledAt",
  "refundOriginStatus",
  "refundProviderStatus",
  "refundProcessedAt",
  "refundEntitlementsRevokedAt",
  "refundedAt",
  "razorpayPaymentId",
  "createdAt",
].join(" ")

const MUTABLE_FIELDS = Object.freeze([
  "status",
  "isCurrent",
  "grantedAt",
  "revokedAt",
  "revocationReason",
  "cancelledAt",
  "cancellationReason",
  "replacementPurchaseId",
  "replacementDecision",
  "replacementOutcome",
  "replacementAbandonReason",
  "reconciliationAttempts",
  "nextReconciliationAt",
  "reconciliationLeaseId",
  "reconciliationLeaseUntil",
  "manualReviewRequiredAt",
  "lastReconciliationCode",
  "supersededByEntitlementId",
  "lastManualOperationId",
])

const CATCH_UP_QUERY_COMMENT = "studynotion.entitlement-stage2-catch-up.v1"
const STATUS_QUERY_COMMENT = "studynotion.entitlement-stage2-status.v1"
const SIDECAR_QUERY_COMMENT = "studynotion.entitlement-stage2-sidecar.v1"
const DEFAULT_OPERATIONAL_STATUS_LIMIT = 100
const MAX_OPERATIONAL_STATUS_LIMIT = 1_000
const OPERATIONAL_QUERY_MAX_TIME_MS = 2_000
const OPERATIONAL_STATUS_BUDGET_MS = 30_000
const OPERATIONAL_STATUS_PAGE_SIZE = 100
const PURCHASE_BOUNDARY_INDEX_HINT = "_id_"
const operationContext = new AsyncLocalStorage()

const currentOperationSignal = () => operationContext.getStore()?.signal
const runWithEntitlementOperationSignal = (signal, operation) => {
  if (!(signal instanceof AbortSignal)) {
    throw new TypeError("signal must be an AbortSignal")
  }
  if (typeof operation !== "function") {
    throw new TypeError("operation must be a function")
  }
  return operationContext.run({ signal }, operation)
}

const hasOwn = (value, field) =>
  Object.prototype.hasOwnProperty.call(value, field)

const comparable = (value) => {
  if (value instanceof Date) return `date:${value.getTime()}`
  if (mongoose.isObjectIdOrHexString(value)) {
    return `reference:${value.toString()}`
  }
  if (value && typeof value === "object" && value.toString) {
    return `reference:${value.toString()}`
  }
  return value
}

const valuesEqual = (left, right) => comparable(left) === comparable(right)
const validDate = (value) =>
  value instanceof Date && Number.isFinite(value.getTime())
const purchaseBoundaryEvidenceValid = (purchase, startedAt) => {
  return Boolean(
    analyzePurchaseCourseEvidence(purchase).ok &&
    purchaseHasVerifiedCapture(purchase) &&
    purchaseIsInSidecarCohort(purchase, startedAt)
  )
}

const policyValidEpisode = (episode) => {
  try {
    assertEntitlementState(episode)
    return true
  } catch {
    return false
  }
}

const exactEpisodeIdentity = (episode, purchase, courseId) =>
  policyValidEpisode(episode) &&
  episode.source === "purchase" &&
  valuesEqual(episode.purchaseId, purchase._id) &&
  valuesEqual(episode.studentId, purchase.user) &&
  valuesEqual(episode.courseId, courseId)

const exactRefundTerminal = (episode, purchase) => {
  if (!policyValidEpisode(episode)) return false
  if (purchase.refundOriginStatus === "payment_review") {
    return Boolean(
      episode.status === "cancelled" &&
      episode.cancellationReason === "refund_completed_before_activation" &&
      validDate(episode.cancelledAt) &&
      episode.cancelledAt.getTime() === purchase.refundProcessedAt.getTime() &&
      episode.replacementDecision === "none" &&
      episode.replacementOutcome === "not_required"
    )
  }
  return Boolean(
    (episode.status === "revoked" &&
      episode.revocationReason === "refund_completed" &&
      validDate(episode.grantedAt) &&
      episode.grantedAt.getTime() === purchase.fulfilledAt.getTime() &&
      validDate(episode.revokedAt) &&
      episode.revokedAt.getTime() ===
        purchase.refundEntitlementsRevokedAt.getTime()) ||
    (episode.status === "cancelled" &&
      episode.cancellationReason === "refund_completed_before_activation" &&
      validDate(episode.cancelledAt) &&
      episode.cancelledAt.getTime() === purchase.refundProcessedAt.getTime())
  )
}

const exactAccountDeletionTerminal = (episode, purchase, terminalAt) =>
  policyValidEpisode(episode) &&
  validDate(terminalAt) &&
  ((episode.status === "revoked" &&
    episode.revocationReason === "account_deleted" &&
    validDate(episode.grantedAt) &&
    validDate(purchase.fulfilledAt) &&
    episode.grantedAt.getTime() === purchase.fulfilledAt.getTime() &&
    validDate(episode.revokedAt) &&
    episode.revokedAt.getTime() === terminalAt.getTime()) ||
    (episode.status === "cancelled" &&
      episode.cancellationReason === "account_deleted_before_activation" &&
      validDate(episode.cancelledAt) &&
      episode.cancelledAt.getTime() === terminalAt.getTime()))

const exactCompletedDeletionUser = (user) =>
  Boolean(
    user &&
    user.accountType === "Student" &&
    user.active === false &&
    user.approved === false &&
    user.deletionPending === false &&
    validDate(user.deletionStartedAt) &&
    !hasOwn(user, "deletionLockId") &&
    !hasOwn(user, "deletionLockUntil") &&
    Array.isArray(user.authProviders) &&
    user.authProviders.length === 0 &&
    Array.isArray(user.courses) &&
    user.courses.length === 0 &&
    Array.isArray(user.courseProgress) &&
    user.courseProgress.length === 0 &&
    user.firstName === "Deleted" &&
    user.lastName === "Account" &&
    user.image === "" &&
    user.instructorApprovalStatus === "NotApplicable" &&
    user.email === `deleted-${user._id.toString()}@users.invalid` &&
    validDate(user.updatedAt) &&
    user.updatedAt >= user.deletionStartedAt
  )

const classifyBoundaryPurchaseDocument = (document, startedAt) => {
  const {
    _entitlementAccountDeleted: accountDeleted = false,
    _entitlementDeletionTerminalAt: deletionTerminalAt,
    entitlementEpisodes: episodes = [],
    ...purchase
  } = document
  if (!validDate(purchase.createdAt)) {
    return {
      accountDeleted,
      episodes,
      financialEvidenceMalformed: true,
      purchase,
    }
  }
  if (purchase.createdAt < startedAt) return null

  const financialState = purchaseFinancialState(purchase)
  if (financialState === "ignored") {
    if (!analyzePurchaseCourseEvidence(purchase).ok) {
      return {
        accountDeleted,
        episodes,
        financialEvidenceMalformed: true,
        purchase,
      }
    }
    return episodes.length
      ? {
          accountDeleted,
          episodes,
          financialEvidenceMalformed: false,
          purchase,
        }
      : null
  }
  if (
    financialState === "malformed" ||
    !purchaseBoundaryEvidenceValid(purchase, startedAt)
  ) {
    return {
      accountDeleted,
      episodes,
      financialEvidenceMalformed: true,
      purchase,
    }
  }

  const courseIds = analyzePurchaseCourseEvidence(purchase).courseIds
  const exactByCourse = new Map()
  let identityConflict = episodes.length > courseIds.length
  for (const episode of episodes) {
    const courseId = courseIds.find((id) => valuesEqual(id, episode.courseId))
    if (
      !courseId ||
      !exactEpisodeIdentity(episode, purchase, courseId) ||
      exactByCourse.has(courseId)
    ) {
      identityConflict = true
      continue
    }
    exactByCourse.set(courseId, episode)
  }

  const resolved =
    !identityConflict &&
    courseIds.every((courseId) => {
      const episode = exactByCourse.get(courseId)
      if (accountDeleted) {
        return Boolean(
          ["activation", "processed_refund"].includes(financialState) &&
          episode &&
          (exactAccountDeletionTerminal(
            episode,
            purchase,
            deletionTerminalAt
          ) ||
            (financialState === "processed_refund" &&
              exactRefundTerminal(episode, purchase)))
        )
      }
      if (["held_capture", "held_refund"].includes(financialState)) {
        return (
          !episode ||
          (episode.status === "provisioning" && episode.isCurrent === true)
        )
      }
      if (!episode) return false
      if (financialState === "paid") {
        return episode.status === "provisioning" && episode.isCurrent === true
      }
      if (financialState === "activation") {
        return Boolean(
          (episode.status === "provisioning" && episode.isCurrent === true) ||
          (episode.status === "active" &&
            episode.isCurrent === true &&
            validDate(episode.grantedAt) &&
            episode.grantedAt.getTime() === purchase.fulfilledAt.getTime())
        )
      }
      return exactRefundTerminal(episode, purchase)
    })

  return resolved
    ? null
    : { accountDeleted, episodes, financialEvidenceMalformed: false, purchase }
}

const summarizeBoundaryCandidates = (candidates) => {
  const counts = {
    boundaryLifecycleMismatchCount: 0,
    boundaryMissingEpisodeCount: 0,
    completedDeletionCurrentCount: 0,
  }
  for (const {
    accountDeleted,
    episodes,
    financialEvidenceMalformed,
    purchase,
  } of candidates) {
    if (financialEvidenceMalformed) {
      counts.boundaryLifecycleMismatchCount += 1
      continue
    }
    if (
      accountDeleted &&
      episodes.some(
        (episode) =>
          episode.isCurrent === true &&
          ["active", "provisioning"].includes(episode.status)
      )
    ) {
      counts.completedDeletionCurrentCount += 1
    }
    let foundMissing = false
    for (const courseId of purchase.courses || []) {
      const matching = episodes.filter(
        (episode) =>
          valuesEqual(episode.courseId, courseId) &&
          valuesEqual(episode.purchaseId, purchase._id) &&
          valuesEqual(episode.studentId, purchase.user) &&
          episode.source === "purchase"
      )
      if (matching.length === 0) {
        counts.boundaryMissingEpisodeCount += 1
        foundMissing = true
      }
    }
    if (!foundMissing) counts.boundaryLifecycleMismatchCount += 1
  }
  return counts
}

const internalLean = (query) => {
  const guarded = configureOperationalQuery(query, SIDECAR_QUERY_COMMENT)
  const selected = guarded.select(INTERNAL_ENTITLEMENT_PROJECTION)
  return typeof selected.lean === "function" ? selected.lean() : selected
}

const plainInternalDocument = (document) => {
  if (!document) return document
  if (typeof document.toObject === "function") {
    return document.toObject({
      getters: false,
      transform: false,
      virtuals: false,
    })
  }
  return { ...document }
}

const selectedLean = (query, projection) => {
  const guarded = configureOperationalQuery(query, SIDECAR_QUERY_COMMENT)
  const selected = guarded.select(projection)
  return typeof selected.lean === "function" ? selected.lean() : selected
}

const configureOperationalQuery = (query, comment) => {
  let configured = query
  const signal = currentOperationSignal()
  if (typeof configured.setOptions === "function") {
    configured = configured.setOptions({
      ...(signal ? { signal } : {}),
      timeoutMS: OPERATIONAL_QUERY_MAX_TIME_MS,
    })
  }
  if (typeof configured.comment === "function") {
    configured = configured.comment(comment)
  }
  if (typeof configured.maxTimeMS === "function") {
    configured = configured.maxTimeMS(OPERATIONAL_QUERY_MAX_TIME_MS)
  }
  return configured
}

const boundedDocuments = async (query, limit, comment) => {
  const documents = await selectedLean(
    configureOperationalQuery(query.limit(limit + 1), comment),
    "_id"
  )
  return {
    count: Math.min(documents.length, limit),
    documents: documents.slice(0, limit),
    truncated: documents.length > limit,
  }
}

const boundedLimit = (value, { fallback = 20, maximum = 100 } = {}) => {
  if (value === undefined) return fallback
  if (!Number.isSafeInteger(value) || value < 1 || value > maximum) {
    throw new TypeError(`limit must be an integer from 1 through ${maximum}`)
  }
  return value
}

const assertOperationalEpisodeShape = (episode) => {
  for (const field of ["_id", "studentId", "courseId", "purchaseId"]) {
    if (
      !mongoose.isObjectIdOrHexString(episode?.[field]) ||
      typeof episode[field] === "string"
    ) {
      throw new TypeError(`${field} must be a persisted ObjectId`)
    }
  }
  if (!validDate(episode.createdAt) || !validDate(episode.updatedAt)) {
    throw new TypeError("persisted Entitlement timestamps are invalid")
  }
  assertEntitlementState(episode)
  if (
    episode.status === "provisioning" &&
    episode.reconciliationAttempts === 5 &&
    episode.nextReconciliationAt !== undefined
  ) {
    throw new TypeError(
      "a fifth-attempt provisioning Entitlement cannot remain scheduled"
    )
  }
  if (
    episode.status === "provisioning" &&
    episode.reconciliationLeaseId !== undefined &&
    episode.reconciliationAttempts < 1
  ) {
    throw new TypeError(
      "a claimed provisioning Entitlement must consume a recovery attempt"
    )
  }
  return episode
}

const exactOptionalField = (filter, previous, field) => {
  filter[field] = hasOwn(previous, field) ? previous[field] : { $exists: false }
}

const transitionUpdate = (previous, next) => {
  const $set = {}
  const $unset = {}

  for (const field of MUTABLE_FIELDS) {
    const previousHasField = hasOwn(previous, field)
    const nextHasField = hasOwn(next, field)
    if (!nextHasField && previousHasField) {
      $unset[field] = ""
    } else if (
      nextHasField &&
      (!previousHasField || !valuesEqual(previous[field], next[field]))
    ) {
      $set[field] = next[field]
    }
  }

  const update = { $inc: { revision: 1 } }
  if (Object.keys($set).length) update.$set = $set
  if (Object.keys($unset).length) update.$unset = $unset
  return update
}

const createEntitlementRepository = ({
  CourseModel = Course,
  CourseProgressModel = CourseProgress,
  EntitlementModel = Entitlement,
  PurchaseModel = Purchase,
  UserModel = User,
} = {}) => {
  const findPurchaseEpisodes = ({ courseIds, purchaseId }) =>
    internalLean(
      EntitlementModel.find({
        purchaseId,
        ...(courseIds ? { courseId: { $in: courseIds } } : {}),
      }).sort({ courseId: 1, _id: 1 })
    )

  const findCurrentPairEpisodes = ({ courseIds, studentId }) =>
    internalLean(
      EntitlementModel.find({
        courseId: { $in: courseIds },
        isCurrent: true,
        studentId,
      }).sort({ courseId: 1, _id: 1 })
    )

  const readDatabaseTime = async () => {
    const database = EntitlementModel.db?.db
    if (!database || typeof database.command !== "function") {
      throw new TypeError("MongoDB server time is unavailable")
    }
    const result = await database.command(
      { hello: 1 },
      {
        ...(currentOperationSignal()
          ? { signal: currentOperationSignal() }
          : {}),
        timeoutMS: OPERATIONAL_QUERY_MAX_TIME_MS,
      }
    )
    if (!validDate(result?.localTime)) {
      throw new TypeError("MongoDB returned an invalid server time")
    }
    return new Date(result.localTime.getTime())
  }

  const transitionEpisode = async ({
    ageExpiredAt,
    ageValidAt,
    createdAtGt,
    createdAtGte,
    leaseExpiredAt,
    leaseValidAt,
    next,
    previous,
  }) => {
    assertEntitlementMutation(previous, next)

    const filter = {
      _id: previous._id,
      courseId: previous.courseId,
      ...(hasOwn(previous, "createdAt")
        ? { createdAt: previous.createdAt }
        : {}),
      isCurrent: previous.isCurrent,
      purchaseId: previous.purchaseId,
      revision: previous.revision,
      source: previous.source,
      status: previous.status,
      studentId: previous.studentId,
    }
    for (const field of [
      "reconciliationAttempts",
      "nextReconciliationAt",
      "reconciliationLeaseId",
      "reconciliationLeaseUntil",
      "manualReviewRequiredAt",
    ]) {
      exactOptionalField(filter, previous, field)
    }
    if (leaseValidAt !== undefined && leaseExpiredAt !== undefined) {
      throw new TypeError("a lease cannot be both valid and expired")
    }
    if (leaseValidAt !== undefined || leaseExpiredAt !== undefined) {
      if (
        !hasOwn(previous, "reconciliationLeaseId") ||
        !hasOwn(previous, "reconciliationLeaseUntil")
      ) {
        throw new TypeError("a lease fence requires a claimed Entitlement")
      }
      filter.$and = [
        { reconciliationLeaseUntil: previous.reconciliationLeaseUntil },
        {
          reconciliationLeaseUntil:
            leaseValidAt === undefined
              ? { $lte: leaseExpiredAt }
              : { $gt: leaseValidAt },
        },
      ]
      filter.$expr = {
        [leaseValidAt === undefined ? "$lte" : "$gt"]: [
          "$reconciliationLeaseUntil",
          "$$NOW",
        ],
      }
      delete filter.reconciliationLeaseUntil
    }
    if (createdAtGte !== undefined || createdAtGt !== undefined) {
      if (!hasOwn(previous, "createdAt")) {
        throw new TypeError("a recovery boundary requires createdAt")
      }
      filter.$and = [
        ...(filter.$and || []),
        { createdAt: previous.createdAt },
        ...(createdAtGte === undefined
          ? []
          : [{ createdAt: { $gte: createdAtGte } }]),
        ...(createdAtGt === undefined
          ? []
          : [{ createdAt: { $gt: createdAtGt } }]),
      ]
      delete filter.createdAt
    }
    if (ageExpiredAt !== undefined && ageValidAt !== undefined) {
      throw new TypeError("an episode cannot be both young and age-expired")
    }
    if (ageExpiredAt !== undefined || ageValidAt !== undefined) {
      const ageFence = ageExpiredAt ?? ageValidAt
      if (!validDate(ageFence) || !hasOwn(previous, "createdAt")) {
        throw new TypeError("an age fence requires persisted creation evidence")
      }
      const createdAtAlreadyFenced = (filter.$and || []).some(
        (clause) =>
          hasOwn(clause, "createdAt") &&
          valuesEqual(clause.createdAt, previous.createdAt)
      )
      filter.$and = [
        ...(filter.$and || []),
        ...(createdAtAlreadyFenced ? [] : [{ createdAt: previous.createdAt }]),
        {
          createdAt:
            ageExpiredAt === undefined
              ? { $gt: ageValidAt }
              : { $lte: ageExpiredAt },
        },
      ]
      delete filter.createdAt
      const serverAgeExpression = {
        [ageExpiredAt === undefined ? "$gt" : "$lte"]: [
          "$createdAt",
          { $dateSubtract: { amount: 24, startDate: "$$NOW", unit: "hour" } },
        ],
      }
      filter.$expr = filter.$expr
        ? { $and: [filter.$expr, serverAgeExpression] }
        : serverAgeExpression
    }

    return internalLean(
      EntitlementModel.findOneAndUpdate(
        filter,
        transitionUpdate(previous, next),
        { returnDocument: "after", runValidators: true }
      )
    )
  }

  const createBoundaryPurchaseAggregate = (
    { afterId, limit, startedAt },
    { forExplain = false } = {}
  ) => {
    const resolvedLimit = boundedLimit(limit)
    const boundaryObjectId = mongoose.Types.ObjectId.createFromTime(
      Math.floor(startedAt.getTime() / 1_000)
    )
    const castCursor = afterId
      ? PurchaseModel.schema.path("_id").cast(afterId)
      : undefined
    const pipeline = [
      {
        $match: {
          _id: {
            $gte: boundaryObjectId,
            ...(castCursor ? { $gt: castCursor } : {}),
          },
        },
      },
      { $sort: { _id: 1 } },
      // Page the raw, indexed Purchase stream before the Entitlement lookup.
      // This caps every invocation even when every row is already converged or
      // permanently failing. Exact lifecycle/boundary filters remain below so
      // ObjectId's one-second timestamp granularity can never admit history.
      { $limit: resolvedLimit + 1 },
      {
        $lookup: {
          as: "entitlementEpisodes",
          from: EntitlementModel.collection.name,
          let: { purchaseId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ["$purchaseId", "$$purchaseId"] },
              },
            },
            // Match and order align with the unique
            // { purchaseId, courseId } index, so the per-Purchase cap also
            // bounds foreign keys examined.
            { $sort: { courseId: 1 } },
            { $limit: MAX_PURCHASE_COURSES + 1 },
            { $project: INTERNAL_ENTITLEMENT_AGGREGATION_PROJECTION },
          ],
        },
      },
      {
        $lookup: {
          as: "entitlementUser",
          foreignField: "_id",
          from: UserModel.collection.name,
          localField: "user",
          pipeline: [
            {
              $project: {
                _id: 1,
                accountType: 1,
                active: 1,
                approved: 1,
                authProviders: 1,
                courseProgress: 1,
                courses: 1,
                deletionLockId: 1,
                deletionLockUntil: 1,
                deletionPending: 1,
                deletionStartedAt: 1,
                email: 1,
                firstName: 1,
                image: 1,
                instructorApprovalStatus: 1,
                lastName: 1,
                updatedAt: 1,
              },
            },
          ],
        },
      },
      {
        $set: {
          _entitlementDeletionUser: {
            $arrayElemAt: ["$entitlementUser", 0],
          },
          _entitlementDeletionTerminalAt: {
            $arrayElemAt: ["$entitlementUser.deletionStartedAt", 0],
          },
        },
      },
      {
        $set: {
          _entitlementAccountDeleted: {
            $and: [
              {
                $eq: [{ $type: "$_entitlementDeletionUser._id" }, "objectId"],
              },
              {
                $eq: ["$_entitlementDeletionUser.accountType", "Student"],
              },
              { $eq: ["$_entitlementDeletionUser.active", false] },
              { $eq: ["$_entitlementDeletionUser.approved", false] },
              { $eq: ["$_entitlementDeletionUser.deletionPending", false] },
              {
                $eq: [
                  { $type: "$_entitlementDeletionUser.deletionStartedAt" },
                  "date",
                ],
              },
              {
                $eq: [
                  { $type: "$_entitlementDeletionUser.deletionLockId" },
                  "missing",
                ],
              },
              {
                $eq: [
                  { $type: "$_entitlementDeletionUser.deletionLockUntil" },
                  "missing",
                ],
              },
              { $eq: ["$_entitlementDeletionUser.firstName", "Deleted"] },
              { $eq: ["$_entitlementDeletionUser.lastName", "Account"] },
              { $eq: ["$_entitlementDeletionUser.image", ""] },
              {
                $eq: [
                  "$_entitlementDeletionUser.instructorApprovalStatus",
                  "NotApplicable",
                ],
              },
              {
                $eq: [{ $type: "$_entitlementDeletionUser.updatedAt" }, "date"],
              },
              {
                $gte: [
                  "$_entitlementDeletionUser.updatedAt",
                  "$_entitlementDeletionUser.deletionStartedAt",
                ],
              },
              {
                $eq: [
                  {
                    $cond: [
                      {
                        $isArray: "$_entitlementDeletionUser.authProviders",
                      },
                      {
                        $size: "$_entitlementDeletionUser.authProviders",
                      },
                      -1,
                    ],
                  },
                  0,
                ],
              },
              {
                $eq: [
                  {
                    $cond: [
                      { $isArray: "$_entitlementDeletionUser.courses" },
                      { $size: "$_entitlementDeletionUser.courses" },
                      -1,
                    ],
                  },
                  0,
                ],
              },
              {
                $eq: [
                  {
                    $cond: [
                      {
                        $isArray: "$_entitlementDeletionUser.courseProgress",
                      },
                      {
                        $size: "$_entitlementDeletionUser.courseProgress",
                      },
                      -1,
                    ],
                  },
                  0,
                ],
              },
              {
                $eq: [
                  "$_entitlementDeletionUser.email",
                  {
                    $concat: [
                      "deleted-",
                      { $toString: "$_entitlementDeletionUser._id" },
                      "@users.invalid",
                    ],
                  },
                ],
              },
            ],
          },
        },
      },
      {
        $unset: ["_entitlementDeletionUser", "entitlementUser"],
      },
      {
        $project: {
          _id: 1,
          _entitlementAccountDeleted: 1,
          _entitlementDeletionTerminalAt: 1,
          courses: 1,
          createdAt: 1,
          entitlementEpisodes: 1,
          fulfilledAt: 1,
          lineItems: 1,
          paidAt: 1,
          razorpayPaymentId: 1,
          refundEntitlementsRevokedAt: 1,
          refundedAt: 1,
          refundOriginStatus: 1,
          refundProcessedAt: 1,
          refundProviderStatus: 1,
          status: 1,
          user: 1,
        },
      },
    ]
    const aggregate = PurchaseModel.aggregate(pipeline).option({
      comment: CATCH_UP_QUERY_COMMENT,
      hint: PURCHASE_BOUNDARY_INDEX_HINT,
      maxTimeMS: OPERATIONAL_QUERY_MAX_TIME_MS,
      ...(currentOperationSignal() ? { signal: currentOperationSignal() } : {}),
      ...(forExplain ? {} : { timeoutMS: OPERATIONAL_QUERY_MAX_TIME_MS }),
    })
    return { aggregate, resolvedLimit }
  }

  const findBoundaryPurchaseCandidates = async (options) => {
    const { aggregate, resolvedLimit } =
      createBoundaryPurchaseAggregate(options)
    const purchases = await aggregate
    const page = purchases.slice(0, resolvedLimit)
    const nextCursor = page.at(-1)?._id || null

    return {
      candidates: page
        .map((document) =>
          classifyBoundaryPurchaseDocument(document, options.startedAt)
        )
        .filter(Boolean),
      hasMore: purchases.length > resolvedLimit,
      nextCursor,
      scannedCount: page.length,
    }
  }

  const explainBoundaryPurchaseCandidates = (options) => {
    // The MongoDB driver rejects maxTimeMS and timeoutMS together on explain.
    // Keep the server-side bound for plan evidence; normal execution retains
    // both server and client operation bounds.
    const { aggregate } = createBoundaryPurchaseAggregate(options, {
      forExplain: true,
    })
    return aggregate.explain("executionStats")
  }

  const scanBoundaryPurchaseStatus = async ({ startedAt }) => {
    const counts = {
      boundaryLifecycleMismatchCount: 0,
      boundaryMissingEpisodeCount: 0,
      completedDeletionCurrentCount: 0,
    }
    let afterId
    let hasMore = false
    let scannedCount = 0
    const deadlineAt = Date.now() + OPERATIONAL_STATUS_BUDGET_MS
    do {
      if (Date.now() >= deadlineAt) {
        hasMore = true
        break
      }
      const page = await findBoundaryPurchaseCandidates({
        afterId,
        limit: 100,
        startedAt,
      })
      const pageCounts = summarizeBoundaryCandidates(page.candidates)
      for (const key of Object.keys(counts)) counts[key] += pageCounts[key]
      scannedCount += page.scannedCount
      hasMore = page.hasMore
      if (!hasMore || page.scannedCount === 0) break
      if (!page.nextCursor || valuesEqual(page.nextCursor, afterId)) {
        throw new TypeError("boundary status pagination did not advance")
      }
      afterId = page.nextCursor
    } while (hasMore)
    return { ...counts, hasMore, scannedCount }
  }

  const evaluateLifecycleStatusPage = async ({ episodes, startedAt }) => {
    const validPurchaseEpisodes = []
    let malformedEpisodeCount = 0
    for (const episode of episodes) {
      if (!validDate(episode.createdAt)) {
        malformedEpisodeCount += 1
        continue
      }
      // ObjectId timestamps have one-second precision. Exclude exact
      // pre-boundary rows after the coarse indexed scan without ever hiding
      // a post-boundary row whose persisted createdAt is malformed.
      if (episode.createdAt < startedAt) continue
      try {
        assertOperationalEpisodeShape(episode)
        if (episode.source !== "purchase") {
          malformedEpisodeCount += 1
        } else {
          validPurchaseEpisodes.push(episode)
        }
      } catch {
        malformedEpisodeCount += 1
      }
    }

    const studentIds = [
      ...new Set(
        validPurchaseEpisodes.map((episode) => episode.studentId.toString())
      ),
    ]
    const courseIds = [
      ...new Set(
        validPurchaseEpisodes.map((episode) => episode.courseId.toString())
      ),
    ]
    const purchaseIds = [
      ...new Set(
        validPurchaseEpisodes.map((episode) => episode.purchaseId.toString())
      ),
    ]
    const lifecyclePairs = [
      ...new Map(
        validPurchaseEpisodes.map((episode) => [
          `${episode.studentId.toString()}:${episode.courseId.toString()}`,
          { courseId: episode.courseId, studentId: episode.studentId },
        ])
      ).values(),
    ]
    const progressPairFilter = lifecyclePairs.map(
      ({ courseId, studentId }) => ({ courseID: courseId, userId: studentId })
    )
    const entitlementPairFilter = lifecyclePairs.map(
      ({ courseId, studentId }) => ({ courseId, studentId })
    )
    const [users, courses, progress, purchases, currentActive] =
      await Promise.all([
        studentIds.length
          ? selectedLean(
              configureOperationalQuery(
                UserModel.find({ _id: { $in: studentIds } }),
                STATUS_QUERY_COMMENT
              ),
              "_id accountType active approved authProviders courseProgress courses email firstName image instructorApprovalStatus lastName updatedAt +deletionPending +deletionStartedAt +deletionLockId +deletionLockUntil"
            )
          : [],
        courseIds.length
          ? selectedLean(
              configureOperationalQuery(
                CourseModel.find({ _id: { $in: courseIds } }),
                STATUS_QUERY_COMMENT
              ),
              "_id studentsEnroled"
            )
          : [],
        progressPairFilter.length
          ? selectedLean(
              configureOperationalQuery(
                CourseProgressModel.find({
                  $or: progressPairFilter,
                }).limit(progressPairFilter.length + 1),
                STATUS_QUERY_COMMENT
              ),
              "_id courseID userId"
            )
          : [],
        purchaseIds.length
          ? selectedLean(
              configureOperationalQuery(
                PurchaseModel.find({ _id: { $in: purchaseIds } }),
                STATUS_QUERY_COMMENT
              ),
              PURCHASE_EVIDENCE_PROJECTION
            )
          : [],
        entitlementPairFilter.length
          ? internalLean(
              configureOperationalQuery(
                EntitlementModel.find({
                  $or: entitlementPairFilter,
                  isCurrent: true,
                  status: "active",
                }).limit(entitlementPairFilter.length + 1),
                STATUS_QUERY_COMMENT
              )
            )
          : [],
      ])
    const evidenceInconclusive =
      progress.length > progressPairFilter.length ||
      currentActive.length > entitlementPairFilter.length
    const boundedProgress = progress.slice(0, progressPairFilter.length)
    const boundedCurrentActive = currentActive.slice(
      0,
      entitlementPairFilter.length
    )
    const usersById = new Map(users.map((user) => [user._id.toString(), user]))
    const coursesById = new Map(
      courses.map((course) => [course._id.toString(), course])
    )
    const purchasesById = new Map(
      purchases.map((purchase) => [purchase._id.toString(), purchase])
    )
    const progressPairs = new Set(
      boundedProgress.map(
        (document) =>
          `${document.userId.toString()}:${document.courseID.toString()}`
      )
    )
    const currentActivePairs = new Set(
      boundedCurrentActive.map(
        (episode) =>
          `${episode.studentId.toString()}:${episode.courseId.toString()}`
      )
    )
    let activeMissingLegacyCount = 0
    let terminalLegacyConflictCount = 0
    for (const episode of validPurchaseEpisodes) {
      const studentId = episode.studentId.toString()
      const courseId = episode.courseId.toString()
      const user = usersById.get(studentId)
      const course = coursesById.get(courseId)
      const purchase = purchasesById.get(episode.purchaseId.toString())
      const userMirror = user?.courses?.some(
        (value) => value.toString() === courseId
      )
      const courseMirror = course?.studentsEnroled?.some(
        (value) => value.toString() === studentId
      )
      const purchaseCourses = analyzePurchaseCourseEvidence(purchase)
      const financialState = purchaseFinancialState(purchase)
      const purchaseMatches = Boolean(
        purchaseCourses.ok &&
        purchaseBoundaryEvidenceValid(purchase, startedAt) &&
        valuesEqual(purchase.user, episode.studentId) &&
        purchaseCourses.courseIds.includes(courseId)
      )
      const userEligible =
        user?.accountType === "Student" &&
        user.active === true &&
        user.approved === true &&
        user.deletionPending === false
      const completedDeletion = exactCompletedDeletionUser(user)
      const referenceEvidenceValid = Boolean(user && course)

      if (episode.status === "provisioning") {
        if (
          !purchaseMatches ||
          !["paid", "activation", "held_capture", "held_refund"].includes(
            financialState
          ) ||
          !userEligible ||
          !referenceEvidenceValid
        ) {
          malformedEpisodeCount += 1
        }
        continue
      }
      if (episode.status === "active") {
        if (
          !purchaseMatches ||
          financialState !== "activation" ||
          !validDate(episode.grantedAt) ||
          episode.grantedAt.getTime() !== purchase.fulfilledAt.getTime() ||
          !userEligible ||
          !referenceEvidenceValid ||
          !userMirror ||
          !courseMirror ||
          !progressPairs.has(`${studentId}:${courseId}`)
        ) {
          activeMissingLegacyCount += 1
        }
        continue
      }
      if (["revoked", "cancelled"].includes(episode.status)) {
        const terminalEvidenceValid = Boolean(
          purchaseMatches &&
          referenceEvidenceValid &&
          ((financialState === "processed_refund" &&
            exactRefundTerminal(episode, purchase)) ||
            (completedDeletion &&
              ["activation", "processed_refund"].includes(financialState) &&
              exactAccountDeletionTerminal(
                episode,
                purchase,
                user.deletionStartedAt
              )))
        )
        if (!terminalEvidenceValid) malformedEpisodeCount += 1
        if (
          (userMirror || courseMirror) &&
          !currentActivePairs.has(`${studentId}:${courseId}`)
        ) {
          terminalLegacyConflictCount += 1
        }
      }
    }

    return {
      activeMissingLegacyCount,
      evidenceInconclusive,
      malformedEpisodeCount,
      terminalLegacyConflictCount,
    }
  }

  const scanLifecycleOperationalStatus = async ({ startedAt }) => {
    const boundaryObjectId = mongoose.Types.ObjectId.createFromTime(
      Math.floor(startedAt.getTime() / 1_000)
    )
    const counts = {
      activeMissingLegacyCount: 0,
      malformedEpisodeCount: 0,
      terminalLegacyConflictCount: 0,
    }
    let afterId
    let hasMore = false
    let truncated = false
    const deadlineAt = Date.now() + OPERATIONAL_STATUS_BUDGET_MS
    do {
      if (Date.now() >= deadlineAt) {
        truncated = true
        break
      }
      const documents = await internalLean(
        configureOperationalQuery(
          EntitlementModel.find({
            _id: {
              $gte: boundaryObjectId,
              ...(afterId ? { $gt: afterId } : {}),
            },
          })
            .sort({ _id: 1 })
            .hint(PURCHASE_BOUNDARY_INDEX_HINT)
            .limit(OPERATIONAL_STATUS_PAGE_SIZE + 1),
          STATUS_QUERY_COMMENT
        )
      )
      const page = documents.slice(0, OPERATIONAL_STATUS_PAGE_SIZE)
      hasMore = documents.length > OPERATIONAL_STATUS_PAGE_SIZE
      const evaluation = await evaluateLifecycleStatusPage({
        episodes: page,
        startedAt,
      })
      for (const key of Object.keys(counts)) counts[key] += evaluation[key]
      if (evaluation.evidenceInconclusive) {
        truncated = true
        break
      }
      if (!hasMore || page.length === 0) break
      const nextCursor = page.at(-1)?._id
      if (!nextCursor || valuesEqual(nextCursor, afterId)) {
        throw new TypeError("lifecycle status pagination did not advance")
      }
      afterId = nextCursor
    } while (hasMore)

    return { ...counts, truncated: truncated || hasMore }
  }

  return Object.freeze({
    explainBoundaryPurchaseCandidates,
    findBoundaryPurchaseCandidates,
    findCurrentPairEpisode: ({ courseId, studentId }) =>
      internalLean(
        EntitlementModel.findOne({ courseId, isCurrent: true, studentId })
      ),
    findCurrentPairEpisodes,
    findCurrentStudentEpisodes: ({ afterId, createdAfter, limit, studentId }) =>
      internalLean(
        EntitlementModel.find({
          ...(afterId ? { _id: { $gt: afterId } } : {}),
          ...(createdAfter ? { createdAt: { $gte: createdAfter } } : {}),
          isCurrent: true,
          source: "purchase",
          status: { $in: ["active", "provisioning"] },
          studentId,
        })
          .sort({ _id: 1 })
          .limit(boundedLimit(limit, { fallback: 100, maximum: 1_000 }))
      ),
    findPurchaseEpisodes,
    findExpiredProvisioningLease: ({ createdAfter, now }) =>
      internalLean(
        EntitlementModel.findOne({
          $expr: { $lte: ["$reconciliationLeaseUntil", "$$NOW"] },
          createdAt: { $gte: createdAfter },
          isCurrent: true,
          manualReviewRequiredAt: { $exists: false },
          reconciliationLeaseId: { $exists: true },
          reconciliationLeaseUntil: { $lte: now },
          source: "purchase",
          status: "provisioning",
        }).sort({ reconciliationLeaseUntil: 1, _id: 1 })
      ),
    findAgedProvisioning: ({ createdAfter, createdBefore }) => {
      const coarseCreatedAfter = mongoose.Types.ObjectId.createFromTime(
        Math.floor(createdAfter.getTime() / 1_000)
      )
      const coarseCreatedBefore = mongoose.Types.ObjectId.createFromTime(
        Math.floor(createdBefore.getTime() / 1_000) + 1
      )
      return internalLean(
        EntitlementModel.findOne({
          $expr: {
            $lte: [
              "$createdAt",
              {
                $dateSubtract: { amount: 24, startDate: "$$NOW", unit: "hour" },
              },
            ],
          },
          _id: { $gte: coarseCreatedAfter, $lt: coarseCreatedBefore },
          createdAt: { $gte: createdAfter, $lte: createdBefore },
          isCurrent: true,
          manualReviewRequiredAt: { $exists: false },
          nextReconciliationAt: { $exists: true },
          reconciliationLeaseId: { $exists: false },
          reconciliationLeaseUntil: { $exists: false },
          source: "purchase",
          status: "provisioning",
        })
          .sort({ _id: 1 })
          .hint(PURCHASE_BOUNDARY_INDEX_HINT)
      )
    },
    claimDueProvisioning: async ({
      createdAfter,
      createdAfterAge,
      leaseId,
      leaseUntil,
      now,
    }) => {
      const candidate = await internalLean(
        EntitlementModel.findOne({
          $expr: {
            $and: [
              { $lte: ["$nextReconciliationAt", "$$NOW"] },
              {
                $gt: [
                  "$createdAt",
                  {
                    $dateSubtract: {
                      amount: 24,
                      startDate: "$$NOW",
                      unit: "hour",
                    },
                  },
                ],
              },
            ],
          },
          createdAt: { $gte: createdAfter, $gt: createdAfterAge },
          isCurrent: true,
          manualReviewRequiredAt: { $exists: false },
          nextReconciliationAt: { $lte: now },
          reconciliationAttempts: { $lt: 5 },
          reconciliationLeaseId: { $exists: false },
          reconciliationLeaseUntil: { $exists: false },
          source: "purchase",
          status: "provisioning",
        }).sort({ nextReconciliationAt: 1, _id: 1 })
      )
      if (!candidate) return null

      const next = {
        ...candidate,
        reconciliationAttempts: candidate.reconciliationAttempts + 1,
        reconciliationLeaseId: leaseId,
        reconciliationLeaseUntil: leaseUntil,
        revision: candidate.revision + 1,
      }
      delete next.nextReconciliationAt
      return transitionEpisode({
        ageValidAt: createdAfterAge,
        createdAtGte: createdAfter,
        next,
        previous: candidate,
      })
    },
    getRecoveryOperationalStatus: async ({
      limit = DEFAULT_OPERATIONAL_STATUS_LIMIT,
      now,
      sidecarStartedAt,
    }) => {
      const resolvedLimit = boundedLimit(limit, {
        fallback: DEFAULT_OPERATIONAL_STATUS_LIMIT,
        maximum: MAX_OPERATIONAL_STATUS_LIMIT,
      })
      const boundaryObjectId = mongoose.Types.ObjectId.createFromTime(
        Math.floor(sidecarStartedAt.getTime() / 1_000)
      )
      const [due, aged, expired, manual, boundaryPage, lifecycleStatus] =
        await Promise.all([
          boundedDocuments(
            EntitlementModel.find({
              createdAt: { $gte: sidecarStartedAt },
              isCurrent: true,
              manualReviewRequiredAt: { $exists: false },
              nextReconciliationAt: { $lte: now },
              reconciliationLeaseId: { $exists: false },
              source: "purchase",
              status: "provisioning",
            }).sort({ nextReconciliationAt: 1, _id: 1 }),
            resolvedLimit,
            STATUS_QUERY_COMMENT
          ),
          boundedDocuments(
            EntitlementModel.find({
              _id: { $gte: boundaryObjectId },
              createdAt: {
                $gte: sidecarStartedAt,
                $lte: new Date(now.getTime() - 24 * 60 * 60 * 1000),
              },
              isCurrent: true,
              manualReviewRequiredAt: { $exists: false },
              reconciliationLeaseId: { $exists: false },
              reconciliationLeaseUntil: { $exists: false },
              source: "purchase",
              status: "provisioning",
            })
              .sort({ _id: 1 })
              .hint(PURCHASE_BOUNDARY_INDEX_HINT),
            resolvedLimit,
            STATUS_QUERY_COMMENT
          ),
          boundedDocuments(
            EntitlementModel.find({
              _id: { $gte: boundaryObjectId },
              createdAt: { $gte: sidecarStartedAt },
              isCurrent: true,
              reconciliationLeaseUntil: { $lte: now },
              source: "purchase",
              status: "provisioning",
            }).sort({ reconciliationLeaseUntil: 1, _id: 1 }),
            resolvedLimit,
            STATUS_QUERY_COMMENT
          ),
          boundedDocuments(
            EntitlementModel.find({
              createdAt: { $gte: sidecarStartedAt },
              isCurrent: true,
              manualReviewRequiredAt: { $exists: true },
              source: "purchase",
              status: "provisioning",
            })
              .sort({ _id: 1 })
              .hint(PURCHASE_BOUNDARY_INDEX_HINT),
            resolvedLimit,
            STATUS_QUERY_COMMENT
          ),
          scanBoundaryPurchaseStatus({ startedAt: sidecarStartedAt }),
          scanLifecycleOperationalStatus({ startedAt: sidecarStartedAt }),
        ])

      return {
        activeMissingLegacyCount: lifecycleStatus.activeMissingLegacyCount,
        ageHandoffRequiredCount: aged.count,
        boundaryExaminedCount: boundaryPage.scannedCount,
        boundaryLifecycleMismatchCount:
          boundaryPage.boundaryLifecycleMismatchCount,
        boundaryMissingEpisodeCount: boundaryPage.boundaryMissingEpisodeCount,
        completedDeletionCurrentCount:
          boundaryPage.completedDeletionCurrentCount,
        dueCount: due.count,
        expiredLeaseCount: expired.count,
        manualReviewCount: manual.count,
        malformedEpisodeCount: lifecycleStatus.malformedEpisodeCount,
        terminalLegacyConflictCount:
          lifecycleStatus.terminalLegacyConflictCount,
        truncated: {
          boundary: boundaryPage.hasMore,
          ageHandoff: aged.truncated,
          completedDeletion: boundaryPage.hasMore,
          due: due.truncated,
          expiredLease: expired.truncated,
          lifecycle: lifecycleStatus.truncated,
          manualReview: manual.truncated,
        },
      }
    },
    insertEntitlementEpisodes: async (episodes) => {
      for (const episode of episodes) assertEntitlementState(episode)
      const inserted = await EntitlementModel.insertMany(episodes, {
        comment: SIDECAR_QUERY_COMMENT,
        maxTimeMS: OPERATIONAL_QUERY_MAX_TIME_MS,
        ordered: false,
        ...(currentOperationSignal()
          ? { signal: currentOperationSignal() }
          : {}),
        timeoutMS: OPERATIONAL_QUERY_MAX_TIME_MS,
      })
      return inserted.map(plainInternalDocument)
    },
    loadActivationEvidence: async ({ courseIds, purchaseId, studentId }) => {
      const [purchase, user, courses, progress] = await Promise.all([
        selectedLean(
          PurchaseModel.findById(purchaseId),
          PURCHASE_EVIDENCE_PROJECTION
        ),
        selectedLean(
          UserModel.findById(studentId),
          "_id accountType active approved authProviders courses courseProgress email firstName image instructorApprovalStatus lastName updatedAt +deletionPending +deletionStartedAt +deletionLockId +deletionLockUntil"
        ),
        selectedLean(
          CourseModel.find({ _id: { $in: courseIds } }),
          "_id status studentsEnroled"
        ),
        selectedLean(
          CourseProgressModel.find({
            courseID: { $in: courseIds },
            userId: studentId,
          }),
          "_id courseID userId"
        ),
      ])
      return { courses, progress, purchase, user }
    },
    loadDeletionEvidence: ({ studentId }) =>
      selectedLean(
        UserModel.findById(studentId),
        "_id accountType active approved authProviders courses courseProgress email firstName image instructorApprovalStatus lastName updatedAt +deletionPending +deletionStartedAt +deletionLockId +deletionLockUntil"
      ),
    loadGrantEvidence: async ({ courseId, purchaseId, studentId }) => {
      const evidence = await Promise.all([
        selectedLean(
          PurchaseModel.findById(purchaseId),
          PURCHASE_EVIDENCE_PROJECTION
        ),
        selectedLean(
          UserModel.findById(studentId),
          "_id accountType active approved authProviders courses courseProgress email firstName image instructorApprovalStatus lastName updatedAt +deletionPending +deletionStartedAt +deletionLockId +deletionLockUntil"
        ),
        selectedLean(
          CourseModel.findById(courseId),
          "_id status studentsEnroled"
        ),
        configureOperationalQuery(
          CourseProgressModel.exists({ courseID: courseId, userId: studentId }),
          SIDECAR_QUERY_COMMENT
        ),
      ])
      return {
        course: evidence[2],
        progressExists: Boolean(evidence[3]),
        purchase: evidence[0],
        user: evidence[1],
      }
    },
    loadPurchaseEvidence: ({ purchaseId }) =>
      selectedLean(
        PurchaseModel.findById(purchaseId),
        PURCHASE_EVIDENCE_PROJECTION
      ),
    loadReservationEvidence: async ({ courseIds, studentId }) => {
      const [user, courses] = await Promise.all([
        selectedLean(
          UserModel.findById(studentId),
          "_id accountType active approved +deletionPending"
        ),
        selectedLean(
          CourseModel.find({ _id: { $in: courseIds } }),
          "_id status"
        ),
      ])
      return { courses, user }
    },
    readDatabaseTime,
    transitionEpisode,
  })
}

const repository = createEntitlementRepository()

module.exports = Object.freeze({
  INTERNAL_ENTITLEMENT_PROJECTION,
  INTERNAL_ENTITLEMENT_AGGREGATION_PROJECTION,
  PURCHASE_EVIDENCE_PROJECTION,
  PURCHASE_BOUNDARY_INDEX_HINT,
  SIDECAR_QUERY_COMMENT,
  createEntitlementRepository,
  runWithEntitlementOperationSignal,
  ...repository,
})
