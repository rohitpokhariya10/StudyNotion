const crypto = require("node:crypto")
const path = require("node:path")
const fileSystem = require("node:fs/promises")

const {
  RECOVERY_DEFAULT_BATCH_SIZE,
  RECOVERY_MAX_BATCH_SIZE,
} = require("../domains/entitlement/entitlementRecoveryService")
const logger = require("../utils/logger")
const { isImmutableImageReference } = require("../utils/imageReference")
const {
  EXIT_CODES,
  EntitlementRecoveryReportError,
  classifyOperationalError,
  run: runRecovery,
} = require("./reconcile-entitlements")

const CHECKPOINT_SCHEMA_VERSION = 1
const CHECKPOINT_FILE_MODE = 0o600
const CHECKPOINT_MAX_BYTES = 512
const CANONICAL_OBJECT_ID = /^[0-9a-f]{24}$/

class ScheduledRecoveryConfigurationError extends Error {
  constructor(message) {
    super(message)
    this.name = "ScheduledRecoveryConfigurationError"
    this.code = "ENTITLEMENT_RECOVERY_SCHEDULER_CONFIGURATION"
  }
}

class ScheduledRecoveryCheckpointError extends Error {
  constructor(message, options) {
    super(message, options)
    this.name = "ScheduledRecoveryCheckpointError"
    this.code = "ENTITLEMENT_RECOVERY_SCHEDULER_CHECKPOINT"
  }
}

const checkpointError = (cause) =>
  new ScheduledRecoveryCheckpointError(
    "The private Entitlement recovery checkpoint is unavailable or invalid",
    { cause }
  )

const parseBatchSize = (value) => {
  if (value === undefined || value === "") return RECOVERY_DEFAULT_BATCH_SIZE
  if (!/^[1-9][0-9]*$/.test(String(value))) {
    throw new ScheduledRecoveryConfigurationError(
      `ENTITLEMENT_RECOVERY_BATCH_SIZE must be an integer from 1 through ${RECOVERY_MAX_BATCH_SIZE}`
    )
  }
  const parsed = Number(value)
  if (
    !Number.isSafeInteger(parsed) ||
    parsed < 1 ||
    parsed > RECOVERY_MAX_BATCH_SIZE
  ) {
    throw new ScheduledRecoveryConfigurationError(
      `ENTITLEMENT_RECOVERY_BATCH_SIZE must be an integer from 1 through ${RECOVERY_MAX_BATCH_SIZE}`
    )
  }
  return parsed
}

const parseImageDigest = (value) => {
  if (!isImmutableImageReference(value)) {
    throw new ScheduledRecoveryConfigurationError(
      "STUDYNOTION_API_IMAGE_DIGEST must be an immutable sha256 image reference"
    )
  }
  return value
}

const parseCheckpointPath = (value) => {
  if (typeof value !== "string" || !value.trim()) {
    throw new ScheduledRecoveryConfigurationError(
      "ENTITLEMENT_RECOVERY_CHECKPOINT_FILE is required"
    )
  }
  const checkpointPath = value.trim()
  if (
    !path.isAbsolute(checkpointPath) ||
    checkpointPath === path.parse(checkpointPath).root
  ) {
    throw new ScheduledRecoveryConfigurationError(
      "ENTITLEMENT_RECOVERY_CHECKPOINT_FILE must be an absolute file path"
    )
  }
  return path.normalize(checkpointPath)
}

const parseSchedulerConfiguration = (environment = process.env) =>
  Object.freeze({
    batchSize: parseBatchSize(environment.ENTITLEMENT_RECOVERY_BATCH_SIZE),
    checkpointPath: parseCheckpointPath(
      environment.ENTITLEMENT_RECOVERY_CHECKPOINT_FILE
    ),
    ...(environment.NODE_ENV === "production"
      ? {
          imageDigest: parseImageDigest(
            environment.STUDYNOTION_API_IMAGE_DIGEST
          ),
        }
      : {}),
  })

