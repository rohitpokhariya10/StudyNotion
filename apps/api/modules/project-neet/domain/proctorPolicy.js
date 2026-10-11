const { NEET_PROCTOR_SEVERITIES } = require("@studynotion/contracts/neet")

const {
  NEET_DEFAULT_PROCTOR_POLICY,
  NEET_DEFAULT_PROCTOR_RULES,
  NEET_MAX_STORED_WARNINGS,
} = require("../config/defaults")

const SEVERITY_RANK = Object.freeze(
  Object.fromEntries(
    NEET_PROCTOR_SEVERITIES.map((value, index) => [value, index])
  )
)

const UNCERTAIN_SIGNALS = new Set([
  "CAMERA_OBSTRUCTION",
  "CAMERA_INTERRUPTED",
  "MIC_INTERRUPTED",
  "FACE_ABSENT",
  "MULTIPLE_FACE_SIGNAL",
  "HEAD_AWAY_SIGNAL",
  "AUDIO_ACTIVITY",
])

const RULE_OVERRIDE_FIELDS = Object.freeze([
  "severity",
  "counted",
  "warnEvery",
  "escalateAfter",
  "enabled",
])

const plain = (value) =>
  value && typeof value.toObject === "function" ? value.toObject() : value

const pick = (source, fallback) => {
  const resolved = {}
  for (const [key, defaultValue] of Object.entries(fallback)) {
    const candidate = source?.[key]
    resolved[key] =
      candidate === undefined || candidate === null ? defaultValue : candidate
  }
  return resolved
}

const toRuleOverrideEntries = (rules) => {
  const value = plain(rules)
  if (!value) return []
  if (value instanceof Map) return [...value.entries()]
  return Object.entries(value)
}

// Merges a test's stored policy with the defaults into the immutable snapshot
// stored on an attempt. Unknown rule types and fields are ignored.
const resolveProctorPolicy = (stored = {}) => {
  const source = plain(stored) || {}
  const defaults = NEET_DEFAULT_PROCTOR_POLICY
  const rules = {}
  for (const [type, rule] of Object.entries(NEET_DEFAULT_PROCTOR_RULES)) {
    rules[type] = { enabled: true, counted: false, escalateAfter: 0, ...rule }
  }
  for (const [type, override] of toRuleOverrideEntries(source.rules)) {
    if (!rules[type] || !override) continue
    for (const field of RULE_OVERRIDE_FIELDS) {
      if (override[field] !== undefined && override[field] !== null) {
        rules[type][field] = override[field]
      }
    }
  }

  return {
    version: source.version || defaults.version,
    consentVersion: source.consentVersion || defaults.consentVersion,
    requirements: pick(source.requirements, defaults.requirements),
    monitoring: pick(source.monitoring, defaults.monitoring),
    signals: pick(source.signals, defaults.signals),
    warnings: pick(source.warnings, defaults.warnings),
    // Not configurable: no stored override can make monitoring submit or
    // cancel an attempt. Threshold breaches flag the attempt for review.
    autoSubmit: { enabled: false, softSignalsCanSubmit: false },
    mediaStorage: "NONE",
    rules,
  }
}

// The disclosed policy shown before consent and returned to the exam client.
const toPublicProctorPolicy = (policy) => ({
  version: policy.version,
  consentVersion: policy.consentVersion,
  requirements: { ...policy.requirements },
  monitoring: { ...policy.monitoring },
  signals: { ...policy.signals },
  warnings: { ...policy.warnings },
  // Always disabled, including for attempts whose stored policy predates the
  // flag-only rule.
  autoSubmit: { enabled: false, softSignalsCanSubmit: false },
  mediaStorage: "NONE",
})

const toClientSignalConfig = (policy) => ({ ...policy.signals })

// A rule is active only when its monitoring switch and device requirement are
// both enabled. Inactive signals are recorded as INFO and never warn.
const isRuleActive = (policy, rule) => {
  if (!rule || rule.enabled === false) return false
  if (rule.monitor && policy.monitoring[rule.monitor] !== true) return false
  if (rule.requires && policy.requirements[rule.requires] !== true) return false
  return true
}

