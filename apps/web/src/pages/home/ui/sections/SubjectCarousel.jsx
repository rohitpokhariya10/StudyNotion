import { useEffect, useRef, useState } from "react"
import {
  FiArrowLeft,
  FiArrowRight,
  FiBookOpen,
  FiCode,
  FiCpu,
  FiPenTool,
  FiTrendingUp,
} from "react-icons/fi"
import { Link } from "react-router"

const ICONS = [FiBookOpen, FiCode, FiTrendingUp, FiPenTool, FiCpu]
const TONES = [
  "from-[#dce9fd] to-[#f1f6ff] text-brand-primary",
  "from-[#d9f2e6] to-[#f1faf5] text-[#17865f]",
  "from-[#ffe4d4] to-[#fff4ec] text-[#c2382e]",
  "from-[#e9e3fb] to-[#f6f3ff] text-[#5b3fc4]",
]
const TILTS = ["-rotate-[4deg]", "rotate-[3deg]", "-rotate-[2deg]", "rotate-[4deg]"]
const catalogPath = (name) =>
  `/catalog/${name.split(" ").join("-").toLowerCase()}`

function SubjectCard({ category, index }) {
  const Icon = ICONS[index % ICONS.length]
  const count = category.publishedCourseCount
  return (
    <Link
      to={catalogPath(category.name)}
      className={`group block h-full rounded-lg bg-white p-5 text-left text-text-primary shadow-[0_10px_30px_rgb(4_24_66/0.25)] transition-transform duration-200 hover:rotate-0 focus-visible:rotate-0 motion-reduce:transition-none ${TILTS[index % TILTS.length]}`}
    >
      <span
        aria-hidden="true"
        className={`relative flex aspect-[16/9] items-center justify-center overflow-hidden rounded-lg bg-linear-to-br ${TONES[index % TONES.length]}`}
      >
        <span className="absolute -top-6 -right-6 h-24 w-24 rounded-full bg-white/50" />
        <span className="absolute -bottom-8 left-6 h-20 w-20 rounded-full border-2 border-dashed border-current opacity-30" />
        <span className="relative grid h-16 w-16 place-items-center rounded-2xl bg-white shadow-[0_6px_16px_rgb(16_24_40/0.1)]">
          <Icon size={28} />
        </span>
      </span>
      <span className="mt-5 block text-base leading-6 font-bold">
        {category.name}
      </span>
      <span className="block text-sm text-text-secondary">
        {count} published course{count === 1 ? "" : "s"}
      </span>
      {category.description && (
        <span className="mt-4 line-clamp-3 block text-[0.9375rem] leading-6">
          {category.description}
        </span>
      )}
      <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-brand-primary">
        Explore courses
        <FiArrowRight
          aria-hidden="true"
          className="transition-transform duration-200 group-hover:translate-x-1"
        />
      </span>
    </Link>
  )
}

