// Sample mock definitions for development and demonstration. Every test is
// flagged isSample so the UI can label it; none claims to be an official paper.

const { NEET_PATTERN_NOTE_2026 } = require("../config/defaults")

const SUBJECT_SECTIONS = Object.freeze([
  {
    key: "physics",
    title: "Physics",
    subjectKey: "physics",
    subjectLabel: "Physics",
  },
  {
    key: "chemistry",
    title: "Chemistry",
    subjectKey: "chemistry",
    subjectLabel: "Chemistry",
  },
  {
    key: "botany",
    title: "Botany",
    subjectKey: "botany",
    subjectLabel: "Biology · Botany",
  },
  {
    key: "zoology",
    title: "Zoology",
    subjectKey: "zoology",
    subjectLabel: "Biology · Zoology",
  },
])

const COMMON_INSTRUCTIONS = Object.freeze([
  "This is a NEET-style practice mock created for StudyNotion. It is not an official NTA paper, and its screens are not a reproduction of any official exam interface.",
  "The timer is kept by our server. Refreshing, closing the tab, or changing your device clock does not pause or reset it.",
  "Each correct answer earns the marks shown with the question; each incorrect answer deducts the negative marks shown. Unanswered questions score zero.",
  "Answers save automatically as you work. A small status label tells you when everything is saved, or when you are offline and changes are queued.",
  "Use “Mark for Review” for questions you want to revisit. An answered question that is marked for review is still scored.",
  "Move freely between subjects and questions with the subject tabs and the digital OMR panel.",
  "When the timer ends, the attempt is submitted automatically with the answers saved up to that moment.",
  "Keep the exam open in a single tab. Opening the same attempt in another tab moves the session there.",
])

const sections = (count, startIndex = 0) =>
  SUBJECT_SECTIONS.map((section, index) => ({
    ...section,
    order: index + 1,
    questionCount: count,
    bankStart: startIndex,
  }))

const SAMPLE_MOCKS = Object.freeze([
  {
    slug: "pulse-check-mini-mock",
    title: "Pulse Check · Mini Mock",
    tagline: "A 25-minute warm-up across all four subjects.",
    description:
      "Twenty questions — five each from Physics, Chemistry, Botany and Zoology — to rehearse the exam flow, the OMR panel and your pacing before a full-length sitting.",
    difficulty: "FOUNDATION",
    durationSeconds: 25 * 60,
    displayOrder: 10,
    modes: ["NON_PROCTORED", "PROCTORED"],
    patternNote:
      "Short sample mock for practice and system testing. It is not a full NEET-pattern paper.",
    sections: sections(5),
    proctorPolicy: {},
  },
  {
    slug: "full-length-neet-style-mock-01",
    title: "Full-Length NEET-Style Mock 01",
    tagline: "180 questions · 180 minutes · the complete three-hour stretch.",
    description:
      "A full-length sample paper configured to the publicly reported NEET (UG) 2026 pattern: 45 questions each in Physics, Chemistry, Botany and Zoology, with +4 / −1 marking.",
    difficulty: "STANDARD",
    durationSeconds: 180 * 60,
    displayOrder: 20,
    modes: ["NON_PROCTORED", "PROCTORED"],
    patternNote: NEET_PATTERN_NOTE_2026,
    sections: sections(45),
    proctorPolicy: {},
  },
  {
    slug: "focus-sprint-proctored-drill",
    title: "Focus Sprint · Proctored Drill",
    tagline: "15 minutes to rehearse a fully monitored sitting.",
    description:
      "Twelve questions in a proctored-only drill that also asks you to share your screen, so you can practise exam discipline under the strictest monitoring settings.",
    difficulty: "STANDARD",
    durationSeconds: 15 * 60,
    displayOrder: 30,
    modes: ["PROCTORED"],
    patternNote:
      "Short proctored drill for rehearsing monitored conditions. It is not a full NEET-pattern paper.",
    sections: sections(3, 5),
    proctorPolicy: {
      requirements: { screenShare: true },
      warnings: { maxWarnings: 2, cooldownSeconds: 15 },
    },
  },
])

const instructionsFor = (mock) => [
  ...COMMON_INSTRUCTIONS,
  `This mock has ${mock.sections.reduce((total, section) => total + section.questionCount, 0)} questions and lasts ${Math.round(mock.durationSeconds / 60)} minutes.`,
]

module.exports = { SAMPLE_MOCKS, SUBJECT_SECTIONS, instructionsFor }
