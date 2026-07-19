const assert = require("node:assert/strict")
const test = require("node:test")
const bcrypt = require("bcryptjs")

const userId = "64b000000000000000000003"
const calls = []
let currentUser = {
  _id: { toString: () => userId },
  accountType: "Student",
  active: true,
  additionalDetails: "profile-1",
  approved: true,
  authProviders: ["local"],
  email: "learner@example.com",
  imagePublicId: "profiles/old-image",
  password: bcrypt.hashSync("CurrentPassword1", 4),
}
let instructorHasCourses = false
let dashboardCourses = []
let dashboardPurchases = []
let googlePayload = null
let activePurchase = false
let progressCleanupFails = false

const installMock = (modulePath, exports) => {
  const filename = require.resolve(modulePath)
  require.cache[filename] = { id: filename, filename, loaded: true, exports }
}

const User = {
  findById: () => ({
    select: async () => currentUser,
  }),
  findByIdAndUpdate: async (_id, update) => {
    calls.push(["user-update", update])
    return {}
  },
  findOneAndUpdate: async (_query, update) => {
    calls.push(["user-update", update])
    return currentUser.active ? {} : null
  },
  updateOne: async (_query, update) => {
    calls.push(["user-lock-update", update])
    return { matchedCount: 1 }
  },
}
const Course = {
  exists: async () => instructorHasCourses,
  find: () => ({ lean: async () => dashboardCourses }),
  updateMany: async (query, update) => calls.push(["course-update", query, update]),
}
const CourseProgress = {
  deleteMany: async (query) => {
    if (progressCleanupFails) throw new Error("simulated cleanup failure")
    calls.push(["progress-delete", query])
  },
}
const OTP = {
  deleteMany: async (query) => calls.push(["otp-delete", query]),
}
const Profile = {
  findByIdAndUpdate: async (_id, update) => calls.push(["profile-update", update]),
}
const RatingAndReview = {
  deleteMany: async (query) => calls.push(["review-delete", query]),
  find: () => ({ distinct: async () => ["review-1"] }),
}
const Purchase = {
  exists: async () => activePurchase,
  find: () => ({
    select: () => ({ lean: async () => dashboardPurchases }),
  }),
  updateMany: async () => ({ modifiedCount: 0 }),
}

class MediaUploadError extends Error {}
installMock("../config/env", { checkoutTtlSeconds: 900 })
installMock("../models/Course", Course)
installMock("../models/CourseProgress", CourseProgress)
installMock("../models/OTP", OTP)
installMock("../models/Profile", Profile)
installMock("../models/Purchase", Purchase)
installMock("../models/RatingandReview", RatingAndReview)
installMock("../models/User", User)
installMock("google-auth-library", {
  OAuth2Client: class {
    async verifyIdToken() {
      return { getPayload: () => googlePayload }
    }
  },
})
installMock("../utils/auth", {
  clearSession: (response) => {
    response.sessionCleared = true
  },
})
installMock("../utils/imageUploader", {
  MediaUploadError,
  deleteAssetFromCloudinary: async (...args) => calls.push(["media-delete", args]),
  uploadImageToCloudinary: async () => ({}),
})
delete require.cache[require.resolve("../controllers/profile")]
const profileController = require("../controllers/profile")

