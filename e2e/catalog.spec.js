import AxeBuilder from "@axe-core/playwright"
import { expect, test } from "@playwright/test"

const categoryId = "507f1f77bcf86cd799439012"
const firstCourseId = "507f1f77bcf86cd799439011"
const secondCourseId = "507f1f77bcf86cd799439013"
const requestCounters = new WeakMap()
const thumbnail =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='640' height='360'%3E%3Crect width='640' height='360' fill='%231b2738'/%3E%3C/svg%3E"
const captureScreenshots = process.env.CAPTURE_CATALOG_SCREENSHOTS === "1"

const course = (id, name) => ({
  id,
  name,
  description: "A focused course built around practical production decisions.",
  thumbnailUrl: thumbnail,
  price: 1499,
  currency: "INR",
  instructor: {
    id: "507f191e810c19729de860ea",
    name: "Asha Rao",
    imageUrl: null,
  },
  category: { id: categoryId, name: "Web Development" },
  rating: { average: 4.7, count: 18 },
  durationSeconds: 10800,
  level: "intermediate",
  language: "en",
  enrollmentCount: 245,
  createdAt: "2026-07-20T10:00:00.000Z",
})

const json = (route, body, status = 200) =>
  route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify(body),
  })

const capture = async (page, testInfo, state) => {
  if (!captureScreenshots) return
  const viewport = testInfo.project.name.replace("catalog-", "")
  await page.screenshot({
    path: `docs/audits/screenshots/catalog/${state}-${viewport}.png`,
    fullPage: true,
    animations: "disabled",
  })
}

async function mockCatalogJourney(page, counters) {
  await page.route("**/api/v1/profile/getUserDetails", (route) =>
    json(route, { success: false, message: "Authentication required" }, 401)
  )
  await page.route("**/api/v1/course/showAllCategories", (route) => {
    counters.categoryRequests += 1
    return json(route, {
      success: true,
      data: [
        {
          _id: categoryId,
          name: "Web Development",
          description: "Learn to build useful web products.",
          publishedCourseCount: 2,
        },
      ],
    })
  })
  await page.route("**/api/v2/courses**", (route) => {
    const url = new URL(route.request().url())
    const q = url.searchParams.get("q")
    const cursor = url.searchParams.get("cursor")

    if (q === "no-match") {
      return json(route, {
        success: true,
        requestId: "catalog-no-results",
        data: {
          items: [],
          pageInfo: { endCursor: null, hasNextPage: false },
        },
      })
    }
    if (cursor === "next_page") {
      return json(route, {
        success: true,
        requestId: "catalog-page-2",
        data: {
          items: [course(secondCourseId, "Reliable Node APIs")],
          pageInfo: { endCursor: null, hasNextPage: false },
        },
      })
    }

    return json(route, {
      success: true,
      requestId: "catalog-page-1",
      data: {
        items: [course(firstCourseId, "Production React")],
        pageInfo: { endCursor: "next_page", hasNextPage: true },
      },
    })
  })
  await page.route("**/api/v1/course/getCourseDetails", (route) =>
    json(route, {
      success: true,
      data: {
        courseDetails: {
          _id: firstCourseId,
          courseName: "Production React",
          courseDescription: "Build resilient React applications.",
          thumbnail,
          price: 1499,
          whatYouWillLearn: "Design and ship maintainable React features.",
          courseContent: [],
          ratingAndReviews: [],
          instructor: {
            firstName: "Asha",
            lastName: "Rao",
            image: thumbnail,
            additionalDetails: { about: "Production-focused instructor." },
          },
          instructions: ["Lifetime access"],
          totalStudentsEnrolled: 245,
          createdAt: "2026-07-20T10:00:00.000Z",
        },
        totalDuration: "3h",
      },
    })
  )
  await page.route("**/api/v1/payment/config", (route) =>
    json(route, {
      success: true,
      data: {
        termsVersion: "2026-07",
        refundPolicyVersion: "2026-07",
        refundWindowDays: 7,
        checkoutTtlSeconds: 900,
      },
    })
  )
}

test.beforeEach(async ({ page }) => {
  const counters = { categoryRequests: 0 }
  requestCounters.set(page, counters)
  await mockCatalogJourney(page, counters)
})

