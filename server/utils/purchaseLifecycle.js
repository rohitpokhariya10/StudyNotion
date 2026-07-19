const env = require("../config/env")
const Purchase = require("../models/Purchase")

const releaseStaleCheckoutLocks = async ({ courseId, userId } = {}) => {
  const now = new Date()
  const legacyCutoff = new Date(Date.now() - env.checkoutTtlSeconds * 1000)
  const scope = {
    ...(courseId ? { courses: courseId } : {}),
    ...(userId ? { user: userId } : {}),
  }
  return Promise.all([
    Purchase.updateMany(
      {
        ...scope,
        status: { $in: ["created", "order_created"] },
        $or: [
          { checkoutExpiresAt: { $lte: now } },
          {
            checkoutExpiresAt: { $exists: false },
            createdAt: { $lte: legacyCutoff },
          },
        ],
      },
      {
        $set: {
          activeCourses: [],
          expiredAt: now,
          failureReason: "Checkout expired before payment",
          status: "expired",
        },
        $unset: { checkoutKey: 1, idempotencyKey: 1 },
      }
    ),
    Purchase.updateMany(
      {
        ...scope,
        status: "failed",
        $or: [
          { "activeCourses.0": { $exists: true } },
          { checkoutKey: { $exists: true } },
          { idempotencyKey: { $exists: true } },
        ],
      },
      {
        $set: { activeCourses: [] },
        $unset: { checkoutKey: 1, idempotencyKey: 1 },
      }
    ),
  ])
}

module.exports = { releaseStaleCheckoutLocks }
