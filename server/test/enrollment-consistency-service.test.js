const assert = require("node:assert/strict")
const { test } = require("node:test")

const {
  createEnrollmentConsistencyService,
} = require("../domains/enrollment/enrollmentConsistencyService")
const {
  EXIT_CODES,
  HELP_TEXT,
  classifyOperationalError,
  parseArguments,
  run,
} = require("../scripts/audit-enrollment-consistency")
const {
  PREFLIGHT_ENROLLMENT_SAMPLE_LIMIT,
  PREFLIGHT_EXIT_CODES,
  classifyPreflightResult,
  entitlementRecoveryForPreflight,
  enrollmentConsistencyForPreflight,
  main: preflightMain,
} = require("../scripts/preflight-production")

const userId = "64b000000000000000000001"
const courseId = "64b000000000000000000002"

const validEntitlementReport = (status = "healthy", overrides = {}) => ({
  schemaVersion: 1,
  status,
  observedAt: "2026-08-11T12:00:00.000Z",
  counts: {
    activeMissingLegacy: 0,
    ageHandoffRequired: 0,
    boundaryLifecycleMismatches: 0,
    boundaryMissingEpisodes: 0,
    completedDeletionCurrent: 0,
    dueProvisioning: status === "warning" ? 1 : 0,
    expiredLeases: 0,
    malformedEpisodes: 0,
    manualReview: status === "blocking" ? 1 : 0,
    terminalLegacyConflicts: 0,
  },
  boundaryExaminedCount: 0,
  truncated: {
    ageHandoff: false,
    boundary: false,
    completedDeletion: false,
    due: false,
    expiredLease: false,
    lifecycle: false,
    manualReview: false,
  },
  ...overrides,
})

const pairState = (overrides = {}) => ({
  activeCourseOutsideImmutablePurchaseCount: 0,
  userId,
  courseId,
  userExists: true,
  userAccountType: "Student",
  userActive: true,
  userApproved: true,
  userDeletionPending: false,
  userSecurityDefaultsPresent: true,
  courseExists: true,
  userCourseCount: 1,
  courseEnrollmentCount: 1,
  progressCount: 1,
  purchaseStatusCounts: { fulfilled: 1 },
  activePurchaseStatusCounts: { fulfilled: 1 },
  refundPendingOriginCounts: {},
  unknownActivePurchaseStatusCount: 0,
  unknownPurchaseStatusCount: 0,
  activeRefundPendingOriginCounts: {},
  ...overrides,
})

const repositoryWith = (...pairs) => ({
  async *streamPairStates() {
    yield* pairs
  },
})

const capturingLogger = () => {
  const events = []
  const record = (level) => (event, fields) =>
    events.push({ event, fields, level })
  return {
    events,
    logger: {
      error: record("error"),
      info: record("info"),
      warn: record("warn"),
    },
  }
}

const validEnrollmentReport = (status = "healthy", overrides = {}) => {
  const hasFinding = status !== "healthy"
  const blockingFindings = status === "blocking" ? 1 : 0
  const warningFindings = status === "warning" ? 1 : 0
  const base = {
    schemaVersion: 1,
    mode: "read_only",
    requestId: "enrollment-report-fixture",
    status,
    startedAt: "2026-08-09T12:00:00.000Z",
    completedAt: "2026-08-09T12:00:00.000Z",
    durationMs: 0,
    summary: {
      pairCount: hasFinding ? 1 : 0,
      affectedPairs: hasFinding ? 1 : 0,
      blockingFindings,
      classifiedPairs: hasFinding ? 1 : 0,
      warningFindings,
      totalFindings: blockingFindings + warningFindings,
      issueCounts: hasFinding ? { TEST_FINDING: 1 } : {},
      scenarioCounts: {},
      scenarioPairs: 0,
    },
    samples: [],
    truncated: hasFinding,
  }

  return {
    ...base,
    ...overrides,
    summary: { ...base.summary, ...overrides.summary },
  }
}

test("consistency service returns a bounded healthy read-only report", async () => {
  const captured = capturingLogger()
  const ticks = [1_000, 1_025]
  const report = await createEnrollmentConsistencyService({
    clock: () => ticks.shift(),
    repository: repositoryWith(pairState()),
    targetLogger: captured.logger,
  }).audit({ requestId: "enrollment-audit-healthy", sampleLimit: 1 })

  assert.equal(report.status, "healthy")
  assert.equal(report.durationMs, 25)
  assert.deepEqual(report.summary, {
    pairCount: 1,
    affectedPairs: 0,
    blockingFindings: 0,
    classifiedPairs: 0,
    warningFindings: 0,
    totalFindings: 0,
    issueCounts: {},
    scenarioCounts: {},
    scenarioPairs: 0,
  })
  assert.deepEqual(report.samples, [])
  assert.equal(report.truncated, false)
  assert.deepEqual(
    captured.events.map(({ event }) => event),
    ["enrollment.consistency_started", "enrollment.consistency_completed"]
  )
})

