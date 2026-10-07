import aboutLearners from "@/shared/assets/editorial/about-learners.svg"
import inspirationScene from "@/shared/assets/editorial/inspiration-scene.svg"
import missionScene from "@/shared/assets/editorial/mission-scene.svg"
import storyScene from "@/shared/assets/editorial/story-scene.svg"
import Footer from "@/widgets/footer"
import InstructorStrip from "@/widgets/instructor-strip"
import { EditorialHero } from "@/widgets/marketing"
import { Link } from "react-router"

import StoryRow from "./ui/StoryRow"

import "./about.css"

export default function About() {
  return (
    <>
      <main className="sn-about">
        <EditorialHero
          className="sn-ed-hero-tight"
          titleId="about-title"
          title={
            <>
              A space to learn.
              <br />
              <span>Room to grow.</span>
            </>
          }
          description="We bring instructor-created courses and curious learners together, with a clear path from the first lesson to the next skill."
          action={
            <Link to="/services" className="sn-btn sn-btn-primary sn-ed-cta">
              Explore our courses
            </Link>
          }
          art={
            <img
              src={aboutLearners}
              width="512"
              height="500"
              alt="Illustration of learners on laptops and tablets, connected by messages"
              decoding="async"
              fetchPriority="high"
            />
          }
        />
        <StoryRow
          title="Our Story"
          image={storyScene}
          imageAlt="Illustration of lesson cards pinned to a board and joined by a string"
          summary={
            <p>
              Prahit is a place to discover recorded courses, explore their
              curricula and learn at your own pace. Each course is organised
              into sections and lessons, so you can see the path ahead before
              you enrol.
            </p>
          }
          more={
            <p>
              Your account brings your enrolled courses, completed lessons and
              purchase history together. Instructors build courses with the
              authoring tools, and approved courses become available in the
              catalog.
            </p>
          }
        />
        <StoryRow
          reverse
          title="Our Mission"
          image={missionScene}
          imageAlt="Illustration of an arrow at the centre of a target"
          summary={
            <p>
              Make the learning journey easier to follow: a curriculum you can
              review, video lessons you can revisit, and completion progress
              that stays with your account.
            </p>
          }
          more={
            <p>
              Good tools should help you spend more time learning and less time
              finding your way.
            </p>
          }
        />
        <StoryRow
          title="Our Inspiration"
          image={inspirationScene}
          imageAlt="Illustration of a young plant beside a letterboard reading small steps, new possibilities"
          summary={
            <p>
              A useful explanation can open up a subject. A thoughtful course
              gives that explanation a home.
            </p>
          }
          more={
            <p>
              Prahit gives approved instructors a place to organise their
              knowledge into lessons and learners a way to work through it, one
              step at a time.{" "}
              <Link to="/careers" className="sn-inline-link">
                Share what you know
              </Link>
              .
            </p>
          }
        />
        <InstructorStrip
          headingId="about-instructors"
          title="Meet Our Instructors"
          intro="The people behind our courses: approved instructors who turn what they know into lessons you can follow at your own pace."
        />
      </main>
      <Footer />
    </>
  )
}
