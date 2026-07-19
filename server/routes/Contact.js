const express = require("express")

const { contactUsController } = require("../controllers/ContactUs")
const {
  contactIdentityLimiter,
  contactIpLimiter,
} = require("../middleware/rateLimiters")

const router = express.Router()

router.post("/contact", contactIpLimiter, contactIdentityLimiter, contactUsController)

module.exports = router
