import AxeBuilder from "@axe-core/playwright"
import { expect, test } from "@playwright/test"

const courseId = "507f1f77bcf86cd799439011"
const thumbnail =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='640' height='360'%3E%3Crect width='640' height='360' fill='%23eaf1ff'/%3E%3Cpath d='m240 100 80 40 80-40v160l-80 40-80-40z' fill='%23245ac5'/%3E%3C/svg%3E"
const course = {
  _id: courseId,
  courseName: "Browser fixture: Practical React",
  courseDescription:
    "An isolated browser fixture for checking the learning workspace.",
  thumbnail,
  price: 1499,
  status: "Published",
  progressPercentage: 33,
  totalDuration: "3h",
  totalStudentsEnrolled: 4,
  totalAmountGenerated: 5996,
  courseContent: [
    {
      _id: "section-1",
      sectionName: "Foundations",
      subSection: [{ _id: "lesson-1", title: "First lesson" }],
    },
  ],
  createdAt: "2026-07-20T10:00:00.000Z",
}

async function mockUI(page, role = null) {
  await page.route("**/api/**", (route) => {
    const path = new URL(route.request().url()).pathname
    let data = []
    let extra = {}
    let status = 200
    if (path.endsWith("/getUserDetails")) {
      status = role ? 200 : 401
      data = role
        ? {
            _id: "507f191e810c19729de860ea",
            firstName: "Asha",
            lastName: "Rao",
            email: "asha@example.test",
            accountType: role,
            active: true,
            approved: true,
            deletionPending: false,
            additionalDetails: {
              about: "Learning a little every day.",
              contactNumber: "9876543210",
              gender: "Female",
              dateOfBirth: "2000-01-01",
            },
          }
        : null
      extra = { deletionPending: false, requiresPolicyAcceptance: false }
    } else if (path.endsWith("/showAllCategories")) {
      data = [
        {
          _id: "507f1f77bcf86cd799439012",
          name: "Web Development",
          description: "Build useful web products.",
          publishedCourseCount: 1,
        },
      ]
    } else if (
      path.endsWith("/getEnrolledCourses") ||
      path.endsWith("/getInstructorCourses")
    )
      data = [course]
    else if (path.endsWith("/instructorDashboard"))
      extra = { courses: [course] }
    else if (path.endsWith("/payment/config"))
      data = {
        termsVersion: "2026-07",
        refundPolicyVersion: "2026-07",
        refundWindowDays: 7,
        checkoutTtlSeconds: 900,
      }
    else if (path.endsWith("/purchases") || path.includes("/reconciliation"))
      data = { purchases: [], pagination: { page: 1, pages: 0, total: 0 } }
    else if (path.endsWith("/pending"))
      data = { instructors: [], pagination: { page: 1, pages: 0, total: 0 } }
    return route.fulfill({
      status,
      contentType: "application/json",
      body: JSON.stringify({ success: status === 200, data, ...extra }),
    })
  })
}

async function inspect(page, testInfo, name, { axe = true } = {}) {
  await expect(page).toHaveTitle(/^Prahit \|/)
  const logo = page.locator('header a[aria-label="Prahit home"] img')
  await expect(logo).toBeVisible()
  await expect(logo).toHaveJSProperty("naturalWidth", 632)
  await expect(logo).toHaveAttribute("alt", "")
  await expect(page.locator("body")).not.toContainText(/Study[ _-]?Notion/i)
  await expect(
    page.getByRole("heading", { name: "Something went wrong", exact: true })
  ).toHaveCount(0)
  await expect(page.locator("main")).toBeVisible()
  await expect(page.locator("h1")).toHaveCount(1)
  await expect
    .poll(() =>
      page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)
    )
    .toBe(true)
  await page.evaluate(async () => {
    await document.fonts.ready
    await Promise.all(
      document
        .getAnimations()
        .filter((animation) =>
          Number.isFinite(animation.effect?.getTiming().iterations)
        )
        .map((animation) => animation.finished.catch(() => {}))
    )
  })
  if (axe) {
    const result = await new AxeBuilder({ page }).analyze()
    expect(result.violations).toEqual([])
  }
  await page.screenshot({
    path: testInfo.outputPath(`${name}.png`),
    fullPage: true,
  })
}

