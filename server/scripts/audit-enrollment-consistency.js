const mongoose = require("mongoose")

const {
  MAX_SAMPLE_LIMIT,
  createEnrollmentConsistencyService,
} = require("../domains/enrollment/enrollmentConsistencyService")
const {
  assertEnrollmentConsistencyReport,
} = require("../domains/enrollment/enrollmentConsistencyReport")
const logger = require("../utils/logger")
const {
  mongoJobOptions,
  validateMongoUriForEnvironment,
} = require("../utils/mongoDeployment")

const EXIT_CODES = Object.freeze({
  healthy: 0,
  warning: 1,
  blocking: 2,
  operational_error: 3,
})

const HELP_TEXT = [
  "StudyNotion enrollment consistency audit",
  "",
  "Usage:",
  "  npm --workspace studynotion-backend run enrollment:audit -- [options]",
  "",
  "Options:",
  "  --dry-run              Include proposed writes without executing them",
  `  --sample-limit <0-${MAX_SAMPLE_LIMIT}>  Limit detailed pair samples`,
  "  -h, --help             Show this help without connecting to MongoDB",
  "",
  "Exit codes: 0 healthy, 1 warning, 2 blocking, 3 operational error",
].join("\n")

class EnrollmentAuditConfigurationError extends Error {
  constructor(message) {
    super(message)
    this.name = "EnrollmentAuditConfigurationError"
    this.code = "ENROLLMENT_AUDIT_CONFIGURATION"
  }
}

class EnrollmentAuditReportError extends Error {
  constructor() {
    super("Enrollment audit returned an invalid report")
    this.name = "EnrollmentAuditReportError"
    this.code = "ENROLLMENT_AUDIT_INVALID_REPORT"
  }
}

const parseInteger = (value, name, { maximum, minimum }) => {
  const parsed = Number(value)
  if (!Number.isSafeInteger(parsed) || parsed < minimum || parsed > maximum) {
    throw new EnrollmentAuditConfigurationError(
      `${name} must be an integer from ${minimum} through ${maximum}`
    )
  }
  return parsed
}

const parseArguments = (argv) => {
  let help = false
  let mode = "read_only"
  let sampleLimit = MAX_SAMPLE_LIMIT

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index]
    if (argument === "--help" || argument === "-h") {
      help = true
      continue
    }
    if (argument === "--dry-run") {
      mode = "dry_run"
      continue
    }
    if (argument === "--sample-limit") {
      index += 1
      if (index >= argv.length) {
        throw new EnrollmentAuditConfigurationError(
          "--sample-limit requires an integer value"
        )
      }
      sampleLimit = parseInteger(argv[index], "--sample-limit", {
        maximum: MAX_SAMPLE_LIMIT,
        minimum: 0,
      })
      continue
    }
    throw new EnrollmentAuditConfigurationError(
      `Unsupported enrollment audit argument: ${argument}`
    )
  }

  return help ? { help: true } : { mode, sampleLimit }
}

const mongoOptions = (environment) => mongoJobOptions(environment)

const classifyOperationalError = (error) => {
  if (error?.code === "ENROLLMENT_AUDIT_CONFIGURATION") {
    return "configuration_error"
  }
  if (error?.code === "ENROLLMENT_AUDIT_INVALID_REPORT") {
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

const createOperationalLogger = (stream = process.stderr) =>
  logger.createLogger({
    write: (line) => stream.write(`${line}\n`),
  })

const run = async ({
  argv = process.argv.slice(2),
  connect = mongoose.connect.bind(mongoose),
  disconnect = mongoose.disconnect.bind(mongoose),
  environment = process.env,
  serviceFactory = createEnrollmentConsistencyService,
  targetLogger = createOperationalLogger(),
} = {}) => {
  let connected = false
  try {
    const options = parseArguments(argv)
    if (options.help) {
      return { exitCode: EXIT_CODES.healthy, help: HELP_TEXT }
    }
    const mongoUrl = environment.MONGODB_URI || environment.MONGODB_URL
    if (!mongoUrl) {
      throw new EnrollmentAuditConfigurationError("MONGODB_URI is required")
    }
    validateMongoUriForEnvironment(mongoUrl, environment)
    await connect(mongoUrl, mongoOptions(environment))
    connected = true
    const report = await serviceFactory({ targetLogger }).audit(options)
    try {
      assertEnrollmentConsistencyReport(report, { expectedMode: options.mode })
    } catch {
      throw new EnrollmentAuditReportError()
    }
    return { exitCode: EXIT_CODES[report.status], report }
  } finally {
    if (connected) await disconnect()
  }
}

const main = async () => {
  require("dotenv").config({ quiet: true })
  try {
    const result = await run()
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
  EXIT_CODES,
  EnrollmentAuditConfigurationError,
  EnrollmentAuditReportError,
  HELP_TEXT,
  classifyOperationalError,
  createOperationalLogger,
  mongoOptions,
  parseArguments,
  run,
}