const severityFor = (policy, type, totalOccurrences) => {
  const rule = policy.rules[type]
  if (!isRuleActive(policy, rule)) return "INFO"
  if (
    rule.escalateAfter > 0 &&
    totalOccurrences >= rule.escalateAfter &&
    SEVERITY_RANK[rule.severity] < SEVERITY_RANK.HIGH
  ) {
    return "HIGH"
  }
  return rule.severity
}

const warningMessage = ({ counted, level, policy, rule }) => {
  if (!counted) return rule.message
  if (level > policy.warnings.maxWarnings) {
    return `${rule.message} This attempt has been flagged for review by a person. Your exam continues and your answers still count.`
  }
  if (level === policy.warnings.maxWarnings) {
    return `Final notice: ${rule.message} Further notices will flag this attempt for review by a person.`
  }
  if (level === 1) return `Notice: ${rule.message}`
  return `Warning ${level} of ${policy.warnings.maxWarnings}: ${rule.message}`
}

const emptyCounter = () => ({ total: 0, pending: 0, lastWarnedAt: null })

const readCounters = (counters) => {
  const value = plain(counters)
  const entries =
    value instanceof Map ? [...value.entries()] : Object.entries(value || {})
  return Object.fromEntries(
    entries.map(([type, counter]) => [
      type,
      {
        total: counter?.total || 0,
        pending: counter?.pending || 0,
        lastWarnedAt: counter?.lastWarnedAt
          ? new Date(counter.lastWarnedAt)
          : null,
      },
    ])
  )
}

// Pure violation engine. Given the attempt's current proctoring state and a
// batch of newly accepted events, returns the next state plus decisions. The
// caller persists the result with a revision compare-and-set.
const evaluateProctorEvents = ({ events, now, policy, state }) => {
  const counters = readCounters(state.counters)
  let warningCount = state.warningCount || 0
  let softWarningCount = state.softWarningCount || 0
  let nextWarningNumber = (state.warningSequence || 0) + 1
  const newWarnings = []
  const decisions = []
  let thresholdExceeded = false
  const nowMs = now.getTime()
  const cooldownMs = policy.warnings.cooldownSeconds * 1000

  for (const event of events) {
    const rule = policy.rules[event.type]
    const counter = counters[event.type] || emptyCounter()
    counter.total += 1
    const severity = severityFor(policy, event.type, counter.total)
    const decision = { event, severity, warning: null }
    decisions.push(decision)
    counters[event.type] = counter

    if (!isRuleActive(policy, rule) || !(rule.warnEvery > 0)) {
      continue
    }

    counter.pending += 1
    const coolingDown =
      counter.lastWarnedAt &&
      nowMs - counter.lastWarnedAt.getTime() < cooldownMs
    if (counter.pending < rule.warnEvery || coolingDown) continue

    counter.pending = 0
    counter.lastWarnedAt = new Date(nowMs)
    const counted = !UNCERTAIN_SIGNALS.has(event.type) && rule.counted === true
    let level
    if (counted) {
      warningCount += 1
      level = warningCount
      if (warningCount > policy.warnings.maxWarnings) thresholdExceeded = true
    } else {
      softWarningCount += 1
      level = softWarningCount
    }

    const warning = {
      id: `w${nextWarningNumber}`,
      level,
      counted,
      ruleType: event.type,
      severity,
      message: warningMessage({ counted, level, policy, rule }),
      issuedAt: new Date(nowMs),
    }
    nextWarningNumber += 1
    decision.warning = warning
    newWarnings.push(warning)
  }

  return {
    // Kept for wire compatibility; monitoring never submits an attempt.
    autoSubmit: false,
    flagForReview: thresholdExceeded,
    decisions,
    newWarnings,
    state: {
      counters,
      softWarningCount,
      thresholdExceeded,
      warningCount,
      warningSequence: nextWarningNumber - 1,
    },
  }
}

const capWarnings = (warnings) => warnings.slice(-NEET_MAX_STORED_WARNINGS)

module.exports = {
  capWarnings,
  evaluateProctorEvents,
  isRuleActive,
  resolveProctorPolicy,
  severityFor,
  toClientSignalConfig,
  toPublicProctorPolicy,
}
