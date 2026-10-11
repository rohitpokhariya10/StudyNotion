import {
  isValidNeetCandidateName,
  NEET_CANDIDATE_LIMITS,
} from "@studynotion/contracts/neet"

// Mirrors the server contract for immediate feedback. The server validates
// again and remains authoritative. Only a display name is collected: the
// attempt belongs to the signed-in account, and contact details are never
// copied onto it.
export const validateCandidate = ({ fullName = "" }) => {
  const errors = {}
  if (!fullName.trim()) errors.fullName = "Enter your full name."
  else if (!isValidNeetCandidateName(fullName)) {
    errors.fullName = `Use ${NEET_CANDIDATE_LIMITS.fullNameMin}–${NEET_CANDIDATE_LIMITS.fullNameMax} letters; spaces, dots, apostrophes and hyphens are fine.`
  }
  return errors
}

export const candidateFromProfile = (user) => ({
  fullName: [user?.firstName, user?.lastName].filter(Boolean).join(" "),
})
