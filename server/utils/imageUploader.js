const fs = require("node:fs/promises")

const cloudinary = require("cloudinary").v2

const IMAGE_MIME_TYPES = new Set([
  "image/avif",
  "image/jpeg",
  "image/png",
  "image/webp",
])
const VIDEO_MIME_TYPES = new Set([
  "video/mp4",
  "video/quicktime",
  "video/webm",
])

class MediaUploadError extends Error {
  constructor(message, statusCode = 400) {
    super(message)
    this.name = "MediaUploadError"
    this.statusCode = statusCode
  }
}

const normalizeMimeType = (mimeType = "") => {
  const normalized = mimeType.trim().toLowerCase()
  if (normalized === "image/jpg") return "image/jpeg"
  if (normalized === "video/x-m4v") return "video/mp4"
  return normalized
}

const detectMimeType = (buffer) => {
  if (
    buffer.length >= 8 &&
    buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
  ) {
    return "image/png"
  }

  if (
    buffer.length >= 3 &&
    buffer[0] === 0xff &&
    buffer[1] === 0xd8 &&
    buffer[2] === 0xff
  ) {
    return "image/jpeg"
  }

  if (
    buffer.length >= 12 &&
    buffer.toString("ascii", 0, 4) === "RIFF" &&
    buffer.toString("ascii", 8, 12) === "WEBP"
  ) {
    return "image/webp"
  }

  if (buffer.length >= 12 && buffer.toString("ascii", 4, 8) === "ftyp") {
    const brand = buffer.toString("ascii", 8, 12)
    if (brand === "avif" || brand === "avis") return "image/avif"
    if (brand === "qt  ") return "video/quicktime"
    return "video/mp4"
  }

  if (
    buffer.length >= 4 &&
    buffer[0] === 0x1a &&
    buffer[1] === 0x45 &&
    buffer[2] === 0xdf &&
    buffer[3] === 0xa3
  ) {
    return "video/webm"
  }

  return null
}

const readFileSignature = async (tempFilePath) => {
  const handle = await fs.open(tempFilePath, "r")
  try {
    const signature = Buffer.alloc(32)
    const { bytesRead } = await handle.read(signature, 0, signature.length, 0)
    return signature.subarray(0, bytesRead)
  } finally {
    await handle.close()
  }
}

const validateMediaFile = async (file, resourceType) => {
  if (!file || typeof file !== "object" || !file.tempFilePath) {
    throw new MediaUploadError("A valid uploaded file is required")
  }
  if (file.truncated) {
    throw new MediaUploadError("The uploaded file exceeds the permitted size", 413)
  }

  const declaredMimeType = normalizeMimeType(file.mimetype)
  const allowedMimeTypes = resourceType === "video" ? VIDEO_MIME_TYPES : IMAGE_MIME_TYPES
  if (!allowedMimeTypes.has(declaredMimeType)) {
    throw new MediaUploadError(`Unsupported ${resourceType} file type`, 415)
  }

  let detectedMimeType
  try {
    detectedMimeType = detectMimeType(await readFileSignature(file.tempFilePath))
  } catch {
    throw new MediaUploadError("The uploaded file could not be read")
  }

  if (!detectedMimeType || detectedMimeType !== declaredMimeType) {
    throw new MediaUploadError("The uploaded file content does not match its file type", 415)
  }
}

const normalizeFolder = (folder) => {
  const value = String(folder || "studynotion").trim().replace(/^\/+|\/+$/g, "")
  if (!value || value.length > 120 || !/^[A-Za-z0-9/_-]+$/.test(value)) {
    throw new MediaUploadError("The media folder configuration is invalid", 500)
  }
  return value
}

const hasCloudinaryCredentials = () =>
  Boolean(
    process.env.CLOUD_NAME &&
      process.env.CLOUD_API_KEY &&
      process.env.CLOUD_API_SECRET
  )

const uploadImageToCloudinary = async (file, folder, options = {}) => {
  const normalizedOptions =
    typeof options === "number" ? { height: options } : { ...options }
  const resourceType = normalizedOptions.resourceType || "image"
  const deliveryType = normalizedOptions.deliveryType || "upload"

  if (!new Set(["image", "video"]).has(resourceType)) {
    throw new MediaUploadError("Unsupported media resource type", 500)
  }
  if (!new Set(["authenticated", "upload"]).has(deliveryType)) {
    throw new MediaUploadError("Unsupported media delivery type", 500)
  }
  if (!hasCloudinaryCredentials()) {
    throw new MediaUploadError("Media uploads are not configured", 503)
  }

  try {
    await validateMediaFile(file, resourceType)

    const uploadOptions = {
      folder: normalizeFolder(folder),
      overwrite: false,
      resource_type: resourceType,
      type: deliveryType,
      unique_filename: true,
      use_filename: false,
    }

    if (resourceType === "image") {
      const width = Number(normalizedOptions.width)
      const height = Number(normalizedOptions.height)
      if (Number.isFinite(width) && width > 0) {
        uploadOptions.width = Math.min(width, 4096)
      }
      if (Number.isFinite(height) && height > 0) {
        uploadOptions.height = Math.min(height, 4096)
      }
      if (uploadOptions.width || uploadOptions.height) uploadOptions.crop = "limit"
      uploadOptions.quality = normalizedOptions.quality || "auto:good"
    }

    const result = await cloudinary.uploader.upload(
      file.tempFilePath,
      uploadOptions
    )
    if (!result?.secure_url || !result?.public_id) {
      throw new Error("Cloudinary returned an incomplete upload response")
    }
    return result
  } finally {
    // express-fileupload leaves successfully parsed temp files in place when
    // useTempFiles is enabled. Always remove ours after validation/upload.
    await fs.unlink(file.tempFilePath).catch((error) => {
      if (error?.code !== "ENOENT") {
        console.error("Temporary upload cleanup failed")
      }
    })
  }
}

const deleteAssetFromCloudinary = async (
  publicId,
  resourceType = "image",
  deliveryType = "upload"
) => {
  if (!publicId) return false
  if (!hasCloudinaryCredentials()) return false
  if (!["image", "video"].includes(resourceType)) return false
  if (!["authenticated", "upload"].includes(deliveryType)) return false

  const result = await cloudinary.uploader.destroy(publicId, {
    invalidate: true,
    resource_type: resourceType,
    type: deliveryType,
  })
  return result?.result === "ok" || result?.result === "not found"
}

const createPrivateMediaUrl = (
  publicId,
  format,
  {
    deliveryType = "authenticated",
    expiresInSeconds = 3600,
    resourceType = "video",
  } = {}
) => {
  if (!publicId || !format || !hasCloudinaryCredentials()) return null
  const ttl = Number(expiresInSeconds)
  if (!Number.isInteger(ttl) || ttl < 60 || ttl > 86400) {
    throw new MediaUploadError("The private media URL lifetime is invalid", 500)
  }

  return cloudinary.utils.private_download_url(publicId, format, {
    attachment: false,
    expires_at: Math.floor(Date.now() / 1000) + ttl,
    resource_type: resourceType,
    type: deliveryType,
  })
}

module.exports = {
  MediaUploadError,
  createPrivateMediaUrl,
  deleteAssetFromCloudinary,
  uploadImageToCloudinary,
  validateMediaFile,
}
