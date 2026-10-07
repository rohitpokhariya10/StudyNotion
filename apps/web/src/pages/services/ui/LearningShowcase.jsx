import learningWorkspace from "@/shared/assets/editorial/learning-workspace.svg"
import { SoftCloud } from "@/shared/ui/illustrations/Doodles"
import { EditorialHeading } from "@/widgets/marketing"
import { Link } from "react-router"

const POINTS = [
  [
    "Structured lessons:",
    "Follow each course section by section, lesson by lesson.",
  ],
  [
    "Revisit anytime:",
    "Pause, replay and come back to a lesson whenever you need it.",
  ],
  ["Saved progress:", "Mark lessons complete and pick up where you left off."],
]

// Our real learning workflow (the course player) in the reference's
// "group session" composition. No live classes are implied.
export default function LearningShowcase() {
  return (
    <section className="sn-showcase" aria-labelledby="services-workspace">
      <SoftCloud className="sn-showcase-cloud sn-showcase-cloud-top" />
      <SoftCloud className="sn-showcase-cloud sn-showcase-cloud-bottom" />
      <EditorialHeading
        id="services-workspace"
        title="Your Learning Workspace"
      />
      <div className="sn-showcase-grid">
        <div className="sn-showcase-visual">
          <img
            src={learningWorkspace}
            width="800"
            height="636"
            alt="The Prahit course player: a lesson video, the lesson list with completed lessons, and course progress"
            loading="lazy"
            decoding="async"
          />
        </div>
        <div className="sn-showcase-copy">
          <ul>
            {POINTS.map(([title, text]) => (
              <li key={title}>
                <strong>{title}</strong>
                <span>{text}</span>
              </li>
            ))}
          </ul>
          <Link to="/signup" className="sn-btn sn-btn-primary sn-showcase-cta">
            Start learning
          </Link>
        </div>
      </div>
    </section>
  )
}
