// Project NEET API performance SMOKE test.
//
// Boots a disposable stack (single-node replica-set mongod, seeded sample
// mocks and N students, the real API process without Redis), drives N
// virtual students concurrently through register -> mode -> ready -> start
// -> sequenced autosaves -> submit, then verifies the stored data directly
// in MongoDB: no acknowledged answer was lost, every attempt has exactly one
// final result, and every score matches an independent recomputation.
//
// SMOKE ONLY: one machine, generator on the same host as the API and Mongo,
// no Redis, no reverse proxy. It is not a 1,000-user capacity result; see
// load/README.md and docs/neet-exams/08-performance-capacity-plan.md.

import { randomUUID } from "node:crypto"
import { mkdir, writeFile } from "node:fs/promises"
import os from "node:os"
import { join } from "node:path"
import { performance } from "node:perf_hooks"
import { setTimeout as sleep } from "node:timers/promises"
import { fileURLToPath } from "node:url"
import { isDeepStrictEqual, parseArgs } from "node:util"
import jwt from "jsonwebtoken"
import mongoose from "mongoose"

import { startNeetStack } from "../scripts/lib/neetStack.mjs"

const NOTICE = "SMOKE ONLY — not a 1,000-user capacity result"
const ROOT = fileURLToPath(new URL("..", import.meta.url))
const REPORT_DIR = join(ROOT, "test-results", "neet-smoke")
// The stack configures this as its only trusted frontend origin.
const FRONTEND_ORIGIN = "http://127.0.0.1:3999"
const COOKIE_NAME = "studynotion_session"
const OPERATIONS = Object.freeze([
  "register",
  "mode",
  "ready",
  "start",
  "save",
  "heartbeat",
  "submit",
])
const HEARTBEAT_EVERY_SAVES = 15
const REANSWER_FRACTION = 0.1
const DOUBLE_SUBMIT_EVERY = 10
const MAX_BATCH = 5
const MAX_SAMPLES = 25

const USAGE = `Usage: node load/neet-smoke.mjs [options]

  --students <n>      virtual students, all concurrent (default 100)
  --test <slug>       seeded mock to sit (default full-length-neet-style-mock-01)
  --think-ms <ms>     max random think time between saves (default 20)
  --ramp-ms <ms>      spread student starts over this window (default 0 = storm)
  --save-p95-ms <ms>  fail when save p95 latency exceeds this (default 500)

${NOTICE}.`

// CLI --------------------------------------------------------------------------

const parseOptions = () => {
  const { values } = parseArgs({
    options: {
      students: { type: "string", default: "100" },
      test: { type: "string", default: "full-length-neet-style-mock-01" },
      "think-ms": { type: "string", default: "20" },
      "ramp-ms": { type: "string", default: "0" },
      "save-p95-ms": { type: "string", default: "500" },
      help: { type: "boolean", short: "h", default: false },
    },
    strict: true,
  })
  if (values.help) {
    process.stdout.write(`${USAGE}\n`)
    process.exit(0)
  }
  const integer = (name, min) => {
    const value = Number(values[name])
    if (!Number.isSafeInteger(value) || value < min) {
      throw new Error(`--${name} must be an integer >= ${min}`)
    }
    return value
  }
  return {
    students: integer("students", 1),
    test: values.test,
    thinkMs: integer("think-ms", 0),
    rampMs: integer("ramp-ms", 0),
    saveP95Ms: integer("save-p95-ms", 1),
  }
}

// Helpers ------------------------------------------------------------------------

const randomInt = (min, max) =>
  min + Math.floor(Math.random() * (max - min + 1))
const pick = (items) => items[Math.floor(Math.random() * items.length)]

const shuffled = (items) => {
  const copy = [...items]
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const other = Math.floor(Math.random() * (index + 1))
    ;[copy[index], copy[other]] = [copy[other], copy[index]]
  }
  return copy
}

// Splits items into consecutive batches of 1..MAX_BATCH distinct entries.
const randomBatches = (items) => {
  const batches = []
  for (let index = 0; index < items.length;) {
    const size = randomInt(1, MAX_BATCH)
    batches.push(items.slice(index, index + size))
    index += size
  }
  return batches
}

const round1 = (value) =>
  value === null || value === undefined ? null : Math.round(value * 10) / 10
const round2 = (value) => Math.round(value * 100) / 100
const idOf = (value) => String(value).toLowerCase()

// Nearest-rank percentile over an ascending array.
const percentile = (sorted, p) =>
  sorted.length
    ? sorted[
        Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1)
      ]
    : null

