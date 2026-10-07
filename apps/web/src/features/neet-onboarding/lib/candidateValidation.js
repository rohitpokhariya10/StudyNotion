import {
  isValidNeetCandidateName,
  NEET_CANDIDATE_LIMITS,
  normalizeNeetPhone,
} from "@studynotion/contracts/neet"

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

// Mirrors the server contract for immediate feedback. The server validates
// again and remains authoritative.
export const validateCandidate = ({
  email = "",
  fullName = "",
  phone = "",
}) => {
  const errors = {}
  if (!fullName.trim()) errors.fullName = "Enter your full name."
  else if (!isValidNeetCandidateName(fullName)) {
    errors.fullName = `Use ${NEET_CANDIDATE_LIMITS.fullNameMin}–${NEET_CANDIDATE_LIMITS.fullNameMax} letters; spaces, dots, apostrophes and hyphens are fine.`
  }
  const trimmedEmail = email.trim()
  if (!trimmedEmail) errors.email = "Enter your email address."
  else if (
    trimmedEmail.length > NEET_CANDIDATE_LIMITS.emailMax ||
    !EMAIL_PATTERN.test(trimmedEmail)
  ) {
    errors.email = "Enter a valid email address, like name@example.com."
  }
  if (!phone.trim()) errors.phone = "Enter your mobile number."
  else if (!normalizeNeetPhone(phone)) {
    errors.phone =
      "Enter a 10-digit Indian mobile number, or include your country code (e.g. +971…)."
  }
  return errors
}

export const candidateFromProfile = (user) => ({
  fullName: [user?.firstName, user?.lastName].filter(Boolean).join(" "),
  email: user?.email || "",
  phone: user?.additionalDetails?.contactNumber
    ? String(user.additionalDetails.contactNumber)
    : "",
})
