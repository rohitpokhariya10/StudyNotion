import AxeBuilder from "@axe-core/playwright"
import { expect, test } from "@playwright/test"

import { neetFixture, neetIds } from "../apps/web/test/neetFixtures"

const student = {
  _id: neetIds.user,
  firstName: "Asha",
  lastName: "Rao",
  email: "asha@example.test",
  accountType: "Student",
  active: true,
  approved: true,
  deletionPending: false,
}

function paper(index, subject, state = "OPEN") {
  const { test: full } = neetFixture()
  const {
    instructions: _instructions,
    proctorPolicy: _policy,
    ...summary
  } = full
  return {
    ...summary,
    id: `507f1f77bcf86cd79943901${index}`,
    title: `${subject} practice`,
    sections: [{ ...summary.sections[0], subjectKey: subject, title: subject }],
    availability: { ...summary.availability, state },
  }
}
const papers = [
  paper(0, "physics", "UPCOMING"),
  paper(1, "botany"),
  paper(2, "zoology", "CLOSED"),
]
const firstOpen = papers[1]

async function api(page, { catalog = () => ({ tests: papers }), user } = {}) {
  const json = (route, status, body) =>
    route.fulfill({
      status,
      contentType: "application/json",
      body: JSON.stringify(body),
    })
  await page.route("**/api/**", async (route) => {
    const path = new URL(route.request().url()).pathname
    if (path.endsWith("/profile/getUserDetails"))
      return user
        ? json(route, 200, {
            success: true,
            data: user,
            deletionPending: false,
            requiresPolicyAcceptance: false,
          })
        : json(route, 401, { success: false })
    if (path.endsWith("/project-neet/tests")) {
      const value = catalog()
      return value.error
        ? json(route, 503, {
            success: false,
            error: {
              code: "NEET_SERVICE_UNAVAILABLE",
              message: "Unavailable",
              requestId: "landing-qa",
            },
          })
        : json(route, 200, { success: true, requestId: "qa", data: value })
    }
    if (path.endsWith(`/project-neet/tests/${firstOpen.id}`)) {
      const { test: full } = neetFixture()
      return json(route, 200, {
        success: true,
        requestId: "qa",
        data: { ...full, ...firstOpen, instructions: full.instructions },
      })
    }
    if (path.endsWith("/project-neet/attempts"))
      return json(route, 200, {
        success: true,
        requestId: "qa",
        data: { attempts: [] },
      })
    return json(route, 200, { success: true, data: [] })
  })
}

const noHorizontalOverflow = (page) =>
  page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)

test("landing is short, accessible, and drawn without raster art or WebGL", async ({
  page,
}, testInfo) => {
  await api(page)
  const errors = []
  page.on("pageerror", (error) => errors.push(error.message))
  await page.goto("/neet")
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "Big dreams. Stronger preparation.",
    })
  ).toBeVisible()
  await expect(
    page.getByRole("heading", { name: "botany practice", exact: true })
  ).toBeVisible()
  await expect(page.locator("h1")).toHaveCount(1)
  await expect(page.locator("main img, main canvas")).toHaveCount(0)
  await expect(page.locator(".np-cluster .np-scene")).toHaveCount(2)
  // Exactly two content sections follow the hero; the preparation section is last.
  await expect(page.locator("main h2")).toHaveText([
    "Pick today’s sitting.",
    "Preparation with purpose. Confidence with a foundation.",
  ])
  const height = await page.evaluate(
    () => document.documentElement.scrollHeight
  )
  // Budgets include the shared landscape footer (about 700px on desktop,
  // 770px on tablet and 1,100px on phones). The old page was 6,289px tall.
  const budget =
    { "neet-mobile": 6000, "neet-tablet": 4500 }[testInfo.project.name] ?? 3600
  expect(height).toBeLessThan(budget)
  expect(await noHorizontalOverflow(page)).toBe(true)
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([])
  expect(errors).toEqual([])
})

