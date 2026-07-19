const { escapeHtml } = require("./templateUtils")

exports.contactUsEmail = (
  email,
  firstName,
  lastName,
  message,
  phoneNumber,
  countryCode
) => {
  const safeName = `${escapeHtml(firstName)} ${escapeHtml(lastName)}`.trim()
  const safeMessage = escapeHtml(message).replace(/\r?\n/g, "<br>")

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>New StudyNotion contact request</title>
  </head>
  <body style="background:#f5f7fb;color:#161d29;font-family:Arial,sans-serif;margin:0;padding:24px">
    <main style="background:#fff;border-radius:12px;margin:0 auto;max-width:640px;padding:28px">
      <h1 style="font-size:22px;margin:0 0 20px">New contact request</h1>
      <p><strong>Name:</strong> ${safeName}</p>
      <p><strong>Email:</strong> ${escapeHtml(email)}</p>
      <p><strong>Phone:</strong> ${escapeHtml(countryCode)} ${escapeHtml(phoneNumber)}</p>
      <p><strong>Message:</strong><br>${safeMessage}</p>
    </main>
  </body>
</html>`
}
