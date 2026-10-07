import {
  DashedConnector,
  SketchNumber,
} from "@/shared/ui/illustrations/Doodles"
import ProductCollage from "@/shared/ui/ProductCollage"
import { FiCheckCircle, FiChevronRight } from "react-icons/fi"
import { Link } from "react-router"

const PANEL_TONES = {
  blue: "bg-linear-to-br from-[#e6f0ff] to-[#f5f9ff]",
  mint: "bg-linear-to-br from-[#dff4ea] to-[#f3fbf7]",
  peach: "bg-linear-to-br from-[#ffe9dc] to-[#fff7f1]",
}

function ScenePanel({ chip, tone, variant }) {
  return (
    <div className="relative">
      <div
        className={`flex aspect-[448/300] items-center justify-center overflow-hidden rounded-lg ${PANEL_TONES[tone]}`}
      >
        <ProductCollage
          backdrop={false}
          variant={variant}
          className="w-[88%]"
        />
      </div>
      {chip && (
        <div className="absolute -bottom-4 left-6 flex items-center gap-3 rounded-md border border-[#e7ebf1] bg-white px-4 py-2.5 shadow-[0_4px_14px_rgb(16_24_40/0.1)]">
          <FiCheckCircle aria-hidden="true" className="text-[#17a589]" />
          <span className="text-left text-xs leading-4">
            <span className="block text-sm font-semibold">{chip[0]}</span>
            <span className="text-text-secondary">{chip[1]}</span>
          </span>
        </div>
      )}
    </div>
  )
}

// Zig-zag walkthrough: illustration and text swap sides on every row and a
// dashed connector leads to the next step (desktop only).
export default function HowItWorks({ isAuthenticated }) {
  const steps = [
    {
      title: "Explore and preview",
      text: "Browse subjects, open any course and read its full curriculum, instructor profile and learner reviews before you decide.",
      action: { to: "/services", label: "Browse subjects" },
      scene: {
        variant: "empty",
        tone: "blue",
        chip: ["Full curriculum", "Open to preview"],
      },
    },
    {
      title: "Learn at your own pace",
      text: "Enrol through a secure checkout, then watch video lessons in order or jump straight to the topic you need.",
      action: isAuthenticated
        ? { to: "/dashboard", label: "Open my courses" }
        : { to: "/signup", label: "Create a free account" },
      scene: { variant: "learning", tone: "mint" },
    },
    {
      title: "Track every step",
      text: "Mark lessons complete and watch your progress grow on your dashboard, so you always know what comes next.",
      action: isAuthenticated
        ? { to: "/dashboard", label: "See my progress" }
        : { to: "/login", label: "Log in to continue" },
      scene: { variant: "progress", tone: "peach" },
    },
  ]

  return (
    <section className="sn-block" aria-labelledby="how-title">
      <div className="sn-container">
        <h2
          id="how-title"
          className="sn-heading mx-auto max-w-[52rem] text-center"
        >
          How learning works on{" "}
          <span className="text-brand-primary">Prahit</span>
        </h2>
        <ol className="mt-12 lg:mt-14">
          {steps.map((step, index) => {
            const flipped = index % 2 === 1
            const actionClass =
              "mt-6 inline-flex min-h-10 items-center gap-1.5 text-sm font-medium text-brand-primary hover:underline"
            return (
              <li
                key={step.title}
                className="not-first:mt-14 lg:not-first:mt-0"
              >
                <div
                  className={`flex flex-col items-center gap-10 lg:flex-row lg:justify-between lg:gap-16 ${flipped ? "lg:flex-row-reverse" : ""}`}
                >
                  <div className="w-full max-w-[28rem] flex-none">
                    <ScenePanel {...step.scene} />
                  </div>
                  <div className="max-w-[24rem] text-center lg:text-left">
                    <SketchNumber
                      value={index + 1}
                      className="mx-auto lg:mx-0"
                    />
                    <h3 className="mt-3 text-xl leading-tight font-semibold lg:text-2xl">
                      <span className="sr-only">Step {index + 1}: </span>
                      {step.title}
                    </h3>
                    <p className="sn-copy mt-4">{step.text}</p>
                    {step.action.href ? (
                      <a href={step.action.href} className={actionClass}>
                        {step.action.label}
                        <FiChevronRight aria-hidden="true" />
                      </a>
                    ) : (
                      <Link to={step.action.to} className={actionClass}>
                        {step.action.label}
                        <FiChevronRight aria-hidden="true" />
                      </Link>
                    )}
                  </div>
                </div>
                {index < steps.length - 1 && (
                  <DashedConnector
                    direction={flipped ? "left" : "right"}
                    className="my-1 hidden lg:block"
                  />
                )}
              </li>
            )
          })}
        </ol>
      </div>
    </section>
  )
}