test("consistency service reports scenario-only pairs with financial evidence without changing severity", async () => {
  const report = await createEnrollmentConsistencyService({
    repository: repositoryWith(
      pairState({ activePurchaseStatusCounts: {} }),
      pairState({
        activePurchaseStatusCounts: { created: 1 },
        courseEnrollmentCount: 0,
        courseId: "64b000000000000000000003",
        progressCount: 0,
        purchaseStatusCounts: { created: 1 },
        userCourseCount: 0,
      })
    ),
    targetLogger: capturingLogger().logger,
  }).audit({ requestId: "enrollment-scenarios", sampleLimit: 2 })

  assert.equal(report.status, "healthy")
  assert.equal(report.summary.affectedPairs, 0)
  assert.equal(report.summary.classifiedPairs, 2)
  assert.equal(report.summary.scenarioPairs, 2)
  assert.deepEqual(report.summary.scenarioCounts, { B: 1, C: 1 })
  assert.equal(report.samples.length, 2)
  assert.equal(
    report.samples.every(({ consistent }) => consistent),
    true
  )
  assert.deepEqual(
    report.samples.map(({ classification }) =>
      classification.scenarios.map(({ code }) => code)
    ),
    [["B"], ["C"]]
  )
  assert.equal(
    report.samples[0].financialEvidence.purchaseStatusCounts.fulfilled,
    1
  )
  assert.equal(
    report.samples[0].financialEvidence.activePurchaseStatusCounts.fulfilled,
    0
  )
  assert.equal(
    report.samples[1].financialEvidence.purchaseStatusCounts.created,
    1
  )
  assert.deepEqual(
    report.samples[1].financialEvidence.refundPendingOriginCounts,
    {
      payment_review: 0,
      refund_requested: 0,
      unknown: 0,
    }
  )
  assert.equal(report.truncated, false)
})

test("consistency service distinguishes warnings, blocking issues, and dry-run truncation", async () => {
  const captured = capturingLogger()
  const report = await createEnrollmentConsistencyService({
    clock: (() => {
      const ticks = [2_000, 2_010]
      return () => ticks.shift()
    })(),
    repository: repositoryWith(
      pairState({ progressCount: 0 }),
      pairState({
        courseId: "64b000000000000000000003",
        userCourseCount: 0,
      })
    ),
    targetLogger: captured.logger,
  }).audit({
    mode: "dry_run",
    requestId: "enrollment-audit-dry-run",
    sampleLimit: 1,
  })

  assert.equal(report.status, "blocking")
  assert.equal(report.summary.pairCount, 2)
  assert.equal(report.summary.affectedPairs, 2)
  assert.equal(report.summary.issueCounts.MISSING_PROGRESS_RECORD, 1)
  assert.equal(report.summary.issueCounts.DASHBOARD_MIRROR_MISSING, 1)
  assert.equal(report.samples.length, 1)
  assert.equal(report.samples[0].mode, "dry_run")
  assert.equal(report.samples[0].proposals[0].safeForAutomaticRepair, false)
  assert.equal(report.truncated, true)
  assert.equal(
    captured.events.some(
      ({ event }) => event === "enrollment.consistency_mismatch"
    ),
    true
  )
  assert.equal(
    captured.events.some(
      ({ event }) => event === "enrollment.reconciliation_dry_run"
    ),
    true
  )
  const dryRunEvent = captured.events.find(
    ({ event }) => event === "enrollment.reconciliation_dry_run"
  )
  assert.equal(dryRunEvent.fields.sampledPairCount, 1)
  assert.equal(Object.hasOwn(dryRunEvent.fields, "proposedPairCount"), false)
})

test("dry-run telemetry labels scenario-only evidence as sampled pairs", async () => {
  const captured = capturingLogger()
  const report = await createEnrollmentConsistencyService({
    repository: repositoryWith(pairState({ activePurchaseStatusCounts: {} })),
    targetLogger: captured.logger,
  }).audit({
    mode: "dry_run",
    requestId: "enrollment-scenario-only-dry-run",
    sampleLimit: 1,
  })

  assert.equal(report.status, "healthy")
  assert.equal(report.summary.affectedPairs, 0)
  assert.equal(report.samples.length, 1)
  assert.deepEqual(report.samples[0].proposals, [])

  const dryRunEvent = captured.events.find(
    ({ event }) => event === "enrollment.reconciliation_dry_run"
  )
  assert.equal(dryRunEvent.fields.sampledPairCount, 1)
  assert.equal(dryRunEvent.fields.scenarioPairs, 1)
  assert.equal(Object.hasOwn(dryRunEvent.fields, "proposedPairCount"), false)
})

