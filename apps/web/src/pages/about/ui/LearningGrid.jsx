import { FiBookOpen, FiCompass, FiLayers, FiTrendingUp } from "react-icons/fi"
import { Link } from "react-router"

const capabilities = [
  [
    FiCompass,
    "Follow your curiosity",
    "Browse course categories and find a subject you want to explore.",
  ],
  [
    FiLayers,
    "A structured path",
    "See the course curriculum before you enroll. Move through lessons at your pace.",
  ],
  [
    FiBookOpen,
    "Room to revisit",
    "Return to your enrolled lessons when you want to practise or refresh an idea.",
  ],
  [
    FiTrendingUp,
    "Your progress, together",
    "Keep track of completed lessons in your personal learning workspace.",
  ],
]

export default function LearningGrid() {
  return (
    <section className="sn-card mb-12 grid gap-8 bg-brand-soft p-6 sm:p-10 lg:grid-cols-[1fr_1.5fr]">
      <div>
        <p className="sn-eyebrow">Made for your learning</p>
        <h2 className="sn-heading">
          A little structure.
          <br />A world to explore.
        </h2>
        <p className="sn-lead my-5">
          Make space for practical skills, fresh ideas, and your own pace.
        </p>
        <Link to="/#discover" className="sn-btn sn-btn-primary">
          Explore courses →
        </Link>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {capabilities.map(([Icon, title, copy]) => (
          <article key={title} className="sn-card p-5">
            <Icon
              className="mb-4 text-2xl text-brand-primary"
              aria-hidden="true"
            />
            <h3 className="text-xl font-bold">{title}</h3>
            <p className="mt-3 text-sm leading-6 text-text-secondary">{copy}</p>
          </article>
        ))}
      </div>
    </section>
  )
}
