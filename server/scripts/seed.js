const crypto = require("node:crypto")

const bcrypt = require("bcryptjs")
const mongoose = require("mongoose")

const Category = require("../models/Category")
const Course = require("../models/Course")
const CourseProgress = require("../models/CourseProgress")
const Profile = require("../models/Profile")
const Purchase = require("../models/Purchase")
const RatingAndReview = require("../models/RatingandReview")
const Section = require("../models/Section")
const SubSection = require("../models/Subsection")
const User = require("../models/User")
const {
  analyzePurchaseCourseEvidence,
  purchaseAllowsActivation,
  purchaseIsInSidecarCohort,
} = require("../domains/entitlement/entitlementPurchaseEvidence")
const {
  CURRENT_REFUND_POLICY_VERSION,
  CURRENT_TERMS_VERSION,
  createPolicyAcceptance,
  hasCurrentPolicyAcceptance,
} = require("../utils/policyAcceptance")
const { assertSafeSeedTarget, SeedSafetyError } = require("../utils/seedSafety")
const {
  mongoJobOptions,
  validateMongoUriForEnvironment,
} = require("../utils/mongoDeployment")

const LOCAL_DEMO_VIDEO_URL =
  "https://res.cloudinary.com/demo/video/upload/v1692721302/samples/sea-turtle.mp4"
const STRICT_ISO_TIMESTAMP = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/
const DEMO_SEED_MODES = new Set(["local", "staging"])

const accountEnvironment = Object.freeze({
  Admin: Object.freeze({
    email: "STUDYNOTION_DEMO_ADMIN_EMAIL",
    localEmail: "admin@studynotion.local",
    localPassword: "Admin@123",
    password: "STUDYNOTION_DEMO_ADMIN_PASSWORD",
  }),
  Instructor: Object.freeze({
    email: "STUDYNOTION_DEMO_INSTRUCTOR_EMAIL",
    localEmail: "instructor@studynotion.local",
    localPassword: "Instructor@123",
    password: "STUDYNOTION_DEMO_INSTRUCTOR_PASSWORD",
  }),
  Student: Object.freeze({
    email: "STUDYNOTION_DEMO_STUDENT_EMAIL",
    localEmail: "student@studynotion.local",
    localPassword: "Student@123",
    password: "STUDYNOTION_DEMO_STUDENT_PASSWORD",
  }),
})

const demoCourses = Object.freeze([
  Object.freeze({
    category: "Web Development",
    categoryDescription:
      "Build accessible, responsive websites with modern web technologies.",
    courseName: "Foundations of Web Development",
    courseDescription:
      "Learn HTML, CSS, JavaScript, and the foundations of modern frontend development.",
    whatYouWillLearn:
      "Create responsive pages, write clean JavaScript, and understand how web applications fit together.",
    price: 1499,
    tag: Object.freeze(["HTML", "CSS", "JavaScript"]),
    accent: "#FFD60A",
  }),
  Object.freeze({
    category: "Data Science",
    categoryDescription:
      "Use Python and data tools to turn raw information into useful insights.",
    courseName: "Python for Data Science",
    courseDescription:
      "A practical introduction to Python, data analysis, and visualization.",
    whatYouWillLearn:
      "Work with Python data structures, analyze datasets, and communicate findings with visualizations.",
    price: 1799,
    tag: Object.freeze(["Python", "Data Analysis"]),
    accent: "#47A5C5",
  }),
  Object.freeze({
    category: "Mobile Development",
    categoryDescription:
      "Create cross-platform mobile experiences with JavaScript and React.",
    courseName: "React Native Essentials",
    courseDescription:
      "Build your first cross-platform mobile application with React Native.",
    whatYouWillLearn:
      "Design mobile interfaces, manage application state, and structure a maintainable React Native project.",
    price: 1999,
    tag: Object.freeze(["React Native", "Mobile"]),
    accent: "#06D6A0",
  }),
])

