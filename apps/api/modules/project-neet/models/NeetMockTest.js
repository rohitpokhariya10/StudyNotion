const mongoose = require("mongoose")
const {
  NEET_DIFFICULTIES,
  NEET_EXAM_MODES,
  NEET_PROCTOR_SEVERITIES,
} = require("@studynotion/contracts/neet")

const markingSchema = new mongoose.Schema(
  {
    correct: { type: Number, min: -100, max: 100 },
    incorrect: { type: Number, min: -100, max: 100 },
    unanswered: { type: Number, min: -100, max: 100 },
  },
  { _id: false }
)

const sectionSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      trim: true,
      match: /^[a-z][a-z0-9-]{0,39}$/,
    },
    title: { type: String, required: true, trim: true, maxlength: 80 },
    subjectKey: {
      type: String,
      required: true,
      trim: true,
      match: /^[a-z][a-z0-9-]{0,39}$/,
    },
    subjectLabel: { type: String, required: true, trim: true, maxlength: 60 },
    order: { type: Number, required: true, min: 1, max: 100 },
    questionCount: {
      type: Number,
      required: true,
      min: 1,
      max: 500,
      validate: Number.isInteger,
    },
    marking: { type: markingSchema, default: undefined },
  },
  { _id: false }
)

const ruleOverrideSchema = new mongoose.Schema(
  {
    severity: { type: String, enum: NEET_PROCTOR_SEVERITIES },
    counted: Boolean,
    warnEvery: { type: Number, min: 0, max: 100 },
    escalateAfter: { type: Number, min: 0, max: 1000 },
    enabled: Boolean,
  },
  { _id: false }
)

// Stored policy values override the module defaults; omitted values inherit.
const proctorPolicySchema = new mongoose.Schema(
  {
    version: { type: Number, min: 1 },
    consentVersion: { type: String, maxlength: 40 },
    requirements: {
      camera: Boolean,
      microphone: Boolean,
      fullscreen: Boolean,
      screenShare: Boolean,
    },
    monitoring: {
      visibility: Boolean,
      focus: Boolean,
      clipboard: Boolean,
      network: Boolean,
      faceSignals: Boolean,
      audioSignals: Boolean,
      duplicateSessions: Boolean,
    },
    signals: {
      faceAbsentSeconds: { type: Number, min: 2, max: 120 },
      multipleFacesSeconds: { type: Number, min: 1, max: 120 },
      headAwaySeconds: { type: Number, min: 2, max: 120 },
      audioActivitySeconds: { type: Number, min: 1, max: 120 },
      sampleIntervalMs: { type: Number, min: 250, max: 10_000 },
    },
    warnings: {
      maxWarnings: { type: Number, min: 1, max: 20 },
      cooldownSeconds: { type: Number, min: 0, max: 600 },
    },
    autoSubmit: {
      enabled: Boolean,
      softSignalsCanSubmit: Boolean,
    },
    rules: { type: Map, of: ruleOverrideSchema, default: undefined },
  },
  { _id: false }
)

const neetMockTestSchema = new mongoose.Schema(
  {
    slug: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      maxlength: 80,
      match: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    },
    title: { type: String, required: true, trim: true, maxlength: 120 },
    tagline: { type: String, default: "", trim: true, maxlength: 160 },
    description: { type: String, default: "", trim: true, maxlength: 1200 },
    instructions: {
      type: [{ type: String, trim: true, maxlength: 600 }],
      default: [],
      validate: (value) => value.length <= 40,
    },
    difficulty: {
      type: String,
      enum: NEET_DIFFICULTIES,
      default: "STANDARD",
    },
    status: {
      type: String,
      enum: ["DRAFT", "PUBLISHED", "ARCHIVED"],
      default: "DRAFT",
      required: true,
    },
    version: { type: Number, default: 1, min: 1 },
    isSample: { type: Boolean, default: false },
    patternNote: { type: String, default: null, maxlength: 400 },
    durationSeconds: {
      type: Number,
      required: true,
      min: 60,
      max: 6 * 60 * 60,
      validate: Number.isInteger,
    },
    marking: {
      type: markingSchema,
      default: () => ({ correct: 4, incorrect: -1, unanswered: 0 }),
    },
    sections: {
      type: [sectionSchema],
      validate: [
        (value) => value.length >= 1 && value.length <= 12,
        "A test requires between 1 and 12 sections",
      ],
    },
    ordering: {
      shuffleQuestionsWithinSection: { type: Boolean, default: false },
    },
    modes: {
      type: [{ type: String, enum: NEET_EXAM_MODES }],
      default: () => [...NEET_EXAM_MODES],
      validate: (value) =>
        value.length >= 1 && new Set(value).size === value.length,
    },
    availability: {
      opensAt: { type: Date, default: null },
      closesAt: { type: Date, default: null },
    },
    timing: {
      networkGraceSeconds: { type: Number, min: 0, max: 30 },
      registrationWindowHours: { type: Number, min: 1, max: 24 * 14 },
    },
    proctorPolicy: { type: proctorPolicySchema, default: () => ({}) },
    publishedAt: { type: Date, default: null },
    // The paper version new attempts start on. Attempts pin their own copy.
    currentPaperVersionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "NeetPaperVersion",
      default: null,
    },
    displayOrder: { type: Number, default: 100 },
  },
  { timestamps: true }
)

neetMockTestSchema.path("sections").validate(function uniqueSectionKeys(value) {
  return new Set(value.map((section) => section.key)).size === value.length
}, "Section keys must be unique")

neetMockTestSchema.index({ slug: 1 }, { unique: true, name: "neet_test_slug" })
neetMockTestSchema.index(
  { status: 1, displayOrder: 1, publishedAt: -1 },
  { name: "neet_test_published_listing" }
)

module.exports = mongoose.model("NeetMockTest", neetMockTestSchema)
