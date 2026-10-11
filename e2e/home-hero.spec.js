import { expect, test } from "@playwright/test"

// The 3D yeti in the homepage hero (replacing the capsule characters).
// Machines without accelerated WebGL get the poster fallback; assertions
// that need the live scene adapt to the state the page settles in.

async function mockApi(page) {
  await page.route("**/api/**", (route) => {
    const path = new URL(route.request().url()).pathname
    if (path.endsWith("/showAllCategories"))
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: [
            {
              _id: "507f1f77bcf86cd799439012",
              name: "Web Development",
              description: "Build useful web products.",
              publishedCourseCount: 1,
            },
          ],
        }),
      })
    return route.fulfill({
      status: path.endsWith("/getUserDetails") ? 401 : 200,
      contentType: "application/json",
      body: JSON.stringify({ success: false, data: [] }),
    })
  })
}

const yeti = (page) => page.locator(".sn-hero-yeti .sn-yeti")
// The hero's own call to action (the page repeats it further down).
const heroCta = (page) =>
  page
    .locator("section[aria-labelledby='home-hero-title']")
    .getByRole("link", { name: "Explore courses" })
const settle = async (page) => {
  await expect(yeti(page)).toHaveAttribute("data-state", /^(live|static)$/, {
    timeout: 30_000,
  })
  return yeti(page).getAttribute("data-state")
}

test.describe("homepage hero yeti", () => {
  test.use({ reducedMotion: "no-preference" })

  test("replaces the capsules beside intact copy and links", async ({
    page,
  }, testInfo) => {
    const errors = []
    page.on("pageerror", (error) => errors.push(error.message))
    await mockApi(page)
    await page.goto("/")
    const state = await settle(page)
    await expect(page.locator("[data-scene-mode]")).toHaveCount(0)
    await expect(page.locator(".sn-hero-yeti")).toHaveAttribute(
      "aria-hidden",
      "true"
    )
    if (state === "live")
      await expect(page.locator(".sn-hero-yeti canvas")).toHaveCount(1)

    const layout = await page.evaluate(() => {
      const box = (selector) =>
        document.querySelector(selector).getBoundingClientRect()
      const scene = box(".sn-hero-yeti")
      const window_ = box(".sn-hero-yeti-window")
      const title = box("#home-hero-title")
      const header = box("header")
      const points = box(".sn-capsule-points")
      return {
        overflow: document.documentElement.scrollWidth > innerWidth,
        sceneInViewport: scene.left >= 0 && scene.right <= innerWidth,
        windowRound: Math.abs(window_.width - window_.height) < 1,
        titleClearOfHeader: title.top - header.bottom >= 16,
        // Desktop: the yeti sits beside the copy, never over it.
        besideCopy:
          innerWidth < 1024 ||
          (scene.left >= title.right - 1 && scene.left >= points.right - 1),
        // Narrower layouts: above the headline.
        aboveCopy: innerWidth >= 1024 || scene.bottom <= title.top + 1,
      }
    })
    expect(layout).toEqual({
      overflow: false,
      sceneInViewport: true,
      windowRound: true,
      titleClearOfHeader: true,
      besideCopy: true,
      aboveCopy: true,
    })

    // A click on the yeti is a bonus greeting; it never navigates.
    const stage = await yeti(page).boundingBox()
    await page.mouse.click(
      stage.x + stage.width / 2,
      stage.y + stage.height * 0.55
    )
    await expect(page).toHaveURL(/\/$/)
    await page.screenshot({
      path: testInfo.outputPath("home-hero.png"),
      fullPage: false,
    })

    await heroCta(page).click()
    await expect(page).toHaveURL(/\/services$/)
    expect(errors).toEqual([])
  })

  for (const [name, pattern] of [
    ["model", "**/mascot/yeti-v4.2/*.glb"],
    ["decoder", "**/mascot/draco-r186/**"],
  ]) {
    test(`a missing ${name} keeps the poster in the sky window`, async ({
      page,
    }) => {
      const errors = []
      page.on("pageerror", (error) => errors.push(error.message))
      await mockApi(page)
      await page.route(pattern, (route) => route.fulfill({ status: 404 }))
      await page.goto("/")
      await expect(yeti(page)).toHaveAttribute("data-state", "static", {
        timeout: 30_000,
      })
      await expect(
        page.locator(".sn-hero-yeti .sn-yeti-poster").first()
      ).toHaveAttribute("data-visible", "true")
      await expect(page.locator(".sn-hero-yeti-window")).toBeVisible()
      await expect(heroCta(page)).toBeVisible()
      expect(errors).toEqual([])
    })
  }

  test("reduced motion shows the poster without downloading the model", async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: "reduce" })
    const models = []
    page.on("request", (request) => {
      if (/\.glb(\?|$)/.test(request.url())) models.push(request.url())
    })
    await mockApi(page)
    await page.goto("/")
    await expect(yeti(page)).toHaveAttribute("data-state", "static")
    await page.waitForTimeout(1500)
    expect(models).toEqual([])
  })

  test("moving between Home and Login keeps one canvas and fetches each model once", async ({
    page,
  }) => {
    const models = []
    page.on("request", (request) => {
      if (/\.glb(\?|$)/.test(request.url())) models.push(request.url())
    })
    await mockApi(page)
    await page.goto("/")
    const state = await settle(page)
    for (let i = 0; i < 3; i++) {
      // Client-side navigation through the navbar, then back.
      await page.getByRole("link", { name: "Log in" }).first().click()
      await expect(page).toHaveURL(/\/login$/)
      await expect(page.locator(".sn-auth-mascot")).toHaveAttribute(
        "data-state",
        /^(live|static)$/,
        { timeout: 30_000 }
      )
      await page.goBack()
      await settle(page)
    }
    await expect(page.locator(".sn-yeti-canvas")).toHaveCount(
      state === "live" ? 1 : 0
    )
    // Each quality (the hero and the auth stage may differ) is downloaded
    // at most once; returning reuses the parsed model.
    expect(models.length).toBeLessThanOrEqual(2)
    expect(new Set(models).size).toBe(models.length)
  })
})