test("public pages have readable responsive layouts and landmarks", async ({
  page,
}, testInfo) => {
  await mockUI(page)
  for (const [path, name] of [
    ["/", "home"],
    ["/about", "about"],
    ["/services", "services"],
    ["/careers", "careers"],
    ["/blogs", "blogs"],
    ["/blogs/make-a-little-time-for-learning", "article"],
    ["/blogs/missing-article", "article-not-found"],
    ["/contact", "contact"],
    ["/privacy-policy", "legal"],
    ["/cookie-policy", "cookies"],
    ["/terms", "terms"],
    ["/refund-policy", "refund-policy"],
    ["/forgot-password", "recovery"],
    ["/update-password", "reset-expired"],
    ["/missing-ui-page", "not-found"],
  ]) {
    await page.goto(path)
    await expect(page.locator("h1")).toBeVisible()
    await inspect(page, testInfo, name)
  }
})

test("navigation and auth forms retain keyboard and consent controls", async ({
  page,
}, testInfo) => {
  await mockUI(page)
  await page.goto("/login")
  await page
    .getByLabel("Email Address", { exact: false })
    .fill("learner@example.test")
  await page
    .getByPlaceholder("Enter Password", { exact: true })
    .fill("ExamplePassword123")
  await page.getByRole("button", { name: "Show password", exact: true }).click()
  await expect(
    page.getByPlaceholder("Enter Password", { exact: true })
  ).toHaveAttribute("type", "text")
  await inspect(page, testInfo, "login")
  if (testInfo.project.name !== "ui-desktop") {
    const toggle = page.getByRole("button", { name: "Open navigation" })
    await toggle.click()
    await expect(
      page.getByRole("navigation", { name: "Mobile navigation" })
    ).toBeVisible()
    await page.keyboard.press("Escape")
    await expect(toggle).toBeFocused()
    await expect(toggle).toHaveAttribute("aria-expanded", "false")
  }
  await page.goto("/signup")
  await expect(page.getByRole("checkbox")).toHaveCount(3)
  await page.getByRole("button", { name: "Instructor", exact: true }).click()
  await inspect(page, testInfo, "signup")
})

test("student workspace preserves profile, enrollment, and checkout navigation", async ({
  page,
}, testInfo) => {
  await mockUI(page, "Student")
  for (const [path, title, name] of [
    ["my-profile", "My Profile", "profile"],
    ["enrolled-courses", "Enrolled Courses", "enrolled"],
    ["settings", "Edit Profile", "settings"],
    ["cart", "Cart", "cart"],
    ["purchases", "Purchases & refunds", "purchases"],
  ]) {
    await page.goto(`/dashboard/${path}`)
    await expect(
      page.getByRole("heading", { name: title, exact: true, level: 1 })
    ).toBeVisible()
    if (path === "enrolled-courses") {
      await expect(
        page.getByRole("button", { name: `Continue ${course.courseName}` })
      ).toBeEnabled()
      await expect(page.getByRole("progressbar")).toHaveAttribute("value", "33")
    }
    await inspect(page, testInfo, name)
    if (path === "my-profile" && testInfo.project.name === "ui-mobile") {
      const menu = page.getByRole("button", { name: "Dashboard menu" })
      await menu.click()
      await expect(
        page.getByRole("dialog", { name: "Your workspace" })
      ).toBeVisible()
      await page.keyboard.press("Escape")
      await expect(menu).toBeFocused()
    }
  }
})

