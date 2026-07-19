const escapeHtml = (value = "") =>
  String(value).replace(/[&<>"']/g, (character) => {
    const entities = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;",
    }
    return entities[character]
  })

const safeHttpUrl = (value, fallback) => {
  try {
    const url = new URL(value || fallback)
    return ["http:", "https:"].includes(url.protocol) ? url.toString() : fallback
  } catch {
    return fallback
  }
}

const branding = () => {
  const fallbackAppUrl =
    process.env.FRONTEND_ORIGINS?.split(",")[0] ||
    process.env.FRONTEND_URL ||
    "http://localhost:3000"
  const appUrl = safeHttpUrl(process.env.APP_URL, fallbackAppUrl)
  return {
    appUrl,
    brandName: process.env.BRAND_NAME?.trim() || "StudyNotion",
    logoUrl: process.env.BRAND_LOGO_URL
      ? safeHttpUrl(process.env.BRAND_LOGO_URL, "")
      : "",
    supportEmail:
      process.env.SUPPORT_EMAIL?.trim() ||
      process.env.EMAIL_REPLY_TO?.trim() ||
      "support@example.com",
  }
}

const emailLayout = ({ body, ctaHref, ctaLabel, title }) => {
  const { appUrl, brandName, logoUrl, supportEmail } = branding()
  const safeBrand = escapeHtml(brandName)
  const header = logoUrl
    ? `<img src="${escapeHtml(logoUrl)}" alt="${safeBrand}" style="max-height:48px;max-width:180px">`
    : `<strong style="font-size:24px">${safeBrand}</strong>`
  const cta =
    ctaHref && ctaLabel
      ? `<p style="margin:28px 0"><a href="${escapeHtml(
          safeHttpUrl(ctaHref, appUrl)
        )}" style="background:#ffd60a;border-radius:6px;color:#000814;display:inline-block;font-weight:700;padding:12px 20px;text-decoration:none">${escapeHtml(
          ctaLabel
        )}</a></p>`
      : ""

  return `<!doctype html>
<html lang="en">
  <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(title)}</title></head>
  <body style="background:#f5f7fb;color:#161d29;font-family:Arial,sans-serif;margin:0;padding:24px">
    <main style="background:#fff;border-radius:12px;margin:0 auto;max-width:600px;padding:32px;text-align:center">
      <a href="${escapeHtml(appUrl)}" style="color:#161d29;text-decoration:none">${header}</a>
      <h1 style="font-size:22px;margin:28px 0 20px">${escapeHtml(title)}</h1>
      <div style="font-size:16px;line-height:1.6;text-align:left">${body}</div>
      ${cta}
      <p style="color:#6b7280;font-size:13px;margin-top:28px">Need help? Email <a href="mailto:${escapeHtml(
        supportEmail
      )}">${escapeHtml(supportEmail)}</a>.</p>
    </main>
  </body>
</html>`
}

module.exports = { branding, emailLayout, escapeHtml }
