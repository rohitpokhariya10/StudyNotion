const mongoose = require("mongoose")

const env = require("./env")

// Mongoose applies this to queries/aggregations before passing supported
// connection options to the MongoDB driver.
mongoose.set("maxTimeMS", env.mongo.operationTimeoutMs)

const connect = async () => {
  if (mongoose.connection.readyState === 1) return mongoose.connection

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
    console.log("MongoDB connection established")
    return mongoose.connection
  } catch (error) {
    console.error("MongoDB connection failed:", error.message)
    throw error
  }
}

const disconnect = async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect()
  }
}

const isReady = () => mongoose.connection.readyState === 1

module.exports = { connect, disconnect, isReady }
