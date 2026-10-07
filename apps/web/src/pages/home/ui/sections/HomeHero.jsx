import CourseFinder from "@/widgets/course-finder"
import { useRef } from "react"
import { FiArrowRight, FiCheckCircle, FiPlayCircle } from "react-icons/fi"
import { Link } from "react-router"

import CapsuleStage from "../hero/CapsuleStage"

import "@fontsource-variable/inter-tight/wght.css"
import "@fontsource/instrument-serif/400-italic.css"
import "../hero/homeHero.css"

// Display headline beside two decorative 3D capsule characters that follow
// the pointer. Copy, links and the course finder are plain HTML that work
// before, and without, the WebGL scene.
export default function HomeHero() {
  const heroRef = useRef(null)
  return (
    <section
      ref={heroRef}
      className="sn-capsule-hero"
      aria-labelledby="home-hero-title"
    >
      <div className="sn-capsule-stage">
        <CapsuleStage heroRef={heroRef} className="sn-capsule-scene" />
        <div className="sn-container sn-capsule-content">
          <h1 id="home-hero-title" className="sn-capsule-title">
            <span className="sn-capsule-title-sans">Build your skills.</span>{" "}
            <span className="sn-capsule-title-serif">
              <span>Shape your</span> <span>future.</span>
            </span>
          </h1>
          <p className="sn-capsule-intro">
            Discover instructor-created courses, learn at your own pace, and
            make every lesson a step forward.
          </p>
          <div className="sn-capsule-actions">
            <Link to="/services" className="sn-btn sn-capsule-cta">
              Explore courses <FiArrowRight aria-hidden="true" />
            </Link>
            <ul className="sn-capsule-points">
              <li>
                <FiPlayCircle aria-hidden="true" />
                <p className="font-semibold">Structured lessons</p>
                <p>A clear path through each course</p>
              </li>
              <li>
                <FiCheckCircle aria-hidden="true" />
                <p className="font-semibold">Your progress</p>
                <p>Completed lessons saved to your account</p>
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
