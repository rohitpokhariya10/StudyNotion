const assert = require("node:assert/strict")
const { test } = require("node:test")

const {
  ENTITLEMENT_RECOVERY_CONFIRMATION,
  EXIT_CODES,
  HELP_TEXT,
  classifyOperationalError,
  mongoOptions,
  parseArguments,
  parseStrictIsoTimestamp,
  run,
} = require("../scripts/reconcile-entitlements")

const BOUNDARY_TEXT = "2026-08-11T10:00:00.000Z"

const validCatchUp = Object.freeze({
  activatedCount: 0,
  examinedCount: 0,
  failedCount: 0,
  hasMore: false,
  reservedCount: 0,
  terminalizedCount: 0,
})

const validRecovery = Object.freeze({
  activated: 0,
  cancelled: 0,
  conflicts: 0,
  expiredLeasesReleased: 0,
  manualReviewRequired: 0,
  retried: 0,
  revoked: 0,
})

const validRecoveryReport = (overrides = {}) => ({
  schemaVersion: 1,
  status: "completed",
  startedAt: BOUNDARY_TEXT,
  completedAt: BOUNDARY_TEXT,
  durationMs: 0,
  limit: 25,
  catchUp: validCatchUp,
  recovery: validRecovery,
  ...overrides,
})