const requiredEnvironmentValue = (environment, name) => {
  const value = environment[name]
  if (typeof value !== "string" || !value.trim()) {
    throw new SeedSafetyError(`${name} is required for the demo seed`)
  }
  return value.trim()
}

const readAccount = (environment, accountType, staging) => {
  const names = accountEnvironment[accountType]
  const configuredEmail = environment[names.email]
  const configuredPassword = environment[names.password]
  const email = (
    staging
      ? requiredEnvironmentValue(environment, names.email)
      : String(configuredEmail || names.localEmail).trim()
  ).toLowerCase()
  const password = staging
    ? requiredEnvironmentValue(environment, names.password)
    : String(configuredPassword || names.localPassword).trim()
  if (email.length > 254 || !/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email)) {
    throw new SeedSafetyError(`${names.email} must be a valid email address`)
  }
  const minimumPasswordLength = staging ? 12 : 8
  if (
    password.length < minimumPasswordLength ||
    Buffer.byteLength(password, "utf8") > 72
  ) {
    throw new SeedSafetyError(
      `${names.password} must contain ${minimumPasswordLength}-72 bytes`
    )
  }
  return Object.freeze({ accountType, email, password })
}

const parseSidecarBoundary = (value, now) => {
  if (typeof value !== "string" || !STRICT_ISO_TIMESTAMP.test(value)) {
    throw new SeedSafetyError(
      "ENTITLEMENT_SIDECAR_STARTED_AT must be an exact UTC ISO timestamp"
    )
  }
  const parsed = new Date(value)
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString() !== value) {
    throw new SeedSafetyError(
      "ENTITLEMENT_SIDECAR_STARTED_AT must be an exact UTC ISO timestamp"
    )
  }
  if (parsed > now) {
    throw new SeedSafetyError(
      "ENTITLEMENT_SIDECAR_STARTED_AT cannot be in the future when seeding"
    )
  }
  return parsed
}

const readStagingMedia = (environment) => {
  const cloudName = requiredEnvironmentValue(environment, "CLOUD_NAME")
  const folderName = requiredEnvironmentValue(environment, "FOLDER_NAME")
  const videoPublicId = requiredEnvironmentValue(
    environment,
    "STUDYNOTION_DEMO_VIDEO_PUBLIC_ID"
  )
  const videoFormat = requiredEnvironmentValue(
    environment,
    "STUDYNOTION_DEMO_VIDEO_FORMAT"
  ).toLowerCase()

  if (!/^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/.test(cloudName)) {
    throw new SeedSafetyError("CLOUD_NAME is invalid for the staging demo seed")
  }
  const normalizedFolder = folderName.replace(/^\/+|\/+$/g, "")
  if (
    !normalizedFolder ||
    normalizedFolder.length > 120 ||
    !/^[A-Za-z0-9][A-Za-z0-9/_-]*$/.test(normalizedFolder)
  ) {
    throw new SeedSafetyError(
      "FOLDER_NAME is invalid for the staging demo seed"
    )
  }
  if (!/^[A-Za-z0-9][A-Za-z0-9/_-]{0,499}$/.test(videoPublicId)) {
    throw new SeedSafetyError("STUDYNOTION_DEMO_VIDEO_PUBLIC_ID is invalid")
  }
  if (
    videoPublicId !== normalizedFolder &&
    !videoPublicId.startsWith(`${normalizedFolder}/`)
  ) {
    throw new SeedSafetyError(
      "STUDYNOTION_DEMO_VIDEO_PUBLIC_ID must belong to FOLDER_NAME"
    )
  }
  if (!/^[a-z0-9]{2,20}$/.test(videoFormat)) {
    throw new SeedSafetyError("STUDYNOTION_DEMO_VIDEO_FORMAT is invalid")
  }

  const encodedPublicId = videoPublicId
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/")
  const videoUrl = `https://res.cloudinary.com/${encodeURIComponent(
    cloudName
  )}/video/authenticated/${encodedPublicId}.${videoFormat}`

  return Object.freeze({
    videoDeliveryType: "authenticated",
    videoFormat,
    videoPublicId,
    videoUrl,
  })
}

