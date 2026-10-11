// Seeds a DISPOSABLE database for NEET end-to-end and smoke runs: the sample
// mocks (published as immutable paper versions) and N students with a shared
// password and a current policy acceptance. Refuses any target that is not a
// loopback host with a studynotion_neet_e2e_* database name.

const bcrypt = require("bcryptjs")
const mongoose = require("mongoose")

const Profile = require("../apps/api/models/Profile")
const User = require("../apps/api/models/User")
const projectNeetModels = require("../apps/api/modules/project-neet/models")
const {
  seedSampleMocks,
} = require("../apps/api/modules/project-neet/content/seedSampleMocks")
const NeetMockTest = require("../apps/api/modules/project-neet/models/NeetMockTest")
const { createPolicyAcceptance } = require("../apps/api/utils/policyAcceptance")

const assertDisposable = (uri) => {
  const url = new URL(uri)
  if (!["127.0.0.1", "localhost"].includes(url.hostname)) {
    throw new Error("The NEET e2e seed only targets loopback MongoDB")
  }
  if (!/^\/studynotion_neet_e2e_[a-z0-9_]+$/i.test(url.pathname)) {
    throw new Error("The NEET e2e seed needs a studynotion_neet_e2e_* database")
  }
}

// Candidate names allow letters only, so seeded names use letter suffixes.
const letters = (value) => {
  let text = ""
  let rest = value
  do {
    text = String.fromCharCode(65 + (rest % 26)) + text
    rest = Math.floor(rest / 26) - 1
  } while (rest >= 0)
  return text
}

const run = async () => {
  const uri = process.env.MONGODB_URI
  assertDisposable(uri)
  const students = Number(process.env.NEET_E2E_STUDENTS || 1)
  const password = process.env.NEET_E2E_PASSWORD
  if (!password || password.length < 8) {
    throw new Error("NEET_E2E_PASSWORD (8+ characters) is required")
  }
  await mongoose.connect(uri)
  for (const model of [User, Profile, ...projectNeetModels]) {
    await model.createIndexes()
  }
  await seedSampleMocks({ write: () => {} })
  const tests = await NeetMockTest.find({ status: "PUBLISHED" })
    .select({ _id: 1, slug: 1, title: 1, durationSeconds: 1 })
    .sort({ displayOrder: 1 })
    .lean()

  const hash = await bcrypt.hash(password, 12)
  const now = new Date()
  const created = []
  for (let index = 0; index < students; index += 1) {
    const email = `neet-student-${index}@example.test`
    const profile = await Profile.create({})
    const user = await User.create({
      firstName: "Asha",
      lastName: `Student ${letters(index)}`,
      email,
      password: hash,
      accountType: "Student",
      active: true,
      approved: true,
      sessionVersion: 0,
      additionalDetails: profile._id,
      image: "",
      policyAcceptances: [createPolicyAcceptance("local_seed", now)],
    })
    created.push({ id: String(user._id), email })
  }
  process.stdout.write(
    `${JSON.stringify({
      tests: tests.map((test) => ({
        id: String(test._id),
        slug: test.slug,
        title: test.title,
        durationSeconds: test.durationSeconds,
      })),
      students: created,
    })}\n`
  )
}

run()
  .catch((error) => {
    process.stderr.write(`NEET e2e seed failed: ${error.message}\n`)
    process.exitCode = 1
  })
  .finally(() => mongoose.disconnect())
