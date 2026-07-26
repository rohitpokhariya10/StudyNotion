const { cloudinaryConnect } = require("../config/cloudinary")
const database = require("../config/database")
const env = require("../config/env")
const redis = require("../config/redis")
const logger = require("../utils/logger")

const defaultServices = Object.freeze({
  cloudinaryConnect,
  database,
  env,
  logger,
  redis,
})

const createServerLifecycle = ({
  app,
  lifecycleState,
  services = defaultServices,
}) => {
  let server

  const startServer = async () => {
    if (server?.listening) return server

    await services.database.connect()
    await services.redis.connect()
    services.cloudinaryConnect()

    server = app.listen(services.env.port, () => {
      services.logger.info("api.listening", { port: services.env.port })
    })
    server.requestTimeout = services.env.requestTimeoutMs
    server.headersTimeout = Math.min(services.env.requestTimeoutMs, 60000)
    server.keepAliveTimeout = 5000
    server.maxRequestsPerSocket = 1000
    return server
  }

  const closeHttpServer = () =>
    new Promise((resolve, reject) => {
      if (!server?.listening) return resolve()
      server.close((error) => (error ? reject(error) : resolve()))
    })

  const shutdown = async (reason, exitCode = 0) => {
    if (lifecycleState.isShuttingDown) return
    lifecycleState.isShuttingDown = true
    services.logger.info("api.shutdown_started", { reason, exitCode })

    const forceExit = setTimeout(() => {
      services.logger.error("api.shutdown_timeout", {
        timeoutMs: services.env.shutdownTimeoutMs,
      })
      server?.closeAllConnections?.()
      process.exit(1)
    }, services.env.shutdownTimeoutMs)
    forceExit.unref()

    try {
      await closeHttpServer()
      await services.redis.disconnect()
      await services.database.disconnect()
      process.exitCode = exitCode
    } catch (error) {
      services.logger.error("api.shutdown_failed", { error })
      process.exitCode = 1
    } finally {
      clearTimeout(forceExit)
    }
  }

  return { shutdown, startServer }
}

module.exports = { createServerLifecycle }
