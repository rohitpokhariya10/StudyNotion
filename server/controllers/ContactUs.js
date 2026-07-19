const { contactUsEmail } = require("../mail/templates/contactFormRes")
const mailSender = require("../utils/mailSender")

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const COUNTRY_CODE_PATTERN = /^\+\d{1,4}$/
const PHONE_PATTERN = /^\d{6,14}$/

const readText = (value, maxLength) =>
  typeof value === "string" ? value.trim().slice(0, maxLength + 1) : ""

exports.contactUsController = async (req, res) => {
  const email = readText(req.body?.email, 254).toLowerCase()
  const firstName = readText(req.body?.firstname, 80)
  const lastName = readText(req.body?.lastname, 80)
  const message = readText(req.body?.message, 5000)
  const phoneNumber = readText(req.body?.phoneNo, 14).replace(/[\s()-]/g, "")
  const countryCode = readText(req.body?.countrycode, 5)

  const combinedPhoneDigits = `${countryCode.replace("+", "")}${phoneNumber}`
  if (
    !EMAIL_PATTERN.test(email) ||
    email.length > 254 ||
    !firstName ||
    firstName.length > 80 ||
    !message ||
    !COUNTRY_CODE_PATTERN.test(countryCode) ||
    !PHONE_PATTERN.test(phoneNumber) ||
    combinedPhoneDigits.length > 15 ||
    lastName.length > 80 ||
    message.length > 5000
  ) {
    return res.status(400).json({
      success: false,
      message: "Please provide valid contact details and a message",
    })
  }

  const recipient = process.env.CONTACT_RECIPIENT || process.env.EMAIL_REPLY_TO
  if (!recipient) {
    return res.status(503).json({
      success: false,
      message: "Contact delivery is not configured",
    })
  }

  try {
    await mailSender(
      recipient,
      "New StudyNotion contact request",
      contactUsEmail(
        email,
        firstName,
        lastName,
        message,
        phoneNumber,
        countryCode
      ),
      { replyTo: email }
    )

    return res.status(202).json({
      success: true,
      message: "Your message has been received",
    })
  } catch (error) {
    console.error("Contact email delivery failed:", error.message)
    return res.status(502).json({
      success: false,
      message: "Your message could not be delivered. Please try again later.",
    })
  }
}
