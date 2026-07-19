const AVATAR_COLORS = [
  "#2C333F",
  "#585D69",
  "#6E727F",
  "#164E63",
  "#365314",
  "#713F12",
  "#7F1D1D",
  "#581C87",
]

const avatarSeed = (personOrName) => {
  if (typeof personOrName === "string") {
    return personOrName.trim() || "Learner"
  }

  if (personOrName && typeof personOrName === "object") {
    const name = [personOrName.firstName, personOrName.lastName]
      .filter(Boolean)
      .join(" ")
      .trim()

    return name || String(personOrName.email || "Learner").trim() || "Learner"
  }

  return "Learner"
}

const initialsFromSeed = (seed) => {
  const words = seed.match(/[\p{L}\p{N}]+/gu) || []

  if (words.length > 1) {
    return `${Array.from(words[0])[0]}${Array.from(words.at(-1))[0]}`.toUpperCase()
  }

  const characters = Array.from(words[0] || "L")
  return characters.slice(0, 2).join("").toUpperCase()
}

const hashSeed = (seed) => {
  let hash = 0
  for (const character of seed) {
    hash = (hash * 31 + character.codePointAt(0)) >>> 0
  }
  return hash
}

/**
 * Builds an inline avatar without sending a learner's identity to an external
 * avatar service. Only the generated initials and a local palette color are
 * embedded in the SVG.
 */
export const getInitialsAvatar = (personOrName) => {
  const seed = avatarSeed(personOrName)
  const initials = initialsFromSeed(seed)
  const background = AVATAR_COLORS[hashSeed(seed) % AVATAR_COLORS.length]
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96" role="img" aria-label="${initials} avatar"><rect width="96" height="96" rx="48" fill="${background}"/><text x="48" y="51" fill="#F1F2FF" font-family="Arial, sans-serif" font-size="34" font-weight="700" text-anchor="middle" dominant-baseline="middle">${initials}</text></svg>`

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`
}

export const getAvatarSource = (person) => {
  const image = typeof person?.image === "string" ? person.image.trim() : ""
  if (!image) return getInitialsAvatar(person)

  try {
    const baseUrl =
      typeof window === "undefined" ? "http://localhost" : window.location.origin
    const hostname = new URL(image, baseUrl).hostname.toLowerCase()
    if (hostname === "api.dicebear.com") return getInitialsAvatar(person)
  } catch {
    return getInitialsAvatar(person)
  }

  return image
}

export const setInitialsAvatarOnError = (event, personOrName) => {
  event.currentTarget.onerror = null
  event.currentTarget.src = getInitialsAvatar(personOrName)
}