test("instructor studio and existing admin routes remain usable", async ({
  page,
}, testInfo) => {
  await mockUI(page, "Instructor")
  for (const [path, name] of [
    ["instructor", "instructor-dashboard"],
    ["my-courses", "course-management"],
    ["add-course", "course-authoring"],
  ]) {
    await page.goto(`/dashboard/${path}`)
    await expect(page.locator("h1")).toBeVisible()
    if (path === "my-courses") {
      await expect(
        page.getByRole("button", {
          name: `Edit ${course.courseName}`,
          exact: true,
        })
      ).toBeEnabled()
      await page
        .getByRole("button", { name: `Archive or delete ${course.courseName}` })
        .click()
      await expect(
        page.getByRole("button", { name: "Confirm", exact: true })
      ).toBeDisabled()
      await page.getByLabel(/Type .* to confirm/).fill(course.courseName)
      await expect(
        page.getByRole("button", { name: "Confirm", exact: true })
      ).toBeEnabled()
      await page.getByRole("button", { name: "Cancel", exact: true }).click()
      await expect(page.getByRole("dialog")).toHaveCount(0)
    }
    await inspect(page, testInfo, name)
  }
  await page.unroute("**/api/**")
  await mockUI(page, "Admin")
  for (const path of ["instructor-approvals", "payment-reconciliation"]) {
    await page.goto(`/dashboard/${path}`)
    await expect(page.locator("h1")).toBeVisible()
    await inspect(page, testInfo, path)
  }
})

test("course discovery and journal controls navigate to real destinations", async ({
  page,
}, testInfo) => {
  await mockUI(page)
  await page.goto("/services")
  const opener = page.getByRole("button", { name: "Find courses", exact: true })
  await opener.click()
  const dialog = page.getByRole("dialog", { name: "Find courses", exact: true })
  await expect(dialog).toBeVisible()
  await expect(
    dialog.getByRole("button", { name: "Find courses", exact: true })
  ).toBeDisabled()
  await page.keyboard.press("Escape")
  await expect(opener).toBeFocused()
  await opener.click()
  await dialog
    .getByLabel("Choose a subject")
    .selectOption("507f1f77bcf86cd799439012")
  await dialog.getByRole("searchbox").fill("React & CSS")
  await dialog
    .getByRole("button", { name: "Find courses", exact: true })
    .click()
  await expect(page).toHaveURL(/catalog\/web-development\?q=React\+%26\+CSS/)
  await page.goto("/blogs")
  await page.getByRole("button", { name: "Teaching", exact: true }).click()
  await expect(page.getByRole("article")).toHaveCount(1)
  await page.getByRole("searchbox").fill("not-a-guide")
  await expect(page.getByText("No articles match your search")).toBeVisible()
  await page.getByRole("button", { name: "Clear filters" }).click()
  await expect(page.getByRole("article")).toHaveCount(3)
  await page.getByRole("link", { name: "Read the guide" }).click()
  await expect(
    page.getByRole("heading", { name: "Start with one clear intention" })
  ).toBeVisible()
  await page.getByRole("searchbox").fill("course")
  await page.getByRole("button", { name: "Search articles" }).click()
  await expect(page).toHaveURL(/blogs\?q=course/)
  await inspect(page, testInfo, "journal-search")
})

test("360px public layouts and modal navigation remain usable", async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 360, height: 800 })
  await mockUI(page)
  for (const path of ["/", "/services", "/blogs", "/contact", "/signup"]) {
    await page.goto(path)
    await expect(page.locator("h1")).toBeVisible()
    await inspect(
      page,
      testInfo,
      `narrow-${path.replaceAll("/", "-") || "home"}`
    )
  }
  await page.getByRole("button", { name: "Open navigation" }).click()
  const nav = page.getByRole("navigation", { name: "Mobile navigation" })
  await expect(nav).toBeVisible()
  await nav.getByRole("link", { name: "Services", exact: true }).click()
  await expect(page.getByRole("dialog")).toHaveCount(0)
  await expect(page).toHaveURL(/\/services$/)
})

test("signup verification preserves the OTP flow at 360px", async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 360, height: 800 })
  await mockUI(page)
  await page.goto("/signup")
  await page.getByPlaceholder("Enter first name").fill("Test")
  await page.getByPlaceholder("Enter last name").fill("Learner")
  await page.getByPlaceholder("Enter email address").fill("test@example.test")
  await page
    .getByPlaceholder("Enter Password", { exact: true })
    .fill("ExamplePassword123")
  await page
    .getByPlaceholder("Confirm Password", { exact: true })
    .fill("ExamplePassword123")
  for (const checkbox of await page.getByRole("checkbox").all())
    await checkbox.check()
  await page
    .getByRole("button", { name: "Create Account", exact: true })
    .click()
  await expect(page).toHaveURL(/verify-email$/)
  await expect(
    page.getByRole("button", { name: "Verify Email", exact: true })
  ).toBeDisabled()
  await inspect(page, testInfo, "verification")
  await page.getByLabel("Verification code digit 1").fill("1")
  await expect(page.getByLabel("Verification code digit 2")).toBeFocused()
})

