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

  const captureCleanupFailure = async (service, cleanup) => {
    try {
      await cleanup()
      return null
    } catch (error) {
      return { error, service }
    }
  }

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

    let cleanupCompleted = false
    try {
      const httpFailure = await captureCleanupFailure("http", closeHttpServer)
      const dependencyFailures = await Promise.all([
        captureCleanupFailure("redis", () => services.redis.disconnect()),
        captureCleanupFailure("database", () => services.database.disconnect()),
      ])
      const failures = [httpFailure, ...dependencyFailures].filter(Boolean)
      if (failures.length) {
        throw new AggregateError(
          failures.map(({ error }) => error),
          `API shutdown cleanup failed: ${failures
            .map(({ service }) => service)
            .join(", ")}`
        )
      }
      process.exitCode = exitCode
      cleanupCompleted = true
    } catch (error) {
      services.logger.error("api.shutdown_failed", { error })
      process.exitCode = 1
    } finally {
      // A rejected cleanup can leave a provider socket alive. Retain the
      // bounded forced-exit guard in that case; it is unref'ed, so it does not
      // delay an otherwise clean natural exit.
      if (cleanupCompleted) clearTimeout(forceExit)
    }
  }

  return { shutdown, startServer }
}

module.exports = { createServerLifecycle }
