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
  "This is a NEET-style practice mock from Prahit NEET Mocks. It is not an official NTA paper, and its screens are not a reproduction of any official exam interface.",
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

// One-subject sections for the 60-minute sprints. Each entry is
// [subjectKey, questionCount]; questions come from the start of the bank.
const subjectSections = (entries) =>
  entries.map(([subjectKey, questionCount], index) => ({
    ...SUBJECT_SECTIONS.find((section) => section.key === subjectKey),
    order: index + 1,
    questionCount,
    bankStart: 0,
  }))

const SPRINT_NOTE =
  "Prahit practice sprint: 45 questions in 60 minutes with NEET marking (+4 / −1). Not an official NEET format; sample content is not expert-reviewed."

const sprint = ({ description, displayOrder, entries, slug, title }) => ({
  slug,
  title,
  tagline: "45 questions · 60 minutes · NEET marking.",
  description,
  difficulty: "STANDARD",
  durationSeconds: 60 * 60,
  displayOrder,
  modes: ["NON_PROCTORED", "PROCTORED"],
  patternNote: SPRINT_NOTE,
  sections: subjectSections(entries),
  proctorPolicy: {},
})

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
      "A full-length sample paper configured to the NTA NEET (UG) 2026 pattern: 45 questions each in Physics, Chemistry, Botany and Zoology, with +4 / −1 marking.",
    difficulty: "STANDARD",
    durationSeconds: 180 * 60,
    displayOrder: 20,
    modes: ["NON_PROCTORED", "PROCTORED"],
    patternNote: NEET_PATTERN_NOTE_2026,
    sections: sections(45),
    proctorPolicy: {},
  },
  sprint({
    slug: "physics-sprint-60",
    title: "Physics Sprint · 60 Minutes",
    description:
      "Forty-five Physics questions in one hour, marked like NEET, to build speed and accuracy in a single subject.",
    displayOrder: 21,
    entries: [["physics", 45]],
  }),
  sprint({
    slug: "chemistry-sprint-60",
    title: "Chemistry Sprint · 60 Minutes",
    description:
      "Forty-five Chemistry questions in one hour, marked like NEET, covering physical, organic and inorganic topics.",
    displayOrder: 22,
    entries: [["chemistry", 45]],
  }),
  sprint({
    slug: "biology-sprint-60",
    title: "Biology Sprint · 60 Minutes",
    description:
      "Forty-five Biology questions in one hour, balanced across Botany (23) and Zoology (22), marked like NEET.",
    displayOrder: 23,
    entries: [
      ["botany", 23],
      ["zoology", 22],
    ],
  }),
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