test("cart consent and removal keep the actual stored course", async ({
  page,
}, testInfo) => {
  await mockUI(page, "Student")
  await page.addInitScript(
    (item) => localStorage.setItem("cart", JSON.stringify([item])),
    course
  )
  await page.goto("/dashboard/cart")
  await expect(
    page.getByRole("button", { name: "Buy Now", exact: true })
  ).toBeDisabled()
  await page.getByRole("checkbox").check()
  await expect(
    page.getByRole("button", { name: "Buy Now", exact: true })
  ).toBeEnabled()
  await inspect(page, testInfo, "cart-populated")
  await page
    .getByRole("button", { name: `Remove ${course.courseName} from cart` })
    .click()
  await expect(
    page.getByRole("heading", { name: "Your cart is empty" })
  ).toBeVisible()
})

test("contact retains its payload and resets only after successful delivery", async ({
  page,
}, testInfo) => {
  await mockUI(page)
  let payload
  await page.route("**/reach/contact", async (route) => {
    payload = route.request().postDataJSON()
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        message: "Fixture message delivered",
      }),
    })
  })
  await page.goto("/contact")
  await page.getByLabel("First Name", { exact: true }).fill("Test")
  await page.getByLabel("Last Name", { exact: true }).fill("Learner")
  await page
    .getByLabel("Email Address", { exact: true })
    .fill("test@example.test")
  await page.getByLabel("Phone Number", { exact: true }).fill("9876543210")
  await page
    .getByLabel("Message", { exact: true })
    .fill("A synthetic support request for UI verification.")
  await page.getByRole("button", { name: "Send Message" }).click()
  await expect(page.getByText("Fixture message delivered")).toBeVisible()
  expect(Object.keys(payload).sort()).toEqual([
    "countrycode",
    "email",
    "firstname",
    "lastname",
    "message",
    "phoneNo",
  ])
  await expect(page.getByLabel("Message", { exact: true })).toHaveValue("")
  await inspect(page, testInfo, "contact-delivered")
})

const fulfill = (route, data, extra = {}) =>
  route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ success: true, data, ...extra }),
  })
const purchase = {
  _id: "fixture-purchase",
  amount: 49900,
  currency: "INR",
  createdAt: "2026-07-18T10:00:00.000Z",
  paidAt: "2026-07-18T10:00:00.000Z",
  lineItems: [
    { amount: 49900, course: courseId, courseName: course.courseName },
  ],
  refundEligible: true,
  refundEligibleUntil: "2026-07-25T10:00:00.000Z",
  refundWindowDays: 7,
  status: "fulfilled",
  user: {
    firstName: "Fixture",
    lastName: "Learner",
    email: "learner@example.test",
    accountType: "Student",
    active: true,
    approved: true,
  },
}

test("purchase history and refund request retain amounts and confirmation payload", async ({
  page,
}, testInfo) => {
  await mockUI(page, "Student")
  let requested = false
  let payload
  await page.route("**/payment/purchases?*", (route) =>
    fulfill(route, {
      purchases: [
        {
          ...purchase,
          status: requested ? "refund_requested" : "fulfilled",
          refundEligible: !requested,
        },
      ],
      pagination: { page: 1, pages: 1, total: 1 },
    })
  )
  await page.route("**/payment/purchases/*/refund-request", (route) => {
    requested = true
    payload = route.request().postDataJSON()
    return fulfill(
      route,
      { purchaseId: purchase._id, status: "refund_requested" },
      { message: "Fixture refund request submitted" }
    )
  })
  await page.goto("/dashboard/purchases")
  await expect(page.getByText("₹499.00", { exact: true }).first()).toBeVisible()
  await page
    .getByRole("button", { name: "Request refund", exact: true })
    .click()
  await inspect(page, testInfo, "refund-form")
  const reason = "The fixture course could not be accessed after payment."
  await page.getByLabel("Why are you requesting a refund?").fill(reason)
  await page.getByRole("button", { name: "Submit refund request" }).click()
  await expect(page.getByText("Fixture refund request submitted")).toBeVisible()
  expect(payload).toEqual({ confirmation: "REQUEST REFUND", reason })
  await inspect(page, testInfo, "refund-requested")
})

