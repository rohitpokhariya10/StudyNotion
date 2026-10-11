const mongoose = require("mongoose")
const {
  NEET_ANSWER_KEY_STATUSES,
  NEET_OPTION_KEYS,
} = require("@studynotion/contracts/neet")

const { ObjectId } = mongoose.Schema.Types

// Private, append-only answer keys for one paper version. Corrections (for
// example an NTA final key that drops a question) create a new version; no
// version is ever edited in place. Only scoring and operator tooling read
// this collection, and no student contract can represent it.

const keySchema = new mongoose.Schema(
  {
    questionId: { type: ObjectId, ref: "NeetQuestion", required: true },
    status: {
      type: String,
      enum: NEET_ANSWER_KEY_STATUSES,
      default: "ACTIVE",
      required: true,
    },
    // ACTIVE requires at least one key; more than one means several options
    // are accepted as correct. ALL_CORRECT and DROPPED ignore this list.
    correctOptionKeys: {
      type: [{ type: String, enum: NEET_OPTION_KEYS }],
      default: [],
    },
  },
  { _id: false }
)

keySchema.path("correctOptionKeys").validate(function activeKeyHasOptions(
  value
) {
  if (this.status !== "ACTIVE") return true
  return value.length >= 1 && new Set(value).size === value.length
}, "An active answer key requires at least one distinct option")

const neetAnswerKeyVersionSchema = new mongoose.Schema(
  {
    paperVersionId: {
      type: ObjectId,
      ref: "NeetPaperVersion",
      required: true,
      immutable: true,
    },
    version: { type: Number, required: true, min: 1, immutable: true },
    keys: { type: [keySchema], immutable: true },
    reason: { type: String, required: true, maxlength: 400, immutable: true },
    createdBy: { type: String, default: "system", maxlength: 80 },
    createdAt: { type: Date, required: true, immutable: true },
  },
  { timestamps: false }
)

neetAnswerKeyVersionSchema.index(
  { paperVersionId: 1, version: -1 },
  { unique: true, name: "neet_answer_key_version_unique" }
)

module.exports = mongoose.model(
  "NeetAnswerKeyVersion",
  neetAnswerKeyVersionSchema
)
