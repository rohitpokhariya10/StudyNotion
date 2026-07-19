const assert = require("node:assert/strict")
const test = require("node:test")

process.env.NODE_ENV = "test"
process.env.FRONTEND_URL = "http://localhost:3000"
process.env.MONGODB_URL = "mongodb://127.0.0.1:27017/studynotion-contract"
process.env.JWT_SECRET = "auth-contract-jwt-secret-123456789012345"
process.env.OTP_SECRET = "auth-contract-otp-secret-123456789012345"
process.env.ALLOW_DEV_OTP = "true"
process.env.GOOGLE_CLIENT_ID = "web-client.apps.googleusercontent.com"

const users = new Map()
const deliveries = []
const googleVerifications = []
let challenge
let nextId = 1
let failSafeUserLookup = false
let failSessionRevocation = false

const objectId = () => String(nextId++).padStart(24, "0")
const safeUser = (user) => {
  if (!user) return null
  const { googleId, password, ...safe } = user
  return safe
}
const queryFor = (value) => ({
  select() {
    return this
  },
  populate() {
    return this
  },
  then(resolve, reject) {
    return Promise.resolve(value).then(resolve, reject)
  },
})

const User = {
  db: {
    base: {
      isValidObjectId: (value) => /^[a-f0-9]{24}$/i.test(value),
    },
  },
  exists: async ({ email }) => users.has(email),
  create: async (payload) => {
    const user = {
      _id: objectId(),
      active: true,
      approved: true,
      sessionVersion: 0,
      ...payload,
    }
    users.set(user.email, user)
    return user
  },
  findOne: (filter) => {
    const user = filter.email
      ? users.get(filter.email)
      : [...users.values()].find(
          (candidate) =>
            candidate.googleId === filter.$or?.[0]?.googleId ||
            candidate.email === filter.$or?.[1]?.email
        )
    return queryFor(user || null)
  },
  findById: (id) => {
    if (failSafeUserLookup) {
      return {
        select() {
          return this
        },
        populate: async () => {
          throw new Error("database unavailable")
        },
      }
    }
    return queryFor(
      safeUser([...users.values()].find((candidate) => candidate._id === id))
    )
  },
  updateOne: async (filter, update) => {
    if (failSessionRevocation && update.$inc?.sessionVersion) {
      throw new Error("database unavailable")
    }
    const user = [...users.values()].find(
      (candidate) => candidate._id === filter._id
    )
    if (
      user &&
      filter.sessionVersion !== undefined &&
      user.sessionVersion !== filter.sessionVersion
    ) {
      return { acknowledged: true, matchedCount: 0, modifiedCount: 0 }
    }
    if (user && update.$inc?.sessionVersion) {
      user.sessionVersion += update.$inc.sessionVersion
    }
    if (user && update.$set?.googleId) user.googleId = update.$set.googleId
    if (user && update.$addToSet?.authProviders) {
      user.authProviders = [...new Set([...user.authProviders, update.$addToSet.authProviders])]
    }
    return {
      acknowledged: true,
      matchedCount: user ? 1 : 0,
      modifiedCount: user ? 1 : 0,
    }
  },
}

const OTP = {
  findOneAndUpdate: async (filter, update) => {
    challenge = {
      _id: objectId(),
      email: filter.email,
      ...update.$set,
    }
    return challenge
  },
  findOne: () => ({
    select: async () => challenge,
  }),
  updateOne: async (_filter, update) => {
    challenge.attempts += update.$inc.attempts
  },
  deleteOne: async () => {
    challenge = null
  },
}

const Profile = {
  create: async (payload) => ({ _id: objectId(), ...payload }),
  findByIdAndDelete: async () => undefined,
}

class OAuth2Client {
  async verifyIdToken(options) {
    googleVerifications.push(options)
    return {
      getPayload: () => ({
        sub: "google-user-1",
        email: "google@example.com",
        email_verified: true,
        given_name: "Google",
        family_name: "Learner",
        picture: "https://example.com/avatar.png",
      }),
    }
  }
}

const installMock = (modulePath, exports) => {
  const filename = require.resolve(modulePath)
  require.cache[filename] = {
    id: filename,
    filename,
    loaded: true,
    exports,
  }
}

installMock("../models/User", User)
installMock("../models/OTP", OTP)
installMock("../models/Profile", Profile)
installMock("../utils/mailSender", async (...args) => {
  deliveries.push(args)
  return { response: "sent" }
})
installMock("google-auth-library", { OAuth2Client })

const controllerPath = require.resolve("../controllers/Auth")
delete require.cache[controllerPath]
const { googleLogin, login, logout, sendotp, signup } = require(controllerPath)

const createResponse = () => ({
  statusCode: 200,
  body: undefined,
  cookies: [],
  clearedCookies: [],
  headers: {},
  status(code) {
    this.statusCode = code
    return this
  },
  json(body) {
    this.body = body
    return this
  },
  cookie(name, value, options) {
    this.cookies.push({ name, value, options })
    return this
  },
  clearCookie(name, options) {
    this.clearedCookies.push({ name, options })
    return this
  },
  setHeader(name, value) {
    this.headers[name.toLowerCase()] = value
    return this
  },
})

