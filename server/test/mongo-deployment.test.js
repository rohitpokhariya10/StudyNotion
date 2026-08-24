const assert = require("node:assert/strict")
const test = require("node:test")

const {
  mongoJobOptions,
  validateMongoUriForEnvironment,
  validateProductionMongoUri,
} = require("../utils/mongoDeployment")

test("production MongoDB validation accepts authenticated TLS SRV and replica-set URIs", () => {
  assert.deepEqual(
    validateProductionMongoUri(
      "mongodb+srv://app:secret@cluster.studynotion.test/studynotion_staging?w=majority"
    ),
    {
      databaseName: "studynotion_staging",
      hosts: ["cluster.studynotion.test"],
      protocol: "mongodb+srv:",
    }
  )
  assert.deepEqual(
    validateProductionMongoUri(
      "mongodb://app:secret@mongo-a.studynotion.test:27017,mongo-b.studynotion.test:27017/studynotion?replicaSet=rs0&tls=true&w=majority"
    ).hosts,
    ["mongo-a.studynotion.test", "mongo-b.studynotion.test"]
  )
})

test("production MongoDB validation rejects missing auth, TLS, database, and loopback", () => {
  for (const value of [
    "mongodb+srv://cluster.studynotion.test/studynotion",
    "mongodb://app:secret@mongo.studynotion.test/studynotion",
    "mongodb://app:secret@127.0.0.1/studynotion?tls=true",
    "mongodb+srv://app:secret@cluster.studynotion.test/admin",
  ]) {
    assert.throws(() => validateProductionMongoUri(value), /MONGODB_URI/)
  }
})

test("production MongoDB validation rejects TLS verification bypasses", () => {
  for (const option of [
    "tlsInsecure=true",
    "tlsAllowInvalidCertificates=true",
    "tlsAllowInvalidHostnames=true",
    "TLSINSECURE=false",
  ]) {
    assert.throws(
      () =>
        validateProductionMongoUri(
          `mongodb+srv://app:secret@cluster.studynotion.test/studynotion?w=majority&${option}`
        ),
      /must not weaken TLS verification/
    )
  }

  for (const value of [
    "mongodb://app:secret@mongo.studynotion.test/studynotion?tls=TRUE&w=majority",
    "mongodb+srv://app:secret@cluster.studynotion.test/studynotion?tls=FALSE&w=majority",
  ]) {
    assert.throws(() => validateProductionMongoUri(value), /must enable TLS/)
  }
})

test("production MongoDB validation requires durable writes and primary reads", () => {
  for (const options of [
    "",
    "w=0",
    "w=1",
    "w=majority&readPreference=secondary",
    "w=majority&readPreference=nearest",
    "w=majority&journal=false",
    "w=majority&j=false",
    "w=majority&j=true&journal=true",
    "w=MAJORITY",
    "w=%20majority%20",
    "w=majority&readPreference=PRIMARY",
    "w=majority&journal=TRUE",
  ]) {
    const suffix = options ? `?${options}` : ""
    assert.throws(
      () =>
        validateProductionMongoUri(
          `mongodb+srv://app:secret@cluster.studynotion.test/studynotion${suffix}`
        ),
      /MONGODB_URI/
    )
  }

  assert.doesNotThrow(() =>
    validateProductionMongoUri(
      "mongodb+srv://app:secret@cluster.studynotion.test/studynotion?w=majority&readPreference=primary&journal=true"
    )
  )
})

test("an explicit deployment tier cannot bypass production runtime posture", () => {
  assert.throws(
    () =>
      validateMongoUriForEnvironment(
        "mongodb://127.0.0.1/studynotion_staging",
        { NODE_ENV: "development", DEPLOYMENT_TIER: "staging" }
      ),
    /requires NODE_ENV=production/
  )
})

test("MongoDB jobs reject mistyped runtime posture instead of failing open", () => {
  for (const environment of [
    {},
    { NODE_ENV: "" },
    { NODE_ENV: "prod" },
    { NODE_ENV: "production " },
    { NODE_ENV: "development", DEPLOYMENT_TIER: "staging" },
    { NODE_ENV: "production", DEPLOYMENT_TIER: "preview" },
  ]) {
    assert.throws(
      () =>
        validateMongoUriForEnvironment(
          "mongodb://127.0.0.1/studynotion_test",
          environment
        ),
      /NODE_ENV|DEPLOYMENT_TIER/
    )
  }
})

test("production MongoDB validation rejects IPv4-mapped IPv6 loopback", () => {
  assert.throws(
    () =>
      validateProductionMongoUri(
        "mongodb://app:secret@[::ffff:127.0.0.1]/studynotion?tls=true&w=majority"
      ),
    /loopback or development host/
  )
})

test("non-production disposable jobs do not require production MongoDB posture", () => {
  assert.equal(
    validateMongoUriForEnvironment("mongodb://127.0.0.1/studynotion_test", {
      NODE_ENV: "test",
    }),
    undefined
  )
})

test("MongoDB operational jobs require an explicit runtime mode", () => {
  assert.throws(
    () =>
      validateMongoUriForEnvironment(
        "mongodb://production.example.invalid/studynotion",
        {}
      ),
    /NODE_ENV must be explicitly set/
  )
})

test("one-shot MongoDB jobs always disable implicit writes and bound deadlines", () => {
  assert.deepEqual(mongoJobOptions({}), {
    autoCreate: false,
    autoIndex: false,
    connectTimeoutMS: 10_000,
    serverSelectionTimeoutMS: 10_000,
    socketTimeoutMS: 30_000,
    timeoutMS: 15_000,
  })
  assert.throws(
    () => mongoJobOptions({ MONGODB_CONNECT_TIMEOUT_MS: "60001" }),
    /MONGODB_CONNECT_TIMEOUT_MS/
  )
})
