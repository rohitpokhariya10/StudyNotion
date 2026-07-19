import { loadEnv } from "vite"

const env = { ...loadEnv("production", process.cwd(), ""), ...process.env }
const required = [
  "VITE_API_BASE_URL",
  "VITE_GOOGLE_CLIENT_ID",
  "VITE_RAZORPAY_KEY_ID",
  "VITE_SUPPORT_EMAIL",
  "VITE_LEGAL_ENTITY_NAME",
  "VITE_LEGAL_ADDRESS",
  "VITE_LEGAL_JURISDICTION",
]

const missing = required.filter((name) => !env[name]?.trim())
if (missing.length) {
  throw new Error(`Missing production public variables: ${missing.join(", ")}`)
}

const placeholderPattern =
  /(?:replace|change[-_ ]?me|example\.com|your-domain|studynotion\.local|not configured)/i
const placeholders = required.filter((name) => placeholderPattern.test(env[name]))
if (placeholders.length) {
  throw new Error(
    `Production public variables still contain placeholders: ${placeholders.join(
      ", "
    )}`
  )
}

let apiUrl
try {
  apiUrl = new URL(env.VITE_API_BASE_URL)
} catch {
  throw new Error("VITE_API_BASE_URL must be a valid HTTPS API URL")
}
if (
  apiUrl.protocol !== "https:" ||
  apiUrl.username ||
  apiUrl.password ||
  apiUrl.search ||
  apiUrl.hash ||
  !apiUrl.pathname.replace(/\/$/, "").endsWith("/api/v1")
) {
  throw new Error(
    "VITE_API_BASE_URL must be an HTTPS URL ending in /api/v1 without credentials, query, or fragment"
  )
}

if (
  !/^[A-Za-z0-9-]+\.apps\.googleusercontent\.com$/.test(
    env.VITE_GOOGLE_CLIENT_ID
  )
) {
  throw new Error("VITE_GOOGLE_CLIENT_ID must be a Google Web Client ID")
}
if (!/^rzp_live_[A-Za-z0-9]{6,}$/.test(env.VITE_RAZORPAY_KEY_ID)) {
  throw new Error("VITE_RAZORPAY_KEY_ID must be a live Razorpay key")
}
if (!/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(env.VITE_SUPPORT_EMAIL)) {
  throw new Error("VITE_SUPPORT_EMAIL must be a valid email address")
}

for (const name of [
  "VITE_LEGAL_ENTITY_NAME",
  "VITE_LEGAL_ADDRESS",
  "VITE_LEGAL_JURISDICTION",
]) {
  const value = env[name].trim()
  if (value.length < 2 || value.length > 300 || /[\u0000-\u001F\u007F]/.test(value)) {
    throw new Error(`${name} is invalid`)
  }
}

console.log("Production public environment validated")
