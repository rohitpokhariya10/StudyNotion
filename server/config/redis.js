const { createClient } = require("redis")

const env = require("./env")
const logger = require("../utils/logger")

let client

const isConfigured = () => Boolean(env.redisUrl)

const getClient = () => {
  if (!isConfigured()) return null
  if (client) return client

  client = createClient({
    url: env.redisUrl,
    socket: {
      connectTimeout: 10000,
      reconnectStrategy(retries) {
        if (retries > 10) return new Error("Redis reconnect limit reached")
        return Math.min(100 * 2 ** retries, 3000)
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
  if (!redisClient.isOpen) await redisClient.connect()
  await redisClient.ping()
  logger.info("redis.connected")
  return redisClient
}

const disconnect = async () => {
  if (!client?.isOpen) return
  if (client.isReady) await client.quit()
  else client.destroy()
  logger.info("redis.disconnect_completed")
}

const isReady = () => !isConfigured() || Boolean(client?.isReady)

const sendCommand = async (...command) => {
  const redisClient = getClient()
  if (!redisClient?.isReady) throw new Error("Redis is not ready")
  return redisClient.sendCommand(command)
}

module.exports = { connect, disconnect, isConfigured, isReady, sendCommand }