test("consistency service reports orphaned progress without logging pair identifiers", async () => {
  const captured = capturingLogger()
  const report = await createEnrollmentConsistencyService({
    repository: repositoryWith(
      pairState({
        activePurchaseStatusCounts: {},
        courseEnrollmentCount: 0,
        purchaseStatusCounts: {},
        userCourseCount: 0,
      })
    ),
    targetLogger: captured.logger,
  }).audit({ requestId: "enrollment-orphan-progress", sampleLimit: 0 })

  assert.equal(report.status, "warning")
  const progressEvent = captured.events.find(
    ({ event }) => event === "enrollment.progress_without_entitlement"
  )
  assert.deepEqual(progressEvent.fields, {
    requestId: "enrollment-orphan-progress",
    affectedPairs: 1,
  })
  assert.equal(JSON.stringify(captured.events).includes(userId), false)
  assert.equal(JSON.stringify(captured.events).includes(courseId), false)
})

test("operational CLI parser is report-only and exit codes are stable", () => {
  assert.deepEqual(parseArguments([]), {
    mode: "read_only",
    sampleLimit: 100,
  })
  assert.deepEqual(parseArguments(["--dry-run", "--sample-limit", "0"]), {
    mode: "dry_run",
    sampleLimit: 0,
  })
  assert.deepEqual(parseArguments(["--help"]), { help: true })
  assert.deepEqual(parseArguments(["-h"]), { help: true })
  assert.throws(() => parseArguments(["--repair"]))
  assert.throws(() => parseArguments(["--help", "--repair"]))
  assert.throws(() => parseArguments(["--repair", "--help"]))
  assert.throws(() => parseArguments(["--sample-limit", "101"]))
  assert.deepEqual(EXIT_CODES, {
    healthy: 0,
    warning: 1,
    blocking: 2,
    operational_error: 3,
  })
})

test("operational CLI help exits successfully without MongoDB or an audit", async () => {
  for (const flag of ["--help", "-h"]) {
    const calls = []
    const result = await run({
      argv: [flag],
      connect: async () => calls.push("connect"),
      disconnect: async () => calls.push("disconnect"),
      environment: {},
      serviceFactory: () => {
        calls.push("service")
        return { audit: async () => calls.push("audit") }
      },
      targetLogger: capturingLogger().logger,
    })

    assert.equal(result.exitCode, EXIT_CODES.healthy)
    assert.equal(result.help, HELP_TEXT)
    assert.match(result.help, /without connecting to MongoDB/)
    assert.deepEqual(calls, [])
  }
})

test("operational CLI rejects unknown flags even when combined with help", async () => {
  for (const argv of [
    ["--help", "--repair"],
    ["--repair", "--help"],
  ]) {
    const calls = []
    await assert.rejects(
      run({
        argv,
        connect: async () => calls.push("connect"),
        disconnect: async () => calls.push("disconnect"),
        environment: {},
        serviceFactory: () => {
          calls.push("service")
          return { audit: async () => calls.push("audit") }
        },
        targetLogger: capturingLogger().logger,
      }),
      (error) => {
        assert.equal(error.code, "ENROLLMENT_AUDIT_CONFIGURATION")
        assert.equal(classifyOperationalError(error), "configuration_error")
        assert.equal(EXIT_CODES.operational_error, 3)
        return true
      }
    )
    assert.deepEqual(calls, [])
  }
})

test("operational CLI always disconnects after an audit and never exposes a write path", async () => {
  const calls = []
  const result = await run({
    argv: ["--dry-run"],
    connect: async (_uri, options) => calls.push(["connect", options]),
    disconnect: async () => calls.push(["disconnect"]),
    environment: { MONGODB_URI: "mongodb://localhost/test" },
    serviceFactory: () => ({
      audit: async (options) => {
        calls.push(["audit", options])
        return validEnrollmentReport("warning", { mode: "dry_run" })
      },
    }),
    targetLogger: capturingLogger().logger,
  })

  assert.equal(result.exitCode, EXIT_CODES.warning)
  assert.equal(calls[0][0], "connect")
  assert.deepEqual(calls[1], ["audit", { mode: "dry_run", sampleLimit: 100 }])
  assert.deepEqual(calls[2], ["disconnect"])
})