test("admin queues preserve rejection and audited refund controls", async ({
  page,
}, testInfo) => {
  await mockUI(page, "Admin")
  let reviewed = false
  let decision
  await page.route("**/admin/instructors/pending?*", (route) =>
    fulfill(route, {
      instructors: reviewed
        ? []
        : [
            {
              _id: "fixture-instructor",
              firstName: "Fixture",
              lastName: "Teacher",
              email: "teacher@example.test",
              createdAt: "2026-07-20",
              additionalDetails: { about: "Synthetic instructor application." },
            },
          ],
      pagination: { page: 1, pages: 1, total: reviewed ? 0 : 1 },
    })
  )
  await page.route("**/admin/instructors/*/reject", (route) => {
    reviewed = true
    decision = route.request().postDataJSON()
    return fulfill(
      route,
      { instructor: { _id: "fixture-instructor" } },
      { message: "Fixture application reviewed" }
    )
  })
  await page.goto("/dashboard/instructor-approvals")
  await page
    .getByRole("textbox", { name: /rejection reason/i })
    .fill("Additional teaching information is required.")
  await inspect(page, testInfo, "instructor-application")
  await page.getByRole("button", { name: "Reject", exact: true }).click()
  await expect(page.getByText("Fixture application reviewed")).toBeVisible()
  expect(decision).toEqual({
    reason: "Additional teaching information is required.",
  })
  await page.route("**/admin/payments/reconciliation?*", (route) =>
    fulfill(route, {
      purchases: [{ ...purchase, status: "refund_requested" }],
      pagination: { page: 1, pages: 1, total: 1 },
    })
  )
  await page.goto("/dashboard/payment-reconciliation")
  await page.getByRole("button", { name: "Approve & refund" }).click()
  const confirm = page.getByRole("button", { name: "Confirm refund action" })
  await expect(confirm).toBeDisabled()
  await page
    .getByLabel("Audit note")
    .fill("Synthetic verification of the existing override controls.")
  await page
    .getByRole("checkbox", { name: /audited refund-window override/ })
    .check()
  await expect(confirm).toBeEnabled()
  await inspect(page, testInfo, "reconciliation-override")
  await page.getByRole("button", { name: "Cancel", exact: true }).click()
})

