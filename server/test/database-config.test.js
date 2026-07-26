const assert = require("node:assert/strict")
const { EventEmitter } = require("node:events")
const test = require("node:test")

const calls = []
const logs = []
const connection = new EventEmitter()
connection.readyState = 0
const mongoose = {
  connection,
  connect: async (url, options) => {
    calls.push(["connect", url, options])
    connection.readyState = 1
    connection.emit("connected")
    return connection
  },
  disconnect: async () => {
    connection.readyState = 0
    connection.emit("disconnected")
  },
  set: (name, value) => calls.push(["set", name, value]),
}

const installMock = (modulePath, exports) => {
  const filename = require.resolve(modulePath)
  require.cache[filename] = { id: filename, filename, loaded: true, exports }
}

installMock("mongoose", mongoose)
installMock("../config/env", {
  mongoUrl: "mongodb://127.0.0.1:27017/config-test",
  mongo: {
    autoIndex: false,
    connectTimeoutMs: 9_000,
    maxPoolSize: 20,
    minPoolSize: 1,
    operationTimeoutMs: 15_000,
    serverSelectionTimeoutMs: 8_000,
    socketTimeoutMs: 30_000,
    waitQueueTimeoutMs: 7_000,
  },
})
installMock("../utils/logger", {
  debug: (event, fields) => logs.push(["debug", event, fields]),
  info: (event, fields) => logs.push(["info", event, fields]),
  warn: (event, fields) => logs.push(["warn", event, fields]),
  error: (event, fields) => logs.push(["error", event, fields]),
})

delete require.cache[require.resolve("../config/database")]
const database = require("../config/database")

test("Mongo deadlines use supported client and Mongoose options", async () => {
  await database.connect()

  assert.deepEqual(calls[0], ["set", "maxTimeMS", 15_000])
  const options = calls.find(([event]) => event === "connect")[2]
  assert.equal("maxTimeMS" in options, false)
  assert.equal(options.timeoutMS, 15_000)
  assert.equal(options.socketTimeoutMS, 30_000)
  assert.equal(options.waitQueueTimeoutMS, 7_000)
  assert.equal(database.isReady(), true)
})

test("Mongo connection signals immediately update readiness and emit safe log events", async () => {
  connection.emit("error", new Error("database connection dropped"))
  assert.equal(database.isReady(), false)
  assert.equal(
    logs.some(
      ([level, event]) =>
        level === "error" && event === "database.connection_error"
    ),
    true
  )

  connection.emit("connected")
  assert.equal(database.isReady(), true)

  connection.readyState = 0
  connection.emit("disconnected")
  assert.equal(database.isReady(), false)
  assert.equal(
    logs.some(
      ([level, event]) => level === "warn" && event === "database.disconnected"
    ),
    true
  )

  connection.readyState = 1
  connection.emit("reconnected")
  assert.equal(database.isReady(), true)

  await database.disconnect()
  assert.equal(database.isReady(), false)
  assert.equal(
    logs.some(
      ([level, event]) =>
        level === "info" && event === "database.disconnect_completed"
    ),
    true
  )
})
