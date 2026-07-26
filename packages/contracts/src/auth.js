const { z } = require("zod")

const { createSuccessResponseSchema } = require("./common")
const { userIdentitySchema } = require("./users")

const utf8Encoder = new TextEncoder()

const loginPasswordSchema = z
  .string()
  .max(128)
  .refine((value) => utf8Encoder.encode(value).length <= 72, {
    message: "Password exceeds the supported encoded length",
  })
  .describe("Login password with a maximum UTF-8 encoded length of 72 bytes.")

const localLoginRequestSchema = z.strictObject({
  email: z.email().max(254),
  // Preserve login compatibility with credentials created before the current
  // signup-strength policy while enforcing bcrypt's exact byte ceiling.
  password: loginPasswordSchema,
})

const authenticatedSessionSchema = z.strictObject({
  authenticated: z.literal(true),
  deletionPending: z.boolean(),
  requiresPolicyAcceptance: z.boolean(),
  user: userIdentitySchema,
})

const signedOutSessionSchema = z.strictObject({
  authenticated: z.literal(false),
  deletionPending: z.literal(false),
  requiresPolicyAcceptance: z.literal(false),
  user: z.null(),
})

const authSessionSchema = z
  .discriminatedUnion("authenticated", [
    authenticatedSessionSchema,
    signedOutSessionSchema,
  ])
  .describe(
    "A session whose authenticated state, user presence, and protected account gates are internally consistent."
  )

const authSessionResponseSchema = createSuccessResponseSchema(authSessionSchema)

module.exports = {
  authSessionResponseSchema,
  authSessionSchema,
  authenticatedSessionSchema,
  loginPasswordSchema,
  localLoginRequestSchema,
  signedOutSessionSchema,
}
