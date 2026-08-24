const mongoose = require("mongoose")

const {
  RECOVERY_BATCH_BUDGET_MS,
  RECOVERY_DEFAULT_BATCH_SIZE,
  RECOVERY_MAX_BATCH_SIZE,
  createEntitlementRecoveryService,
} = require("../domains/entitlement/entitlementRecoveryService")
const logger = require("../utils/logger")
const {
  mongoJobOptions,
  validateMongoUriForEnvironment,
} = require("../utils/mongoDeployment")

const RECOVERY_CONFIRMATION = "reconcile-entitlements"
const MAX_BOUNDARY_FUTURE_SKEW_MS = 5 * 60 * 1000
const EXIT_CODES = Object.freeze({
  completed: 0,
  warning: 1,
  blocking: 2,
  operational_error: 3,
})

const HELP_TEXT = [
  "StudyNotion Entitlement recovery",
  "",
  "Usage:",
  "  npm --workspace studynotion-backend run entitlement:recover -- [options]",
  "",
  "Options:",
  `  --limit <1-${RECOVERY_MAX_BATCH_SIZE}>  Maximum work per category (default ${RECOVERY_DEFAULT_BATCH_SIZE})`,
  "  --continuation <ObjectId>  Resume after an approved canonical Purchase ObjectId",
  "  --status-only           Print a read-only operational status report",
  "  -h, --help              Show this help without connecting to MongoDB",
  "",
  `Mutation runs share one fixed ${RECOVERY_BATCH_BUDGET_MS / 1000}-second catch-up/recovery deadline.`,
  "",
  "Required environment:",
  "  MONGODB_URI",
  "  ENTITLEMENT_SIDECAR_STARTED_AT (strict UTC ISO timestamp)",
  "  ENTITLEMENT_RECOVERY_CONFIRM=reconcile-entitlements (production writes)",
  "",
  "Mutation-report continuations are sensitive operational data. Store them privately.",
  "After reaching the end, run once without --continuation to wrap around.",
].join("\n")

class EntitlementRecoveryConfigurationError extends Error {
  constructor(message) {
    super(message)
    this.name = "EntitlementRecoveryConfigurationError"
    this.code = "ENTITLEMENT_RECOVERY_CONFIGURATION"
  }
}

class EntitlementRecoveryReportError extends Error {
  constructor(message = "Entitlement recovery returned an invalid report") {
    super(message)
    this.name = "EntitlementRecoveryReportError"
    this.code = "ENTITLEMENT_RECOVERY_INVALID_REPORT"
  }
}

const parseInteger = (value, name, { maximum, minimum }) => {
  const parsed = Number(value)
  if (!Number.isSafeInteger(parsed) || parsed < minimum || parsed > maximum) {
    throw new EntitlementRecoveryConfigurationError(
      `${name} must be an integer from ${minimum} through ${maximum}`
    )
  }
  return parsed
}

const parseArguments = (argv) => {
  let continuation
  let help = false
  let limit = RECOVERY_DEFAULT_BATCH_SIZE
  let statusOnly = false

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index]
    if (argument === "--help" || argument === "-h") {
      help = true
      continue
    }
    if (argument === "--status-only") {
      statusOnly = true
      continue
    }
    if (argument === "--continuation") {
      if (continuation !== undefined) {
        throw new EntitlementRecoveryConfigurationError(
          "--continuation may be supplied only once"
        )
      }
      index += 1
      if (index >= argv.length) {
        throw new EntitlementRecoveryConfigurationError(
          "--continuation requires a canonical 24-hex Purchase ObjectId"
        )
      }
      const value = argv[index]
      if (!/^[0-9a-f]{24}$/.test(value)) {
        throw new EntitlementRecoveryConfigurationError(
          "--continuation must be a canonical lowercase 24-hex Purchase ObjectId"
        )
      }
      continuation = value
      continue
    }
    if (argument === "--limit") {
      index += 1
      if (index >= argv.length) {
        throw new EntitlementRecoveryConfigurationError(
          "--limit requires an integer value"
        )
      }
      limit = parseInteger(argv[index], "--limit", {
        maximum: RECOVERY_MAX_BATCH_SIZE,
        minimum: 1,
      })
      continue
    }
    throw new EntitlementRecoveryConfigurationError(
      `Unsupported Entitlement recovery argument: ${argument}`
    )
  }

  if (statusOnly && continuation !== undefined) {
    throw new EntitlementRecoveryConfigurationError(
      "--continuation cannot be combined with --status-only"
    )
  }
  return help
    ? Object.freeze({ help: true })
    : Object.freeze({
        ...(continuation ? { continuation } : {}),
        limit,
        statusOnly,
      })
}

