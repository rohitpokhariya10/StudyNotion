import { mkdir } from "node:fs/promises"
import AxeBuilder from "@axe-core/playwright"
import { expect, test } from "@playwright/test"

const screenshotDirectory = "docs/audits/screenshots/live"

const capture = async (page, testInfo, state) => {
  await mkdir(screenshotDirectory, { recursive: true })
  const viewport = testInfo.project.name.replace("live-", "")
  await page.screenshot({
    path: `${screenshotDirectory}/${state}-${viewport}.png`,
    fullPage: true,
    animations: "disabled",
  })
}

const login = async (page, { email, password, destination }) => {
  await page.goto(destination)
  await expect(page).toHaveURL(/\/login$/)
  await page.getByLabel(/Email Address/i).fill(email)
  await page.getByLabel(/^Password/i).fill(password)
  await page.getByRole("button", { name: "Sign In" }).click()
  await expect(page).toHaveURL(destination)
}

test("live public home, catalog, and course detail are connected", async ({
  page,
}, testInfo) => {
  await page.goto("/")
  await expect(page.getByText(/Empower Your Future with/)).toBeVisible()
  await capture(page, testInfo, "home")

  await page.goto("/catalog/web-development")
  await expect(
    page.getByRole("heading", { name: "Web Development", level: 1 })
  ).toBeVisible()
  const courseLink = page
    .getByRole("link", { name: /View .* course details/ })
    .first()
  await expect(courseLink).toBeVisible()

  const accessibility = await new AxeBuilder({ page }).include("main").analyze()
  expect(accessibility.violations).toEqual([])
  await capture(page, testInfo, "catalog-seeded")

  await courseLink.click()
  await expect(page).toHaveURL(/\/courses\/[a-f0-9]{24}$/)
  await expect(page.getByText("What you'll learn")).toBeVisible()
  await capture(page, testInfo, "course-detail-seeded")
})

test("live student session returns to enrollment and opens protected playback", async ({
  page,
}, testInfo) => {
  await login(page, {
    email: "student@studynotion.local",
    password: "Student@123",
    destination: "/dashboard/enrolled-courses",
  })

  await expect(
    page.getByRole("heading", { name: "Enrolled Courses", level: 1 })
  ).toBeVisible()
  const continueCourse = page
    .getByRole("button", { name: /Continue Foundations of Web Development/ })
    .first()
  await expect(continueCourse).toBeVisible()
  await capture(page, testInfo, "student-enrollments")

  await continueCourse.click()
  await expect(page).toHaveURL(/\/view-course\//)
  await expect(
    page.getByRole("heading", {
      name: "Foundations of Web Development Overview",
    })
  ).toBeVisible()
  await expect(page.locator("video")).toHaveCount(1)
  await capture(page, testInfo, "student-protected-playback")

  await page.goto("/dashboard/instructor-approvals")
  await expect(page).not.toHaveURL(/instructor-approvals/)
})

test("live instructor workspace loads owned course data", async ({
  page,
}, testInfo) => {
  await login(page, {
    email: "instructor@studynotion.local",
    password: "Instructor@123",
    destination: "/dashboard/instructor",
  })
  await expect(page.getByText(/Hi Instructor/)).toBeVisible()
  await expect(page.getByText("Total Courses")).toBeVisible()
  await capture(page, testInfo, "instructor-dashboard")
})

test("live admin workspaces expose empty operational queues", async ({
  page,
}, testInfo) => {
  await login(page, {
    email: "admin@studynotion.local",
    password: "Admin@123",
    destination: "/dashboard/instructor-approvals",
  })
  await expect(
    page.getByRole("heading", { name: "Instructor approvals" })
  ).toBeVisible()
  await expect(
    page.getByText("No instructor applications are waiting.")
  ).toBeVisible()
  await capture(page, testInfo, "admin-instructor-approvals")

  await page.goto("/dashboard/payment-reconciliation")
  await expect(
    page.getByRole("heading", { name: "Payment reconciliation" })
  ).toBeVisible()
  await expect(page.getByText("Reconciliation queue is clear.")).toBeVisible()
  await capture(page, testInfo, "admin-payment-reconciliation")
})
