const isProduction = process.env.NODE_ENV === "production"

const frontendOriginsValue =
  process.env.FRONTEND_ORIGINS || process.env.FRONTEND_URL
const mongoUrl = process.env.MONGODB_URI || process.env.MONGODB_URL

const requiredCore = {
  FRONTEND_ORIGINS: frontendOriginsValue,
  MONGODB_URI: mongoUrl,
  JWT_SECRET: process.env.JWT_SECRET,
  OTP_SECRET: process.env.OTP_SECRET,
}

const requiredProductionProviders = {
  REDIS_URL: process.env.REDIS_URL,
  APP_URL: process.env.APP_URL,
  BRAND_NAME: process.env.BRAND_NAME,
  BRAND_LOGO_URL: process.env.BRAND_LOGO_URL,
  SUPPORT_EMAIL: process.env.SUPPORT_EMAIL,
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
  RESEND_API_KEY: process.env.RESEND_API_KEY,
  EMAIL_FROM: process.env.EMAIL_FROM,
  CONTACT_RECIPIENT: process.env.CONTACT_RECIPIENT,
  RAZORPAY_KEY_ID: process.env.RAZORPAY_KEY_ID,
  RAZORPAY_SECRET: process.env.RAZORPAY_SECRET,
  RAZORPAY_WEBHOOK_SECRET: process.env.RAZORPAY_WEBHOOK_SECRET,
  REFUND_WINDOW_DAYS: process.env.REFUND_WINDOW_DAYS,
  CLOUD_NAME: process.env.CLOUD_NAME,
  CLOUD_API_KEY: process.env.CLOUD_API_KEY,
  CLOUD_API_SECRET: process.env.CLOUD_API_SECRET,
}

const required = isProduction
  ? { ...requiredCore, ...requiredProductionProviders }
  : requiredCore
const missing = Object.entries(required)
  .filter(([, value]) => !value?.trim())
  .map(([key]) => key)

if (missing.length) {
  throw new Error(`Missing required environment variables: ${missing.join(", ")}`)
}

if (process.env.JWT_SECRET.length < 32 || process.env.OTP_SECRET.length < 32) {
  throw new Error("JWT_SECRET and OTP_SECRET must each contain at least 32 characters")
}

if (process.env.JWT_SECRET === process.env.OTP_SECRET) {
  throw new Error("JWT_SECRET and OTP_SECRET must be independently generated")
}

if (isProduction && process.env.ALLOW_DEV_OTP === "true") {
  throw new Error("ALLOW_DEV_OTP cannot be enabled in production")
}

const isEmail = (value) =>
  typeof value === "string" &&
  value.length <= 254 &&
  /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(value)

const emailAddressFrom = (value) => {
  const normalized = value?.trim() || ""
  const bracketed = normalized.match(/<([^<>]+)>$/)
  return (bracketed?.[1] || normalized).trim()
}