test("operational failures are classified safely and disconnect after service failure", async () => {
  let disconnected = false
  await assert.rejects(
    run({
      connect: async () => undefined,
      disconnect: async () => {
        disconnected = true
      },
      environment: { MONGODB_URI: "mongodb://localhost/test" },
      serviceFactory: () => ({
        audit: async () => {
          const simulatedPrivateUri = [
            "mongo",
            "db://user",
            ":pass",
            "word@private/db",
          ].join("")
          const error = new Error(simulatedPrivateUri)
          error.name = "MongoServerSelectionError"
          throw error
        },
      }),
      targetLogger: capturingLogger().logger,
    })
  )
  assert.equal(disconnected, true)
  assert.equal(
    classifyOperationalError({ name: "MongoServerSelectionError" }),
    "dependency_unavailable"
  )
  assert.equal(
    classifyOperationalError(new Error("unexpected")),
    "internal_error"
  )
})

test("operational CLI rejects missing or unknown report statuses and disconnects", async () => {
  const malformedCounts = validEnrollmentReport()
  malformedCounts.summary.totalFindings = -1
  for (const report of [
    {},
    { status: "healthy" },
    { status: "operational_error" },
    { status: "unexpected" },
    malformedCounts,
    { ...validEnrollmentReport(), unknownField: true },
  ]) {
    let disconnected = false
    await assert.rejects(
      run({
        connect: async () => undefined,
        disconnect: async () => {
          disconnected = true
        },
        environment: { MONGODB_URI: "mongodb://localhost/test" },
        serviceFactory: () => ({ audit: async () => report }),
        targetLogger: capturingLogger().logger,
      }),
      (error) => error.code === "ENROLLMENT_AUDIT_INVALID_REPORT"
    )
    assert.equal(disconnected, true)
  }

  assert.equal(
    classifyOperationalError({ code: "ENROLLMENT_AUDIT_INVALID_REPORT" }),
    "invalid_report"
  )
})

test("production preflight composes legacy findings with enrollment severity", () => {
  assert.equal(
    classifyPreflightResult(
      { legacyFinding: 0 },
      validEnrollmentReport("healthy"),
      validEntitlementReport("healthy")
    ),
    "healthy"
  )
  assert.equal(
    classifyPreflightResult(
      { legacyFinding: 0 },
      validEnrollmentReport("warning"),
      validEntitlementReport("healthy")
    ),
    "warning"
  )
  assert.equal(
    classifyPreflightResult(
      { legacyFinding: 0 },
      validEnrollmentReport("blocking"),
      validEntitlementReport("healthy")
    ),
    "blocking"
  )
  assert.equal(
    classifyPreflightResult(
      { legacyFinding: 1 },
      validEnrollmentReport("healthy"),
      validEntitlementReport("healthy")
    ),
    "blocking"
  )
  const malformedCounts = validEnrollmentReport()
  malformedCounts.summary.blockingFindings = 1
  for (const enrollmentConsistency of [
    undefined,
    {},
    { status: "healthy" },
    { status: "operational_error" },
    { status: "unexpected" },
    malformedCounts,
    { ...validEnrollmentReport(), unknownField: true },
  ]) {
    assert.throws(
      () =>
        classifyPreflightResult(
          { legacyFinding: 1 },
          enrollmentConsistency,
          validEntitlementReport()
        ),
      (error) => error.code === "ENROLLMENT_PREFLIGHT_INVALID_REPORT"
    )
  }

  assert.equal(
    classifyPreflightResult(
      { legacyFinding: 0 },
      validEnrollmentReport("healthy"),
      validEntitlementReport("warning")
    ),
    "warning"
  )
  assert.equal(
    classifyPreflightResult(
      { legacyFinding: 0 },
      validEnrollmentReport("healthy"),
      validEntitlementReport("blocking")
    ),
    "blocking"
  )
  assert.equal(
    classifyPreflightResult(
      { legacyFinding: 0 },
      validEnrollmentReport("healthy"),
      validEntitlementReport("blocking", {
        counts: {
          ...validEntitlementReport().counts,
          boundaryLifecycleMismatches: 1,
        },
      })
    ),
    "blocking"
  )
  assert.equal(
    classifyPreflightResult(
      { legacyFinding: 0 },
      validEnrollmentReport("healthy"),
      validEntitlementReport("blocking", {
        counts: {
          ...validEntitlementReport().counts,
          ageHandoffRequired: 1,
        },
      })
    ),
    "blocking"
  )
  assert.equal(
    classifyPreflightResult(
      { legacyFinding: 0 },
      validEnrollmentReport("healthy"),
      validEntitlementReport("blocking", {
        truncated: {
          ...validEntitlementReport().truncated,
          ageHandoff: true,
        },
      })
    ),
    "blocking"
  )
  for (const entitlementRecovery of [
    undefined,
    {},
    { status: "healthy" },
    { ...validEntitlementReport(), status: "unexpected" },
    { ...validEntitlementReport(), purchaseId: userId },
    { ...validEntitlementReport(), observedAt: "2026-08-11T12:00:00Z" },
    validEntitlementReport("healthy", {
      counts: {
        ...validEntitlementReport().counts,
        purchaseId: userId,
      },
    }),
    validEntitlementReport("healthy", {
      truncated: {
        ...validEntitlementReport().truncated,
        nextCursor: courseId,
      },
    }),
    validEntitlementReport("healthy", {
      counts: {
        ...validEntitlementReport().counts,
        manualReview: 1,
      },
    }),
  ]) {
    assert.throws(
      () =>
        classifyPreflightResult(
          { legacyFinding: 0 },
          validEnrollmentReport(),
          entitlementRecovery
        ),
      (error) => error.code === "ENTITLEMENT_PREFLIGHT_INVALID_REPORT"
    )
  }
})