const pushSample = (list, sample) => {
  if (list.length < MAX_SAMPLES) list.push(sample)
}

// Metrics ------------------------------------------------------------------------

const createMetrics = () => {
  const operations = new Map(
    OPERATIONS.map((operation) => [
      operation,
      {
        latencies: [],
        statuses: {},
        errorCodes: {},
        rateLimited: 0,
        networkErrors: 0,
        firstStartedAt: null,
        lastEndedAt: null,
      },
    ])
  )
  const failures = []
  return {
    failures,
    record({ operation, startedAt, endedAt, status, code, failure }) {
      const entry = operations.get(operation)
      entry.latencies.push(endedAt - startedAt)
      const statusKey = status ? String(status) : "NETWORK_ERROR"
      entry.statuses[statusKey] = (entry.statuses[statusKey] || 0) + 1
      if (!status) entry.networkErrors += 1
      if (status === 429) entry.rateLimited += 1
      if (code) entry.errorCodes[code] = (entry.errorCodes[code] || 0) + 1
      if (entry.firstStartedAt === null || startedAt < entry.firstStartedAt)
        entry.firstStartedAt = startedAt
      if (entry.lastEndedAt === null || endedAt > entry.lastEndedAt)
        entry.lastEndedAt = endedAt
      if (failure) pushSample(failures, failure)
    },
    summarize() {
      const summary = {}
      for (const [operation, entry] of operations) {
        const sorted = [...entry.latencies].sort((a, b) => a - b)
        const non2xx = Object.entries(entry.statuses)
          .filter(([status]) => !/^2\d\d$/.test(status))
          .reduce((total, [, count]) => total + count, 0)
        summary[operation] = {
          count: sorted.length,
          p50Ms: round1(percentile(sorted, 50)),
          p95Ms: round1(percentile(sorted, 95)),
          p99Ms: round1(percentile(sorted, 99)),
          maxMs: round1(sorted.at(-1) ?? null),
          meanMs: round1(
            sorted.length
              ? sorted.reduce((total, value) => total + value, 0) /
                  sorted.length
              : null
          ),
          statuses: entry.statuses,
          errorCodes: entry.errorCodes,
          non2xx,
          rateLimited: entry.rateLimited,
          networkErrors: entry.networkErrors,
          windowMs: round1(
            entry.firstStartedAt === null
              ? null
              : entry.lastEndedAt - entry.firstStartedAt
          ),
        }
      }
      return summary
    },
  }
}

// HTTP ---------------------------------------------------------------------------

const createClient = ({ apiBase, metrics }) => {
  const base = `${apiBase}/api/v2/project-neet`
  return async ({ operation, method, path, body, cookie, studentIndex }) => {
    const startedAt = performance.now()
    let status = 0
    let payload = null
    let networkError = null
    try {
      const response = await fetch(`${base}${path}`, {
        method,
        headers: {
          accept: "application/json",
          "content-type": "application/json",
          origin: FRONTEND_ORIGIN,
          cookie,
        },
        body: body === undefined ? undefined : JSON.stringify(body),
      })
      status = response.status
      const text = await response.text()
      try {
        payload = text ? JSON.parse(text) : null
      } catch {
        payload = null
      }
    } catch (error) {
      networkError = error
    }
    const endedAt = performance.now()
    const ok = status >= 200 && status < 300
    const code = ok ? null : payload?.error?.code || null
    metrics.record({
      operation,
      startedAt,
      endedAt,
      status,
      code,
      failure: ok
        ? null
        : {
            operation,
            studentIndex,
            method,
            path,
            status: status || null,
            code,
            message: payload?.error?.message || networkError?.message || null,
            requestId: payload?.error?.requestId || null,
            networkError: networkError
              ? String(networkError.cause?.code || networkError.name)
              : null,
          },
    })
    return { ok, status, payload, latencyMs: endedAt - startedAt }
  }
}

const sessionCookie = ({ secret, student }) =>
  `${COOKIE_NAME}=${jwt.sign(
    {
      email: student.email,
      id: student.id,
      accountType: "Student",
      sessionVersion: 0,
    },
    secret,
    {
      algorithm: "HS256",
      audience: "studynotion-web",
      issuer: "studynotion-api",
      expiresIn: "12h",
    }
  )}`

// Virtual student ------------------------------------------------------------------

