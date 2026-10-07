import PersonFigure from "@/shared/ui/illustrations/PersonFigure"
import ProductCollage from "@/shared/ui/ProductCollage"
import Footer from "@/widgets/footer"
import { FiBookOpen, FiHeart, FiLayers } from "react-icons/fi"
import { Link } from "react-router"

export default function Careers() {
  return (
    <>
      <main>
        <section className="sn-block sn-block-brand text-white">
          <div className="sn-container grid items-center gap-10 lg:grid-cols-[1.2fr_1fr]">
            <div>
              <p className="mb-4 text-sm font-medium text-white">
                Teach with Prahit
              </p>
              <h1 className="sn-display">
                Share your knowledge.
                <br />
                <span className="text-sun">Inspire a new chapter.</span>
              </h1>
              <p className="mt-6 max-w-lg leading-7">
                Bring your subject to life through a thoughtful course. Help
                curious learners take their next step, one lesson at a time.
              </p>
              <Link to="/signup" className="sn-btn sn-btn-light mt-7">
                Become an instructor →
              </Link>
              <p className="mt-4 text-sm">
                Choose Instructor at signup. Account approval is required.
              </p>
            </div>
            <div className="relative mx-auto w-full max-w-sm">
              <span
                aria-hidden="true"
                className="absolute top-8 right-0 h-52 w-52 rounded-full bg-sun"
              />
              <PersonFigure
                variant="teacher"
                className="relative h-[380px] w-full sm:h-[430px]"
              />
            </div>
          </div>
        </section>
        <section className="sn-block sn-block-brand text-white">
          <div className="sn-container">
            <p className="mb-4 text-center text-sm font-semibold">
              What we value
            </p>
            <h2 className="sn-heading text-center">
              Good learning begins with{" "}
              <span className="sn-white-underline">good teaching.</span>
            </h2>
            <ul className="mt-12 grid gap-10 md:grid-cols-3">
              {[
                [
                  FiHeart,
                  "Care for the learner",
                  "Explain the ideas behind the steps. Give learners room to pause and practise.",
                ],
                [
                  FiLayers,
                  "Bring ideas into focus",
                  "Arrange your subject into sections and lessons that build on each other.",
                ],
                [
                  FiBookOpen,
                  "Keep curiosity alive",
                  "Use clear examples and thoughtful explanations to make a subject approachable.",
                ],
              ].map(([Icon, title, text]) => (
                <li key={title}>
                  <span className="sn-feature-icon">
                    <Icon aria-hidden="true" />
                  </span>
                  <h3 className="mt-5 text-lg font-semibold">{title}</h3>
                  <p className="mt-3 text-sm leading-7 text-white">{text}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>
        <section className="sn-block">
          <div className="sn-container grid items-center gap-10 lg:grid-cols-2">
            <ProductCollage variant="teaching" />
            <div>
              <h2 className="sn-heading">
                A home for your{" "}
                <span className="text-brand-primary">course.</span>
              </h2>
              <p className="sn-copy mt-5">
                Approved instructors get the tools to organise lessons, upload
                course media and manage published courses.
              </p>
              <ul className="mt-6 space-y-4 text-sm leading-6">
                <li>01 · Create your course information and curriculum.</li>
                <li>02 · Build sections and upload your video lessons.</li>
                <li>03 · Review, publish and manage your courses.</li>
              </ul>
              <Link to="/signup" className="sn-btn sn-btn-primary mt-7">
                Start your instructor account
              </Link>
            </div>
          </div>
        </section>
        <section className="sn-block">
          <div className="sn-container max-w-3xl text-center">
            <h2 className="sn-heading">Ready to share what you know?</h2>
            <p className="sn-copy mt-5">
              This is an opportunity to create courses on Prahit. Select the
              Instructor account type when signing up, then complete
              verification and wait for account approval.
            </p>
            <Link to="/signup" className="sn-btn sn-btn-primary mt-6">
              Sign up as an instructor
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </>
  )
}
