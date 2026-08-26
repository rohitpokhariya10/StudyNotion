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