const runStudent = async ({ context, index, student }) => {
  const { call, options, testId, acks, findings } = context
  const outcome = {
    index,
    studentId: student.id,
    attemptId: null,
    completed: false,
    failedStep: null,
    doubleSubmit: index % DOUBLE_SUBMIT_EVERY === 0,
    questionCount: 0,
    saveRequests: 0,
    writesSent: 0,
    writesAcknowledged: 0,
    submitSummary: null,
  }
  const cookie = sessionCookie({ secret: context.jwtSecret, student })
  const request = (operation, method, path, body) =>
    call({ operation, method, path, body, cookie, studentIndex: index })
  const fail = (step) => {
    outcome.failedStep = step
    return outcome
  }

  if (options.rampMs > 0) {
    await sleep(Math.floor((index * options.rampMs) / options.students))
  }

  const registered = await request("register", "POST", "/attempts", {
    testId,
    candidate: { fullName: "Smoke Student" },
  })
  if (!registered.ok || !registered.payload?.data?.id) return fail("register")
  const attemptId = registered.payload.data.id
  outcome.attemptId = attemptId
  const attemptPath = `/attempts/${attemptId}`

  const mode = await request("mode", "PATCH", attemptPath, {
    mode: "NON_PROCTORED",
  })
  if (!mode.ok) return fail("mode")

  const ready = await request("ready", "POST", `${attemptPath}/ready`, {
    instructionsAccepted: true,
  })
  if (!ready.ok) return fail("ready")

  const sessionId = randomUUID()
  const started = await request("start", "POST", `${attemptPath}/start`, {
    sessionId,
  })
  const questions = started.payload?.data?.paper?.questions
  if (!started.ok || !Array.isArray(questions) || !questions.length)
    return fail("start")
  outcome.questionCount = questions.length

  let seq = 0
  const current = new Map()
  const heartbeats = []

  const save = async (batch) => {
    const writes = batch.map(({ question, selectedOption }) => {
      seq += 1
      return {
        questionId: question.id,
        selectedOption,
        markedForReview: false,
        visited: true,
        timeSpentMs: 0,
        seq,
      }
    })
    outcome.saveRequests += 1
    outcome.writesSent += writes.length
    const saved = await request("save", "PUT", `${attemptPath}/responses`, {
      sessionId,
      responses: writes,
    })
    if (saved.status === 200 && Array.isArray(saved.payload?.data?.responses)) {
      const sent = new Map(
        writes.map((write) => [idOf(write.questionId), write])
      )
      const echoed = new Set()
      for (const entry of saved.payload.data.responses) {
        const write = sent.get(idOf(entry.questionId))
        if (!write) continue
        echoed.add(idOf(entry.questionId))
        acks.push({
          attemptId,
          questionId: entry.questionId,
          seq: entry.seq,
          selectedOption: entry.selectedOption,
        })
        outcome.writesAcknowledged += 1
        // Every seq this student sends is newer than anything stored, so a
        // 200 must echo exactly what was written.
        if (
          entry.seq !== write.seq ||
          entry.selectedOption !== write.selectedOption
        ) {
          findings.ackEchoMismatches += 1
          pushSample(findings.ackEchoSamples, {
            attemptId,
            questionId: entry.questionId,
            sent: { seq: write.seq, selectedOption: write.selectedOption },
            echoed: { seq: entry.seq, selectedOption: entry.selectedOption },
          })
        }
      }
      for (const write of writes) {
        if (!echoed.has(idOf(write.questionId))) {
          findings.ackEchoMismatches += 1
          pushSample(findings.ackEchoSamples, {
            attemptId,
            questionId: write.questionId,
            sent: { seq: write.seq, selectedOption: write.selectedOption },
            echoed: null,
          })
        }
      }
      for (const write of writes) current.set(write.questionId, write)
    }

    if (outcome.saveRequests % HEARTBEAT_EVERY_SAVES === 0) {
      // Fired alongside the following saves, as the client's timer would.
      heartbeats.push(
        request("heartbeat", "POST", `${attemptPath}/heartbeat`, {
          sessionId,
        }).then((beat) => {
          if (beat.ok && beat.payload?.data?.sessionActive !== true) {
            findings.inactiveHeartbeats += 1
            pushSample(findings.inactiveHeartbeatSamples, {
              attemptId,
              data: beat.payload?.data ?? null,
            })
          }
        })
      )
    }
    if (options.thinkMs > 0) await sleep(randomInt(0, options.thinkMs))
  }

  const optionKeys = (question) => question.options.map((option) => option.key)

  // First pass: answer every question in paper order.
  for (const batch of randomBatches(questions)) {
    await save(
      batch.map((question) => ({
        question,
        selectedOption: pick(optionKeys(question)),
      }))
    )
  }

  // Second pass: change ~10% of answers with a newer seq.
  const reanswerCount = Math.max(
    1,
    Math.round(questions.length * REANSWER_FRACTION)
  )
  const reanswer = shuffled(questions).slice(0, reanswerCount)
  for (const batch of randomBatches(reanswer)) {
    await save(
      batch.map((question) => {
        const previous = current.get(question.id)?.selectedOption
        const choices = optionKeys(question).filter((key) => key !== previous)
        return { question, selectedOption: pick(choices) }
      })
    )
  }

  await Promise.all(heartbeats)

  const submitBody = { sessionId, reason: "MANUAL_SUBMIT" }
  if (outcome.doubleSubmit) {
    const [first, second] = await Promise.all([
      request("submit", "POST", `${attemptPath}/submit`, submitBody),
      request("submit", "POST", `${attemptPath}/submit`, submitBody),
    ])
    const identical =
      first.status === 200 &&
      second.status === 200 &&
      first.payload?.data?.summary !== undefined &&
      isDeepStrictEqual(
        first.payload.data.summary,
        second.payload?.data?.summary
      )
    findings.doubleSubmits += 1
    if (!identical) {
      findings.idempotencyViolations += 1
      pushSample(findings.idempotencySamples, {
        attemptId,
        statuses: [first.status, second.status],
        summaries: [
          first.payload?.data?.summary ?? first.payload?.error ?? null,
          second.payload?.data?.summary ?? second.payload?.error ?? null,
        ],
      })
    }
    const winner = first.status === 200 ? first : second
    if (winner.status !== 200) return fail("submit")
    outcome.submitSummary = winner.payload?.data?.summary ?? null
  } else {
    const submitted = await request(
      "submit",
      "POST",
      `${attemptPath}/submit`,
      submitBody
    )
    if (submitted.status !== 200) return fail("submit")
    outcome.submitSummary = submitted.payload?.data?.summary ?? null
  }
  outcome.completed = true
  return outcome
}

