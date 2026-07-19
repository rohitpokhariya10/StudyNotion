const bcrypt = require("bcryptjs")
const crypto = require("crypto")

const emailTemplate = require("../mail/templates/emailVerificationTemplate")
const { passwordUpdated } = require("../mail/templates/passwordUpdate")
const OTP = require("../models/OTP")
const Profile = require("../models/Profile")
const User = require("../models/User")
const env = require("../config/env")
const {
  clearSession,
  issueSession,
  readSessionToken,
  verifySessionToken,
} = require("../utils/auth")
const mailSender = require("../utils/mailSender")
const { verifyGoogleIdToken } = require("../utils/googleIdentity")
const {
  createPolicyAcceptance,
  hasAffirmativePolicyAcceptance,
  hasCurrentPolicyAcceptance,
} = require("../utils/policyAcceptance")
const {
  isPasswordWithinBcryptLimit,
  isStrongPassword,
  isValidEmail,
  normalizeEmail,
  normalizePersonName,
} = require("../utils/validation")

const ALLOWED_PUBLIC_ACCOUNT_TYPES = new Set(["Student", "Instructor"])
const OTP_TTL_MS = 10 * 60 * 1000
const OTP_MAX_ATTEMPTS = 5
const DUMMY_PASSWORD_HASH =
  "$2b$12$3xycSovjh4A7o6onY/0TKu4/ST8GDvYslYIHvsdHPfJyQ3Ri7I7JK"

const hashOtp = (email, otp) =>
  crypto
    .createHmac("sha256", process.env.OTP_SECRET)
    .update(`${email}:${otp}`)
    .digest("hex")

const otpMatches = (storedHash, candidateHash) => {
  const stored = Buffer.from(storedHash, "hex")
  const candidate = Buffer.from(candidateHash, "hex")
  return stored.length === candidate.length && crypto.timingSafeEqual(stored, candidate)
}

const setPrivateNoStore = (res) => {
  res.setHeader("Cache-Control", "private, no-store, max-age=0")
  res.setHeader("Pragma", "no-cache")
}

const sendAuthenticatedResponse = async (res, user, message) => {
  setPrivateNoStore(res)
  const safeUser = await User.findById(user._id)
    .select("+policyAcceptances")
    .populate("additionalDetails")
  if (!safeUser) throw new Error("Authenticated user disappeared before response")
  issueSession(res, user)
  return res.status(200).json({
    success: true,
    authenticated: true,
    requiresPolicyAcceptance: !hasCurrentPolicyAcceptance(safeUser),
    user: safeUser,
    message,
  })
}

exports.signup = async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      password,
      confirmPassword,
      accountType,
      contactNumber,
      otp,
    } = req.body || {}
    const email = normalizeEmail(req.body?.email)
    const normalizedFirstName = normalizePersonName(firstName)
    const normalizedLastName = normalizePersonName(lastName)

    if (
      !normalizedFirstName ||
      !normalizedLastName ||
      !isValidEmail(email) ||
      !password ||
      !confirmPassword ||
      !otp
    ) {
      return res.status(400).json({
        success: false,
        message: "Please provide all required signup fields",
      })
    }

    if (!ALLOWED_PUBLIC_ACCOUNT_TYPES.has(accountType)) {
      return res.status(400).json({
        success: false,
        message: "Invalid account type",
      })
    }

    if (!hasAffirmativePolicyAcceptance(req.body)) {
      return res.status(400).json({
        success: false,
        message:
          "You must accept the Terms, acknowledge the Privacy Notice, and confirm age or guardian eligibility",
      })
    }

    if (password !== confirmPassword || !isStrongPassword(password)) {
      return res.status(400).json({
        success: false,
        message:
          "Password must match, stay within 72 bytes, and include at least 8 characters, uppercase, lowercase, and a number",
      })
    }

    if (await User.exists({ email })) {
      return res.status(409).json({
        success: false,
        message: "An account already exists for this email",
      })
    }

    const challenge = await OTP.findOne({ email }).select("+otpHash")
    if (
      !challenge ||
      challenge.expiresAt <= new Date() ||
      challenge.attempts >= OTP_MAX_ATTEMPTS
    ) {
      return res.status(400).json({
        success: false,
        message: "The verification code is invalid or expired",
      })
    }

    if (!otpMatches(challenge.otpHash, hashOtp(email, String(otp)))) {
      await OTP.updateOne({ _id: challenge._id }, { $inc: { attempts: 1 } })
      return res.status(400).json({
        success: false,
        message: "The verification code is invalid or expired",
      })
    }

    const profile = await Profile.create({
      about: null,
      contactNumber: contactNumber || null,
      dateOfBirth: null,
      gender: null,
    })

    let user
    try {
      user = await User.create({
        firstName: normalizedFirstName,
        lastName: normalizedLastName,
        email,
        password: await bcrypt.hash(password, 12),
        authProviders: ["local"],
        accountType,
        approved: accountType === "Student",
        instructorApprovalStatus:
          accountType === "Instructor" ? "Pending" : "NotApplicable",
        additionalDetails: profile._id,
        image: "",
        policyAcceptances: [createPolicyAcceptance("email_signup")],
      })
    } catch (error) {
      await Profile.findByIdAndDelete(profile._id)
      throw error
    }

    await OTP.deleteOne({ _id: challenge._id })

    setPrivateNoStore(res)
    return res.status(201).json({
      success: true,
      user,
      message:
        accountType === "Instructor"
          ? "Instructor account created and awaiting approval"
          : "User registered successfully",
    })
  } catch (error) {
    console.error("Signup failed:", error.message)
    return res.status(500).json({
      success: false,
      message: "User registration failed",
    })
  }
}

