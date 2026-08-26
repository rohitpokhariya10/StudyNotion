import { readFile, writeFile } from "node:fs/promises"

import { resolveNginxApiOrigin } from "./deployment-network.mjs"

const apiOrigin = resolveNginxApiOrigin({
  apiBaseUrl: process.env.VITE_API_BASE_URL,
  webBuild: process.env.STUDYNOTION_WEB_BUILD,
})

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
