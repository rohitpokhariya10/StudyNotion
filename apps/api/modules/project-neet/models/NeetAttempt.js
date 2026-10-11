const mongoose = require("mongoose")
const {
  NEET_ATTEMPT_STATUSES,
  NEET_EXAM_MODES,
  NEET_OPTION_KEYS,
  NEET_PROCTOR_EVENT_TYPES,
  NEET_PROCTOR_SEVERITIES,
  NEET_REVIEW_STATUSES,
  NEET_SUBMISSION_REASONS,
  NEET_SYSTEM_CHECK_STATES,
} = require("@studynotion/contracts/neet")

const { ObjectId } = mongoose.Schema.Types

const marksSchema = new mongoose.Schema(
  {
    correct: { type: Number, required: true },
    incorrect: { type: Number, required: true },
    unanswered: { type: Number, default: 0 },
  },
  { _id: false }
)

const paperSchema = new mongoose.Schema(
  {
    testVersion: { type: Number, required: true },
    seed: { type: String, required: true, maxlength: 64 },
    sections: [
      new mongoose.Schema(
        {
          key: { type: String, required: true },
          title: { type: String, required: true },
          subjectKey: { type: String, required: true },
          subjectLabel: { type: String, required: true },
        },
        { _id: false }
      ),
    ],
    questions: [
      new mongoose.Schema(
        {
          questionId: { type: ObjectId, ref: "NeetQuestion", required: true },
          revision: { type: Number, required: true },
          sectionKey: { type: String, required: true },
          number: { type: Number, required: true },
          marks: { type: marksSchema, required: true },
        },
        { _id: false }
      ),
    ],
  },
  { _id: false }
)

// One element per paper question, written only by sequenced, compare-and-set
// autosave updates while the attempt is IN_PROGRESS.
const responseSchema = new mongoose.Schema(
  {
    questionId: { type: ObjectId, ref: "NeetQuestion", required: true },
    selectedOption: {
      type: String,
      enum: [...NEET_OPTION_KEYS, null],
      default: null,
    },
    markedForReview: { type: Boolean, default: false },
    visited: { type: Boolean, default: false },
    timeSpentMs: { type: Number, default: 0, min: 0 },
    seq: { type: Number, default: 0, min: 0 },
    updatedAt: { type: Date, default: null },
  },
  { _id: false }
)

const resultSectionSchema = new mongoose.Schema(
  {
    key: String,
    title: String,
    subjectKey: String,
    subjectLabel: String,
    questionCount: Number,
    attempted: Number,
    correct: Number,
    incorrect: Number,
    unanswered: Number,
    dropped: { type: Number, default: 0 },
    score: Number,
    maxScore: Number,
  },
  { _id: false }
)

const resultQuestionSchema = new mongoose.Schema(
  {
    questionId: { type: ObjectId, ref: "NeetQuestion" },
    revision: Number,
    sectionKey: String,
    number: Number,
    selectedOption: { type: String, default: null },
    correctOptionKeys: [String],
    keyStatus: { type: String, default: "ACTIVE" },
    outcome: {
      type: String,
      enum: ["CORRECT", "INCORRECT", "UNANSWERED", "DROPPED"],
    },
    marksAwarded: Number,
    markedForReview: Boolean,
    timeSpentMs: Number,
  },
  { _id: false }
)

// Immutable scoring snapshot written once by the SUBMITTING -> final
// transition. Per-question outcomes are retained for future analysis phases.
const resultSchema = new mongoose.Schema(
  {
    scoringVersion: { type: Number, required: true },
    // Answer-key version used; null for legacy results scored from live keys.
    answerKeyVersion: { type: Number, default: null },
    scoredAt: { type: Date, required: true },
    summary: {
      score: Number,
      maxScore: Number,
      questionCount: Number,
      attempted: Number,
      correct: Number,
      incorrect: Number,
      unanswered: Number,
      dropped: { type: Number, default: 0 },
      markedForReview: Number,
      accuracyPercent: Number,
      durationUsedSeconds: Number,
      positiveMarks: Number,
      negativeMarks: Number,
    },
    sections: [resultSectionSchema],
    questions: [resultQuestionSchema],
  },
  { _id: false }
)

// Earlier results superseded by an answer-key correction, kept for audit.
const resultHistorySchema = new mongoose.Schema(
  {
    answerKeyVersion: { type: Number, default: null },
    scoringVersion: Number,
    scoredAt: Date,
    supersededAt: Date,
    score: Number,
    maxScore: Number,
    correct: Number,
    incorrect: Number,
    unanswered: Number,
    dropped: Number,
  },
  { _id: false }
)

// Human review of monitoring flags. It never changes lifecycle status or score.
const reviewSchema = new mongoose.Schema(
  {
    status: {
      type: String,
      enum: NEET_REVIEW_STATUSES,
      default: "NONE",
      required: true,
    },
    flaggedAt: { type: Date, default: null },
    reasons: { type: [String], default: [] },
    decidedAt: { type: Date, default: null },
  },
  { _id: false }
)

const warningSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    level: { type: Number, required: true },
    counted: { type: Boolean, required: true },
    ruleType: { type: String, enum: NEET_PROCTOR_EVENT_TYPES, required: true },
    severity: { type: String, enum: NEET_PROCTOR_SEVERITIES, required: true },
    message: { type: String, required: true, maxlength: 400 },
    issuedAt: { type: Date, required: true },
  },
  { _id: false }
)

