import { useCallback, useEffect, useRef, useState } from "react"
import { AiOutlineMenu } from "react-icons/ai"
import { useSelector } from "react-redux"
import { Outlet, useLocation } from "react-router-dom"

import Sidebar from "../components/core/Dashboard/Sidebar"

function Dashboard() {
  const { loading: profileLoading } = useSelector((state) => state.profile)
  const { loading: authLoading } = useSelector((state) => state.auth)
  const location = useLocation()
  const [sidebarLocationKey, setSidebarLocationKey] = useState(null)
  const menuButtonRef = useRef(null)
  const previousLocationKeyRef = useRef(location.key)
  const sidebarOpen = sidebarLocationKey === location.key

  const closeSidebar = useCallback(() => setSidebarLocationKey(null), [])

  useEffect(() => {
    if (previousLocationKeyRef.current === location.key) return undefined
    previousLocationKeyRef.current = location.key
    const timeoutId = window.setTimeout(closeSidebar, 0)
    return () => window.clearTimeout(timeoutId)
  }, [closeSidebar, location.key])

  useEffect(() => {
    if (!sidebarOpen) return undefined

    const handleEscape = (event) => {
      if (event.key !== "Escape") return
      closeSidebar()
      menuButtonRef.current?.focus()
    }

    document.addEventListener("keydown", handleEscape)
    return () => document.removeEventListener("keydown", handleEscape)
  }, [closeSidebar, sidebarOpen])

  if (profileLoading || authLoading) {
    return (
      <div className="grid min-h-[calc(100vh-3.5rem)] place-items-center">
        <div className="spinner" role="status" aria-label="Loading dashboard" />
      </div>
    )
  }

  return (
    <div className="relative flex min-h-[calc(100vh-3.5rem)]">
      <Sidebar mobileOpen={sidebarOpen} onClose={closeSidebar} />
      <main className="h-[calc(100vh-3.5rem)] min-w-0 flex-1 overflow-auto">
        <div className="mx-auto w-11/12 max-w-[1000px] py-6 sm:py-10">
          <button
            ref={menuButtonRef}
            type="button"
            className="mb-6 flex items-center gap-2 rounded-md border border-richblack-600 bg-richblack-800 px-3 py-2 text-sm font-medium text-richblack-50 md:hidden"
            onClick={() =>
              sidebarOpen
                ? closeSidebar()
                : setSidebarLocationKey(location.key)
            }
            aria-controls="dashboard-mobile-navigation"
            aria-expanded={sidebarOpen}
          >
            <AiOutlineMenu className="text-xl" aria-hidden="true" />
            Dashboard menu
          </button>
          <Outlet />
        </div>
      </main>
    </div>
  )
}

export default Dashboard
