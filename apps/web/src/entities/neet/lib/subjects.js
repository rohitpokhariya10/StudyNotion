// Literal class names so Tailwind can see every subject accent at build time.
const SUBJECT_STYLES = Object.freeze({
  physics: {
    text: "text-neet-physics",
    bg: "bg-neet-physics",
    border: "border-neet-physics",
  },
  chemistry: {
    text: "text-neet-chemistry",
    bg: "bg-neet-chemistry",
    border: "border-neet-chemistry",
  },
  botany: {
    text: "text-neet-botany",
    bg: "bg-neet-botany",
    border: "border-neet-botany",
  },
  zoology: {
    text: "text-neet-zoology",
    bg: "bg-neet-zoology",
    border: "border-neet-zoology",
  },
})

const FALLBACK_STYLE = Object.freeze({
  text: "text-neet-accent",
  bg: "bg-neet-accent",
  border: "border-neet-accent",
})

export const subjectStyle = (subjectKey) =>
  SUBJECT_STYLES[subjectKey] || FALLBACK_STYLE
