import { getDomain } from "tldts"

const environment = process.env

const required = [
  "APP_URL",
  "COOKIE_SAME_SITE",
  "DEPLOYMENT_TIER",
  "FRONTEND_ORIGINS",
  "PUBLIC_API_URL",
  "RAZORPAY_KEY_ID",
  "SUPPORT_EMAIL",
  "VITE_API_BASE_URL",
  "VITE_DEPLOYMENT_TIER",
  "VITE_RAZORPAY_KEY_ID",
  "VITE_SUPPORT_EMAIL",
]
const missing = required.filter((name) => !environment[name]?.trim())
if (missing.length) {
  throw new Error(`Missing release-pair variables: ${missing.join(", ")}`)
}

const deploymentTier = environment.DEPLOYMENT_TIER.trim()
if (!new Set(["staging", "production"]).has(deploymentTier)) {
  throw new Error("DEPLOYMENT_TIER must be staging or production")
}

const exactPairs = [
  ["DEPLOYMENT_TIER", "VITE_DEPLOYMENT_TIER"],
  ["RAZORPAY_KEY_ID", "VITE_RAZORPAY_KEY_ID"],
  ["SUPPORT_EMAIL", "VITE_SUPPORT_EMAIL"],
]
for (const [privateName, publicName] of exactPairs) {
  if (environment[privateName].trim() !== environment[publicName].trim()) {
    throw new Error(`${privateName} must exactly match ${publicName}`)
  }
}

const serverGoogleClientId = environment.GOOGLE_CLIENT_ID?.trim() || ""
const browserGoogleClientId = environment.VITE_GOOGLE_CLIENT_ID?.trim() || ""
if (serverGoogleClientId !== browserGoogleClientId) {
  throw new Error(
    "GOOGLE_CLIENT_ID and VITE_GOOGLE_CLIENT_ID must both be omitted or exactly match"
  )
}
if (deploymentTier === "production" && !serverGoogleClientId) {
  throw new Error("Production release pairs require Google Web Client IDs")
}
if (
  serverGoogleClientId &&
  !/^[A-Za-z0-9-]+\.apps\.googleusercontent\.com$/.test(serverGoogleClientId)
) {
  throw new Error(
    "Release-pair Google client IDs must be Google Web Client IDs"
  )
}

const razorpayKeyPrefix =
  deploymentTier === "staging" ? "rzp_test_" : "rzp_live_"
if (
  !new RegExp(`^${razorpayKeyPrefix}[A-Za-z0-9]{6,}$`).test(
    environment.RAZORPAY_KEY_ID.trim()
  )
) {
  throw new Error(
    `Release-pair Razorpay key IDs must use the ${razorpayKeyPrefix} prefix for ${deploymentTier}`
  )
}

let appUrl
let publicApiUrl
let browserApiUrl
try {
  appUrl = new URL(environment.APP_URL)
  publicApiUrl = new URL(environment.PUBLIC_API_URL)
} catch {
  throw new Error("Release-pair application and API URLs must be valid URLs")
}

const browserApiBaseUrl = environment.VITE_API_BASE_URL.trim()
const isSameOriginApi = browserApiBaseUrl.replace(/\/$/, "") === "/api/v1"

try {
  browserApiUrl = isSameOriginApi
    ? new URL(browserApiBaseUrl, appUrl)
    : new URL(browserApiBaseUrl)
} catch {
  throw new Error(
    "VITE_API_BASE_URL must be /api/v1 or a canonical HTTPS /api/v1 endpoint"
  )
}

if (publicApiUrl.origin !== browserApiUrl.origin) {
  throw new Error("PUBLIC_API_URL must equal the origin of VITE_API_BASE_URL")
}
if (
  browserApiUrl.protocol !== "https:" ||
  browserApiUrl.pathname.replace(/\/$/, "") !== "/api/v1" ||
  browserApiUrl.username ||
  browserApiUrl.password ||
  browserApiUrl.search ||
  browserApiUrl.hash
) {
  throw new Error(
    "VITE_API_BASE_URL must be /api/v1 or a canonical HTTPS /api/v1 endpoint"
  )
}

const sameSite = environment.COOKIE_SAME_SITE.trim().toLowerCase()
if (!["lax", "strict", "none"].includes(sameSite)) {
  throw new Error("COOKIE_SAME_SITE must be lax, strict, or none")
}
const appSite = getDomain(appUrl.hostname, { allowPrivateDomains: true })
const apiSite = getDomain(publicApiUrl.hostname, { allowPrivateDomains: true })
if (!appSite || !apiSite || appSite !== apiSite) {
  throw new Error(
    "APP_URL, every frontend origin, and PUBLIC_API_URL must share one registrable site for reliable cookie authentication"
  )
}

const frontendOriginValues = environment.FRONTEND_ORIGINS.split(",")
  .map((value) => value.trim())
  .filter(Boolean)
const frontendOrigins = frontendOriginValues.map((value) => {
  let url
  try {
    url = new URL(value)
  } catch {
    throw new Error("FRONTEND_ORIGINS must contain valid HTTPS origins")
  }
  if (
    url.protocol !== "https:" ||
    url.pathname !== "/" ||
    url.username ||
    url.password ||
    url.search ||
    url.hash
  ) {
    throw new Error("FRONTEND_ORIGINS must contain valid HTTPS origins")
  }
  const originSite = getDomain(url.hostname, { allowPrivateDomains: true })
  if (!originSite || originSite !== apiSite) {
    throw new Error(
      "APP_URL, every frontend origin, and PUBLIC_API_URL must share one registrable site for reliable cookie authentication"
    )
  }
  return url.origin
})
if (!frontendOrigins.includes(appUrl.origin)) {
  throw new Error("APP_URL must be present in FRONTEND_ORIGINS")
}

console.log(`Release pair validated for ${deploymentTier}`)
