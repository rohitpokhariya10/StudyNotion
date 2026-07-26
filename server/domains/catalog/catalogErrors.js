class CatalogApiError extends Error {
  constructor(code, message, statusCode = 500, details) {
    super(message)
    this.name = "CatalogApiError"
    this.code = code
    this.statusCode = statusCode
    this.details = details
  }
}

// Compatibility adapter: catalog callers keep their historical import path
// while the cross-domain HTTP envelope now lives under shared/http.
const {
  createV2ErrorEnvelope,
  isV2Request,
  normalizeV2ErrorEnvelope,
  sendV2Error,
} = require("../../shared/http/v2ErrorEnvelope")

module.exports = {
  CatalogApiError,
  createV2ErrorEnvelope,
  isV2Request,
  normalizeV2ErrorEnvelope,
  sendV2Error,
}
