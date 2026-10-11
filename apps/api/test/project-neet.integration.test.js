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
    const NeetPaperVersion = require("../modules/project-neet/models/NeetPaperVersion")
    const NeetAnswerKeyVersion = require("../modules/project-neet/models/NeetAnswerKeyVersion")
    const jwt = require("jsonwebtoken")
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
      [
        NeetAttempt,
        NeetMockTest,
        NeetQuestion,
        NeetProctorEvent,
        NeetPaperVersion,
        NeetAnswerKeyVersion,
      ].map((model) => model.createIndexes())
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
    // New attempts start only on a published, immutable paper version.
    const published = await services.papers.publishCurrentPaper({
      testId: testDoc._id,
    })
    assert.equal(published.created, true)
    assert.equal(
      (await services.papers.publishCurrentPaper({ testId: testDoc._id }))
        .created,
      false,
      "republishing unchanged content is a no-op"
    )
    const paperVersionId = published.paperVersion._id
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
    const candidate = { fullName: "Test Student" }
    // Field names, not the harmless "answerKeyVersion" number.
    const secretPattern = /"answerKey"|correctOption|explanation|Private answer/
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
        assert.doesNotMatch(JSON.stringify(resumed.payload), secretPattern)
        // D-1: only a display name is stored; ownership is the user ID.
        const stored = await NeetAttempt.findById(a.attemptId).lean()
        assert.deepEqual(Object.keys(stored.candidate), ["fullName"])
        assert.equal(String(stored.paperVersionId), String(paperVersionId))
        const save = (responses) =>
          request(`/attempts/${a.attemptId}/responses`, {
            method: "PUT",
            body: { sessionId: a.sessionId, responses },
          })
        // A-6: the acknowledgement carries exactly the written questions.
        const single = await save([{ ...writes(5, "C")[0] }])
        assert.equal(single.status, 200)
        assert.equal(single.payload.data.responses.length, 1)
        assert.doesNotMatch(JSON.stringify(single.payload), secretPattern)
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
        assert.equal(one.payload.data.answerKeyVersion, 1)
        assert.doesNotMatch(JSON.stringify(one.payload), secretPattern)
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
        // P-2: monitored mode is adults-only (recorded self-declaration).
        await assert.rejects(
          services.attempts.markReady({
            ...a,
            proctorConsent: {
              version: test.proctorPolicy.consentVersion,
              accepted: true,
            },
          }),
          { code: "NEET_ADULT_CONFIRMATION_REQUIRED" }
        )
        const consent = {
          version: test.proctorPolicy.consentVersion,
          accepted: true,
          adultConfirmed: true,
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
        const started = await services.attempts.start(a)
        assert.ok(started.attempt.proctorConsent.adultDeclaredAt)
        assert.equal(started.attempt.proctoring.autoSubmitEnabled, false)
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
    const startProctored = async () => {
      const user = String(userId)
      const { attempt } = await services.attempts.register({
        testId: String(testDoc._id),
        candidate,
        userId: user,
      })
      const a = { attemptId: attempt.id, userId: user, sessionId: randomUUID() }
      await services.attempts.update({ ...a, mode: "PROCTORED" })
      const test = await services.tests.getTest({ testId: String(testDoc._id) })
      await services.attempts.markReady({
        ...a,
        proctorConsent: {
          version: test.proctorPolicy.consentVersion,
          accepted: true,
          adultConfirmed: true,
        },
        systemCheck: {
          camera: "READY",
          microphone: "READY",
          fullscreen: "READY",
          screenShare: "NOT_REQUIRED",
          browser: "READY",
          network: "READY",
        },
      })
      const session = await services.attempts.start(a)
      return { ...a, session }
    }

    await t.test(
      "published paper and key versions are frozen for attempts (K-1)",
      async () => {
        now = new Date()
        const a = await start()
        // Edit the live bank after start: text and key both change.
        await NeetQuestion.updateMany(
          { testId: testDoc._id },
          {
            $set: {
              text: "Edited after start",
              answerKey: { correctOptionKeys: ["B"] },
            },
            $inc: { revision: 1 },
          }
        )
        const resumed = await services.attempts.resume(a)
        assert.ok(
          resumed.paper.questions.every((q) => q.text.startsWith("Question ")),
          "resumed content must come from the pinned paper version"
        )
        await services.attempts.saveResponses({
          ...a,
          responses: writes(1, "A"),
        })
        const result = await services.attempts.submit({
          ...a,
          reason: "MANUAL_SUBMIT",
        })
        // Frozen key is A: two correct answers. The edited bank key (B)
        // would have produced -2.
        assert.equal(result.summary.score, 8)
        assert.equal(result.answerKeyVersion, 1)
        // Restore the bank for later subtests.
        await NeetQuestion.updateMany(
          { testId: testDoc._id },
          { $set: { answerKey: { correctOptionKeys: ["A"] } } }
        )
        await NeetQuestion.updateOne(
          { _id: questions[0]._id },
          { $set: { text: "Question 1" } }
        )
        await NeetQuestion.updateOne(
          { _id: questions[1]._id },
          { $set: { text: "Question 2" } }
        )
      }
    )

    await t.test(
      "answer-key correction rescoring is versioned and idempotent (K-3)",
      async () => {
        now = new Date()
        const answered = await start()
        await services.attempts.saveResponses({
          ...answered,
          responses: writes(1, "C"),
        })
        await services.attempts.submit({ ...answered, reason: "MANUAL_SUBMIT" })
        const skipped = await start()
        await services.attempts.submit({ ...skipped, reason: "MANUAL_SUBMIT" })

        // Final key: question 1 dropped (+4 to every appeared candidate),
        // question 2 accepts both A and C.
        const corrected = await services.papers.correctAnswerKey({
          paperVersionId,
          reason: "Final answer key published",
          changes: [
            { questionId: String(questions[0]._id), status: "DROPPED" },
            {
              questionId: String(questions[1]._id),
              status: "ACTIVE",
              correctOptionKeys: ["A", "C"],
            },
          ],
        })
        assert.equal(corrected.created, true)
        const version = corrected.answerKey.version
        const first = await services.papers.rescorePaper({ paperVersionId })
        assert.equal(first.answerKeyVersion, version)
        assert.ok(first.rescored >= 2)
        const again = await services.papers.rescorePaper({ paperVersionId })
        assert.equal(again.rescored, 0, "a second run changes nothing")

        const answeredResult = await services.attempts.getResult(answered)
        // Q1 dropped: +4; Q2 answered C, now correct: +4.
        assert.equal(answeredResult.summary.score, 8)
        assert.equal(answeredResult.summary.dropped, 1)
        assert.equal(answeredResult.answerKeyVersion, version)
        const skippedResult = await services.attempts.getResult(skipped)
        // Unattempted dropped question still earns +4.
        assert.equal(skippedResult.summary.score, 4)
        assert.equal(skippedResult.summary.unanswered, 1)
        const history = await NeetAttempt.findById(answered.attemptId).lean()
        assert.equal(history.resultHistory.length, 1)
        assert.equal(history.resultHistory[0].score, -2)

        // Attempts finalised after the correction use it directly.
        const later = await start()
        const laterResult = await services.attempts.submit({
          ...later,
          reason: "MANUAL_SUBMIT",
        })
        assert.equal(laterResult.answerKeyVersion, version)
        assert.equal(laterResult.summary.score, 4)
      }
    )

    await t.test(
      "sweeper finalises abandoned expired attempts exactly once (T-1)",
      async () => {
        now = new Date()
        const a = await start()
        await services.attempts.saveResponses({
          ...a,
          responses: writes(1, "C"),
        })
        now = new Date(Date.parse(a.session.attempt.expiresAt) + 31_000)
        const [one, two, manual] = await Promise.allSettled([
          services.lifecycle.sweep(),
          services.lifecycle.sweep(),
          services.attempts.submit({ ...a, reason: "MANUAL_SUBMIT" }),
        ])
        assert.equal(one.status, "fulfilled")
        assert.equal(two.status, "fulfilled")
        assert.equal(manual.status, "fulfilled")
        const stored = await NeetAttempt.findById(a.attemptId).lean()
        assert.equal(stored.status, "AUTO_SUBMITTED")
        assert.equal(stored.submissionReason, "TIME_EXPIRED")
        assert.equal(stored.isOpen, undefined)
        assert.equal(stored.resultHistory.length, 0)
        // Both saved answers count: question 1 was dropped by the K-3
        // correction (awarded to everyone), question 2 is graded.
        assert.equal(
          manual.value.summary.attempted + manual.value.summary.dropped,
          2
        )
        assert.equal(manual.value.summary.unanswered, 0)
        // A later sweep finds nothing left to do.
        assert.equal((await services.lifecycle.sweep()).finalized, 0)
      }
    )

    await t.test(
      "resume with the same session is not a takeover (R-a)",
      async () => {
        now = new Date()
        const a = await startProctored()
        await services.attempts.resume(a)
        await services.attempts.resume(a)
        let stored = await NeetAttempt.findById(a.attemptId).lean()
        assert.equal(stored.sessionClaims, 1)
        assert.equal(
          await NeetProctorEvent.countDocuments({
            attemptId: a.attemptId,
            type: "DUPLICATE_SESSION",
          }),
          0
        )
        // A genuinely different live session is still recorded.
        await services.attempts.resume({ ...a, sessionId: randomUUID() })
        stored = await NeetAttempt.findById(a.attemptId).lean()
        assert.equal(stored.sessionClaims, 2)
        assert.equal(stored.status, "IN_PROGRESS")
        assert.equal(
          await NeetProctorEvent.countDocuments({
            attemptId: a.attemptId,
            type: "DUPLICATE_SESSION",
          }),
          1
        )
        const latest = stored.activeSessionId
        await services.attempts.submit({
          ...a,
          sessionId: latest,
          reason: "MANUAL_SUBMIT",
        })
      }
    )

    await t.test(
      "threshold flags for human review without submitting (P-1)",
      async () => {
        now = new Date()
        const a = await startProctored()
        // Cooldowns are per signal type: two counted types per batch, one
        // cooldown apart, reach 4 counted warnings (> 3) inside the paper.
        let last
        for (const offset of [1_000, 22_000]) {
          now = new Date(Date.parse(a.session.attempt.startedAt) + offset)
          last = await services.proctor.recordEvents({
            ...a,
            events: ["TAB_HIDDEN", "FULLSCREEN_EXIT"].map((type) => ({
              clientEventId: randomUUID(),
              type,
              occurredAt: now.toISOString(),
            })),
          })
          assert.equal(last.autoSubmitted, false)
          assert.equal(last.status, "IN_PROGRESS")
        }
        assert.ok(last.warningCount > last.maxWarnings)
        const stored = await NeetAttempt.findById(a.attemptId).lean()
        assert.equal(stored.status, "IN_PROGRESS")
        assert.equal(stored.review.status, "FLAGGED")
        assert.ok(stored.review.flaggedAt)
        assert.deepEqual([...stored.review.reasons].sort(), [
          "FULLSCREEN_EXIT",
          "TAB_HIDDEN",
        ])
        // The exam continues normally and is scored on its answers.
        await services.attempts.saveResponses({
          ...a,
          responses: writes(1, "A"),
        })
        const result = await services.attempts.submit({
          ...a,
          reason: "MANUAL_SUBMIT",
        })
        assert.equal(result.attempt.status, "SUBMITTED")
        assert.equal(result.attempt.submissionReason, "MANUAL_SUBMIT")
        assert.equal(result.attempt.proctoring.reviewStatus, "FLAGGED")
        assert.equal(result.summary.score, 8)
      }
    )

    await t.test(
      "exam start extends a short session; revocation and the policy gate still apply (T-2, T-3)",
      async () => {
        now = new Date()
        const user = String(userId)
        const { attempt } = await services.attempts.register({
          testId: String(testDoc._id),
          candidate,
          userId: user,
        })
        await services.attempts.update({
          attemptId: attempt.id,
          userId: user,
          mode: "NON_PROCTORED",
        })
        await services.attempts.markReady({
          attemptId: attempt.id,
          userId: user,
        })
        const shortToken = jwt.sign(
          {
            email: users[0].email,
            id: user,
            accountType: "Student",
            sessionVersion: 0,
          },
          process.env.JWT_SECRET,
          {
            algorithm: "HS256",
            audience: "studynotion-web",
            issuer: "studynotion-api",
            expiresIn: 600,
          }
        )
        const shortCookie = `studynotion_session=${shortToken}`
        const sessionId = randomUUID()
        const response = await fetch(`${base}/attempts/${attempt.id}/start`, {
          method: "POST",
          headers: { cookie: shortCookie, "content-type": "application/json" },
          body: JSON.stringify({ sessionId }),
        })
        assert.equal(response.status, 200)
        const started = await response.json()
        const setCookie = response.headers.get("set-cookie") || ""
        const renewed = setCookie.match(/studynotion_session=([^;]+)/)?.[1]
        assert.ok(renewed, "a short session is re-issued at exam start")
        const decoded = jwt.decode(renewed)
        assert.equal(decoded.sessionVersion, 0)
        assert.ok(
          decoded.exp * 1000 >=
            Date.parse(started.data.attempt.expiresAt) + 30 * 60 * 1000
        )

        // T-3: a policy-version bump mid-exam does not block the exam...
        // (Acceptance fields are immutable in the model, so the fixture uses
        // the raw collection to simulate a stale acceptance.)
        const originalAcceptances = (
          await User.collection.findOne({ _id: userId })
        ).policyAcceptances
        await User.collection.updateOne(
          { _id: userId },
          {
            $set: {
              policyAcceptances: originalAcceptances.map((acceptance) => ({
                ...acceptance,
                termsVersion: "2000-01-01",
              })),
            },
          }
        )
        const renewedCookie = `studynotion_session=${renewed}`
        const save = await request(`/attempts/${attempt.id}/responses`, {
          method: "PUT",
          cookie: renewedCookie,
          body: { sessionId, responses: writes(1, "A") },
        })
        assert.equal(save.status, 200)
        // ...but registering a new attempt still requires acceptance.
        const register = await request("/attempts", {
          method: "POST",
          cookie: renewedCookie,
          body: { testId: String(testDoc._id), candidate },
        })
        assert.equal(register.status, 428)
        await User.collection.updateOne(
          { _id: userId },
          { $set: { policyAcceptances: originalAcceptances } }
        )

        // Revocation still applies to the re-issued session.
        await User.updateOne({ _id: userId }, { $inc: { sessionVersion: 1 } })
        const revoked = await request(`/attempts/${attempt.id}/heartbeat`, {
          method: "POST",
          cookie: renewedCookie,
          body: { sessionId },
        })
        assert.equal(revoked.status, 401)
        await User.updateOne({ _id: userId }, { $inc: { sessionVersion: -1 } })
        await services.attempts.submit({
          attemptId: attempt.id,
          userId: user,
          sessionId,
          reason: "MANUAL_SUBMIT",
        })
      }
    )

    // Build the real app too: its auth and route composition are covered in the
    // final regression suite. This suite uses the same real default auth gates.
    assert.equal(typeof createApp, "function")
  }
)
