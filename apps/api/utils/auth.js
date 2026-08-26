const jwt = require("jsonwebtoken")

const env = require("../config/env")

const SESSION_DURATION_MS = 12 * 60 * 60 * 1000

const readBearerToken = (authorization) => {
  if (typeof authorization !== "string") return null
  const match = authorization.match(/^Bearer\s+([^\s]+)$/i)
  return match?.[1] || null
}

const createSessionToken = (user) =>
  jwt.sign(
    {
      email: user.email,
      id: user._id.toString(),
      accountType: user.accountType,
      sessionVersion: Number.isInteger(user.sessionVersion)
        ? user.sessionVersion
        : 0,
    },
    process.env.JWT_SECRET,
    {
      algorithm: "HS256",
      audience: "studynotion-web",
      expiresIn: "12h",
      issuer: "studynotion-api",
    }
  )

const sessionCookieOptions = () => ({
  domain: env.cookie.domain,
  httpOnly: true,
  maxAge: SESSION_DURATION_MS,
  path: "/",
  sameSite: env.cookie.sameSite,
  secure: env.cookie.secure,
})

const clearCookie = (res, name) => {
  const options = sessionCookieOptions()
  delete options.maxAge
  res.clearCookie(name, options)

  // A legacy host-only cookie is a different cookie from one scoped with a
  // Domain attribute. Clear both variants during migrations.
  if (options.domain) {
    const hostOnlyOptions = { ...options }
    delete hostOnlyOptions.domain
    res.clearCookie(name, hostOnlyOptions)
  }
}

exports.issueSession = (res, user) => {
  const token = createSessionToken(user)
  res.cookie(env.cookie.name, token, sessionCookieOptions())
  if (env.cookie.name !== "token") clearCookie(res, "token")
  return token
}

exports.clearSession = (res) => {
  clearCookie(res, env.cookie.name)
  if (env.cookie.name !== "token") clearCookie(res, "token")
}

exports.readSessionToken = (req) => {
  const bearerToken = readBearerToken(req.get("authorization"))
  if (bearerToken) return bearerToken
  return req.cookies?.[env.cookie.name] || req.cookies?.token || null
}

exports.verifySessionToken = (token) =>
  jwt.verify(token, process.env.JWT_SECRET, {
    algorithms: ["HS256"],
    audience: "studynotion-web",
    issuer: "studynotion-api",
  })
