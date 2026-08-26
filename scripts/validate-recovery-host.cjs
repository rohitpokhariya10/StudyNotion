const fs = require("node:fs")
const path = require("node:path")

const CANONICAL_STATE_DIRECTORY = "/var/lib/studynotion/entitlement-recovery"
const MAX_ENVIRONMENT_FILE_BYTES = 32 * 1024
const REQUIRED_KEYS = new Set([
  "MONGODB_URI",
  "ENTITLEMENT_SIDECAR_STARTED_AT",
  "ENTITLEMENT_RECOVERY_CONFIRM",
])
const ALLOWED_KEYS = new Set([
  ...REQUIRED_KEYS,
  "MONGODB_CONNECT_TIMEOUT_MS",
  "MONGODB_SERVER_SELECTION_TIMEOUT_MS",
  "MONGODB_SOCKET_TIMEOUT_MS",
  "MONGODB_OPERATION_TIMEOUT_MS",
])
const STRICT_UTC_TIMESTAMP = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/

class RecoveryHostConfigurationError extends Error {
  constructor(message) {
    super(message)
    this.name = "RecoveryHostConfigurationError"
    this.code = "ENTITLEMENT_RECOVERY_HOST_CONFIGURATION"
  }
}

const fail = (message) => {
  throw new RecoveryHostConfigurationError(message)
}

const parseEnvironmentFile = (contents) => {
  if (Buffer.byteLength(contents, "utf8") > MAX_ENVIRONMENT_FILE_BYTES) {
    fail("The recovery environment file is unexpectedly large")
  }

  const parsed = new Map()
  for (const [index, sourceLine] of contents.split(/\r?\n/).entries()) {
    const line = sourceLine.trim()
    if (!line || line.startsWith("#")) continue
    const match = /^([A-Z][A-Z0-9_]*)=(.*)$/.exec(line)
    if (!match) {
      fail(`Recovery environment line ${index + 1} is invalid`)
    }
    const [, name, rawValue] = match
    if (!ALLOWED_KEYS.has(name)) {
      fail(`Recovery environment contains disallowed variable ${name}`)
    }
    if (parsed.has(name)) {
      fail(`Recovery environment repeats variable ${name}`)
    }
    const value = rawValue.trim()
    if (!value) fail(`Recovery environment variable ${name} is empty`)
    parsed.set(name, value)
  }

  for (const name of REQUIRED_KEYS) {
    if (!parsed.has(name)) {
      fail(`Recovery environment is missing required variable ${name}`)
    }
  }
  if (parsed.get("ENTITLEMENT_RECOVERY_CONFIRM") !== "reconcile-entitlements") {
    fail("ENTITLEMENT_RECOVERY_CONFIRM must equal reconcile-entitlements")
  }

  const boundaryText = parsed.get("ENTITLEMENT_SIDECAR_STARTED_AT")
  const boundary = new Date(boundaryText)
  if (
    !STRICT_UTC_TIMESTAMP.test(boundaryText) ||
    !Number.isFinite(boundary.getTime()) ||
    boundary.toISOString() !== boundaryText
  ) {
    fail("ENTITLEMENT_SIDECAR_STARTED_AT must be an exact UTC ISO timestamp")
  }

  const timeoutMaximums = new Map([
    ["MONGODB_CONNECT_TIMEOUT_MS", 60_000],
    ["MONGODB_SERVER_SELECTION_TIMEOUT_MS", 60_000],
    ["MONGODB_SOCKET_TIMEOUT_MS", 10_000],
    ["MONGODB_OPERATION_TIMEOUT_MS", 10_000],
  ])
  for (const [name, maximum] of timeoutMaximums) {
    if (!parsed.has(name)) continue
    const value = Number(parsed.get(name))
    if (!Number.isSafeInteger(value) || value < 1_000 || value > maximum) {
      fail(`${name} must be an integer from 1000 through ${maximum}`)
    }
  }

  return parsed
}

