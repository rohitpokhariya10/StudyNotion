import PageLoadingFallback from "@/shared/ui/PageLoadingFallback"
import Sidebar from "@/widgets/dashboard-sidebar"
import { useCallback, useEffect, useRef, useState } from "react"
import { AiOutlineMenu } from "react-icons/ai"
import { useSelector } from "react-redux"
import { Outlet, useLocation } from "react-router"

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

  if (profileLoading || authLoading) {
    return <PageLoadingFallback accessibleLabel="Loading dashboard" />
  }

  return (
    <div className="sn-workspace relative flex min-h-[calc(100dvh-var(--sn-header-height))] bg-[#f7f9fc]">
      <Sidebar mobileOpen={sidebarOpen} onClose={closeSidebar} />
      <main className="min-h-[calc(100dvh-var(--sn-header-height))] min-w-0 flex-1 overflow-auto">
        <div className="mx-auto w-full max-w-[1120px] px-4 py-6 sm:px-8 sm:py-10">
          <button
            ref={menuButtonRef}
            type="button"
            className="sn-btn sn-btn-secondary mb-6 md:hidden"
            onClick={() =>
              sidebarOpen ? closeSidebar() : setSidebarLocationKey(location.key)
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
