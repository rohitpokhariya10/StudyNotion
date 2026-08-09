const REPORT_MODES = new Set(["read_only", "dry_run"])
const REPORT_STATUSES = new Set(["healthy", "warning", "blocking"])
const REPORT_TOP_LEVEL_KEYS = new Set([
  "completedAt",
  "durationMs",
  "mode",
  "requestId",
  "samples",
  "schemaVersion",
  "startedAt",
  "status",
  "summary",
  "truncated",
])
const REPORT_SUMMARY_KEYS = new Set([
  "affectedPairs",
  "blockingFindings",
  "classifiedPairs",
  "issueCounts",
  "pairCount",
  "scenarioCounts",
  "scenarioPairs",
  "totalFindings",
  "warningFindings",
])
const MAX_REPORT_MAP_ENTRIES = 256
const MAX_REPORT_SAMPLES = 100
const MAP_KEY_PATTERN = /^[A-Z][A-Z0-9_]{0,99}$/

class EnrollmentConsistencyReportValidationError extends TypeError {
  constructor(message) {
    super(message)
    this.name = "EnrollmentConsistencyReportValidationError"
    this.code = "INVALID_ENROLLMENT_CONSISTENCY_REPORT"
  }
}

const fail = (message) => {
  throw new EnrollmentConsistencyReportValidationError(message)
}

const isPlainObject = (value) => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false
  const prototype = Object.getPrototypeOf(value)
  return prototype === Object.prototype || prototype === null
}

const assertPlainObject = (value, path) => {
  if (!isPlainObject(value)) fail(`${path} must be a plain object`)
}

const assertExactKeys = (value, expectedKeys, path) => {
  for (const key of Object.keys(value)) {
    if (!expectedKeys.has(key))
      fail(`${path} contains an unknown field: ${key}`)
  }
  for (const key of expectedKeys) {
    if (!Object.hasOwn(value, key)) fail(`${path} is missing field: ${key}`)
  }
}

const assertCount = (value, path) => {
  if (!Number.isSafeInteger(value) || value < 0) {
    fail(`${path} must be a non-negative safe integer`)
  }
}

const checkedSum = (values, path) => {
  let total = 0
  for (const value of values) {
    if (total > Number.MAX_SAFE_INTEGER - value) {
      fail(`${path} exceeds the safe integer range`)
    }
    total += value
  }
  return total
}

const validateCountMap = (value, path) => {
  assertPlainObject(value, path)
  const entries = Object.entries(value)
  if (entries.length > MAX_REPORT_MAP_ENTRIES) {
    fail(`${path} has too many entries`)
  }
  for (const [key, count] of entries) {
    if (!MAP_KEY_PATTERN.test(key)) fail(`${path} contains an invalid key`)
    assertCount(count, `${path}.${key}`)
  }
  return checkedSum(
    entries.map(([, count]) => count),
    path
  )
}

const parseTimestamp = (value, path) => {
  if (typeof value !== "string") fail(`${path} must be an ISO timestamp`)
  const milliseconds = Date.parse(value)
  if (
    !Number.isFinite(milliseconds) ||
    new Date(milliseconds).toISOString() !== value
  ) {
    fail(`${path} must be an ISO timestamp`)
  }
  return milliseconds
}

const assertEnrollmentConsistencyReport = (report, { expectedMode } = {}) => {
  assertPlainObject(report, "Enrollment consistency report")
  assertExactKeys(
    report,
    REPORT_TOP_LEVEL_KEYS,
    "Enrollment consistency report"
  )

  if (report.schemaVersion !== 1) fail("schemaVersion must equal 1")
  if (!REPORT_MODES.has(report.mode)) fail("mode is invalid")
  if (expectedMode !== undefined && report.mode !== expectedMode) {
    fail(`mode must equal ${expectedMode}`)
  }
  if (!REPORT_STATUSES.has(report.status)) fail("status is invalid")
  if (
    typeof report.requestId !== "string" ||
    !report.requestId.trim() ||
    report.requestId.length > 200
  ) {
    fail("requestId must be a non-empty string of at most 200 characters")
  }
  assertCount(report.durationMs, "durationMs")
  const startedAt = parseTimestamp(report.startedAt, "startedAt")
  const completedAt = parseTimestamp(report.completedAt, "completedAt")
  if (
    completedAt < startedAt ||
    completedAt - startedAt !== report.durationMs
  ) {
    fail("report timestamps and durationMs are inconsistent")
  }
  if (!Array.isArray(report.samples)) fail("samples must be an array")
  if (report.samples.length > MAX_REPORT_SAMPLES) {
    fail(`samples must contain at most ${MAX_REPORT_SAMPLES} entries`)
  }
  if (typeof report.truncated !== "boolean") {
    fail("truncated must be a boolean")
  }

  assertPlainObject(report.summary, "summary")
  assertExactKeys(report.summary, REPORT_SUMMARY_KEYS, "summary")
  for (const key of [
    "affectedPairs",
    "blockingFindings",
    "classifiedPairs",
    "pairCount",
    "scenarioPairs",
    "totalFindings",
    "warningFindings",
  ]) {
    assertCount(report.summary[key], `summary.${key}`)
  }

  const issueTotal = validateCountMap(
    report.summary.issueCounts,
    "summary.issueCounts"
  )
  const scenarioTotal = validateCountMap(
    report.summary.scenarioCounts,
    "summary.scenarioCounts"
  )
  const {
    affectedPairs,
    blockingFindings,
    classifiedPairs,
    pairCount,
    scenarioPairs,
    totalFindings,
    warningFindings,
  } = report.summary

  if (affectedPairs > pairCount || classifiedPairs > pairCount) {
    fail("affectedPairs and classifiedPairs cannot exceed pairCount")
  }
  if (scenarioPairs > pairCount || scenarioPairs > classifiedPairs) {
    fail("scenarioPairs cannot exceed pairCount or classifiedPairs")
  }
  if (affectedPairs > classifiedPairs) {
    fail("affectedPairs cannot exceed classifiedPairs")
  }
  if (classifiedPairs > affectedPairs + scenarioPairs) {
    fail("classifiedPairs exceeds the union of affected and scenario pairs")
  }
  if (totalFindings !== blockingFindings + warningFindings) {
    fail("totalFindings must equal blockingFindings plus warningFindings")
  }
  if (issueTotal !== totalFindings) {
    fail("issueCounts must sum to totalFindings")
  }
  if (totalFindings < affectedPairs) {
    fail("totalFindings cannot be less than affectedPairs")
  }
  if (
    (scenarioPairs === 0 && scenarioTotal !== 0) ||
    (scenarioPairs > 0 && scenarioTotal < scenarioPairs)
  ) {
    fail("scenarioCounts are inconsistent with scenarioPairs")
  }
  if (report.samples.length > classifiedPairs) {
    fail("samples cannot exceed classifiedPairs")
  }
  if (report.truncated !== classifiedPairs > report.samples.length) {
    fail("truncated is inconsistent with classifiedPairs and samples")
  }

  const expectedStatus =
    blockingFindings > 0
      ? "blocking"
      : warningFindings > 0
        ? "warning"
        : "healthy"
  if (report.status !== expectedStatus) {
    fail("status is inconsistent with finding severity")
  }

  return report
}

module.exports = {
  EnrollmentConsistencyReportValidationError,
  MAX_REPORT_MAP_ENTRIES,
  MAX_REPORT_SAMPLES,
  assertEnrollmentConsistencyReport,
}