const assertPrivateCheckpointDirectory = async (
  checkpointPath,
  fs = fileSystem
) => {
  let metadata
  try {
    metadata = await fs.lstat(path.dirname(checkpointPath))
  } catch (error) {
    throw checkpointError(error)
  }
  if (
    !metadata.isDirectory() ||
    metadata.isSymbolicLink() ||
    (metadata.mode & 0o077) !== 0 ||
    (typeof process.getuid === "function" &&
      metadata.uid !== process.getuid()) ||
    (typeof process.getgid === "function" && metadata.gid !== process.getgid())
  ) {
    throw checkpointError()
  }
}

const parseCheckpointDocument = (content) => {
  let document
  try {
    document = JSON.parse(content)
  } catch (error) {
    throw checkpointError(error)
  }
  const keys =
    document && typeof document === "object" && !Array.isArray(document)
      ? Object.keys(document).sort()
      : []
  const expectedKeys = document?.continuation
    ? ["continuation", "schemaVersion"]
    : ["schemaVersion"]
  if (
    keys.length !== expectedKeys.length ||
    keys.some((key, index) => key !== expectedKeys[index]) ||
    document.schemaVersion !== CHECKPOINT_SCHEMA_VERSION ||
    (document.continuation !== undefined &&
      !CANONICAL_OBJECT_ID.test(document.continuation))
  ) {
    throw checkpointError()
  }
  return document.continuation
}

const readCheckpoint = async (checkpointPath, fs = fileSystem) => {
  await assertPrivateCheckpointDirectory(checkpointPath, fs)
  let metadata
  try {
    metadata = await fs.lstat(checkpointPath)
  } catch (error) {
    if (error?.code === "ENOENT") return undefined
    throw checkpointError(error)
  }
  if (
    !metadata.isFile() ||
    metadata.isSymbolicLink() ||
    (metadata.mode & 0o7777) !== CHECKPOINT_FILE_MODE ||
    metadata.size < 1 ||
    metadata.size > CHECKPOINT_MAX_BYTES
  ) {
    throw checkpointError()
  }
  try {
    return parseCheckpointDocument(await fs.readFile(checkpointPath, "utf8"))
  } catch (error) {
    if (error?.code === "ENTITLEMENT_RECOVERY_SCHEDULER_CHECKPOINT") {
      throw error
    }
    throw checkpointError(error)
  }
}

const checkpointDocument = (continuation) =>
  `${JSON.stringify({
    schemaVersion: CHECKPOINT_SCHEMA_VERSION,
    ...(continuation ? { continuation } : {}),
  })}\n`

const writeCheckpoint = async (
  checkpointPath,
  continuation,
  fs = fileSystem
) => {
  if (continuation !== undefined && !CANONICAL_OBJECT_ID.test(continuation)) {
    throw checkpointError()
  }
  await assertPrivateCheckpointDirectory(checkpointPath, fs)

  const temporaryPath = path.join(
    path.dirname(checkpointPath),
    `.${path.basename(checkpointPath)}.${process.pid}.${crypto.randomBytes(8).toString("hex")}.tmp`
  )
  let handle
  try {
    handle = await fs.open(temporaryPath, "wx", CHECKPOINT_FILE_MODE)
    await handle.writeFile(checkpointDocument(continuation), "utf8")
    await handle.sync()
    await handle.close()
    handle = undefined
    await fs.chmod(temporaryPath, CHECKPOINT_FILE_MODE)
    await fs.rename(temporaryPath, checkpointPath)

    const metadata = await fs.lstat(checkpointPath)
    if (
      !metadata.isFile() ||
      metadata.isSymbolicLink() ||
      (metadata.mode & 0o7777) !== CHECKPOINT_FILE_MODE
    ) {
      throw checkpointError()
    }
  } catch (error) {
    if (handle) await handle.close().catch(() => undefined)
    await fs.unlink(temporaryPath).catch(() => undefined)
    if (error?.code === "ENTITLEMENT_RECOVERY_SCHEDULER_CHECKPOINT") {
      throw error
    }
    throw checkpointError(error)
  }
}

