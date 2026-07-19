// Import the Mongoose library
const mongoose = require("mongoose")

const policyAcceptanceSchema = new mongoose.Schema(
  {
    acceptedAt: { type: Date, required: true, immutable: true },
    eligibilityConfirmedAt: { type: Date, required: true, immutable: true },
    privacyNoticeVersion: {
      type: String,
      required: true,
      immutable: true,
      maxlength: 40,
    },
    source: {
      type: String,
      enum: [
        "email_signup",
        "google_signup",
        "account_update",
        "admin_provisioning",
        "local_seed",
      ],
      required: true,
      immutable: true,
    },
    termsVersion: {
      type: String,
      required: true,
      immutable: true,
      maxlength: 40,
    },
  },
  { _id: false }
)

// Define the user schema using the Mongoose Schema constructor
const userSchema = new mongoose.Schema(
  {
    // Define the name field with type String, required, and trimmed
    firstName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 80,
    },
    lastName: {
      type: String,
      default: "",
      trim: true,
      maxlength: 80,
    },
    // Define the email field with type String, required, and trimmed
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      maxlength: 254,
      unique: true,
      index: true,
    },

    // Define the password field with type String and required
    password: {
      type: String,
      required() {
        return this.authProviders?.includes("local")
      },
      select: false,
    },
    authProviders: {
      type: [String],
      enum: ["local", "google"],
      default: ["local"],
    },
    googleId: {
      type: String,
      unique: true,
      sparse: true,
      select: false,
    },
    // Define the role field with type String and enum values of "Admin", "Student", or "Visitor"
    accountType: {
      type: String,
      enum: ["Admin", "Student", "Instructor"],
      required: true,
    },
    active: {
      type: Boolean,
      default: true,
    },
    deletionPending: {
      type: Boolean,
      default: false,
      select: false,
    },
    deletionStartedAt: {
      type: Date,
      select: false,
    },
    deletionLockId: {
      type: String,
      select: false,
    },
    deletionLockUntil: {
      type: Date,
      select: false,
    },
    paymentOperationLockId: {
      type: String,
      select: false,
    },
    paymentOperationLockUntil: {
      type: Date,
      select: false,
    },
    approved: {
      type: Boolean,
      default() {
        return this.accountType !== "Instructor"
      },
    },
    instructorApprovalStatus: {
      type: String,
      enum: ["NotApplicable", "Pending", "Approved", "Rejected"],
      default() {
        if (this.accountType !== "Instructor") return "NotApplicable"
        return this.approved === false ? "Pending" : "Approved"
      },
      index: true,
    },
    instructorReviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      select: false,
    },
    instructorReviewedAt: Date,
    instructorReviewNote: {
      type: String,
      trim: true,
      maxlength: 1000,
      select: false,
    },
    sessionVersion: {
      type: Number,
      default: 0,
      min: 0,
    },
    policyAcceptances: {
      type: [policyAcceptanceSchema],
      default: [],
      select: false,
    },
    additionalDetails: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "Profile",
    },
    courses: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Course",
      },
    ],
    token: {
      type: String,
      select: false,
    },
    resetPasswordTokenHash: {
      type: String,
      select: false,
    },
    resetPasswordExpires: {
      type: Date,
      select: false,
    },
    image: {
      type: String,
      maxlength: 2048,
    },
    imagePublicId: {
      type: String,
      select: false,
    },
    courseProgress: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "courseProgress",
      },
    ],

    // Add timestamps for when the document is created and last modified
  },
  { timestamps: true }
)

userSchema.set("toJSON", {
  transform: (_document, returnedObject) => {
    delete returnedObject.password
    delete returnedObject.googleId
    delete returnedObject.imagePublicId
    delete returnedObject.token
    delete returnedObject.resetPasswordTokenHash
    delete returnedObject.resetPasswordExpires
    delete returnedObject.sessionVersion
    delete returnedObject.instructorReviewedBy
    delete returnedObject.instructorReviewNote
    delete returnedObject.policyAcceptances
    delete returnedObject.deletionPending
    delete returnedObject.deletionStartedAt
    delete returnedObject.deletionLockId
    delete returnedObject.deletionLockUntil
    delete returnedObject.paymentOperationLockId
    delete returnedObject.paymentOperationLockUntil
    return returnedObject
  },
})

userSchema.index({ accountType: 1, instructorApprovalStatus: 1, createdAt: 1 })

// Export the Mongoose model for the user schema, using the name "user"
module.exports = mongoose.model("user", userSchema)
