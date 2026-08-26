export const DEFAULT_AUTHENTICATED_PATH = "/dashboard/my-profile"

const MAX_REDIRECT_LENGTH = 2048
const INTERNAL_REDIRECT_BASE = "https://studynotion.invalid"
const INVALID_PERCENT_ENCODING = /%(?![0-9a-f]{2})/i
const DOT_PATH_SEGMENT = /(^|\/)\.{1,2}(?:\/|$)/

const hasUnsafeCharacters = (value, { allowSpace = false } = {}) =>
  Array.from(value).some((character) => {
    const codePoint = character.codePointAt(0)
    return (
      character === "\\" ||
      codePoint === 0x7f ||
      codePoint < 0x20 ||
      (!allowSpace && codePoint === 0x20)
    )
  })

const toRedirectCandidate = (value) => {
  if (typeof value === "string") return value
  if (!value || typeof value !== "object" || Array.isArray(value)) return null

  try {
    if (
      "protocol" in value ||
      "host" in value ||
      "hostname" in value ||
      "origin" in value
    ) {
      return null
    }

    const pathname = value.pathname
    const search = value.search ?? ""
    const hash = value.hash ?? ""

    if (
      typeof pathname !== "string" ||
      typeof search !== "string" ||
      typeof hash !== "string" ||
      (search && !search.startsWith("?")) ||
      (hash && !hash.startsWith("#"))
    ) {
      return null
    }

    return `${pathname}${search}${hash}`
  } catch {
    return null
  }
}

const decodeForValidation = (candidate) => {
  let decoded = candidate

  try {
    for (let pass = 0; pass < 3; pass += 1) {
      const nextValue = decodeURIComponent(decoded)
      if (nextValue === decoded) break
      decoded = nextValue
    }
    return decoded
  } catch {
    return null
  }
}

const normalizeInternalRedirect = (value) => {
  const candidate = toRedirectCandidate(value)
  if (
    !candidate ||
    candidate.length > MAX_REDIRECT_LENGTH ||
    !candidate.startsWith("/") ||
    candidate.startsWith("//") ||
    hasUnsafeCharacters(candidate) ||
    INVALID_PERCENT_ENCODING.test(candidate)
  ) {
    return null
  }

  const decoded = decodeForValidation(candidate)
  if (!decoded || hasUnsafeCharacters(decoded, { allowSpace: true }))
    return null

  const decodedPathname = decoded.split(/[?#]/, 1)[0]
  if (
    decodedPathname.startsWith("//") ||
    DOT_PATH_SEGMENT.test(decodedPathname)
  ) {
    return null
  }

  try {
    const parsed = new URL(candidate, INTERNAL_REDIRECT_BASE)
    if (parsed.origin !== INTERNAL_REDIRECT_BASE) return null
    return `${parsed.pathname}${parsed.search}${parsed.hash}`
  } catch {
    return null
  }
}

export const sanitizeInternalRedirect = (
  value,
  fallback = DEFAULT_AUTHENTICATED_PATH
) =>
  normalizeInternalRedirect(value) ||
  normalizeInternalRedirect(fallback) ||
  DEFAULT_AUTHENTICATED_PATH
