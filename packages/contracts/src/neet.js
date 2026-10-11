const { z } = require("zod")

const {
  createSuccessResponseSchema,
  isoDateTimeSchema,
  objectIdSchema,
} = require("./common")

// Project NEET is a configuration-driven mock-test product. These contracts
// describe the student-facing wire format only: answer keys, explanations,
// and server policy internals intentionally have no representation here.

const NEET_ATTEMPT_STATUSES = Object.freeze([
  "REGISTERED",
  "READY",
  "IN_PROGRESS",
  "SUBMITTING",
  "SUBMITTED",
  "AUTO_SUBMITTED",
  "EXPIRED",
  "TERMINATED",
])
const NEET_FINAL_ATTEMPT_STATUSES = Object.freeze([
  "SUBMITTED",
  "AUTO_SUBMITTED",
  "EXPIRED",
  "TERMINATED",
])
const NEET_EXAM_MODES = Object.freeze(["NON_PROCTORED", "PROCTORED"])
const NEET_SUBMISSION_REASONS = Object.freeze([
  "MANUAL_SUBMIT",
  "TIME_EXPIRED",
  "PROCTOR_POLICY",
  "ADMIN_RECOVERY",
])
const NEET_OPTION_KEYS = Object.freeze(["A", "B", "C", "D"])
const NEET_DIFFICULTIES = Object.freeze(["FOUNDATION", "STANDARD", "ADVANCED"])
const NEET_AVAILABILITY_STATES = Object.freeze(["OPEN", "UPCOMING", "CLOSED"])
const NEET_PROCTOR_SEVERITIES = Object.freeze(["INFO", "LOW", "MEDIUM", "HIGH"])
// Human review of monitoring flags. Independent of submission status: a flag
// never changes an attempt's lifecycle or score.
const NEET_REVIEW_STATUSES = Object.freeze([
  "NONE",
  "FLAGGED",
  "UNDER_REVIEW",
  "CLEARED",
  "ACTION_TAKEN",
])
// Per-question answer-key status (NTA NEET UG 2026 rules). Multiple correct
// options are ACTIVE keys listing more than one option.
const NEET_ANSWER_KEY_STATUSES = Object.freeze([
  "ACTIVE",
  "ALL_CORRECT",
  "DROPPED",
])

// Signals a browser may report. The server derives severity and policy
// outcomes; the client never chooses them.
const NEET_CLIENT_PROCTOR_EVENT_TYPES = Object.freeze([
  "TAB_HIDDEN",
  "WINDOW_BLUR",
  "WINDOW_FOCUS",
  "FULLSCREEN_EXIT",
  "FULLSCREEN_RESTORED",
  "CAMERA_INTERRUPTED",
  "CAMERA_RESTORED",
  "MIC_INTERRUPTED",
  "MIC_RESTORED",
  "SCREEN_SHARE_STOPPED",
  "COPY_ATTEMPT",
  "PASTE_ATTEMPT",
  "CAMERA_OBSTRUCTION",
  "FACE_ABSENT",
  "MULTIPLE_FACE_SIGNAL",
  "HEAD_AWAY_SIGNAL",
  "AUDIO_ACTIVITY",
  "NETWORK_OFFLINE",
  "NETWORK_ONLINE",
])
// Events only the server may record.
const NEET_SERVER_PROCTOR_EVENT_TYPES = Object.freeze([
  "DUPLICATE_SESSION",
  "WARNING_ISSUED",
  "POLICY_THRESHOLD_EXCEEDED",
  "AUTO_SUBMIT",
])
const NEET_PROCTOR_EVENT_TYPES = Object.freeze([
  ...NEET_CLIENT_PROCTOR_EVENT_TYPES,
  ...NEET_SERVER_PROCTOR_EVENT_TYPES,
])
const NEET_PROCTOR_SIGNAL_REASONS = Object.freeze([
  "NO_FACE_DETECTED",
  "CAMERA_OBSCURED",
  "TRACK_ENDED",
  "TRACK_MUTED",
  "DEVICE_REMOVED",
  "SUSTAINED_AUDIO",
  "USER_STOPPED",
  "KEYBOARD_SHORTCUT",
  "CONTEXT_MENU",
])
const NEET_PROCTOR_DETECTORS = Object.freeze([
  "native-face-detector",
  "frame-obstruction",
  "audio-level",
  "browser-event",
])

