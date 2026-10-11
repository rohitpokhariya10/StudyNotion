import AxeBuilder from "@axe-core/playwright"
import { expect, test } from "@playwright/test"

// The 3D yeti on Login and Signup. Machines without accelerated WebGL (for
// example CI's headless Chromium) get the poster fallback; assertions that
// need the live scene adapt to the state the page settles in.

async function mockApi(page) {
  const sent = []
  await page.route("**/api/**", (route) => {
    const request = route.request()
    const path = new URL(request.url()).pathname
    if (path.endsWith("/auth/login")) {
      sent.push({ login: request.postDataJSON() })
      return route.fulfill({
        status: 401,
        contentType: "application/json",
        body: JSON.stringify({
          success: false,
          message: "Invalid email or password",
        }),
      })
    }
    if (path.endsWith("/auth/sendotp")) {
      sent.push({ otp: request.postDataJSON() })
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, message: "OTP sent" }),
      })
    }
    return route.fulfill({
      status: path.endsWith("/getUserDetails") ? 401 : 200,
      contentType: "application/json",
      body: JSON.stringify({ success: false, data: [] }),
    })
  })
  return sent
}

const mascot = (page) => page.locator(".sn-yeti")
const settle = async (page) => {
  await expect(mascot(page)).toHaveAttribute("data-state", /^(live|static)$/, {
    timeout: 30_000,
  })
  return mascot(page).getAttribute("data-state")
}

async function signIn(page, sent) {
  await page
    .getByPlaceholder("Enter email address", { exact: true })
    .fill("learner@example.test")
  await page
    .getByPlaceholder("Enter Password", { exact: true })
    .fill("ExamplePassword123")
  await page.getByRole("button", { name: "Sign In", exact: true }).click()
  await expect
    .poll(() => sent.at(-1)?.login)
    .toEqual({ email: "learner@example.test", password: "ExamplePassword123" })
}

