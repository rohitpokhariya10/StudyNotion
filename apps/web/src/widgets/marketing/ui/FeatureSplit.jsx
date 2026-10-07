import ProductCollage from "@/shared/ui/ProductCollage"
import { Link } from "react-router"

export default function FeatureSplit({
  title,
  accent,
  children,
  variant = "learning",
  reverse = false,
  action,
  eyebrow,
}) {
  return (
    <section className="sn-block">
      <div
        className={`sn-container grid items-center gap-10 lg:grid-cols-2 lg:gap-20 ${reverse ? "sn-feature-reverse" : ""}`}
      >
        <div className="sn-feature-art">
          <ProductCollage variant={variant} />
        </div>
        <div>
          {eyebrow && <p className="sn-eyebrow">{eyebrow}</p>}
          <h2 className="sn-heading">
            {title} <span className="text-brand-primary">{accent}</span>
          </h2>
          <div className="sn-copy mt-5 space-y-4">{children}</div>
          {action && (
            <Link to={action.to} className="sn-btn sn-btn-primary mt-6">
              {action.label}
            </Link>
          )}
        </div>
      </div>
    </section>
  )
}