test("shared landscape footer renders, keeps the NEET notice, and stays clear of Contact us", async ({
  page,
}) => {
  await api(page)
  await page.goto("/neet")
  // Wait for the catalog so the page height is final before scrolling; the
  // landscape is lazy and only loads once it is near the viewport.
  await page
    .getByRole("heading", { name: "botany practice", exact: true })
    .waitFor()
  const footer = page.getByRole("contentinfo")
  await page.evaluate(() =>
    window.scrollTo(0, document.documentElement.scrollHeight)
  )
  const art = footer.locator(".sn-footer-art")
  await expect(art).toBeVisible()
  await expect
    .poll(() => art.evaluate((img) => img.complete && img.naturalWidth > 0))
    .toBe(true)
  const size = await art.evaluate((img) => ({
    natural: img.naturalWidth / img.naturalHeight,
    fit: getComputedStyle(img).objectFit,
  }))
  expect(size.natural).toBeCloseTo(2.4, 1)
  expect(size.fit).toBe("cover")
  await expect(
    footer.getByRole("heading", { name: "Make room for your next chapter" })
  ).toBeVisible()
  await expect(
    footer.getByText(/not affiliated with or endorsed by the National/)
  ).toBeVisible()
  // At rest, nothing in the footer sits under the floating support link.
  const covered = await page.evaluate(() => {
    const pill = document
      .querySelector('aside[aria-label="Support"] a')
      .getBoundingClientRect()
    return [
      ...document.querySelectorAll(
        ".sn-footer a, .sn-footer-note, .sn-footer-title"
      ),
    ]
      .filter((node) => {
        const box = node.getBoundingClientRect()
        return (
          Math.min(box.right, pill.right) - Math.max(box.left, pill.left) > 0 &&
          Math.min(box.bottom, pill.bottom) - Math.max(box.top, pill.top) > 0
        )
      })
      .map((node) => node.textContent.trim())
  })
  expect(covered).toEqual([])
  expect(await noHorizontalOverflow(page)).toBe(true)
  for (const [name, path] of [
    ["Create an account", /\/signup$/],
    ["Privacy Policy", /\/privacy-policy$/],
    ["NEET Mocks", /\/neet$/],
  ]) {
    await page.goto("/neet")
    await page
      .getByRole("contentinfo")
      .getByRole("link", { name, exact: true })
      .click()
    await expect(page).toHaveURL(path)
  }
})

test("Start a Mock sends visitors through sign-in to the open paper", async ({
  page,
}) => {
  await api(page)
  await page.goto("/neet")
  const start = page.getByRole("link", { name: "Start a Mock" }).first()
  await expect(start).toHaveAttribute(
    "href",
    `/neet/mocks/${firstOpen.id}/start`
  )
  await start.click()
  // The real student route guard runs; nothing is bypassed.
  await expect(page).toHaveURL(/\/login$/)
  await page.goBack()
  await expect(page).toHaveURL(/\/neet$/)
  await expect(
    page.getByRole("heading", { name: "Big dreams. Stronger preparation." })
  ).toBeVisible()
})

test("Start a Mock opens the real onboarding for a signed-in student", async ({
  page,
}) => {
  await api(page, { user: student })
  await page.goto("/neet")
  await expect(
    page.getByRole("link", { name: "Signed in as Asha. View mocks." })
  ).toBeVisible()
  await page.getByRole("link", { name: "Start a Mock" }).first().click()
  await expect(page).toHaveURL(new RegExp(`/neet/mocks/${firstOpen.id}/start$`))
  await expect(
    page.getByRole("heading", { level: 1, name: firstOpen.title })
  ).toBeVisible()
  await expect(
    page.getByRole("list", { name: "Onboarding progress" })
  ).toBeVisible()
})

test("empty catalog and service errors show real states and recover", async ({
  page,
}) => {
  let state = "empty"
  await api(page, {
    catalog: () =>
      state === "empty"
        ? { tests: [] }
        : state === "error"
          ? { error: true }
          : { tests: papers },
  })
  await page.goto("/neet")
  await expect(
    page.getByRole("heading", { name: "No mocks are open right now" })
  ).toBeVisible()
  for (const link of await page
    .getByRole("link", { name: "Start a Mock" })
    .all())
    await expect(link).toHaveAttribute("href", "/neet/mocks")
  state = "error"
  await page.getByRole("button", { name: "Check availability" }).click()
  await expect(page.getByRole("alert")).toContainText(
    "NEET Mocks are briefly unavailable"
  )
  await expect(page.getByRole("alert")).toContainText("landing-qa")
  state = "ready"
  await page.getByRole("button", { name: "Try again" }).click()
  await expect(
    page.getByRole("heading", { name: "botany practice", exact: true })
  ).toBeVisible()
  await expect(
    page.getByRole("link", { name: "Start a Mock" }).first()
  ).toHaveAttribute("href", `/neet/mocks/${firstOpen.id}/start`)
})

