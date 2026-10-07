import PersonFigure from "@/shared/ui/illustrations/PersonFigure"
import { Link } from "react-router"

// Short brand-blue band: compact white card, with a cut-out learner pointing
// at the message from the right (desktop only).
export default function StartBand() {
  return (
    <section
      className="sn-block sn-block-brand relative overflow-hidden"
      aria-labelledby="start-title"
    >
      <div className="sn-container relative">
        <div className="rounded-3xl bg-white px-6 py-10 text-center sm:px-10 lg:py-10 lg:pr-[28rem] lg:text-left">
          <h2 id="start-title" className="sn-heading text-brand-primary">
            Not sure where to begin?
          </h2>
          <p className="sn-copy mx-auto mt-6 max-w-[33rem] lg:mx-0">
            Pick a subject that interests you and open its courses — every
            curriculum is visible before you enrol.
          </p>
          <Link
            to="/services"
            className="sn-btn sn-btn-primary mt-6 w-full max-w-64"
          >
            Find my subject
          </Link>
        </div>
        <PersonFigure
          variant="pointing"
          className="sn-cutout right-24 -bottom-20 hidden h-[24.5rem] lg:block xl:right-32"
        />
      </div>
    </section>
  )
}
