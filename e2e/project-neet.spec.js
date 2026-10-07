import AxeBuilder from "@axe-core/playwright"
import { expect, test } from "@playwright/test"

import { neetFixture, neetIds } from "../apps/web/test/neetFixtures"

const attemptPath = `/project-neet/attempts/${neetIds.attempt}`
const onboardingPath = `/project-neet/mocks/${neetIds.test}/start`
const json = (route, data, status = 200) =>
  route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify(data),
  })
async function mockNeet(context, options = {}) {
  const fixture = neetFixture(options)
  let registered = options.registered !== false
  let submitCalls = 0
  let saves = 0
  let networkDown = false
  let activeSession = null
  let mode = options.mode || "NON_PROCTORED"
  let state = options.status || "IN_PROGRESS"
  const envelope = (data) => ({ success: true, requestId: "neet-e2e", data })
  const currentAttempt = () => ({
    ...fixture.attempt,
    status: state,
    mode,
    hasResult: state === "SUBMITTED",
    proctorConsent:
      mode === "PROCTORED"
        ? {
            version: fixture.policy.consentVersion,
            acceptedAt: fixture.attempt.serverNow,
          }
        : null,
    serverNow: new Date().toISOString(),
  })
  await context.route("**/api/**", async (route) => {
    const request = route.request(),
      path = new URL(request.url()).pathname
    if (path.endsWith("/profile/getUserDetails"))
      return json(route, {
        success: true,
        data: {
          _id: neetIds.user,
          firstName: "Asha",
          lastName: "Rao",
          email: "asha@example.test",
          accountType: "Student",
          active: true,
          approved: true,
          deletionPending: false,
        },
        deletionPending: false,
        requiresPolicyAcceptance: false,
      })
    if (!path.includes("/project-neet/"))
      return json(route, { success: true, data: [], allCategory: [] })
    const body = request.postDataJSON() || {}
    const error = (code, message, status = 409) =>
      json(
        route,
        { success: false, error: { code, message, requestId: "neet-e2e" } },
        status
      )
    if (options.denied && path.includes("/attempts/"))
      return error("NEET_ATTEMPT_NOT_FOUND", "Attempt not found", 404)
    if (path.endsWith("/tests")) {
      const {
        instructions: _instructions,
        proctorPolicy: _policy,
        ...summary
      } = fixture.test
      return json(route, envelope({ tests: [summary] }))
    }
    if (path.endsWith(`/tests/${neetIds.test}`))
      return json(route, envelope(fixture.test))
    if (path.endsWith("/attempts")) {
      if (request.method() === "POST") {
        registered = true
        state = "REGISTERED"
        fixture.attempt.candidate = body.candidate
        return json(route, envelope(currentAttempt()), 201)
      }
      return json(
        route,
        envelope({
          attempts: registered
            ? [
                {
                  id: neetIds.attempt,
                  testId: neetIds.test,
                  testTitle: fixture.test.title,
                  attemptNumber: 1,
                  status: state,
                  mode,
                  createdAt: fixture.attempt.createdAt,
                  startedAt: fixture.attempt.startedAt,
                  expiresAt: fixture.attempt.expiresAt,
                  submittedAt:
                    state === "SUBMITTED"
                      ? fixture.result.attempt.submittedAt
                      : null,
                  score: state === "SUBMITTED" ? 4 : null,
                  maxScore: state === "SUBMITTED" ? 4 : null,
                },
              ]
            : [],
        })
      )
    }
    if (path.endsWith(`/attempts/${neetIds.attempt}`)) {
      if (request.method() === "PATCH") mode = body.mode || mode
      return json(route, envelope(currentAttempt()))
    }
    if (path.endsWith("/ready")) {
      state = "READY"
      return json(route, envelope(currentAttempt()))
    }
    if (path.endsWith("/start") || path.endsWith("/session")) {
      if (state === "SUBMITTED")
        return error("NEET_ATTEMPT_SUBMITTED", "Already submitted")
      state = "IN_PROGRESS"
      activeSession = body.sessionId
      fixture.session = {
        ...fixture.session,
        attempt: currentAttempt(),
        sessionId: activeSession,
        proctorPolicy: mode === "PROCTORED" ? fixture.policy : null,
        signalConfig: mode === "PROCTORED" ? fixture.policy.signals : null,
      }
      return json(route, envelope(fixture.session))
    }
    if (path.endsWith("/responses")) {
      if (networkDown) return route.abort("internetdisconnected")
      if (body.sessionId !== activeSession)
        return error("NEET_SESSION_SUPERSEDED", "Another session is active")
      if (state === "SUBMITTED")
        return error("NEET_ATTEMPT_SUBMITTED", "Already submitted")
      saves++
      for (const write of body.responses) {
        const old = fixture.session.responses.find(
          (r) => r.questionId === write.questionId
        )
        if (old && write.seq > old.seq) Object.assign(old, write)
      }
      fixture.session.lastSeq = Math.max(
        ...fixture.session.responses.map((r) => r.seq)
      )
      return json(
        route,
        envelope({
          responses: fixture.session.responses,
          lastSeq: fixture.session.lastSeq,
          expiresAt: fixture.attempt.expiresAt,
          serverNow: new Date().toISOString(),
        })
      )
    }
    if (path.endsWith("/heartbeat"))
      return json(
        route,
        envelope({
          status: state,
          sessionActive: body.sessionId === activeSession,
          expiresAt: fixture.attempt.expiresAt,
          serverNow: new Date().toISOString(),
          warningCount: 0,
        })
      )
    if (path.endsWith("/proctor-events"))
      return json(
        route,
        envelope({
          accepted: body.events.length,
          duplicates: 0,
          newWarnings: [],
          warningCount: 0,
          softWarningCount: 0,
          maxWarnings: 3,
          status: state,
          autoSubmitted: false,
          serverNow: new Date().toISOString(),
        })
      )
    if (path.endsWith("/submit")) {
      submitCalls++
      state = "SUBMITTED"
      fixture.result.attempt.submissionReason = body.reason
      return json(route, envelope(fixture.result))
    }
    if (path.endsWith("/result")) return json(route, envelope(fixture.result))
    return error("ROUTE_NOT_FOUND", "Not found", 404)
  })
  return {
    fixture,
    get submitCalls() {
      return submitCalls
    },
    get saves() {
      return saves
    },
    offline(value) {
      networkDown = value
    },
  }
}
const resume = async (page) => {
  await page.goto(attemptPath)
  await page.getByRole("button", { name: "Resume in this tab" }).click()
  await expect(
    page.getByRole("heading", { name: /SI unit of force/ })
  ).toBeVisible()
}