const validStatusReport = (overrides = {}) => ({
  schemaVersion: 1,
  status: "healthy",
  observedAt: BOUNDARY_TEXT,
  counts: {
    activeMissingLegacy: 0,
    ageHandoffRequired: 0,
    boundaryLifecycleMismatches: 0,
    boundaryMissingEpisodes: 0,
    completedDeletionCurrent: 0,
    dueProvisioning: 0,
    expiredLeases: 0,
    malformedEpisodes: 0,
    manualReview: 0,
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

test("Entitlement recovery CLI parses only bounded one-shot options", () => {
  assert.deepEqual(parseArguments([]), { limit: 25, statusOnly: false })
  assert.deepEqual(parseArguments(["--limit", "100", "--status-only"]), {
    limit: 100,
    statusOnly: true,
  })
  assert.deepEqual(parseArguments(["--help"]), { help: true })
  assert.deepEqual(
    parseArguments([
      "--limit",
      "7",
      "--continuation",
      "64b000000000000000000003",
    ]),
    {
      continuation: "64b000000000000000000003",
      limit: 7,
      statusOnly: false,
    }
  )
  assert.deepEqual(
    parseArguments([
      "--continuation",
      "64b000000000000000000003",
      "--limit",
      "7",
    ]),
    {
      continuation: "64b000000000000000000003",
      limit: 7,
      statusOnly: false,
    }
  )
  assert.throws(() => parseArguments(["--limit", "0"]), /1 through 100/)
  assert.throws(() => parseArguments(["--limit", "101"]), /1 through 100/)
  assert.throws(() => parseArguments(["--limit"]), /requires an integer/)
  assert.throws(() => parseArguments(["--daemon"]), /Unsupported/)
  assert.throws(() => parseArguments(["--continuation"]), /requires/)
  assert.throws(
    () => parseArguments(["--continuation", "64B000000000000000000003"]),
    /canonical lowercase/
  )
  assert.throws(
    () =>
      parseArguments([
        "--continuation",
        "64b000000000000000000003",
        "--continuation",
        "64b000000000000000000004",
      ]),
    /only once/
  )
  assert.throws(
    () =>
      parseArguments([
        "--status-only",
        "--continuation",
        "64b000000000000000000003",
      ]),
    /cannot be combined/
  )
})

test("sidecar boundary accepts only an exact valid UTC ISO timestamp", () => {
  assert.equal(
    parseStrictIsoTimestamp(
      BOUNDARY_TEXT,
      "ENTITLEMENT_SIDECAR_STARTED_AT"
    ).toISOString(),
    BOUNDARY_TEXT
  )
  for (const value of [
    undefined,
    "",
    "2026-08-11",
    "2026-08-11T10:00:00Z",
    "2026-08-11T15:30:00.000+05:30",
    "2026-02-30T10:00:00.000Z",
  ]) {
    assert.throws(
      () => parseStrictIsoTimestamp(value, "ENTITLEMENT_SIDECAR_STARTED_AT"),
      /ENTITLEMENT_SIDECAR_STARTED_AT/
    )
  }

  const observedAt = new Date("2026-08-11T10:00:00.000Z")
  assert.equal(
    parseStrictIsoTimestamp(
      "2026-08-11T10:05:00.000Z",
      "ENTITLEMENT_SIDECAR_STARTED_AT",
      observedAt
    ).toISOString(),
    "2026-08-11T10:05:00.000Z"
  )
  assert.throws(
    () =>
      parseStrictIsoTimestamp(
        "2026-08-11T10:05:00.001Z",
        "ENTITLEMENT_SIDECAR_STARTED_AT",
        observedAt
      ),
    /cannot be more than 5 minutes in the future/
  )
})

test("MongoDB runner timeouts stay strictly below the 60-second recovery lease", () => {
  assert.deepEqual(mongoOptions({}), {
    autoCreate: false,
    autoIndex: false,
    connectTimeoutMS: 10_000,
    serverSelectionTimeoutMS: 10_000,
    socketTimeoutMS: 10_000,
    timeoutMS: 10_000,
  })
  assert.throws(
    () => mongoOptions({ MONGODB_SOCKET_TIMEOUT_MS: "10001" }),
    /1000 through 10000/
  )
  assert.throws(
    () => mongoOptions({ MONGODB_OPERATION_TIMEOUT_MS: "60000" }),
    /1000 through 10000/
  )
})

test("--help is offline and needs no repository environment", async () => {
  let connected = false
  const result = await run({
    argv: ["--help"],
    connect: async () => {
      connected = true
    },
    environment: {},
    serviceFactory: () => {
      throw new Error("service must not load")
    },
  })
  assert.equal(result.exitCode, EXIT_CODES.completed)
  assert.equal(result.help, HELP_TEXT)
  assert.match(result.help, /fixed 45-second catch-up\/recovery deadline/)
  assert.equal(connected, false)
})

test("runner hard-binds the parsed boundary and never passes a mutable override", async () => {
  const calls = []
  let disconnected = false
  const result = await run({
    argv: ["--continuation", "64b000000000000000000003", "--limit", "7"],
    connect: async (uri, options) => calls.push(["connect", uri, options]),
    disconnect: async () => {
      disconnected = true
    },
    environment: {
      ENTITLEMENT_RECOVERY_CONFIRM: ENTITLEMENT_RECOVERY_CONFIRMATION,
      ENTITLEMENT_SIDECAR_STARTED_AT: BOUNDARY_TEXT,
      MONGODB_URI: "mongodb://127.0.0.1:27017/studynotion_recovery_test_cli",
      NODE_ENV: "test",
    },
    serviceFactory: ({ sidecarStartedAt }) => {
      calls.push(["factory", sidecarStartedAt])
      return {
        async runBatch(options) {
          calls.push(["run", options])
          return validRecoveryReport({ limit: options.limit })
        },
      }
    },
  })

  assert.equal(result.exitCode, EXIT_CODES.completed)
  assert.equal(disconnected, true)
  assert.equal(calls[0][0], "connect")
  assert.equal(calls[0][2].autoIndex, false)
  assert.equal(calls[0][2].autoCreate, false)
  assert.equal(calls[0][2].socketTimeoutMS, 10_000)
  assert.equal(calls[0][2].timeoutMS, 10_000)
  assert.equal(calls[1][1].toISOString(), BOUNDARY_TEXT)
  assert.deepEqual(calls[2], [
    "run",
    { continuation: "64b000000000000000000003", limit: 7 },
  ])
})

test("mutation always requires exact confirmation while status remains read-only", async () => {
  const baseEnvironment = {
    ENTITLEMENT_SIDECAR_STARTED_AT: BOUNDARY_TEXT,
    MONGODB_URI:
      "mongodb+srv://recovery:database-secret@production.invalid/studynotion?w=majority",
    NODE_ENV: "production",
  }
  await assert.rejects(
    run({
      connect: async () => assert.fail("must reject before connecting"),
      environment: baseEnvironment,
    }),
    /ENTITLEMENT_RECOVERY_CONFIRM/
  )

  const status = await run({
    argv: ["--status-only"],
    connect: async () => {},
    disconnect: async () => {},
    environment: baseEnvironment,
    serviceFactory: ({ sidecarStartedAt }) => {
      assert.equal(sidecarStartedAt.toISOString(), BOUNDARY_TEXT)
      return {
        async getOperationalStatus(options) {
          assert.equal(options, undefined)
          return validStatusReport()
        },
      }
    },
  })
  assert.equal(status.exitCode, EXIT_CODES.completed)

  const mutation = await run({
    connect: async () => {},
    disconnect: async () => {},
    environment: {
      ...baseEnvironment,
      ENTITLEMENT_RECOVERY_CONFIRM: ENTITLEMENT_RECOVERY_CONFIRMATION,
    },
    serviceFactory: () => ({
      async runBatch({ limit }) {
        return validRecoveryReport({ limit })
      },
    }),
  })
  assert.equal(mutation.exitCode, EXIT_CODES.completed)

  await assert.rejects(
    run({
      connect: async () => assert.fail("must reject before connecting"),
      environment: {
        ENTITLEMENT_SIDECAR_STARTED_AT: BOUNDARY_TEXT,
        MONGODB_URI:
          "mongodb://production.example.invalid/studynotion_recovery",
        NODE_ENV: "development",
      },
    }),
    /ENTITLEMENT_RECOVERY_CONFIRM/
  )
})

test("recovery rejects empty or mistyped runtime modes before connecting", async () => {
  for (const nodeEnvironment of [undefined, "", "prod"]) {
    let connected = false
    await assert.rejects(
      run({
        connect: async () => {
          connected = true
        },
        environment: {
          ENTITLEMENT_SIDECAR_STARTED_AT: BOUNDARY_TEXT,
          MONGODB_URI: "mongodb://127.0.0.1/studynotion_recovery_test_cli",
          ...(nodeEnvironment === undefined
            ? {}
            : { NODE_ENV: nodeEnvironment }),
        },
      }),
      /NODE_ENV/
    )
    assert.equal(connected, false)
  }
})

test("blocking operational status has exit code 2", async () => {
  const result = await run({
    argv: ["--status-only"],
    connect: async () => {},
    disconnect: async () => {},
    environment: {
      ENTITLEMENT_SIDECAR_STARTED_AT: BOUNDARY_TEXT,
      MONGODB_URI: "mongodb://127.0.0.1/studynotion_recovery_test_cli",
      NODE_ENV: "test",
    },
    serviceFactory: () => ({
      async getOperationalStatus() {
        return validStatusReport({
          status: "blocking",
          counts: {
            ...validStatusReport().counts,
            completedDeletionCurrent: 1,
          },
        })
      },
    }),
  })

  assert.equal(result.exitCode, EXIT_CODES.blocking)
  assert.equal(result.report.status, "blocking")
})

test("runner fails closed on missing boundary, invalid reports, and dependency errors", async () => {
  await assert.rejects(
    run({ environment: { MONGODB_URI: "mongodb://localhost/test" } }),
    /ENTITLEMENT_SIDECAR_STARTED_AT/
  )

  await assert.rejects(
    run({
      connect: async () => {},
      disconnect: async () => {},
      environment: {
        ENTITLEMENT_RECOVERY_CONFIRM: ENTITLEMENT_RECOVERY_CONFIRMATION,
        ENTITLEMENT_SIDECAR_STARTED_AT: BOUNDARY_TEXT,
        MONGODB_URI: "mongodb://localhost/test",
        NODE_ENV: "test",
      },
      serviceFactory: () => ({
        async runBatch() {
          return { status: "completed" }
        },
      }),
    }),
    /invalid report/
  )

  assert.equal(
    classifyOperationalError({ name: "MongoServerSelectionError" }),
    "dependency_unavailable"
  )
  assert.equal(
    classifyOperationalError({ code: "ENTITLEMENT_RECOVERY_CONFIGURATION" }),
    "configuration_error"
  )
})

test("runner rejects report fields that could leak identifiers or cursors", async () => {
  const base = {
    connect: async () => {},
    disconnect: async () => {},
    environment: {
      ENTITLEMENT_RECOVERY_CONFIRM: ENTITLEMENT_RECOVERY_CONFIRMATION,
      ENTITLEMENT_SIDECAR_STARTED_AT: BOUNDARY_TEXT,
      MONGODB_URI: "mongodb://127.0.0.1/studynotion_recovery_test_cli",
      NODE_ENV: "test",
    },
  }

  await assert.rejects(
    run({
      ...base,
      serviceFactory: () => ({
        async runBatch() {
          return validRecoveryReport({
            catchUp: { ...validCatchUp, nextCursor: "purchase-secret-id" },
          })
        },
      }),
    }),
    /invalid catch-up report/
  )

  await assert.rejects(
    run({
      ...base,
      argv: ["--status-only"],
      serviceFactory: () => ({
        async getOperationalStatus() {
          return validStatusReport({ studentId: "student-secret-id" })
        },
      }),
    }),
    /invalid report/
  )
})
