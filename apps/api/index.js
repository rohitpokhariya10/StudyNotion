const { loadEnvironment } = require("./config/loadEnvironment")

loadEnvironment()

const { createApiRuntime } = require("./bootstrap")
const logger = require("./utils/logger")

const { app, shutdown, startServer } = createApiRuntime()

if (require.main === module) {
  startServer().catch((error) => {
    logger.error("api.startup_failed", { error })
    void shutdown("startup failure", 1)
  })

  process.once("SIGTERM", () => void shutdown("SIGTERM"))
  process.once("SIGINT", () => void shutdown("SIGINT"))
  process.once("uncaughtException", (error) => {
    logger.error("process.uncaught_exception", { error })
    void shutdown("uncaughtException", 1)
  })
  process.once("unhandledRejection", (reason) => {
    logger.error("process.unhandled_rejection", {
      error: logger.errorMetadata(reason),
    })
    void shutdown("unhandledRejection", 1)
  })
}

module.exports = { app, shutdown, startServer }
