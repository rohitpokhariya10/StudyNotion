const mongoose = require("mongoose")

const env = require("./env")
const logger = require("../utils/logger")

// Mongoose applies this to queries/aggregations before passing supported
// connection options to the MongoDB driver.
mongoose.set("maxTimeMS", env.mongo.operationTimeoutMs)

let connectionHealthy = mongoose.connection.readyState === 1
let disconnectRequested = false

if (typeof mongoose.connection.on === "function") {
  mongoose.connection.on("connected", () => {
    connectionHealthy = true
  })
  mongoose.connection.on("reconnected", () => {
    connectionHealthy = true
    logger.info("database.reconnected")
  })
  mongoose.connection.on("disconnected", () => {
    connectionHealthy = false
    if (!disconnectRequested) logger.warn("database.disconnected")
  })
  mongoose.connection.on("error", (error) => {
    connectionHealthy = false
    logger.error("database.connection_error", { error })
  })
}

const connect = async () => {
  if (mongoose.connection.readyState === 1) {
    connectionHealthy = true
    return mongoose.connection
  }

  try {
    await mongoose.connect(env.mongoUrl, {
      autoIndex: env.mongo.autoIndex,
      connectTimeoutMS: env.mongo.connectTimeoutMs,
      maxPoolSize: env.mongo.maxPoolSize,
      minPoolSize: env.mongo.minPoolSize,
      serverSelectionTimeoutMS: env.mongo.serverSelectionTimeoutMs,
      socketTimeoutMS: env.mongo.socketTimeoutMs,
      timeoutMS: env.mongo.operationTimeoutMs,
      waitQueueTimeoutMS: env.mongo.waitQueueTimeoutMs,
    })
    connectionHealthy = true
    logger.info("database.connected")
    return mongoose.connection
  } catch (error) {
    connectionHealthy = false
    logger.error("database.connection_failed", { error })
    throw error
  }
}

const disconnect = async () => {
  connectionHealthy = false
  if (mongoose.connection.readyState === 0) return

  disconnectRequested = true
  try {
    await mongoose.disconnect()
    logger.info("database.disconnect_completed")
  } finally {
    disconnectRequested = false
  }
}

const isReady = () => connectionHealthy && mongoose.connection.readyState === 1

module.exports = { connect, disconnect, isReady }
