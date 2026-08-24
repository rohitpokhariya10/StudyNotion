const assert = require("node:assert/strict")
const test = require("node:test")

const {
  IndexConfigurationError,
  main,
  run,
} = require("../scripts/create-indexes")

const productionEnvironment = {
  NODE_ENV: "production",
  MONGODB_URI:
    "mongodb+srv://application:database-secret@database.internal/studynotion?w=majority",
  MONGODB_AUTO_INDEX: "false",
}

test("production index creation requires an explicit backup-first confirmation", async () => {
  let connected = false
  await assert.rejects(
    run({
      connect: async () => {
        connected = true
      },
      environment: productionEnvironment,
      registeredModels: [],
    }),
    IndexConfigurationError
  )
  assert.equal(connected, false)
})

test("index creation requires confirmation in every runtime tier", async () => {
  let connected = false
  let created = false
  await assert.rejects(
    run({
      connect: async () => {
        connected = true
      },
      environment: {
        NODE_ENV: "development",
        MONGODB_URI: "mongodb://production.example.invalid/studynotion_indexes",
      },
      registeredModels: [
        {
          modelName: "Fixture",
          createIndexes: async () => {
            created = true
          },
        },
      ],
    }),
    /MIGRATION_CONFIRM=create-indexes/
  )
  assert.equal(connected, false)
  assert.equal(created, false)
})

test("index creation rejects empty or mistyped runtime modes before connecting", async () => {
  for (const nodeEnvironment of [undefined, "", "prod"]) {
    let connected = false
    await assert.rejects(
      run({
        connect: async () => {
          connected = true
        },
        environment: {
          ...(nodeEnvironment === undefined
            ? {}
            : { NODE_ENV: nodeEnvironment }),
          MONGODB_URI: "mongodb://127.0.0.1/studynotion_indexes_test",
        },
        registeredModels: [],
      }),
      /NODE_ENV/
    )
    assert.equal(connected, false)
  }
})

test("production index jobs require automatic index creation to remain disabled", async () => {
  await assert.rejects(
    run({
      environment: {
        ...productionEnvironment,
        INDEX_OPERATION: "verify",
        MONGODB_AUTO_INDEX: "true",
      },
      registeredModels: [],
    }),
    /MONGODB_AUTO_INDEX=false/
  )
})

test("verify mode is read only and proves every declared index is present", async () => {
  let createCalls = 0
  let connectOptions
  const writes = []
  const result = await run({
    connect: async (_url, options) => {
      connectOptions = options
    },
    environment: {
      ...productionEnvironment,
      INDEX_OPERATION: "verify",
    },
    registeredModels: [
      {
        modelName: "Fixture",
        createIndexes: async () => {
          createCalls += 1
        },
        diffIndexes: async () => ({ toCreate: [], toDrop: [] }),
      },
    ],
    write: (line) => writes.push(line),
  })

  assert.equal(createCalls, 0)
  assert.equal(connectOptions.autoCreate, false)
  assert.equal(connectOptions.autoIndex, false)
  assert.deepEqual(result, { modelCount: 1, operation: "verify" })
  assert.deepEqual(writes, ["Indexes verified: Fixture"])
})

test("index verification fails closed when a declared index is absent", async () => {
  await assert.rejects(
    run({
      connect: async () => {},
      environment: {
        ...productionEnvironment,
        INDEX_OPERATION: "verify",
      },
      registeredModels: [
        {
          modelName: "Fixture",
          diffIndexes: async () => ({
            toCreate: [{ key: { email: 1 }, unique: true }],
            toDrop: [],
          }),
        },
      ],
      write: () => {},
    }),
    /Required indexes are missing for Fixture/
  )
})

test("index job errors are emitted through the redacting structured logger", async () => {
  let disconnected = false
  const events = []
  const result = await main({
    disconnect: async () => {
      disconnected = true
    },
    runIndexes: async () => {
      throw new Error(
        "mongodb://fixture-user:fixture-secret@database.internal/studynotion"
      )
    },
    targetLogger: {
      error: (event, fields) => events.push({ event, fields }),
    },
  })

  assert.equal(result, undefined)
  assert.equal(disconnected, true)
  assert.deepEqual(events, [
    {
      event: "database.index_job_failed",
      fields: { error: { name: "Error" } },
    },
  ])
  process.exitCode = undefined
})
