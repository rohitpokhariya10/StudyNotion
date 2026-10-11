// Deterministic crop/resample of the supplied raster. No redraw, compositing,
// background removal, recolouring or generated image content.
import { mkdir, readFile, writeFile } from "node:fs/promises"
import { fileURLToPath } from "node:url"
import { chromium } from "playwright"

const root = new URL("../../../", import.meta.url)
const source = new URL(
  "apps/web/src/shared/assets/brand/original/Glossy Jelly Blob Duo.png",
  root
)
const original = await readFile(source)
const browser = await chromium.launch()
let assets
try {
  const page = await browser.newPage({ deviceScaleFactor: 1 })
  assets = await page.evaluate(
    async (data) => {
      const image = new Image()
      image.src = data
      await image.decode()
      if (image.naturalWidth !== 1448 || image.naturalHeight !== 1086)
        throw new Error("The official source dimensions have changed")
      const crop = (rect, width, height, type = "image/png") => {
        const canvas = document.createElement("canvas")
        canvas.width = width
        canvas.height = height
        const context = canvas.getContext("2d")
        context.imageSmoothingEnabled = true
        context.imageSmoothingQuality = "high"
        context.drawImage(image, ...rect, 0, 0, width, height)
        return canvas.toDataURL(type, 0.96).split(",")[1]
      }
      // Both characters, decorative accents and their shadow remain complete.
      const tile = [280, 190, 980, 784]
      const square = [280, 100, 980, 980]
      return {
        logo: crop(tile, 640, 512, "image/webp"),
        social: crop(tile, 640, 512),
        icons: Object.fromEntries(
          [16, 32, 48, 180, 192, 512].map((size) => [
            size,
            crop(square, size, size),
          ])
        ),
      }
    },
    `data:image/png;base64,${original.toString("base64")}`
  )
} finally {
  await browser.close()
}
const save = async (path, base64) =>
  writeFile(new URL(path, root), Buffer.from(base64, "base64"))
await save(
  "apps/web/src/shared/assets/brand/prahit-jelly-duo.webp",
  assets.logo
)
await save("apps/web/public/logo.png", assets.social)
for (const size of [16, 32, 48])
  await save(`apps/web/public/favicon-${size}.png`, assets.icons[size])
await save("apps/web/public/apple-touch-icon.png", assets.icons[180])
await save("apps/web/public/logo192.png", assets.icons[192])
await save("apps/web/public/logo512.png", assets.icons[512])
// Keep the existing checkout import path; payment orchestration is unchanged.
await save("apps/web/src/shared/assets/Logo/rzp_logo.png", assets.icons[512])

const entries = [16, 32, 48].map((size) => ({
  size,
  png: Buffer.from(assets.icons[size], "base64"),
}))
const header = Buffer.alloc(6 + entries.length * 16)
header.writeUInt16LE(1, 2)
header.writeUInt16LE(entries.length, 4)
let offset = header.length
entries.forEach(({ size, png }, index) => {
  const position = 6 + index * 16
  header[position] = size
  header[position + 1] = size
  header.writeUInt16LE(1, position + 4)
  header.writeUInt16LE(32, position + 6)
  header.writeUInt32LE(png.length, position + 8)
  header.writeUInt32LE(offset, position + 12)
  offset += png.length
})
await writeFile(
  new URL("apps/web/public/favicon.ico", root),
  Buffer.concat([header, ...entries.map(({ png }) => png)])
)

const evidence = new URL("docs/growed-redesign/verification/", root)
await mkdir(evidence, { recursive: true })
console.log(
  "Prepared official two-character logo, 16/32/48 ICO, and PNG icons."
)
console.log("Original source retained:", fileURLToPath(source))
