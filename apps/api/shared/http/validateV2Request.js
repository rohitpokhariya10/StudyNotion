const { sendV2Error } = require("./v2ErrorEnvelope")

const SOURCES = Object.freeze([
  [
    "params",
    {
      code: "INVALID_PARAMS",
      message: "The route parameters are invalid",
    },
  ],
  [
    "query",
    {
      code: "INVALID_QUERY",
      message: "The request query is invalid",
    },
  ],
  [
    "body",
    {
      code: "INVALID_BODY",
      message: "The request body is invalid",
    },
  ],
])
const SOURCE_NAMES = new Set(SOURCES.map(([source]) => source))

const stripControlCharacters = (value) =>
  String(value ?? "").replace(/\p{C}/gu, "")

const safeText = (value, maxLength) =>
  stripControlCharacters(value).slice(0, maxLength)

const validationDetails = (issues) => ({
  fields: issues.slice(0, 100).map((issue) => ({
    code: safeText(issue.code, 100) || "invalid",
    message: safeText(issue.message, 500) || "Invalid value",
    path: safeText(issue.path.map(String).join("."), 500),
  })),
})

const normalizeRule = (source, configured, defaults) => {
  if (!configured) return null
  const rule =
    typeof configured.safeParse === "function"
      ? { schema: configured }
      : configured
  if (typeof rule?.schema?.safeParse !== "function") {
    throw new TypeError(`A v2 ${source} validation schema is required`)
  }
  return {
    code: rule.code || defaults.code,
    message: rule.message || defaults.message,
    schema: rule.schema,
  }
}

const validateV2Request = (configuredSources = {}) => {
  if (
    !configuredSources ||
    typeof configuredSources !== "object" ||
    Array.isArray(configuredSources)
  ) {
    throw new TypeError("V2 validation sources must be an object")
  }
  const unsupportedSource = Object.keys(configuredSources).find(
    (source) => !SOURCE_NAMES.has(source)
  )
  if (unsupportedSource) {
    throw new TypeError(
      `Unsupported v2 validation source: ${unsupportedSource}`
    )
  }

  const rules = SOURCES.map(([source, defaults]) => [
    source,
    normalizeRule(source, configuredSources[source], defaults),
  ]).filter(([, rule]) => rule)

  if (!rules.length) {
    throw new TypeError("At least one v2 request schema is required")
  }

  return (req, res, next) => {
    const validated = {}

    for (const [source, rule] of rules) {
      const parsed = rule.schema.safeParse(req[source] ?? {})
      if (!parsed.success) {
        return sendV2Error(req, res, {
          code: rule.code,
          message: rule.message,
          statusCode: 400,
          details: validationDetails(parsed.error.issues),
        })
      }
      validated[source] = parsed.data
    }

    res.locals.v2Input = validated
    return next()
  }
}

module.exports = { validateV2Request, validationDetails }
