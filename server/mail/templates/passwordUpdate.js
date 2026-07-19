const { emailLayout, escapeHtml } = require("./templateUtils")

exports.passwordUpdated = (email, name) =>
  emailLayout({
    title: "Password updated",
    body: `<p>Hello ${escapeHtml(name)},</p>
      <p>The password for <strong>${escapeHtml(email)}</strong> was updated successfully.</p>
      <p>If this was not you, contact support immediately and secure your email account.</p>`,
  })
