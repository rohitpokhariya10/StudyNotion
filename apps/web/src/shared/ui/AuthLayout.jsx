import BrandLogo from "@/shared/ui/BrandLogo"
import ProductCollage from "@/shared/ui/ProductCollage"
import { FiCheck } from "react-icons/fi"

const PANELS = {
  login: {
    heading: "Your learning, right where you left it",
    points: [
      "Pick up every course where you left off",
      "See your lesson progress at a glance",
      "Purchases and refunds in one place",
    ],
  },
  signup: {
    heading: "Start learning with Prahit",
    points: [
      "Create your account for free",
      "Preview every curriculum before you enrol",
      "Learn at your own pace, on any device",
    ],
  },
  recovery: {
    heading: "Let’s get you back in",
    points: [
      "Secure, time-limited reset links",
      "Your courses and progress stay safe",
      "Support is a message away if you need it",
    ],
  },
}

// Split authentication layout: illustration panel + calm form surface.
// On small screens only the form is shown; the navbar already carries the brand.
export default function AuthLayout({ children, variant = "login" }) {
  const panel = PANELS[variant] || PANELS.login
  return (
    <main className="grid min-h-[calc(100dvh-var(--sn-header-height))] lg:grid-cols-2">
      <aside className="relative overflow-hidden bg-linear-to-br from-brand-soft via-[#eef4ff] to-white">
        <div className="mx-auto flex h-full max-w-[34rem] flex-col justify-center px-6 py-8 lg:px-10 lg:py-16">
          <BrandLogo size="auth" className="mb-5" />
          <h2 className="sn-heading">{panel.heading}</h2>
          <ul className="mt-6 hidden space-y-3 lg:block">
            {panel.points.map((point) => (
              <li
                key={point}
                className="flex items-center gap-3 text-[0.9375rem]"
              >
                <span
                  aria-hidden="true"
                  className="grid h-6 w-6 flex-none place-items-center rounded-full bg-white text-brand-primary shadow-education"
                >
                  <FiCheck size={14} />
                </span>
                {point}
              </li>
            ))}
          </ul>
          <div className="mt-10 hidden max-w-[26rem] lg:block">
            <ProductCollage
              variant={variant === "signup" ? "empty" : "learning"}
            />
          </div>
        </div>
      </aside>
      <div className="flex items-start justify-center bg-white px-4 py-10 sm:px-6 lg:items-center lg:py-16">
        <div className="w-full max-w-[28rem]">{children}</div>
      </div>
    </main>
  )
}

// Heading block shared by every auth form.
export function AuthHeading({ children, description, title }) {
  return (
    <div className="mb-8">
      <h1 className="sn-heading">{title}</h1>
      {description && (
        <p className="mt-3 text-[0.9375rem] leading-relaxed text-text-secondary">
          {description}
        </p>
      )}
      {children}
    </div>
  )
}
