const mongoose = require("mongoose")
const {
  NEET_LIMITS,
  NEET_OPTION_KEYS,
  isAllowedNeetMediaUrl,
} = require("@studynotion/contracts/neet")

const optionSchema = new mongoose.Schema(
  {
    key: { type: String, enum: NEET_OPTION_KEYS, required: true },
    text: {
      type: String,
      required: true,
      trim: true,
      maxlength: NEET_LIMITS.maxOptionTextLength,
    },
  },
  { _id: false }
)

const mediaSchema = new mongoose.Schema(
  {
    kind: { type: String, enum: ["image"], required: true },
    url: {
      type: String,
      required: true,
      validate: [isAllowedNeetMediaUrl, "Question media URL is not allowed"],
    },
    alt: { type: String, required: true, trim: true, maxlength: 400 },
    width: { type: Number, default: null, min: 1, max: 4000 },
    height: { type: Number, default: null, min: 1, max: 4000 },
  },
  { _id: false }
)

const answerKeySchema = new mongoose.Schema(
  {
    correctOptionKeys: {
      type: [{ type: String, enum: NEET_OPTION_KEYS }],
      validate: (value) =>
        value.length >= 1 && new Set(value).size === value.length,
    },
  },
  { _id: false }
)

const neetQuestionSchema = new mongoose.Schema(
  {
    testId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "NeetMockTest",
      required: true,
      immutable: true,
    },
    sectionKey: {
      type: String,
      required: true,
      match: /^[a-z][a-z0-9-]{0,39}$/,
    },
    order: { type: Number, required: true, min: 1, validate: Number.isInteger },
    text: {
      type: String,
      required: true,
      trim: true,
      maxlength: NEET_LIMITS.maxQuestionTextLength,
    },
    options: {
      type: [optionSchema],
      validate: [
        (value) =>
          value.length === NEET_OPTION_KEYS.length &&
          new Set(value.map((option) => option.key)).size === value.length,
        "A question requires one option for each key",
      ],
    },
    media: {
      type: [mediaSchema],
      default: [],
      validate: (value) => value.length <= 3,
    },
    // Answer material never leaves the server before scoring. Both fields are
    // excluded from default projections and from serialization.
    answerKey: { type: answerKeySchema, required: true, select: false },
    explanation: {
      type: String,
      default: "",
      maxlength: 4000,
      select: false,
    },
    marks: {
      correct: { type: Number, min: -100, max: 100 },
      incorrect: { type: Number, min: -100, max: 100 },
    },
    topic: { type: String, default: "", trim: true, maxlength: 120 },
    status: {
      type: String,
      enum: ["ACTIVE", "RETIRED"],
      default: "ACTIVE",
      required: true,
    },
    revision: { type: Number, default: 1, min: 1 },
    isSample: { type: Boolean, default: false },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_document, value) {
        delete value.answerKey
        delete value.explanation
        return value
      },
    },
    toObject: {
      transform(_document, value) {
        delete value.answerKey
        delete value.explanation
        return value
      },
    },
  }
)

neetQuestionSchema.path("answerKey").validate(function keyMatchesOptions(
  value
) {
  const optionKeys = new Set((this.options || []).map((option) => option.key))
  return (value?.correctOptionKeys || []).every((key) => optionKeys.has(key))
}, "Answer keys must reference existing options")

neetQuestionSchema.index(
  { testId: 1, sectionKey: 1, order: 1 },
  { unique: true, name: "neet_question_test_section_order" }
)

module.exports = mongoose.model("NeetQuestion", neetQuestionSchema)
