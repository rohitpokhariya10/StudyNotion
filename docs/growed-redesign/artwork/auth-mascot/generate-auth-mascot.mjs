// Renders the auth-page mascot and sky artwork in headless Chromium (WebGL)
// and writes the layered assets used by apps/web/src/shared/ui/auth-scene.
//
//   node docs/growed-redesign/artwork/auth-mascot/generate-auth-mascot.mjs [preview|export] [outDir]
//
// `preview` writes composites for inspection to outDir (default: a temp dir);
// `export` writes the WebP layers and auth-mascot.json into the app assets.
import { mkdir, readFile, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { extname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { chromium } from "playwright"

const here = fileURLToPath(new URL(".", import.meta.url))
const root = fileURLToPath(new URL("../../../../", import.meta.url))
const mode = process.argv[2] || "preview"
const outDir =
  process.argv[3] ||
  (mode === "export"
    ? join(root, "apps/web/src/shared/assets/auth-scene")
    : join(tmpdir(), "auth-mascot-preview"))

const types = { ".js": "text/javascript", ".html": "text/html" }
const browser = await chromium.launch({
  args: ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist"],
})
try {
  const page = await browser.newPage()
  page.on("console", (message) => console.log("[page]", message.text()))
  page.on("pageerror", (error) => console.error("[page error]", error.message))
  await page.route("http://render.local/**", async (route) => {
    const { pathname } = new URL(route.request().url())
    const file = pathname.startsWith("/three/")
      ? join(root, "node_modules/three", pathname.slice("/three/".length))
      : pathname === "/"
        ? null
        : join(here, pathname.slice(1))
    if (!file)
      return route.fulfill({
        contentType: "text/html",
        body: `<!doctype html><script type="importmap">{"imports":{"three":"/three/build/three.module.js"}}</script>
<script type="module">import * as main from "/main.js"; window.main = main; window.ready = true</script>`,
      })
    route.fulfill({
      contentType: types[extname(file)] || "application/octet-stream",
      body: await readFile(file),
    })
  })
  await page.goto("http://render.local/")
  await page.waitForFunction(() => window.ready === true, null, {
    timeout: 60000,
  })
  await mkdir(outDir, { recursive: true })
  const files = await page.evaluate(
    (m) => window.main[m === "export" ? "exportAll" : m](),
    mode
  )
  for (const [name, content] of Object.entries(files)) {
    const body = name.endsWith(".json")
      ? content
      : Buffer.from(content, "base64")
    await writeFile(join(outDir, name), body)
    console.log("wrote", join(outDir, name))
  }
} finally {
  await browser.close()
}
