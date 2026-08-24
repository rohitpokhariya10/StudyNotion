const assert = require("node:assert/strict")
const test = require("node:test")

const { resolveLiveEnvironment } = require("../../e2e/live-environment.cjs")

const publicCredentials = Object.freeze({
  STUDYNOTION_LIVE_ADMIN_EMAIL: "admin@staging.example.test",
  STUDYNOTION_LIVE_ADMIN_PASSWORD: "StagingAdmin@123",
  STUDYNOTION_LIVE_INSTRUCTOR_EMAIL: "instructor@staging.example.test",
  STUDYNOTION_LIVE_INSTRUCTOR_PASSWORD: "StagingInstructor@123",
  STUDYNOTION_LIVE_STUDENT_EMAIL: "student@staging.example.test",
  STUDYNOTION_LIVE_STUDENT_PASSWORD: "StagingStudent@123",
})

test("live E2E defaults use the canonical loopback origin and local accounts", () => {
  const configuration = resolveLiveEnvironment({})

  assert.equal(configuration.baseURL, "http://localhost:3000")
  assert.equal(configuration.loopback, true)
  assert.deepEqual(configuration.credentials.student, {
    email: "student@studynotion.local",
    password: "Student@123",
  })
})

test("loopback live E2E follows configured demo identities", () => {
  const configuration = resolveLiveEnvironment({
    STUDYNOTION_DEMO_ADMIN_EMAIL: "local-admin@example.test",
    STUDYNOTION_DEMO_ADMIN_PASSWORD: "LocalAdmin@123",
    STUDYNOTION_DEMO_INSTRUCTOR_EMAIL: "local-instructor@example.test",
    STUDYNOTION_DEMO_INSTRUCTOR_PASSWORD: "LocalInstructor@123",
    STUDYNOTION_DEMO_STUDENT_EMAIL: "local-student@example.test",
    STUDYNOTION_DEMO_STUDENT_PASSWORD: "LocalStudent@123",
  })

  assert.equal(
    configuration.credentials.instructor.email,
    "local-instructor@example.test"
  )
  assert.equal(
    configuration.credentials.instructor.password,
    "LocalInstructor@123"
  )
})

test("public live E2E targets fail closed without explicit credentials", () => {
  assert.throws(
    () =>
      resolveLiveEnvironment({
        STUDYNOTION_LIVE_BASE_URL: "https://staging.example.test",
      }),
    /requires STUDYNOTION_LIVE_ADMIN_EMAIL/
  )
  assert.throws(
    () =>
      resolveLiveEnvironment({
        STUDYNOTION_LIVE_BASE_URL: "http://staging.example.test",
        ...publicCredentials,
      }),
    /must use HTTPS/
  )
})

test("public live E2E targets use only injected live credentials", () => {
  const configuration = resolveLiveEnvironment({
    STUDYNOTION_LIVE_BASE_URL: "https://staging.example.test",
    ...publicCredentials,
  })

  assert.equal(configuration.baseURL, "https://staging.example.test")
  assert.equal(configuration.loopback, false)
  assert.deepEqual(configuration.credentials.admin, {
    email: "admin@staging.example.test",
    password: "StagingAdmin@123",
  })
})
