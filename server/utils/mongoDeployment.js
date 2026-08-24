const { ConnectionString } = require("mongodb-connection-string-url")
const {
  isLoopbackHostname,
  normalizeHostname: normalizeDeploymentHostname,
} = require("./deploymentNetwork")

const SYSTEM_DATABASES = new Set(["admin", "config", "local"])
const INSECURE_TLS_OPTIONS = new Set([
  "tlsallowinvalidcertificates",
  "tlsallowinvalidhostnames",
  "tlsinsecure",
])

class MongoDeploymentConfigurationError extends Error {
  constructor(message) {
    super(message)
    this.name = "MongoDeploymentConfigurationError"
    this.code = "MONGODB_DEPLOYMENT_CONFIGURATION"
  }
}

const configurationError = (message) =>
  new MongoDeploymentConfigurationError(message)

const normalizeHostname = (host) => {
  let parsed
  try {
    parsed = new URL(`http://${host}`)
  } catch {
    throw configurationError("Production MONGODB_URI contains an invalid host")
  }
  if (
    parsed.username ||
    parsed.password ||
    parsed.pathname !== "/" ||
    parsed.search ||
    parsed.hash
  ) {
    throw configurationError("Production MONGODB_URI contains an invalid host")
  }
  return normalizeDeploymentHostname(parsed.hostname)
}

const validateProductionMongoUri = (value) => {
  let connectionString
  try {
    if (typeof value !== "string" || !value.trim() || value.includes("#")) {
      throw new TypeError("invalid MongoDB URI")
    }
    connectionString = new ConnectionString(value.trim())
  } catch {
    throw configurationError(
      "MONGODB_URI must be a complete MongoDB connection URI"
    )
  }

  if (!connectionString.username || !connectionString.password) {
    throw configurationError(
      "Production MONGODB_URI must include authentication"
    )
  }

  let databaseName
  try {
    databaseName = decodeURIComponent(
      connectionString.pathname.replace(/^\//, "")
    ).trim()
  } catch {
    throw configurationError("MONGODB_URI database name is invalid")
  }
  if (
    !databaseName ||
    databaseName.includes("/") ||
    SYSTEM_DATABASES.has(databaseName.toLowerCase())
  ) {
    throw configurationError(
      "MONGODB_URI must name a non-system application database"
    )
  }

  const hosts = connectionString.hosts.map(normalizeHostname)
  if (!hosts.length || hosts.some(isLoopbackHostname)) {
    throw configurationError(
      "Production MONGODB_URI must not use a loopback or development host"
    )
  }

  const parameters = new Map()
  for (const [rawName, rawValue] of connectionString.searchParams) {
    const name = rawName.toLowerCase()
    if (parameters.has(name)) {
      throw configurationError(
        "Production MONGODB_URI must not repeat security options"
      )
    }
    // Security-sensitive option values must retain their exact driver-facing
    // spelling. Normalizing here could turn a custom write-concern tag such as
    // `MAJORITY` into MongoDB's special `majority` value even though the driver
    // does not.
    parameters.set(name, rawValue)
  }
  if ([...INSECURE_TLS_OPTIONS].some((name) => parameters.has(name))) {
    throw configurationError(
      "Production MONGODB_URI must not weaken TLS verification"
    )
  }

  const tls = parameters.get("tls")
  const ssl = parameters.get("ssl")
  if (tls !== undefined && ssl !== undefined) {
    throw configurationError(
      "Production MONGODB_URI must use one canonical TLS option"
    )
  }
  const tlsSetting = tls ?? ssl
  if (
    (connectionString.protocol === "mongodb:" && tlsSetting !== "true") ||
    (connectionString.protocol === "mongodb+srv:" &&
      tlsSetting !== undefined &&
      tlsSetting !== "true")
  ) {
    throw configurationError("Production MONGODB_URI must enable TLS")
  }

  if (parameters.get("w") !== "majority") {
    throw configurationError(
      "Production MONGODB_URI must set write concern w=majority"
    )
  }
  if (
    parameters.has("readpreference") &&
    parameters.get("readpreference") !== "primary"
  ) {
    throw configurationError(
      "Production MONGODB_URI must use primary read preference"
    )
  }
  if (parameters.has("journal") && parameters.has("j")) {
    throw configurationError(
      "Production MONGODB_URI must use one canonical journal option"
    )
  }
  const journalSetting = parameters.get("journal") ?? parameters.get("j")
  if (journalSetting !== undefined && journalSetting !== "true") {
    throw configurationError(
      "Production MONGODB_URI must not disable journaled writes"
    )
  }

  return Object.freeze({
    databaseName,
    hosts: Object.freeze(hosts),
    protocol: connectionString.protocol,
  })
}

const usesProductionPosture = (environment = process.env) => {
  const nodeEnvironment = environment.NODE_ENV
  if (nodeEnvironment === undefined) {
    throw configurationError(
      "NODE_ENV must be explicitly set for MongoDB operational jobs"
    )
  }
  if (!new Set(["development", "test", "production"]).has(nodeEnvironment)) {
    throw configurationError(
      "NODE_ENV must be development, test, or production for MongoDB jobs"
    )
  }
  const deploymentTier = environment.DEPLOYMENT_TIER || ""
  if (
    deploymentTier &&
    !new Set(["staging", "production"]).has(deploymentTier)
  ) {
    throw configurationError(
      "DEPLOYMENT_TIER must be staging or production for MongoDB jobs"
    )
  }
  if (deploymentTier && nodeEnvironment !== "production") {
    throw configurationError(
      "DEPLOYMENT_TIER requires NODE_ENV=production for MongoDB jobs"
    )
  }
  return nodeEnvironment === "production"
}

const validateMongoUriForEnvironment = (value, environment = process.env) =>
  usesProductionPosture(environment)
    ? validateProductionMongoUri(value)
    : undefined

const readTimeout = (environment, name, fallback, maximum) => {
  const rawValue = environment[name]
  const value =
    rawValue === undefined || rawValue === "" ? fallback : Number(rawValue)
  if (!Number.isSafeInteger(value) || value < 1_000 || value > maximum) {
    throw configurationError(
      `${name} must be an integer from 1000 through ${maximum}`
    )
  }
  return value
}

const mongoJobOptions = (
  environment = process.env,
  {
    operationFallback = 15_000,
    operationMaximum = 120_000,
    socketFallback = 30_000,
    socketMaximum = 120_000,
  } = {}
) =>
  Object.freeze({
    autoCreate: false,
    autoIndex: false,
    connectTimeoutMS: readTimeout(
      environment,
      "MONGODB_CONNECT_TIMEOUT_MS",
      10_000,
      60_000
    ),
    serverSelectionTimeoutMS: readTimeout(
      environment,
      "MONGODB_SERVER_SELECTION_TIMEOUT_MS",
      10_000,
      60_000
    ),
    socketTimeoutMS: readTimeout(
      environment,
      "MONGODB_SOCKET_TIMEOUT_MS",
      socketFallback,
      socketMaximum
    ),
    timeoutMS: readTimeout(
      environment,
      "MONGODB_OPERATION_TIMEOUT_MS",
      operationFallback,
      operationMaximum
    ),
  })

module.exports = {
  isLoopbackHostname,
  mongoJobOptions,
  MongoDeploymentConfigurationError,
  usesProductionPosture,
  validateMongoUriForEnvironment,
  validateProductionMongoUri,
}