test("editor retains hydration, lecture dialogs, and publish stage", async ({
  page,
}, testInfo) => {
  await mockUI(page, "Instructor")
  const editable = {
    ...course,
    tag: ["React"],
    instructions: ["A modern browser"],
    category: "507f1f77bcf86cd799439012",
    whatYouWillLearn: "Build a useful application.",
  }
  await page.route("**/course/getFullCourseDetails", (route) =>
    fulfill(route, { courseDetails: editable })
  )
  await page.goto(`/dashboard/edit-course/${courseId}`)
  await expect(page.getByLabel("Course Title")).toHaveValue(course.courseName)
  await inspect(page, testInfo, "course-edit")
  await page.getByRole("button", { name: /Continue Without Saving/ }).click()
  await expect(page.getByLabel("Section Name")).toBeVisible()
  await inspect(page, testInfo, "course-builder")
  const add = page.getByRole("button", { name: "Add Lecture" })
  await add.click()
  const dialog = page.getByRole("dialog", { name: "Adding Lecture" })
  await expect(dialog).toBeVisible()
  await expect(dialog.getByLabel("Lecture Title")).toBeVisible()
  await expect(dialog.getByText("Save", { exact: true })).toBeVisible()
  const a11y = await new AxeBuilder({ page }).analyze()
  expect(a11y.violations).toEqual([])
  await page.screenshot({
    path: testInfo.outputPath("lecture-upload.png"),
    fullPage: true,
  })
  await page.keyboard.press("Escape")
  await expect(add).toBeFocused()
  let uploadFields
  await page.route("**/course/addSubSection", async (route) => {
    const request = route.request()
    const multipart = await new Response(request.postDataBuffer(), {
      headers: { "content-type": request.headers()["content-type"] },
    }).formData()
    uploadFields = {
      sectionId: multipart.get("sectionId"),
      title: multipart.get("title"),
      description: multipart.get("description"),
      video: multipart.get("video").name,
    }
    return fulfill(route, {
      ...editable.courseContent[0],
      subSection: [
        ...editable.courseContent[0].subSection,
        { _id: "fixture-added-lesson", title: "Uploaded fixture lesson" },
      ],
    })
  })
  await add.click()
  await dialog
    .getByLabel("Lecture Video", { exact: true })
    .setInputFiles("apps/web/src/shared/assets/Images/banner.mp4")
  await dialog.getByLabel("Lecture Title").fill("Uploaded fixture lesson")
  await dialog
    .getByLabel("Lecture Description")
    .fill("Synthetic upload verification.")
  await dialog.getByRole("button", { name: "Save", exact: true }).click()
  await expect(dialog).toHaveCount(0)
  expect(uploadFields).toEqual({
    sectionId: "section-1",
    title: "Uploaded fixture lesson",
    description: "Synthetic upload verification.",
    video: "banner.mp4",
  })
  await expect(
    page.getByRole("button", { name: "View Uploaded fixture lesson" })
  ).toBeVisible()
  await page.getByRole("button", { name: "Next", exact: true }).click()
  await expect(
    page.getByText("Publish Settings", { exact: true })
  ).toBeVisible()
  await expect(
    page.getByRole("checkbox", { name: /Make this course/ })
  ).toBeChecked()
  await inspect(page, testInfo, "course-publish")
})

test("stacked workspace confirmation returns focus and preserves scroll isolation", async ({
  page,
}) => {
  await mockUI(page, "Student")
  await page.setViewportSize({ width: 360, height: 800 })
  await page.goto("/dashboard/my-profile")
  const menu = page.getByRole("button", { name: "Dashboard menu" })
  await menu.click()
  const workspace = page.getByRole("dialog", { name: "Your workspace" })
  const logout = workspace.getByRole("button", { name: "Logout", exact: true })
  await logout.click()
  await expect(
    page.getByRole("dialog", { name: "Are you sure?" })
  ).toBeVisible()
  await page.keyboard.press("Escape")
  await expect(workspace).toBeVisible()
  await expect(logout).toBeFocused()
  await expect(page.locator("body")).toHaveCSS("overflow", "hidden")
  await page.keyboard.press("Escape")
  await expect(menu).toBeFocused()
  await expect(page.locator("body")).not.toHaveCSS("overflow", "hidden")
})

test("pending policies and role restrictions preserve existing navigation authority", async ({
  page,
}, testInfo) => {
  await mockUI(page, "Student")
  await page.goto("/dashboard/payment-reconciliation")
  await expect(page).toHaveURL(/dashboard\/my-profile/)
  await page.route("**/getUserDetails", (route) =>
    fulfill(
      route,
      {
        _id: "fixture-student",
        firstName: "Fixture",
        lastName: "Learner",
        accountType: "Student",
        active: true,
        approved: true,
      },
      { requiresPolicyAcceptance: true }
    )
  )
  await page.goto("/dashboard/purchases")
  await expect(page).toHaveURL(/accept-terms/)
  await expect(page.getByRole("checkbox")).toHaveCount(3)
  for (const checkbox of await page.getByRole("checkbox").all())
    await expect(checkbox).not.toBeChecked()
  await inspect(page, testInfo, "policy-acceptance")
})

test("public composition scales across remaining target viewport widths", async ({
  page,
}, testInfo) => {
  await mockUI(page)
  for (const width of [768, 1024, 1366, 1920]) {
    await page.setViewportSize({ width, height: 936 })
    await page.goto("/")
    await inspect(page, testInfo, `home-${width}`)
    if (width === 1366)
      await page.screenshot({ path: testInfo.outputPath("home-1366-fold.png") })
  }
})

