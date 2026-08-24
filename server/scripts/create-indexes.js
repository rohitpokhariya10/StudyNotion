require("dotenv").config({ quiet: true })

const mongoose = require("mongoose")

const logger = require("../utils/logger")
const {
  mongoJobOptions,
  usesProductionPosture,
  validateMongoUriForEnvironment,
} = require("../utils/mongoDeployment")

const models = [
  require("../models/User"),
  require("../models/OTP"),
  require("../models/Course"),
  require("../models/Category"),
  require("../models/Profile"),
  require("../models/Section"),
  require("../models/Subsection"),
  require("../models/CourseProgress"),
  require("../models/RatingandReview"),
  require("../models/Purchase"),
  require("../models/Entitlement"),
  require("../models/EntitlementOperationAudit"),
]

const INDEX_CONFIRMATION = "create-indexes"
const INDEX_OPERATIONS = new Set(["create", "verify"])

class IndexConfigurationError extends Error {
  constructor(message) {
    super(message)
    this.name = "IndexConfigurationError"
    this.code = "INDEX_CONFIGURATION"
  }
}

const mongoOptions = (environment) => mongoJobOptions(environment)

const getOperation = (environment) => {
  const operation = (environment.INDEX_OPERATION || "create").trim()
  if (!INDEX_OPERATIONS.has(operation)) {
    throw new IndexConfigurationError(
      "INDEX_OPERATION must be create or verify"
    )
  }
  return operation
}

const verifyDeclaredIndexes = async ({ registeredModels = models } = {}) => {
  const reports = []

  for (const model of registeredModels) {
    const difference = await model.diffIndexes({ indexOptionsToCreate: true })
    reports.push({
      modelName: model.modelName,
      missing: difference.toCreate.length,
      extra: difference.toDrop.length,
    })
  }

  return Object.freeze({
    modelCount: reports.length,
    missingIndexCount: reports.reduce(
      (total, report) => total + report.missing,
      0
    ),
    extraIndexCount: reports.reduce((total, report) => total + report.extra, 0),
    reports: Object.freeze(reports),
  })
}

const run = async ({
  connect = mongoose.connect.bind(mongoose),
  environment = process.env,
  registeredModels = models,
  write = console.log,
} = {}) => {
  const mongoUrl = environment.MONGODB_URI || environment.MONGODB_URL
  if (!mongoUrl) throw new IndexConfigurationError("MONGODB_URI is required")
  validateMongoUriForEnvironment(mongoUrl, environment)

  const operation = getOperation(environment)
  if (
    operation === "create" &&
    environment.MIGRATION_CONFIRM !== INDEX_CONFIRMATION
  ) {
    throw new IndexConfigurationError(
      `Set MIGRATION_CONFIRM=${INDEX_CONFIRMATION} after verifying a backup`
    )
  }
  if (usesProductionPosture(environment)) {
    if (environment.MONGODB_AUTO_INDEX !== "false") {
      throw new IndexConfigurationError(
        "MONGODB_AUTO_INDEX=false is required for production index jobs"
      )
    }
  }

  await connect(mongoUrl, mongoOptions(environment))
  for (const model of registeredModels) {
    if (operation === "create") await model.createIndexes()
  }

  const verification = await verifyDeclaredIndexes({ registeredModels })
  const missingModels = verification.reports
    .filter((report) => report.missing > 0)
    .map((report) => report.modelName)
  if (missingModels.length) {
    throw new Error(
      `Required indexes are missing for ${missingModels.join(", ")}`
    )
  }
  for (const { modelName } of verification.reports) {
    write(
      operation === "create"
        ? `Indexes ready: ${modelName}`
        : `Indexes verified: ${modelName}`
    )
  }

  return { modelCount: registeredModels.length, operation }
}

const main = async ({
  disconnect = mongoose.disconnect.bind(mongoose),
  runIndexes = run,
  targetLogger = logger,
} = {}) => {
  try {
    return await runIndexes()
  } catch (error) {
    targetLogger.error("database.index_job_failed", {
      error: logger.errorMetadata(error),
    })
    process.exitCode = 1
    return undefined
  } finally {
    await disconnect()
  }
}

if (require.main === module) void main()

module.exports = {
  INDEX_CONFIRMATION,
  IndexConfigurationError,
  getOperation,
  main,
  models,
  mongoOptions,
  run,
  verifyDeclaredIndexes,
}
