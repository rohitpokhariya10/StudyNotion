const assert = require("node:assert/strict")
const { performance } = require("node:perf_hooks")
const path = require("node:path")
const { test } = require("node:test")

const enabled = process.env.STUDYNOTION_RUN_MONGOOSE_INTEGRATION === "1"

const assertDisposableMongoUri = (value) => {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Mongoose integration tests cannot run in production")
  }
  if (!value || value.startsWith("mongodb+srv://")) {
    throw new Error("MONGOOSE_TEST_MONGODB_URI must use a disposable MongoDB")
  }
  const url = new URL(value)
  const database = url.pathname.slice(1)
  if (!/^studynotion_mongoose_test_[a-z0-9_-]+$/i.test(database)) {
    throw new Error(
      "The MongoDB database name must begin with studynotion_mongoose_test_"
    )
  }
  if (!["127.0.0.1", "localhost", "mongo", "mongodb"].includes(url.hostname)) {
    throw new Error(
      "Mongoose integration MongoDB must be local or a CI service"
    )
  }
  return value
}

const expectDuplicateKey = async (operation, expectedKey) => {
  await assert.rejects(operation, (error) => {
    assert.equal(error?.code, 11000)
    if (expectedKey) assert.equal(error?.keyPattern?.[expectedKey], 1)
    return true
  })
}

const timeOperation = async (timings, name, operation) => {
  const startedAt = performance.now()
  const result = await operation()
  timings[name] = Number((performance.now() - startedAt).toFixed(3))
  return result
}

const mongodbDriverVersion = () => {
  const mongooseDirectory = path.dirname(require.resolve("mongoose"))
  const driverPackage = require.resolve("mongodb/package.json", {
    paths: [mongooseDirectory],
  })
  return require(driverPackage).version
}