test("navigation reaches the real catalog, sign-in, and Prahit home", async ({
  page,
}, testInfo) => {
  await api(page)
  await page.goto("/neet")
  await page.getByRole("link", { name: "Explore Tests", exact: true }).click()
  await expect(page).toHaveURL(/\/neet\/mocks$/)
  await expect(
    page.getByRole("heading", { name: "Mock tests", exact: true })
  ).toBeVisible()
  await page.goBack()
  await expect(page).toHaveURL(/\/neet$/)
  await page
    .getByRole("link", { name: "All mocks & your attempts", exact: true })
    .click()
  await expect(page).toHaveURL(/\/neet\/mocks$/)
  await page.goto("/neet")
  await page.getByRole("link", { name: "Sign in", exact: true }).click()
  await expect(page).toHaveURL(/\/login$/)
  await page.goto("/neet")
  if (testInfo.project.name === "neet-mobile")
    await page.getByRole("button", { name: "Menu" }).click()
  await page.getByRole("link", { name: "Back to Prahit" }).click()
  await expect(page).toHaveURL(/127\.0\.0\.1:\d+\/$/)
})

test("phone menu is keyboard operable and closes cleanly", async ({
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.name !== "neet-mobile",
    "The menu button exists only below 768px"
  )
  await api(page)
  await page.goto("/neet")
  const button = page.getByRole("button", { name: "Menu" })
  await expect(
    page.getByRole("navigation", { name: "Prahit NEET Mocks", exact: true })
  ).toBeHidden()
  await button.focus()
  await page.keyboard.press("Enter")
  await expect(button).toHaveAttribute("aria-expanded", "true")
  const menu = page.getByRole("navigation", { name: "Prahit NEET Mocks menu" })
  await expect(menu.getByRole("link", { name: "Overview" })).toHaveAttribute(
    "aria-current",
    "page"
  )
  await page.keyboard.press("Escape")
  await expect(menu).toBeHidden()
  await expect(button).toBeFocused()
  await button.click()
  await menu.getByRole("link", { name: "Mock tests" }).click()
  await expect(page).toHaveURL(/\/neet\/mocks$/)
})

test("decorative motion stops for reduced-motion users", async ({
  browser,
}) => {
  for (const reducedMotion of ["reduce", "no-preference"]) {
    const context = await browser.newContext({ reducedMotion })
    const page = await context.newPage()
    await api(page)
    await page.goto("/neet")
    const name = await page
      .locator(".np-slot-watch")
      .evaluate((node) => getComputedStyle(node).animationName)
    expect(name, reducedMotion).toBe(
      reducedMotion === "reduce" ? "none" : "np-bob"
    )
    await context.close()
  }
})

test("responsive sweep keeps the hero clear of its artwork", async ({
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.name !== "neet-desktop",
    "Single desktop-driven resize sweep"
  )
  await api(page)
  await page.goto("/neet")
  await page
    .getByRole("heading", { name: "botany practice", exact: true })
    .waitFor()
  for (const [width, height] of [
    [1920, 1080],
    [1512, 870],
    [1440, 900],
    [1366, 768],
    [1024, 768],
    [820, 1180],
    [390, 844],
    [375, 667],
    [320, 740],
  ]) {
    // Measure a fresh load at each size: emulated resizes settle viewport
    // units a frame or more later, which made in-place sweeps flaky.
    await page.setViewportSize({ width, height })
    await page.reload()
    await page
      .getByRole("heading", { name: "botany practice", exact: true })
      .waitFor()
    const report = await page.evaluate(() => {
      const art = [...document.querySelectorAll(".np-scene > *, .np-actor")]
        .map((node) => node.getBoundingClientRect())
        .filter((box) => box.width > 0)
      const overlaps = []
      for (const node of document.querySelectorAll(
        ".np-hero-title span, .np-hero-lead, .np-hero-actions a"
      )) {
        const range = document.createRange()
        range.selectNodeContents(node)
        const boxes = node.matches("a")
          ? [node.getBoundingClientRect()]
          : [...range.getClientRects()]
        for (const box of boxes)
          for (const shape of art)
            if (
              Math.min(box.right, shape.right) -
                Math.max(box.left, shape.left) >
                2 &&
              Math.min(box.bottom, shape.bottom) -
                Math.max(box.top, shape.top) >
                2
            )
              overlaps.push(node.textContent.slice(0, 20))
      }
      const outside = [
        ...document.querySelectorAll("main section, main article, main a"),
      ].filter((node) => {
        const box = node.getBoundingClientRect()
        return box.width > 0 && (box.left < -1 || box.right > innerWidth + 1)
      }).length
      const cta = document
        .querySelector(".np-hero-actions .np-btn-primary")
        .getBoundingClientRect()
      return { overlaps, outside, ctaBottom: cta.bottom }
    })
    const label = `${width} × ${height}`
    expect(report.overlaps, label).toEqual([])
    expect(report.outside, label).toBe(0)
    expect(report.ctaBottom, label).toBeLessThanOrEqual(height)
    expect(await noHorizontalOverflow(page), label).toBe(true)
  }
})