test("OTP, signup, and local login preserve the frontend contract", async () => {
  const otpResponse = createResponse()
  await sendotp({ body: { email: " Learner@Example.com " } }, otpResponse)

  assert.equal(otpResponse.statusCode, 200)
  assert.equal(otpResponse.body.success, true)
  assert.match(otpResponse.body.otp, /^\d{6}$/)
  assert.equal(challenge.email, "learner@example.com")
  assert.notEqual(challenge.otpHash, otpResponse.body.otp)
  assert.equal(deliveries[0][0], "learner@example.com")

  const signupResponse = createResponse()
  await signup(
    {
      body: {
        accountType: "Student",
        firstName: "Test",
        lastName: "Learner",
        email: "LEARNER@example.com",
        password: "Password1",
        confirmPassword: "Password1",
        otp: otpResponse.body.otp,
        acceptTerms: true,
        acknowledgePrivacy: true,
        confirmEligibility: true,
      },
    },
    signupResponse
  )

  assert.equal(signupResponse.statusCode, 201)
  assert.equal(signupResponse.body.success, true)
  assert.equal(signupResponse.body.user.email, "learner@example.com")
  assert.equal(challenge, null)

  const loginResponse = createResponse()
  await login(
    { body: { email: "learner@example.com", password: "Password1" } },
    loginResponse
  )

  assert.equal(loginResponse.statusCode, 200)
  assert.equal(loginResponse.body.success, true)
  assert.equal(loginResponse.body.authenticated, true)
  assert.equal(loginResponse.body.requiresPolicyAcceptance, false)
  assert.equal(loginResponse.body.user.email, "learner@example.com")
  assert.equal(loginResponse.body.user.password, undefined)
  assert.equal(loginResponse.cookies[0].name, "studynotion_session")
  assert.equal(loginResponse.cookies[0].options.httpOnly, true)
  assert.equal(
    loginResponse.headers["cache-control"],
    "private, no-store, max-age=0"
  )

  const logoutResponse = createResponse()
  await logout(
    {
      cookies: { studynotion_session: loginResponse.cookies[0].value },
      get: () => undefined,
    },
    logoutResponse
  )
  assert.equal(logoutResponse.statusCode, 200)
  assert.equal(logoutResponse.body.success, true)
  assert.equal(users.get("learner@example.com").sessionVersion, 1)
  assert.ok(
    logoutResponse.clearedCookies.some(
      ({ name }) => name === "studynotion_session"
    )
  )

  const staleLogoutResponse = createResponse()
  await logout(
    {
      cookies: { studynotion_session: loginResponse.cookies[0].value },
      get: () => undefined,
    },
    staleLogoutResponse
  )
  assert.equal(staleLogoutResponse.statusCode, 200)
  assert.equal(users.get("learner@example.com").sessionVersion, 1)
})

test("first-time Google signup requires affirmative policy acknowledgement", async () => {
  const response = createResponse()
  await googleLogin({ body: { credential: "google-id-token" } }, response)

  assert.equal(response.statusCode, 400)
  assert.equal(response.body.success, false)
  assert.equal(users.has("google@example.com"), false)
})

test("Google credential exchange returns the same authenticated user shape", async () => {
  const response = createResponse()
  await googleLogin(
    {
      body: {
        credential: "google-id-token",
        acceptTerms: true,
        acknowledgePrivacy: true,
        confirmEligibility: true,
      },
    },
    response
  )

  assert.equal(response.statusCode, 200)
  assert.equal(response.body.success, true)
  assert.equal(response.body.authenticated, true)
  assert.equal(response.body.requiresPolicyAcceptance, false)
  assert.equal(response.body.user.email, "google@example.com")
  assert.equal(response.body.user.accountType, "Student")
  assert.equal(response.cookies[0].name, "studynotion_session")
  assert.deepEqual(googleVerifications[0], {
    idToken: "google-id-token",
    audience: process.env.GOOGLE_CLIENT_ID,
  })
})

test("Google login rejects an email already linked to another subject", async () => {
  const googleUser = users.get("google@example.com")
  googleUser.googleId = "different-google-subject"
  const response = createResponse()

  await googleLogin({ body: { credential: "google-id-token" } }, response)

  assert.equal(response.statusCode, 409)
  assert.equal(response.body.success, false)
  assert.equal(response.cookies.length, 0)
  googleUser.googleId = "google-user-1"
})

test("login does not issue a session cookie when the safe user response cannot load", async () => {
  failSafeUserLookup = true
  const response = createResponse()
  try {
    await login(
      { body: { email: "learner@example.com", password: "Password1" } },
      response
    )
  } finally {
    failSafeUserLookup = false
  }

  assert.equal(response.statusCode, 500)
  assert.equal(response.body.success, false)
  assert.equal(response.cookies.length, 0)
})

test("logout preserves a valid cookie when revocation storage is unavailable", async () => {
  const loginResponse = createResponse()
  await login(
    { body: { email: "learner@example.com", password: "Password1" } },
    loginResponse
  )
  const token = loginResponse.cookies[0].value
  const failedLogout = createResponse()
  failSessionRevocation = true
  try {
    await logout(
      {
        cookies: { studynotion_session: token },
        get: () => undefined,
      },
      failedLogout
    )
  } finally {
    failSessionRevocation = false
  }

  assert.equal(failedLogout.statusCode, 503)
  assert.equal(failedLogout.clearedCookies.length, 0)

  const retry = createResponse()
  await logout(
    {
      cookies: { studynotion_session: token },
      get: () => undefined,
    },
    retry
  )
  assert.equal(retry.statusCode, 200)
  assert.ok(retry.clearedCookies.length > 0)
})

test("public signup cannot provision an Admin account", async () => {
  const response = createResponse()
  await signup(
    {
      body: {
        accountType: "Admin",
        firstName: "Untrusted",
        lastName: "Admin",
        email: "untrusted-admin@example.com",
        password: "Password1",
        confirmPassword: "Password1",
        otp: "123456",
      },
    },
    response
  )

  assert.equal(response.statusCode, 400)
  assert.deepEqual(response.body, {
    success: false,
    message: "Invalid account type",
  })
  assert.equal(users.has("untrusted-admin@example.com"), false)
})
