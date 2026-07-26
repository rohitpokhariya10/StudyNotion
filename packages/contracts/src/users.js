const { z } = require("zod")

const {
  isoDateSchema,
  isoDateTimeSchema,
  nullableImageUrlSchema,
  objectIdSchema,
} = require("./common")

const accountTypeSchema = z.enum(["Admin", "Student", "Instructor"])
const authProviderSchema = z.enum(["local", "google"])
const instructorApprovalStatusSchema = z.enum([
  "NotApplicable",
  "Pending",
  "Approved",
  "Rejected",
])
const genderSchema = z.enum([
  "Female",
  "Male",
  "Non-Binary",
  "Other",
  "Prefer not to say",
])
const authProvidersSchema = z
  .array(authProviderSchema)
  .min(1)
  .max(2)
  .refine((providers) => new Set(providers).size === providers.length, {
    message: "Authentication providers must be unique",
  })
  .meta({ uniqueItems: true })

const profileDetailsSchema = z.strictObject({
  about: z.string().max(1000).nullable(),
  contactNumber: z
    .string()
    .regex(/^\+?[1-9]\d{7,14}$/)
    .nullable(),
  dateOfBirth: isoDateSchema.nullable(),
  gender: genderSchema.nullable(),
})

const publicInstructorSchema = z.strictObject({
  id: objectIdSchema,
  name: z.string().min(1).max(161),
  imageUrl: nullableImageUrlSchema,
  about: z.string().max(1000).nullable(),
})

const userIdentitySchema = z.strictObject({
  id: objectIdSchema,
  firstName: z.string().min(1).max(80),
  lastName: z.string().max(80),
  email: z.email().max(254),
  accountType: accountTypeSchema,
  imageUrl: nullableImageUrlSchema,
  authProviders: authProvidersSchema,
})

const userProfileSchema = z.strictObject({
  ...userIdentitySchema.shape,
  active: z.boolean(),
  approved: z.boolean(),
  instructorApprovalStatus: instructorApprovalStatusSchema,
  profile: profileDetailsSchema,
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
})

module.exports = {
  accountTypeSchema,
  authProviderSchema,
  authProvidersSchema,
  genderSchema,
  instructorApprovalStatusSchema,
  profileDetailsSchema,
  publicInstructorSchema,
  userIdentitySchema,
  userProfileSchema,
}
