const assert = require("node:assert/strict")
const {
  chmod,
  mkdtemp,
  readFile,
  readdir,
  rm,
  stat,
  symlink,
  writeFile,
} = require("node:fs/promises")
const os = require("node:os")
const path = require("node:path")
const test = require("node:test")

const {
  CHECKPOINT_FILE_MODE,
  ScheduledRecoveryCheckpointError,
  main,
  parseBatchSize,
  parseImageDigest,
  parseCheckpointPath,
  readCheckpoint,
  runScheduledRecovery,
  writeCheckpoint,
} = require("../scripts/schedule-entitlement-recovery")

const CURSOR_A = "64b000000000000000000003"
const CURSOR_B = "64b000000000000000000004"
const HAS_POSIX_PERMISSION_MODEL = process.platform !== "win32"

const recoveryReport = ({ continuation, hasMore = false } = {}) => ({
  schemaVersion: 1,
  status: hasMore ? "warning" : "completed",
  startedAt: "2026-08-11T10:00:00.000Z",
  completedAt: "2026-08-11T10:00:01.000Z",
  durationMs: 1000,
  limit: 25,
  catchUp: {
    activatedCount: 1,
    examinedCount: 25,
    failedCount: 0,
    hasMore,
    reservedCount: 1,
    terminalizedCount: 0,
    ...(continuation ? { continuation } : {}),
  },
  recovery: {
    activated: 1,
    cancelled: 0,
    conflicts: 0,
    expiredLeasesReleased: 0,
    manualReviewRequired: 0,
    retried: 0,
    revoked: 0,
  },
})

const privateCheckpoint = async (t) => {
  const directory = await mkdtemp(
    path.join(os.tmpdir(), "studynotion-recovery-scheduler-")
  )
  await chmod(directory, 0o700)
  t.after(() => rm(directory, { force: true, recursive: true }))
  return {
    directory,
    checkpointPath: path.join(directory, "checkpoint.json"),
  }
}

test("scheduled recovery configuration requires an absolute path and bounded batch", () => {
  assert.equal(parseBatchSize(undefined), 25)
  assert.equal(parseBatchSize("1"), 1)
  assert.equal(parseBatchSize("100"), 100)
  for (const value of ["0", "101", "1.5", "01", "-1", "unbounded"]) {
    assert.throws(() => parseBatchSize(value), /integer from 1 through 100/)
  }

  const absoluteCheckpointPath = path.join(
    path.parse(process.cwd()).root,
    "var",
    "lib",
    "studynotion",
    "checkpoint.json"
  )
  assert.equal(
    parseCheckpointPath(absoluteCheckpointPath),
    path.normalize(absoluteCheckpointPath)
  )
  assert.throws(() => parseCheckpointPath(), /is required/)
  assert.throws(
    () => parseCheckpointPath("relative/checkpoint.json"),
    /absolute file path/
  )
  assert.throws(() => parseCheckpointPath("/"), /absolute file path/)

  const digest = `registry.example/studynotion-api@sha256:${"a".repeat(64)}`
  assert.equal(parseImageDigest(digest), digest)
  for (const value of [
    "studynotion-api:latest",
    "studynotion-api:main",
    `INVALID@sha256:${"a".repeat(64)}`,
    `https://registry.example/studynotion-api@sha256:${"a".repeat(64)}`,
    `registry.example:70000/studynotion-api@sha256:${"a".repeat(64)}`,
    `studynotion-api@sha256:${"a".repeat(63)}`,
    `studynotion-api@sha256:${"A".repeat(64)}`,
  ]) {
    assert.throws(() => parseImageDigest(value), /immutable sha256/)
  }
})

test("checkpoint storage is exact-mode, strict-shape, and symlink refusing", async (t) => {
  const { checkpointPath, directory } = await privateCheckpoint(t)
  assert.equal(await readCheckpoint(checkpointPath), undefined)

  if (HAS_POSIX_PERMISSION_MODEL) {
    await chmod(directory, 0o755)
    await assert.rejects(
      readCheckpoint(checkpointPath),
      (error) => error?.code === "ENTITLEMENT_RECOVERY_SCHEDULER_CHECKPOINT"
    )
    await chmod(directory, 0o700)
  }

  await writeFile(
    checkpointPath,
    `${JSON.stringify({ schemaVersion: 1, continuation: CURSOR_A })}\n`,
    { mode: CHECKPOINT_FILE_MODE }
  )
  await chmod(checkpointPath, CHECKPOINT_FILE_MODE)
  assert.equal(await readCheckpoint(checkpointPath), CURSOR_A)

  if (HAS_POSIX_PERMISSION_MODEL) {
    await chmod(checkpointPath, 0o640)
    await assert.rejects(
      readCheckpoint(checkpointPath),
      (error) => error?.code === "ENTITLEMENT_RECOVERY_SCHEDULER_CHECKPOINT"
    )
  }

  await rm(checkpointPath)
  await writeFile(checkpointPath, '{"schemaVersion":1,"extra":true}\n', {
    mode: CHECKPOINT_FILE_MODE,
  })
  await assert.rejects(readCheckpoint(checkpointPath), /checkpoint/i)

  await rm(checkpointPath)
  const targetPath = path.join(directory, "target.json")
  await writeFile(targetPath, '{"schemaVersion":1}\n', {
    mode: CHECKPOINT_FILE_MODE,
  })
  if (process.platform === "win32") {
    await assert.rejects(
      readCheckpoint(checkpointPath, {
        lstat: async (candidatePath) =>
          candidatePath === directory
            ? {
                isDirectory: () => true,
                isSymbolicLink: () => false,
              }
            : {
                isFile: () => true,
                isSymbolicLink: () => true,
              },
      }),
      /checkpoint/i
    )
  } else {
    await symlink(targetPath, checkpointPath)
    await assert.rejects(readCheckpoint(checkpointPath), /checkpoint/i)
  }
})