test("catalog reaches the existing public course-detail route", async ({
  page,
}, testInfo) => {
  await page.goto("/catalog/web-development")

  await expect(
    page.getByRole("heading", { name: "Web Development", level: 1 })
  ).toBeVisible()
  expect(requestCounters.get(page).categoryRequests).toBe(1)
  const courseLink = page.getByRole("link", {
    name: "View Production React course details",
  })
  await expect(courseLink).toBeVisible()
  await courseLink.focus()
  await expect(courseLink).toBeFocused()
  await expect
    .poll(() =>
      courseLink
        .locator("xpath=..")
        .evaluate((element) => window.getComputedStyle(element).borderColor)
    )
    .toContain("14, 116, 144")

  const accessibility = await new AxeBuilder({ page }).include("main").analyze()
  expect(accessibility.violations).toEqual([])

  await capture(page, testInfo, "populated-focus")

  await courseLink.click()

  await expect(page).toHaveURL(`/courses/${firstCourseId}`)
  await expect(
    page.getByText("Production React", { exact: true }).first()
  ).toBeVisible()
  await capture(page, testInfo, "course-detail-destination")
})

test("catalog retains cards while loading the next cursor page", async ({
  page,
}, testInfo) => {
  await page.goto("/catalog/web-development")

  await page.getByRole("button", { name: "Load more courses" }).click()

  await expect(page.getByText("Production React")).toBeVisible()
  await expect(page.getByText("Reliable Node APIs")).toBeVisible()
  await expect(
    page.getByText("You’ve reached the end of this category.")
  ).toBeVisible()
  await capture(page, testInfo, "pagination-end")
})

test("catalog search has a recoverable no-results state", async ({
  page,
}, testInfo) => {
  await page.goto("/catalog/web-development")

  await page.getByRole("searchbox", { name: "Search courses" }).fill("no-match")
  await page.getByRole("button", { name: "Search" }).click()

  await expect(page).toHaveURL(/q=no-match/)
  await expect(
    page.getByRole("heading", { name: "No courses match these filters" })
  ).toBeVisible()
  await capture(page, testInfo, "no-results")

  await page.getByRole("button", { name: "Clear filters" }).click()
  await expect(page.getByText("Production React")).toBeVisible()
})

test("catalog exposes stable loading, filter, empty, error, and missing states", async ({
  page,
}, testInfo) => {
  await page.goto("/catalog/web-development")
  if (testInfo.project.name === "catalog-mobile") {
    await page.getByRole("button", { name: "Show filters" }).click()
  }
  await page.getByRole("searchbox", { name: "Search courses" }).fill("node")
  await page.getByLabel("Level").selectOption("intermediate")
  await page.getByRole("button", { name: "Search" }).click()
  await expect(page.getByText("2 active filters")).toBeVisible()
  await capture(page, testInfo, "active-filters")

  await page.unroute("**/api/v2/courses**")
  await page.route("**/api/v2/courses**", (route) =>
    json(
      route,
      {
        error: {
          code: "CATALOG_UNAVAILABLE",
          message: "Courses are temporarily unavailable.",
          requestId: "catalog-screenshot-error",
        },
      },
      503
    )
  )
  await page.goto("/catalog/web-development?q=api-error")
  await expect(
    page.getByRole("heading", { name: "Courses could not be loaded" })
  ).toBeVisible()
  await capture(page, testInfo, "api-error")

  await page.unroute("**/api/v2/courses**")
  await page.route("**/api/v2/courses**", (route) =>
    json(route, {
      success: true,
      requestId: "catalog-empty",
      data: {
        items: [],
        pageInfo: { endCursor: null, hasNextPage: false },
      },
    })
  )
  await page.goto("/catalog/web-development?sort=price_asc")
  await expect(
    page.getByRole("heading", { name: "No courses published yet" })
  ).toBeVisible()
  await capture(page, testInfo, "empty-category")

  await page.unroute("**/api/v2/courses**")
  await page.route("**/api/v2/courses**", async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 1_500))
    return json(route, {
      success: true,
      requestId: "catalog-slow",
      data: {
        items: [course(firstCourseId, "Production React")],
        pageInfo: { endCursor: null, hasNextPage: false },
      },
    })
  })
  await page.goto("/catalog/web-development?q=slow")
  await expect(
    page.getByRole("status", { name: "Loading courses" })
  ).toBeVisible()
  await capture(page, testInfo, "loading-skeleton")
  await expect(page.getByText("Production React")).toBeVisible()

  await page.goto("/catalog/missing-category")
  await expect(
    page.getByRole("heading", { name: "Catalog category not found" })
  ).toBeVisible()
  await capture(page, testInfo, "missing-category")
})
