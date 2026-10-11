const { loadEnvironment } = require("../config/loadEnvironment")

const mongoose = require("mongoose")

const NeetAttempt = require("../modules/project-neet/models/NeetAttempt")
const NeetMockTest = require("../modules/project-neet/models/NeetMockTest")
const { createNeetServices } = require("../modules/project-neet/services")
const {
  mongoJobOptions,
  validateMongoUriForEnvironment,
} = require("../utils/mongoDeployment")

// NEET M2 data migration. Dry-run by default; applies only with
// MIGRATION_CONFIRM=neet-m2 after the new indexes exist (run create-indexes
// first). Both steps are idempotent and additive:
//   1. Publish an immutable paper version for every test without one, so new
//      attempts start on frozen content. Running attempts keep their legacy
//      path until they finish.
//   2. Remove the phone and email copies from attempts (decision 3); the
//      attempt stays owned by userId and keeps the display name.
//
// NEET_M2_STEPS selects steps (papers, contacts, or all; default all).
// Release order: run "papers" before deploying (older code ignores the new
// fields), deploy, confirm the release, then run "contacts" — the previous
// release reads candidate.email/phone, so removing them must wait until a
// rollback to it is no longer needed.
const CONFIRMATION = "neet-m2"
const STEPS = new Set(["papers", "contacts", "all"])

class MigrationConfigurationError extends Error {
  constructor(message) {
    super(message)
    this.name = "MigrationConfigurationError"
  }
}

const CONTACT_FILTER = {
  $or: [
    { "candidate.email": { $exists: true } },
    { "candidate.phone": { $exists: true } },
  ],
}

const run = async ({
  connect = mongoose.connect.bind(mongoose),
  environment = process.env,
  services = createNeetServices(),
  write = console.log,
} = {}) => {
  const mongoUrl = environment.MONGODB_URI || environment.MONGODB_URL
  if (!mongoUrl)
    throw new MigrationConfigurationError("MONGODB_URI is required")
  validateMongoUriForEnvironment(mongoUrl, environment)
  const apply = environment.MIGRATION_CONFIRM === CONFIRMATION
  const step = environment.NEET_M2_STEPS || "all"
  if (!STEPS.has(step)) {
    throw new MigrationConfigurationError(
      "NEET_M2_STEPS must be papers, contacts or all"
    )
  }
  await connect(mongoUrl, mongoJobOptions(environment))
  write(
    `${apply ? "Applying" : "Dry run of"} NEET M2 migration (steps: ${step}).`
  )

  const tests =
    step === "contacts"
      ? []
      : await NeetMockTest.find({ currentPaperVersionId: null })
          .select({ _id: 1, slug: 1, status: 1 })
          .lean()
  const papers = { published: 0, failed: 0, pending: tests.length }
  for (const test of tests) {
    if (!apply) {
      write(`Would publish a paper version for ${test.slug} (${test.status})`)
      continue
    }
    try {
      const { paperVersion } = await services.papers.publishCurrentPaper({
        publishedBy: "migration:neet-m2",
        testId: test._id,
      })
      papers.published += 1
      write(`Published ${test.slug} paper v${paperVersion.version}`)
    } catch (error) {
      papers.failed += 1
      write(
        `Could not publish ${test.slug}: ${String(error?.message || error?.name)}`
      )
    }
  }

  const contacts =
    step === "papers" ? 0 : await NeetAttempt.countDocuments(CONTACT_FILTER)
  let removed = 0
  if (apply && contacts) {
    const result = await NeetAttempt.collection.updateMany(CONTACT_FILTER, {
      $unset: { "candidate.email": "", "candidate.phone": "" },
    })
    removed = result.modifiedCount
  }
  write(
    apply
      ? `Removed contact details from ${removed} attempts.`
      : `Would remove contact details from ${contacts} attempts.`
  )
  return { apply, papers, contacts, removed }
}

const main = async () => {
  loadEnvironment()
  try {
    const summary = await run()
    if (summary.papers.failed) process.exitCode = 1
  } catch (error) {
    console.error(
      "NEET M2 migration failed:",
      error instanceof MigrationConfigurationError ? error.message : error?.name
    )
    process.exitCode = 1
  } finally {
    await mongoose.disconnect().catch(() => {
      process.exitCode = 1
    })
  }
}

if (require.main === module) void main()

module.exports = { CONFIRMATION, run }