test("checkpoint replacement is atomic, mode 0600, and represents wraparound without deletion", async (t) => {
  const { checkpointPath, directory } = await privateCheckpoint(t)

  await writeCheckpoint(checkpointPath, CURSOR_A)
  if (HAS_POSIX_PERMISSION_MODEL) {
    assert.equal((await stat(checkpointPath)).mode & 0o777, 0o600)
  }
  assert.equal(await readCheckpoint(checkpointPath), CURSOR_A)

  await writeCheckpoint(checkpointPath, CURSOR_B)
  assert.equal(await readCheckpoint(checkpointPath), CURSOR_B)
  assert.deepEqual(
    (await readdir(directory)).filter((name) => name.endsWith(".tmp")),
    []
  )

  await writeCheckpoint(checkpointPath, undefined)
  assert.equal(await readCheckpoint(checkpointPath), undefined)
  assert.deepEqual(JSON.parse(await readFile(checkpointPath, "utf8")), {
    schemaVersion: 1,
  })
})

test("scheduled recovery advances and wraps the private cursor without returning it", async (t) => {
  const { checkpointPath } = await privateCheckpoint(t)
  const calls = []
  const environment = {
    ENTITLEMENT_RECOVERY_BATCH_SIZE: "25",
    ENTITLEMENT_RECOVERY_CHECKPOINT_FILE: checkpointPath,
  }

  const first = await runScheduledRecovery({
    environment,
    recoveryRunner: async (options) => {
      calls.push(options)
      return {
        exitCode: 1,
        report: recoveryReport({ continuation: CURSOR_A, hasMore: true }),
      }
    },
  })
  assert.equal(first.exitCode, 1)
  assert.deepEqual(calls[0].argv, ["--limit", "25"])
  assert.equal(await readCheckpoint(checkpointPath), CURSOR_A)
  assert.equal(Object.hasOwn(first.report.catchUp, "continuation"), false)
  assert.doesNotMatch(JSON.stringify(first), new RegExp(CURSOR_A))
  assert.doesNotMatch(JSON.stringify(first), new RegExp(checkpointPath))

  const second = await runScheduledRecovery({
    environment,
    recoveryRunner: async (options) => {
      calls.push(options)
      return { exitCode: 0, report: recoveryReport() }
    },
  })
  assert.equal(second.exitCode, 0)
  assert.deepEqual(calls[1].argv, ["--limit", "25", "--continuation", CURSOR_A])
  assert.equal(await readCheckpoint(checkpointPath), undefined)
})

test("a failed recovery leaves the prior checkpoint unchanged", async (t) => {
  const { checkpointPath } = await privateCheckpoint(t)
  await writeCheckpoint(checkpointPath, CURSOR_A)

  await assert.rejects(
    runScheduledRecovery({
      environment: {
        ENTITLEMENT_RECOVERY_CHECKPOINT_FILE: checkpointPath,
      },
      recoveryRunner: async () => {
        throw Object.assign(new Error("dependency unavailable"), {
          code: "ETIMEDOUT",
        })
      },
    }),
    /dependency unavailable/
  )
  assert.equal(await readCheckpoint(checkpointPath), CURSOR_A)
})

test("scheduled command preserves runner exits and never prints cursor or checkpoint path", async () => {
  let exitCode
  let stdout = ""
  let stderr = ""
  const safeReport = {
    ...recoveryReport({ continuation: CURSOR_A, hasMore: true }),
    checkpointPath: "/private/recovery/checkpoint.json",
  }

  await main({
    runScheduled: async () => ({ exitCode: 1, report: safeReport }),
    setExitCode: (value) => {
      exitCode = value
    },
    writeError: (value) => {
      stderr += value
    },
    writeOutput: (value) => {
      stdout += value
    },
  })
  assert.equal(exitCode, 1)
  assert.equal(stderr, "")
  assert.match(stdout, /"status":"warning"/)
  assert.doesNotMatch(stdout, new RegExp(CURSOR_A))
  assert.doesNotMatch(stdout, /checkpointPath/)

  const sensitivePath = "/private/recovery/checkpoint.json"
  const sensitiveError = new ScheduledRecoveryCheckpointError(
    `${sensitivePath} ${CURSOR_A}`
  )
  stdout = ""
  stderr = ""
  await main({
    runScheduled: async () => {
      throw sensitiveError
    },
    setExitCode: (value) => {
      exitCode = value
    },
    writeError: (value) => {
      stderr += value
    },
    writeOutput: (value) => {
      stdout += value
    },
  })
  assert.equal(exitCode, 3)
  assert.equal(stdout, "")
  assert.match(stderr, /"classification":"checkpoint_error"/)
  assert.doesNotMatch(stderr, new RegExp(CURSOR_A))
  assert.doesNotMatch(stderr, new RegExp(sensitivePath))
})

test("operations Compose fixes one immutable image to one hardened process", async () => {
  const compose = await readFile(
    path.resolve(__dirname, "../../..", "compose.operations.yml"),
    "utf8"
  )
  assert.match(compose, /STUDYNOTION_API_IMAGE_DIGEST:\?/)
  assert.match(compose, /container_name: studynotion-entitlement-recovery/)
  assert.match(compose, /ENTITLEMENT_RECOVERY_BATCH_SIZE: "25"/)
  assert.match(compose, /read_only: true/)
  assert.match(compose, /disable: true/)
  assert.doesNotMatch(compose, /^\s+build:/m)
  assert.doesNotMatch(compose, /^\s+ports:/m)
})
