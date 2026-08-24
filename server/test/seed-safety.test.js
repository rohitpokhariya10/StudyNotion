const assert = require("node:assert/strict")
const path = require("node:path")
const { spawnSync } = require("node:child_process")
const test = require("node:test")
const mongoose = require("mongoose")

const {
  analyzePurchaseCourseEvidence,
  purchaseAllowsActivation,
  purchaseIsInSidecarCohort,
} = require("../domains/entitlement/entitlementPurchaseEvidence")
const {
  createDemoSeedConfiguration,
  createSyntheticPurchaseDocument,
} = require("../scripts/seed")
const {
  assertSafeSeedTarget,
  DISPOSABLE_SEED_CONFIRMATION,
} = require("../utils/seedSafety")

const serverDirectory = path.resolve(__dirname, "..")
const boundary = "2026-08-24T00:00:00.000Z"

const demoEnvironment = (overrides = {}) => ({
  NODE_ENV: "development",
  ENTITLEMENT_SIDECAR_STARTED_AT: boundary,
  STUDYNOTION_DEMO_ADMIN_EMAIL: "configured-admin@example.test",
  STUDYNOTION_DEMO_ADMIN_PASSWORD: "AdminPassword@123",
  STUDYNOTION_DEMO_INSTRUCTOR_EMAIL: "configured-instructor@example.test",
  STUDYNOTION_DEMO_INSTRUCTOR_PASSWORD: "InstructorPassword@123",
  STUDYNOTION_DEMO_STUDENT_EMAIL: "configured-student@example.test",
  STUDYNOTION_DEMO_STUDENT_PASSWORD: "StudentPassword@123",
  ...overrides,
})

test("demo admin provisioning is disabled in production", () => {
  const result = spawnSync(process.execPath, ["seed"], {
    cwd: serverDirectory,
    encoding: "utf8",
    env: {
      ...process.env,
      NODE_ENV: "production",
      DEPLOYMENT_TIER: "",
      MONGODB_URI: "mongodb://127.0.0.1:1/must-not-connect",
      STUDYNOTION_DISPOSABLE_SEED_CONFIRM: "",
      STUDYNOTION_DEMO_SEED_MODE: "staging",
    },
    timeout: 5000,
  })

  assert.equal(result.status, 1)
  assert.match(
    `${result.stdout}\n${result.stderr}`,
    /Demo seed data is disabled in production/
  )
  assert.doesNotMatch(`${result.stdout}\n${result.stderr}`, /ECONNREFUSED/)
})

test("the production deployment tier always refuses the demo seed", () => {
  assert.throws(
    () =>
      assertSafeSeedTarget({
        demoSeedMode: "staging",
        deploymentTier: "production",
        disposableConfirmation: DISPOSABLE_SEED_CONFIRMATION,
        mongoUrl:
          "mongodb://database.example.test/studynotion_seed_disposable_preview",
        nodeEnv: "test",
      }),
    /disabled in production/
  )
})

test("production-style staging requires every independent disposable guard", () => {
  const mongoUrl =
    "mongodb+srv://seed:database-secret@database.example.test/studynotion_seed_disposable_preview?w=majority"
  const guarded = {
    demoSeedMode: "staging",
    deploymentTier: "staging",
    disposableConfirmation: DISPOSABLE_SEED_CONFIRMATION,
    mongoUrl,
    nodeEnv: "production",
  }

  assert.equal(assertSafeSeedTarget(guarded), mongoUrl)
  assert.equal(
    assertSafeSeedTarget({
      ...guarded,
      mongoUrl:
        "mongodb://seed:database-secret@database-a.example.test:27017,database-b.example.test:27018/studynotion_seed_disposable_preview?replicaSet=staging&tls=true&w=majority",
    }),
    "mongodb://seed:database-secret@database-a.example.test:27017,database-b.example.test:27018/studynotion_seed_disposable_preview?replicaSet=staging&tls=true&w=majority"
  )
  assert.throws(
    () => assertSafeSeedTarget({ ...guarded, demoSeedMode: "local" }),
    /disabled in production/
  )
  assert.throws(
    () =>
      assertSafeSeedTarget({
        ...guarded,
        disposableConfirmation: undefined,
      }),
    /disabled in production/
  )
  assert.throws(
    () =>
      assertSafeSeedTarget({
        ...guarded,
        mongoUrl: "mongodb://127.0.0.1:27017/studynotion_staging",
      }),
    /studynotion_seed_disposable_/
  )
})