if (isProduction) {
  const placeholderValues = {
    ...required,
    BRAND_LOGO_URL: process.env.BRAND_LOGO_URL,
    BRAND_NAME: process.env.BRAND_NAME,
    COOKIE_DOMAIN: process.env.COOKIE_DOMAIN,
    EMAIL_REPLY_TO: process.env.EMAIL_REPLY_TO,
  }
  const placeholderPattern =
    /(?:replace|change[-_ ]?me|example\.com|your[-_ ]?(?:key|secret|domain))/i
  const placeholders = Object.entries(placeholderValues)
    .filter(([, value]) => value && placeholderPattern.test(value))
    .map(([name]) => name)
  if (placeholders.length) {
    throw new Error(
      `Production environment still contains placeholder values: ${placeholders.join(
        ", "
      )}`
    )
  }

  let appUrl
  try {
    appUrl = new URL(process.env.APP_URL)
  } catch {
    throw new Error("APP_URL must be a valid HTTPS origin")
  }
  if (
    appUrl.protocol !== "https:" ||
    appUrl.pathname !== "/" ||
    appUrl.search ||
    appUrl.hash ||
    appUrl.username ||
    appUrl.password
  ) {
    throw new Error("APP_URL must be a valid HTTPS origin without a path")
  }

  if (process.env.BRAND_LOGO_URL) {
    let brandLogoUrl
    try {
      brandLogoUrl = new URL(process.env.BRAND_LOGO_URL)
    } catch {
      throw new Error("BRAND_LOGO_URL must be a valid HTTPS URL")
    }
    if (brandLogoUrl.protocol !== "https:") {
      throw new Error("BRAND_LOGO_URL must use HTTPS in production")
    }
  }
  if (
    process.env.BRAND_NAME &&
    (process.env.BRAND_NAME.trim().length > 80 ||
      /[\u0000-\u001F\u007F]/.test(process.env.BRAND_NAME))
  ) {
    throw new Error("BRAND_NAME is invalid")
  }

  if (!/^mongodb(?:\+srv)?:\/\//.test(mongoUrl)) {
    throw new Error("MONGODB_URI must be a MongoDB connection URI")
  }
  let redisUrl
  try {
    redisUrl = new URL(process.env.REDIS_URL)
  } catch {
    throw new Error("REDIS_URL must be a valid Redis connection URL")
  }
  if (redisUrl.protocol !== "rediss:") {
    throw new Error("Production REDIS_URL must use rediss:// TLS")
  }
  if (!isEmail(process.env.SUPPORT_EMAIL)) {
    throw new Error("SUPPORT_EMAIL must be a valid email address")
  }
  if (!isEmail(process.env.CONTACT_RECIPIENT)) {
    throw new Error("CONTACT_RECIPIENT must be a valid email address")
  }
  if (
    process.env.EMAIL_REPLY_TO &&
    !isEmail(process.env.EMAIL_REPLY_TO.trim())
  ) {
    throw new Error("EMAIL_REPLY_TO must be a valid email address")
  }
  if (!isEmail(emailAddressFrom(process.env.EMAIL_FROM))) {
    throw new Error("EMAIL_FROM must contain a valid sender email address")
  }
  if (
    !/^[A-Za-z0-9-]+\.apps\.googleusercontent\.com$/.test(
      process.env.GOOGLE_CLIENT_ID
    )
  ) {
    throw new Error("GOOGLE_CLIENT_ID must be a Google Web Client ID")
  }
  if (!/^re_[A-Za-z0-9_]{8,}$/.test(process.env.RESEND_API_KEY)) {
    throw new Error("RESEND_API_KEY must be a Resend API key")
  }
  if (!/^rzp_live_[A-Za-z0-9]{6,}$/.test(process.env.RAZORPAY_KEY_ID)) {
    throw new Error("RAZORPAY_KEY_ID must be a live Razorpay key in production")
  }
  if (process.env.RAZORPAY_SECRET.length < 16) {
    throw new Error("RAZORPAY_SECRET is too short")
  }
  if (process.env.RAZORPAY_WEBHOOK_SECRET.length < 16) {
    throw new Error("RAZORPAY_WEBHOOK_SECRET is too short")
  }
  if (!/^[A-Za-z0-9_-]{2,}$/.test(process.env.CLOUD_NAME)) {
    throw new Error("CLOUD_NAME is invalid")
  }
  if (!/^\d{8,30}$/.test(process.env.CLOUD_API_KEY)) {
    throw new Error("CLOUD_API_KEY must be a Cloudinary API key")
  }
  if (process.env.CLOUD_API_SECRET.length < 16) {
    throw new Error("CLOUD_API_SECRET is too short")
  }
}

const readInteger = (name, fallback, { min = 0, max = Infinity } = {}) => {
  const rawValue = process.env[name]
  const value = rawValue === undefined || rawValue === "" ? fallback : Number(rawValue)
  if (!Number.isInteger(value) || value < min || value > max) {
    throw new Error(`${name} must be an integer between ${min} and ${max}`)
  }
  return value
}

const readBoolean = (name, fallback) => {
  const value = process.env[name]
  if (value === undefined || value === "") return fallback
  if (value === "true") return true
  if (value === "false") return false
  throw new Error(`${name} must be true or false`)
}

const readSize = (name, fallback) => {
  const value = (process.env[name] || fallback).trim().toLowerCase()
  if (!/^\d+(?:kb|mb)$/.test(value)) {
    throw new Error(`${name} must use a value such as 100kb or 2mb`)
  }
  return value
}

const parseOrigins = (value) =>
  [...new Set(value.split(",").map((origin) => origin.trim()).filter(Boolean))].map(
    (origin) => {
      let url
      try {
        url = new URL(origin)
      } catch {
        throw new Error(`Invalid frontend origin: ${origin}`)
      }

      if (url.pathname !== "/" || url.search || url.hash || url.username || url.password) {
        throw new Error(`Frontend origins must not contain paths or credentials: ${origin}`)
      }
      if (isProduction && url.protocol !== "https:") {
        throw new Error(`Production frontend origins must use HTTPS: ${origin}`)
      }
      if (!isProduction && !["http:", "https:"].includes(url.protocol)) {
        throw new Error(`Frontend origins must use HTTP or HTTPS: ${origin}`)
      }
      return url.origin
    }
  )

const frontendOrigins = parseOrigins(frontendOriginsValue)
if (!frontendOrigins.length) {
  throw new Error("At least one frontend origin is required")
}

if (isProduction && !frontendOrigins.includes(new URL(process.env.APP_URL).origin)) {
  throw new Error("APP_URL must match one of FRONTEND_ORIGINS")
}

