const assert = require("node:assert/strict")
const crypto = require("node:crypto")
const { after, before, test } = require("node:test")

process.env.NODE_ENV = "test"
process.env.FRONTEND_URL = "http://localhost:3000"
process.env.MONGODB_URL = "mongodb://127.0.0.1:27017/studynotion-contract"
process.env.JWT_SECRET = "contract-jwt-secret-12345678901234567890"
process.env.OTP_SECRET = "contract-otp-secret-12345678901234567890"
process.env.RAZORPAY_KEY_ID = "rzp_test_contract"
process.env.RAZORPAY_SECRET = "contract-razorpay-secret"
process.env.RAZORPAY_WEBHOOK_SECRET = "contract-webhook-secret"

const { app } = require("../index")

let server
let baseUrl
let listenerUnavailable

before(async () => {
  try {
    await new Promise((resolve, reject) => {
      server = app.listen(0, "127.0.0.1", (error) =>
        error ? reject(error) : resolve()
      )
    })
    baseUrl = `http://127.0.0.1:${server.address().port}`
  } catch (error) {
    if (error?.code !== "EPERM") throw error
    listenerUnavailable = error
  }
})

after(async () => {
  if (!server?.listening) return
  await new Promise((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve()))
  )
})

const requestJson = async (path, options) => {
  const response = await fetch(`${baseUrl}${path}`, options)
  return { response, body: await response.json() }
}

const requireListener = (t) => {
  if (!listenerUnavailable) return true
  t.skip("loopback listeners are blocked by this sandbox")
  return false
}

test("health and public auth routes expose stable JSON envelopes", async (t) => {
  if (!requireListener(t)) return
  const live = await requestJson("/health/live")
  assert.equal(live.response.status, 200)
  assert.deepEqual(live.body, { success: true, status: "ok" })

  const login = await requestJson("/api/v1/auth/login", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin: "http://localhost:3000",
    },
    body: JSON.stringify({ email: "invalid" }),
  })
  assert.equal(login.response.status, 400)
  assert.equal(login.body.success, false)
  assert.equal(typeof login.body.message, "string")

  const otp = await requestJson("/api/v1/auth/sendotp", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin: "http://localhost:3000",
    },
    body: JSON.stringify({ email: "invalid" }),
  })
  assert.equal(otp.response.status, 400)
  assert.equal(otp.body.success, false)

  const google = await requestJson("/api/v1/auth/google", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin: "http://localhost:3000",
    },
    body: JSON.stringify({}),
  })
  assert.equal(google.response.status, 400)
  assert.equal(google.body.success, false)

  const logout = await requestJson("/api/v1/auth/logout", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin: "http://localhost:3000",
    },
    body: JSON.stringify({}),
  })
  assert.equal(logout.response.status, 200)
  assert.equal(logout.body.success, true)
  const clearedCookies = logout.response.headers.get("set-cookie") || ""
  assert.match(clearedCookies, /studynotion_session=;/)
  assert.match(clearedCookies, /token=;/)
  assert.match(clearedCookies, /Expires=Thu, 01 Jan 1970/)
})

test("protected payment routes reject an absent session before provider access", async (t) => {
  if (!requireListener(t)) return
  const result = await requestJson("/api/v1/payment/capturePayment", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin: "http://localhost:3000",
    },
    body: JSON.stringify({ courses: ["64b000000000000000000001"] }),
  })

  assert.equal(result.response.status, 401)
  assert.deepEqual(result.body, { success: false, message: "Token Missing" })

  const admin = await requestJson("/api/v1/admin/instructors/pending", {
    method: "GET",
    headers: { origin: "http://localhost:3000" },
  })
  assert.equal(admin.response.status, 401)
  assert.deepEqual(admin.body, { success: false, message: "Token Missing" })
})

test("unauthenticated multipart uploads are rejected before file parsing", async (t) => {
  if (!requireListener(t)) return
  const form = new FormData()
  form.append("displayPicture", new Blob(["not-an-image"]), "avatar.png")

  const result = await requestJson("/api/v1/profile/updateDisplayPicture", {
    method: "PUT",
    headers: { origin: "http://localhost:3000" },
    body: form,
  })

  assert.equal(result.response.status, 401)
  assert.deepEqual(result.body, { success: false, message: "Token Missing" })
})

test("unsafe cross-site browser requests are rejected even without Origin", async (t) => {
  if (!requireListener(t)) return
  const result = await requestJson("/api/v1/auth/login", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "sec-fetch-site": "cross-site",
    },
    body: JSON.stringify({
      email: "learner@example.com",
      password: "Password1",
    }),
  })

  assert.equal(result.response.status, 403)
  assert.deepEqual(result.body, {
    success: false,
    message: "Request origin is not allowed",
  })
})

test("the mounted Razorpay webhook verifies the untouched raw body", async (t) => {
  if (!requireListener(t)) return
  const payload = JSON.stringify({ event: "subscription.activated", payload: {} })
  const signature = crypto
    .createHmac("sha256", process.env.RAZORPAY_WEBHOOK_SECRET)
    .update(payload)
    .digest("hex")
  const result = await requestJson("/api/v1/payment/webhook", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-razorpay-signature": signature,
    },
    body: payload,
  })

  assert.equal(result.response.status, 200)
  assert.deepEqual(result.body, { success: true, message: "Webhook ignored" })
})