test("practice onboarding through manual submit and server result", async ({
  page,
  context,
}, testInfo) => {
  const mock = await mockNeet(context, { registered: false })
  await page.addInitScript(() => {
    window.neetMediaRequests = 0
    if (navigator.mediaDevices)
      navigator.mediaDevices.getUserMedia = async () => {
        window.neetMediaRequests++
        throw new Error("Unexpected media request")
      }
  })
  await page.goto(onboardingPath)
  await page.getByLabel("Mobile number").fill("9876543210")
  await page.screenshot({
    path: testInfo.outputPath("onboarding-details.png"),
    fullPage: true,
  })
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([])
  await page.getByRole("button", { name: "Continue", exact: true }).click()
  await page.screenshot({
    path: testInfo.outputPath("onboarding-modes.png"),
    fullPage: true,
  })
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([])
  await page.getByRole("button", { name: "Continue to instructions" }).click()
  await page.screenshot({
    path: testInfo.outputPath("onboarding-instructions.png"),
    fullPage: true,
  })
  await page.getByRole("checkbox").check()
  await page.getByRole("button", { name: "Continue to checks" }).click()
  await page.screenshot({
    path: testInfo.outputPath("system-check.png"),
    fullPage: true,
  })
  await page.getByRole("button", { name: "All set — continue" }).click()
  await page.getByRole("button", { name: "Start test", exact: true }).click()
  await page.getByRole("radio", { name: /A.*Newton/ }).check()
  await page
    .getByRole("button", { name: "Mark for review", exact: true })
    .click()
  if (testInfo.project.name === "neet-mobile") {
    await page.getByRole("button", { name: /^OMR/ }).click()
  }
  await expect(
    page.getByRole("button", {
      name: "Question 1: Answered & marked for review",
    })
  ).toBeVisible()
  if (testInfo.project.name === "neet-mobile") {
    await page
      .getByRole("dialog", { name: "Question palette" })
      .getByRole("button", { name: "Close", exact: true })
      .click()
  }
  await page.screenshot({
    path: testInfo.outputPath("exam.png"),
    fullPage: true,
  })
  const accessibility = await new AxeBuilder({ page }).analyze()
  expect(accessibility.violations).toEqual([])
  await page.getByRole("button", { name: "Submit test", exact: true }).click()
  await page.getByRole("button", { name: "Confirm submission" }).click()
  await expect(
    page.getByRole("heading", { name: "Your result", exact: true })
  ).toBeVisible()
  await expect(page.getByText("Submitted by you")).toBeVisible()
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([])
  expect(mock.submitCalls).toBe(1)
  expect(await page.evaluate(() => window.neetMediaRequests)).toBe(0)
  await page.screenshot({
    path: testInfo.outputPath("result.png"),
    fullPage: true,
  })
})
test("refresh resumes saved answers with the original deadline", async ({
  page,
  context,
}) => {
  const mock = await mockNeet(context)
  await resume(page)
  await page.getByRole("radio", { name: /B.*Joule/ }).check()
  await expect(page.getByText("All answers saved")).toBeVisible()
  const original = mock.fixture.attempt.expiresAt
  await page.reload()
  await page.getByRole("button", { name: "Resume in this tab" }).click()
  await expect(page.getByRole("radio", { name: /B.*Joule/ })).toBeChecked()
  expect(mock.fixture.attempt.expiresAt).toBe(original)
})
test("temporary network interruption retries pending answers", async ({
  page,
  context,
}) => {
  const mock = await mockNeet(context)
  await resume(page)
  mock.offline(true)
  await context.setOffline(true)
  await page.getByRole("radio", { name: /C.*Watt/ }).check()
  await expect(page.getByText("You’re offline.")).toBeVisible()
  mock.offline(false)
  await context.setOffline(false)
  await expect(page.getByText("All answers saved")).toBeVisible()
  expect(mock.fixture.session.responses[0].selectedOption).toBe("C")
})
test("timer expiry submits automatically", async ({ page, context }) => {
  const mock = await mockNeet(context, { duration: 3 })
  await resume(page)
  await expect(
    page.getByRole("heading", { name: "Your result", exact: true })
  ).toBeVisible({ timeout: 10000 })
  await expect(page.getByText("Submitted when time ran out")).toBeVisible()
  expect(mock.submitCalls).toBe(1)
})
test("duplicate tabs have explicit takeover and old tab locks", async ({
  page,
  context,
}) => {
  await mockNeet(context)
  await resume(page)
  const second = await context.newPage()
  await resume(second)
  await expect(
    page.getByRole("heading", {
      name: "This exam is open in another tab or window.",
    })
  ).toBeVisible()
  await expect(page.getByRole("radio", { name: /A.*Newton/ })).toBeDisabled()
  await expect(second.getByRole("radio", { name: /A.*Newton/ })).toBeEnabled()
  await second.close()
})
test("already submitted direct exam URL redirects to its result without resubmitting", async ({
  page,
  context,
}) => {
  const mock = await mockNeet(context, { status: "SUBMITTED" })
  await page.goto(attemptPath)
  await expect(
    page.getByRole("heading", { name: "Your result", exact: true })
  ).toBeVisible()
  expect(mock.submitCalls).toBe(0)
})
test("ownership denial exposes no questions or result", async ({
  page,
  context,
}) => {
  await mockNeet(context, { denied: true })
  await page.goto(attemptPath)
  await expect(page.getByRole("alert")).toContainText("Attempt not found")
  await expect(page.getByRole("radio")).toHaveCount(0)
  await page.goto(`${attemptPath}/result`)
  await expect(page.getByRole("alert")).toContainText(
    "couldn't find this attempt"
  )
  await expect(page.getByRole("table")).toHaveCount(0)
})
test("landing keeps CTA and SVG fallback without WebGL and with reduced motion", async ({
  page,
  context,
}, testInfo) => {
  await mockNeet(context)
  await page.addInitScript(() => {
    const getContext = HTMLCanvasElement.prototype.getContext
    HTMLCanvasElement.prototype.getContext = function (type, ...args) {
      return type.startsWith("webgl")
        ? null
        : getContext.call(this, type, ...args)
    }
  })
  const scripts = []
  page.on("request", (request) => {
    if (request.resourceType() === "script") scripts.push(request.url())
  })
  await page.goto("/project-neet")
  await expect(page.getByRole("link", { name: "Start a Mock" })).toBeVisible()
  await expect(page.getByRole("link", { name: "Explore Tests" })).toBeVisible()
  await expect(
    page.getByRole("heading", { name: "Pick today's sitting." })
  ).toBeVisible()
  await expect(page.locator("[data-hero-mode=static]")).toBeVisible()
  expect(scripts.some((url) => url.includes("helixScene"))).toBe(false)
  await page.screenshot({
    path: testInfo.outputPath("landing.png"),
    fullPage: true,
  })
})
test("proctored checks require consent, recover denied permission, and start monitoring", async ({
  page,
  context,
  browserName,
}, testInfo) => {
  test.skip(
    browserName !== "chromium" || testInfo.project.name === "neet-mobile",
    "Desktop Chromium fake devices; real device permissions require live verification"
  )
  await mockNeet(context, { registered: false })
  await page.addInitScript(() => {
    window.neetMediaRequests = 0
    window.neetDenied = true
    navigator.mediaDevices.getUserMedia = async (constraints) => {
      window.neetMediaRequests++
      if (window.neetDenied) throw new DOMException("Denied", "NotAllowedError")
      if (constraints.video) {
        const canvas = document.createElement("canvas")
        canvas.width = 64
        canvas.height = 64
        const c = canvas.getContext("2d")
        c.fillStyle = "white"
        c.fillRect(0, 0, 64, 64)
        return canvas.captureStream(1)
      }
      const audio = new AudioContext()
      return audio.createMediaStreamDestination().stream
    }
  })
  await page.goto(onboardingPath)
  await page.getByLabel("Mobile number").fill("9876543210")
  await page.getByRole("button", { name: "Continue", exact: true }).click()
  await page.getByRole("radio", { name: /Proctored mode/ }).check()
  await page.getByRole("button", { name: "Continue to instructions" }).click()
  await page.getByRole("checkbox").check()
  await page.getByRole("button", { name: "Continue to checks" }).click()
  expect(await page.evaluate(() => window.neetMediaRequests)).toBe(0)
  await expect(
    page.getByRole("button", { name: "I consent — check my devices" })
  ).toBeDisabled()
  await page.getByRole("checkbox").check()
  await page
    .getByRole("button", { name: "I consent — check my devices" })
    .click()
  expect(await page.evaluate(() => window.neetMediaRequests)).toBe(0)
  await page.getByRole("button", { name: "Allow camera" }).click()
  await expect(page.getByText(/Permission blocked/)).toBeVisible()
  await page.evaluate(() => {
    window.neetDenied = false
  })
  await page.getByRole("button", { name: "Allow access" }).click()
  await page.getByRole("button", { name: "Allow microphone" }).click()
  await page.getByRole("button", { name: "All set — continue" }).click()
  await page.getByRole("button", { name: "Start test", exact: true }).click()
  await expect(
    page.getByRole("status", { name: /Proctored mode/ })
  ).toBeVisible()
  await expect(
    page.getByRole("heading", { name: /SI unit of force/ })
  ).toBeVisible()
})

test("duplicate confirmation does not create a second submission", async ({
  page,
  context,
}) => {
  const mock = await mockNeet(context)
  await resume(page)
  await page.getByRole("button", { name: "Submit test", exact: true }).click()
  await page.getByRole("button", { name: "Confirm submission" }).dblclick()
  await expect(
    page.getByRole("heading", { name: "Your result", exact: true })
  ).toBeVisible()
  expect(mock.submitCalls).toBe(1)
})

test("normal StudyNotion entry remains separate from NEET heavy scripts", async ({
  page,
  context,
}) => {
  await mockNeet(context)
  const scripts = []
  page.on("request", (request) => {
    if (request.resourceType() === "script") scripts.push(request.url())
  })
  await page.goto("/")
  await expect(
    page.getByRole("heading", {
      name: "Build your skills. Shape your future.",
    })
  ).toBeVisible()
  expect(
    scripts.some((url) => /helixScene|neet-landing|neet-exam/.test(url))
  ).toBe(false)
  await page
    .getByRole("contentinfo")
    .getByRole("link", { name: "Project NEET", exact: true })
    .click()
  await expect(page.getByRole("link", { name: "Start a Mock" })).toBeVisible()
})
