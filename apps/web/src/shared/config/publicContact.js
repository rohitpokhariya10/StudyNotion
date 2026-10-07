const email = import.meta.env.VITE_SUPPORT_EMAIL?.trim()
const address = import.meta.env.VITE_LEGAL_ADDRESS?.trim()
const entity = import.meta.env.VITE_LEGAL_ENTITY_NAME?.trim()

// Local environment labels are not a public identity. Real deployment values
// are retained verbatim; a rebrand must not invent an operator or email address.
export const supportEmail =
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email || "") &&
  !email.toLowerCase().endsWith(".local")
    ? email
    : null
export const legalAddress =
  address && !/^(Local container environment|Not configured.*)$/i.test(address)
    ? address
    : null
export const legalEntity =
  entity && !/local (?:development|container evaluation)/i.test(entity)
    ? entity
    : null
