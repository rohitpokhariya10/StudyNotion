import { useGetCatalogCategoriesQuery } from "@/entities/catalog"
import { ACCOUNT_TYPE } from "@/entities/user"
import { logout, ProfileDropdown } from "@/features/authentication"
import { categoryPathSlug } from "@/features/course-filter"
import useOnClickOutside from "@/shared/hooks/useOnClickOutside"
import AccessibleDialog from "@/shared/ui/AccessibleDialog"
import BrandLogo from "@/shared/ui/BrandLogo"
import FlaskLoader from "@/shared/ui/FlaskLoader"
import { NavbarLinks } from "@/widgets/navbar/model/links"
import { useCallback, useEffect, useRef, useState } from "react"
import {
  FiChevronDown,
  FiMenu,
  FiShoppingCart,
  FiUser,
  FiX,
} from "react-icons/fi"
import { useDispatch, useSelector } from "react-redux"
import { Link, NavLink, useLocation, useNavigate } from "react-router"

export default function Navbar() {
  const { isAuthenticated, status } = useSelector((state) => state.auth)
  const { user } = useSelector((state) => state.profile)
  const { totalItems } = useSelector((state) => state.cart)
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const location = useLocation()
  const [mobileLocation, setMobileLocation] = useState(null)
  const [catalogOpen, setCatalogOpen] = useState(false)
  const [mobileCatalog, setMobileCatalog] = useState(false)
  const catalogRef = useRef(null)
  const catalogTrigger = useRef(null)
  const mobileTrigger = useRef(null)
  const closeCatalog = useCallback(() => setCatalogOpen(false), [])
  useOnClickOutside(catalogRef, closeCatalog)
  const closeMobile = useCallback(() => {
    setMobileLocation(null)
    setMobileCatalog(false)
  }, [])
  const mobileOpen = mobileLocation === location.key
  const {
    data: categories = [],
    isLoading,
    isError,
    refetch,
  } = useGetCatalogCategoriesQuery()
  const available = categories.filter(
    (item) =>
      typeof item?.name === "string" && Number(item.publishedCourseCount) > 0
  )
  const inverse =
    location.pathname === "/careers"
      ? "sn-navbar-blue"
      : location.pathname === "/blogs"
        ? "sn-navbar-dark"
        : ""
  useEffect(() => {
    if (!catalogOpen) return undefined
    const close = (event) => {
      if (event.key === "Escape") {
        closeCatalog()
        catalogTrigger.current?.focus()
      }
    }
    document.addEventListener("keydown", close)
    return () => document.removeEventListener("keydown", close)
  }, [catalogOpen, closeCatalog])
  const handleLogout = () => {
    closeMobile()
    dispatch(logout(navigate))
  }
  const categoryLinks = (onNavigate) => (
    <>
      <Link
        to="/services"
        onClick={onNavigate}
        className="sn-menu-link font-semibold"
      >
        Explore all subjects →
      </Link>
      {isLoading ? (
        <FlaskLoader
          variant="compact"
          label="Loading catalog"
          className="p-3"
        />
      ) : isError ? (
        <div role="alert" className="p-3 text-sm">
          <p>Catalog is temporarily unavailable.</p>
          <button
            className="sn-btn sn-btn-secondary mt-2"
            type="button"
            onClick={refetch}
          >
            Retry catalog
          </button>
        </div>
      ) : available.length ? (
        available.map((item) => (
          <Link
            className="sn-menu-link"
            key={item.id || item.name}
            to={`/catalog/${categoryPathSlug(item.name)}`}
            onClick={onNavigate}
          >
            {item.name}
          </Link>
        ))
      ) : (
        <p className="p-3 text-sm text-text-secondary">No Courses Found</p>
      )}
      <Link
        className="sn-menu-link border-t border-border-default"
        to="/neet"
        onClick={onNavigate}
      >
        NEET Mocks
      </Link>
    </>
  )
  return (
    <header className={`sn-navbar relative z-50 ${inverse}`}>
      <a href="#main-content" className="sn-skip-link">
        Skip to content
      </a>
      <div className="sn-container flex min-h-[var(--sn-header-height)] items-center justify-between gap-3">
        <Link to="/" aria-label="Prahit home">
          <BrandLogo decorative />
        </Link>
        <nav className="hidden lg:block" aria-label="Primary navigation">
          <ul className="flex items-center gap-5">
            {NavbarLinks.map((item) => (
              <li key={item.path}>
                <NavLink
                  end={item.path !== "/blogs"}
                  to={item.path}
                  className={({ isActive }) =>
                    `sn-nav-link ${isActive ? "sn-nav-active" : ""}`
                  }
                >
                  {item.title}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
        <div className="hidden items-center gap-2 lg:flex">
          <div ref={catalogRef} className="relative">
            <button
              ref={catalogTrigger}
              type="button"
              className="sn-nav-link flex items-center gap-1 px-2"
              aria-expanded={catalogOpen}
              aria-controls="desktop-catalog"
              onClick={() => setCatalogOpen(!catalogOpen)}
            >
              Catalog <FiChevronDown aria-hidden="true" />
            </button>
            {catalogOpen && (
              <nav
                id="desktop-catalog"
                aria-label="Course categories"
                className="absolute top-full right-0 z-50 mt-3 max-h-[60vh] w-72 overflow-y-auto rounded-xl border border-border-default bg-white p-3 text-text-primary shadow-education"
              >
                {categoryLinks(closeCatalog)}
              </nav>
            )}
          </div>
          {isAuthenticated && user?.accountType === ACCOUNT_TYPE.STUDENT && (
            <Link
              to="/dashboard/cart"
              className="sn-nav-link relative grid h-11 w-11 place-items-center"
              aria-label={`Shopping cart with ${totalItems} item${totalItems === 1 ? "" : "s"}`}
            >
              <FiShoppingCart size={21} aria-hidden="true" />
              {totalItems > 0 && (
                <span className="absolute top-0 right-0 rounded-full bg-brand-primary px-1.5 text-xs text-white">
                  {totalItems}
                </span>
              )}
            </Link>
          )}
          {status !== "checking" && !isAuthenticated && (
            <>
              <Link to="/login" className="sn-nav-link px-2">
                Log in
              </Link>
              <Link
                to="/signup"
                className={`sn-btn ${inverse ? "sn-btn-light" : "sn-btn-primary"}`}
              >
                Sign up
              </Link>
            </>
          )}
          {isAuthenticated && user && <ProfileDropdown />}
        </div>
        <div className="flex items-center gap-1 lg:hidden">
          {status !== "checking" && (
            <Link
              className="sn-nav-link grid h-11 w-11 place-items-center"
              to={isAuthenticated ? "/dashboard" : "/login"}
              aria-label={isAuthenticated ? "My account" : "Log in"}
            >
              <FiUser size={21} aria-hidden="true" />
            </Link>
          )}
          <button
            ref={mobileTrigger}
            type="button"
            className="sn-nav-link grid h-11 w-11 place-items-center"
            aria-label="Open navigation"
            aria-expanded={mobileOpen}
            aria-controls="mobile-navigation"
            onClick={() => setMobileLocation(location.key)}
          >
            <FiMenu size={25} aria-hidden="true" />
          </button>
        </div>
      </div>
      {mobileOpen && (
        <AccessibleDialog
          title="Explore Prahit"
          onClose={closeMobile}
          titleClassName="text-lg font-semibold"
          className="sn-mobile-nav"
          overlayClassName="bg-black/40 items-start! justify-items-end! p-0!"
        >
          <button
            type="button"
            className="sn-btn sn-btn-icon sn-btn-secondary absolute top-4 right-4"
            onClick={closeMobile}
            aria-label="Close navigation"
          >
            <FiX aria-hidden="true" />
          </button>
          <nav
            id="mobile-navigation"
            aria-label="Mobile navigation"
            className="mt-7"
          >
            <ul className="space-y-1">
              {NavbarLinks.map((item) => (
                <li key={item.path}>
                  <NavLink
                    end={item.path !== "/blogs"}
                    to={item.path}
                    onClick={closeMobile}
                    className={({ isActive }) =>
                      `sn-menu-link ${isActive ? "bg-brand-soft text-brand-primary" : ""}`
                    }
                  >
                    {item.title}
                  </NavLink>
                </li>
              ))}
            </ul>
            <button
              className="sn-menu-link mt-2 flex w-full items-center justify-between"
              type="button"
              aria-expanded={mobileCatalog}
              aria-controls="mobile-catalog"
              onClick={() => setMobileCatalog(!mobileCatalog)}
            >
              Catalog <FiChevronDown aria-hidden="true" />
            </button>
            {mobileCatalog && (
              <div
                id="mobile-catalog"
                className="ml-3 border-l border-border-default pl-3"
              >
                {categoryLinks(closeMobile)}
              </div>
            )}
            <Link to="/contact" className="sn-menu-link" onClick={closeMobile}>
              Contact us
            </Link>
            <div className="mt-5 border-t border-border-default pt-5">
              {status === "checking" ? (
                <FlaskLoader variant="compact" label="Checking your session" />
              ) : isAuthenticated && user ? (
                <>
                  <Link
                    className="sn-menu-link"
                    to="/dashboard/my-profile"
                    onClick={closeMobile}
                  >
                    Dashboard
                  </Link>
                  <Link
                    className="sn-menu-link"
                    to="/dashboard/settings"
                    onClick={closeMobile}
                  >
                    Settings
                  </Link>
                  {user.accountType === ACCOUNT_TYPE.STUDENT && (
                    <Link
                      className="sn-menu-link"
                      to="/dashboard/cart"
                      onClick={closeMobile}
                    >
                      Cart ({totalItems})
                    </Link>
                  )}
                  <button
                    type="button"
                    className="sn-menu-link w-full text-left text-danger"
                    onClick={handleLogout}
                  >
                    Log out
                  </button>
                </>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <Link
                    to="/login"
                    className="sn-btn sn-btn-secondary"
                    onClick={closeMobile}
                  >
                    Log in
                  </Link>
                  <Link
                    to="/signup"
                    className="sn-btn sn-btn-primary"
                    onClick={closeMobile}
                  >
                    Sign up
                  </Link>
                </div>
              )}
            </div>
          </nav>
        </AccessibleDialog>
      )}
    </header>
  )
}
