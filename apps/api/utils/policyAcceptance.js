const CURRENT_TERMS_VERSION = "2026-07-18"
const CURRENT_PRIVACY_NOTICE_VERSION = "2026-07-18"
const CURRENT_REFUND_POLICY_VERSION = "2026-07-18"

const hasAffirmativePolicyAcceptance = (body) =>
  body?.acceptTerms === true &&
  body?.acknowledgePrivacy === true &&
  body?.confirmEligibility === true

const hasCurrentPolicyAcceptance = (user) =>
  Array.isArray(user?.policyAcceptances) &&
  user.policyAcceptances.some(
    (acceptance) =>
      acceptance?.termsVersion === CURRENT_TERMS_VERSION &&
      acceptance?.privacyNoticeVersion === CURRENT_PRIVACY_NOTICE_VERSION &&
      acceptance?.acceptedAt &&
      acceptance?.eligibilityConfirmedAt
  )

const createPolicyAcceptance = (source, acceptedAt = new Date()) => ({
  acceptedAt,
  eligibilityConfirmedAt: acceptedAt,
  privacyNoticeVersion: CURRENT_PRIVACY_NOTICE_VERSION,
  source,
  termsVersion: CURRENT_TERMS_VERSION,
})

module.exports = {
  CURRENT_PRIVACY_NOTICE_VERSION,
  CURRENT_REFUND_POLICY_VERSION,
  CURRENT_TERMS_VERSION,
  createPolicyAcceptance,
  hasAffirmativePolicyAcceptance,
  hasCurrentPolicyAcceptance,
}
