class LearningApiError extends Error {
  constructor(code, message, statusCode = 500, details) {
    super(message)
    this.name = "LearningApiError"
    this.code = code
    this.statusCode = statusCode
    this.details = details
  }
}

const { sendV2Error } = require("../../shared/http/v2ErrorEnvelope")

module.exports = { LearningApiError, sendV2Error }
