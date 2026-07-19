const assert = require("node:assert/strict")
const test = require("node:test")

const createResponse = () => ({
  body: undefined,
  statusCode: 200,
  json(body) {
    this.body = body
    return this
  },
  status(statusCode) {
    this.statusCode = statusCode
    return this
  },
})

const installMock = (modulePath, exports) => {
  const filename = require.resolve(modulePath)
  require.cache[filename] = { id: filename, filename, loaded: true, exports }
}

const deliveries = []
installMock("../utils/mailSender", async (...args) => {
  deliveries.push(args)
  return { response: "email-id" }
})
delete require.cache[require.resolve("../controllers/ContactUs")]
const { contactUsController } = require("../controllers/ContactUs")

test("contact submissions reject malformed PII without sending email", async () => {
  process.env.CONTACT_RECIPIENT = "support@example.com"
  deliveries.length = 0
  const response = createResponse()

  await contactUsController(
    {
      body: {
        countrycode: "+91",
        email: "not-an-email",
        firstname: "Learner",
        message: "Please contact me",
        phoneNo: "9876543210",
      },
    },
    response
  )

  assert.equal(response.statusCode, 400)
  assert.equal(deliveries.length, 0)
})

test("contact submissions go to support with a safe user reply-to", async () => {
  process.env.CONTACT_RECIPIENT = "support@example.com"
  deliveries.length = 0
  const response = createResponse()

  await contactUsController(
    {
      body: {
        countrycode: "+91",
        email: "learner@example.com",
        firstname: "<Learner>",
        lastname: "Example",
        message: "I need <strong>course</strong> help.",
        phoneNo: "9876543210",
      },
    },
    response
  )

  assert.equal(response.statusCode, 202)
  assert.equal(deliveries.length, 1)
  assert.equal(deliveries[0][0], "support@example.com")
  assert.deepEqual(deliveries[0][3], { replyTo: "learner@example.com" })
  assert.match(deliveries[0][2], /&lt;Learner&gt;/)
  assert.doesNotMatch(deliveries[0][2], /<strong>course<\/strong>/)
})
