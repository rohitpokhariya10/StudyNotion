import { SketchUnderline } from "@/shared/ui/illustrations/Doodles"

import "./editorial.css"

// Two-column editorial hero used by About and Services: a large heading with
// blue emphasis, a sketched underline, a description with a thin yellow rule,
// one primary action and a large illustration. `children` render below the
// grid inside the same container (Services places its facts panel there).
export function EditorialHero({
  action,
  art,
  children,
  className = "",
  description,
  title,
  titleId,
}) {
  return (
    <section className={`sn-ed-hero ${className}`} aria-labelledby={titleId}>
      <div className="sn-ed-shell">
        <div className="sn-ed-hero-grid">
          <div className="sn-ed-intro">
            <h1 id={titleId} className="sn-ed-title">
              {title}
            </h1>
            <SketchUnderline className="sn-ed-underline" />
            <p className="sn-ed-description">{description}</p>
            {action}
          </div>
          <div className="sn-ed-art">{art}</div>
        </div>
        {children}
      </div>
    </section>
  )
}

// Centred section heading with a sketched underline and an optional short
// introduction; `inverse` draws it in white on the blue bands.
export function EditorialHeading({
  className = "",
  id,
  intro,
  inverse = false,
  size = "md",
  title,
}) {
  return (
    <div
      className={`sn-ed-heading ${inverse ? "sn-ed-heading-inverse" : ""} ${
        size === "lg" ? "sn-ed-heading-lg" : ""
      } ${className}`}
    >
      <h2 id={id} className="sn-ed-heading-title">
        {title}
      </h2>
      <SketchUnderline className="sn-ed-heading-underline" />
      {intro && <p className="sn-ed-heading-intro">{intro}</p>}
    </div>
  )
}
