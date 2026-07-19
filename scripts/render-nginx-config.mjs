import { readFile, writeFile } from "node:fs/promises"

const apiBaseUrl = process.env.VITE_API_BASE_URL
if (!apiBaseUrl) throw new Error("VITE_API_BASE_URL is required")

let apiOrigin
try {
  apiOrigin = new URL(apiBaseUrl).origin
} catch {
  throw new Error("VITE_API_BASE_URL must be a valid URL")
}

const source = await readFile(new URL("../nginx.conf", import.meta.url), "utf8")
const placeholder = "__API_ORIGIN__"
if (!source.includes(placeholder)) {
  throw new Error(`nginx.conf is missing ${placeholder}`)
}

await writeFile(
  new URL("../nginx.rendered.conf", import.meta.url),
  source.replaceAll(placeholder, apiOrigin)
)
