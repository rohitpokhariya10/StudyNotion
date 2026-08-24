const net = require("node:net")
const { ConnectionString } = require("mongodb-connection-string-url")
const { validateProductionMongoUri } = require("./mongoDeployment")

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

const normalizeMongoHostname = (host) => {
  let parsed
  try {
    parsed = new URL(`http://${host}`)
  } catch {
    throw new SeedSafetyError("The seed MongoDB URI is invalid")
  }
  if (
    parsed.username ||
    parsed.password ||
    parsed.pathname !== "/" ||
    parsed.search ||
    parsed.hash
  ) {
    throw new SeedSafetyError("The seed MongoDB URI is invalid")
  }
  return parsed.hostname
    .replace(/^\[|\]$/g, "")
    .replace(/\.$/, "")
    .toLowerCase()
}

const parseMongoTarget = (value) => {
  if (typeof value !== "string" || !value.trim()) {
    throw new SeedSafetyError(
      "MONGODB_URI is required to seed a local or explicitly disposable database"
    )
  }

  const normalized = value.trim()
  let connectionString
  try {
    if (normalized.includes("#")) throw new TypeError("fragment")
    connectionString = new ConnectionString(normalized)
  } catch {
    throw new SeedSafetyError(
      /^[a-z][a-z0-9+.-]*:\/\//i.test(normalized) &&
        !/^mongodb(?:\+srv)?:\/\//.test(normalized)
        ? "The seed target must use a MongoDB URI"
        : "The seed MongoDB URI is invalid"
    )
  }
  const rawHosts = connectionString.hosts
  if (!Array.isArray(rawHosts) || !rawHosts.length) {
    throw new SeedSafetyError("The seed MongoDB URI is invalid")
  }
  const hostnames = rawHosts.map(normalizeMongoHostname)

  let databaseName
  try {
    databaseName = decodeURIComponent(
      connectionString.pathname.replace(/^\//, "")
    )
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
    hostnames,
  }
}

const isLoopbackHostname = (hostname) => {
  if (hostname === "localhost" || hostname === "::1") return true
  return net.isIP(hostname) === 4 && hostname.startsWith("127.")
}

const assertSafeSeedTarget = ({
  demoSeedMode,
  deploymentTier,
  disposableConfirmation,
  mongoUrl,
  nodeEnv,
}) => {
  const normalizedNodeEnvironment = String(nodeEnv || "")
    .trim()
    .toLowerCase()
  const normalizedDeploymentTier = String(deploymentTier || "")
    .trim()
    .toLowerCase()
  const normalizedSeedMode = String(demoSeedMode || "")
    .trim()
    .toLowerCase()

  if (normalizedDeploymentTier === "production") {
    throw new SeedSafetyError("Demo seed data is disabled in production")
  }

  if (normalizedDeploymentTier && normalizedDeploymentTier !== "staging") {
    throw new SeedSafetyError("DEPLOYMENT_TIER must be staging or production")
  }
  if (
    normalizedDeploymentTier === "staging" &&
    normalizedNodeEnvironment !== "production"
  ) {
    throw new SeedSafetyError(
      "DEPLOYMENT_TIER=staging requires NODE_ENV=production for demo seeding"
    )
  }

  if (normalizedNodeEnvironment === "production") {
    if (
      normalizedDeploymentTier !== "staging" ||
      normalizedSeedMode !== "staging" ||
      disposableConfirmation !== DISPOSABLE_SEED_CONFIRMATION
    ) {
      throw new SeedSafetyError(
        "Demo seed data is disabled in production unless DEPLOYMENT_TIER=staging, STUDYNOTION_DEMO_SEED_MODE=staging, and the exact disposable-seed confirmation are all set"
      )
    }
    const stagingTarget = parseMongoTarget(mongoUrl)
    if (!DISPOSABLE_DATABASE_PATTERN.test(stagingTarget.databaseName)) {
      throw new SeedSafetyError(
        "Production-style staging seeds require a studynotion_seed_disposable_ database"
      )
    }
    validateProductionMongoUri(mongoUrl)
    return mongoUrl
  }

  const target = parseMongoTarget(mongoUrl)
  if (target.hostnames.every(isLoopbackHostname)) return mongoUrl

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
