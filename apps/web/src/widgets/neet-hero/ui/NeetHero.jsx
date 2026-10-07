import ProductCollage from "@/shared/ui/ProductCollage"
import { HeroBackdrop } from "@/widgets/neet-hero/ui/HeroBackdrop"
import { Link } from "react-router"

// Landing hero. The copy is about the aspirant's journey, not product
// mechanics (those live in the feature sections below). Copy and CTAs are
// plain HTML that work before, and without, any 3D asset.
export function NeetHero({
  onBackdropModeChange,
  primaryAction,
  secondaryAction,
}) {
  return (
    <section
      aria-labelledby="pn-hero-title"
      className="relative isolate overflow-hidden bg-neet-canvas-raised/60"
    >
      <div className="pointer-events-none absolute inset-0 opacity-15">
        <HeroBackdrop onModeChange={onBackdropModeChange} />
      </div>
      <div className="sn-container sn-hero-grid relative z-10 py-12 lg:py-20">
        <div className="max-w-3xl">
          <p className="pn-chip pn-glass mb-7 border-neet-accent/30 text-neet-accent">
            <span
              aria-hidden="true"
              className="pn-breathe inline-block h-2 w-2 rounded-full bg-neet-accent"
            />
            Prahit presents · Project NEET
          </p>
          <h1
            id="pn-hero-title"
            className="pn-display text-[clamp(3rem,1.6rem+3.6vw,5.4rem)] font-extrabold"
          >
            Three hours.
            <span className="block text-neet-accent">One step closer.</span>
          </h1>
          <p className="mt-7 max-w-xl text-[clamp(1.05rem,0.98rem+0.35vw,1.3rem)] leading-relaxed text-neet-muted">
            Train under serious exam conditions. Stay focused, trust your
            preparation, and make every mock count — one calm, honest sitting at
            a time.
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-3">
            {primaryAction && (
              <Link
                to={primaryAction.to}
                className="pn-btn pn-btn-primary pn-btn-lg"
              >
                {primaryAction.label}
                <span aria-hidden="true">→</span>
              </Link>
            )}
            {secondaryAction && (
              <a
                href={secondaryAction.href}
                className="pn-btn pn-btn-secondary pn-btn-lg pn-glass"
              >
                {secondaryAction.label}
              </a>
            )}
          </div>
          <p className="mt-6 text-sm font-semibold text-neet-sun">
            Future doctor, ready when you are.
          </p>
        </div>
        <div className="relative">
          <ProductCollage variant="science" />
          <p className="pn-chip mx-auto flex w-fit bg-neet-surface">
            A little practice. A clearer path.
          </p>
        </div>
      </div>
    </section>
  )
}