const NEET_CANDIDATE_LIMITS = Object.freeze({
  fullNameMax: 80,
  fullNameMin: 2,
})

const NEET_LIMITS = Object.freeze({
  maxResponsesPerBatch: 50,
  maxProctorEventsPerBatch: 20,
  maxQuestionTextLength: 4000,
  maxOptionTextLength: 1000,
  maxSequence: 2_147_483_647,
  maxTimeSpentMs: 24 * 60 * 60 * 1000,
})

const collapseWhitespace = (value) =>
  String(value ?? "")
    .replace(/\s+/gu, " ")
    .trim()

const CANDIDATE_NAME_PATTERN = /^[\p{L}\p{M}][\p{L}\p{M} .'-]*$/u

const normalizeNeetCandidateName = (value) => collapseWhitespace(value)

const isValidNeetCandidateName = (value) => {
  const normalized = normalizeNeetCandidateName(value)
  return (
    normalized.length >= NEET_CANDIDATE_LIMITS.fullNameMin &&
    normalized.length <= NEET_CANDIDATE_LIMITS.fullNameMax &&
    CANDIDATE_NAME_PATTERN.test(normalized) &&
    /[\p{L}]/u.test(normalized)
  )
}

const neetOptionKeySchema = z.enum(NEET_OPTION_KEYS)
const neetAttemptStatusSchema = z.enum(NEET_ATTEMPT_STATUSES)
const neetExamModeSchema = z.enum(NEET_EXAM_MODES)
const neetSubmissionReasonSchema = z.enum(NEET_SUBMISSION_REASONS)
const neetDifficultySchema = z.enum(NEET_DIFFICULTIES)
const neetProctorSeveritySchema = z.enum(NEET_PROCTOR_SEVERITIES)
const neetProctorEventTypeSchema = z.enum(NEET_PROCTOR_EVENT_TYPES)
const neetClientProctorEventTypeSchema = z.enum(NEET_CLIENT_PROCTOR_EVENT_TYPES)
const neetClientSessionIdSchema = z.uuid()
const neetSlugSchema = z
  .string()
  .min(3)
  .max(80)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Invalid test slug")
const neetSectionKeySchema = z
  .string()
  .min(1)
  .max(40)
  .regex(/^[a-z][a-z0-9-]*$/, "Invalid section key")
const neetMarksSchema = z.number().finite().min(-100).max(100)

// Candidate details --------------------------------------------------------
// Only a display name is collected. Ownership is the authenticated user ID;
// contact details stay on the user profile and are never copied per attempt.

const neetCandidateInputSchema = z.strictObject({
  fullName: z
    .string()
    .max(200)
    .refine(isValidNeetCandidateName, "Enter your full name using letters"),
})

const neetCandidateSchema = z.strictObject({
  fullName: z.string().min(2).max(NEET_CANDIDATE_LIMITS.fullNameMax),
})

// Public test catalog --------------------------------------------------------

const neetMarkingSchema = z.strictObject({
  correct: neetMarksSchema,
  incorrect: neetMarksSchema,
  unanswered: neetMarksSchema,
})

const neetSectionSummarySchema = z.strictObject({
  key: neetSectionKeySchema,
  title: z.string().min(1).max(80),
  subjectKey: neetSectionKeySchema,
  subjectLabel: z.string().min(1).max(60),
  questionCount: z.number().int().min(1).max(500),
  maxMarks: z.number().finite().min(0).max(10_000),
})

const neetAvailabilitySchema = z.strictObject({
  state: z.enum(NEET_AVAILABILITY_STATES),
  opensAt: isoDateTimeSchema.nullable(),
  closesAt: isoDateTimeSchema.nullable(),
})

const neetPublicProctorPolicySchema = z.strictObject({
  version: z.number().int().min(1),
  consentVersion: z.string().min(1).max(40),
  requirements: z.strictObject({
    camera: z.boolean(),
    microphone: z.boolean(),
    fullscreen: z.boolean(),
    screenShare: z.boolean(),
  }),
  monitoring: z.strictObject({
    visibility: z.boolean(),
    focus: z.boolean(),
    clipboard: z.boolean(),
    network: z.boolean(),
    faceSignals: z.boolean(),
    audioSignals: z.boolean(),
    duplicateSessions: z.boolean(),
  }),
  signals: z.strictObject({
    faceAbsentSeconds: z.number().int().min(2).max(120),
    multipleFacesSeconds: z.number().int().min(1).max(120),
    headAwaySeconds: z.number().int().min(2).max(120),
    audioActivitySeconds: z.number().int().min(1).max(120),
    sampleIntervalMs: z.number().int().min(250).max(10_000),
  }),
  warnings: z.strictObject({
    maxWarnings: z.number().int().min(1).max(20),
    cooldownSeconds: z.number().int().min(0).max(600),
  }),
  autoSubmit: z.strictObject({
    enabled: z.boolean(),
    softSignalsCanSubmit: z.boolean(),
  }),
  mediaStorage: z.literal("NONE"),
})

const neetTestSummarySchema = z.strictObject({
  id: objectIdSchema,
  slug: neetSlugSchema,
  title: z.string().min(1).max(120),
  tagline: z.string().max(160),
  description: z.string().max(1200),
  difficulty: neetDifficultySchema,
  durationSeconds: z
    .number()
    .int()
    .min(60)
    .max(6 * 60 * 60),
  questionCount: z.number().int().min(1).max(500),
  totalMarks: z.number().finite().min(0).max(10_000),
  marking: neetMarkingSchema,
  sections: z.array(neetSectionSummarySchema).min(1).max(12),
  modes: z.array(neetExamModeSchema).min(1).max(2),
  availability: neetAvailabilitySchema,
  isSample: z.boolean(),
  patternNote: z.string().max(400).nullable(),
})

const neetTestDetailSchema = z.strictObject({
  ...neetTestSummarySchema.shape,
  instructions: z.array(z.string().min(1).max(600)).max(40),
  proctorPolicy: neetPublicProctorPolicySchema.nullable(),
})

const neetTestParamsSchema = z.strictObject({ testId: objectIdSchema })
const neetEmptyRequestSchema = z.strictObject({})

// Attempts -------------------------------------------------------------------

const neetAttemptParamsSchema = z.strictObject({ attemptId: objectIdSchema })

const neetAttemptListQuerySchema = z.strictObject({
  testId: objectIdSchema.optional(),
})

const neetProctorConsentSchema = z.strictObject({
  version: z.string().min(1).max(40),
  acceptedAt: isoDateTimeSchema,
  // Self-declared 18+ confirmation. Monitored mode is adults-only until a
  // legally reviewed approach for minors exists.
  adultDeclaredAt: isoDateTimeSchema.nullable(),
})

const neetAttemptProctoringSummarySchema = z.strictObject({
  status: z.enum(["PENDING", "ACTIVE", "ENDED"]),
  warningCount: z.number().int().min(0).max(1000),
  softWarningCount: z.number().int().min(0).max(1000),
  maxWarnings: z.number().int().min(1).max(20),
  autoSubmitEnabled: z.boolean(),
  reviewStatus: z.enum(NEET_REVIEW_STATUSES),
})

const neetAttemptSchema = z.strictObject({
  id: objectIdSchema,
  testId: objectIdSchema,
  attemptNumber: z.number().int().min(1).max(10_000),
  test: z.strictObject({
    title: z.string().min(1).max(120),
    durationSeconds: z.number().int().min(60),
    questionCount: z.number().int().min(1),
    totalMarks: z.number().finite().min(0),
    isSample: z.boolean(),
  }),
  status: neetAttemptStatusSchema,
  mode: neetExamModeSchema.nullable(),
  candidate: neetCandidateSchema,
  instructionsAcceptedAt: isoDateTimeSchema.nullable(),
  proctorConsent: neetProctorConsentSchema.nullable(),
  createdAt: isoDateTimeSchema,
  registrationExpiresAt: isoDateTimeSchema,
  startedAt: isoDateTimeSchema.nullable(),
  expiresAt: isoDateTimeSchema.nullable(),
  submittedAt: isoDateTimeSchema.nullable(),
  submissionReason: neetSubmissionReasonSchema.nullable(),
  proctoring: neetAttemptProctoringSummarySchema.nullable(),
  hasResult: z.boolean(),
  serverNow: isoDateTimeSchema,
})

const neetAttemptListItemSchema = z.strictObject({
  id: objectIdSchema,
  testId: objectIdSchema,
  testTitle: z.string().min(1).max(120),
  attemptNumber: z.number().int().min(1),
  status: neetAttemptStatusSchema,
  mode: neetExamModeSchema.nullable(),
  createdAt: isoDateTimeSchema,
  startedAt: isoDateTimeSchema.nullable(),
  expiresAt: isoDateTimeSchema.nullable(),
  submittedAt: isoDateTimeSchema.nullable(),
  score: z.number().finite().nullable(),
  maxScore: z.number().finite().nullable(),
})

const neetCreateAttemptRequestSchema = z.strictObject({
  testId: objectIdSchema,
  candidate: neetCandidateInputSchema,
})

const neetUpdateAttemptRequestSchema = z
  .strictObject({
    candidate: neetCandidateInputSchema.optional(),
    mode: neetExamModeSchema.optional(),
  })
  .refine(
    (value) => value.candidate !== undefined || value.mode !== undefined,
    "Provide candidate details or an exam mode"
  )

const NEET_SYSTEM_CHECK_STATES = Object.freeze([
  "READY",
  "ACTION_REQUIRED",
  "UNAVAILABLE",
  "NOT_REQUIRED",
])
const neetSystemCheckStateSchema = z.enum(NEET_SYSTEM_CHECK_STATES)

const neetReadyRequestSchema = z.strictObject({
  instructionsAccepted: z.literal(true),
  proctorConsent: z
    .strictObject({
      accepted: z.literal(true),
      version: z.string().min(1).max(40),
      adultConfirmed: z.literal(true).optional(),
    })
    .optional(),
  systemCheck: z
    .strictObject({
      camera: neetSystemCheckStateSchema,
      microphone: neetSystemCheckStateSchema,
      fullscreen: neetSystemCheckStateSchema,
      screenShare: neetSystemCheckStateSchema,
      network: neetSystemCheckStateSchema,
      browser: neetSystemCheckStateSchema,
    })
    .optional(),
})

const neetSessionRequestSchema = z.strictObject({
  sessionId: neetClientSessionIdSchema,
})

// Exam paper -------------------------------------------------------------------

// Question media is restricted to app-hosted assets or the existing
// Cloudinary delivery host; arbitrary remote URLs are never accepted.
const NEET_MEDIA_URL_PATTERN =
  /^(?:\/project-neet\/media\/[a-z0-9][a-z0-9/_-]*\.(?:svg|png|webp|jpg)|https:\/\/res\.cloudinary\.com\/[A-Za-z0-9_/.,-]+)$/
const isAllowedNeetMediaUrl = (value) =>
  typeof value === "string" &&
  value.length <= 2048 &&
  !value.includes("..") &&
  NEET_MEDIA_URL_PATTERN.test(value)

const neetMediaSchema = z.strictObject({
  kind: z.literal("image"),
  url: z.string().max(2048).refine(isAllowedNeetMediaUrl, "Invalid media URL"),
  alt: z.string().min(1).max(400),
  width: z.number().int().min(1).max(4000).nullable(),
  height: z.number().int().min(1).max(4000).nullable(),
})

const neetQuestionOptionSchema = z.strictObject({
  key: neetOptionKeySchema,
  text: z.string().min(1).max(NEET_LIMITS.maxOptionTextLength),
})

const neetPaperQuestionSchema = z.strictObject({
  id: objectIdSchema,
  number: z.number().int().min(1).max(500),
  sectionKey: neetSectionKeySchema,
  text: z.string().min(1).max(NEET_LIMITS.maxQuestionTextLength),
  options: z.array(neetQuestionOptionSchema).min(2).max(4),
  media: z.array(neetMediaSchema).max(3),
  marks: z.strictObject({
    correct: neetMarksSchema,
    incorrect: neetMarksSchema,
  }),
})

const neetPaperSectionSchema = z.strictObject({
  key: neetSectionKeySchema,
  title: z.string().min(1).max(80),
  subjectKey: neetSectionKeySchema,
  subjectLabel: z.string().min(1).max(60),
  questionIds: z.array(objectIdSchema).min(1).max(500),
})

const neetResponseStateSchema = z.strictObject({
  questionId: objectIdSchema,
  selectedOption: neetOptionKeySchema.nullable(),
  markedForReview: z.boolean(),
  visited: z.boolean(),
  timeSpentMs: z.number().int().min(0).max(NEET_LIMITS.maxTimeSpentMs),
  seq: z.number().int().min(0).max(NEET_LIMITS.maxSequence),
})

const neetClientSignalConfigSchema = z.strictObject({
  sampleIntervalMs: z.number().int().min(250).max(10_000),
  faceAbsentSeconds: z.number().int().min(2).max(120),
  multipleFacesSeconds: z.number().int().min(1).max(120),
  headAwaySeconds: z.number().int().min(2).max(120),
  audioActivitySeconds: z.number().int().min(1).max(120),
})

const neetExamSessionSchema = z
  .strictObject({
    attempt: neetAttemptSchema,
    sessionId: neetClientSessionIdSchema,
    heartbeatIntervalSeconds: z.number().int().min(10).max(300),
    networkGraceSeconds: z.number().int().min(0).max(30),
    paper: z.strictObject({
      sections: z.array(neetPaperSectionSchema).min(1).max(12),
      questions: z.array(neetPaperQuestionSchema).min(1).max(500),
    }),
    responses: z.array(neetResponseStateSchema).max(500),
    lastSeq: z.number().int().min(0).max(NEET_LIMITS.maxSequence),
    proctorPolicy: neetPublicProctorPolicySchema.nullable(),
    signalConfig: neetClientSignalConfigSchema.nullable(),
  })
  .superRefine((value, context) => {
    const questionIds = new Set(value.paper.questions.map((item) => item.id))
    if (questionIds.size !== value.paper.questions.length) {
      context.addIssue({
        code: "custom",
        message: "Question IDs must be unique",
        path: ["paper", "questions"],
      })
    }
    const sectionQuestionIds = value.paper.sections.flatMap(
      (section) => section.questionIds
    )
    if (
      sectionQuestionIds.length !== questionIds.size ||
      sectionQuestionIds.some((id) => !questionIds.has(id))
    ) {
      context.addIssue({
        code: "custom",
        message: "Sections must reference every question exactly once",
        path: ["paper", "sections"],
      })
    }
    if (value.responses.some((item) => !questionIds.has(item.questionId))) {
      context.addIssue({
        code: "custom",
        message: "Responses must belong to the paper",
        path: ["responses"],
      })
    }
  })

// Autosave ---------------------------------------------------------------------

const neetResponseWriteSchema = z.strictObject({
  questionId: objectIdSchema,
  selectedOption: neetOptionKeySchema.nullable(),
  markedForReview: z.boolean(),
  visited: z.boolean(),
  timeSpentMs: z.number().int().min(0).max(NEET_LIMITS.maxTimeSpentMs),
  seq: z.number().int().min(1).max(NEET_LIMITS.maxSequence),
})

const neetSaveResponsesRequestSchema = z.strictObject({
  sessionId: neetClientSessionIdSchema,
  responses: z
    .array(neetResponseWriteSchema)
    .min(1)
    .max(NEET_LIMITS.maxResponsesPerBatch)
    .refine(
      (items) =>
        new Set(items.map((item) => item.questionId.toLowerCase())).size ===
        items.length,
      "Each question may appear once per batch"
    ),
})

const neetSaveResponsesResultSchema = z.strictObject({
  responses: z.array(neetResponseStateSchema).max(500),
  lastSeq: z.number().int().min(0).max(NEET_LIMITS.maxSequence),
  expiresAt: isoDateTimeSchema,
  serverNow: isoDateTimeSchema,
})

const neetHeartbeatResultSchema = z.strictObject({
  status: neetAttemptStatusSchema,
  sessionActive: z.boolean(),
  expiresAt: isoDateTimeSchema.nullable(),
  serverNow: isoDateTimeSchema,
  warningCount: z.number().int().min(0),
})

// Proctoring -------------------------------------------------------------------

const neetProctorEventMetadataSchema = z.strictObject({
  reason: z.enum(NEET_PROCTOR_SIGNAL_REASONS).optional(),
  detector: z.enum(NEET_PROCTOR_DETECTORS).optional(),
  confidence: z.number().min(0).max(1).optional(),
  faces: z.number().int().min(0).max(20).optional(),
  durationMs: z
    .number()
    .int()
    .min(0)
    .max(6 * 60 * 60 * 1000)
    .optional(),
})

const neetProctorEventInputSchema = z.strictObject({
  clientEventId: z.uuid(),
  type: neetClientProctorEventTypeSchema,
  occurredAt: isoDateTimeSchema,
  metadata: neetProctorEventMetadataSchema.optional(),
})

const neetProctorEventBatchRequestSchema = z.strictObject({
  sessionId: neetClientSessionIdSchema,
  events: z
    .array(neetProctorEventInputSchema)
    .min(1)
    .max(NEET_LIMITS.maxProctorEventsPerBatch),
})

const neetProctorWarningSchema = z.strictObject({
  id: z.string().min(1).max(64),
  level: z.number().int().min(1).max(100),
  counted: z.boolean(),
  ruleType: neetProctorEventTypeSchema,
  severity: neetProctorSeveritySchema,
  message: z.string().min(1).max(400),
  issuedAt: isoDateTimeSchema,
})

const neetProctorEventResultSchema = z.strictObject({
  accepted: z.number().int().min(0),
  duplicates: z.number().int().min(0),
  newWarnings: z.array(neetProctorWarningSchema).max(50),
  warningCount: z.number().int().min(0),
  softWarningCount: z.number().int().min(0),
  maxWarnings: z.number().int().min(1),
  status: neetAttemptStatusSchema,
  autoSubmitted: z.boolean(),
  serverNow: isoDateTimeSchema,
})

// Submission and result ----------------------------------------------------------

const neetSubmitRequestSchema = z.strictObject({
  sessionId: neetClientSessionIdSchema,
  reason: z.enum(["MANUAL_SUBMIT", "TIME_EXPIRED"]),
})

const neetResultSectionSchema = z.strictObject({
  key: neetSectionKeySchema,
  title: z.string().min(1).max(80),
  subjectKey: neetSectionKeySchema,
  subjectLabel: z.string().min(1).max(60),
  questionCount: z.number().int().min(0),
  attempted: z.number().int().min(0),
  correct: z.number().int().min(0),
  incorrect: z.number().int().min(0),
  unanswered: z.number().int().min(0),
  dropped: z.number().int().min(0),
  score: z.number().finite(),
  maxScore: z.number().finite().min(0),
})

const neetResultSchema = z
  .strictObject({
    attempt: neetAttemptSchema,
    summary: z.strictObject({
      score: z.number().finite(),
      maxScore: z.number().finite().min(0),
      questionCount: z.number().int().min(0),
      attempted: z.number().int().min(0),
      correct: z.number().int().min(0),
      incorrect: z.number().int().min(0),
      unanswered: z.number().int().min(0),
      // Dropped/invalid questions award marks to every candidate and are
      // counted separately from attempted and unanswered questions.
      dropped: z.number().int().min(0),
      markedForReview: z.number().int().min(0),
      accuracyPercent: z.number().finite().min(0).max(100),
      durationUsedSeconds: z.number().int().min(0),
      positiveMarks: z.number().finite().min(0),
      negativeMarks: z.number().finite().max(0),
    }),
    sections: z.array(neetResultSectionSchema).max(12),
    // Answer-key version used for this result; null for results scored before
    // versioned keys existed.
    answerKeyVersion: z.number().int().min(1).nullable(),
    proctoring: z
      .strictObject({
        warningCount: z.number().int().min(0),
        softWarningCount: z.number().int().min(0),
        maxWarnings: z.number().int().min(1),
        warnings: z.array(neetProctorWarningSchema).max(200),
      })
      .nullable(),
  })
  .superRefine((value, context) => {
    const { summary } = value
    if (summary.correct + summary.incorrect !== summary.attempted) {
      context.addIssue({
        code: "custom",
        message: "Attempted must equal correct plus incorrect",
        path: ["summary", "attempted"],
      })
    }
    if (
      summary.attempted + summary.unanswered + summary.dropped !==
      summary.questionCount
    ) {
      context.addIssue({
        code: "custom",
        message:
          "Attempted plus unanswered plus dropped must equal question count",
        path: ["summary", "unanswered"],
      })
    }
  })

const neetTestListResponseSchema = createSuccessResponseSchema(
  z.strictObject({ tests: z.array(neetTestSummarySchema).max(100) })
)
const neetTestDetailResponseSchema =
  createSuccessResponseSchema(neetTestDetailSchema)
const neetAttemptResponseSchema = createSuccessResponseSchema(neetAttemptSchema)
const neetAttemptListResponseSchema = createSuccessResponseSchema(
  z.strictObject({ attempts: z.array(neetAttemptListItemSchema).max(50) })
)
const neetExamSessionResponseSchema = createSuccessResponseSchema(
  neetExamSessionSchema
)
const neetSaveResponsesResponseSchema = createSuccessResponseSchema(
  neetSaveResponsesResultSchema
)
const neetHeartbeatResponseSchema = createSuccessResponseSchema(
  neetHeartbeatResultSchema
)
const neetProctorEventResponseSchema = createSuccessResponseSchema(
  neetProctorEventResultSchema
)
const neetResultResponseSchema = createSuccessResponseSchema(neetResultSchema)

module.exports = {
  NEET_ATTEMPT_STATUSES,
  NEET_ANSWER_KEY_STATUSES,
  NEET_AVAILABILITY_STATES,
  NEET_CANDIDATE_LIMITS,
  NEET_CLIENT_PROCTOR_EVENT_TYPES,
  NEET_DIFFICULTIES,
  NEET_EXAM_MODES,
  NEET_FINAL_ATTEMPT_STATUSES,
  NEET_LIMITS,
  NEET_OPTION_KEYS,
  NEET_PROCTOR_DETECTORS,
  NEET_PROCTOR_EVENT_TYPES,
  NEET_PROCTOR_SEVERITIES,
  NEET_PROCTOR_SIGNAL_REASONS,
  NEET_REVIEW_STATUSES,
  NEET_SERVER_PROCTOR_EVENT_TYPES,
  NEET_SUBMISSION_REASONS,
  NEET_SYSTEM_CHECK_STATES,
  isAllowedNeetMediaUrl,
  isValidNeetCandidateName,
  neetAttemptListItemSchema,
  neetAttemptListQuerySchema,
  neetAttemptListResponseSchema,
  neetAttemptParamsSchema,
  neetAttemptResponseSchema,
  neetAttemptSchema,
  neetAttemptStatusSchema,
  neetCandidateInputSchema,
  neetCandidateSchema,
  neetClientProctorEventTypeSchema,
  neetCreateAttemptRequestSchema,
  neetEmptyRequestSchema,
  neetExamModeSchema,
  neetExamSessionResponseSchema,
  neetExamSessionSchema,
  neetHeartbeatResponseSchema,
  neetMarkingSchema,
  neetMediaSchema,
  neetOptionKeySchema,
  neetPaperQuestionSchema,
  neetProctorEventBatchRequestSchema,
  neetProctorEventResponseSchema,
  neetProctorEventTypeSchema,
  neetProctorSeveritySchema,
  neetProctorWarningSchema,
  neetPublicProctorPolicySchema,
  neetReadyRequestSchema,
  neetResponseStateSchema,
  neetResultResponseSchema,
  neetResultSchema,
  neetSaveResponsesRequestSchema,
  neetSaveResponsesResponseSchema,
  neetSessionRequestSchema,
  neetSubmissionReasonSchema,
  neetSubmitRequestSchema,
  neetTestDetailResponseSchema,
  neetTestDetailSchema,
  neetTestListResponseSchema,
  neetTestParamsSchema,
  neetTestSummarySchema,
  neetUpdateAttemptRequestSchema,
  normalizeNeetCandidateName,
}