test("production preflight projects only bounded aggregate Entitlement status", () => {
  const report = validEntitlementReport("warning")
  const projection = entitlementRecoveryForPreflight(report)
  assert.deepEqual(projection, report)
  assert.notEqual(projection.counts, report.counts)
  assert.notEqual(projection.truncated, report.truncated)
  assert.equal(JSON.stringify(projection).includes(userId), false)
  assert.equal(JSON.stringify(projection).includes(courseId), false)
})

test("production preflight hard-caps enrollment evidence at five samples", () => {
  assert.equal(PREFLIGHT_ENROLLMENT_SAMPLE_LIMIT, 5)
  const summary = {
    pairCount: 7,
    affectedPairs: 7,
    blockingFindings: 0,
    classifiedPairs: 7,
    warningFindings: 7,
    totalFindings: 7,
    issueCounts: { TEST_FINDING: 7 },
    scenarioCounts: {},
    scenarioPairs: 0,
  }
  const projection = enrollmentConsistencyForPreflight(
    validEnrollmentReport("warning", {
      summary,
      samples: Array.from({ length: 7 }, (_, index) => ({ pair: index + 1 })),
      truncated: false,
    })
  )

  assert.deepEqual(projection, {
    schemaVersion: 1,
    status: "warning",
    summary,
    samples: [{ pair: 1 }, { pair: 2 }, { pair: 3 }, { pair: 4 }, { pair: 5 }],
    truncated: true,
  })
})

test("production preflight main maps invalid enrollment reports to operational exit 3", async () => {
  const captured = capturingLogger()
  let disconnected = false
  let exitCode

  const result = await preflightMain({
    disconnect: async () => {
      disconnected = true
    },
    runPreflight: async () => {
      classifyPreflightResult(
        {},
        { status: "unknown" },
        validEntitlementReport()
      )
    },
    setExitCode: (value) => {
      exitCode = value
    },
    targetLogger: captured.logger,
  })

  assert.equal(result, undefined)
  assert.equal(exitCode, PREFLIGHT_EXIT_CODES.operational_error)
  assert.equal(disconnected, true)
  assert.deepEqual(
    captured.events.map(({ event, fields }) => ({
      event,
      status: fields.status,
    })),
    [{ event: "production.preflight_failed", status: "operational_error" }]
  )
})

test("production preflight main maps an invalid Entitlement report to operational exit 3", async () => {
  const captured = capturingLogger()
  let disconnected = false
  let exitCode

  const result = await preflightMain({
    disconnect: async () => {
      disconnected = true
    },
    runPreflight: async () => {
      classifyPreflightResult(
        {},
        validEnrollmentReport(),
        validEntitlementReport("healthy", {
          truncated: {
            ...validEntitlementReport().truncated,
            nextCursor: courseId,
          },
        })
      )
    },
    setExitCode: (value) => {
      exitCode = value
    },
    targetLogger: captured.logger,
  })

  assert.equal(result, undefined)
  assert.equal(exitCode, PREFLIGHT_EXIT_CODES.operational_error)
  assert.equal(disconnected, true)
  assert.deepEqual(
    captured.events.map(({ event, fields }) => ({
      event,
      status: fields.status,
    })),
    [{ event: "production.preflight_failed", status: "operational_error" }]
  )
})
