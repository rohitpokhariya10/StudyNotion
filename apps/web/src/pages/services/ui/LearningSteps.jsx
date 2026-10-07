import stepDiscover from "@/shared/assets/editorial/step-discover.svg"
import stepEnrol from "@/shared/assets/editorial/step-enrol.svg"
import stepLearn from "@/shared/assets/editorial/step-learn.svg"
import { SketchNumber } from "@/shared/ui/illustrations/Doodles"

const STEPS = [
  [
    stepDiscover,
    "Discover a course",
    "Browse subjects and preview each course curriculum.",
  ],
  [
    stepEnrol,
    "Enrol securely",
    "Purchase through our secure checkout to unlock lessons.",
  ],
  [
    stepLearn,
    "Learn and track progress",
    "Watch lessons and see your completion on your dashboard.",
  ],
]

export default function LearningSteps({ onFindCourses }) {
  return (
    <section className="sn-steps" aria-labelledby="services-steps">
      <h2 id="services-steps" className="sn-steps-title">
        How to start learning with Prahit
      </h2>
      <ol className="sn-steps-grid">
        {STEPS.map(([image, title, text], index) => (
          <li key={title}>
            <div className="sn-steps-art">
              <SketchNumber value={index + 1} className="sn-steps-number" />
              <img
                src={image}
                alt=""
                width="160"
                height="160"
                loading="lazy"
                decoding="async"
              />
            </div>
            <h3>{title}</h3>
            <p>{text}</p>
          </li>
        ))}
      </ol>
      <button
        type="button"
        className="sn-btn sn-btn-primary sn-steps-cta"
        onClick={onFindCourses}
      >
        Choose a subject
      </button>
    </section>
  )
}