const createDemoSeedConfiguration = (
  environment,
  { now = new Date() } = {}
) => {
  const mode = String(environment.STUDYNOTION_DEMO_SEED_MODE || "local")
    .trim()
    .toLowerCase()
  if (!DEMO_SEED_MODES.has(mode)) {
    throw new SeedSafetyError(
      "STUDYNOTION_DEMO_SEED_MODE must be local or staging"
    )
  }
  const staging = mode === "staging"
  const accounts = Object.fromEntries(
    Object.keys(accountEnvironment).map((accountType) => [
      accountType,
      readAccount(environment, accountType, staging),
    ])
  )
  if (new Set(Object.values(accounts).map(({ email }) => email)).size !== 3) {
    throw new SeedSafetyError("Demo account email addresses must be distinct")
  }
  if (
    staging &&
    new Set(Object.values(accounts).map(({ password }) => password)).size !== 3
  ) {
    throw new SeedSafetyError("Staging demo account passwords must be distinct")
  }

  const sidecarStartedAt = parseSidecarBoundary(
    requiredEnvironmentValue(environment, "ENTITLEMENT_SIDECAR_STARTED_AT"),
    now
  )
  const media = staging
    ? readStagingMedia(environment)
    : Object.freeze({
        videoDeliveryType: "upload",
        videoUrl: LOCAL_DEMO_VIDEO_URL,
      })

  return Object.freeze({
    accounts: Object.freeze(accounts),
    media,
    mode,
    sidecarStartedAt,
  })
}

const makeThumbnail = (title, accent) => {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="1200" height="675" viewBox="0 0 1200 675">
      <rect width="1200" height="675" fill="#161D29" />
      <circle cx="1020" cy="100" r="220" fill="${accent}" opacity="0.22" />
      <circle cx="150" cy="620" r="250" fill="${accent}" opacity="0.14" />
      <text x="80" y="310" fill="#F1F2FF" font-family="Arial, sans-serif" font-size="62" font-weight="700">${title}</text>
      <text x="82" y="380" fill="${accent}" font-family="Arial, sans-serif" font-size="30">StudyNotion demo course</text>
    </svg>`

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`
}

const hasDemoSeedProvenance = (user) =>
  Array.isArray(user?.policyAcceptances) &&
  user.policyAcceptances.some(({ source }) =>
    ["demo_seed", "local_seed"].includes(source)
  )

const createDemoUser = async ({
  account,
  firstName,
  instructorReviewedBy,
  mode,
  seededAt,
}) => {
  const existingUser = await User.findOne({ email: account.email }).select(
    "+password +policyAcceptances +instructorReviewedBy +instructorReviewNote"
  )
  if (existingUser && !hasDemoSeedProvenance(existingUser)) {
    throw new SeedSafetyError(
      "A configured demo identity collides with an existing non-demo account"
    )
  }

  const approvalFields =
    account.accountType === "Instructor"
      ? {
          approved: true,
          instructorApprovalStatus: "Approved",
          instructorReviewedAt: existingUser?.instructorReviewedAt || seededAt,
          instructorReviewedBy,
          instructorReviewNote: "Approved by the guarded demo seed",
        }
      : {
          approved: true,
          instructorApprovalStatus: "NotApplicable",
        }

  if (existingUser) {
    const update = {
      $set: {
        firstName,
        lastName: "Demo",
        authProviders: ["local"],
        accountType: account.accountType,
        active: true,
        ...approvalFields,
      },
    }
    if (!(await bcrypt.compare(account.password, existingUser.password))) {
      update.$set.password = await bcrypt.hash(account.password, 10)
    }
    if (!hasCurrentPolicyAcceptance(existingUser)) {
      update.$push = {
        policyAcceptances: createPolicyAcceptance("demo_seed", seededAt),
      }
    }
    await User.updateOne({ _id: existingUser._id }, update)
    return User.findById(existingUser._id)
  }

  const profile = await Profile.create({
    about: `${account.accountType} demo account for ${mode}`,
  })
  return User.create({
    firstName,
    lastName: "Demo",
    email: account.email,
    password: await bcrypt.hash(account.password, 10),
    authProviders: ["local"],
    accountType: account.accountType,
    active: true,
    ...approvalFields,
    additionalDetails: profile._id,
    image: "",
    courses: [],
    policyAcceptances: [createPolicyAcceptance("demo_seed", seededAt)],
  })
}