const safeRecoveryReport = (report) =>
  Object.freeze({
    schemaVersion: report.schemaVersion,
    status: report.status,
    startedAt: report.startedAt,
    completedAt: report.completedAt,
    durationMs: report.durationMs,
    limit: report.limit,
    catchUp: Object.freeze({
      activatedCount: report.catchUp.activatedCount,
      examinedCount: report.catchUp.examinedCount,
      failedCount: report.catchUp.failedCount,
      hasMore: report.catchUp.hasMore,
      reservedCount: report.catchUp.reservedCount,
      terminalizedCount: report.catchUp.terminalizedCount,
    }),
    recovery: Object.freeze({
      activated: report.recovery.activated,
      cancelled: report.recovery.cancelled,
      conflicts: report.recovery.conflicts,
      expiredLeasesReleased: report.recovery.expiredLeasesReleased,
      manualReviewRequired: report.recovery.manualReviewRequired,
      retried: report.recovery.retried,
      revoked: report.recovery.revoked,
    }),
  })

const runScheduledRecovery = async ({
  environment = process.env,
  fs = fileSystem,
  recoveryRunner = runRecovery,
} = {}) => {
  const configuration = parseSchedulerConfiguration(environment)
  const continuation = await readCheckpoint(configuration.checkpointPath, fs)
  const argv = ["--limit", String(configuration.batchSize)]
  if (continuation) argv.push("--continuation", continuation)

  const result = await recoveryRunner({ argv, environment })
  if (
    !result ||
    !new Set([EXIT_CODES.completed, EXIT_CODES.warning]).has(result.exitCode) ||
    !result.report?.catchUp ||
    typeof result.report.catchUp.hasMore !== "boolean"
  ) {
    throw new EntitlementRecoveryReportError(
      "The Entitlement recovery runner returned an invalid scheduled result"
    )
  }

  const nextContinuation = result.report.catchUp.hasMore
    ? result.report.catchUp.continuation
    : undefined
  await writeCheckpoint(configuration.checkpointPath, nextContinuation, fs)

  return Object.freeze({
    exitCode: result.exitCode,
    report: safeRecoveryReport(result.report),
  })
}

const classifyScheduledRecoveryError = (error) => {
  if (error?.code === "ENTITLEMENT_RECOVERY_SCHEDULER_CONFIGURATION") {
    return "configuration_error"
  }
  if (error?.code === "ENTITLEMENT_RECOVERY_SCHEDULER_CHECKPOINT") {
    return "checkpoint_error"
  }
  return classifyOperationalError(error)
}

const main = async ({
  runScheduled = runScheduledRecovery,
  setExitCode = (exitCode) => {
    process.exitCode = exitCode
  },
  writeError = (line) => process.stderr.write(line),
  writeOutput = (line) => process.stdout.write(line),
} = {}) => {
  try {
    const result = await runScheduled()
    const report = safeRecoveryReport(result.report)
    writeOutput(`${JSON.stringify(report)}\n`)
    setExitCode(result.exitCode)
    return Object.freeze({ exitCode: result.exitCode, report })
  } catch (error) {
    const report = {
      schemaVersion: 1,
      status: "operational_error",
      classification: classifyScheduledRecoveryError(error),
      error: logger.errorMetadata(error),
    }
    writeError(`${JSON.stringify(report)}\n`)
    setExitCode(EXIT_CODES.operational_error)
    return undefined
  }
}

if (require.main === module) {
  require("dotenv").config({ quiet: true })
  void main()
}

module.exports = {
  CHECKPOINT_FILE_MODE,
  CHECKPOINT_SCHEMA_VERSION,
  ScheduledRecoveryCheckpointError,
  ScheduledRecoveryConfigurationError,
  classifyScheduledRecoveryError,
  main,
  parseBatchSize,
  parseCheckpointDocument,
  parseCheckpointPath,
  parseImageDigest,
  parseSchedulerConfiguration,
  readCheckpoint,
  runScheduledRecovery,
  safeRecoveryReport,
  writeCheckpoint,
}
