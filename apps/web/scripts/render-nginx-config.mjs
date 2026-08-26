import { readFile, writeFile } from "node:fs/promises"

const apiBaseUrl = process.env.VITE_API_BASE_URL?.trim()

if (!apiBaseUrl) {
  throw new Error("VITE_API_BASE_URL is required")
}

const normalizedApiBaseUrl = apiBaseUrl.replace(/\/$/, "")
const isSameOriginApi = normalizedApiBaseUrl === "/api/v1"

let apiOrigin = ""

if (!isSameOriginApi) {
  let parsedApiUrl

  try {
    parsedApiUrl = new URL(apiBaseUrl)
  } catch {
    throw new Error(
      "VITE_API_BASE_URL must be /api/v1 or a valid HTTPS API URL"
    )
  }

  if (parsedApiUrl.protocol !== "https:") {
    throw new Error("Absolute VITE_API_BASE_URL must use HTTPS")
  }

  apiOrigin = parsedApiUrl.origin
}

const source = await readFile(new URL("../nginx.conf", import.meta.url), "utf8")

const placeholder = "__API_ORIGIN__"

if (!source.includes(placeholder)) {
  throw new Error(`nginx.conf is missing ${placeholder}`)
}

/*
 * Same-origin deployments already have 'self' in connect-src,
 * therefore no additional CSP origin is required.
 *
 * Separate API deployments inject their HTTPS origin.
 */
const rendered = source.replaceAll(placeholder, apiOrigin)

await writeFile(new URL("../nginx.rendered.conf", import.meta.url), rendered)