const createResponse = () => ({
  body: undefined,
  sessionCleared: false,
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

test("profile input is normalized and rejects invalid dates and enum values", () => {
  const updates = profileController._test.buildProfileUpdates({
    about: "  Building accessible courses  ",
    contactNumber: "+91 98765-43210",
    dateOfBirth: "2000-02-29",
    firstName: "  Asha  ",
    gender: "Prefer not to say",
  })
  assert.equal(updates.user.firstName, "Asha")
  assert.equal(updates.profile.contactNumber, "+919876543210")
  assert.equal(updates.profile.dateOfBirth, "2000-02-29")

  assert.throws(
    () => profileController._test.buildProfileUpdates({ dateOfBirth: "2024-02-30" }),
    /Date of birth is invalid/
  )
  assert.throws(
    () => profileController._test.buildProfileUpdates({ gender: "Administrator" }),
    /Gender is invalid/
  )
})

test("enrolled course DTOs contain content and own progress without learner IDs", () => {
  const dto = profileController._test.buildEnrolledCourseDto(
    {
      _id: "course-1",
      category: { courses: ["course-1"] },
      courseContent: [
        {
          _id: "section-1",
          sectionName: "Start",
          subSection: [
            {
              _id: { toString: () => "lesson-1" },
              description: "Intro",
              timeDuration: "60",
              title: "Welcome",
              videoUrl: "https://public.example.invalid/video.mp4",
            },
          ],
        },
      ],
      courseDescription: "Description",
      courseName: "Course",
      studentsEnroled: [userId],
      thumbnail: "thumbnail",
    },
    new Set(["lesson-1"])
  )

  assert.equal(dto.progressPercentage, 100)
  assert.equal(dto.courseContent[0].subSection[0].videoUrl, undefined)
  assert.equal(dto.studentsEnroled, undefined)
  assert.equal(dto.category, undefined)
})

test("account deletion anonymizes identity and removes learner-owned data", async () => {
  calls.length = 0
  const response = createResponse()

  await profileController.deleteAccount(
    {
      body: {
        confirmationEmail: "learner@example.com",
        currentPassword: "CurrentPassword1",
      },
      user: { id: userId },
    },
    response
  )

  assert.equal(response.statusCode, 200)
  assert.equal(response.sessionCleared, true)
  const userUpdate = calls.find(
    ([event, update]) => event === "user-update" && update.$set?.email
  )[1]
  assert.equal(userUpdate.$set.active, false)
  assert.equal(userUpdate.$set.email, `deleted-${userId}@users.invalid`)
  assert.equal(userUpdate.$unset.password, 1)
  assert.ok(calls.some(([event]) => event === "progress-delete"))
  assert.ok(calls.some(([event]) => event === "review-delete"))
  assert.ok(calls.some(([event]) => event === "media-delete"))
})

test("account deletion requires the current local password", async () => {
  calls.length = 0
  const response = createResponse()
  await profileController.deleteAccount(
    {
      body: {
        confirmationEmail: "learner@example.com",
        currentPassword: "WrongPassword1",
      },
      user: { id: userId },
    },
    response
  )

  assert.equal(response.statusCode, 401)
  assert.equal(calls.some(([event]) => event === "user-update"), false)
})

test("account deletion is blocked while a payment is active", async () => {
  calls.length = 0
  activePurchase = true
  const response = createResponse()

  await profileController.deleteAccount(
    {
      body: {
        confirmationEmail: "learner@example.com",
        currentPassword: "CurrentPassword1",
      },
      user: { id: userId },
    },
    response
  )

  assert.equal(response.statusCode, 409)
  assert.equal(calls.some(([event]) => event === "user-update"), false)
  activePurchase = false
})

test("a failed deletion cleanup remains pending and retries idempotently", async () => {
  calls.length = 0
  progressCleanupFails = true
  const response = createResponse()

  await profileController.deleteAccount(
    {
      body: {
        confirmationEmail: "learner@example.com",
        currentPassword: "CurrentPassword1",
      },
      user: { id: userId },
    },
    response
  )

  assert.equal(response.statusCode, 500)
  assert.equal(
    calls.some(
      ([event, update]) =>
        event === "user-lock-update" &&
        update.$unset?.deletionLockId === 1 &&
        update.$unset?.deletionPending === undefined
    ),
    true
  )
  progressCleanupFails = false

  const retryResponse = createResponse()
  await profileController.deleteAccount(
    {
      body: {
        confirmationEmail: "learner@example.com",
        currentPassword: "CurrentPassword1",
      },
      user: { id: userId },
    },
    retryResponse
  )
  assert.equal(retryResponse.statusCode, 200)
  assert.equal(retryResponse.sessionCleared, true)
})

test("instructors with course history cannot self-delete", async () => {
  currentUser = {
    ...currentUser,
    accountType: "Instructor",
  }
  instructorHasCourses = true
  const response = createResponse()
  await profileController.deleteAccount(
    {
      body: {
        confirmationEmail: "learner@example.com",
        currentPassword: "CurrentPassword1",
      },
      user: { id: userId },
    },
    response
  )

  assert.equal(response.statusCode, 409)
  instructorHasCourses = false
  currentUser = { ...currentUser, accountType: "Student" }
})

test("administrator accounts cannot self-delete", async () => {
  currentUser = { ...currentUser, accountType: "Admin" }
  const response = createResponse()
  await profileController.deleteAccount(
    {
      body: {
        confirmationEmail: "learner@example.com",
        currentPassword: "CurrentPassword1",
      },
      user: { id: userId },
    },
    response
  )

  assert.equal(response.statusCode, 409)
  currentUser = { ...currentUser, accountType: "Student" }
})

test("Google-only deletion rejects a stale credential", async () => {
  process.env.GOOGLE_CLIENT_ID = "web-client.apps.googleusercontent.com"
  currentUser = {
    ...currentUser,
    authProviders: ["google"],
    googleId: "google-user-1",
    password: undefined,
  }
  googlePayload = {
    sub: "google-user-1",
    email: "learner@example.com",
    email_verified: true,
    iat: Math.floor((Date.now() - 10 * 60 * 1000) / 1000),
  }
  const response = createResponse()
  await profileController.deleteAccount(
    {
      body: {
        confirmationEmail: "learner@example.com",
        googleCredential: "stale-google-token",
      },
      user: { id: userId },
    },
    response
  )

  assert.equal(response.statusCode, 401)
  currentUser = {
    ...currentUser,
    authProviders: ["local"],
    googleId: undefined,
    password: bcrypt.hashSync("CurrentPassword1", 4),
  }
})

test("instructor revenue comes from fulfilled purchase line items", async () => {
  dashboardCourses = [
    {
      _id: { toString: () => "course-1" },
      courseName: "Course",
      courseDescription: "Description",
      price: 9999,
      studentsEnroled: ["student-1", "student-2"],
    },
  ]
  dashboardPurchases = [
    {
      lineItems: [
        { course: { toString: () => "course-1" }, amount: 12500 },
        { course: { toString: () => "another-course" }, amount: 99900 },
      ],
    },
  ]
  const response = createResponse()
  await profileController.instructorDashboard({ user: { id: userId } }, response)

  assert.equal(response.statusCode, 200)
  assert.equal(response.body.courses[0].totalAmountGenerated, 125)
  assert.equal(response.body.courses[0].totalStudentsEnrolled, 2)
  dashboardCourses = []
  dashboardPurchases = []
})
