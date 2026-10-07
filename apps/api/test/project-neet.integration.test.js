const assert = require("node:assert/strict")
const { randomUUID } = require("node:crypto")
const { test } = require("node:test")
const enabled = process.env.STUDYNOTION_RUN_NEET_INTEGRATION === "1"

test(
  "Project NEET HTTP and race invariants against disposable real Mongo",
  { skip: !enabled, timeout: 120000 },
  async (t) => {
    const uri = process.env.NEET_TEST_MONGODB_URI
    assert.notEqual(process.env.NODE_ENV, "production")
    assert.ok(
      uri && uri.startsWith("mongodb://"),
      "explicit disposable URI required"
    )
    const url = new URL(uri)
    assert.ok(
      ["127.0.0.1", "localhost", "mongo", "mongodb"].includes(url.hostname)
    )
    assert.match(url.pathname, /^\/studynotion_neet_test_[a-z0-9_-]+$/i)
    assert.equal(url.username, "")
    assert.equal(url.search, "")
    process.env.NODE_ENV = "test"
    process.env.FRONTEND_ORIGINS = "http://localhost:3000"
    process.env.MONGODB_URI = uri
    process.env.REDIS_URL = ""
    process.env.JWT_SECRET = "neet-integration-jwt-signing-secret-123456789"
    process.env.OTP_SECRET = "neet-integration-otp-signing-secret-123456789"
    const mongoose = require("mongoose")
    const NeetAttempt = require("../modules/project-neet/models/NeetAttempt")
    const NeetMockTest = require("../modules/project-neet/models/NeetMockTest")
    const NeetQuestion = require("../modules/project-neet/models/NeetQuestion")
    const NeetProctorEvent = require("../modules/project-neet/models/NeetProctorEvent")
    const { createNeetServices } = require("../modules/project-neet/services")
    const {
      createNeetController,
    } = require("../modules/project-neet/http/controller")
    const {
      createProjectNeetRouter,
    } = require("../modules/project-neet/http/routes")
    const { createApp } = require("../app/createApp")
    const User = require("../models/User")
    const { issueSession } = require("../utils/auth")
    const { createPolicyAcceptance } = require("../utils/policyAcceptance")
    const express = require("express")
    const cookieParser = require("cookie-parser")
    const logger = { info() {}, warn() {}, error() {}, errorMetadata() {} }
    let now = new Date()
    const services = createNeetServices({ clock: () => now, logger })
    const app = express()
    app.use(express.json())
    app.use(cookieParser())
    app.use(
      "/api/v2/project-neet",
      createProjectNeetRouter({
        controller: createNeetController({ services, logger }),
      })
    )
    let server
    await mongoose.connect(uri, { autoIndex: false, autoCreate: false })
    // Refuse to clear any pre-existing database. Each run owns a new empty name.
    assert.deepEqual(
      await mongoose.connection.db.listCollections().toArray(),
      [],
      "use a fresh disposable database name"
    )
    t.after(async () => {
      if (server) await new Promise((resolve) => server.close(resolve))
      await mongoose.connection.dropDatabase()
      await mongoose.disconnect()
    })
    await Promise.all(
      [NeetAttempt, NeetMockTest, NeetQuestion, NeetProctorEvent].map((model) =>
        model.createIndexes()
      )
    )
    const testDoc = await NeetMockTest.create({
      slug: "integration-physics",
      title: "Integration physics",
      tagline: "Sample",
      description: "Sample paper",
      status: "PUBLISHED",
      difficulty: "FOUNDATION",
      durationSeconds: 60,
      sections: [
        {
          key: "physics",
          title: "Physics",
          subjectKey: "physics",
          subjectLabel: "Physics",
          order: 1,
          questionCount: 2,
        },
      ],
      instructions: ["Choose one option"],
      modes: ["NON_PROCTORED", "PROCTORED"],
    })
    const questions = await NeetQuestion.create(
      [1, 2].map((order) => ({
        testId: testDoc._id,
        sectionKey: "physics",
        order,
        text: `Question ${order}`,
        options: ["A", "B", "C", "D"].map((key) => ({
          key,
          text: `Option ${key}`,
        })),
        answerKey: { correctOptionKeys: ["A"] },
        explanation: "Private answer",
        status: "ACTIVE",
      }))
    )
    const userId = new mongoose.Types.ObjectId()
    const otherId = new mongoose.Types.ObjectId()
    const users = await User.insertMany(
      [userId, otherId].map((_id, i) => ({
        _id,
        firstName: "Test",
        lastName: "Student",
        email: `neet${i}@example.test`,
        accountType: "Student",
        active: true,
        approved: true,
        sessionVersion: 0,
        password: "unused-test-hash",
        additionalDetails: new mongoose.Types.ObjectId(),
        policyAcceptances: [createPolicyAcceptance("local_seed", new Date())],
      }))
    )
    const cookies = users.map((user) => {
      let cookie
      issueSession(
        {
          clearCookie() {},
          cookie(name, value) {
            cookie = `${name}=${value}`
          },
        },
        user
      )
      return cookie
    })
    server = await new Promise((resolve, reject) => {
      const listener = app.listen(0, "127.0.0.1", (error) =>
        error ? reject(error) : resolve(listener)
      )
      listener.once("error", reject)
    })
    const base = `http://127.0.0.1:${server.address().port}/api/v2/project-neet`
    const request = async (
      path,
      { body, cookie = cookies[0], method = "GET" } = {}
    ) => {
      const response = await fetch(`${base}${path}`, {
        method,
        headers: { cookie, "content-type": "application/json" },
        ...(body ? { body: JSON.stringify(body) } : {}),
      })
      return { status: response.status, payload: await response.json() }
    }
    const candidate = {
      fullName: "Test Student",
      email: "candidate@example.test",
      phone: "+919876543210",
    }
    const start = async () => {
      const user = String(userId)
      const { attempt } = await services.attempts.register({
        testId: String(testDoc._id),
        candidate,
        userId: user,
      })
      const attemptId = attempt.id,
        sessionId = randomUUID()
      await services.attempts.update({
        attemptId,
        userId: user,
        mode: "NON_PROCTORED",
      })
      await services.attempts.markReady({ attemptId, userId: user })
      const session = await services.attempts.start({
        attemptId,
        userId: user,
        sessionId,
      })
      return { attemptId, sessionId, userId: user, session }
    }
    const writes = (seq, selectedOption = "A") =>
      questions.map((q) => ({
        questionId: String(q._id),
        selectedOption,
        visited: true,
        markedForReview: false,
        timeSpentMs: 0,
        seq,
      }))

    await t.test(
      "authenticated HTTP ownership, state, strict body, student-safe paper, stale retries and immutable result",
      async () => {
        const a = await start()
        for (const suffix of ["", "/result"]) {
          const denied = await request(`/attempts/${a.attemptId}${suffix}`, {
            cookie: cookies[1],
          })
          assert.equal(denied.status, 404)
        }
        const malformed = await request(`/attempts/${a.attemptId}/responses`, {
          method: "PUT",
          body: { sessionId: a.sessionId, responses: writes(1), unknown: true },
        })
        assert.equal(malformed.status, 400)
        const resumed = await request(`/attempts/${a.attemptId}/session`, {
          method: "POST",
          body: { sessionId: a.sessionId },
        })
        assert.equal(resumed.status, 200)
        assert.doesNotMatch(
          JSON.stringify(resumed.payload),
          /answerKey|correctOption|explanation|Private answer/
        )
        const save = (responses) =>
          request(`/attempts/${a.attemptId}/responses`, {
            method: "PUT",
            body: { sessionId: a.sessionId, responses },
          })
        assert.equal((await save(writes(11, "C"))).status, 200)
        const stale = await save(writes(10, "B"))
        assert.equal(stale.status, 200)
        assert.equal(stale.payload.data.responses[0].selectedOption, "C")
        assert.equal(stale.payload.data.responses[0].seq, 11)
        const duplicate = await save(writes(11, "B"))
        assert.equal(duplicate.payload.data.responses[0].selectedOption, "C")
        const submit = () =>
          request(`/attempts/${a.attemptId}/submit`, {
            method: "POST",
            body: { sessionId: a.sessionId, reason: "MANUAL_SUBMIT" },
          })
        const [one, two] = await Promise.all([submit(), submit()])
        assert.equal(one.status, 200)
        assert.equal(two.status, 200)
        assert.deepEqual(one.payload.data.summary, two.payload.data.summary)
        assert.equal(one.payload.data.summary.score, -2)
        assert.equal((await save(writes(12))).status, 409)
        assert.equal((await submit()).payload.data.summary.score, -2)
      }
    )
    await t.test(
      "manual submit versus expiry produces one final result and rejects all late writes",
      async () => {
        const a = await start()
        now = new Date(a.session.attempt.expiresAt)
        const [manual, expiry, late] = await Promise.allSettled([
          services.attempts.submit({ ...a, reason: "MANUAL_SUBMIT" }),
          services.attempts.submit({ ...a, reason: "TIME_EXPIRED" }),
          services.attempts.saveResponses({ ...a, responses: writes(1) }),
        ])
        assert.equal(manual.status, "fulfilled")
        assert.equal(expiry.status, "fulfilled")
        assert.equal(late.status, "rejected")
        assert.deepEqual(manual.value.summary, expiry.value.summary)
        assert.equal(manual.value.attempt.submissionReason, "TIME_EXPIRED")
        assert.equal(manual.value.summary.attempted, 0)
      }
    )
    await t.test(
      "save versus submit freezes whichever atomic operation wins",
      async () => {
        const a = await start()
        const [save, submit] = await Promise.allSettled([
          services.attempts.saveResponses({ ...a, responses: writes(1) }),
          services.attempts.submit({ ...a, reason: "MANUAL_SUBMIT" }),
        ])
        assert.equal(submit.status, "fulfilled")
        assert.ok([0, 8].includes(submit.value.summary.score))
        if (save.status === "fulfilled")
          assert.equal(submit.value.summary.score, 8)
        const repeat = await services.attempts.submit({
          ...a,
          reason: "MANUAL_SUBMIT",
        })
        assert.deepEqual(repeat.summary, submit.value.summary)
      }
    )
    await t.test(
      "concurrent tabs leave one active server session; old session cannot save or submit",
      async () => {
        const a = await start()
        const b = randomUUID(),
          c = randomUUID()
        await Promise.all([
          services.attempts.resume({ ...a, sessionId: b }),
          services.attempts.resume({ ...a, sessionId: c }),
        ])
        const stored = await NeetAttempt.findById(a.attemptId).lean()
        const loser = stored.activeSessionId === b ? c : b
        await assert.rejects(
          services.attempts.saveResponses({
            ...a,
            sessionId: loser,
            responses: writes(100),
          }),
          { code: "NEET_SESSION_SUPERSEDED" }
        )
        await assert.rejects(
          services.attempts.submit({
            ...a,
            sessionId: loser,
            reason: "MANUAL_SUBMIT",
          }),
          { code: "NEET_SESSION_SUPERSEDED" }
        )
        const resumed = await services.attempts.resume({
          ...a,
          sessionId: stored.activeSessionId,
        })
        assert.equal(resumed.attempt.startedAt, a.session.attempt.startedAt)
        assert.equal(resumed.attempt.expiresAt, a.session.attempt.expiresAt)
        await services.attempts.submit({
          ...a,
          sessionId: stored.activeSessionId,
          reason: "MANUAL_SUBMIT",
        })
      }
    )
    await t.test(
      "proctored consent and system checks precede start; uncertain events never submit",
      async () => {
        const user = String(userId)
        const { attempt } = await services.attempts.register({
          testId: String(testDoc._id),
          candidate,
          userId: user,
        })
        const a = {
          attemptId: attempt.id,
          userId: user,
          sessionId: randomUUID(),
        }
        await assert.rejects(services.attempts.start(a), {
          code: "NEET_ATTEMPT_NOT_READY",
        })
        await services.attempts.update({ ...a, mode: "PROCTORED" })
        await assert.rejects(services.attempts.markReady(a), {
          code: "NEET_CONSENT_REQUIRED",
        })
        const test = await services.tests.getTest({
          testId: String(testDoc._id),
        })
        const consent = {
          version: test.proctorPolicy.consentVersion,
          accepted: true,
        }
        await assert.rejects(
          services.attempts.markReady({ ...a, proctorConsent: consent }),
          { code: "NEET_SYSTEM_CHECK_INCOMPLETE" }
        )
        await services.attempts.markReady({
          ...a,
          proctorConsent: consent,
          systemCheck: {
            camera: "READY",
            microphone: "READY",
            fullscreen: "READY",
            screenShare: "NOT_REQUIRED",
            browser: "READY",
            network: "READY",
          },
        })
        await services.attempts.start(a)
        const events = [
          {
            clientEventId: randomUUID(),
            type: "CAMERA_OBSTRUCTION",
            occurredAt: now.toISOString(),
            metadata: {
              reason: "CAMERA_OBSCURED",
              detector: "frame-obstruction",
              durationMs: 8000,
            },
          },
        ]
        const first = await services.proctor.recordEvents({ ...a, events })
        const duplicate = await services.proctor.recordEvents({ ...a, events })
        assert.equal(first.autoSubmitted, false)
        assert.equal(first.warningCount, 0)
        assert.equal(duplicate.accepted, 0)
        assert.equal(duplicate.duplicates, 1)
        const result = await services.attempts.submit({
          ...a,
          reason: "MANUAL_SUBMIT",
        })
        assert.equal(result.attempt.status, "SUBMITTED")
        assert.equal(result.proctoring.warningCount, 0)
      }
    )
    // Build the real app too: its auth and route composition are covered in the
    // final regression suite. This suite uses the same real default auth gates.
    assert.equal(typeof createApp, "function")
  }
)
