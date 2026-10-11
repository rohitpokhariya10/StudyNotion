import CourseFinder from "@/widgets/course-finder"
import { FiArrowRight, FiCheckCircle, FiPlayCircle } from "react-icons/fi"
import { Link } from "react-router"

import HeroYeti from "../hero/HeroYeti"

import "../hero/homeHero.css"

// Headline beside the decorative 3D Prahit yeti, which follows the pointer.
// Copy, links and the course finder are plain HTML that work before, and
// without, the WebGL scene.
export default function HomeHero() {
  return (
    <section className="sn-capsule-hero" aria-labelledby="home-hero-title">
      <div className="sn-capsule-stage">
        <HeroYeti className="sn-capsule-scene" />
        <div className="sn-container sn-capsule-content">
          <h1 id="home-hero-title" className="sn-capsule-title">
            <span>Learn at your pace.</span>{" "}
            <span className="sn-capsule-title-accent">
              Build skills that matter.
            </span>
          </h1>
          <p className="sn-capsule-intro">
            Explore courses on Prahit, follow structured lessons, and track your
            progress as you learn.
          </p>
          <div className="sn-capsule-actions">
            <Link
              to="/services"
              className="sn-btn sn-btn-primary sn-btn-lg sn-capsule-cta"
            >
              Explore courses <FiArrowRight aria-hidden="true" />
            </Link>
            <ul className="sn-capsule-points">
              <li>
                <FiPlayCircle aria-hidden="true" />
                <p className="font-semibold">Structured lessons</p>
                <p>Follow a clear path through each course.</p>
              </li>
              <li>
                <FiCheckCircle aria-hidden="true" />
                <p className="font-semibold">Track your progress</p>
                <p>Completed lessons are saved to your account.</p>
              </li>
            </ul>
          </div>
        </div>
      </div>
      <div className="sn-container sn-capsule-finder">
        <CourseFinder layout="bar" />
      </div>
    </section>
  )
}
