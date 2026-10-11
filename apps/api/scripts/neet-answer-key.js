const { loadEnvironment } = require("../config/loadEnvironment")

const fs = require("node:fs")

const mongoose = require("mongoose")

const NeetMockTest = require("../modules/project-neet/models/NeetMockTest")
const {
  findLatestAnswerKey,
} = require("../modules/project-neet/repositories/paperVersionRepository")
const { createNeetServices } = require("../modules/project-neet/services")
const {
  mongoJobOptions,
  validateMongoUriForEnvironment,
} = require("../utils/mongoDeployment")

// Operator CLI for NEET answer keys (no student route reaches this).
//
//   NEET_KEY_COMMAND=show    NEET_TEST_SLUG=<slug>
//   NEET_KEY_COMMAND=correct NEET_TEST_SLUG=<slug> NEET_KEY_CHANGES=<file.json>
//     NEET_KEY_REASON="NTA final key" NEET_KEY_CONFIRM=correct-answer-key
//   NEET_KEY_COMMAND=rescore NEET_TEST_SLUG=<slug> NEET_KEY_CONFIRM=rescore
//
// The changes file is a JSON array such as
//   [{ "questionId": "...", "status": "DROPPED" },
//    { "questionId": "...", "status": "ACTIVE", "correctOptionKeys": ["A","C"] },
//    { "questionId": "...", "status": "ALL_CORRECT" }]
// Corrections create a new immutable key version; rescoring is idempotent and
// keeps each superseded result in resultHistory.

const COMMANDS = new Set(["show", "correct", "rescore"])

const run = async ({
  environment = process.env,
  services = createNeetServices(),
  write = console.log,
} = {}) => {
  const command = environment.NEET_KEY_COMMAND
  if (!COMMANDS.has(command)) {
    throw new TypeError("NEET_KEY_COMMAND must be show, correct or rescore")
  }
  const mongoUrl = environment.MONGODB_URI || environment.MONGODB_URL
  if (!mongoUrl) throw new TypeError("MONGODB_URI is required")
  validateMongoUriForEnvironment(mongoUrl, environment)
  await mongoose.connect(mongoUrl, mongoJobOptions(environment))

  const test = await NeetMockTest.findOne({ slug: environment.NEET_TEST_SLUG })
    .select({ _id: 1, slug: 1, currentPaperVersionId: 1 })
    .lean()
  if (!test?.currentPaperVersionId) {
    throw new TypeError("No published paper version for NEET_TEST_SLUG")
  }
  const paperVersionId = test.currentPaperVersionId

  if (command === "show") {
    const latest = await findLatestAnswerKey(paperVersionId)
    write(
      JSON.stringify(
        {
          test: test.slug,
          paperVersionId: String(paperVersionId),
          answerKeyVersion: latest?.version ?? null,
          reason: latest?.reason ?? null,
          changed: (latest?.keys || [])
            .filter(
              (entry) =>
                entry.status !== "ACTIVE" || entry.correctOptionKeys.length > 1
            )
            .map((entry) => ({
              questionId: String(entry.questionId),
              status: entry.status,
              correctOptionKeys: entry.correctOptionKeys,
            })),
        },
        null,
        2
      )
    )
    return { command }
  }

  if (command === "correct") {
    if (environment.NEET_KEY_CONFIRM !== "correct-answer-key") {
      throw new TypeError("Set NEET_KEY_CONFIRM=correct-answer-key")
    }
    const changes = JSON.parse(
      fs.readFileSync(environment.NEET_KEY_CHANGES, "utf8")
    )
    const { answerKey, created } = await services.papers.correctAnswerKey({
      changes,
      createdBy: "operator-cli",
      paperVersionId,
      reason: environment.NEET_KEY_REASON,
    })
    write(
      created
        ? `Created answer-key version ${answerKey.version}. Run the rescore command next.`
        : `No change: answer-key version ${answerKey.version} already matches.`
    )
    return { command, version: answerKey.version, created }
  }

  if (environment.NEET_KEY_CONFIRM !== "rescore") {
    throw new TypeError("Set NEET_KEY_CONFIRM=rescore")
  }
  const summary = await services.papers.rescorePaper({ paperVersionId })
  write(
    `Rescored ${summary.rescored} attempts with key version ${summary.answerKeyVersion}. ` +
      `${summary.pendingFinalization} attempts are still finalising; rerun later to include them.`
  )
  return { command, ...summary }
}

const main = async () => {
  loadEnvironment()
  try {
    await run()
  } catch (error) {
    console.error(
      "NEET answer-key command failed:",
      error?.message || error?.name
    )
    process.exitCode = 1
  } finally {
    await mongoose.disconnect().catch(() => {
      process.exitCode = 1
    })
  }
}

if (require.main === module) void main()

module.exports = { run }
