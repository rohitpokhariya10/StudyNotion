export const emptyPolicyAcknowledgement = {
  acceptTerms: false,
  acknowledgePrivacy: false,
  confirmEligibility: false,
}

export const hasCompletePolicyAcknowledgement = (value) =>
  value?.acceptTerms === true &&
  value?.acknowledgePrivacy === true &&
  value?.confirmEligibility === true