// Independent verification -----------------------------------------------------------
// Reads MongoDB directly. Scoring is reimplemented here from the published
// rules on purpose; no server code is imported.

const SUMMARY_FIELDS = Object.freeze([
  "score",
  "maxScore",
  "questionCount",
  "attempted",
  "correct",
  "incorrect",
  "unanswered",
  "dropped",
])

const recomputeScore = ({ keyDocument, paper, responses }) => {
  const keys = new Map(
    (keyDocument.keys || []).map((key) => [idOf(key.questionId), key])
  )
  const byQuestion = new Map(
    (responses || []).map((response) => [idOf(response.questionId), response])
  )
  const totals = {
    score: 0,
    maxScore: 0,
    questionCount: 0,
    attempted: 0,
    correct: 0,
    incorrect: 0,
    unanswered: 0,
    dropped: 0,
  }
  const problems = []
  for (const question of paper.questions) {
    const questionId = idOf(question.questionId)
    const key = keys.get(questionId)
    const correctMarks = Number(question.marks.correct)
    const incorrectMarks = Number(question.marks.incorrect)
    const unansweredMarks = Number(question.marks.unanswered ?? 0)
    totals.questionCount += 1
    totals.maxScore += correctMarks
    if (!key) {
      problems.push(`no answer key for question ${questionId}`)
      continue
    }
    const status = key.status || "ACTIVE"
    const selected = byQuestion.get(questionId)?.selectedOption || null
    if (status === "DROPPED") {
      totals.score += correctMarks
      totals.dropped += 1
    } else if (status === "ALL_CORRECT") {
      if (selected) {
        totals.score += correctMarks
        totals.attempted += 1
        totals.correct += 1
      } else {
        totals.score += unansweredMarks
        totals.unanswered += 1
      }
    } else if (status === "ACTIVE") {
      if (!selected) {
        totals.score += unansweredMarks
        totals.unanswered += 1
      } else if ((key.correctOptionKeys || []).includes(selected)) {
        totals.score += correctMarks
        totals.attempted += 1
        totals.correct += 1
      } else {
        totals.score += incorrectMarks
        totals.attempted += 1
        totals.incorrect += 1
      }
    } else {
      problems.push(`unknown key status ${status} for question ${questionId}`)
    }
  }
  totals.score = round2(totals.score)
  totals.maxScore = round2(totals.maxScore)
  return { totals, problems }
}

