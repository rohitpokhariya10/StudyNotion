const localCredentials = Object.freeze({
  admin: Object.freeze({
    email: "admin@studynotion.local",
    password: "Admin@123",
  }),
  instructor: Object.freeze({
    email: "instructor@studynotion.local",
    password: "Instructor@123",
  }),
  student: Object.freeze({
    email: "student@studynotion.local",
    password: "Student@123",
  }),
})

const liveCredentialVariables = Object.freeze({
  admin: Object.freeze({
    email: "STUDYNOTION_LIVE_ADMIN_EMAIL",
    password: "STUDYNOTION_LIVE_ADMIN_PASSWORD",
  }),
  instructor: Object.freeze({
    email: "STUDYNOTION_LIVE_INSTRUCTOR_EMAIL",
    password: "STUDYNOTION_LIVE_INSTRUCTOR_PASSWORD",
  }),
  student: Object.freeze({
    email: "STUDYNOTION_LIVE_STUDENT_EMAIL",
    password: "STUDYNOTION_LIVE_STUDENT_PASSWORD",
  }),
})

const demoCredentialVariables = Object.freeze({
  admin: Object.freeze({
    email: "STUDYNOTION_DEMO_ADMIN_EMAIL",
    password: "STUDYNOTION_DEMO_ADMIN_PASSWORD",
  }),
  instructor: Object.freeze({
    email: "STUDYNOTION_DEMO_INSTRUCTOR_EMAIL",
    password: "STUDYNOTION_DEMO_INSTRUCTOR_PASSWORD",
  }),
  student: Object.freeze({
    email: "STUDYNOTION_DEMO_STUDENT_EMAIL",
    password: "STUDYNOTION_DEMO_STUDENT_PASSWORD",
  }),
})

const isLoopbackHostname = (hostname) => {
  const normalized = String(hostname || "")
    .trim()
    .toLowerCase()
    .replace(/^\[|\]$/g, "")
  if (normalized === "localhost" || normalized === "::1") return true
  return /^127(?:\.\d{1,3}){3}$/.test(normalized)
}

const parseBaseUrl = (value) => {
  let baseUrl
  try {
    baseUrl = new URL(value)
  } catch {
    throw new Error("STUDYNOTION_LIVE_BASE_URL must be a valid HTTP(S) URL")
  }
  if (
    !new Set(["http:", "https:"]).has(baseUrl.protocol) ||
    baseUrl.username ||
    baseUrl.password ||
    baseUrl.search ||
    baseUrl.hash ||
    baseUrl.pathname !== "/"
  ) {
    throw new Error(
      "STUDYNOTION_LIVE_BASE_URL must be an origin without credentials, a path, query, or fragment"
    )
  }
  const loopback = isLoopbackHostname(baseUrl.hostname)
  if (!loopback && baseUrl.protocol !== "https:") {
    throw new Error("A non-loopback live E2E target must use HTTPS")
  }
  return Object.freeze({
    baseURL: baseUrl.origin,
    loopback,
  })
}

const valueFrom = (environment, name) => {
  const value = environment[name]
  return typeof value === "string" ? value.trim() : ""
}

const readCredentials = (environment, role, loopback) => {
  const liveNames = liveCredentialVariables[role]
  const demoNames = demoCredentialVariables[role]
  const fallback = localCredentials[role]
  const email = loopback
    ? valueFrom(environment, liveNames.email) ||
      valueFrom(environment, demoNames.email) ||
      fallback.email
    : valueFrom(environment, liveNames.email)
  const password = loopback
    ? valueFrom(environment, liveNames.password) ||
      valueFrom(environment, demoNames.password) ||
      fallback.password
    : valueFrom(environment, liveNames.password)

  if (!email || !password) {
    throw new Error(
      `A non-loopback live E2E target requires ${liveNames.email} and ${liveNames.password}`
    )
  }
  if (email.length > 254 || !/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email)) {
    throw new Error(`${liveNames.email} must be a valid email address`)
  }
  if (Buffer.byteLength(password, "utf8") > 72) {
    throw new Error(`${liveNames.password} must contain at most 72 bytes`)
  }
  if (!loopback && password.length < 12) {
    throw new Error(`${liveNames.password} must contain at least 12 characters`)
  }
  return Object.freeze({ email: email.toLowerCase(), password })
}

const resolveLiveEnvironment = (environment = process.env) => {
  const target = parseBaseUrl(
    valueFrom(environment, "STUDYNOTION_LIVE_BASE_URL") ||
      "http://localhost:3000"
  )
  const credentials = Object.fromEntries(
    Object.keys(liveCredentialVariables).map((role) => [
      role,
      readCredentials(environment, role, target.loopback),
    ])
  )
  if (
    new Set(Object.values(credentials).map(({ email }) => email)).size !== 3
  ) {
    throw new Error("Live E2E account email addresses must be distinct")
  }

  return Object.freeze({
    baseURL: target.baseURL,
    credentials: Object.freeze(credentials),
    loopback: target.loopback,
  })
}

module.exports = { resolveLiveEnvironment }
