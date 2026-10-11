import { FiArrowRight } from "react-icons/fi"
import { Link } from "react-router"

import { HeroCluster } from "./HeroArt"

const STEPS = [
  "Pick a paper",
  "Read the instructions",
  "Start when you’re ready",
]

export function LandingHero({ startPath }) {
  return (
    <section className="np-hero" aria-labelledby="np-hero-title">
      <HeroCluster side="left" />
      <div className="np-hero-copy">
        <h1 id="np-hero-title" className="np-hero-title">
          <span>Big dreams.</span> <span>Stronger preparation.</span>
        </h1>
        <p className="np-hero-lead">
          Sit timed NEET practice papers, keep every answer saved, and see a
          clear subject-wise result after each mock.
        </p>
        <div className="np-hero-actions">
          <Link to={startPath} className="np-btn np-btn-primary">
            Start a Mock
            <FiArrowRight aria-hidden="true" />
          </Link>
          <Link to="/neet/mocks" className="np-btn np-btn-secondary">
            Explore Tests
          </Link>
        </div>
        <ol className="np-hero-steps" aria-label="How a mock begins">
          {STEPS.map((step, index) => (
            <li key={step}>
              <span aria-hidden="true">{index + 1}</span>
              {step}
            </li>
          ))}
        </ol>
      </div>
      <HeroCluster side="right" />
    </section>
  )
}