const verify = async ({ mongoUri, outcomes, acks, students, testId }) => {
  const { ObjectId, MongoClient } = mongoose.mongo
  const client = new MongoClient(mongoUri)
  await client.connect()
  try {
    const db = client.db()
    const attemptsCollection = db.collection("neetattempts")
    const createdIds = outcomes
      .filter((outcome) => outcome.attemptId)
      .map((outcome) => outcome.attemptId)
    const documents = await attemptsCollection
      .find(
        { _id: { $in: createdIds.map((id) => new ObjectId(id)) } },
        {
          projection: {
            status: 1,
            submissionReason: 1,
            paperVersionId: 1,
            paper: 1,
            responses: 1,
            result: 1,
            resultHistory: 1,
          },
        }
      )
      .toArray()
    const byId = new Map(
      documents.map((document) => [idOf(document._id), document])
    )

    // Duplicate attempts: more attempt documents than the run registered.
    const storedForStudents = await attemptsCollection.countDocuments({
      userId: { $in: students.map((student) => new ObjectId(student.id)) },
      testId: new ObjectId(testId),
    })

    // 1. Zero lost acknowledged answers.
    const responseIndex = new Map()
    for (const document of documents) {
      responseIndex.set(
        idOf(document._id),
        new Map(
          (document.responses || []).map((response) => [
            idOf(response.questionId),
            response,
          ])
        )
      )
    }
    const lost = { count: 0, samples: [] }
    for (const ack of acks) {
      const stored = responseIndex
        .get(idOf(ack.attemptId))
        ?.get(idOf(ack.questionId))
      let reason = null
      if (!stored) reason = "response missing"
      else if (stored.seq < ack.seq)
        reason = "stored seq older than acknowledged"
      else if (
        stored.seq === ack.seq &&
        stored.selectedOption !== ack.selectedOption
      )
        reason = "same seq, different selectedOption"
      if (reason) {
        lost.count += 1
        pushSample(lost.samples, {
          ...ack,
          reason,
          stored: stored
            ? { seq: stored.seq, selectedOption: stored.selectedOption }
            : null,
        })
      }
    }

    // 2. Exactly one final result per attempt.
    const unresolved = { count: 0, samples: [] }
    for (const outcome of outcomes) {
      const document = outcome.attemptId
        ? byId.get(idOf(outcome.attemptId))
        : null
      const problems = []
      if (!outcome.attemptId)
        problems.push(`no attempt (failed at ${outcome.failedStep})`)
      else if (!document) problems.push("attempt document missing")
      else {
        if (document.status !== "SUBMITTED")
          problems.push(`status ${document.status}`)
        if (!document.result?.summary) problems.push("result missing")
        if ((document.resultHistory || []).length)
          problems.push(
            `resultHistory has ${document.resultHistory.length} entries`
          )
        if (document.result?.summary && outcome.submitSummary) {
          const differing = SUMMARY_FIELDS.filter(
            (field) =>
              document.result.summary[field] !== outcome.submitSummary[field]
          )
          if (differing.length)
            problems.push(
              `submit response differs from stored result: ${differing.join(", ")}`
            )
        }
      }
      if (problems.length) {
        unresolved.count += 1
        pushSample(unresolved.samples, {
          studentIndex: outcome.index,
          attemptId: outcome.attemptId,
          problems,
        })
      }
    }

    // 3. Independent score recomputation against the latest key version.
    const keyCache = new Map()
    const latestKey = async (paperVersionId) => {
      const cacheKey = idOf(paperVersionId)
      if (!keyCache.has(cacheKey)) {
        keyCache.set(
          cacheKey,
          await db
            .collection("neetanswerkeyversions")
            .findOne({ paperVersionId }, { sort: { version: -1 } })
        )
      }
      return keyCache.get(cacheKey)
    }
    const scoring = {
      checked: 0,
      mismatches: 0,
      samples: [],
      answerKeyVersions: {},
    }
    for (const document of documents) {
      if (!document.result?.summary) continue
      scoring.checked += 1
      const problems = []
      const keyDocument = document.paperVersionId
        ? await latestKey(document.paperVersionId)
        : null
      if (!keyDocument) {
        problems.push("no answer-key version for the pinned paper version")
      } else {
        scoring.answerKeyVersions[keyDocument.version] =
          (scoring.answerKeyVersions[keyDocument.version] || 0) + 1
        const { totals, problems: keyProblems } = recomputeScore({
          keyDocument,
          paper: document.paper,
          responses: document.responses,
        })
        problems.push(...keyProblems)
        for (const field of SUMMARY_FIELDS) {
          if (totals[field] !== document.result.summary[field]) {
            problems.push(
              `${field}: stored ${document.result.summary[field]} recomputed ${totals[field]}`
            )
          }
        }
        if (document.result.answerKeyVersion !== keyDocument.version) {
          problems.push(
            `answerKeyVersion: stored ${document.result.answerKeyVersion} latest ${keyDocument.version}`
          )
        }
      }
      if (problems.length) {
        scoring.mismatches += 1
        pushSample(scoring.samples, { attemptId: idOf(document._id), problems })
      }
    }

    return {
      acknowledgedTuples: acks.length,
      lostAcknowledged: lost,
      attemptsRegistered: createdIds.length,
      attemptDocumentsForStudents: storedForStudents,
      duplicateAttempts: Math.max(0, storedForStudents - createdIds.length),
      attemptsWithoutSingleResult: unresolved,
      scoring,
      mongodVersion: (await db.admin().command({ buildInfo: 1 })).version,
    }
  } finally {
    await client.close()
  }
}

