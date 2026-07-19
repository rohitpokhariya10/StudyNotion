import { execFileSync } from "node:child_process"
import { existsSync, lstatSync, readFileSync } from "node:fs"

const MAX_BUFFER_BYTES = 16 * 1024 * 1024

const rules = [
  {
    id: "private-key",
    expression:
      /-----BEGIN (?:RSA |EC |DSA |OPENSSH |PGP )?PRIVATE KEY-----/g,
    neverAllow: true,
  },
  {
    id: "aws-access-key",
    expression: /\b(?:AKIA|ASIA)[0-9A-Z]{16}\b/g,
  },
  {
    id: "github-token",
    expression:
      /\b(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{30,})\b/g,
  },
  {
    id: "npm-token",
    expression: /\bnpm_[A-Za-z0-9]{36}\b/g,
  },
  {
    id: "slack-token",
    expression: /\bxox[baprs]-[A-Za-z0-9-]{10,}\b/g,
  },
  {
    id: "google-api-key",
    expression: /\bAIza[0-9A-Za-z_-]{35}\b/g,
  },
  {
    id: "stripe-secret-key",
    expression: /\bsk_(?:live|test)_[0-9A-Za-z]{16,}\b/g,
  },
  {
    id: "sendgrid-api-key",
    expression: /\bSG\.[A-Za-z0-9_-]{16,}\.[A-Za-z0-9_-]{16,}\b/g,
  },
  {
    id: "jwt",
    expression:
      /\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b/g,
  },
  {
    id: "credentialed-database-uri",
    expression:
      /\b(?:mongodb(?:\+srv)?|rediss?):\/\/[^\s:/@]+:[^\s/@]+@[^\s"'<>]+/gi,
  },
  {
    id: "sensitive-assignment",
    expression:
      /\b(?:ADMIN_PASSWORD|AWS_SECRET_ACCESS_KEY|CLOUD_API_SECRET|DATABASE_URL|GOOGLE_CLIENT_SECRET|JWT_SECRET|MAIL_PASS|MONGODB_URI|MONGODB_URL|OTP_SECRET|PRIVATE_KEY|RAZORPAY_SECRET|RAZORPAY_WEBHOOK_SECRET|REDIS_URL|RESEND_API_KEY)\b[ \t]*(?:=(?!=)|:)[ \t]*(?:"([^"\r\n]+)"|'([^'\r\n]+)'|`([^`\r\n]+)`|([^\s,#}\r\n]+))/gi,
    value(match) {
      return match.slice(1).find((candidate) => candidate !== undefined) || ""
    },
  },
]

const placeholderPattern =
  /(?:change[-_ ]?me|ci[-_ ]?build|contract|dummy|example|fake|fixture|local|not[-_ ]?a[-_ ]?real|placeholder|replace|sample|studynotion\.test|test[-_ ])/i
const fixturePathPattern =
  /(?:^|\/)(?:__fixtures__|fixtures?|tests?)(?:\/|$)|\.(?:spec|test)\.[cm]?[jt]sx?$/i
const dynamicReferencePattern =
  /^(?:\$\{|env\.|import\.meta\.env\.|process\.env\.|secrets\.)/i
const sourceFilePattern = /\.[cm]?[jt]sx?$/i
const codeReferencePattern = /^[A-Za-z_$][A-Za-z0-9_.$]*$/
const databaseUriPattern = /^(?:mongodb(?:\+srv)?|rediss?):\/\//i
const credentialedUriPattern =
  /^(?:mongodb(?:\+srv)?|rediss?):\/\/[^\s:/@]+:[^\s/@]+@/i

const compareText = (left, right) => (left < right ? -1 : left > right ? 1 : 0)

const listCandidateFiles = () => {
  const output = execFileSync(
    "git",
    ["ls-files", "-z", "--cached", "--others", "--exclude-standard"],
    {
      encoding: "buffer",
      maxBuffer: MAX_BUFFER_BYTES,
      stdio: ["ignore", "pipe", "pipe"],
    }
  )

  return output
    .toString("utf8")
    .split("\0")
    .filter(Boolean)
    .sort(compareText)
}

const isBinary = (buffer) => {
  const sampleLength = Math.min(buffer.length, 8192)
  for (let index = 0; index < sampleLength; index += 1) {
    if (buffer[index] === 0) return true
  }
  return false
}

const lineNumberAt = (content, offset) => {
  let line = 1
  for (let index = 0; index < offset; index += 1) {
    if (content.charCodeAt(index) === 10) line += 1
  }
  return line
}

const isAllowedFixture = (file, candidate) => {
  const value = candidate.trim()
  if (!value || dynamicReferencePattern.test(value)) return true
  if (/^<[^>]+>$/.test(value)) return true
  if (sourceFilePattern.test(file) && codeReferencePattern.test(value)) return true
  if (databaseUriPattern.test(value) && !credentialedUriPattern.test(value)) {
    return true
  }
  if (placeholderPattern.test(value)) return true

  return (
    fixturePathPattern.test(file) &&
    /(?:0{4,}|1{4,}|123456|abcdef|contract|dummy|example|fake|fixture|local|mock|secret|test)/i.test(value)
  )
}

const scanFile = (file) => {
  if (!existsSync(file)) return []
  const metadata = lstatSync(file)
  if (!metadata.isFile() || metadata.isSymbolicLink()) return []

  const buffer = readFileSync(file)
  if (isBinary(buffer)) return []

  const content = buffer.toString("utf8")
  const findings = []

  for (const rule of rules) {
    rule.expression.lastIndex = 0
    for (const match of content.matchAll(rule.expression)) {
      const candidate = rule.value ? rule.value(match) : match[0]
      if (!rule.neverAllow && isAllowedFixture(file, candidate)) continue

      findings.push({
        file,
        line: lineNumberAt(content, match.index),
        rule: rule.id,
      })
    }
  }

  return findings
}

const main = () => {
  const files = listCandidateFiles()
  const findings = files.flatMap(scanFile)
  const uniqueFindings = [
    ...new Map(
      findings.map((finding) => [
        `${finding.file}\0${finding.line}\0${finding.rule}`,
        finding,
      ])
    ).values(),
  ].sort((left, right) => {
    return (
      compareText(left.file, right.file) ||
      left.line - right.line ||
      compareText(left.rule, right.rule)
    )
  })

  if (uniqueFindings.length === 0) {
    console.log(`Secret scan passed (${files.length} files checked)`)
    return
  }

  console.error("Potential secrets detected (values redacted):")
  for (const finding of uniqueFindings) {
    console.error(`${finding.file}:${finding.line} [${finding.rule}]`)
  }
  console.error(`Secret scan failed (${uniqueFindings.length} finding(s))`)
  process.exitCode = 1
}

try {
  main()
} catch {
  console.error("Secret scan could not complete")
  process.exitCode = 2
}
