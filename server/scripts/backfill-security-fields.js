require("dotenv").config({ quiet: true })

const mongoose = require("mongoose")

const Profile = require("../models/Profile")
const Course = require("../models/Course")
const User = require("../models/User")

const run = async () => {
  if (process.env.BACKFILL_CONFIRM !== "backfill-security-fields") {
    throw new Error(
      "Set BACKFILL_CONFIRM=backfill-security-fields after taking a database backup"
    )
  }

  const mongoUrl = process.env.MONGODB_URI || process.env.MONGODB_URL
  if (!mongoUrl) throw new Error("MONGODB_URI is required")
  await mongoose.connect(mongoUrl, { autoIndex: false })

  const users = User.collection
  const courses = Course.collection
  const results = {}
  results.sessionVersion = await users.updateMany(
    { sessionVersion: { $exists: false } },
    { $set: { sessionVersion: 0 } }
  )
  results.active = await users.updateMany(
    { active: { $exists: false } },
    { $set: { active: true } }
  )
  results.deletionPending = await users.updateMany(
    { deletionPending: { $exists: false } },
    { $set: { deletionPending: false } }
  )
  results.everPublishedAt = await courses.updateMany(
    { status: "Published", everPublishedAt: { $exists: false } },
    [{ $set: { everPublishedAt: { $ifNull: ["$updatedAt", "$$NOW"] } } }]
  )
  results.approved = await users.updateMany(
    { approved: { $exists: false } },
    { $set: { approved: true } }
  )
  results.localAndGoogleProviders = await users.updateMany(
    {
      authProviders: { $exists: false },
      password: { $type: "string" },
      googleId: { $type: "string" },
    },
    { $set: { authProviders: ["local", "google"] } }
  )
  results.localProviders = await users.updateMany(
    { authProviders: { $exists: false }, password: { $type: "string" } },
    { $set: { authProviders: ["local"] } }
  )
  results.googleProviders = await users.updateMany(
    { authProviders: { $exists: false }, googleId: { $type: "string" } },
    { $set: { authProviders: ["google"] } }
  )
  results.instructorStatus = await users.updateMany(
    { accountType: "Instructor", instructorApprovalStatus: { $exists: false } },
    [
      {
        $set: {
          instructorApprovalStatus: {
            $cond: [{ $eq: ["$approved", false] }, "Pending", "Approved"],
          },
        },
      },
    ]
  )
  results.otherStatus = await users.updateMany(
    {
      accountType: { $ne: "Instructor" },
      instructorApprovalStatus: { $exists: false },
    },
    { $set: { instructorApprovalStatus: "NotApplicable" } }
  )

  const rawUsers = await users
    .find({}, { projection: { _id: 1, additionalDetails: 1 } })
    .toArray()
  const referencedProfileIds = rawUsers
    .map((user) => user.additionalDetails)
    .filter((profileId) => profileId instanceof mongoose.Types.ObjectId)
  const existingProfileIds = referencedProfileIds.length
    ? await Profile.find({ _id: { $in: referencedProfileIds } }).distinct("_id")
    : []
  const existingProfileIdSet = new Set(existingProfileIds.map(String))
  const usersNeedingProfiles = rawUsers.filter(
    (user) =>
      !(user.additionalDetails instanceof mongoose.Types.ObjectId) ||
      !existingProfileIdSet.has(String(user.additionalDetails))
  )

  let repairedProfiles = 0
  for (const user of usersNeedingProfiles) {
    const profile = await Profile.create({})
    const profileFilter = user.additionalDetails
      ? { _id: user._id, additionalDetails: user.additionalDetails }
      : {
          _id: user._id,
          $or: [
            { additionalDetails: { $exists: false } },
            { additionalDetails: null },
          ],
        }
    const result = await users.updateOne(
      profileFilter,
      { $set: { additionalDetails: profile._id } }
    )
    if (result.modifiedCount) repairedProfiles += 1
    else await Profile.findByIdAndDelete(profile._id)
  }

  const modified = Object.fromEntries(
    Object.entries(results).map(([key, result]) => [key, result.modifiedCount])
  )
  console.log(
    JSON.stringify(
      { database: mongoose.connection.name, modified, repairedProfiles },
      null,
      2
    )
  )
  console.log("Legacy security-field backfill completed")
}

run()
  .catch((error) => {
    console.error("Security-field backfill failed:", error.message)
    process.exitCode = 1
  })
  .finally(async () => {
    await mongoose.disconnect()
  })