const seedDemoCourse = async ({
  definition,
  enrollStudent,
  instructor,
  media,
  seededAt,
  student,
}) => {
  const category = await Category.findOneAndUpdate(
    { name: definition.category },
    { $set: { description: definition.categoryDescription } },
    { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }
  )
  const course = await Course.findOneAndUpdate(
    { courseName: definition.courseName, instructor: instructor._id },
    {
      $set: {
        courseDescription: definition.courseDescription,
        whatYouWillLearn: definition.whatYouWillLearn,
        price: definition.price,
        tag: [...definition.tag],
        category: category._id,
        thumbnail: makeThumbnail(definition.courseName, definition.accent),
        status: "Published",
        instructions: [
          "Self-paced lessons",
          "Lifetime access",
          "Practice-focused curriculum",
        ],
      },
      $setOnInsert: {
        courseContent: [],
        everPublishedAt: seededAt,
        ratingAndReviews: [],
        studentsEnroled: [],
      },
    },
    { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }
  )

  const lessonUpdate = {
    $set: {
      description: `A short orientation for ${definition.courseName}.`,
      timeDuration: "60",
      videoDeliveryType: media.videoDeliveryType,
      videoUrl: media.videoUrl,
    },
  }
  if (media.videoDeliveryType === "authenticated") {
    lessonUpdate.$set.videoFormat = media.videoFormat
    lessonUpdate.$set.videoPublicId = media.videoPublicId
  } else {
    lessonUpdate.$unset = { videoFormat: 1, videoPublicId: 1 }
  }
  const lesson = await SubSection.findOneAndUpdate(
    { title: `${definition.courseName} Overview` },
    lessonUpdate,
    { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }
  )
  const section = await Section.findOneAndUpdate(
    { sectionName: `${definition.courseName} — Getting Started` },
    { $addToSet: { subSection: lesson._id } },
    { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }
  )
  const review = enrollStudent
    ? await RatingAndReview.findOneAndUpdate(
        { user: student._id, course: course._id },
        {
          $set: {
            rating: 5,
            review: `A clear and practical introduction to ${definition.category.toLowerCase()}.`,
          },
        },
        { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }
      )
    : null

  const courseRelationships = { courseContent: section._id }
  if (review) {
    courseRelationships.ratingAndReviews = review._id
    courseRelationships.studentsEnroled = student._id
  }

  await Promise.all([
    Course.updateOne({ _id: course._id }, { $addToSet: courseRelationships }),
    Course.updateOne(
      { _id: course._id, everPublishedAt: { $exists: false } },
      { $set: { everPublishedAt: seededAt } }
    ),
    Category.updateOne(
      { _id: category._id },
      { $addToSet: { courses: course._id } }
    ),
  ])

  return Object.freeze({ course, lesson })
}