test("demo identities are injected and local media remains explicitly local", () => {
  const configuration = createDemoSeedConfiguration(demoEnvironment(), {
    now: new Date("2026-08-24T01:00:00.000Z"),
  })

  assert.equal(configuration.mode, "local")
  assert.equal(
    configuration.accounts.Admin.email,
    "configured-admin@example.test"
  )
  assert.equal(configuration.accounts.Student.password, "StudentPassword@123")
  assert.equal(configuration.media.videoDeliveryType, "upload")
})

test("local demo mode preserves the documented zero-config identities", () => {
  const configuration = createDemoSeedConfiguration(
    { ENTITLEMENT_SIDECAR_STARTED_AT: boundary },
    { now: new Date("2026-08-24T01:00:00.000Z") }
  )

  assert.equal(configuration.accounts.Admin.email, "admin@studynotion.local")
  assert.equal(configuration.accounts.Admin.password, "Admin@123")
  assert.equal(
    configuration.accounts.Instructor.email,
    "instructor@studynotion.local"
  )
})

test("staging seed mode requires private operator-owned Cloudinary metadata", () => {
  const environment = demoEnvironment({
    STUDYNOTION_DEMO_SEED_MODE: "staging",
  })
  const now = new Date("2026-08-24T01:00:00.000Z")

  assert.throws(
    () => createDemoSeedConfiguration(environment, { now }),
    /CLOUD_NAME is required/
  )
  assert.throws(
    () =>
      createDemoSeedConfiguration(
        {
          ...environment,
          CLOUD_NAME: "staging-cloud",
          FOLDER_NAME: "studynotion-staging",
          STUDYNOTION_DEMO_VIDEO_FORMAT: "mp4",
          STUDYNOTION_DEMO_VIDEO_PUBLIC_ID: "production/demo-video",
        },
        { now }
      ),
    /must belong to FOLDER_NAME/
  )

  const configuration = createDemoSeedConfiguration(
    {
      ...environment,
      CLOUD_NAME: "staging-cloud",
      FOLDER_NAME: "studynotion-staging",
      STUDYNOTION_DEMO_VIDEO_FORMAT: "mp4",
      STUDYNOTION_DEMO_VIDEO_PUBLIC_ID: "studynotion-staging/demo/orientation",
    },
    { now }
  )

  assert.equal(configuration.mode, "staging")
  assert.equal(configuration.media.videoDeliveryType, "authenticated")
  assert.equal(
    configuration.media.videoUrl,
    "https://res.cloudinary.com/staging-cloud/video/authenticated/studynotion-staging/demo/orientation.mp4"
  )
  assert.doesNotMatch(configuration.media.videoUrl, /\/video\/upload\//)
})

test("synthetic demo Purchase is exact fulfilled sidecar recovery evidence", () => {
  const seededAt = new Date("2026-08-24T01:00:00.000Z")
  const studentId = new mongoose.Types.ObjectId()
  const course = {
    _id: new mongoose.Types.ObjectId(),
    courseName: "Foundations of Web Development",
    price: 1499,
  }
  const document = createSyntheticPurchaseDocument({
    courses: [{ course }],
    seededAt,
    studentId,
  })
  const evidence = { _id: new mongoose.Types.ObjectId(), ...document }

  assert.deepEqual(evidence.courses, [course._id])
  assert.deepEqual(evidence.activeCourses, [course._id])
  assert.equal(evidence.lineItems[0].amount, 149900)
  assert.equal(evidence.status, "fulfilled")
  assert.equal(analyzePurchaseCourseEvidence(evidence).ok, true)
  assert.equal(purchaseIsInSidecarCohort(evidence, new Date(boundary)), true)
  assert.equal(purchaseAllowsActivation(evidence), true)
})

test("normal local MongoDB seed targets remain allowed", () => {
  for (const mongoUrl of [
    "mongodb://localhost:27017/studynotion",
    "mongodb://127.0.0.1:27017/studynotion-local",
    "mongodb://[::1]:27017/studynotion_test",
    "mongodb://localhost:27017,127.0.0.1:27018/studynotion_test?replicaSet=local",
  ]) {
    assert.equal(
      assertSafeSeedTarget({ mongoUrl, nodeEnv: "development" }),
      mongoUrl
    )
  }
})

test("non-loopback targets are rejected without the exact disposable guard", () => {
  const remoteUrl =
    "mongodb://seed-user:seed-password@database.example.test/studynotion_seed_disposable_ci"

  assert.throws(
    () => assertSafeSeedTarget({ mongoUrl: remoteUrl, nodeEnv: "test" }),
    /exact disposable-seed confirmation/
  )
  assert.throws(
    () =>
      assertSafeSeedTarget({
        mongoUrl:
          "mongodb://127.0.0.1:27017,database.example.test:27018/studynotion_seed_disposable_ci?replicaSet=mixed",
        nodeEnv: "test",
      }),
    /exact disposable-seed confirmation/
  )
  assert.throws(
    () =>
      assertSafeSeedTarget({
        disposableConfirmation: DISPOSABLE_SEED_CONFIRMATION,
        mongoUrl: "mongodb://database.example.test/studynotion",
        nodeEnv: "test",
      }),
    /studynotion_seed_disposable_/
  )

  try {
    assertSafeSeedTarget({ mongoUrl: remoteUrl, nodeEnv: "test" })
    assert.fail("unsafe seed target was accepted")
  } catch (error) {
    assert.doesNotMatch(error.message, /seed-user|seed-password/)
  }

  const result = spawnSync(process.execPath, ["seed"], {
    cwd: serverDirectory,
    encoding: "utf8",
    env: {
      ...process.env,
      NODE_ENV: "development",
      DEPLOYMENT_TIER: "",
      MONGODB_URI: remoteUrl,
      STUDYNOTION_DISPOSABLE_SEED_CONFIRM: "",
      STUDYNOTION_DEMO_SEED_MODE: "local",
    },
    timeout: 5000,
  })
  const output = `${result.stdout}\n${result.stderr}`
  assert.equal(result.status, 1)
  assert.match(output, /exact disposable-seed confirmation/)
  assert.doesNotMatch(output, /seed-user|seed-password|ENOTFOUND/)
})

test("an explicitly confirmed disposable database can use a non-loopback host", () => {
  const mongoUrl =
    "mongodb+srv://temporary.example.test/studynotion_seed_disposable_preview_42"

  assert.equal(
    assertSafeSeedTarget({
      disposableConfirmation: DISPOSABLE_SEED_CONFIRMATION,
      mongoUrl,
      nodeEnv: "test",
    }),
    mongoUrl
  )
})

test("malformed and database-less MongoDB targets fail before connecting", () => {
  assert.throws(
    () =>
      assertSafeSeedTarget({ mongoUrl: "not-a-uri", nodeEnv: "development" }),
    /URI is invalid/
  )
  assert.throws(
    () =>
      assertSafeSeedTarget({
        mongoUrl: "mongodb://127.0.0.1:27017/",
        nodeEnv: "development",
      }),
    /must name one non-system MongoDB database/
  )
  assert.throws(
    () =>
      assertSafeSeedTarget({
        mongoUrl: "mongodb://127.0.0.1:27017/admin",
        nodeEnv: "development",
      }),
    /must name one non-system MongoDB database/
  )
  for (const mongoUrl of [
    "mongodb://localhost:27017,/studynotion",
    "mongodb://[::1:27017/studynotion",
    "mongodb+srv://one.example.test,two.example.test/studynotion",
  ]) {
    assert.throws(
      () => assertSafeSeedTarget({ mongoUrl, nodeEnv: "development" }),
      /MongoDB URI is invalid/
    )
  }
})
