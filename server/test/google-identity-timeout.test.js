const assert = require("node:assert/strict")
const test = require("node:test")

const installMock = (modulePath, exports) => {
  const filename = require.resolve(modulePath)
  require.cache[filename] = { id: filename, filename, loaded: true, exports }
}

class OAuth2Client {
  constructor() {
    this.transporter = { defaults: {} }
  }

  verifyIdToken() {
    return new Promise(() => {})
  }
}

installMock("../config/env", { googleTimeoutMs: 10 })
installMock("google-auth-library", { OAuth2Client })
delete require.cache[require.resolve("../utils/googleIdentity")]
const { verifyGoogleIdToken } = require("../utils/googleIdentity")

test("Google identity verification has a bounded deadline", async () => {
  const startedAt = Date.now()
  await assert.rejects(
    verifyGoogleIdToken({ audience: "client-id", idToken: "credential" }),
    (error) => error.code === "GOOGLE_IDENTITY_TIMEOUT"
  )
  assert.ok(Date.now() - startedAt < 250)
})
