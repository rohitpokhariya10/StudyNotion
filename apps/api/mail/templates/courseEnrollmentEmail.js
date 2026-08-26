const { branding, emailLayout, escapeHtml } = require("./templateUtils")

exports.courseEnrollmentEmail = (courseName, name) => {
  const { appUrl } = branding()
  return emailLayout({
    title: "Course enrollment confirmed",
    body: `<p>Hello ${escapeHtml(name)},</p>
      <p>You are now enrolled in <strong>${escapeHtml(courseName)}</strong>.</p>
      <p>Your lessons are available from the enrolled courses dashboard.</p>`,
    ctaHref: new URL("/dashboard/enrolled-courses", appUrl).toString(),
    ctaLabel: "Open enrolled courses",
  })
}
