import AxeBuilder from "@axe-core/playwright"
import { expect, test } from "@playwright/test"

const ids = {
  course: "507f1f77bcf86cd799439011",
  lessonOne: "507f1f77bcf86cd799439012",
  lessonTwo: "507f1f77bcf86cd799439013",
  lessonThree: "507f1f77bcf86cd799439014",
  sectionOne: "507f1f77bcf86cd799439015",
  sectionTwo: "507f1f77bcf86cd799439016",
  user: "507f191e810c19729de860ea",
}
const thumbnail =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='1280' height='720'%3E%3Crect width='1280' height='720' fill='%230c1626'/%3E%3Cpath d='M520 280h240v160H520z' fill='%23facc15'/%3E%3C/svg%3E"
const captureScreenshots = process.env.CAPTURE_LEARNING_SCREENSHOTS === "1"

const json = (route, body, status = 200) =>
  route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify(body),
  })

const progress = (completedLessonIds) => ({
  courseId: ids.course,
  completedLessonIds,
  completedCount: completedLessonIds.length,
  totalLessons: 3,
  progressPercent: Math.round((completedLessonIds.length / 3) * 10_000) / 100,
  updatedAt: "2026-08-08T12:00:00.000Z",
})

const learningState = (completedLessonIds = [ids.lessonOne]) => ({
  success: true,
  requestId: "learning-e2e-state",
  data: {
    course: {
      id: ids.course,
      name: "Secure Production Learning",
      thumbnailUrl: thumbnail,
    },
    curriculum: [
      {
        id: ids.sectionOne,
        name: "Foundations",
        lessons: [
          {
            id: ids.lessonOne,
            title: "Request boundaries",
            description: "Validate every external input.",
            durationSeconds: 120,
          },
          {
            id: ids.lessonTwo,
            title: "Resource authorization",
            description: "Authorize the requested course and lesson.",
            durationSeconds: 180,
          },
        ],
      },
      {
        id: ids.sectionTwo,
        name: "Reliability",
        lessons: [
          {
            id: ids.lessonThree,
            title: "Idempotent writes",
            description: "Make completion retries safe.",
            durationSeconds: 150,
          },
        ],
      },
    ],
    progress: progress(completedLessonIds),
  },
})

const emptyLearningState = {
  success: true,
  requestId: "learning-e2e-empty",
  data: {
    course: {
      id: ids.course,
      name: "Course awaiting lessons",
      thumbnailUrl: thumbnail,
    },
    curriculum: [],
    progress: {
      courseId: ids.course,
      completedLessonIds: [],
      completedCount: 0,
      totalLessons: 0,
      progressPercent: 0,
      updatedAt: null,
    },
  },
}

const coursePath = `/view-course/${ids.course}/section/${ids.sectionOne}/sub-section/${ids.lessonTwo}`

const capture = async (page, testInfo, state) => {
  if (!captureScreenshots) return
  const viewport = testInfo.project.name.replace("catalog-", "")
  await page.screenshot({
    path: `docs/audits/screenshots/learning/${state}-${viewport}.png`,
    fullPage: true,
    animations: "disabled",
  })
}