test(
  "core StudyNotion models preserve validation, indexes, relationships, and query behavior",
  { skip: !enabled },
  async () => {
    const mongoUri = assertDisposableMongoUri(
      process.env.MONGOOSE_TEST_MONGODB_URI
    )
    const mongoose = require("mongoose")
    const Category = require("../models/Category")
    const Course = require("../models/Course")
    const CourseProgress = require("../models/CourseProgress")
    const OTP = require("../models/OTP")
    const Profile = require("../models/Profile")
    const Purchase = require("../models/Purchase")
    const RatingAndReview = require("../models/RatingandReview")
    const Section = require("../models/Section")
    const SubSection = require("../models/Subsection")
    const User = require("../models/User")
    const {
      buildCatalogPipeline,
    } = require("../domains/catalog/catalogRepository")

    const models = [
      User,
      OTP,
      Course,
      Category,
      Section,
      SubSection,
      CourseProgress,
      RatingAndReview,
      Purchase,
    ]
    const timings = {}

    try {
      await mongoose.connect(mongoUri, { autoIndex: false })
      await mongoose.connection.dropDatabase()
      await Promise.all(models.map((model) => model.createIndexes()))

      const learnerProfile = await Profile.create({
        about: "Mongoose compatibility learner",
      })
      const instructorProfile = await Profile.create({
        about: "Mongoose compatibility instructor",
      })
      const learner = await User.create({
        accountType: "Student",
        additionalDetails: learnerProfile._id,
        email: "mongoose-learner@example.test",
        firstName: "Mongoose",
        password: "hashed-password",
      })
      const instructor = await User.create({
        accountType: "Instructor",
        additionalDetails: instructorProfile._id,
        approved: false,
        email: "mongoose-instructor@example.test",
        firstName: "Database",
        password: "hashed-password",
      })

      assert.equal(learner.active, true)
      assert.equal(learner.approved, true)
      assert.equal(learner.sessionVersion, 0)
      assert.equal(learner.instructorApprovalStatus, "NotApplicable")
      assert.equal(instructor.approved, false)
      assert.equal(instructor.instructorApprovalStatus, "Pending")
      assert.equal(learner.toJSON().sessionVersion, undefined)

      const defaultLearner = await User.findById(learner._id).lean()
      assert.equal(defaultLearner.password, undefined)
      const learnerWithPassword = await User.findById(learner._id)
        .select("+password")
        .lean()
      assert.equal(learnerWithPassword.password, "hashed-password")

      await assert.rejects(
        new User({
          accountType: "Visitor",
          additionalDetails: learnerProfile._id,
          email: "invalid-role@example.test",
          firstName: "Invalid",
          password: "hashed-password",
        }).validate(),
        (error) => error?.name === "ValidationError"
      )
      await expectDuplicateKey(
        User.create({
          accountType: "Student",
          additionalDetails: learnerProfile._id,
          email: learner.email.toUpperCase(),
          firstName: "Duplicate",
          password: "hashed-password",
        })
      )
      const versionedLearner = await User.findOneAndUpdate(
        { _id: learner._id, sessionVersion: 0 },
        { $inc: { sessionVersion: 1 } },
        { returnDocument: "after", runValidators: true }
      )
      assert.equal(versionedLearner.sessionVersion, 1)

      const otp = await OTP.create({
        email: "otp@example.test",
        expiresAt: new Date(Date.now() + 60_000),
        otpHash: "hashed-otp",
      })
      const hiddenOtp = await OTP.findById(otp._id).lean()
      assert.equal(hiddenOtp.otpHash, undefined)
      const selectedOtp = await OTP.findOne({ email: "otp@example.test" })
        .select("+otpHash")
        .lean()
      assert.equal(selectedOtp.otpHash, "hashed-otp")
      await OTP.create({
        email: "expired-otp@example.test",
        expiresAt: new Date(Date.now() - 60_000),
        otpHash: "expired-hash",
      })
      const expiredOtp = await OTP.findOne({
        email: "expired-otp@example.test",
      }).lean()
      assert.equal(expiredOtp.expiresAt.getTime() < Date.now(), true)

      const category = await Category.create({
        description: "Database compatibility courses",
        name: "Mongoose Integration",
      })
      const lesson = await SubSection.create({
        description: "Protected database lesson",
        timeDuration: "600",
        title: "Mongoose compatibility",
        videoDeliveryType: "authenticated",
        videoFormat: "mp4",
        videoPublicId: "mongoose/private/lesson",
        videoUrl: "https://media.example.test/private.mp4",
      })
      const section = await Section.create({
        sectionName: "Database compatibility",
        subSection: [lesson._id],
      })
      const course = await Course.create({
        category: category._id,
        courseContent: [section._id],
        courseDescription: "Characterizes Mongoose-backed course behavior.",
        courseName: "Mongoose Compatibility",
        instructor: instructor._id,
        instructions: ["Use disposable data"],
        price: 1499,
        status: "Published",
        studentsEnroled: [learner._id],
        tag: ["mongoose", "database"],
        thumbnail: "https://media.example.test/course.png",
        whatYouWillLearn: "Stable Mongoose model behavior",
      })
      await Category.updateOne(
        { _id: category._id },
        { $addToSet: { courses: course._id } }
      )
      await User.updateOne(
        { _id: instructor._id },
        { $addToSet: { courses: course._id } }
      )
      await User.updateOne(
        { _id: learner._id },
        { $addToSet: { courses: course._id } }
      )

      await Course.create({
        category: category._id,
        courseDescription: "A draft that must stay out of public queries.",
        courseName: "Mongoose Draft",
        instructor: instructor._id,
        instructions: ["Keep private"],
        price: 999,
        status: "Draft",
        tag: ["draft"],
        thumbnail: "https://media.example.test/draft.png",
        whatYouWillLearn: "Draft behavior",
      })

      const populatedCourse = await timeOperation(
        timings,
        "courseDetailPopulateMs",
        () =>
          Course.findById(course._id)
            .populate({ path: "category", select: "name description" })
            .populate({ path: "instructor", select: "firstName lastName" })
            .populate({
              path: "courseContent",
              populate: { path: "subSection" },
            })
            .lean()
      )
      assert.equal(populatedCourse.category.name, "Mongoose Integration")
      assert.equal(populatedCourse.instructor.firstName, "Database")
      assert.equal(
        populatedCourse.courseContent[0].subSection[0].title,
        "Mongoose compatibility"
      )
      assert.equal(
        populatedCourse.courseContent[0].subSection[0].videoPublicId,
        undefined
      )

      const publicCourses = await Course.find({ status: "Published" }).lean()
      assert.deepEqual(
        publicCourses.map((candidate) => candidate.courseName),
        ["Mongoose Compatibility"]
      )
      const instructorCourses = await timeOperation(
        timings,
        "instructorCourseQueryMs",
        () =>
          Course.find({ instructor: instructor._id })
            .sort({ createdAt: -1 })
            .lean()
      )
      assert.equal(instructorCourses.length, 2)

      const rating = await RatingAndReview.create({
        course: course._id,
        rating: 5,
        review: "Stable relationship behavior",
        user: learner._id,
      })
      await Course.updateOne(
        { _id: course._id },
        { $addToSet: { ratingAndReviews: rating._id } }
      )
      await expectDuplicateKey(
        RatingAndReview.create({
          course: course._id,
          rating: 4,
          review: "Duplicate relationship",
          user: learner._id,
        })
      )

      const progress = await CourseProgress.create({
        completedVideos: [lesson._id],
        courseID: course._id,
        userId: learner._id,
      })
      await CourseProgress.updateOne(
        { _id: progress._id },
        { $addToSet: { completedVideos: lesson._id } }
      )
      const storedProgress = await timeOperation(
        timings,
        "courseProgressLookupMs",
        () =>
          CourseProgress.findOne({
            courseID: course._id,
            userId: learner._id,
          }).lean()
      )
      assert.equal(storedProgress.completedVideos.length, 1)
      await expectDuplicateKey(
        CourseProgress.create({
          courseID: course._id,
          userId: learner._id,
        })
      )

      const purchaseInput = (overrides = {}) => ({
        activeCourses: [course._id],
        amount: 1499,
        checkoutAcknowledgedAt: new Date(),
        checkoutExpiresAt: new Date(Date.now() + 15 * 60_000),
        checkoutKey: "mongoose-checkout",
        checkoutPolicySource: "web_checkout",
        checkoutTermsVersion: "2026-07-18",
        courses: [course._id],
        currency: "INR",
        idempotencyKey: "mongoose-idempotency",
        lineItems: [
          {
            amount: 1499,
            course: course._id,
            courseName: course.courseName,
          },
        ],
        receipt: "mongoose-receipt",
        refundPolicyVersion: "2026-07-18",
        refundWindowDays: 7,
        user: learner._id,
        ...overrides,
      })
      const purchase = await Purchase.create(purchaseInput())
      assert.equal(purchase.status, "created")
      assert.equal(purchase.refundWindowOverride, false)

      purchase.amount = 1
      purchase.courses = []
      purchase.lineItems[0].amount = 1
      await purchase.save()
      const immutablePurchase = await Purchase.findById(purchase._id).lean()
      assert.equal(immutablePurchase.amount, 1499)
      assert.deepEqual(immutablePurchase.courses, [course._id])
      assert.equal(immutablePurchase.lineItems[0].amount, 1499)

      const paidPurchase = await Purchase.findOneAndUpdate(
        { _id: purchase._id, status: "created" },
        { $set: { paidAt: new Date(), status: "paid" } },
        { returnDocument: "after", runValidators: true }
      )
      assert.equal(paidPurchase.status, "paid")
      const losingPaymentClaim = await Purchase.findOneAndUpdate(
        { _id: purchase._id, status: "created" },
        { $set: { paidAt: new Date(), status: "paid" } },
        { returnDocument: "after", runValidators: true }
      )
      assert.equal(losingPaymentClaim, null)

      const requestedPurchase = await Purchase.findOneAndUpdate(
        { _id: purchase._id, status: "paid" },
        {
          $set: {
            reconciliationRequiredAt: new Date(),
            refundOriginStatus: "refund_requested",
            refundProviderStatus: "pending",
            refundRequestNote: "Compatibility characterization",
            refundRequestedAt: new Date(),
            status: "refund_requested",
          },
        },
        { returnDocument: "after", runValidators: true }
      )
      assert.equal(requestedPurchase.status, "refund_requested")
      const refundPurchase = await timeOperation(
        timings,
        "purchaseLookupMs",
        () => Purchase.findById(purchase._id).lean()
      )
      assert.equal(refundPurchase.status, "refund_requested")
      assert.equal(refundPurchase.refundProviderStatus, "pending")
      assert.equal(
        refundPurchase.refundRequestNote,
        "Compatibility characterization"
      )

      await expectDuplicateKey(
        Purchase.create(
          purchaseInput({
            checkoutKey: "active-course-conflict",
            idempotencyKey: "active-course-conflict",
            receipt: "active-course-conflict",
          })
        ),
        "activeCourses"
      )
      await expectDuplicateKey(
        Purchase.create(
          purchaseInput({
            activeCourses: undefined,
            checkoutKey: "idempotency-conflict",
            receipt: "idempotency-conflict",
          })
        ),
        "idempotencyKey"
      )
      await expectDuplicateKey(
        Purchase.create(
          purchaseInput({
            activeCourses: undefined,
            checkoutKey: "mongoose-checkout",
            idempotencyKey: "checkout-key-conflict",
            receipt: "checkout-key-conflict",
          })
        ),
        "checkoutKey"
      )
      await expectDuplicateKey(
        Purchase.create(
          purchaseInput({
            activeCourses: undefined,
            checkoutKey: "receipt-conflict",
            idempotencyKey: "receipt-conflict",
            receipt: "mongoose-receipt",
          })
        ),
        "receipt"
      )

      const providerPurchase = await Purchase.create(
        purchaseInput({
          activeCourses: undefined,
          checkoutKey: "provider-identifiers",
          idempotencyKey: "provider-identifiers",
          razorpayOrderId: "order_mongoose_unique",
          razorpayPaymentId: "payment_mongoose_unique",
          receipt: "provider-identifiers",
          refundId: "refund_mongoose_unique",
        })
      )
      assert.equal(providerPurchase.razorpayOrderId, "order_mongoose_unique")
      for (const [field, value] of [
        ["razorpayOrderId", "order_mongoose_unique"],
        ["razorpayPaymentId", "payment_mongoose_unique"],
        ["refundId", "refund_mongoose_unique"],
      ]) {
        await expectDuplicateKey(
          Purchase.create(
            purchaseInput({
              activeCourses: undefined,
              checkoutKey: `duplicate-${field}`,
              idempotencyKey: `duplicate-${field}`,
              receipt: `duplicate-${field}`,
              [field]: value,
            })
          ),
          field
        )
      }

      const catalogResults = await timeOperation(
        timings,
        "catalogAggregateMs",
        () =>
          Course.aggregate(
            buildCatalogPipeline({ limit: 20, sort: "newest" }, null, 21)
          ).exec()
      )
      assert.equal(catalogResults.length, 1)
      assert.equal(catalogResults[0].courseName, "Mongoose Compatibility")
      assert.equal(catalogResults[0].durationSeconds, 600)
      assert.equal(catalogResults[0].ratingAverage, 5)

      await assert.rejects(
        Course.findById("not-an-object-id").exec(),
        (error) => {
          assert.equal(error?.name, "CastError")
          assert.equal(error?.kind, "ObjectId")
          assert.equal(error?.path, "_id")
          return true
        }
      )

      const otpIndexes = await OTP.collection.indexes()
      assert.equal(
        otpIndexes.some(
          (index) =>
            index.key?.expiresAt === 1 && index.expireAfterSeconds === 0
        ),
        true
      )
      const progressIndexes = await CourseProgress.collection.indexes()
      assert.equal(
        progressIndexes.some(
          (index) =>
            index.key?.userId === 1 &&
            index.key?.courseID === 1 &&
            index.unique === true
        ),
        true
      )
      const purchaseIndexes = await Purchase.collection.indexes()
      for (const indexName of [
        "unique_active_purchase_per_user_course",
        "unique_active_checkout_set",
        "unique_checkout_idempotency_key",
      ]) {
        assert.equal(
          purchaseIndexes.some((index) => index.name === indexName),
          true,
          `${indexName} should exist`
        )
      }

      console.log(
        JSON.stringify({
          driver: mongodbDriverVersion(),
          event: "mongoose.compatibility.performance_smoke",
          mongoose: mongoose.version,
          timings,
        })
      )
    } finally {
      if (mongoose.connection.readyState !== 0) {
        await mongoose.connection.dropDatabase()
        await mongoose.disconnect()
      }
    }
  }
)

test("Mongoose integration URI guards reject production-looking targets", () => {
  assert.throws(() =>
    assertDisposableMongoUri("mongodb+srv://cluster.mongodb.net/production")
  )
  assert.throws(() =>
    assertDisposableMongoUri(
      "mongodb://example.com/studynotion_mongoose_test_remote"
    )
  )
  assert.throws(() =>
    assertDisposableMongoUri("mongodb://localhost/application_production")
  )
})
