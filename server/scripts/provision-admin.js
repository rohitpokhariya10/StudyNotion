require("dotenv").config({ quiet: true })

const bcrypt = require("bcryptjs")
const mongoose = require("mongoose")

const Profile = require("../models/Profile")
const User = require("../models/User")
const { createPolicyAcceptance } = require("../utils/policyAcceptance")
const {
  isStrongPassword,
  isValidEmail,
  normalizeEmail,
  normalizePersonName,
} = require("../utils/validation")

const run = async () => {
  if (process.env.PROVISION_ADMIN_CONFIRM !== "provision-initial-admin") {
    throw new Error(
      "Set PROVISION_ADMIN_CONFIRM=provision-initial-admin for this one-time command"
    )
  }
  if (process.env.ADMIN_ACCEPT_POLICIES !== "true") {
    throw new Error(
      "Set ADMIN_ACCEPT_POLICIES=true after reviewing the current Terms and Privacy Notice"
    )
  }

  const mongoUrl = process.env.MONGODB_URI || process.env.MONGODB_URL
  const email = normalizeEmail(process.env.ADMIN_EMAIL)
  const password = process.env.ADMIN_PASSWORD
  const firstName = normalizePersonName(process.env.ADMIN_FIRST_NAME || "Platform")
  const lastName = normalizePersonName(
    process.env.ADMIN_LAST_NAME || "Administrator"
  )

  if (!mongoUrl) throw new Error("MONGODB_URI is required")
  if (!isValidEmail(email)) throw new Error("ADMIN_EMAIL is invalid")
  if (!isStrongPassword(password)) {
    throw new Error(
      "ADMIN_PASSWORD must be 8-72 bytes with uppercase, lowercase, and a number"
    )
  }
  if (!firstName || !lastName) throw new Error("Admin names are invalid")

  await mongoose.connect(mongoUrl, { autoIndex: false })

  if (await User.exists({ accountType: "Admin", active: true })) {
    throw new Error(
      "An active admin already exists; manage additional admins through a controlled process"
    )
  }
  if (await User.exists({ email })) {
    throw new Error("ADMIN_EMAIL already belongs to an account")
  }

  const profile = await Profile.create({ about: "Platform administrator" })
  try {
    await User.create({
      firstName,
      lastName,
      email,
      password: await bcrypt.hash(password, 12),
      authProviders: ["local"],
      accountType: "Admin",
      active: true,
      approved: true,
      instructorApprovalStatus: "NotApplicable",
      additionalDetails: profile._id,
      image: "",
      policyAcceptances: [createPolicyAcceptance("admin_provisioning")],
    })
  } catch (error) {
    await Profile.findByIdAndDelete(profile._id)
    throw error
  }

  console.log("Initial admin account created successfully")
}

run()
  .catch((error) => {
    console.error("Admin provisioning failed:", error.message)
    process.exitCode = 1
  })
  .finally(async () => {
    await mongoose.disconnect()
  })