test("course creation retains multipart fields and upload validation", async ({
  page,
}, testInfo) => {
  await mockUI(page, "Instructor")
  let submitted
  await page.route("**/course/createCourse", async (route) => {
    const request = route.request()
    const form = await new Response(request.postDataBuffer(), {
      headers: { "content-type": request.headers()["content-type"] },
    }).formData()
    submitted = Object.fromEntries(
      [...form.entries()].map(([key, value]) => [
        key,
        typeof value === "string" ? value : value.name,
      ])
    )
    return fulfill(route, { ...course, courseContent: [], status: "Draft" })
  })
  await page.goto("/dashboard/add-course")
  await page.getByLabel("Course Title").fill("Browser fixture: Practical React")
  await page
    .getByLabel("Course Short Description")
    .fill("A synthetic authoring verification course.")
  await page.getByLabel("Course Price").fill("1499")
  await page
    .getByLabel("Course Category")
    .selectOption("507f1f77bcf86cd799439012")
  await page.getByLabel("Tags", { exact: false }).fill("React")
  await page.getByLabel("Tags", { exact: false }).press("Enter")
  await page.getByLabel("Course Thumbnail", { exact: true }).setInputFiles({
    name: "fixture.png",
    mimeType: "image/png",
    buffer: Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aHHQAAAAASUVORK5CYII=",
      "base64"
    ),
  })
  await page
    .getByLabel("Benefits of the course")
    .fill("Practise useful React skills.")
  await page.getByLabel("Requirements/Instructions").fill("A modern browser")
  await page.getByRole("button", { name: "Add", exact: true }).click()
  await inspect(page, testInfo, "course-create-filled")
  await page.getByRole("button", { name: "Next", exact: true }).click()
  await expect(page.getByLabel("Section Name")).toBeVisible()
  expect(submitted).toEqual({
    courseName: course.courseName,
    courseDescription: "A synthetic authoring verification course.",
    price: "1499",
    tag: '["React"]',
    whatYouWillLearn: "Practise useful React skills.",
    category: "507f1f77bcf86cd799439012",
    status: "Draft",
    instructions: '["A modern browser"]',
    thumbnailImage: "fixture.png",
  })
})

test("archived enrollment, missing images, and no-lesson access remain truthful", async ({
  page,
}, testInfo) => {
  await mockUI(page, "Student")
  await page.route("**/getEnrolledCourses", (route) =>
    fulfill(route, [
      {
        ...course,
        status: "Archived",
        thumbnail: "/fixture-missing-course.png",
        courseContent: [],
      },
    ])
  )
  await page.route("**/fixture-missing-course.png", (route) =>
    route.fulfill({ status: 404, body: "" })
  )
  await page.goto("/dashboard/enrolled-courses")
  await expect(page.getByText("Archived", { exact: true })).toBeVisible()
  await expect(
    page.getByRole("button", {
      name: `${course.courseName} content coming soon`,
    })
  ).toBeDisabled()
  const courseImage = page.locator("main article img")
  await expect(courseImage).not.toHaveAttribute(
    "src",
    "/fixture-missing-course.png"
  )
  await expect
    .poll(() =>
      courseImage.evaluate((image) => image.complete && image.naturalWidth > 0)
    )
    .toBe(true)
  await inspect(page, testInfo, "archived-no-lessons")
})

test("review cards reveal full real responses and retry failed requests", async ({
  page,
}, testInfo) => {
  await mockUI(page)
  let fail = true
  const reviewText =
    "Synthetic review content. ".repeat(12) +
    "The final sentence remains readable."
  await page.route("**/getReviews", (route) =>
    fail
      ? route.fulfill({
          status: 500,
          contentType: "application/json",
          body: JSON.stringify({ success: false }),
        })
      : fulfill(
          route,
          [1, 2, 3, 4].map((index) => ({
            _id: `review-${index}`,
            rating: 4,
            review: reviewText,
            user: { firstName: "Fixture", lastName: `Learner ${index}` },
          }))
        )
  )
  await page.goto("/")
  await expect(
    page.getByText("Reviews are temporarily unavailable")
  ).toBeVisible()
  fail = false
  await page.getByRole("button", { name: "Retry reviews" }).click()
  await page.getByText("Read full review", { exact: true }).first().click()
  await expect(
    page.getByText(reviewText, { exact: true }).first()
  ).toBeVisible()
  const next = page.getByRole("button", { name: "Next learner reviews" })
  await next.click()
  await expect(
    page.getByRole("button", { name: "Previous learner reviews" })
  ).toBeEnabled()
  await inspect(page, testInfo, "reviews-expanded")
})

