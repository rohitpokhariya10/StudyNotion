const mongoose = require("mongoose")
const {
  NEET_PROCTOR_DETECTORS,
  NEET_PROCTOR_EVENT_TYPES,
  NEET_PROCTOR_SEVERITIES,
  NEET_PROCTOR_SIGNAL_REASONS,
} = require("@studynotion/contracts/neet")

// Proctoring stores event metadata only. No frames, audio, screen content,
// device identifiers, or free-form browser data are accepted or persisted.
const neetProctorEventSchema = new mongoose.Schema(
  {
    attemptId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "NeetAttempt",
      required: true,
      immutable: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
      immutable: true,
    },
    clientEventId: { type: String, required: true, maxlength: 80 },
    source: { type: String, enum: ["CLIENT", "SERVER"], required: true },
    type: { type: String, enum: NEET_PROCTOR_EVENT_TYPES, required: true },
    severity: { type: String, enum: NEET_PROCTOR_SEVERITIES, required: true },
    // Client-reported time is a hint only and is clamped server-side.
    occurredAt: { type: Date, required: true },
    receivedAt: { type: Date, required: true },
    metadata: {
      reason: { type: String, enum: NEET_PROCTOR_SIGNAL_REASONS },
      detector: { type: String, enum: NEET_PROCTOR_DETECTORS },
      confidence: { type: Number, min: 0, max: 1 },
      faces: { type: Number, min: 0, max: 20 },
      durationMs: { type: Number, min: 0 },
      warningId: { type: String, maxlength: 64 },
      level: { type: Number, min: 0 },
    },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: false }
)

neetProctorEventSchema.index(
  { attemptId: 1, clientEventId: 1 },
  { unique: true, name: "neet_proctor_event_idempotency" }
)
neetProctorEventSchema.index(
  { attemptId: 1, receivedAt: 1 },
  { name: "neet_proctor_event_timeline" }
)
neetProctorEventSchema.index(
  { expiresAt: 1 },
  { expireAfterSeconds: 0, name: "neet_proctor_event_retention" }
)

module.exports = mongoose.model("NeetProctorEvent", neetProctorEventSchema)
