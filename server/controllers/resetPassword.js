const bcrypt = require("bcryptjs")
const crypto = require("crypto")

const env = require("../config/env")
const { emailLayout } = require("../mail/templates/templateUtils")
const User = require("../models/User")
const mailSender = require("../utils/mailSender")
const {
  isStrongPassword,
  isValidEmail,
  normalizeEmail,
} = require("../utils/validation")

const RESET_TOKEN_TTL_MS = 30 * 60 * 1000
const GENERIC_RESET_MESSAGE =
  "If an account exists for this email, a password reset link has been sent"

const hashToken = (token) => crypto.createHash("sha256").update(token).digest("hex")

exports.resetPasswordToken = async (req, res) => {
  const email = normalizeEmail(req.body?.email)
  if (!isValidEmail(email)) {
    return res.status(400).json({
      success: false,
      message: "A valid email address is required",
    })
  }

  try {
    const user = await User.findOne({ email }).select("_id email")
    if (!user) {
      return res.status(200).json({ success: true, message: GENERIC_RESET_MESSAGE })
    }

    const token = crypto.randomBytes(32).toString("hex")
    const tokenHash = hashToken(token)
    await User.updateOne(
      { _id: user._id },
      {
        $set: {
          resetPasswordTokenHash: tokenHash,
          resetPasswordExpires: new Date(Date.now() + RESET_TOKEN_TTL_MS),
        },
        $unset: { token: 1 },
      }
    )

    // Keep the bearer token in the URL fragment. Fragments are handled by the
    // browser and are never sent to the web server, reverse proxy, CDN, or
    // access logs.
    const resetUrl = new URL("/update-password", env.appUrl)
    resetUrl.hash = new URLSearchParams({ token }).toString()

    try {
      await mailSender(
        email,
        "Reset your StudyNotion password",
        emailLayout({
          title: "Reset your password",
          body: "<p>Use the secure link below to reset your password. It expires in 30 minutes. If you did not request this, you can ignore this email.</p>",
          ctaHref: resetUrl.toString(),
          ctaLabel: "Reset password",
        })
      )
    } catch (error) {
      await User.updateOne(
        { _id: user._id, resetPasswordTokenHash: tokenHash },
        { $unset: { resetPasswordTokenHash: 1, resetPasswordExpires: 1 } }
      )
      throw error
    }

    return res.status(200).json({ success: true, message: GENERIC_RESET_MESSAGE })
  } catch (error) {
    console.error("Password reset email failed:", error.message)
    return res.status(502).json({
      success: false,
      message: "Password reset email could not be sent",
    })
  }
}

exports.resetPassword = async (req, res) => {
  const { confirmPassword, password, token } = req.body || {}

  if (!token || password !== confirmPassword || !isStrongPassword(password)) {
    return res.status(400).json({
      success: false,
      message:
        "Passwords must match, stay within 72 bytes, and include at least 8 characters, uppercase, lowercase, and a number",
    })
  }

  try {
    const encryptedPassword = await bcrypt.hash(password, 12)
    const user = await User.findOneAndUpdate(
      {
        resetPasswordTokenHash: hashToken(String(token)),
        resetPasswordExpires: { $gt: new Date() },
      },
      {
        $set: { password: encryptedPassword },
        $addToSet: { authProviders: "local" },
        $inc: { sessionVersion: 1 },
        $unset: {
          resetPasswordTokenHash: 1,
          resetPasswordExpires: 1,
          token: 1,
        },
      },
      { new: true }
    )

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Token is invalid or expired",
      })
    }

    return res.status(200).json({
      success: true,
      message: "Password Reset Successful",
    })
  } catch (error) {
    console.error("Password reset failed:", error.message)
    return res.status(500).json({
      success: false,
      message: "Password could not be reset",
    })
  }
}
