const { createClient } = require("redis")

const env = require("./env")
const { withDeadline } = require("../utils/deadline")
const logger = require("../utils/logger")

let client

const isConfigured = () => Boolean(env.redisUrl)

const commandTimeoutMs = () => env.redis?.commandTimeoutMs || 5000

const getClient = () => {
  if (!isConfigured()) return null
  if (client) return client

  client = createClient({
    url: env.redisUrl,
    commandOptions: {
      timeout: commandTimeoutMs(),
    },
    socket: {
      connectTimeout: env.redis?.connectTimeoutMs || 10000,
      // Never give up: a Redis outage must not leave this process with a
      // permanently dead client. Backoff is capped, with jitter so replicas
      // do not reconnect in lockstep.
      reconnectStrategy(retries) {
        const base = Math.min(100 * 2 ** Math.min(retries, 10), 5000)
        return base + Math.floor(Math.random() * 250)
      },
    },
  })
  client.on("error", (error) => {
    logger.error("redis.client_error", { error })
  })
  return client
}

const connect = async () => {
  const redisClient = getClient()
  if (!redisClient) return null
  try {
    if (!redisClient.isOpen) {
      await withDeadline(
        redisClient.connect(),
        env.redis?.connectTimeoutMs || 10000,
        "Redis connection deadline exceeded"
      )
    }
    await withDeadline(
      redisClient.ping(),
      commandTimeoutMs(),
      "Redis command deadline exceeded"
    )
    logger.info("redis.connected")
    return redisClient
  } catch (error) {
    redisClient.destroy?.()
    client = undefined
    throw error
  }
}

const disconnect = async () => {
  const redisClient = client
  client = undefined
  if (!redisClient) return

  // node-redis marks the socket closed before QUIT receives its reply. If that
  // reply rejects or stalls, a follow-up destroy cannot reliably release the
  // half-closed socket. Shutdown does not need a server acknowledgement, so
  // destroy the client synchronously and flush pending commands immediately.
  if (redisClient.isOpen) redisClient.destroy()
  logger.info("redis.disconnect_completed")
}

const isReady = () => !isConfigured() || Boolean(client?.isReady)

const sendCommand = async (...command) => {
  const redisClient = getClient()
  if (!redisClient?.isReady) throw new Error("Redis is not ready")
  return withDeadline(
    redisClient.sendCommand(command),
    commandTimeoutMs(),
    "Redis command deadline exceeded"
  )
}

module.exports = {
  connect,
  disconnect,
  isConfigured,
  isReady,
  sendCommand,
}