exports.login = async (req, res) => {
  try {
    const email = normalizeEmail(req.body?.email)
    const { password } = req.body || {}

    if (!isValidEmail(email) || !isPasswordWithinBcryptLimit(password)) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      })
    }

    const user = await User.findOne({ email })
      .select("+password")
      .populate("additionalDetails")
    const passwordMatches = await bcrypt.compare(
      password,
      user?.password || DUMMY_PASSWORD_HASH
    )

    if (!user || !passwordMatches) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      })
    }

    if (!user.active || !user.approved) {
      return res.status(403).json({
        success: false,
        message: "This account is inactive or awaiting approval",
      })
    }

    return await sendAuthenticatedResponse(res, user, "Login successful")
  } catch (error) {
    console.error("Login failed:", error.message)
    return res.status(500).json({ success: false, message: "Login failed" })
  }
}

exports.googleLogin = async (req, res) => {
  try {
    const { credential } = req.body || {}
    if (!credential || !process.env.GOOGLE_CLIENT_ID) {
      return res.status(400).json({
        success: false,
        message: "Google sign-in is not configured or the credential is missing",
      })
    }

    let ticket
    try {
      ticket = await verifyGoogleIdToken({
        idToken: credential,
        audience: process.env.GOOGLE_CLIENT_ID,
      })
    } catch {
      return res.status(401).json({
        success: false,
        message: "Google sign-in could not be verified",
      })
    }
    const payload = ticket.getPayload()

    if (!payload?.sub || !payload.email || payload.email_verified !== true) {
      return res.status(401).json({
        success: false,
        message: "Google could not verify this account",
      })
    }

    const email = normalizeEmail(payload.email)
    if (!isValidEmail(email)) {
      return res.status(401).json({
        success: false,
        message: "Google returned an invalid email address",
      })
    }
    let user = await User.findOne({
      $or: [{ googleId: payload.sub }, { email }],
    }).select("+googleId +policyAcceptances")

    if (user?.googleId && user.googleId !== payload.sub) {
      return res.status(409).json({
        success: false,
        message: "This email is linked to a different Google identity",
      })
    }

    if (!user) {
      if (!hasAffirmativePolicyAcceptance(req.body)) {
        return res.status(400).json({
          success: false,
          message:
            "Accept the Terms, acknowledge the Privacy Notice, and confirm age or guardian eligibility before creating an account",
        })
      }

      const profile = await Profile.create({
        about: null,
        dateOfBirth: null,
        gender: null,
      })
      try {
        const firstName =
          normalizePersonName(payload.given_name, { allowEmpty: true }) ||
          normalizePersonName(payload.name, { allowEmpty: true }) ||
          "Learner"
        const lastName =
          normalizePersonName(payload.family_name, { allowEmpty: true }) || ""
        user = await User.create({
          firstName,
          lastName,
          email,
          authProviders: ["google"],
          googleId: payload.sub,
          accountType: "Student",
          approved: true,
          instructorApprovalStatus: "NotApplicable",
          additionalDetails: profile._id,
          image: typeof payload.picture === "string" ? payload.picture : "",
          policyAcceptances: [createPolicyAcceptance("google_signup")],
        })
      } catch (error) {
        await Profile.findByIdAndDelete(profile._id)
        throw error
      }
    } else if (!user.googleId) {
      await User.updateOne(
        { _id: user._id },
        {
          $set: { googleId: payload.sub },
          $addToSet: { authProviders: "google" },
        }
      )
      user = await User.findById(user._id)
    }

    if (!user.active || !user.approved) {
      return res.status(403).json({
        success: false,
        message: "This account is inactive or awaiting approval",
      })
    }

    return await sendAuthenticatedResponse(res, user, "Google sign-in successful")
  } catch (error) {
    console.error("Google sign-in failed:", error.message)
    return res.status(500).json({
      success: false,
      message: "Google sign-in is temporarily unavailable",
    })
  }
}

