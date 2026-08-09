const crypto = require("node:crypto")

const logger = require("../../utils/logger")
const {
  PURCHASE_STATUSES,
  classifyEnrollmentPairState,
  mapEnrollmentConsistencyDryRun,
} = require("./enrollmentConsistency")
const {
  createEnrollmentConsistencyRepository,
} = require("./enrollmentConsistencyRepository")

const MAX_SAMPLE_LIMIT = 100

const sumStatusCounts = (counts) =>
  PURCHASE_STATUSES.reduce((total, status) => total + counts[status], 0)

const compareText = (left, right) => (left < right ? -1 : left > right ? 1 : 0)

const sortedCounts = (counts) =>
  Object.fromEntries(
    [...counts.entries()].sort(([left], [right]) => compareText(left, right))
  )

const pairReportDto = (pair, classification) => ({
  userId: pair.userId,
  courseId: pair.courseId,
  state: {
    userCourses: pair.userCourseCount,
    courseStudents: pair.courseEnrollmentCount,
    purchaseEntitlement: classification.canonicalState.qualifyingPurchaseCount,
    purchaseActiveCourses: sumStatusCounts(pair.activePurchaseStatusCounts),
    courseProgress: pair.progressCount,
  },
  classification: {
    mirrorState: classification.canonicalState.mirrorState,
    scenarios: classification.canonicalState.scenarios,
  },
  consistent: classification.issues.length === 0,
  financialEvidence: classification.financialEvidence,
  issues: classification.issues,
})

const validateSampleLimit = (value) => {
  if (!Number.isSafeInteger(value) || value < 0 || value > MAX_SAMPLE_LIMIT) {
    throw new TypeError(
      `sampleLimit must be an integer from 0 through ${MAX_SAMPLE_LIMIT}`
    )
  }
}

const validateMode = (value) => {
  if (!new Set(["read_only", "dry_run"]).has(value)) {
    throw new TypeError('mode must be either "read_only" or "dry_run"')
  }
}

const reportStatus = ({ blocking, warning }) => {
  if (blocking > 0) return "blocking"
  if (warning > 0) return "warning"
  return "healthy"
}

const createEnrollmentConsistencyService = ({
  clock = Date.now,
  createRequestId = crypto.randomUUID,
  repository = createEnrollmentConsistencyRepository(),
  targetLogger = logger,
} = {}) => ({
  async audit({
    mode = "read_only",
    requestId = createRequestId(),
    sampleLimit = MAX_SAMPLE_LIMIT,
  } = {}) {
    validateMode(mode)
    validateSampleLimit(sampleLimit)

    const startedAtMs = clock()
    const startedAt = new Date(startedAtMs).toISOString()
    const issueCounts = new Map()
    const scenarioCounts = new Map()
    const samples = []
    let affectedPairs = 0
    let blocking = 0
    let classifiedPairs = 0
    let pairCount = 0
    let scenarioPairs = 0
    let warning = 0

    targetLogger.info("enrollment.consistency_started", {
      requestId,
      mode,
      sampleLimit,
    })

    try {
      for await (const pair of repository.streamPairStates()) {
        pairCount += 1
        const classification = classifyEnrollmentPairState(pair)
        const scenarios = classification.canonicalState.scenarios
        const hasIssues = classification.issues.length > 0
        const hasScenarios = scenarios.length > 0
        if (hasScenarios) {
          scenarioPairs += 1
          for (const scenario of scenarios) {
            scenarioCounts.set(
              scenario.code,
              (scenarioCounts.get(scenario.code) || 0) + 1
            )
          }
        }
        if (hasIssues || hasScenarios) classifiedPairs += 1

        if (hasIssues) {
          affectedPairs += 1
          blocking += classification.summary.blocking
          warning += classification.summary.warning
          for (const foundIssue of classification.issues) {
            issueCounts.set(
              foundIssue.code,
              (issueCounts.get(foundIssue.code) || 0) + 1
            )
          }
        }

        if ((hasIssues || hasScenarios) && samples.length < sampleLimit) {
          samples.push(
            mode === "dry_run"
              ? mapEnrollmentConsistencyDryRun(pair)
              : pairReportDto(pair, classification)
          )
        }
      }
    } catch (error) {
      targetLogger.error("enrollment.consistency_failed", {
        requestId,
        durationMs: Math.max(0, clock() - startedAtMs),
        error: logger.errorMetadata(error),
      })
      throw error
    }

    const completedAtMs = clock()
    const durationMs = Math.max(0, completedAtMs - startedAtMs)
    const status = reportStatus({ blocking, warning })
    const report = Object.freeze({
      schemaVersion: 1,
      mode,
      requestId,
      status,
      startedAt,
      completedAt: new Date(completedAtMs).toISOString(),
      durationMs,
      summary: Object.freeze({
        pairCount,
        affectedPairs,
        blockingFindings: blocking,
        classifiedPairs,
        warningFindings: warning,
        totalFindings: blocking + warning,
        issueCounts: Object.freeze(sortedCounts(issueCounts)),
        scenarioCounts: Object.freeze(sortedCounts(scenarioCounts)),
        scenarioPairs,
      }),
      samples: Object.freeze(samples),
      truncated: classifiedPairs > samples.length,
    })

    if (blocking > 0) {
      targetLogger.warn("enrollment.consistency_mismatch", {
        requestId,
        affectedPairs,
        blockingFindings: blocking,
        durationMs,
        pairCount,
        warningFindings: warning,
      })
    }
    const orphanedProgress =
      report.summary.issueCounts.PROGRESS_WITHOUT_RUNTIME_ENTITLEMENT || 0
    if (orphanedProgress > 0) {
      targetLogger.warn("enrollment.progress_without_entitlement", {
        requestId,
        affectedPairs: orphanedProgress,
      })
    }
    if (mode === "dry_run") {
      targetLogger.info("enrollment.reconciliation_dry_run", {
        requestId,
        affectedPairs,
        blockingFindings: blocking,
        classifiedPairs,
        sampledPairCount: samples.length,
        scenarioPairs,
        truncated: report.truncated,
        warningFindings: warning,
      })
    }
    targetLogger.info("enrollment.consistency_completed", {
      requestId,
      affectedPairs,
      classifiedPairs,
      durationMs,
      pairCount,
      scenarioPairs,
      status,
      totalFindings: blocking + warning,
    })

    return report
  },
})

module.exports = {
  MAX_SAMPLE_LIMIT,
  createEnrollmentConsistencyService,
  pairReportDto,
  reportStatus,
}
