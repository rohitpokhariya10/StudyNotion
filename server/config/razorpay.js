const Razorpay = require("razorpay")

const env = require("./env")
const logger = require("../utils/logger")

const hasCredentials =
  process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_SECRET

if (!hasCredentials) logger.warn("razorpay.disabled_missing_credentials")

const instance = hasCredentials
  ? new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_SECRET,
    })
  : null

// Razorpay's SDK leaves Axios at its default timeout of zero. Bound the
// underlying transport so stalled sockets are actively aborted.
if (instance?.api?.rq?.defaults) {
  instance.api.rq.defaults.timeout = env.razorpayTimeoutMs
}

exports.instance = instance
