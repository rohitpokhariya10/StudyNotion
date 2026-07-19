const { OAuth2Client } = require("google-auth-library")

const env = require("../config/env")

const googleClient = new OAuth2Client()
const timeoutMs = env.googleTimeoutMs || 10_000

if (googleClient.transporter?.defaults) {
  googleClient.transporter.defaults.timeout = timeoutMs
}

const verifyGoogleIdToken = async (options) => {
  let timeout
  const deadline = new Promise((_, reject) => {
    timeout = setTimeout(() => {
      const error = new Error("Google identity verification timed out")
      error.code = "GOOGLE_IDENTITY_TIMEOUT"
      reject(error)
    }, timeoutMs)
  })

  try {
    return await Promise.race([googleClient.verifyIdToken(options), deadline])
  } finally {
    clearTimeout(timeout)
  }
}

module.exports = { verifyGoogleIdToken }
