const { isV2Request, sendV2Error } = require("./v2ErrorEnvelope")

const notFoundHandler = (req, res) => {
  if (isV2Request(req)) {
    return sendV2Error(req, res, {
      code: "ROUTE_NOT_FOUND",
      message: "Route not found",
      statusCode: 404,
    })
  }
  return res.status(404).json({ success: false, message: "Route not found" })
}

module.exports = { notFoundHandler }
