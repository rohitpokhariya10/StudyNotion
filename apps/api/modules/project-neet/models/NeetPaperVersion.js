const mongoose = require("mongoose")
const {
  NEET_LIMITS,
  NEET_OPTION_KEYS,
  isAllowedNeetMediaUrl,
} = require("@studynotion/contracts/neet")

const { ObjectId } = mongoose.Schema.Types

// An immutable published snapshot of a test's question content. Attempts pin
// one version at start, so later edits to the question bank never change what
// a running or historical attempt shows. Answer keys are deliberately absent;
// they live in NeetAnswerKeyVersion.

const marksSchema = new mongoose.Schema(
  {
    correct: { type: Number, required: true },
    incorrect: { type: Number, required: true },
    unanswered: { type: Number, default: 0 },
  },
  { _id: false }
)

const sectionSchema = new mongoose.Schema(
  {
    key: { type: String, required: true },
    title: { type: String, required: true },
    subjectKey: { type: String, required: true },
    subjectLabel: { type: String, required: true },
    order: { type: Number, required: true },
    questionCount: { type: Number, required: true },
  },
  { _id: false }
)

const questionSchema = new mongoose.Schema(
  {
    questionId: { type: ObjectId, ref: "NeetQuestion", required: true },
    revision: { type: Number, required: true },
    sectionKey: { type: String, required: true },
    order: { type: Number, required: true },
    marks: { type: marksSchema, required: true },
    text: {
      type: String,
      required: true,
      maxlength: NEET_LIMITS.maxQuestionTextLength,
    },
    options: [
      new mongoose.Schema(
        {
          key: { type: String, enum: NEET_OPTION_KEYS, required: true },
          text: {
            type: String,
            required: true,
            maxlength: NEET_LIMITS.maxOptionTextLength,
          },
        },
        { _id: false }
      ),
    ],
    media: [
      new mongoose.Schema(
        {
          kind: { type: String, enum: ["image"], required: true },
          url: {
            type: String,
            required: true,
            validate: [
              isAllowedNeetMediaUrl,
              "Question media URL is not allowed",
            ],
          },
          alt: { type: String, required: true, maxlength: 400 },
          width: { type: Number, default: null },
          height: { type: Number, default: null },
        },
        { _id: false }
      ),
    ],
  },
  { _id: false }
)

const neetPaperVersionSchema = new mongoose.Schema(
  {
    testId: {
      type: ObjectId,
      ref: "NeetMockTest",
      required: true,
      immutable: true,
    },
    version: { type: Number, required: true, min: 1, immutable: true },
    durationSeconds: { type: Number, required: true, immutable: true },
    sections: { type: [sectionSchema], immutable: true },
    questions: { type: [questionSchema], immutable: true },
    contentHash: { type: String, required: true, immutable: true },
    publishedAt: { type: Date, required: true, immutable: true },
    publishedBy: { type: String, default: "system", maxlength: 80 },
  },
  { timestamps: false }
)

neetPaperVersionSchema.index(
  { testId: 1, version: 1 },
  { unique: true, name: "neet_paper_version_unique" }
)

module.exports = mongoose.model("NeetPaperVersion", neetPaperVersionSchema)
