const express = require("express")

const {
  acceptPolicies,
  changePassword,
  googleLogin,
  login,
  logout,
  sendotp,
  signup,
} = require("../controllers/Auth")
const { resetPassword, resetPasswordToken } = require("../controllers/resetPassword")
const { auth } = require("../middleware/auth")
const {
  loginIdentityLimiter,
  loginIpLimiter,
  otpIdentityLimiter,
  otpIpLimiter,
  passwordResetIdentityLimiter,
  passwordResetIpLimiter,
  signupIdentityLimiter,
  signupIpLimiter,
} = require("../middleware/rateLimiters")

const router = express.Router()

router.post("/login", loginIpLimiter, loginIdentityLimiter, login)
router.post("/google", loginIpLimiter, googleLogin)
router.post("/logout", logout)
router.post("/accept-policies", auth, acceptPolicies)
router.post("/signup", signupIpLimiter, signupIdentityLimiter, signup)
router.post("/sendotp", otpIpLimiter, otpIdentityLimiter, sendotp)
router.post("/changepassword", passwordResetIpLimiter, auth, changePassword)
router.post(
  "/reset-password-token",
  passwordResetIpLimiter,
  passwordResetIdentityLimiter,
  resetPasswordToken
)
router.post("/reset-password", passwordResetIpLimiter, resetPassword)

module.exports = router