exports.sendotp = async (req, res) => {
  const email = normalizeEmail(req.body?.email)
  try {
    if (!isValidEmail(email)) {
      return res.status(400).json({
        success: false,
        message: "A valid email address is required",
      })
    }

    if (await User.exists({ email })) {
      return res.status(409).json({
        success: false,
        message: "An account already exists for this email",
      })
    }

    const otp = crypto.randomInt(100000, 1000000).toString()
    await OTP.findOneAndUpdate(
      { email },
      {
        $set: {
          otpHash: hashOtp(email, otp),
          attempts: 0,
          expiresAt: new Date(Date.now() + OTP_TTL_MS),
          createdAt: new Date(),
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    )

    try {
      await mailSender(email, "Your StudyNotion verification code", emailTemplate(otp))
    } catch (error) {
      await OTP.deleteOne({ email })
      throw error
    }

    setPrivateNoStore(res)
    return res.status(200).json({
      success: true,
      message: "Verification code sent",
      ...(env.allowDevOtp ? { otp } : {}),
    })
  } catch (error) {
    console.error("OTP delivery failed:", error.message)
    return res.status(502).json({
      success: false,
      message: "Verification code could not be delivered",
    })
  }
}

exports.changePassword = async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body || {}
    if (
      !isPasswordWithinBcryptLimit(oldPassword) ||
      !isStrongPassword(newPassword)
    ) {
      return res.status(400).json({
        success: false,
        message: "A valid old password and strong new password are required",
      })
    }

    const user = await User.findById(req.user.id).select("+password")
    if (!user?.password || !(await bcrypt.compare(oldPassword, user.password))) {
      return res.status(401).json({
        success: false,
        message: "The current password is incorrect",
      })
    }

    user.password = await bcrypt.hash(newPassword, 12)
    if (!user.authProviders.includes("local")) user.authProviders.push("local")
    user.sessionVersion = (user.sessionVersion || 0) + 1
    await user.save()
    issueSession(res, user)

    mailSender(
      user.email,
      "Your StudyNotion password was updated",
      passwordUpdated(
        user.email,
        `Password updated successfully for ${user.firstName} ${user.lastName}`
      )
    ).catch((error) => console.error("Password email failed:", error.message))

    return res.status(200).json({
      success: true,
      message: "Password updated successfully",
    })
  } catch (error) {
    console.error("Password update failed:", error.message)
    return res.status(500).json({
      success: false,
      message: "Password update failed",
    })
  }
}

exports.acceptPolicies = async (req, res) => {
  try {
    if (!hasAffirmativePolicyAcceptance(req.body)) {
      return res.status(400).json({
        success: false,
        message:
          "Accept the Terms, acknowledge the Privacy Notice, and confirm age or guardian eligibility",
      })
    }

    const user = await User.findById(req.user.id).select("+policyAcceptances")
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" })
    }

    if (!hasCurrentPolicyAcceptance(user)) {
      user.policyAcceptances.push(createPolicyAcceptance("account_update"))
      await user.save()
    }

    return res.status(200).json({
      success: true,
      requiresPolicyAcceptance: false,
      message: "Policy acceptance recorded",
    })
  } catch (error) {
    console.error("Policy acceptance failed:", error.message)
    return res.status(500).json({
      success: false,
      message: "Policy acceptance could not be recorded",
    })
  }
}

exports.logout = async (req, res) => {
  const token = readSessionToken(req)
  if (!token) {
    clearSession(res)
    return res.status(200).json({ success: true, message: "Logged out" })
  }

  try {
    const decoded = verifySessionToken(token)
    if (decoded?.id && User.db.base.isValidObjectId(decoded.id)) {
      await User.updateOne(
        {
          _id: decoded.id,
          sessionVersion: Number.isInteger(decoded.sessionVersion)
            ? decoded.sessionVersion
            : 0,
        },
        { $inc: { sessionVersion: 1 } }
      )
    }
  } catch (error) {
    // Invalid or expired cookies cannot be retried and should be removed. A
    // database failure leaves a valid token usable, so preserve the cookie and
    // let the caller retry revocation.
    if (
      !["JsonWebTokenError", "TokenExpiredError", "NotBeforeError"].includes(
        error.name
      )
    ) {
      console.error("Session revocation failed:", error.message)
      return res.status(503).json({
        success: false,
        message: "Session could not be revoked; retry logout",
      })
    }
  }

  clearSession(res)
  return res.status(200).json({ success: true, message: "Logged out" })
}