const createSyntheticPurchaseDocument = ({ courses, seededAt, studentId }) => {
  if (!Array.isArray(courses) || !courses.length) {
    throw new SeedSafetyError("The demo purchase requires at least one course")
  }
  const lineItems = courses.map(({ course }) => {
    const amount = Math.round(Number(course.price) * 100)
    if (!Number.isSafeInteger(amount) || amount <= 0) {
      throw new SeedSafetyError("A demo course has an invalid purchase amount")
    }
    return {
      course: course._id,
      courseName: course.courseName,
      amount,
    }
  })
  const courseIds = lineItems.map(({ course }) => course)
  const identity = crypto
    .createHash("sha256")
    .update(`${studentId}:${courseIds.join(":")}`)
    .digest("hex")
    .slice(0, 24)
  const paidAt = new Date(seededAt)
  const fulfilledAt = new Date(seededAt)

  return Object.freeze({
    user: studentId,
    courses: courseIds,
    activeCourses: courseIds,
    checkoutAcknowledgedAt: seededAt,
    checkoutPolicySource: "web_checkout",
    checkoutTermsVersion: CURRENT_TERMS_VERSION,
    refundPolicyVersion: CURRENT_REFUND_POLICY_VERSION,
    refundWindowDays: 0,
    lineItems,
    amount: lineItems.reduce((total, lineItem) => total + lineItem.amount, 0),
    currency: "INR",
    receipt: `sn_demo_${identity}`,
    razorpayOrderId: `order_demo_${identity}`,
    razorpayPaymentId: `pay_demo_${identity}`,
    status: "fulfilled",
    paidAt,
    fulfilledAt,
    createdAt: seededAt,
    updatedAt: fulfilledAt,
  })
}

const referenceKey = (value) => String(value?._id || value || "")
const sameReferences = (left, right) =>
  Array.isArray(left) &&
  Array.isArray(right) &&
  left.length === right.length &&
  left.every(
    (value, index) => referenceKey(value) === referenceKey(right[index])
  )

const purchaseMatchesSyntheticDocument = (purchase, document) => {
  if (
    referenceKey(purchase.user) !== referenceKey(document.user) ||
    !sameReferences(purchase.courses, document.courses) ||
    !sameReferences(purchase.activeCourses, document.activeCourses) ||
    purchase.receipt !== document.receipt ||
    purchase.razorpayOrderId !== document.razorpayOrderId ||
    purchase.razorpayPaymentId !== document.razorpayPaymentId ||
    purchase.checkoutPolicySource !== document.checkoutPolicySource ||
    purchase.checkoutTermsVersion !== document.checkoutTermsVersion ||
    purchase.refundPolicyVersion !== document.refundPolicyVersion ||
    purchase.refundWindowDays !== document.refundWindowDays ||
    purchase.amount !== document.amount ||
    purchase.currency !== document.currency ||
    !Array.isArray(purchase.lineItems) ||
    purchase.lineItems.length !== document.lineItems.length
  ) {
    return false
  }
  return purchase.lineItems.every((lineItem, index) => {
    const expected = document.lineItems[index]
    return (
      referenceKey(lineItem.course) === referenceKey(expected.course) &&
      lineItem.courseName === expected.courseName &&
      lineItem.amount === expected.amount
    )
  })
}

const seedSyntheticPurchase = async ({
  courses,
  seededAt,
  sidecarStartedAt,
  student,
}) => {
  const document = createSyntheticPurchaseDocument({
    courses,
    seededAt,
    studentId: student._id,
  })
  const purchase = await Purchase.findOneAndUpdate(
    { receipt: document.receipt },
    { $setOnInsert: document },
    {
      upsert: true,
      returnDocument: "after",
      setDefaultsOnInsert: true,
      timestamps: false,
    }
  )
  const evidence = purchase.toObject()
  const courseEvidence = analyzePurchaseCourseEvidence(evidence)
  if (
    !courseEvidence.ok ||
    evidence.status !== "fulfilled" ||
    !purchaseMatchesSyntheticDocument(evidence, document) ||
    !purchaseIsInSidecarCohort(evidence, sidecarStartedAt) ||
    !purchaseAllowsActivation(evidence)
  ) {
    throw new SeedSafetyError(
      "The existing synthetic demo Purchase no longer matches its immutable evidence"
    )
  }
  return purchase
}

const readSeedDatabaseTime = async () => {
  const result = await mongoose.connection.db?.command(
    { hello: 1 },
    { timeoutMS: 5_000 }
  )
  if (
    !(result?.localTime instanceof Date) ||
    !Number.isFinite(result.localTime.getTime())
  ) {
    throw new SeedSafetyError("MongoDB server time is unavailable for seeding")
  }
  return new Date(result.localTime)
}

