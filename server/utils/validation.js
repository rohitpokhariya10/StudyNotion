const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const CONTROL_CHARACTERS = /[\u0000-\u001F\u007F]/
const BCRYPT_MAX_BYTES = 72

const normalizeEmail = (value) =>
  typeof value === "string" ? value.trim().toLowerCase() : ""

const isValidEmail = (value) => {
  const email = normalizeEmail(value)
  return email.length <= 254 && EMAIL_PATTERN.test(email)
}

const normalizePersonName = (value, { allowEmpty = false } = {}) => {
  if (typeof value !== "string") return null
  const name = value.trim()
  if ((!allowEmpty && !name) || name.length > 80 || CONTROL_CHARACTERS.test(name)) {
    return null
  }
  return name
}

const isPasswordWithinBcryptLimit = (password) =>
  typeof password === "string" &&
  password.length <= 128 &&
  Buffer.byteLength(password, "utf8") <= BCRYPT_MAX_BYTES

const isStrongPassword = (password) =>
  isPasswordWithinBcryptLimit(password) &&
  password.length >= 8 &&
  /[a-z]/.test(password) &&
  /[A-Z]/.test(password) &&
  /\d/.test(password)

module.exports = {
  isPasswordWithinBcryptLimit,
  isStrongPassword,
  isValidEmail,
  normalizeEmail,
  normalizePersonName,
}
