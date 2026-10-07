const mongoose = require("mongoose")

const { loadEnvironment } = require("../config/loadEnvironment")
const projectNeetModels = require("../modules/project-neet/models")
const {
  seedSampleMocks,
} = require("../modules/project-neet/content/seedSampleMocks")
const {
  mongoJobOptions,
  validateMongoUriForEnvironment,
} = require("../utils/mongoDeployment")
const { assertSafeSeedTarget, SeedSafetyError } = require("../utils/seedSafety")

// Seeds ORIGINAL sample Project NEET mocks for development and demos. It uses
// the same disposable-target guard as the StudyNotion demo seed: loopback
// targets by default, never production, and an explicit confirmation plus a
// disposable database name for anything else.
const seedProjectNeet = async ({
  environment = process.env,
  write = console.log,
} = {}) => {
  const mongoUrl = assertSafeSeedTarget({
    demoSeedMode: environment.STUDYNOTION_DEMO_SEED_MODE,
    deploymentTier: environment.DEPLOYMENT_TIER,
    disposableConfirmation: environment.STUDYNOTION_DISPOSABLE_SEED_CONFIRM,
    mongoUrl: environment.MONGODB_URI || environment.MONGODB_URL,
    nodeEnv: environment.NODE_ENV,
  })
  validateMongoUriForEnvironment(mongoUrl, environment)
  await mongoose.connect(mongoUrl, mongoJobOptions(environment))
  // Non-destructive: creates missing declared indexes, never drops any.
  for (const model of projectNeetModels) await model.createIndexes()
  return seedSampleMocks({ write })
}

const runCli = async () => {
  loadEnvironment()
  try {
    await seedProjectNeet()
  } catch (error) {
    const safeReason =
      error instanceof SeedSafetyError
        ? error.message
        : /^[A-Za-z][A-Za-z0-9]*Error$/.test(error?.name || "")
          ? error.name
          : "Seed operation failed"
    console.error("Failed to seed Project NEET sample mocks:", safeReason)
    process.exitCode = 1
  } finally {
    try {
      await mongoose.disconnect()
    } catch {
      process.exitCode = 1
    }
  }
}

if (require.main === module) void runCli()

module.exports = { seedProjectNeet }
