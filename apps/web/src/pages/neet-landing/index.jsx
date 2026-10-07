import {
  neetClient,
  NeetMockCard,
  NeetMockCardSkeleton,
  NeetResourceStatus,
  useNeetResource,
} from "@/entities/neet"
import useRevealOnScroll from "@/shared/hooks/useRevealOnScroll"
import { NeetHero } from "@/widgets/neet-hero"
import { ProjectNeetShell } from "@/widgets/neet-shell"
import { FiClock, FiGrid, FiRefreshCw, FiShield } from "react-icons/fi"
import { Link } from "react-router"

// Capability claims live here, below the hero, in plain and honest terms.
const FEATURES = [
  {
    Icon: FiClock,
    title: "A timer you can trust",
    copy: "The deadline is kept on our server. Refreshing, closing the tab or changing your device clock never pauses or resets it.",
    accent: "text-neet-accent",
  },
  {
    Icon: FiRefreshCw,
    title: "Answers that hold on",
    copy: "Every choice saves automatically. If Wi-Fi drops, answers wait safely on your device and sync the moment you reconnect.",
    accent: "text-neet-sun",
  },
  {
    Icon: FiGrid,
    title: "A digital OMR",
    copy: "See every question at a glance — answered, not answered, marked for review — grouped by subject, and jump anywhere in a tap.",
    accent: "text-neet-cell",
  },
  {
    Icon: FiShield,
    title: "Optional proctored practice",
    copy: "Rehearse disciplined conditions with consent-first monitoring. Signals are analysed on your device; nothing is recorded.",
    accent: "text-neet-pulse",
  },
]

const JOURNEY = [
  "Your details",
  "Choose a mode",
  "Instructions",
  "System check",
  "Three focused hours",
  "Your result",
]

