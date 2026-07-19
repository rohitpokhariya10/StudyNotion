const assert = require("node:assert/strict")
const fs = require("node:fs/promises")
const os = require("node:os")
const path = require("node:path")
const test = require("node:test")

process.env.NODE_ENV = "test"
process.env.FRONTEND_URL = "http://localhost:3000"
process.env.MONGODB_URL = "mongodb://127.0.0.1:27017/studynotion-media-test"
process.env.JWT_SECRET = "media-test-jwt-secret-123456789012345678"
process.env.OTP_SECRET = "media-test-otp-secret-123456789012345678"

const cloudinary = require("cloudinary").v2
const {
  MediaUploadError,
  createPrivateMediaUrl,
  uploadImageToCloudinary,
  validateMediaFile,
} = require("../utils/imageUploader")
const { cleanupUploadedTempFiles } = require("../middleware/upload")

const withFixture = async (contents, callback) => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "studynotion-media-"))
  const filePath = path.join(directory, "upload.bin")
  try {
    await fs.writeFile(filePath, contents)
    return await callback(filePath)
  } finally {
    await fs.rm(directory, { force: true, recursive: true })
  }
}

test("media validation accepts matching signatures and rejects MIME spoofing", async () => {
  const png = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 0])
  await withFixture(png, (tempFilePath) =>
    validateMediaFile({ mimetype: "image/png", tempFilePath }, "image")
  )

  await withFixture(png, async (tempFilePath) => {
    await assert.rejects(
      validateMediaFile({ mimetype: "video/mp4", tempFilePath }, "video"),
      (error) => error instanceof MediaUploadError && error.statusCode === 415
    )
  })
})

test("completed uploads remove their temporary file", async () => {
  process.env.CLOUD_NAME = "test-cloud"
  process.env.CLOUD_API_KEY = "test-key"
  process.env.CLOUD_API_SECRET = "test-secret"
  const originalUpload = cloudinary.uploader.upload
  cloudinary.uploader.upload = async () => ({
    public_id: "profiles/test-image",
    secure_url: "https://res.cloudinary.com/test/image.png",
  })

  try {
    const png = Buffer.from([
      137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 0,
    ])
    await withFixture(png, async (tempFilePath) => {
      const result = await uploadImageToCloudinary(
        { mimetype: "image/png", tempFilePath },
        "profiles"
      )
      assert.equal(result.public_id, "profiles/test-image")
      await assert.rejects(fs.access(tempFilePath), { code: "ENOENT" })
    })
  } finally {
    cloudinary.uploader.upload = originalUpload
  }
})

test("route cleanup removes unconsumed and incorrectly named upload fields", async () => {
  const png = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 0])
  await withFixture(png, async (tempFilePath) => {
    await cleanupUploadedTempFiles({
      files: { unexpectedField: { tempFilePath } },
    })
    await assert.rejects(fs.access(tempFilePath), { code: "ENOENT" })
  })
})

test("private course-media links are signed, authenticated, and expiring", () => {
  process.env.CLOUD_NAME = "test-cloud"
  process.env.CLOUD_API_KEY = "test-key"
  process.env.CLOUD_API_SECRET = "test-secret"
  cloudinary.config({
    api_key: process.env.CLOUD_API_KEY,
    api_secret: process.env.CLOUD_API_SECRET,
    cloud_name: process.env.CLOUD_NAME,
    secure: true,
  })

  const url = createPrivateMediaUrl("courses/lesson-one", "mp4", {
    deliveryType: "authenticated",
    expiresInSeconds: 900,
    resourceType: "video",
  })

  assert.match(url, /^https:\/\/api\.cloudinary\.com\//)
  assert.match(url, /expires_at=/)
  assert.match(url, /signature=/)
  assert.match(url, /type=authenticated/)
})
