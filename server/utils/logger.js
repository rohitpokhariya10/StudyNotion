const { version } = require("../package.json")

const LEVEL_PRIORITIES = Object.freeze({
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
})
const REDACTED = "[REDACTED]"
const MAX_DEPTH = 8
const MAX_ENTRIES = 100
const MAX_STRING_LENGTH = 4_000

const applicationMetadata = Object.freeze({
  app: "studynotion-api",
  version,
  environment: process.env.NODE_ENV || "development",
})

const defaultLevel =
  process.env.LOG_LEVEL ||
  (applicationMetadata.environment === "test"
    ? "error"
    : applicationMetadata.environment === "production"
      ? "info"
      : "debug")

const sensitiveKeyPattern =
  /(?:authorization|cookie|credential|password(?:hash)?|passwd|secret|session|signature|(?:signed|private|protected|media).*url|token|otp|api.?key|private.?key|email|phone|contact.?number|card.?(?:number|holder)|cvv|cvc|(?:first|last|full).?name|street.?address|birth.?date|date.?of.?birth|mongo(?:db)?.?(?:uri|url)|redis.?url)$/i

const sanitizeString = (value) => {
  const sanitized = String(value)
    .replace(/([a-z][a-z0-9+.-]*:\/\/)([^\s/@]+)@/gi, `$1${REDACTED}@`)
    .replace(/\bBearer\s+[A-Za-z0-9._~+/=-]+/gi, `Bearer ${REDACTED}`)
    .replace(
      /\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b/g,
      REDACTED
    )
    .replace(/\/s--[A-Za-z0-9_-]+--\//g, `/s--${REDACTED}--/`)
    .replace(
      /([?&](?:__cld_token__|access_?token|api_?key|auth_?token|authorization|code|credential|hmac|otp|password|refresh_?token|secret|session|signature|token|x[-_](?:amz|goog)[-_](?:credential|security[-_]?token|signature))=)[^&#\s]+/gi,
      `$1${REDACTED}`
    )
    .replace(
      /\b(__cld_token__|access_?token|api_?key|auth_?token|authorization|credential|hmac|otp|password|refresh_?token|secret|session|signature|token|x[-_](?:amz|goog)[-_](?:credential|security[-_]?token|signature))\s*[:=]\s*[^\s,;]+/gi,
      `$1=${REDACTED}`
    )
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, "[REDACTED_EMAIL]")

  if (sanitized.length <= MAX_STRING_LENGTH) return sanitized
  return `${sanitized.slice(0, MAX_STRING_LENGTH)}...[TRUNCATED]`
}

const isSensitiveKey = (key) =>
  sensitiveKeyPattern.test(String(key).replace(/[-_\s]/g, ""))

const redactValue = (value, state = { depth: 0, seen: new WeakSet() }) => {
  if (value === null || value === undefined) return value
  if (typeof value === "string") return sanitizeString(value)
  if (typeof value === "number" || typeof value === "boolean") return value
  if (typeof value === "bigint") return value.toString()
  if (typeof value === "symbol" || typeof value === "function") {
    return `[${typeof value}]`
  }
  if (state.depth >= MAX_DEPTH) return "[MAX_DEPTH]"

  if (value instanceof Date) return value.toISOString()
  if (Buffer.isBuffer(value)) return `[Buffer ${value.length} bytes]`

  if (state.seen.has(value)) return "[CIRCULAR]"
  state.seen.add(value)

  const childState = { depth: state.depth + 1, seen: state.seen }
  if (value instanceof Error) {
    const serialized = {
      name: sanitizeString(value.name || "Error"),
    }
    if (
      (typeof value.code === "string" || typeof value.code === "number") &&
      /^[A-Za-z0-9_.:-]{1,128}$/.test(String(value.code))
    ) {
      serialized.code = sanitizeString(value.code)
    }
    return serialized
  }

  if (Array.isArray(value)) {
    const entries = value
      .slice(0, MAX_ENTRIES)
      .map((entry) => redactValue(entry, childState))
    if (value.length > MAX_ENTRIES) entries.push("[TRUNCATED]")
    return entries
  }

  const entries = Object.entries(value).slice(0, MAX_ENTRIES)
  const output = {}
  for (const [key, entry] of entries) {
    output[key] = isSensitiveKey(key)
      ? REDACTED
      : redactValue(entry, childState)
  }
  if (Object.keys(value).length > MAX_ENTRIES) output._truncated = true
  return output
}

const defaultWrite = (line, level) => {
  const stream =
    level === "warn" || level === "error" ? process.stderr : process.stdout
  stream.write(`${line}\n`)
}

const validateLevel = (level) => {
  const normalized = String(level).trim().toLowerCase()
  if (!(normalized in LEVEL_PRIORITIES)) {
    throw new Error(
      `Unsupported log level "${level}"; expected debug, info, warn, or error`
    )
  }
  return normalized
}

const createLogger = ({
  level = defaultLevel,
  metadata = applicationMetadata,
  write = defaultWrite,
  now = () => new Date(),
  context = {},
} = {}) => {
  const configuredLevel = validateLevel(level)
  const safeMetadata = {
    app: sanitizeString(metadata.app || applicationMetadata.app),
    version: sanitizeString(metadata.version || applicationMetadata.version),
    environment: sanitizeString(
      metadata.environment || applicationMetadata.environment
    ),
  }

  const log = (messageLevel, event, fields = {}) => {
    if (LEVEL_PRIORITIES[messageLevel] < LEVEL_PRIORITIES[configuredLevel]) {
      return
    }

    const safeFields = redactValue({ ...context, ...fields })
    const record = {
      ...safeFields,
      timestamp: now().toISOString(),
      level: messageLevel,
      event: sanitizeString(event || "application.log"),
      ...safeMetadata,
    }
    write(JSON.stringify(record), messageLevel)
  }

  return Object.freeze({
    level: configuredLevel,
    debug: (event, fields) => log("debug", event, fields),
    info: (event, fields) => log("info", event, fields),
    warn: (event, fields) => log("warn", event, fields),
    error: (event, fields) => log("error", event, fields),
    child: (childContext) =>
      createLogger({
        level: configuredLevel,
        metadata: safeMetadata,
        write,
        now,
        context: { ...context, ...childContext },
      }),
  })
}

const logger = createLogger()

const errorMetadata = (error) => {
  const rawName = typeof error?.name === "string" ? error.name : "Error"
  const name = /^[A-Za-z][A-Za-z0-9_.-]{0,63}$/.test(rawName)
    ? rawName
    : "Error"
  const rawCode = error?.code
  const code =
    (typeof rawCode === "string" || typeof rawCode === "number") &&
    /^[A-Za-z0-9_.:-]{1,128}$/.test(String(rawCode))
      ? String(rawCode)
      : undefined
  return code ? { name, code } : { name }
}

const getRequestRoute = (req) => {
  if (typeof req.route?.path !== "string") return "[unmatched]"
  const baseUrl = typeof req.baseUrl === "string" ? req.baseUrl : ""
  return `${baseUrl}${req.route.path}` || "/"
}

const createHttpRequestLogger =
  (targetLogger = logger, now = process.hrtime.bigint) =>
  (req, res, next) => {
    const startedAt = now()
    let recorded = false

    const recordRequest = (aborted) => {
      if (recorded) return
      recorded = true
      const durationMs = Math.max(0, Number(now() - startedAt) / 1_000_000)

      targetLogger.info("http.request.completed", {
        requestId: req.requestId || "unknown",
        method: sanitizeString(req.method || "UNKNOWN"),
        path: getRequestRoute(req),
        statusCode: Number.isInteger(res.statusCode) ? res.statusCode : 0,
        durationMs: Math.round(durationMs * 1_000) / 1_000,
        aborted,
      })
    }

    res.once("finish", () => recordRequest(false))
    res.once("close", () => recordRequest(!res.writableEnded))
    next()
  }

module.exports = Object.freeze({
  ...logger,
  applicationMetadata,
  createHttpRequestLogger,
  createLogger,
  errorMetadata,
  getRequestRoute,
  redactValue,
})
