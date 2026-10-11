import { expect, test } from "@playwright/test"
import mongoose from "mongoose"

// Real end-to-end NEET flows against a disposable stack (see
// scripts/run-neet-e2e-real.mjs). Nothing is intercepted: every request goes
// to the real API and a real replica-set MongoDB.

const seed = JSON.parse(process.env.NEET_REAL_SEED || "{}")
const password = process.env.NEET_REAL_PASSWORD
const testBySlug = (slug) => seed.tests.find((test) => test.slug === slug)
const OPTION_KEYS = ["A", "B", "C", "D"]

let client
test.beforeAll(async () => {
  client = new mongoose.mongo.MongoClient(process.env.NEET_REAL_MONGODB_URI)
  await client.connect()
})
test.afterAll(async () => {
  await client?.close()
})
const db = () => client.db()

const signIn = async (page, student, destination) => {
  await page.goto(destination)
  await expect(page).toHaveURL(/\/login$/)
  await page.getByLabel("Email address").fill(student.email)
  await page.getByLabel("Password", { exact: true }).fill(password)
  await page.getByRole("button", { name: "Sign In" }).click()
  await expect(page).toHaveURL(new RegExp(`${destination}$`))
}

const startPractice = async (page) => {
  await expect(page.getByLabel("Full name")).not.toHaveValue("")
  await page.getByRole("button", { name: "Continue", exact: true }).click()
  await page.getByRole("button", { name: "Continue to instructions" }).click()
  await page.getByRole("checkbox").check()
  await page.getByRole("button", { name: "Continue to checks" }).click()
  await page.getByRole("button", { name: "All set — continue" }).click()
  await page.getByRole("button", { name: "Start test", exact: true }).click()
  await expect(page).toHaveURL(/\/neet\/attempts\/[0-9a-f]{24}$/)
  return page.url().split("/").at(-1)
}

// Selects option `key` of the current question and moves on.
const answer = async (page, key) => {
  await page.getByRole("radio").nth(OPTION_KEYS.indexOf(key)).check()
  await page.getByRole("button", { name: "Save & next" }).click()
}

const waitSaved = (page) =>
  expect(page.getByText("All answers saved", { exact: true })).toBeVisible({
    timeout: 20_000,
  })

// Independent expectation from the stored answer key: +4 correct, -1
// incorrect, 0 unanswered; DROPPED awards +4; ALL_CORRECT awards attempts.
const expectedScore = async (attemptId, chosen) => {
  const attempt = await db()
    .collection("neetattempts")
    .findOne({ _id: new mongoose.Types.ObjectId(attemptId) })
  const key = await db()
    .collection("neetanswerkeyversions")
    .find({ paperVersionId: attempt.paperVersionId })
    .sort({ version: -1 })
    .limit(1)
    .next()
  const keys = new Map(
    key.keys.map((entry) => [String(entry.questionId), entry])
  )
  let score = 0
  attempt.paper.questions.forEach((question) => {
    const entry = keys.get(String(question.questionId))
    const selected = chosen.get(question.number) || null
    if (entry.status === "DROPPED") score += question.marks.correct
    else if (!selected) score += question.marks.unanswered || 0
    else if (
      entry.status === "ALL_CORRECT" ||
      entry.correctOptionKeys.includes(selected)
    )
      score += question.marks.correct
    else score += question.marks.incorrect
  })
  return { attempt, score }
}

test("full NEET practice: sign in, answer, refresh restores, offline sync, submit, server-correct score", async ({
  page,
  context,
}) => {
  const full = testBySlug("full-length-neet-style-mock-01")
  const destination = `/neet/mocks/${full.id}/start`
  await signIn(page, seed.students[0], destination)
  const attemptId = await startPractice(page)
  await expect(
    page.getByRole("button", { name: "Question 1: Not answered" })
  ).toBeVisible()

  const chosen = new Map()
  for (let number = 1; number <= 5; number += 1) {
    const key = OPTION_KEYS[number % 4]
    await answer(page, key)
    chosen.set(number, key)
  }
  await waitSaved(page)

  // Refresh: the deadline is unchanged, answers are restored, and the same
  // tab keeps its session (no takeover is recorded).
  const before = await db()
    .collection("neetattempts")
    .findOne({ _id: new mongoose.Types.ObjectId(attemptId) })
  await page.reload()
  await page.getByRole("button", { name: "Resume in this tab" }).click()
  for (let number = 1; number <= 5; number += 1) {
    await expect(
      page.getByRole("button", { name: `Question ${number}: Answered` })
    ).toBeVisible()
  }
  const afterRefresh = await db()
    .collection("neetattempts")
    .findOne({ _id: new mongoose.Types.ObjectId(attemptId) })
  expect(afterRefresh.expiresAt.getTime()).toBe(before.expiresAt.getTime())
  expect(afterRefresh.sessionClaims).toBe(before.sessionClaims)
  expect(afterRefresh.activeSessionId).toBe(before.activeSessionId)

  // Offline: the answer is kept on the device and syncs after reconnecting.
  // "Save & next" already moved to question 6 (visited, not answered).
  await page.getByRole("button", { name: /^Question 6:/ }).click()
  await context.setOffline(true)
  await page.getByRole("radio").nth(2).check()
  chosen.set(6, "C")
  await expect(
    page.getByText(/Answers waiting for connection|Waiting to save/).first()
  ).toBeVisible()
  await context.setOffline(false)
  await waitSaved(page)
  const synced = await db()
    .collection("neetattempts")
    .findOne({ _id: new mongoose.Types.ObjectId(attemptId) })
  const sixth = synced.paper.questions.find((question) => question.number === 6)
  expect(
    synced.responses.find(
      (response) => String(response.questionId) === String(sixth.questionId)
    ).selectedOption
  ).toBe("C")

  await page.getByRole("button", { name: "Submit test", exact: true }).click()
  await page.getByRole("button", { name: "Confirm submission" }).click()
  await expect(
    page.getByRole("heading", { name: "Your result", exact: true })
  ).toBeVisible()
  await expect(page).toHaveURL(
    new RegExp(`/neet/attempts/${attemptId}/result$`)
  )

  const { attempt, score } = await expectedScore(attemptId, chosen)
  expect(attempt.status).toBe("SUBMITTED")
  expect(attempt.result.summary.attempted).toBe(6)
  expect(attempt.result.summary.score).toBe(score)
  await expect(page.getByText("of 720 marks").locator("..")).toContainText(
    String(score)
  )
})

