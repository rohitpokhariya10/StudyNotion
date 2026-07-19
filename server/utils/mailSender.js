const crypto = require("crypto")

const mailSender = async (email, title, body, options = {}) => {
  if (!process.env.RESEND_API_KEY) {
    if (
      process.env.NODE_ENV !== "production" &&
      process.env.ALLOW_DEV_OTP === "true"
    ) {
      return { response: "Email delivery disabled in local development" }
    }
    throw new Error("Transactional email is not configured")
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
      "Idempotency-Key": crypto.randomUUID(),
    },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM,
      to: [email],
      subject: title,
      html: body,
      ...(options.replyTo || process.env.EMAIL_REPLY_TO
        ? { reply_to: options.replyTo || process.env.EMAIL_REPLY_TO }
        : {}),
    }),
    signal: AbortSignal.timeout(10000),
  })

  const result = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(result.message || "Transactional email delivery failed")
  }

  return { response: result.id }
}

module.exports = mailSender