const mockAuthenticatedSession = async (page) => {
  await page.route("**/api/v1/profile/getUserDetails", (route) =>
    json(route, {
      success: true,
      data: {
        _id: ids.user,
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
  )
}

const mockPlayback = async (page) => {
  await page.route("**/api/v1/course/getLessonPlaybackUrl", (route) =>
    json(route, {
      success: true,
      data: {
        subSectionId: ids.lessonTwo,
        url: "https://media.example.test/lesson.mp4",
        expiresAt: "2026-08-08T13:00:00.000Z",
      },
    })
  )
  await page.route("https://media.example.test/lesson.mp4", (route) =>
    route.fulfill({
      status: 200,
      contentType: "video/mp4",
      path: "src/assets/Images/banner.mp4",
    })
  )
}

test.beforeEach(async ({ page }) => {
  await mockAuthenticatedSession(page)
  await mockPlayback(page)
})

test("learner navigates the curriculum and saves canonical progress", async ({
  page,
}, testInfo) => {
  const completed = new Set([ids.lessonOne])
  let completionRequests = 0

  await page.route(`**/api/v2/learning/courses/${ids.course}`, (route) =>
    json(route, learningState([...completed]))
  )
  await page.route(
    `**/api/v2/learning/courses/${ids.course}/lessons/${ids.lessonTwo}/progress`,
    (route) => {
      completionRequests += 1
      completed.add(ids.lessonTwo)
      return json(route, {
        success: true,
        requestId: `learning-e2e-progress-${completionRequests}`,
        data: progress([...completed]),
      })
    }
  )

  await page.goto(coursePath)

  await expect(
    page.getByRole("heading", { name: "Resource authorization", level: 1 })
  ).toBeVisible()
  const mobile = testInfo.project.name === "catalog-mobile"
  const contentButton = page.getByRole("button", { name: "Course content" })
  if (mobile) {
    await contentButton.click()
    await expect(
      page.getByRole("link", { name: "Back to enrolled courses" })
    ).toBeFocused()
  }
  const contentRegion = mobile
    ? page.getByRole("dialog", { name: "Course content" })
    : page.getByRole("complementary", { name: "Course content" })

  await expect(
    contentRegion.getByText("1 of 3 lessons completed")
  ).toBeVisible()
  await expect(contentRegion.getByText("33.33%", { exact: true })).toBeVisible()

  const foundations = contentRegion.getByRole("button", {
    name: /Foundations/,
  })
  await foundations.focus()
  await foundations.press("Enter")
  await expect(foundations).toHaveAttribute("aria-expanded", "false")
  await foundations.press("Space")
  await expect(foundations).toHaveAttribute("aria-expanded", "true")

  const currentLesson = contentRegion.getByRole("link", {
    name: /Resource authorization Not completed/,
  })
  await expect(currentLesson).toHaveAttribute("aria-current", "page")
  if (mobile) {
    await expect(
      page.getByRole("dialog", { name: "Course content" })
    ).toBeVisible()
    await capture(page, testInfo, "mobile-drawer")
    await page.keyboard.press("Escape")
    await expect(contentButton).toBeFocused()
  } else {
    await capture(page, testInfo, "populated-current")
  }

  await expect(page.locator("video")).toBeAttached()

  await page.locator("video").dispatchEvent("ended")
  await page.getByRole("button", { name: "Mark lesson complete" }).click()

  await expect(page.getByText("Lesson marked complete.")).toBeVisible()
  expect(completionRequests).toBe(1)
  if (mobile) await contentButton.click()
  await expect(
    contentRegion.getByText("2 of 3 lessons completed")
  ).toBeVisible()
  await expect(contentRegion.getByText("66.67%", { exact: true })).toBeVisible()
  await capture(page, testInfo, "completed-progress")
  if (mobile) {
    await page.keyboard.press("Escape")
    await expect(contentButton).toBeFocused()
  }

  await expect(
    page.getByRole("link", { name: "Previous lesson" })
  ).toBeVisible()
  await expect(page.getByRole("link", { name: "Next lesson" })).toBeVisible()

  // Caption metadata does not exist in the current lesson model; all other
  // critical player rules remain enabled and captions are tracked as debt.
  const accessibility = await new AxeBuilder({ page })
    .include("main")
    .disableRules(["video-caption"])
    .analyze()
  expect(accessibility.violations).toEqual([])
})

test("learning exposes loading, retryable failure, and access-denied states", async ({
  page,
}, testInfo) => {
  let attempts = 0
  await page.route(
    `**/api/v2/learning/courses/${ids.course}`,
    async (route) => {
      attempts += 1
      if (attempts === 1) {
        await new Promise((resolve) => setTimeout(resolve, 700))
        return json(
          route,
          {
            error: {
              code: "LEARNING_UNAVAILABLE",
              message: "Learning is temporarily unavailable.",
              requestId: "learning-e2e-error",
            },
          },
          500
        )
      }
      return json(route, learningState())
    }
  )

  await page.goto(coursePath)
  await expect(
    page.getByRole("status", { name: "Loading course learning state" })
  ).toBeVisible()
  await capture(page, testInfo, "loading")

  await expect(
    page.getByRole("heading", { name: "This course could not be loaded." })
  ).toBeVisible()
  await expect(page.getByText("Reference: learning-e2e-error")).toBeVisible()
  await capture(page, testInfo, "api-error")

  await page.getByRole("button", { name: "Try again" }).click()
  await expect(
    page.getByRole("heading", { name: "Resource authorization", level: 1 })
  ).toBeVisible()

  await page.unroute(`**/api/v2/learning/courses/${ids.course}`)
  await page.route(`**/api/v2/learning/courses/${ids.course}`, (route) =>
    json(
      route,
      {
        error: {
          code: "LEARNING_ACCESS_DENIED",
          message: "You are not enrolled in this course",
          requestId: "learning-e2e-denied",
        },
      },
      403
    )
  )
  await page.goto(`${coursePath}?access=denied`)
  await expect(
    page.getByRole("heading", {
      name: "This course is not available to this account.",
    })
  ).toBeVisible()
  await expect(page.getByText("Reference: learning-e2e-denied")).toBeVisible()
  await capture(page, testInfo, "access-denied")
})

test("learning has a clear empty-curriculum state", async ({
  page,
}, testInfo) => {
  await page.route(`**/api/v2/learning/courses/${ids.course}`, (route) =>
    json(route, emptyLearningState)
  )

  await page.goto(coursePath)

  await expect(
    page.getByRole("heading", { name: "Lessons are being prepared." })
  ).toBeVisible()
  if (testInfo.project.name === "catalog-mobile") {
    await page.getByRole("button", { name: "Course content" }).click()
  }
  const contentRegion =
    testInfo.project.name === "catalog-mobile"
      ? page.getByRole("dialog", { name: "Course content" })
      : page.getByRole("complementary", { name: "Course content" })
  await expect(
    contentRegion.getByText("0 of 0 lessons completed")
  ).toBeVisible()
  await expect(
    contentRegion.getByRole("progressbar", { name: "0% complete" })
  ).toBeVisible()
  await capture(page, testInfo, "empty-curriculum")
})
