const { emailLayout, escapeHtml } = require("./templateUtils")

exports.paymentSuccessEmail = (name, amount, orderId, paymentId) => {
  const normalizedAmount = Number(amount)
  const displayAmount = Number.isFinite(normalizedAmount)
    ? normalizedAmount.toFixed(2)
    : "0.00"

  return emailLayout({
    title: "Payment confirmed",
    body: `<p>Hello ${escapeHtml(name)},</p>
      <p>We received your payment of <strong>₹${escapeHtml(displayAmount)}</strong>.</p>
      <p><strong>Order ID:</strong> ${escapeHtml(orderId)}</p>
      <p><strong>Payment ID:</strong> ${escapeHtml(paymentId)}</p>
      <p>Keep this email as your payment receipt.</p>`,
  })
}