const parseStrictIsoTimestamp = (value, name, now = Date.now()) => {
  if (
    typeof value !== "string" ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value)
  ) {
    throw new EntitlementRecoveryConfigurationError(
      `${name} must be a strict UTC ISO timestamp with milliseconds`
    )
  }
  const parsed = new Date(value)
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString() !== value) {
    throw new EntitlementRecoveryConfigurationError(
      `${name} must be a valid UTC ISO timestamp`
    )
  }
  const nowMilliseconds = now instanceof Date ? now.getTime() : Number(now)
  if (!Number.isFinite(nowMilliseconds)) {
    throw new TypeError("now must be a valid time")
  }
  if (parsed.getTime() > nowMilliseconds + MAX_BOUNDARY_FUTURE_SKEW_MS) {
    throw new EntitlementRecoveryConfigurationError(
      `${name} cannot be more than 5 minutes in the future`
    )
  }
  return parsed
}

const mongoOptions = (environment) =>
  mongoJobOptions(environment, {
    operationFallback: 10_000,
    operationMaximum: 10_000,
    socketFallback: 10_000,
    socketMaximum: 10_000,
  })

const isRecord = (value) =>
  Boolean(value && typeof value === "object" && !Array.isArray(value))

const exactKeys = (value, expected, message) => {
  if (!isRecord(value)) throw new EntitlementRecoveryReportError(message)
  const actual = Object.keys(value).sort()
  const wanted = [...expected].sort()
  if (
    actual.length !== wanted.length ||
    actual.some((key, index) => key !== wanted[index])
  ) {
    throw new EntitlementRecoveryReportError(message)
  }
}

const validCount = (value) => Number.isSafeInteger(value) && value >= 0

const validTimestamp = (value) => {
  if (
    typeof value !== "string" ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value)
  ) {
    return false
  }
  const parsed = new Date(value)
  return Number.isFinite(parsed.getTime()) && parsed.toISOString() === value
}

const validateRecoveryReport = (report) => {
  exactKeys(
    report,
    [
      "schemaVersion",
      "status",
      "startedAt",
      "completedAt",
      "durationMs",
      "limit",
      "catchUp",
      "recovery",
    ],
    "Entitlement recovery returned an invalid report"
  )
  const catchUpKeys = [
    "activatedCount",
    "examinedCount",
    "failedCount",
    "hasMore",
    "reservedCount",
    "terminalizedCount",
  ]
  if (Object.hasOwn(report.catchUp || {}, "continuation")) {
    catchUpKeys.push("continuation")
  }
  exactKeys(
    report.catchUp,
    catchUpKeys,
    "Entitlement recovery returned an invalid catch-up report"
  )
  exactKeys(
    report.recovery,
    [
      "activated",
      "cancelled",
      "conflicts",
      "expiredLeasesReleased",
      "manualReviewRequired",
      "retried",
      "revoked",
    ],
    "Entitlement recovery returned an invalid recovery aggregate"
  )
  const catchUpCounts = [
    "activatedCount",
    "examinedCount",
    "failedCount",
    "reservedCount",
    "terminalizedCount",
  ]
  const recoveryCounts = [
    "activated",
    "cancelled",
    "conflicts",
    "expiredLeasesReleased",
    "manualReviewRequired",
    "retried",
    "revoked",
  ]
  if (
    report.schemaVersion !== 1 ||
    !["completed", "warning"].includes(report.status) ||
    !validTimestamp(report.startedAt) ||
    !validTimestamp(report.completedAt) ||
    !validCount(report.durationMs) ||
    !Number.isSafeInteger(report.limit) ||
    report.limit < 1 ||
    report.limit > RECOVERY_MAX_BATCH_SIZE ||
    typeof report.catchUp.hasMore !== "boolean" ||
    (report.catchUp.hasMore
      ? !/^[0-9a-f]{24}$/.test(report.catchUp.continuation)
      : report.catchUp.continuation !== undefined) ||
    catchUpCounts.some((key) => !validCount(report.catchUp[key])) ||
    recoveryCounts.some((key) => !validCount(report.recovery[key]))
  ) {
    throw new EntitlementRecoveryReportError()
  }
  return report
}

