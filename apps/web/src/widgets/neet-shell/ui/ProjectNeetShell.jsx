import "./NeetFonts"

import { NeetWordmark } from "@/widgets/neet-shell/ui/NeetLogo"
import { Link, NavLink } from "react-router"

import { NEET_LEGAL_NOTICE } from "../model/legal"
import { NeetAccountEntry } from "./NeetAccountEntry"
import { NeetLandingHeader } from "./NeetLandingChrome"

const navLinkClass = ({ isActive }) =>
  `rounded-full px-3 py-2 text-sm font-semibold transition-colors ${
    isActive
      ? "bg-neet-surface-muted text-neet-ink"
      : "text-neet-muted hover:text-neet-ink"
  }`

// Immersive experience-mode frame for landing, onboarding and results.
// `footer` lets a page supply its own footer (the landing uses the shared
// Prahit landscape footer); other NEET pages keep the compact default.
export function ProjectNeetShell({
  children,
  compactHeader = false,
  footer,
  landing = false,
}) {
  return (
    <div
      className={`pn-root pn-experience relative flex min-h-dvh flex-col overflow-x-clip${landing ? " pn-landing-page" : ""}`}
    >
      <a
        href="#pn-main"
        className="sr-only z-[60] rounded-full bg-neet-accent px-4 py-2 font-bold text-neet-accent-ink focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Skip to content
      </a>
      {landing ? (
        <NeetLandingHeader />
      ) : (
        <>
          <header
            className={`relative z-40 mx-auto flex w-full max-w-[1320px] items-center justify-between gap-4 px-4 sm:px-6 ${
              compactHeader ? "py-3" : "py-4 sm:py-5"
            }`}
          >
            <Link
              to="/neet"
              aria-label="Prahit NEET Mocks home"
              className="rounded-xl"
            >
              <NeetWordmark className="text-[1.1875rem] text-neet-ink sm:text-[1.5rem]" />
            </Link>
            <nav
              aria-label="Prahit NEET Mocks"
              className="hidden items-center gap-1 md:flex"
            >
              <NavLink to="/neet" end className={navLinkClass}>
                Overview
              </NavLink>
              <NavLink to="/neet/mocks" className={navLinkClass}>
                Mock tests
              </NavLink>
            </nav>
            <div className="flex items-center gap-2">
              <Link
                to="/"
                className="hidden rounded-full px-3 py-2 text-sm font-semibold text-neet-muted hover:text-neet-ink sm:inline-flex"
              >
                ← Prahit
              </Link>
              <NeetAccountEntry />
            </div>
          </header>

          <nav
            aria-label="Prahit NEET Mocks mobile"
            className="flex flex-wrap items-center justify-center gap-1 border-y border-neet-line bg-neet-surface px-3 py-2 md:hidden"
          >
            <NavLink to="/neet" end className={navLinkClass}>
              Overview
            </NavLink>
            <NavLink to="/neet/mocks" className={navLinkClass}>
              Mock tests
            </NavLink>
            <Link
              to="/"
              className="rounded-full px-3 py-2 text-sm font-semibold"
            >
              Prahit ↗
            </Link>
          </nav>
        </>
      )}

      <main id="pn-main" className="relative z-10 flex flex-1 flex-col">
        {children}
      </main>

      {footer ?? (
        <footer className="relative z-10 mt-auto border-t border-neet-line/70">
          <div className="mx-auto flex w-full max-w-[1320px] flex-col gap-4 px-4 py-8 text-sm text-neet-muted sm:px-6 md:flex-row md:items-center md:justify-between">
            <p className="max-w-3xl leading-6">{NEET_LEGAL_NOTICE}</p>
            <nav
              aria-label="Prahit NEET Mocks footer"
              className="flex flex-wrap gap-x-5 gap-y-2"
            >
              <Link to="/neet/mocks" className="hover:text-neet-ink">
                Mock tests
              </Link>
              <Link to="/privacy-policy" className="hover:text-neet-ink">
                Privacy
              </Link>
              <Link to="/" className="hover:text-neet-ink">
                Prahit home
              </Link>
            </nav>
          </div>
        </footer>
      )}
    </div>
  )
}
