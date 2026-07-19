const cloudinary = require("cloudinary").v2

let configured = false

const hasCredentials = () =>
  Boolean(
    process.env.CLOUD_NAME &&
      process.env.CLOUD_API_KEY &&
      process.env.CLOUD_API_SECRET
  )

const cloudinaryConnect = () => {
  if (!hasCredentials()) {
    configured = false
    console.warn("Cloudinary uploads are disabled because credentials are not configured")
    return false
  }

  cloudinary.config({
    cloud_name: process.env.CLOUD_NAME,
    api_key: process.env.CLOUD_API_KEY,
    api_secret: process.env.CLOUD_API_SECRET,
    hide_sensitive: true,
    secure: true,
    signature_algorithm: "sha256",
  })
  configured = true
  console.log("Cloudinary configuration loaded")
  return true
}

module.exports = {
  cloudinaryConnect,
  isCloudinaryConfigured: () => configured,
}