const seedDemoData = async ({
  environment = process.env,
  now = () => new Date(),
} = {}) => {
  const mongoUrl = assertSafeSeedTarget({
    demoSeedMode: environment.STUDYNOTION_DEMO_SEED_MODE,
    deploymentTier: environment.DEPLOYMENT_TIER,
    disposableConfirmation: environment.STUDYNOTION_DISPOSABLE_SEED_CONFIRM,
    mongoUrl: environment.MONGODB_URI || environment.MONGODB_URL,
    nodeEnv: environment.NODE_ENV,
  })
  validateMongoUriForEnvironment(mongoUrl, environment)
  const configurationCheckedAt = now()
  if (
    !(configurationCheckedAt instanceof Date) ||
    !Number.isFinite(configurationCheckedAt.getTime())
  ) {
    throw new TypeError("The demo seed clock returned an invalid time")
  }
  const configuration = createDemoSeedConfiguration(environment, {
    now: configurationCheckedAt,
  })

  await mongoose.connect(mongoUrl, mongoJobOptions(environment))
  const seededAt = await readSeedDatabaseTime()
  if (configuration.sidecarStartedAt > seededAt) {
    throw new SeedSafetyError(
      "ENTITLEMENT_SIDECAR_STARTED_AT cannot be in the MongoDB server's future when seeding"
    )
  }

  const admin = await createDemoUser({
    account: configuration.accounts.Admin,
    firstName: "Admin",
    mode: configuration.mode,
    seededAt,
  })
  const instructor = await createDemoUser({
    account: configuration.accounts.Instructor,
    firstName: "Instructor",
    instructorReviewedBy: admin._id,
    mode: configuration.mode,
    seededAt,
  })
  const student = await createDemoUser({
    account: configuration.accounts.Student,
    firstName: "Student",
    mode: configuration.mode,
    seededAt,
  })

  const seededCourses = []
  for (const [index, definition] of demoCourses.entries()) {
    seededCourses.push(
      await seedDemoCourse({
        definition,
        enrollStudent: index === 0,
        instructor,
        media: configuration.media,
        seededAt,
        student,
      })
    )
  }

  const enrolledCourse = seededCourses[0]
  const progress = await CourseProgress.findOneAndUpdate(
    { courseID: enrolledCourse.course._id, userId: student._id },
    { $setOnInsert: { completedVideos: [enrolledCourse.lesson._id] } },
    { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }
  )

  const courseIds = seededCourses.map(({ course }) => course._id)
  await Promise.all([
    User.updateOne(
      { _id: instructor._id },
      { $addToSet: { courses: { $each: courseIds } } }
    ),
    User.updateOne(
      { _id: student._id },
      {
        $addToSet: {
          courses: enrolledCourse.course._id,
          courseProgress: progress._id,
        },
      }
    ),
  ])

  const purchase = await seedSyntheticPurchase({
    courses: [enrolledCourse],
    seededAt,
    sidecarStartedAt: configuration.sidecarStartedAt,
    student,
  })

  console.log(
    `StudyNotion ${configuration.mode} demo data is ready (${courseIds.length} courses, 1 Purchase)`
  )
  return Object.freeze({
    accountCount: 3,
    courseCount: courseIds.length,
    purchaseId: purchase._id,
  })
}

const runSeedCli = async () => {
  require("dotenv").config({ quiet: true })
  try {
    await seedDemoData()
  } catch (error) {
    const safeReason =
      error instanceof SeedSafetyError
        ? error.message
        : /^[A-Za-z][A-Za-z0-9]*Error$/.test(error?.name || "")
          ? error.name
          : "Seed operation failed"
    console.error("Failed to seed demo data:", safeReason)
    process.exitCode = 1
  } finally {
    try {
      await mongoose.disconnect()
    } catch {
      process.exitCode = 1
    }
  }
}

if (require.main === module) void runSeedCli()

module.exports = {
  createDemoSeedConfiguration,
  createSyntheticPurchaseDocument,
  runSeedCli,
  seedDemoData,
}
