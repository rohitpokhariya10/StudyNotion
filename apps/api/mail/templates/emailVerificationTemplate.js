const { emailLayout, escapeHtml } = require("./templateUtils")

module.exports = (otp) =>
  emailLayout({
    title: "Verify your email",
    body: `<p>Use this one-time verification code to finish creating your account:</p>
      <p style="font-size:30px;font-weight:700;letter-spacing:6px;text-align:center">${escapeHtml(
        otp
      )}</p>
      <p>This code expires in 10 minutes. If you did not request it, you can ignore this email.</p>`,
  })
