import assert from "node:assert/strict"
import fs from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { chromium, webkit } from "playwright"

const out = path.dirname(fileURLToPath(import.meta.url))
const screenshots = path.resolve(out, "../../screenshots")
const report = process.env.YETI_WEBKIT_ONLY
  ? JSON.parse(
      await fs.readFile(path.join(out, "browser-results.json"), "utf8")
    ).filter((x) => x.label !== "webkit")
  : []
const read = (page) =>
  page.evaluate(() => ({
    parts: [...document.querySelectorAll(".sn-mascot img[data-layer]")].map(
      (x) => x.dataset.layer
    ),
    body: document.querySelector("[data-part=body]").style.transform,
    head: document.querySelector("[data-part=head]").style.transform,
    pupils: [...document.querySelectorAll(".sn-mascot-pupil")].map((x) =>
      x.getAttribute("transform")
    ),
    overflow: document.documentElement.scrollWidth > innerWidth,
    layers: [...document.querySelectorAll(".sn-mascot img")].map((x) => ({
      src: x.currentSrc,
      loaded: x.complete && x.naturalWidth > 0,
    })),
    privacy: document.querySelector(".sn-mascot").dataset.eyes,
  }))
const verify = async (
  browser,
  label,
  options,
  route,
  { record = false, track = true } = {}
) => {
  const ctx = await browser.newContext({
    ...options,
    ...(record
      ? { recordVideo: { dir: path.join(out, "raw"), size: options.viewport } }
      : {}),
  })
  const page = await ctx.newPage()
  const errors = []
  page.on("pageerror", (e) => errors.push(e.message))
  await page.addInitScript(() => {
    window.__standingFrames = []
    const sample = () => {
      const s = document.querySelector(".sn-mascot[data-ready]")
      if (s && window.__standingFrames.length < 800) {
        const b = s.querySelector("[data-part=body]")
        window.__standingFrames.push({
          t: performance.now(),
          body: b?.style.transform,
          parts: [...s.querySelectorAll("[data-layer]")].map(
            (n) => n.dataset.layer
          ),
        })
      }
      requestAnimationFrame(sample)
    }
    requestAnimationFrame(sample)
  })
  const reloads = []
  for (let i = 0; i < 3; i++) {
    if (i === 0) await page.goto(`http://localhost:3000/${route}`)
    else await page.reload()
    await page.locator(".sn-mascot[data-ready]").waitFor()
    await page.waitForTimeout(i === 2 ? 4100 : 700)
    const state = await read(page)
    assert.deepEqual(state.parts, ["body", "head"])
    assert.equal(state.overflow, false)
    assert(state.layers.every((x) => x.loaded))
    const poses = await page.evaluate(() => window.__standingFrames)
    assert(poses.length > 0)
    assert.equal(
      new Set(poses.map((x) => x.body)).size,
      1,
      "Body must never change on idle reload"
    )
    assert(poses.every((x) => x.parts.join(",") === "body,head"))
    reloads.push({ first: poses[0], frames: poses.length, state })
  }
  await page.screenshot({
    path: path.join(screenshots, `yeti-standing-${route}-${label}.png`),
    fullPage: true,
  })
  await page.locator(".sn-mascot").scrollIntoViewIfNeeded()
  await page.waitForTimeout(300)
  const neutral = await read(page)
  const corners = []
  if (track) {
    const { width: w, height: h } = options.viewport
    for (const [name, x, y] of [
      ["top-left", 1, 1],
      ["top-right", w - 2, 1],
      ["bottom-right", w - 2, h - 2],
      ["bottom-left", 1, h - 2],
    ]) {
      await page.mouse.move(x, y, { steps: 24 })
      await page.waitForTimeout(800)
      const state = await read(page)
      assert.notDeepEqual(state.pupils, neutral.pupils)
      assert.notEqual(state.head, neutral.head)
      corners.push({ name, ...state })
      if (label === "desktop")
        await page
          .locator(".sn-mascot")
          .screenshot({ path: path.join(out, `${route}-${name}.png`) })
    }
    for (let i = 0; i < 10; i++) {
      await page.mouse.move(i % 2 ? 1 : w - 2, i % 3 ? 1 : h - 2)
      await page.waitForTimeout(70)
    }
    await page.mouse.move(-30, -30)
    await page.waitForTimeout(2500)
    const exited = await read(page)
    assert.equal(exited.body, neutral.body)
    assert.equal(exited.head, neutral.head)
  } else {
    await page.dispatchEvent("main", { type: "pointermove" }.type, {
      clientX: 100,
      clientY: 100,
      pointerType: options.isMobile ? "touch" : "mouse",
    })
    await page.waitForTimeout(500)
    const state = await read(page)
    assert.equal(state.head, neutral.head)
    assert.equal(state.body, neutral.body)
  }
  await page.locator("input[type=password]").first().focus()
  await page.waitForTimeout(500)
  assert.equal((await read(page)).privacy, "closed")
  assert.equal(errors.length, 0, errors.join("\n"))
  const video = page.video()
  await ctx.close()
  if (video) await video.saveAs(path.join(out, `${route}-${label}.webm`))
  report.push({ label, route, reloads, corners, errors })
  await fs.writeFile(
    path.join(out, "browser-results.json"),
    JSON.stringify(report, null, 2)
  )
  console.log(
    "PASS",
    route,
    label,
    "3 reloads, standing pose, tracking/privacy, no overflow or runtime errors"
  )
}
if (!process.env.YETI_WEBKIT_ONLY) {
  const browser = await chromium.launch()
  for (const route of ["login", "signup"])
    await verify(
      browser,
      "desktop",
      { viewport: { width: 1440, height: 1000 } },
      route,
      { record: true }
    )
  for (const route of ["login", "signup"])
    await verify(
      browser,
      "mobile",
      {
        viewport: { width: 390, height: 844 },
        isMobile: true,
        hasTouch: true,
        deviceScaleFactor: 2,
      },
      route,
      { record: true, track: false }
    )
  for (const route of ["login", "signup"])
    await verify(
      browser,
      "reduced",
      { viewport: { width: 1440, height: 1000 }, reducedMotion: "reduce" },
      route,
      { track: false }
    )
  await browser.close()
}
const safari = await webkit.launch()
for (const route of ["login", "signup"])
  await verify(
    safari,
    "webkit",
    { viewport: { width: 1440, height: 1000 } },
    route
  )
await safari.close()
console.log("PASS all", report.length, "scenarios")
