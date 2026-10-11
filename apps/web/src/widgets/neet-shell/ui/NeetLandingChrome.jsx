import "@fontsource-variable/inter-tight"
import "../styles/landingChrome.css"

import { useEffect, useRef, useState } from "react"
import { FiMenu, FiX } from "react-icons/fi"
import { Link, NavLink } from "react-router"

import { NeetAccountEntry } from "./NeetAccountEntry"
import { NeetWordmark } from "./NeetLogo"

const LINKS = [
  { to: "/neet", label: "Overview", end: true },
  { to: "/neet/mocks", label: "Mock tests" },
  { to: "/", label: "Back to Prahit", end: true },
]

function NavLinks({ onNavigate }) {
  return LINKS.map(({ to, label, end }) => (
    <NavLink
      key={to}
      to={to}
      end={end}
      onClick={onNavigate}
      className="np-nav-link"
    >
      {label}
    </NavLink>
  ))
}

// Compact landing header. Small screens get a disclosure menu instead of a
// second navigation row; Escape and outside clicks close it.
export function NeetLandingHeader() {
  const [open, setOpen] = useState(false)
  const headerRef = useRef(null)
  const buttonRef = useRef(null)

  useEffect(() => {
    if (!open) return undefined
    const onKeyDown = (event) => {
      if (event.key !== "Escape") return
      setOpen(false)
      buttonRef.current?.focus()
    }
    const onPointerDown = (event) => {
      if (!headerRef.current?.contains(event.target)) setOpen(false)
    }
    document.addEventListener("keydown", onKeyDown)
    document.addEventListener("pointerdown", onPointerDown)
    return () => {
      document.removeEventListener("keydown", onKeyDown)
      document.removeEventListener("pointerdown", onPointerDown)
    }
  }, [open])

  return (
    <header ref={headerRef} className="np-header">
      <div className="np-header-bar">
        <Link
          to="/neet"
          aria-label="Prahit NEET Mocks home"
          className="np-brand"
        >
          <NeetWordmark />
        </Link>
        <nav aria-label="Prahit NEET Mocks" className="np-nav">
          <NavLinks />
        </nav>
        <div className="np-header-actions">
          <NeetAccountEntry variant="landing" />
          <button
            ref={buttonRef}
            type="button"
            className="np-menu-button"
            aria-label="Menu"
            aria-expanded={open}
            aria-controls="np-mobile-menu"
            onClick={() => setOpen((value) => !value)}
          >
            {open ? <FiX aria-hidden="true" /> : <FiMenu aria-hidden="true" />}
          </button>
        </div>
      </div>
      <nav
        id="np-mobile-menu"
        aria-label="Prahit NEET Mocks menu"
        className="np-mobile-menu"
        hidden={!open}
      >
        <NavLinks onNavigate={() => setOpen(false)} />
      </nav>
    </header>
  )
}