for (const [index, slug, sections] of [
  [1, "physics-sprint-60", ["Physics"]],
  [2, "chemistry-sprint-60", ["Chemistry"]],
  [3, "biology-sprint-60", ["Biology · Botany", "Biology · Zoology"]],
]) {
  test(`${slug}: 45 questions, 60 minutes, start and submit with a server-correct score`, async ({
    page,
  }) => {
    const sprint = testBySlug(slug)
    expect(sprint.durationSeconds).toBe(3600)
    const destination = `/neet/mocks/${sprint.id}/start`
    await signIn(page, seed.students[index], destination)
    const attemptId = await startPractice(page)
    await answer(page, "A")
    await answer(page, "B")
    await waitSaved(page)
    await page.getByRole("button", { name: "Submit test", exact: true }).click()
    await page.getByRole("button", { name: "Confirm submission" }).click()
    await expect(
      page.getByRole("heading", { name: "Your result", exact: true })
    ).toBeVisible()
    const { attempt, score } = await expectedScore(
      attemptId,
      new Map([
        [1, "A"],
        [2, "B"],
      ])
    )
    expect(attempt.paper.questions).toHaveLength(45)
    expect(attempt.testSnapshot.durationSeconds).toBe(3600)
    expect(attempt.result.summary.maxScore).toBe(180)
    expect(attempt.result.summary.score).toBe(score)
    await expect(page.getByText("of 180 marks").locator("..")).toContainText(
      String(score)
    )
    for (const section of sections) {
      await expect(
        page.getByRole("heading", { name: section, level: 3, exact: true })
      ).toBeVisible()
    }
  })
}

test.describe("monitored mode", () => {
  // Fake camera/microphone flags are set on the project (config).
  test.use({ permissions: ["camera", "microphone"] })

  test("adults-only declaration is recorded, monitoring starts, and nothing submits the exam", async ({
    page,
  }) => {
    // Headless Chromium's fake audio capture hangs on this platform even for
    // a plain { audio: true } request, so only the microphone DEVICE is
    // replaced by a synthetic audio track. Network requests stay real.
    await page.addInitScript(() => {
      const original = navigator.mediaDevices.getUserMedia.bind(
        navigator.mediaDevices
      )
      navigator.mediaDevices.getUserMedia = async (constraints) =>
        constraints?.audio && !constraints?.video
          ? new AudioContext().createMediaStreamDestination().stream
          : original(constraints)
    })
    const mini = testBySlug("pulse-check-mini-mock")
    const destination = `/neet/mocks/${mini.id}/start`
    await signIn(page, seed.students[4], destination)
    await expect(page.getByLabel("Full name")).not.toHaveValue("")
    await page.getByRole("button", { name: "Continue", exact: true }).click()
    await page.getByRole("radio", { name: /Monitored mode/ }).check()
    await page.getByRole("button", { name: "Continue to instructions" }).click()
    await page.getByRole("checkbox").check()
    await page.getByRole("button", { name: "Continue to checks" }).click()
    await page.getByLabel(/I understand what is monitored and stored/).check()
    const consent = page.getByRole("button", {
      name: "I consent — check my devices",
    })
    await expect(consent).toBeDisabled()
    await page.getByLabel("I confirm I am 18 years of age or older.").check()
    await consent.click()
    await page.getByRole("button", { name: "Allow camera" }).click()
    await page.getByRole("button", { name: "Allow microphone" }).click()
    await page.getByRole("button", { name: "All set — continue" }).click()
    await page.getByRole("button", { name: "Start test", exact: true }).click()
    await expect(page).toHaveURL(/\/neet\/attempts\/[0-9a-f]{24}$/)
    const attemptId = page.url().split("/").at(-1)
    await expect(
      page.getByRole("status", { name: /Monitored mode/ })
    ).toBeVisible()

    const stored = await db()
      .collection("neetattempts")
      .findOne({ _id: new mongoose.Types.ObjectId(attemptId) })
    expect(stored.mode).toBe("PROCTORED")
    expect(stored.proctorConsent.adultDeclaredAt).toBeInstanceOf(Date)
    expect(stored.proctoring.policy.autoSubmit.enabled).toBe(false)
    expect(stored.candidate).toEqual({ fullName: expect.any(String) })

    await answer(page, "B")
    await waitSaved(page)
    await page.getByRole("button", { name: "Submit test", exact: true }).click()
    await page.getByRole("button", { name: "Confirm submission" }).click()
    await expect(
      page.getByRole("heading", { name: "Your result", exact: true })
    ).toBeVisible()
    const final = await db()
      .collection("neetattempts")
      .findOne({ _id: new mongoose.Types.ObjectId(attemptId) })
    expect(final.status).toBe("SUBMITTED")
    expect(final.submissionReason).toBe("MANUAL_SUBMIT")
  })
})

test("earlier /project-neet links redirect to /neet", async ({ page }) => {
  await page.goto("/project-neet/mocks")
  await expect(page).toHaveURL(/\/neet\/mocks$/)
})
