const assert = require("node:assert/strict")
const test = require("node:test")

const updates = []

const installMock = (modulePath, exports) => {
  const filename = require.resolve(modulePath)
  require.cache[filename] = { id: filename, filename, loaded: true, exports }
}

installMock("../config/env", { checkoutTtlSeconds: 900 })
installMock("../models/Purchase", {
  updateMany: async (query, update) => {
    updates.push({ query, update })
    return { modifiedCount: 1 }
  },
})

delete require.cache[require.resolve("../utils/purchaseLifecycle")]
const { releaseStaleCheckoutLocks } = require("../utils/purchaseLifecycle")

test("stale checkout locks are expired within the requested account and course scope", async () => {
  updates.length = 0
  const courseId = "64b000000000000000000001"
  const userId = "64b000000000000000000002"
  const startedAt = Date.now()

  const results = await releaseStaleCheckoutLocks({ courseId, userId })

  assert.equal(results.length, 2)
  assert.equal(updates.length, 2)
  assert.equal(updates[0].query.courses, courseId)
  assert.equal(updates[0].query.user, userId)
  assert.deepEqual(updates[0].query.status.$in, ["created", "order_created"])
  assert.equal(updates[0].update.$set.status, "expired")
  assert.deepEqual(updates[0].update.$set.activeCourses, [])
  assert.equal(updates[0].update.$unset.checkoutKey, 1)
  assert.equal(updates[0].update.$unset.idempotencyKey, 1)

  const legacyCutoff = updates[0].query.$or[1].createdAt.$lte.getTime()
  assert.ok(legacyCutoff >= startedAt - 900_000)
  assert.ok(legacyCutoff <= Date.now() - 900_000)

  assert.equal(updates[1].query.status, "failed")
  assert.equal(updates[1].query.courses, courseId)
  assert.equal(updates[1].query.user, userId)
  assert.deepEqual(updates[1].update.$set.activeCourses, [])
})