const counterSchema = new mongoose.Schema(
  {
    total: { type: Number, default: 0 },
    pending: { type: Number, default: 0 },
    lastWarnedAt: { type: Date, default: null },
  },
  { _id: false }
)

const proctoringSchema = new mongoose.Schema(
  {
    status: {
      type: String,
      enum: ["PENDING", "ACTIVE", "ENDED"],
      default: "PENDING",
    },
    // Resolved policy snapshot (defaults merged with the test's overrides).
    policy: { type: mongoose.Schema.Types.Mixed, default: null },
    revision: { type: Number, default: 0 },
    counters: { type: Map, of: counterSchema, default: () => new Map() },
    warningCount: { type: Number, default: 0 },
    softWarningCount: { type: Number, default: 0 },
    warningSequence: { type: Number, default: 0 },
    warnings: { type: [warningSchema], default: [] },
    eventCount: { type: Number, default: 0 },
    startedAt: { type: Date, default: null },
    endedAt: { type: Date, default: null },
    thresholdExceededAt: { type: Date, default: null },
  },
  { _id: false }
)

const systemCheckState = {
  type: String,
  enum: NEET_SYSTEM_CHECK_STATES,
}

const neetAttemptSchema = new mongoose.Schema(
  {
    userId: { type: ObjectId, ref: "user", required: true, immutable: true },
    testId: {
      type: ObjectId,
      ref: "NeetMockTest",
      required: true,
      immutable: true,
    },
    attemptNumber: { type: Number, required: true, min: 1 },
    // Present (true) only while the attempt is not final. A partial unique
    // index on this flag allows one open attempt per student per test.
    isOpen: { type: Boolean },
    status: {
      type: String,
      enum: NEET_ATTEMPT_STATUSES,
      default: "REGISTERED",
      required: true,
    },
    mode: { type: String, enum: [...NEET_EXAM_MODES, null], default: null },
    // Display name only. Ownership is userId; contact details are not copied.
    candidate: {
      fullName: { type: String, required: true, maxlength: 80 },
    },
    testSnapshot: {
      title: { type: String, required: true },
      version: { type: Number, required: true },
      durationSeconds: { type: Number, required: true },
      questionCount: { type: Number, required: true },
      totalMarks: { type: Number, required: true },
      isSample: { type: Boolean, default: false },
    },
    registrationExpiresAt: { type: Date, required: true },
    instructionsAcceptedAt: { type: Date, default: null },
    proctorConsent: {
      type: new mongoose.Schema(
        {
          version: { type: String, required: true, maxlength: 40 },
          acceptedAt: { type: Date, required: true },
          adultDeclaredAt: { type: Date, default: null },
        },
        { _id: false }
      ),
      default: null,
    },
    systemCheck: {
      type: new mongoose.Schema(
        {
          camera: systemCheckState,
          microphone: systemCheckState,
          fullscreen: systemCheckState,
          screenShare: systemCheckState,
          network: systemCheckState,
          browser: systemCheckState,
          checkedAt: Date,
        },
        { _id: false }
      ),
      default: null,
    },
    startedAt: { type: Date, default: null },
    expiresAt: { type: Date, default: null },
    networkGraceSeconds: { type: Number, default: 0 },
    // Compatibility field; new attempts set this to expiresAt. Expiry checks use expiresAt.
    writesCloseAt: { type: Date, default: null },
    activeSessionId: { type: String, default: null, maxlength: 64 },
    sessionClaimedAt: { type: Date, default: null },
    sessionClaims: { type: Number, default: 0 },
    lastActivityAt: { type: Date, default: null },
    // Immutable published content pinned at start. Null only for legacy
    // attempts started before paper versions existed.
    paperVersionId: { type: ObjectId, ref: "NeetPaperVersion", default: null },
    paper: { type: paperSchema, default: null },
    responses: { type: [responseSchema], default: [] },
    lastSeq: { type: Number, default: 0 },
    submissionRequestedAt: { type: Date, default: null },
    submissionReason: {
      type: String,
      enum: [...NEET_SUBMISSION_REASONS, null],
      default: null,
    },
    submittedAt: { type: Date, default: null },
    endedAt: { type: Date, default: null },
    result: { type: resultSchema, default: null },
    resultHistory: { type: [resultHistorySchema], default: [] },
    review: { type: reviewSchema, default: () => ({}) },
    proctoring: { type: proctoringSchema, default: null },
  },
  { timestamps: true }
)

neetAttemptSchema.index(
  { userId: 1, testId: 1 },
  {
    unique: true,
    partialFilterExpression: { isOpen: true },
    name: "neet_attempt_one_open_per_test",
  }
)
neetAttemptSchema.index(
  { userId: 1, createdAt: -1 },
  { name: "neet_attempt_user_recent" }
)
// Expiry sweeper: open attempts past their deadline.
neetAttemptSchema.index(
  { status: 1, expiresAt: 1 },
  { partialFilterExpression: { isOpen: true }, name: "neet_attempt_sweep" }
)
// Human review queue.
neetAttemptSchema.index(
  { "review.status": 1, updatedAt: -1 },
  {
    partialFilterExpression: {
      "review.status": { $in: ["FLAGGED", "UNDER_REVIEW"] },
    },
    name: "neet_attempt_review_queue",
  }
)
// Rescoring after an answer-key correction.
neetAttemptSchema.index(
  { paperVersionId: 1, status: 1 },
  {
    partialFilterExpression: { paperVersionId: { $type: "objectId" } },
    name: "neet_attempt_paper_version",
  }
)

module.exports = mongoose.model("NeetAttempt", neetAttemptSchema)
