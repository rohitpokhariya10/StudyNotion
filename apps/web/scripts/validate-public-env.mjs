import { fileURLToPath } from "node:url"
import { loadEnv } from "vite"

import { isLoopbackHostname } from "./deployment-network.mjs"

const webRoot = fileURLToPath(new URL("../", import.meta.url))
const repositoryRoot = fileURLToPath(new URL("../../../", import.meta.url))
const env = {
  ...loadEnv("production", repositoryRoot, ""),
  ...loadEnv("production", webRoot, ""),
  ...process.env,
}
const deploymentTier = env.VITE_DEPLOYMENT_TIER?.trim()
if (!deploymentTier) {
  throw new Error("VITE_DEPLOYMENT_TIER is required for production builds")
}
if (!new Set(["staging", "production"]).has(deploymentTier)) {
  throw new Error("VITE_DEPLOYMENT_TIER must be staging or production")
}

const required = [
  "VITE_DEPLOYMENT_TIER",
  "VITE_API_BASE_URL",
  "VITE_RAZORPAY_KEY_ID",
  "VITE_SUPPORT_EMAIL",
  "VITE_LEGAL_ENTITY_NAME",
  "VITE_LEGAL_ADDRESS",
  "VITE_LEGAL_JURISDICTION",
  ...(deploymentTier === "production" ? ["VITE_GOOGLE_CLIENT_ID"] : []),
]

const missing = required.filter((name) => !env[name]?.trim())
if (missing.length) {
  throw new Error(`Missing production public variables: ${missing.join(", ")}`)
}

const placeholderPattern =
  /(?:replace|change[-_ ]?me|example\.com|your-domain|studynotion\.local|not configured)/i
const placeholders = [
  ...required,
  ...(env.VITE_GOOGLE_CLIENT_ID ? ["VITE_GOOGLE_CLIENT_ID"] : []),
].filter((name, index, names) => {
  return names.indexOf(name) === index && placeholderPattern.test(env[name])
})
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
  apiUrl.pathname.replace(/\/$/, "") !== "/api/v1"
) {
  throw new Error(
    "VITE_API_BASE_URL must be an HTTPS URL ending in /api/v1 without credentials, query, or fragment"
  )
}
if (isLoopbackHostname(apiUrl.hostname)) {
  throw new Error(
    "VITE_API_BASE_URL must not use a loopback or development host"
  )
}

if (
  env.VITE_GOOGLE_CLIENT_ID &&
  !/^[A-Za-z0-9-]+\.apps\.googleusercontent\.com$/.test(
    env.VITE_GOOGLE_CLIENT_ID
  )
) {
  throw new Error("VITE_GOOGLE_CLIENT_ID must be a Google Web Client ID")
}
const razorpayKeyPrefix =
  deploymentTier === "staging" ? "rzp_test_" : "rzp_live_"
if (
  !new RegExp(`^${razorpayKeyPrefix}[A-Za-z0-9]{6,}$`).test(
    env.VITE_RAZORPAY_KEY_ID
  )
) {
  throw new Error(
    `VITE_RAZORPAY_KEY_ID must use the ${razorpayKeyPrefix} prefix for ${deploymentTier}`
  )
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
  if (value.length < 2 || value.length > 300 || /\p{Cc}/u.test(value)) {
    throw new Error(`${name} is invalid`)
  }
}

console.log(`Public ${deploymentTier} environment validated`)
