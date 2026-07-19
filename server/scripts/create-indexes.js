require("dotenv").config({ quiet: true })

const mongoose = require("mongoose")

const models = [
  require("../models/User"),
  require("../models/OTP"),
  require("../models/Course"),
  require("../models/Category"),
  require("../models/Section"),
  require("../models/Subsection"),
  require("../models/CourseProgress"),
  require("../models/RatingandReview"),
  require("../models/Purchase"),
]

const run = async () => {
  const mongoUrl = process.env.MONGODB_URI || process.env.MONGODB_URL
  if (!mongoUrl) throw new Error("MONGODB_URI is required")
  if (
    process.env.NODE_ENV === "production" &&
    process.env.MIGRATION_CONFIRM !== "create-indexes"
  ) {
    throw new Error(
      "Set MIGRATION_CONFIRM=create-indexes after backing up production data"
    )
  }

  await mongoose.connect(mongoUrl, { autoIndex: false })
  for (const model of models) {
    await model.createIndexes()
    console.log(`Indexes ready: ${model.modelName}`)
  }
}

run()
  .catch((error) => {
    console.error("Index creation failed:", error.message)
    process.exitCode = 1
  })
  .finally(async () => {
    await mongoose.disconnect()
  })
