const net = require("node:net")

const DISPOSABLE_SEED_CONFIRMATION = "seed-disposable-database"
const DISPOSABLE_DATABASE_PATTERN =
  /^studynotion_seed_disposable_[a-z0-9][a-z0-9_-]{0,62}$/i
const DATABASE_NAME_PATTERN = /^[a-z0-9_-]{1,64}$/i
const SYSTEM_DATABASES = new Set(["admin", "config", "local"])

class SeedSafetyError extends Error {
  constructor(message) {
    super(message)
    this.name = "SeedSafetyError"
  }
}

const parseMongoTarget = (value) => {
  if (typeof value !== "string" || !value.trim()) {
    throw new SeedSafetyError(
      "MONGODB_URI is required to seed a local or explicitly disposable database"
    )
  }

  let url
  try {
    url = new URL(value)
  } catch {
    throw new SeedSafetyError("The seed MongoDB URI is invalid")
  }

  if (!new Set(["mongodb:", "mongodb+srv:"]).has(url.protocol)) {
    throw new SeedSafetyError("The seed target must use a MongoDB URI")
  }

  let databaseName
  try {
    databaseName = decodeURIComponent(url.pathname.replace(/^\//, ""))
  } catch {
    throw new SeedSafetyError("The seed MongoDB database name is invalid")
  }
  if (
    !DATABASE_NAME_PATTERN.test(databaseName) ||
    SYSTEM_DATABASES.has(databaseName.toLowerCase())
  ) {
    throw new SeedSafetyError(
      "The seed target must name one non-system MongoDB database"
    )
  }

  return {
    databaseName,
    hostname: url.hostname.replace(/^\[|\]$/g, "").toLowerCase(),
  }
}

const isLoopbackHostname = (hostname) => {
  if (hostname === "localhost" || hostname === "::1") return true
  return net.isIP(hostname) === 4 && hostname.startsWith("127.")
}

const assertSafeSeedTarget = ({
  disposableConfirmation,
  mongoUrl,
  nodeEnv,
}) => {
  if (
    String(nodeEnv || "")
      .trim()
      .toLowerCase() === "production"
  ) {
    throw new SeedSafetyError("Demo seed data is disabled in production")
  }

  const target = parseMongoTarget(mongoUrl)
  if (isLoopbackHostname(target.hostname)) return mongoUrl

  if (
    disposableConfirmation !== DISPOSABLE_SEED_CONFIRMATION ||
    !DISPOSABLE_DATABASE_PATTERN.test(target.databaseName)
  ) {
    throw new SeedSafetyError(
      "Non-loopback seed targets require the exact disposable-seed confirmation and a studynotion_seed_disposable_ database"
    )
  }

  return mongoUrl
}

module.exports = {
  assertSafeSeedTarget,
  DISPOSABLE_SEED_CONFIRMATION,
  isLoopbackHostname,
  SeedSafetyError,
}
