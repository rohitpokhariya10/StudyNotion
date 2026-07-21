import { useCallback, useEffect, useRef, useState } from "react"
import {
  AiOutlineClose,
  AiOutlineMenu,
  AiOutlineShoppingCart,
} from "react-icons/ai"
import { BsChevronDown } from "react-icons/bs"
import { useDispatch, useSelector } from "react-redux"
import { Link, matchPath, useLocation, useNavigate } from "react-router-dom"

import logo from "../../assets/Logo/Logo-Full-Light.png"
import { NavbarLinks } from "../../data/navbar-links"
import useOnClickOutside from "../../hooks/useOnClickOutside"
import { useGetCatalogCategoriesQuery } from "../../services/catalogApi"
import { logout } from "../../services/operations/authAPI"
import { getAvatarSource, setInitialsAvatarOnError } from "../../utils/avatar"
import { ACCOUNT_TYPE } from "../../utils/constants"
import ProfileDropdown from "../core/Auth/ProfileDropdown"

function Navbar() {
  const { isAuthenticated, status } = useSelector((state) => state.auth)
  const { user } = useSelector((state) => state.profile)
  const { totalItems } = useSelector((state) => state.cart)
  const dispatch = useDispatch()
  const location = useLocation()
  const navigate = useNavigate()

  const { data: subLinks = [], isLoading: catalogLinksLoading } =
    useGetCatalogCategoriesQuery()
  const [mobileMenuLocationKey, setMobileMenuLocationKey] = useState(null)
  const [mobileCatalogOpen, setMobileCatalogOpen] = useState(false)
  const mobileMenuRef = useRef(null)
  const mobileToggleRef = useRef(null)
  const previousLocationKeyRef = useRef(location.key)

  const closeMobileMenu = useCallback(() => {
    setMobileMenuLocationKey(null)
    setMobileCatalogOpen(false)
  }, [])

  const mobileOpen = mobileMenuLocationKey === location.key

  useOnClickOutside(mobileMenuRef, closeMobileMenu)

  useEffect(() => {
    if (previousLocationKeyRef.current === location.key) return undefined
    previousLocationKeyRef.current = location.key
    const timeoutId = window.setTimeout(closeMobileMenu, 0)
    return () => window.clearTimeout(timeoutId)
  }, [closeMobileMenu, location.key])

  useEffect(() => {
    if (!mobileOpen) return undefined

    const handleEscape = (event) => {
      if (event.key !== "Escape") return
      closeMobileMenu()
      mobileToggleRef.current?.focus()
    }

    document.addEventListener("keydown", handleEscape)
    return () => document.removeEventListener("keydown", handleEscape)
  }, [closeMobileMenu, mobileOpen])

  const matchRoute = (route) =>
    Boolean(route && matchPath({ path: route }, location.pathname))

  const catalogLinks = subLinks.filter(
    (subLink) =>
      typeof subLink?.name === "string" &&
      Number(subLink?.publishedCourseCount) > 0
  )

  const catalogPath = (name) =>
    `/catalog/${name.split(" ").join("-").toLowerCase()}`

  const handleLogout = () => {
    closeMobileMenu()
    dispatch(logout(navigate))
  }

  return (
    <header
      className={`relative z-50 flex h-14 shrink-0 items-center justify-center border-b border-b-richblack-700 ${
        location.pathname !== "/" ? "bg-richblack-800" : ""
      } transition-all duration-200`}
    >
      <div className="flex w-11/12 max-w-maxContent items-center justify-between">
        <Link to="/" aria-label="StudyNotion home">
          <img src={logo} alt="StudyNotion" width={160} height={32} />
        </Link>

        <nav className="hidden md:block" aria-label="Primary navigation">
          <ul className="flex gap-x-6 text-richblack-25">
            {NavbarLinks.map((link) => (
              <li key={link.title}>
                {link.title === "Catalog" ? (
                  <div
                    className={`group relative flex items-center gap-1 ${
                      matchRoute("/catalog/:catalogName")
                        ? "text-yellow-25"
                        : "text-richblack-25"
                    }`}
                  >
                    <button
                      type="button"
                      className="flex items-center gap-1"
                      aria-haspopup="true"
                    >
                      <span>{link.title}</span>
                      <BsChevronDown aria-hidden="true" />
                    </button>
                    <div className="invisible absolute left-1/2 top-1/2 z-[1000] flex w-[200px] -translate-x-1/2 translate-y-[3em] flex-col rounded-lg bg-richblack-5 p-4 text-richblack-900 opacity-0 transition-all duration-150 group-focus-within:visible group-focus-within:translate-y-[1.65em] group-focus-within:opacity-100 group-hover:visible group-hover:translate-y-[1.65em] group-hover:opacity-100 lg:w-[300px]">
                      <div className="absolute left-1/2 top-0 -z-10 h-6 w-6 -translate-y-[40%] translate-x-[80%] rotate-45 select-none rounded bg-richblack-5" />
                      {catalogLinksLoading ? (
                        <p className="text-center">Loading...</p>
                      ) : catalogLinks.length ? (
                        catalogLinks.map((subLink) => (
                          <Link
                            to={catalogPath(subLink.name)}
                            className="rounded-lg bg-transparent py-4 pl-4 hover:bg-richblack-50 focus-visible:bg-richblack-50 focus-visible:outline-none"
                            key={subLink.id || subLink.name}
                          >
                            {subLink.name}
                          </Link>
                        ))
                      ) : (
                        <p className="text-center">No Courses Found</p>
                      )}
                    </div>
                  </div>
                ) : (
                  <Link
                    to={link.path}
                    className={
                      matchRoute(link.path)
                        ? "text-yellow-25"
                        : "text-richblack-25"
                    }
                  >
                    {link.title}
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </nav>

        <div className="hidden items-center gap-x-4 md:flex">
          {isAuthenticated && user?.accountType === ACCOUNT_TYPE.STUDENT && (
            <Link
              to="/dashboard/cart"
              className="relative"
              aria-label={`Shopping cart with ${totalItems} item${
                totalItems === 1 ? "" : "s"
              }`}
            >
              <AiOutlineShoppingCart className="text-2xl text-richblack-100" />
              {totalItems > 0 && (
                <span className="absolute -bottom-2 -right-2 grid h-5 w-5 place-items-center overflow-hidden rounded-full bg-richblack-600 text-center text-xs font-bold text-yellow-100">
                  {totalItems}
                </span>
              )}
            </Link>
          )}
          {status !== "checking" && !isAuthenticated && (
            <Link
              to="/login"
              className="rounded-lg border border-richblack-700 bg-richblack-800 px-3 py-2 text-richblack-100"
            >
              Log in
            </Link>
          )}
          {status !== "checking" && !isAuthenticated && (
            <Link
              to="/signup"
              className="rounded-lg border border-richblack-700 bg-richblack-800 px-3 py-2 text-richblack-100"
            >
              Sign up
            </Link>
          )}
          {isAuthenticated && user && <ProfileDropdown />}
        </div>

        <div className="relative md:hidden" ref={mobileMenuRef}>
          <button
            ref={mobileToggleRef}
            type="button"
            className="grid h-10 w-10 place-items-center rounded-md text-richblack-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-yellow-50"
            onClick={() => {
              if (mobileOpen) closeMobileMenu()
              else setMobileMenuLocationKey(location.key)
            }}
            aria-controls="mobile-navigation"
            aria-expanded={mobileOpen}
            aria-label={mobileOpen ? "Close navigation" : "Open navigation"}
          >
            {mobileOpen ? (
              <AiOutlineClose fontSize={24} aria-hidden="true" />
            ) : (
              <AiOutlineMenu fontSize={24} aria-hidden="true" />
            )}
          </button>

          {mobileOpen && (
            <>
              <button
                type="button"
                className="fixed inset-x-0 bottom-0 top-14 z-40 cursor-default bg-richblack-900/70"
                aria-label="Close navigation"
                onClick={closeMobileMenu}
              />
              <nav
                id="mobile-navigation"
                className="fixed inset-x-0 top-14 z-50 max-h-[calc(100dvh-3.5rem)] overflow-y-auto border-b border-richblack-700 bg-richblack-800 px-[4.5%] py-5 shadow-2xl"
                aria-label="Mobile navigation"
              >
                <ul className="space-y-1 text-richblack-25">
                  {NavbarLinks.map((link) => (
                    <li key={link.title}>
                      {link.title === "Catalog" ? (
                        <>
                          <button
                            type="button"
                            className={`flex w-full items-center justify-between rounded-md px-3 py-3 text-left ${
                              matchRoute("/catalog/:catalogName")
                                ? "text-yellow-25"
                                : "hover:bg-richblack-700"
                            }`}
                            onClick={() =>
                              setMobileCatalogOpen((open) => !open)
                            }
                            aria-controls="mobile-catalog-links"
                            aria-expanded={mobileCatalogOpen}
                          >
                            <span>Catalog</span>
                            <BsChevronDown
                              className={`transition-transform ${
                                mobileCatalogOpen ? "rotate-180" : ""
                              }`}
                              aria-hidden="true"
                            />
                          </button>
                          {mobileCatalogOpen && (
                            <div
                              id="mobile-catalog-links"
                              className="ml-3 border-l border-richblack-600 pl-3"
                            >
                              {catalogLinksLoading ? (
                                <p className="px-3 py-3 text-richblack-300">
                                  Loading catalog...
                                </p>
                              ) : catalogLinks.length ? (
                                catalogLinks.map((subLink) => (
                                  <Link
                                    key={subLink.id || subLink.name}
                                    to={catalogPath(subLink.name)}
                                    onClick={closeMobileMenu}
                                    className="block rounded-md px-3 py-3 hover:bg-richblack-700"
                                  >
                                    {subLink.name}
                                  </Link>
                                ))
                              ) : (
                                <p className="px-3 py-3 text-richblack-300">
                                  No courses available yet
                                </p>
                              )}
                            </div>
                          )}
                        </>
                      ) : (
                        <Link
                          to={link.path}
                          onClick={closeMobileMenu}
                          className={`block rounded-md px-3 py-3 ${
                            matchRoute(link.path)
                              ? "text-yellow-25"
                              : "hover:bg-richblack-700"
                          }`}
                        >
                          {link.title}
                        </Link>
                      )}
                    </li>
                  ))}
                </ul>

                <div className="mt-4 border-t border-richblack-700 pt-4">
                  {status === "checking" ? (
                    <p
                      className="px-3 py-2 text-sm text-richblack-300"
                      role="status"
                    >
                      Checking your session...
                    </p>
                  ) : isAuthenticated && user ? (
                    <div className="space-y-2">
                      <Link
                        to="/dashboard/my-profile"
                        onClick={closeMobileMenu}
                        className="flex items-center gap-3 rounded-md px-3 py-2 hover:bg-richblack-700"
                      >
                        <img
                          src={getAvatarSource(user)}
                          alt=""
                          className="h-9 w-9 rounded-full object-cover"
                          onError={(event) =>
                            setInitialsAvatarOnError(event, user)
                          }
                        />
                        <span className="min-w-0">
                          <span className="block truncate font-medium text-richblack-5">
                            {[user.firstName, user.lastName]
                              .filter(Boolean)
                              .join(" ") || "My account"}
                          </span>
                          <span className="block text-xs text-richblack-300">
                            Dashboard
                          </span>
                        </span>
                      </Link>
                      {user.accountType === ACCOUNT_TYPE.STUDENT && (
                        <Link
                          to="/dashboard/cart"
                          onClick={closeMobileMenu}
                          className="flex items-center justify-between rounded-md px-3 py-3 hover:bg-richblack-700"
                        >
                          <span className="flex items-center gap-2">
                            <AiOutlineShoppingCart
                              className="text-xl"
                              aria-hidden="true"
                            />
                            Cart
                          </span>
                          {totalItems > 0 && (
                            <span className="rounded-full bg-yellow-50 px-2 py-0.5 text-xs font-bold text-richblack-900">
                              {totalItems}
                            </span>
                          )}
                        </Link>
                      )}
                      <button
                        type="button"
                        className="w-full rounded-md px-3 py-3 text-left text-pink-100 hover:bg-richblack-700"
                        onClick={handleLogout}
                      >
                        Log out
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-3">
                      <Link
                        to="/login"
                        onClick={closeMobileMenu}
                        className="rounded-md border border-richblack-600 px-3 py-2 text-center text-richblack-50"
                      >
                        Log in
                      </Link>
                      <Link
                        to="/signup"
                        onClick={closeMobileMenu}
                        className="rounded-md bg-yellow-50 px-3 py-2 text-center font-medium text-richblack-900"
                      >
                        Sign up
                      </Link>
                    </div>
                  )}
                </div>
              </nav>
            </>
          )}
        </div>
      </div>
    </header>
  )
}

export default Navbar