// Output -----------------------------------------------------------------------------

const formatStatuses = (statuses) =>
  Object.entries(statuses)
    .map(([status, count]) => `${status}:${count}`)
    .join(" ") || "-"

const formatCodes = (codes) =>
  Object.entries(codes)
    .map(([code, count]) => `${code}:${count}`)
    .join(" ") || "-"

const table = (headers, rows) => {
  const widths = headers.map((header, column) =>
    Math.max(header.length, ...rows.map((row) => String(row[column]).length))
  )
  const line = (cells) =>
    cells
      .map((cell, column) =>
        column === 0 || column >= headers.length - 2
          ? String(cell).padEnd(widths[column])
          : String(cell).padStart(widths[column])
      )
      .join("  ")
      .trimEnd()
  return [
    line(headers),
    line(widths.map((width) => "-".repeat(width))),
    ...rows.map(line),
  ].join("\n")
}

const printSummary = (report) => {
  const { parameters, timing, metrics, verification, checks } = report
  const lines = [
    "",
    `Project NEET API smoke — ${NOTICE}`,
    `students=${parameters.students} test=${parameters.test} (${parameters.questionCount} questions) think<=${parameters.thinkMs}ms ramp=${parameters.rampMs}ms`,
    `host: ${report.environment.cpuModel} x${report.environment.cpuCount}, ${report.environment.totalMemoryGb} GB, node ${report.environment.node}, mongod ${report.environment.mongodVersion}`,
    "",
    table(
      [
        "operation",
        "count",
        "p50 ms",
        "p95 ms",
        "p99 ms",
        "max ms",
        "statuses",
        "error codes",
      ],
      OPERATIONS.map((operation) => {
        const entry = metrics.operations[operation]
        return [
          operation,
          entry.count,
          entry.p50Ms ?? "-",
          entry.p95Ms ?? "-",
          entry.p99Ms ?? "-",
          entry.maxMs ?? "-",
          formatStatuses(entry.statuses),
          formatCodes(entry.errorCodes),
        ]
      })
    ),
    "",
    `requests: ${metrics.totals.requests} (non-2xx ${metrics.totals.non2xx}, 429 ${metrics.totals.rateLimited}, network errors ${metrics.totals.networkErrors})`,
    `save writes: ${metrics.totals.writesSent} sent in ${metrics.operations.save.count} requests, ${metrics.totals.writesAcknowledged} acknowledged`,
    `save throughput: ${metrics.saveThroughput.perSecondOverLoadPhase} saves/s over the load phase, ${metrics.saveThroughput.perSecondOverSaveWindow} saves/s over the save window`,
    `wall time: total ${timing.totalWallMs} ms (stack boot+seed ${timing.stackBootMs} ms, load ${timing.loadPhaseMs} ms, verify ${timing.verifyMs} ms)`,
    `verification: ${verification.acknowledgedTuples} acknowledged tuples, ${verification.scoring.checked} results recomputed`,
    "",
    "checks:",
    ...checks.map(
      (check) =>
        `  ${check.pass ? "PASS" : "FAIL"}  ${check.name}: ${check.detail}`
    ),
    "",
    `result: ${report.result}`,
    `report: ${report.reportPath}`,
    NOTICE,
    "",
  ]
  process.stdout.write(lines.join("\n"))
}

// Main -------------------------------------------------------------------------------

