import servicesWorldMap from "@/shared/assets/editorial/services-world-map.svg"
import AccessibleDialog from "@/shared/ui/AccessibleDialog"
import CourseFinder from "@/widgets/course-finder"
import Footer from "@/widgets/footer"
import InstructorStrip from "@/widgets/instructor-strip"
import { EditorialHeading, EditorialHero } from "@/widgets/marketing"
import ReviewSlider from "@/widgets/review-slider"
import { useState } from "react"
import { FiX } from "react-icons/fi"

import Differentiators from "./ui/Differentiators"
import FaqAccordion from "./ui/FaqAccordion"
import LearningShowcase from "./ui/LearningShowcase"
import LearningSteps from "./ui/LearningSteps"
import StatsStrip from "./ui/StatsStrip"

import "./services.css"

const faqs = [
  [
    "How do I choose a course?",
    "Use Find courses or the Catalog menu to pick a subject, then search and filter its courses. Open a course to read its description, curriculum, instructor information and available learner reviews before deciding.",
  ],
  [
    "Are lessons live or recorded?",
    "Prahit courses use recorded video lessons. After enrollment, open your course from the learning library and work through the available lessons at your own pace.",
  ],
  [
    "Do I need special software to learn?",
    "No. Lessons play in the course player in your web browser, on a computer or a phone.",
  ],
  [
    "How is my progress saved?",
    "Use the lesson completion control when it becomes available in the player. Once saved, your completed lessons appear in the course curriculum and your enrolled-course library.",
  ],
  [
    "What should I check before purchasing?",
    "Review the course information and the current terms and refund policy shown at checkout. Pricing, availability and applicable refund conditions are confirmed by the checkout service.",
  ],
  [
    "Can I create a course?",
    "Choose Instructor on the signup form. Instructor accounts require approval before teaching tools become available. Approved instructors can create sections, upload lessons and submit their courses for publishing.",
  ],
]

export default function Services() {
  const [finderOpen, setFinderOpen] = useState(false)
  const openFinder = () => setFinderOpen(true)
  return (
    <>
      <main className="sn-services">
        <EditorialHero
          titleId="services-title"
          title={
            <>
              Learn from
              <br />
              <span>Anywhere</span> Around
              <br />
              the <span>Globe</span>.
            </>
          }
          description={
            <>
              Unlock your potential with online courses created by instructors.
              Explore a clear curriculum and recorded lessons, with the freedom
              to <strong>learn at your own pace</strong> and keep moving towards
              your <strong>learning goals</strong>.
            </>
          }
          action={
            <button
              type="button"
              onClick={openFinder}
              className="sn-btn sn-btn-primary sn-ed-cta"
            >
              Find courses
            </button>
          }
          art={
            <div className="sn-services-map" aria-hidden="true">
              <img
                src={servicesWorldMap}
                width="900"
                height="460"
                alt=""
                decoding="async"
                fetchPriority="high"
              />
            </div>
          }
        >
          <StatsStrip />
        </EditorialHero>
        <Differentiators />
        <section className="sn-reviews-band" aria-labelledby="services-reviews">
          <div className="sn-ed-shell">
            <EditorialHeading
              id="services-reviews"
              inverse
              size="lg"
              title="What Learners Say About Us"
            />
            <ReviewSlider variant="spotlight" />
          </div>
        </section>
        <InstructorStrip
          headingId="services-instructors"
          title="Learn from instructors who build every course"
          intro="Each course is written and recorded by an approved instructor. Select a profile to see one of their courses."
        />
        <LearningShowcase />
        <LearningSteps onFindCourses={openFinder} />
        <section className="sn-faq" aria-labelledby="services-faq">
          <h2 id="services-faq" className="sn-faq-title">
            Discover More About Learning Here
          </h2>
          <p className="sn-faq-subtitle">Frequently Asked Questions</p>
          <FaqAccordion items={faqs} />
        </section>
      </main>
      <Footer />
      {finderOpen && (
        <AccessibleDialog
          title="Find courses"
          titleClassName="sr-only"
          className="relative w-full max-w-md"
          overlayClassName="bg-black/40"
          onClose={() => setFinderOpen(false)}
        >
          <button
            aria-label="Close course finder"
            type="button"
            className="sn-btn sn-btn-icon absolute top-2 right-2 z-10"
            onClick={() => setFinderOpen(false)}
          >
            <FiX aria-hidden="true" />
          </button>
          <CourseFinder />
        </AccessibleDialog>
      )}
    </>
  )
}