test.describe("3D yeti mascot", () => {
  test.use({ reducedMotion: "no-preference" })

  for (const path of ["/login", "/signup"]) {
    test(`${path}: stays inside its panel and never blocks the form`, async ({
      page,
    }) => {
      const sent = await mockApi(page)
      await page.goto(path)
      const state = await settle(page)
      await expect(mascot(page)).toHaveAttribute("aria-hidden", "true")
      if (state === "live") {
        await expect(page.locator(".sn-yeti-canvas")).toHaveAttribute(
          "data-visible",
          "true"
        )
        await expect(mascot(page)).toHaveAttribute(
          "data-quality",
          /^(standard|light)$/
        )
      }
      const layout = await page.evaluate(() => {
        const stage = document.querySelector(".sn-yeti").getBoundingClientRect()
        const panel = document
          .querySelector(".sn-auth-visual")
          .getBoundingClientRect()
        const hit = document.elementFromPoint(
          stage.left + stage.width / 2,
          stage.top + stage.height / 2
        )
        return {
          inside:
            stage.left >= panel.left - 1 &&
            stage.right <= panel.right + 1 &&
            stage.top >= panel.top - 1 &&
            stage.bottom <= panel.bottom + 1,
          overflow: document.documentElement.scrollWidth > innerWidth,
          mascotTakesClicks: Boolean(hit?.closest(".sn-yeti")),
        }
      })
      expect(layout).toEqual({
        inside: true,
        overflow: false,
        mascotTakesClicks: false,
      })

      const axe = await new AxeBuilder({ page }).analyze()
      expect(axe.violations).toEqual([])

      if (path === "/login") await signIn(page, sent)
      else {
        await page
          .getByPlaceholder("Enter first name", { exact: true })
          .fill("Asha")
        await page
          .getByPlaceholder("Enter last name", { exact: true })
          .fill("Rao")
        await page
          .getByPlaceholder("Enter email address", { exact: true })
          .fill("asha@example.test")
        await page
          .getByPlaceholder("Enter Password", { exact: true })
          .fill("ExamplePass123")
        await page
          .getByPlaceholder("Confirm Password", { exact: true })
          .fill("ExamplePass123")
        for (const box of await page.getByRole("checkbox").all())
          await box.check()
        await page
          .getByRole("button", { name: "Create Account", exact: true })
          .click()
        await expect
          .poll(() => sent.at(-1)?.otp?.email)
          .toBe("asha@example.test")
      }
    })
  }

  test("sign-up fits common laptop screens with the sign-in composition", async ({
    page,
  }, testInfo) => {
    test.skip(
      !testInfo.project.name.includes("desktop"),
      "two-column desktop layout"
    )
    await mockApi(page)
    const measure = () =>
      page.evaluate(() => {
        const visual = document
          .querySelector(".sn-auth-visual")
          .getBoundingClientRect()
        const stage = document.querySelector(".sn-yeti").getBoundingClientRect()
        return {
          scroll: document.documentElement.scrollHeight - innerHeight,
          headroom: (stage.top - visual.top) / visual.height,
          stageInside:
            stage.top >= visual.top - 1 && stage.bottom <= visual.bottom + 1,
        }
      })
    // Browser viewports of a 1080p monitor, a 14" MacBook Pro and a 13"
    // MacBook Air at default scaling.
    for (const viewport of [
      { width: 1920, height: 950 },
      { width: 1512, height: 870 },
      { width: 1470, height: 846 },
    ]) {
      await page.setViewportSize(viewport)
      await page.goto("/login")
      await settle(page)
      const login = await measure()
      await page.goto("/signup")
      await settle(page)
      const signup = await measure()
      expect(
        signup.scroll,
        `${viewport.width}x${viewport.height}`
      ).toBeLessThanOrEqual(0)
      expect(login.scroll).toBeLessThanOrEqual(0)
      expect(signup.stageInside).toBe(true)
      // No tall empty sky above the yeti: about the sign-in proportion.
      expect(Math.abs(signup.headroom - login.headroom)).toBeLessThan(0.06)
    }
  })

  test("closes its eyes while a password is focused or revealed", async ({
    page,
  }) => {
    await mockApi(page)
    await page.goto("/login")
    await settle(page)
    const password = page.getByPlaceholder("Enter Password", { exact: true })
    await password.focus()
    await expect(mascot(page)).toHaveAttribute("data-eyes", "closed")
    await page
      .getByRole("button", { name: "Show password", exact: true })
      .click()
    await expect(mascot(page)).toHaveAttribute("data-eyes", "closed")
    await page
      .getByRole("button", { name: "Hide password", exact: true })
      .click()
    await page.getByPlaceholder("Enter email address", { exact: true }).focus()
    await expect(mascot(page)).toHaveAttribute("data-eyes", "open")
  })

  for (const [name, pattern] of [
    ["model", "**/mascot/yeti-v4.2/*.glb"],
    ["decoder", "**/mascot/draco-r186/**"],
  ]) {
    test(`a missing ${name} keeps the poster and sign-in working`, async ({
      page,
    }) => {
      const errors = []
      page.on("pageerror", (error) => errors.push(error.message))
      const sent = await mockApi(page)
      await page.route(pattern, (route) => route.fulfill({ status: 404 }))
      await page.goto("/login")
      await expect(mascot(page)).toHaveAttribute("data-state", "static", {
        timeout: 30_000,
      })
      await expect(page.locator(".sn-yeti-poster").first()).toHaveAttribute(
        "data-visible",
        "true"
      )
      await signIn(page, sent)
      expect(errors).toEqual([])
    })
  }

  test("reduced motion shows the poster without downloading the model", async ({
    page,
  }) => {
    // Explicit emulation: a nested test.use() does not override the outer
    // reducedMotion option.
    await page.emulateMedia({ reducedMotion: "reduce" })
    const models = []
    page.on("request", (request) => {
      if (/\.glb(\?|$)/.test(request.url())) models.push(request.url())
    })
    await mockApi(page)
    await page.goto("/login")
    expect(
      await page.evaluate(
        () => matchMedia("(prefers-reduced-motion: reduce)").matches
      )
    ).toBe(true)
    await expect(mascot(page)).toHaveAttribute("data-state", "static")
    await expect(page.locator(".sn-yeti-canvas")).toHaveCount(0)
    await page.waitForTimeout(1500)
    expect(models).toEqual([])
  })

  test("revisiting Login and Signup reuses one model and one canvas", async ({
    page,
  }) => {
    const models = []
    page.on("request", (request) => {
      if (/\.glb(\?|$)/.test(request.url())) models.push(request.url())
    })
    await mockApi(page)
    await page.goto("/login")
    const state = await settle(page)
    for (let i = 0; i < 4; i++) {
      await page
        .getByRole("link", { name: "Sign up", exact: true })
        .last()
        .click()
      await expect(page).toHaveURL(/\/signup$/)
      await settle(page)
      await page.getByRole("link", { name: "Sign in", exact: true }).click()
      await expect(page).toHaveURL(/\/login$/)
      await settle(page)
    }
    await expect(page.locator(".sn-yeti-canvas")).toHaveCount(
      state === "live" ? 1 : 0
    )
    expect(models.length).toBe(state === "live" ? 1 : 0)
  })
})