const main = async () => {
  const options = parseOptions()
  const runStartedAt = new Date()
  const wallStart = performance.now()
  process.stderr.write(
    `Booting disposable NEET stack (seeding ${options.students} students)...\n`
  )
  const stack = await startNeetStack({ students: options.students, web: false })
  const stopOnSignal = () => {
    process.stderr.write("Interrupted; stopping the disposable stack...\n")
    stack.stop().finally(() => process.exit(130))
  }
  process.once("SIGINT", stopOnSignal)
  process.once("SIGTERM", stopOnSignal)

  try {
    const stackBootMs = performance.now() - wallStart
    const test = stack.seed.tests.find((item) => item.slug === options.test)
    if (!test) {
      throw new Error(
        `Unknown --test ${options.test}; seeded: ${stack.seed.tests.map((item) => item.slug).join(", ")}`
      )
    }
    const students = stack.seed.students.slice(0, options.students)
    if (students.length !== options.students) {
      throw new Error(
        `Seed returned ${students.length} students, expected ${options.students}`
      )
    }

    const metrics = createMetrics()
    const acks = []
    const findings = {
      ackEchoMismatches: 0,
      ackEchoSamples: [],
      inactiveHeartbeats: 0,
      inactiveHeartbeatSamples: [],
      doubleSubmits: 0,
      idempotencyViolations: 0,
      idempotencySamples: [],
    }
    const context = {
      call: createClient({ apiBase: stack.apiBase, metrics }),
      options,
      testId: test.id,
      jwtSecret: stack.secrets.JWT_SECRET,
      acks,
      findings,
    }

    process.stderr.write(
      `Running ${options.students} concurrent students against ${options.test}...\n`
    )
    const loadStart = performance.now()
    const outcomes = await Promise.all(
      students.map((student, index) =>
        runStudent({ context, index, student }).catch((error) => ({
          index,
          studentId: student.id,
          attemptId: null,
          completed: false,
          failedStep: `harness error: ${error.message}`,
          doubleSubmit: false,
          questionCount: 0,
          saveRequests: 0,
          writesSent: 0,
          writesAcknowledged: 0,
          submitSummary: null,
        }))
      )
    )
    const loadPhaseMs = performance.now() - loadStart

    process.stderr.write("Verifying stored attempts in MongoDB...\n")
    const verifyStart = performance.now()
    const verification = await verify({
      mongoUri: stack.mongoUri,
      outcomes,
      acks,
      students,
      testId: test.id,
    })
    const verifyMs = performance.now() - verifyStart

    const operations = metrics.summarize()
    const totals = Object.values(operations).reduce(
      (sum, entry) => ({
        requests: sum.requests + entry.count,
        non2xx: sum.non2xx + entry.non2xx,
        rateLimited: sum.rateLimited + entry.rateLimited,
        networkErrors: sum.networkErrors + entry.networkErrors,
      }),
      { requests: 0, non2xx: 0, rateLimited: 0, networkErrors: 0 }
    )
    totals.writesSent = outcomes.reduce((sum, item) => sum + item.writesSent, 0)
    totals.writesAcknowledged = outcomes.reduce(
      (sum, item) => sum + item.writesAcknowledged,
      0
    )
    const saveCount = operations.save.count
    const saveThroughput = {
      perSecondOverLoadPhase: round1(saveCount / (loadPhaseMs / 1000)),
      perSecondOverSaveWindow: operations.save.windowMs
        ? round1(saveCount / (operations.save.windowMs / 1000))
        : null,
    }
    const completed = outcomes.filter((outcome) => outcome.completed).length
    const failedStudents = outcomes
      .filter((outcome) => !outcome.completed)
      .map((outcome) => ({
        index: outcome.index,
        failedStep: outcome.failedStep,
      }))
    const questionCount =
      outcomes.find((item) => item.questionCount)?.questionCount ?? 0
    const non429 = totals.non2xx - totals.rateLimited - totals.networkErrors

    const checks = [
      {
        name: "all students completed the flow",
        pass: completed === options.students,
        detail: `${completed}/${options.students}`,
      },
      {
        name: "no non-2xx responses (excluding 429)",
        pass: non429 === 0,
        detail: String(non429),
      },
      {
        name: "no 429 responses",
        pass: totals.rateLimited === 0,
        detail: String(totals.rateLimited),
      },
      {
        name: "no network errors",
        pass: totals.networkErrors === 0,
        detail: String(totals.networkErrors),
      },
      {
        name: "zero lost acknowledged answers",
        pass: verification.lostAcknowledged.count === 0,
        detail: `${verification.lostAcknowledged.count} violations of ${verification.acknowledgedTuples} tuples`,
      },
      {
        name: "every 200 save echoed the written seq/value",
        pass: findings.ackEchoMismatches === 0,
        detail: `${findings.ackEchoMismatches} mismatches`,
      },
      {
        name: "every attempt SUBMITTED with exactly one result",
        pass: verification.attemptsWithoutSingleResult.count === 0,
        detail: `${verification.attemptsWithoutSingleResult.count} attempts not in that state`,
      },
      {
        name: "no duplicate attempts",
        pass: verification.duplicateAttempts === 0,
        detail: `${verification.attemptDocumentsForStudents} stored for ${verification.attemptsRegistered} registered`,
      },
      {
        name: "independent score recomputation matches",
        pass:
          verification.scoring.mismatches === 0 &&
          verification.scoring.checked === completed,
        detail: `${verification.scoring.mismatches} mismatches of ${verification.scoring.checked} results`,
      },
      {
        name: "concurrent double submit is idempotent",
        pass: findings.idempotencyViolations === 0,
        detail: `${findings.idempotencyViolations} violations of ${findings.doubleSubmits} double submits`,
      },
      {
        name: "heartbeats report an active session",
        pass: findings.inactiveHeartbeats === 0,
        detail: `${findings.inactiveHeartbeats} inactive of ${operations.heartbeat.count}`,
      },
      {
        name: `save p95 <= ${options.saveP95Ms} ms`,
        pass:
          operations.save.p95Ms !== null &&
          operations.save.p95Ms <= options.saveP95Ms,
        detail: `${operations.save.p95Ms} ms`,
      },
    ]
    const passed = checks.every((check) => check.pass)

    const stamp = runStartedAt.toISOString().replace(/[:]/g, "-")
    const reportPath = join(REPORT_DIR, `neet-smoke-${stamp}.json`)
    const usage = process.resourceUsage()
    const report = {
      notice: NOTICE,
      result: passed ? "PASS" : "FAIL",
      startedAt: runStartedAt.toISOString(),
      finishedAt: new Date().toISOString(),
      reportPath,
      environment: {
        node: process.version,
        platform: os.platform(),
        release: os.release(),
        arch: os.arch(),
        cpuModel: os.cpus()[0]?.model ?? "unknown",
        cpuCount: os.cpus().length,
        totalMemoryGb: round1(os.totalmem() / 1024 ** 3),
        mongodVersion: verification.mongodVersion,
        topology:
          "single host: load generator, API (one Node process, no Redis, in-process rate limits) and single-node replica-set mongod; no reverse proxy",
      },
      parameters: {
        ...options,
        testId: test.id,
        questionCount,
        batchSize: `1-${MAX_BATCH} questions per save`,
        reanswerFraction: REANSWER_FRACTION,
        heartbeatEverySaves: HEARTBEAT_EVERY_SAVES,
        doubleSubmitStudents: outcomes.filter((item) => item.doubleSubmit)
          .length,
      },
      timing: {
        stackBootMs: Math.round(stackBootMs),
        loadPhaseMs: Math.round(loadPhaseMs),
        verifyMs: Math.round(verifyMs),
        totalWallMs: Math.round(performance.now() - wallStart),
      },
      metrics: { operations, totals, saveThroughput },
      students: { total: options.students, completed, failed: failedStudents },
      verification: {
        ...verification,
        ackEcho: {
          mismatches: findings.ackEchoMismatches,
          samples: findings.ackEchoSamples,
        },
        heartbeats: {
          inactive: findings.inactiveHeartbeats,
          samples: findings.inactiveHeartbeatSamples,
        },
        idempotency: {
          doubleSubmits: findings.doubleSubmits,
          violations: findings.idempotencyViolations,
          samples: findings.idempotencySamples,
        },
      },
      failureSamples: metrics.failures,
      generator: {
        cpuUserMs: Math.round(usage.userCPUTime / 1000),
        cpuSystemMs: Math.round(usage.systemCPUTime / 1000),
        maxRssMb: Math.round(usage.maxRSS / 1024),
      },
      checks,
    }

    await mkdir(REPORT_DIR, { recursive: true })
    await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`)
    printSummary(report)
    if (metrics.failures.length) {
      process.stdout.write(
        `first failing requests:\n${metrics.failures
          .slice(0, 5)
          .map((failure) => `  ${JSON.stringify(failure)}`)
          .join("\n")}\n`
      )
    }
    if (!passed) process.exitCode = 1
  } finally {
    process.removeListener("SIGINT", stopOnSignal)
    process.removeListener("SIGTERM", stopOnSignal)
    await stack.stop()
  }
}

main().catch((error) => {
  process.stderr.write(`NEET smoke failed: ${error.stack || error.message}\n`)
  process.exitCode = 1
})
