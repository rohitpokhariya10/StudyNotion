import CardCarousel from "@/shared/ui/CardCarousel"
import PersonFigure from "@/shared/ui/illustrations/PersonFigure"

const values = [
  [
    "Start with curiosity",
    "A clear course description helps you choose a subject you want to explore.",
    "books",
  ],
  [
    "Teach with structure",
    "Sections and video lessons give ideas a thoughtful, easy-to-follow order.",
    "teacher",
  ],
  [
    "Make room to practise",
    "Pause a lesson, try the idea yourself, and return when you are ready.",
    "tablet",
  ],
  [
    "Recognise every step",
    "Mark completed lessons and see your course progress in your account.",
    "pointing",
  ],
]
export default function TeachingValues() {
  return (
    <section
      className="sn-block sn-block-gradient"
      aria-labelledby="teaching-values-title"
    >
      <div className="sn-container">
        <h2
          id="teaching-values-title"
          className="sn-heading mx-auto max-w-2xl text-center text-white"
        >
          A shared passion for{" "}
          <span className="sn-white-underline">learning</span>
        </h2>
        <p className="mx-auto mt-5 max-w-xl text-center leading-7 text-white">
          Thoughtful teaching. Curious learners. Small steps that add up.
        </p>
        <CardCarousel label="teaching values" count={values.length} inverse>
          {values.map(([title, description, variant], i) => (
            <li key={title}>
              <article className={`sn-value-card sn-value-card-${i % 2}`}>
                <div className="h-52 overflow-hidden rounded-lg bg-brand-soft">
                  <PersonFigure
                    variant={variant}
                    className="mx-auto h-72 w-auto"
                  />
                </div>
                <h3 className="mt-5 text-lg font-semibold">{title}</h3>
                <p className="mt-3 text-sm leading-6 text-text-secondary">
                  {description}
                </p>
              </article>
            </li>
          ))}
        </CardCarousel>
      </div>
    </section>
  )
}
