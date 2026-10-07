import PersonFigure from "@/shared/ui/illustrations/PersonFigure"
import { Link } from "react-router"

const POINTS = [
  [
    "Structured curricula",
    "every course is organised into sections and lessons, so you always know what comes next.",
  ],
  [
    "Self-paced video lessons",
    "watch in order or jump straight to the topic you need, on any device.",
  ],
  [
    "Progress that stays with you",
    "completed lessons are saved to your account and shown on your dashboard.",
  ],
  [
    "Preview before you enrol",
    "read the full course content, instructor profile and learner reviews first.",
  ],
  [
    "Secure checkout",
    "pay safely and track purchases and refund requests from your account.",
  ],
]

// Brand-blue band: white card with a feature list and a cut-out learner who
// stands on the section's bottom edge (desktop only).
export default function ExperienceBand() {
  return (
    <section
      className="sn-block sn-block-brand relative overflow-hidden"
      aria-labelledby="experience-title"
    >
      <div className="sn-container relative">
        <div className="rounded-2xl bg-white px-6 py-10 sm:px-12 sm:py-12 lg:pr-[28rem]">
          <h2
            id="experience-title"
            className="sn-heading text-center lg:text-left"
          >
            What you get with every Prahit course
          </h2>
          <ul className="mt-8 list-disc space-y-4 pl-6 text-base leading-[1.625] marker:text-text-primary">
            {POINTS.map(([title, text]) => (
              <li key={title} className="pl-1">
                <strong className="font-semibold">{title}</strong>: {text}
              </li>
            ))}
          </ul>
          <p className="mt-6 text-base leading-[1.625]">
            It’s your{" "}
            <strong className="font-semibold">
              first step towards skills that last
            </strong>
            .
          </p>
          <Link
            to="/services"
            className="sn-btn sn-btn-primary mt-9 w-full sm:w-80"
          >
            Browse all subjects
          </Link>
        </div>
        <PersonFigure
          variant="tablet"
          className="sn-cutout -right-6 -bottom-20 hidden h-[37.5rem] lg:block xl:-right-12"
        />
      </div>
    </section>
  )
}