const validateStatusReport = (report) => {
  const message = "Entitlement recovery status returned an invalid report"
  exactKeys(
    report,
    [
      "schemaVersion",
      "status",
      "observedAt",
      "counts",
      "boundaryExaminedCount",
      "truncated",
    ],
    message
  )
  const countKeys = [
    "activeMissingLegacy",
    "ageHandoffRequired",
    "boundaryLifecycleMismatches",
    "boundaryMissingEpisodes",
    "completedDeletionCurrent",
    "dueProvisioning",
    "expiredLeases",
    "malformedEpisodes",
    "manualReview",
    "terminalLegacyConflicts",
  ]
  const truncatedKeys = [
    "ageHandoff",
    "boundary",
    "completedDeletion",
    "due",
    "expiredLease",
    "lifecycle",
    "manualReview",
  ]
  exactKeys(report.counts, countKeys, message)
  exactKeys(report.truncated, truncatedKeys, message)
  if (
    report.schemaVersion !== 1 ||
    !["healthy", "warning", "blocking"].includes(report.status) ||
    !validTimestamp(report.observedAt) ||
    !validCount(report.boundaryExaminedCount) ||
    countKeys.some((key) => !validCount(report.counts[key])) ||
    truncatedKeys.some((key) => typeof report.truncated[key] !== "boolean")
  ) {
    throw new EntitlementRecoveryReportError(message)
  }
  return report
}

const classifyOperationalError = (error) => {
  if (
    error?.code === "ENTITLEMENT_RECOVERY_CONFIGURATION" ||
    error?.code === "MONGODB_DEPLOYMENT_CONFIGURATION"
  ) {
    return "configuration_error"
  }
  if (error?.code === "ENTITLEMENT_RECOVERY_INVALID_REPORT") {
    return "invalid_report"
  }
  if (
    /^Mongo/.test(String(error?.name || "")) ||
    ["ECONNREFUSED", "ENOTFOUND", "ETIMEDOUT"].includes(error?.code)
  ) {
    return "dependency_unavailable"
  }
  return "internal_error"
}

const run = async ({
  argv = process.argv.slice(2),
  connect = mongoose.connect.bind(mongoose),
  disconnect = mongoose.disconnect.bind(mongoose),
  environment = process.env,
  clock = Date.now,
  serviceFactory = createEntitlementRecoveryService,
} = {}) => {
  const options = parseArguments(argv)
  if (options.help) {
    return Object.freeze({ exitCode: EXIT_CODES.completed, help: HELP_TEXT })
  }

  const mongoUrl = environment.MONGODB_URI || environment.MONGODB_URL
  if (typeof mongoUrl !== "string" || !mongoUrl.trim()) {
    throw new EntitlementRecoveryConfigurationError("MONGODB_URI is required")
  }
  const sidecarStartedAt = parseStrictIsoTimestamp(
    environment.ENTITLEMENT_SIDECAR_STARTED_AT,
    "ENTITLEMENT_SIDECAR_STARTED_AT",
    clock()
  )
  validateMongoUriForEnvironment(mongoUrl, environment)
  if (
    !options.statusOnly &&
    environment.ENTITLEMENT_RECOVERY_CONFIRM !== RECOVERY_CONFIRMATION
  ) {
    throw new EntitlementRecoveryConfigurationError(
      `Set ENTITLEMENT_RECOVERY_CONFIRM=${RECOVERY_CONFIRMATION} to run recovery`
    )
  }

  let connected = false
  try {
    await connect(mongoUrl, mongoOptions(environment))
    connected = true
    const service = serviceFactory({ sidecarStartedAt })
    if (options.statusOnly) {
      const report = validateStatusReport(await service.getOperationalStatus())
      return Object.freeze({
        exitCode:
          report.status === "healthy"
            ? EXIT_CODES.completed
            : EXIT_CODES[report.status],
        report,
      })
    }
    const report = validateRecoveryReport(
      await service.runBatch({
        ...(options.continuation ? { continuation: options.continuation } : {}),
        limit: options.limit,
      })
    )
    return Object.freeze({
      exitCode: EXIT_CODES[report.status],
      report,
    })
  } finally {
    if (connected) await disconnect()
  }
}

const main = async () => {
  try {
    const argv = process.argv.slice(2)
    const parsed = parseArguments(argv)
    if (!parsed.help) require("dotenv").config({ quiet: true })
    const result = await run({ argv })
    process.stdout.write(
      result.help
        ? `${result.help}\n`
        : `${JSON.stringify(result.report, null, 2)}\n`
    )
    process.exitCode = result.exitCode
  } catch (error) {
    const report = {
      schemaVersion: 1,
      status: "operational_error",
      classification: classifyOperationalError(error),
      error: logger.errorMetadata(error),
    }
    process.stderr.write(`${JSON.stringify(report)}\n`)
    process.exitCode = EXIT_CODES.operational_error
  }
}

if (require.main === module) void main()

module.exports = {
  ENTITLEMENT_RECOVERY_CONFIRMATION: RECOVERY_CONFIRMATION,
  EXIT_CODES,
  EntitlementRecoveryConfigurationError,
  EntitlementRecoveryReportError,
  HELP_TEXT,
  classifyOperationalError,
  main,
  mongoOptions,
  parseArguments,
  parseStrictIsoTimestamp,
  run,
  validateRecoveryReport,
  validateStatusReport,
}