// Gradient band with tilted subject cards. Subjects come from the live
// catalog; arrows and dots appear only when the cards overflow the row.
export default function SubjectCarousel({
  categories,
  isError,
  isLoading,
  onRetry,
}) {
  const trackRef = useRef(null)
  const [overflowing, setOverflowing] = useState(false)
  const [current, setCurrent] = useState(0)
  const available = categories.filter(
    (category) => category.publishedCourseCount > 0
  )

  useEffect(() => {
    const track = trackRef.current
    if (!track) return undefined
    const update = () => {
      const cards = [...track.querySelectorAll("[data-subject-card]")]
      setOverflowing(track.scrollWidth > track.clientWidth + 4)
      const center = track.scrollLeft + track.clientWidth / 2
      let nearest = 0
      cards.forEach((card, index) => {
        const middle = card.offsetLeft + card.offsetWidth / 2
        const best = cards[nearest].offsetLeft + cards[nearest].offsetWidth / 2
        if (Math.abs(middle - center) < Math.abs(best - center)) nearest = index
      })
      setCurrent(nearest)
    }
    update()
    track.addEventListener("scroll", update, { passive: true })
    const observer = new ResizeObserver(update)
    observer.observe(track)
    return () => {
      track.removeEventListener("scroll", update)
      observer.disconnect()
    }
  }, [available.length])

  const goTo = (index) => {
    const track = trackRef.current
    const cards = track?.querySelectorAll("[data-subject-card]")
    const card = cards?.[Math.max(0, Math.min(index, cards.length - 1))]
    if (!card) return
    const reduce = window.matchMedia?.(
      "(prefers-reduced-motion: reduce)"
    ).matches
    track.scrollTo({
      left: card.offsetLeft - (track.clientWidth - card.offsetWidth) / 2,
      behavior: reduce ? "auto" : "smooth",
    })
  }

  return (
    <section
      id="subjects"
      className="sn-block sn-block-gradient scroll-mt-20"
      aria-labelledby="subjects-title"
    >
      <div className="sn-container text-center">
        <h2 id="subjects-title" className="sn-heading text-white">
          Find the subject that sparks your curiosity
        </h2>
        <p className="mx-auto mt-6 max-w-[32rem] text-base leading-6 text-white">
          Every subject links to its published courses, with full curricula you
          can preview before you enrol.
        </p>
      </div>

      {isLoading ? (
        <div
          role="status"
          aria-label="Loading subjects"
          className="sn-container mt-12 flex justify-center gap-10"
        >
          {[0, 1, 2].map((index) => (
            <div
              key={index}
              className={`h-[26rem] w-[19rem] flex-none animate-pulse rounded-lg bg-white/15 ${index ? "hidden md:block" : ""}`}
            />
          ))}
        </div>
      ) : isError ? (
        <div className="sn-container mt-12">
          <div
            className="mx-auto max-w-xl rounded-lg bg-white p-8 text-center text-text-primary"
            role="alert"
          >
            <p className="font-medium">We couldn’t load subjects right now.</p>
            <button
              type="button"
              className="sn-btn sn-btn-secondary mt-4"
              onClick={onRetry}
            >
              Try again
            </button>
          </div>
        </div>
      ) : available.length ? (
        <>
          <div
            ref={trackRef}
            className="mt-6 snap-x snap-mandatory overflow-x-auto px-6 [scrollbar-width:none] lg:mt-8 [&::-webkit-scrollbar]:hidden"
          >
            <ul className="mx-auto flex w-max gap-10 py-10 lg:gap-24">
              {available.map((category, index) => (
                <li
                  key={category.id}
                  data-subject-card
                  className="w-[17.5rem] flex-none snap-center sm:w-[21rem]"
                >
                  <SubjectCard category={category} index={index} />
                </li>
              ))}
            </ul>
          </div>
          {overflowing && (
            <div className="sn-container mt-4 flex items-center justify-center gap-8 lg:justify-between">
              <div className="flex items-center gap-1">
                {available.map((category, index) => (
                  <button
                    key={category.id}
                    type="button"
                    onClick={() => goTo(index)}
                    aria-label={`Show ${category.name}`}
                    aria-current={index === current ? "true" : undefined}
                    className="grid h-6 w-6 place-items-center"
                  >
                    <span
                      className={`h-2 w-2 rounded-full ${index === current ? "bg-white" : "bg-white/45"}`}
                    />
                  </button>
                ))}
              </div>
              <div className="flex gap-8">
                <button
                  type="button"
                  aria-label="Previous subject"
                  onClick={() => goTo(current - 1)}
                  disabled={current === 0}
                  className="grid h-9 w-9 place-items-center rounded-full bg-white text-text-primary disabled:opacity-50"
                >
                  <FiArrowLeft aria-hidden="true" />
                </button>
                <button
                  type="button"
                  aria-label="Next subject"
                  onClick={() => goTo(current + 1)}
                  disabled={current === available.length - 1}
                  className="grid h-9 w-9 place-items-center rounded-full bg-white text-text-primary disabled:opacity-50"
                >
                  <FiArrowRight aria-hidden="true" />
                </button>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="sn-container mt-12">
          <div className="mx-auto max-w-xl rounded-lg bg-white p-8 text-center text-text-primary">
            <h3 className="text-lg font-semibold">
              New courses are on their way
            </h3>
            <p className="mt-2 text-text-secondary">
              Published subjects will appear here as soon as they are available.
            </p>
          </div>
        </div>
      )}
    </section>
  )
}
