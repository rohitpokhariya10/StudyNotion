import ProductCollage from "@/shared/ui/ProductCollage"
import { useId, useState } from "react"
import { Link } from "react-router"

const ITEMS = [
  {
    title: "Self-paced courses",
    text: "Video lessons organised into sections, so you can learn in order or jump to what you need.",
    action: { to: "/services", label: "Browse subjects" },
    scene: "learning",
  },
  {
    title: "Instructor-created courses",
    text: "Explore course descriptions, instructor information and the full curriculum before you enrol.",
    action: { to: "/services", label: "Explore courses" },
    scene: "teaching",
  },
  {
    title: "Help when you need it",
    text: "Questions about a course, your account or an order? Send us a message and we’ll reply by email.",
    action: { to: "/contact", label: "Contact support" },
    scene: "empty",
  },
]

// Pale band: illustration on the left, a list of support areas on the right.
// Selecting an area highlights it with an amber rule and swaps the artwork.
export default function GuidanceSection() {
  const baseId = useId()
  const [active, setActive] = useState(1)

  return (
    <section
      className="sn-block sn-block-tint"
      aria-labelledby="guidance-title"
    >
      <div className="sn-container grid items-center gap-10 lg:grid-cols-[minmax(0,1fr)_39rem] lg:gap-8">
        <div className="mx-auto hidden w-full max-w-[30rem] lg:block">
          <ProductCollage variant={ITEMS[active].scene} />
        </div>
        <div>
          <h2 id="guidance-title" className="sn-subheading">
            <span className="text-brand-primary">Guiding you</span> at every
            step
          </h2>
          <p className="mt-5 text-base leading-6">
            Learning is never one-size-fits-all. Whether you’re starting a new
            subject, working through a course or need a hand with your account,
            here is where Prahit helps:
          </p>
          <ul className="mt-8 space-y-4 lg:max-w-[31rem]">
            {ITEMS.map((item, index) => {
              const selected = index === active
              const panelId = `${baseId}-panel-${index}`
              return (
                <li
                  key={item.title}
                  className={`border-l-2 py-1 pl-6 lg:pl-8 ${selected ? "border-[#f5a524]" : "border-transparent"}`}
                >
                  <h3>
                    <button
                      type="button"
                      aria-pressed={selected}
                      aria-controls={panelId}
                      onClick={() => setActive(index)}
                      className={`text-left font-bold ${selected ? "text-2xl leading-8" : "text-lg leading-7"}`}
                    >
                      {item.title}
                    </button>
                  </h3>
                  <div id={panelId}>
                    <p className="mt-2 text-sm leading-5">{item.text}</p>
                    {selected &&
                      (item.action.href ? (
                        <a
                          href={item.action.href}
                          className="sn-btn sn-btn-primary mt-4 min-h-9 px-6"
                        >
                          {item.action.label}
                        </a>
                      ) : (
                        <Link
                          to={item.action.to}
                          className="sn-btn sn-btn-primary mt-4 min-h-9 px-6"
                        >
                          {item.action.label}
                        </Link>
                      ))}
                  </div>
                </li>
              )
            })}
          </ul>
        </div>
      </div>
    </section>
  )
}
