const fs = require("node:fs/promises")
const os = require("node:os")
const path = require("node:path")

const fileUpload = require("express-fileupload")

const env = require("../config/env")
const temporaryDirectory = path.resolve(os.tmpdir())

const uploadedFiles = (files) =>
  Object.values(files || {}).flatMap((file) => (Array.isArray(file) ? file : [file]))

const cleanupUploadedTempFiles = async (req) => {
  await Promise.allSettled(
    uploadedFiles(req.files)
      .map((file) => file?.tempFilePath)
      .filter(Boolean)
      .map((tempFilePath) => {
        const candidatePath = path.resolve(tempFilePath)
        if (
          candidatePath === temporaryDirectory ||
          !candidatePath.startsWith(`${temporaryDirectory}${path.sep}`)
        ) {
          console.error("Refused to clean an upload outside the temp directory")
          return undefined
        }

        return fs.unlink(candidatePath).catch((error) => {
          if (error?.code !== "ENOENT") {
            console.error("Temporary upload cleanup failed")
          }
        })
      })
  )
}

// Register cleanup before parsing so rejected, unused, and incorrectly named
// multipart fields cannot leave express-fileupload temp files behind.
const cleanupAfterResponse = (req, res, next) => {
  let cleanupStarted = false
  const cleanup = () => {
    if (cleanupStarted) return
    cleanupStarted = true
    void cleanupUploadedTempFiles(req)
  }
  res.once("finish", cleanup)
  res.once("close", cleanup)
  next()
}

const parseSingleUpload = fileUpload({
  abortOnLimit: true,
  createParentPath: false,
  debug: false,
  limits: { fileSize: env.uploadMaxBytes, files: 1 },
  limitHandler: (_req, res) =>
    res.status(413).json({ success: false, message: "Uploaded file is too large" }),
  parseNested: false,
  preserveExtension: true,
  safeFileNames: true,
  tempFileDir: temporaryDirectory,
  useTempFiles: true,
})

// Mount this only after authentication/authorization on routes that consume a
// file. Express flattens middleware arrays passed to router methods.
const uploadMiddleware = [cleanupAfterResponse, parseSingleUpload]

module.exports = {
  cleanupAfterResponse,
  cleanupUploadedTempFiles,
  parseSingleUpload,
  uploadMiddleware,
}