function Reveal({
  as: Component = "div",
  children,
  className = "",
  delay = 0,
}) {
  const ref = useRevealOnScroll()
  return (
    <Component
      ref={ref}
      className={`pn-reveal ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </Component>
  )
}

function SectionHeading({ eyebrow, title, copy, id }) {
  return (
    <Reveal className="max-w-3xl">
      <p className="pn-eyebrow text-neet-accent">{eyebrow}</p>
      <h2
        id={id}
        className="pn-display mt-4 text-[clamp(2.2rem,1.4rem+3vw,4rem)] font-bold"
      >
        {title}
      </h2>
      {copy && (
        <p className="mt-5 max-w-2xl text-lg leading-8 text-neet-muted">
          {copy}
        </p>
      )}
    </Reveal>
  )
}

export default function NeetLanding() {
  const catalog = useNeetResource(
    (options) => neetClient.listTests(options),
    []
  )
  const firstOpen = catalog.data?.tests.find(
    (test) => test.availability.state === "OPEN"
  )

  return (
    <ProjectNeetShell>
      <NeetHero
        primaryAction={{
          to: firstOpen
            ? `/project-neet/mocks/${firstOpen.id}/start`
            : "/project-neet/mocks",
          label: "Start a Mock",
        }}
        secondaryAction={{ href: "#mocks", label: "Explore Tests" }}
      />

      <section
        aria-labelledby="pn-features"
        className="mx-auto w-full max-w-[1320px] px-4 py-20 sm:px-6 lg:py-28"
      >
        <SectionHeading
          id="pn-features"
          eyebrow="Built for serious practice"
          title={
            <>
              Calm on the surface.
              <br />
              Solid underneath.
            </>
          }
          copy="Everything that could distract you on a long sitting is handled quietly, so all of your attention goes to the next question."
        />
        <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map(({ Icon, accent, copy, title }, index) => (
            <Reveal
              as="article"
              key={title}
              delay={index * 90}
              className="pn-card flex flex-col gap-5 p-6"
            >
              <span
                className={`grid h-12 w-12 place-items-center rounded-2xl bg-neet-surface-muted text-2xl ${accent}`}
              >
                <Icon aria-hidden="true" />
              </span>
              <h3 className="text-xl font-bold">{title}</h3>
              <p className="leading-7 text-neet-muted">{copy}</p>
            </Reveal>
          ))}
        </div>
      </section>

      <section
        aria-labelledby="pn-modes"
        className="relative border-y border-neet-line/60 bg-neet-canvas-raised"
      >
        <div className="mx-auto w-full max-w-[1320px] px-4 py-20 sm:px-6 lg:py-28">
          <SectionHeading
            id="pn-modes"
            eyebrow="Two ways to practise"
            title="Your space, your rules."
            copy="Choose the conditions that suit today's goal. You can switch modes before every attempt."
          />
          <div className="mt-12 grid gap-4 lg:grid-cols-2">
            <Reveal as="article" className="pn-card p-7 sm:p-9">
              <p className="pn-eyebrow text-neet-accent">Practice mode</p>
              <h3 className="pn-display mt-3 text-3xl font-bold">
                Focus without a camera.
              </h3>
              <p className="mt-4 leading-7 text-neet-muted">
                The full exam experience — server-kept timer, autosave, digital
                OMR and a detailed result — with no monitoring and no devices to
                set up. Works on laptops, tablets and phones.
              </p>
            </Reveal>
            <Reveal as="article" delay={120} className="pn-card p-7 sm:p-9">
              <p className="pn-eyebrow text-neet-pulse">Proctored mode</p>
              <h3 className="pn-display mt-3 text-3xl font-bold">
                Rehearse the discipline.
              </h3>
              <p className="mt-4 leading-7 text-neet-muted">
                Full screen, tab and focus monitoring, plus camera and
                microphone signals analysed on your device. You see exactly what
                is monitored and give consent first. Calm warnings come before
                any policy-based submission, and no video or audio is ever
                stored. Designed for laptops and desktops.
              </p>
            </Reveal>
          </div>
        </div>
      </section>

      <section
        id="mocks"
        aria-labelledby="pn-mocks"
        className="mx-auto w-full max-w-[1320px] scroll-mt-6 px-4 py-20 sm:px-6 lg:py-28"
      >
        <div className="flex flex-wrap items-end justify-between gap-6">
          <SectionHeading
            id="pn-mocks"
            eyebrow="Available mocks"
            title="Pick today's sitting."
          />
          <Link to="/project-neet/mocks" className="pn-btn pn-btn-secondary">
            All mock tests and your attempts →
          </Link>
        </div>
        <div className="mt-12">
          <NeetResourceStatus
            resource={catalog}
            loading={
              <div
                role="status"
                aria-label="Loading mock tests"
                className="grid gap-5 md:grid-cols-2"
              >
                <NeetMockCardSkeleton />
                <NeetMockCardSkeleton />
              </div>
            }
          />
          {catalog.status === "success" && catalog.data.tests.length === 0 && (
            <div className="pn-card p-8 text-center">
              <h3 className="text-xl font-bold">No mocks are open right now</h3>
              <p className="mt-2 text-neet-muted">
                New papers are on their way. Check back soon.
              </p>
            </div>
          )}
          {catalog.status === "success" && catalog.data.tests.length > 0 && (
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {catalog.data.tests.map((test) => (
                <NeetMockCard key={test.id} test={test} />
              ))}
            </div>
          )}
        </div>
      </section>

      <section
        aria-labelledby="pn-journey"
        className="mx-auto w-full max-w-[1320px] px-4 pb-20 sm:px-6 lg:pb-28"
      >
        <SectionHeading
          id="pn-journey"
          eyebrow="How a sitting flows"
          title="Six calm steps."
        />
        <ol className="relative mt-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
          {JOURNEY.map((step, index) => (
            <Reveal
              as="li"
              key={step}
              delay={index * 70}
              className="pn-card flex items-center gap-4 p-5 lg:flex-col lg:items-start"
            >
              <span className="pn-display grid h-11 w-11 flex-none place-items-center rounded-full bg-neet-accent text-lg font-bold text-neet-accent-ink">
                {index + 1}
              </span>
              <span className="font-bold">{step}</span>
            </Reveal>
          ))}
        </ol>
      </section>

      <section
        aria-labelledby="pn-close"
        className="mx-auto w-full max-w-[1320px] px-4 pb-24 sm:px-6"
      >
        <Reveal className="pn-card pn-grain relative overflow-hidden p-8 sm:p-14">
          <svg
            aria-hidden="true"
            viewBox="0 0 600 80"
            preserveAspectRatio="none"
            className="absolute inset-x-0 bottom-0 h-20 w-full opacity-40"
          >
            <path
              d="M0 60 H180 l14 -12 l10 12 H250 l8 16 l12 -70 l14 86 l10 -30 H360 l20 -16 l20 16 H600"
              fill="none"
              stroke="rgb(var(--pn-pulse))"
              strokeWidth="2.5"
              strokeLinejoin="round"
              className="pn-ecg-line"
              style={{ "--pn-ecg-length": 900 }}
            />
          </svg>
          <div className="relative max-w-3xl">
            <h2
              id="pn-close"
              className="pn-display text-[clamp(2.2rem,1.4rem+3vw,4rem)] font-bold"
            >
              Stay calm. Trust your preparation.
            </h2>
            <p className="mt-5 text-lg leading-8 text-neet-muted">
              One honest mock at a time. These are independent sample papers —
              the format and mode of future official NEET exams are decided by
              the NTA, so always follow the official bulletin when it is
              published.
            </p>
            <Link
              to={
                firstOpen
                  ? `/project-neet/mocks/${firstOpen.id}/start`
                  : "/project-neet/mocks"
              }
              className="pn-btn pn-btn-primary pn-btn-lg mt-8"
            >
              Begin your next mock <span aria-hidden="true">→</span>
            </Link>
          </div>
        </Reveal>
      </section>
    </ProjectNeetShell>
  )
}
