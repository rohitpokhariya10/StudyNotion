import PersonFigure from "@/shared/ui/illustrations/PersonFigure"

const REASONS = [
  [
    "Instructor-led courses",
    "Courses are created by approved instructors and organised into clear sections.",
  ],
  [
    "Learn your way",
    "Self-paced lessons you can pause, revisit and finish on any device.",
  ],
]

// Pale-blue band: white card with two reasons and a cut-out student who rises
// above the card and stands on the section edge (desktop only).
export default function WhyBand() {
  return (
    <section
      className="sn-block sn-block-pale relative overflow-hidden"
      aria-labelledby="why-title"
    >
      <div className="sn-container relative">
        <div className="rounded-2xl bg-white px-6 py-10 sm:px-12 sm:py-12 lg:pr-[28rem]">
          <h2 id="why-title" className="sn-heading max-w-[36rem]">
            Why learners build their skills with Prahit
          </h2>
          <p className="sn-copy mt-6 max-w-[36rem]">
            Every Prahit course lists what you’ll learn up front, is organised
            into clear sections and saves your progress as you go — and you can
            read its curriculum before you enrol.
          </p>
          <dl className="mt-10 grid gap-8 sm:grid-cols-2 sm:gap-8 lg:max-w-[36rem]">
            {REASONS.map(([title, text]) => (
              <div key={title}>
                <dt className="text-base leading-6 font-bold text-brand-primary">
                  {title}
                </dt>
                <dd className="mt-4 max-w-[15rem] text-sm leading-5">{text}</dd>
              </div>
            ))}
          </dl>
        </div>
        <PersonFigure
          variant="books"
          className="sn-cutout right-16 -bottom-20 hidden h-[35rem] lg:block xl:right-20"
        />
      </div>
    </section>
  )
}