let appUrl = frontendOrigins[0]
if (process.env.APP_URL) {
  try {
    const configuredAppUrl = new URL(process.env.APP_URL)
    if (!["http:", "https:"].includes(configuredAppUrl.protocol)) {
      throw new Error("unsupported protocol")
    }
    appUrl = configuredAppUrl.origin
  } catch {
    throw new Error("APP_URL must be a valid HTTP or HTTPS origin")
  }
}

const cookieSameSite = (process.env.COOKIE_SAME_SITE || "lax").toLowerCase()
if (!["lax", "strict", "none"].includes(cookieSameSite)) {
  throw new Error("COOKIE_SAME_SITE must be lax, strict, or none")
}

const cookieSecure = isProduction || process.env.COOKIE_SECURE === "true"
if (cookieSameSite === "none" && !cookieSecure) {
  throw new Error("COOKIE_SECURE must be true when COOKIE_SAME_SITE is none")
}

const parseTrustProxy = () => {
  const value = process.env.TRUST_PROXY
  if (!value) return isProduction ? 1 : false
  if (value === "false" || value === "0") return false
  if (value === "true") {
    throw new Error("TRUST_PROXY=true is unsafe; configure a proxy hop count or subnet")
  }
  if (/^\d+$/.test(value)) return readInteger("TRUST_PROXY", 1, { min: 1, max: 10 })
  return value
}

const mongoMaxPoolSize = readInteger("MONGODB_MAX_POOL_SIZE", 20, {
  min: 1,
  max: 200,
})
const mongoMinPoolSize = readInteger("MONGODB_MIN_POOL_SIZE", 1, {
  min: 0,
  max: 50,
})
if (mongoMinPoolSize > mongoMaxPoolSize) {
  throw new Error("MONGODB_MIN_POOL_SIZE cannot exceed MONGODB_MAX_POOL_SIZE")
}

module.exports = Object.freeze({
  isProduction,
  port: readInteger("PORT", 4000, { min: 1, max: 65535 }),
  frontendOrigins,
  frontendOrigin: frontendOrigins[0],
  appUrl,
  mongoUrl,
  redisUrl: process.env.REDIS_URL || "",
  trustProxy: parseTrustProxy(),
  jsonBodyLimit: readSize("JSON_BODY_LIMIT", "100kb"),
  formBodyLimit: readSize("FORM_BODY_LIMIT", "100kb"),
  uploadMaxBytes: readInteger("UPLOAD_MAX_BYTES", 25 * 1024 * 1024, {
    min: 1024,
    max: 250 * 1024 * 1024,
  }),
  mediaUrlTtlSeconds: readInteger("MEDIA_URL_TTL_SECONDS", 3600, {
    min: 300,
    max: 86400,
  }),
  checkoutTtlSeconds: readInteger("CHECKOUT_TTL_SECONDS", 1800, {
    min: 300,
    max: 86400,
  }),
  razorpayTimeoutMs: readInteger("RAZORPAY_TIMEOUT_MS", 10000, {
    min: 1000,
    max: 60000,
  }),
  googleTimeoutMs: readInteger("GOOGLE_TIMEOUT_MS", 10000, {
    min: 1000,
    max: 60000,
  }),
  refundWindowDays: readInteger("REFUND_WINDOW_DAYS", 7, {
    min: 0,
    max: 30,
  }),
  requestTimeoutMs: readInteger("REQUEST_TIMEOUT_MS", 120000, {
    min: 5000,
    max: 10 * 60 * 1000,
  }),
  shutdownTimeoutMs: readInteger("SHUTDOWN_TIMEOUT_MS", 10000, {
    min: 1000,
    max: 60000,
  }),
  mongo: {
    autoIndex: readBoolean("MONGODB_AUTO_INDEX", !isProduction),
    maxPoolSize: mongoMaxPoolSize,
    minPoolSize: mongoMinPoolSize,
    serverSelectionTimeoutMs: readInteger(
      "MONGODB_SERVER_SELECTION_TIMEOUT_MS",
      10000,
      { min: 1000, max: 60000 }
    ),
    connectTimeoutMs: readInteger("MONGODB_CONNECT_TIMEOUT_MS", 10000, {
      min: 1000,
      max: 60000,
    }),
    operationTimeoutMs: readInteger("MONGODB_OPERATION_TIMEOUT_MS", 15000, {
      min: 1000,
      max: 120000,
    }),
    socketTimeoutMs: readInteger("MONGODB_SOCKET_TIMEOUT_MS", 30000, {
      min: 1000,
      max: 120000,
    }),
    waitQueueTimeoutMs: readInteger("MONGODB_WAIT_QUEUE_TIMEOUT_MS", 10000, {
      min: 1000,
      max: 60000,
    }),
  },
  cookie: {
    name: process.env.COOKIE_NAME || "studynotion_session",
    domain: process.env.COOKIE_DOMAIN || undefined,
    sameSite: cookieSameSite,
    secure: cookieSecure,
  },
  allowDevOtp: !isProduction && process.env.ALLOW_DEV_OTP === "true",
})
