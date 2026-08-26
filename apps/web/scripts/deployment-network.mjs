import { isIP } from "node:net"

const normalizeHostname = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/^\[|\]$/g, "")
    .replace(/\.$/, "")

const mappedIpv4 = (hostname) => {
  const hexadecimal = /^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/.exec(hostname)
  if (hexadecimal) {
    const high = Number.parseInt(hexadecimal[1], 16)
    const low = Number.parseInt(hexadecimal[2], 16)
    return [high >> 8, high & 0xff, low >> 8, low & 0xff]
  }

  const dotted = /^::ffff:(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(
    hostname
  )
  if (!dotted) return undefined
  const octets = dotted.slice(1).map(Number)
  return octets.every((octet) => octet >= 0 && octet <= 255)
    ? octets
    : undefined
}

export const isLoopbackHostname = (value) => {
  const hostname = normalizeHostname(value)
  if (
    hostname === "localhost" ||
    hostname.endsWith(".localhost") ||
    hostname === "host.docker.internal" ||
    hostname === "::" ||
    hostname === "::1"
  ) {
    return true
  }

  if (isIP(hostname) === 4) {
    return hostname === "0.0.0.0" || hostname.startsWith("127.")
  }
  const mapped = mappedIpv4(hostname)
  return Boolean(
    mapped && (mapped[0] === 127 || mapped.every((octet) => octet === 0))
  )
}

export const resolveNginxApiOrigin = ({
  apiBaseUrl,
  webBuild = "production",
}) => {
  const buildMode = String(webBuild || "").trim()
  if (!new Set(["local", "production"]).has(buildMode)) {
    throw new Error("STUDYNOTION_WEB_BUILD must be production or local")
  }

  const rawApiBaseUrl = String(apiBaseUrl || "").trim()
  if (!rawApiBaseUrl) {
    throw new Error("VITE_API_BASE_URL is required")
  }

  if (rawApiBaseUrl.replace(/\/$/, "") === "/api/v1") return ""

  let parsedApiUrl
  try {
    parsedApiUrl = new URL(rawApiBaseUrl)
  } catch {
    throw new Error(
      "VITE_API_BASE_URL must be /api/v1 or a canonical absolute API URL"
    )
  }

  if (
    parsedApiUrl.pathname.replace(/\/$/, "") !== "/api/v1" ||
    parsedApiUrl.username ||
    parsedApiUrl.password ||
    parsedApiUrl.search ||
    parsedApiUrl.hash
  ) {
    throw new Error(
      "VITE_API_BASE_URL must use the canonical /api/v1 path without credentials, query, or fragment"
    )
  }

  const isSecureApi = parsedApiUrl.protocol === "https:"
  const isLocalLoopbackApi =
    buildMode === "local" &&
    parsedApiUrl.protocol === "http:" &&
    isLoopbackHostname(parsedApiUrl.hostname)

  if (!isSecureApi && !isLocalLoopbackApi) {
    throw new Error(
      "Absolute VITE_API_BASE_URL values must use HTTPS; local builds may use loopback HTTP"
    )
  }

  return parsedApiUrl.origin
}