test("recovery, reset, and deletion-pending screens retain their supported states", async ({
  page,
}, testInfo) => {
  await mockUI(page)
  await page.goto("/forgot-password")
  await page
    .getByPlaceholder("Enter email address")
    .fill("fixture@example.test")
  await page.getByRole("button", { name: "Send reset link" }).click()
  await expect(
    page.getByRole("heading", { name: "Check email", exact: true })
  ).toBeVisible()
  await inspect(page, testInfo, "reset-link-sent")
  await page.goto("/update-password#token=synthetic-reset-challenge")
  await expect(page).toHaveURL(/update-password$/)
  await page
    .getByPlaceholder("Enter Password", { exact: true })
    .fill("ExamplePassword123")
  await page
    .getByPlaceholder("Confirm Password", { exact: true })
    .fill("ExamplePassword123")
  await inspect(page, testInfo, "password-reset-valid")
  await page.route("**/getUserDetails", (route) =>
    fulfill(
      route,
      {
        _id: "fixture-student",
        firstName: "Fixture",
        lastName: "Learner",
        email: "fixture@example.test",
        accountType: "Student",
        active: false,
        approved: true,
        deletionPending: true,
      },
      { deletionPending: true, requiresPolicyAcceptance: false }
    )
  )
  await page.goto("/dashboard/enrolled-courses")
  await expect(page).toHaveURL(/dashboard\/settings/)
  await expect(
    page.getByRole("heading", { name: "Complete account deletion" })
  ).toBeVisible()
  await inspect(page, testInfo, "deletion-pending")
})

test("admin errors retry safely and contact failure keeps the message", async ({
  page,
}, testInfo) => {
  await mockUI(page, "Admin")
  for (const [path, endpoint] of [
    ["instructor-approvals", "**/admin/instructors/pending?*"],
    ["payment-reconciliation", "**/admin/payments/reconciliation?*"],
  ]) {
    let fail = true
    await page.route(endpoint, (route) =>
      fail
        ? route.fulfill({
            status: 503,
            contentType: "application/json",
            body: JSON.stringify({
              success: false,
              message: "Fixture service unavailable",
            }),
          })
        : fulfill(route, {
            instructors: [],
            purchases: [],
            pagination: { page: 1, pages: 0, total: 0 },
          })
    )
    await page.goto(`/dashboard/${path}`)
    await expect(
      page.getByRole("alert").filter({ hasText: "Fixture service unavailable" })
    ).toBeVisible()
    await inspect(page, testInfo, `${path}-failure`)
    fail = false
    await page.getByRole("button", { name: "Try again" }).click()
    await expect(page.getByText("Fixture service unavailable")).toHaveCount(0)
  }
  await page.route("**/reach/contact", (route) =>
    route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({
        success: false,
        message: "Fixture message could not be delivered",
      }),
    })
  )
  await page.goto("/contact")
  await page.getByLabel("First Name", { exact: true }).fill("Fixture")
  await page
    .getByLabel("Email Address", { exact: true })
    .fill("fixture@example.test")
  await page.getByLabel("Phone Number", { exact: true }).fill("9876543210")
  await page
    .getByLabel("Message", { exact: true })
    .fill("Keep this synthetic message after a server failure.")
  await page.getByRole("button", { name: "Send Message" }).click()
  await expect(
    page.getByText("Fixture message could not be delivered").first()
  ).toBeVisible()
  await expect(page.getByLabel("Message", { exact: true })).toHaveValue(
    "Keep this synthetic message after a server failure."
  )
  await inspect(page, testInfo, "contact-failed")
})