const assertPathOutsideRepository = (targetPath, repositoryRoot) => {
  const relative = path.relative(repositoryRoot, targetPath)
  if (
    relative === "" ||
    (!path.isAbsolute(relative) &&
      !relative.startsWith(`..${path.sep}`) &&
      relative !== "..")
  ) {
    fail(
      "The recovery environment file must be stored outside the Git checkout"
    )
  }
}

const assertRealPath = (targetPath, filesystem, description) => {
  let realPath
  try {
    realPath = filesystem.realpathSync(targetPath)
  } catch {
    fail(`${description} is unavailable`)
  }
  if (realPath !== targetPath) fail(`${description} must not traverse symlinks`)
}

const validateRecoveryHost = ({
  environment = process.env,
  expectedStateDirectory = CANONICAL_STATE_DIRECTORY,
  filesystem = fs,
  repositoryRoot = process.cwd(),
  platform = process.platform,
  uid = typeof process.getuid === "function" ? process.getuid() : undefined,
} = {}) => {
  const environmentFile = environment.STUDYNOTION_ENTITLEMENT_RECOVERY_ENV_FILE
  const stateDirectory = environment.STUDYNOTION_ENTITLEMENT_RECOVERY_STATE_DIR
  if (!environmentFile || !path.isAbsolute(environmentFile)) {
    fail("STUDYNOTION_ENTITLEMENT_RECOVERY_ENV_FILE must be an absolute path")
  }
  if (stateDirectory !== expectedStateDirectory) {
    fail(
      `STUDYNOTION_ENTITLEMENT_RECOVERY_STATE_DIR must equal ${expectedStateDirectory}`
    )
  }

  const normalizedEnvironmentFile = path.normalize(environmentFile)
  const normalizedStateDirectory = path.normalize(stateDirectory)
  if (normalizedEnvironmentFile !== environmentFile) {
    fail("STUDYNOTION_ENTITLEMENT_RECOVERY_ENV_FILE must be canonical")
  }
  assertPathOutsideRepository(
    normalizedEnvironmentFile,
    path.resolve(repositoryRoot)
  )

  let fileMetadata
  let stateMetadata
  try {
    fileMetadata = filesystem.lstatSync(normalizedEnvironmentFile)
    stateMetadata = filesystem.lstatSync(normalizedStateDirectory)
  } catch {
    fail("Recovery host files are unavailable")
  }
  if (
    !fileMetadata.isFile() ||
    fileMetadata.isSymbolicLink() ||
    (platform !== "win32" &&
      ((fileMetadata.mode & 0o7777) !== 0o600 ||
        (uid !== undefined && fileMetadata.uid !== uid)))
  ) {
    fail("The recovery environment file must be owner-controlled mode 0600")
  }
  if (
    !stateMetadata.isDirectory() ||
    stateMetadata.isSymbolicLink() ||
    (platform !== "win32" && (stateMetadata.mode & 0o7777) !== 0o700)
  ) {
    fail(
      "The recovery state directory must be a non-symlink mode 0700 directory"
    )
  }
  assertRealPath(
    normalizedEnvironmentFile,
    filesystem,
    "The recovery environment file"
  )
  assertRealPath(
    normalizedStateDirectory,
    filesystem,
    "The recovery state directory"
  )

  const parsed = parseEnvironmentFile(
    filesystem.readFileSync(normalizedEnvironmentFile, "utf8")
  )
  return Object.freeze({
    variableNames: Object.freeze([...parsed.keys()].sort()),
  })
}

if (require.main === module) {
  try {
    validateRecoveryHost()
    process.stdout.write("Entitlement recovery host inputs validated\n")
  } catch (error) {
    process.stderr.write(`${error.message}\n`)
    process.exitCode = 1
  }
}

module.exports = {
  ALLOWED_KEYS,
  CANONICAL_STATE_DIRECTORY,
  parseEnvironmentFile,
  RecoveryHostConfigurationError,
  validateRecoveryHost,
}
