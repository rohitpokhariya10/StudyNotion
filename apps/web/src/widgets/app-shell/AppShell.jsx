import PageLoadingFallback from "@/shared/ui/PageLoadingFallback"
import RouteErrorBoundary from "@/shared/ui/RouteErrorBoundary"
import Navbar from "@/widgets/navbar"
import SupportLink from "@/widgets/support-link"
import { Suspense, useEffect } from "react"
import { useLocation } from "react-router"

import "@fontsource/poppins/400.css"
import "@fontsource/poppins/500.css"
import "@fontsource/poppins/600.css"
import "@fontsource/poppins/700.css"

function AppShell({ children }) {
  const { pathname, hash } = useLocation()
  const neetExperience = /^\/(?:neet|project-neet)(?:\/|$)/i.test(pathname)
  useEffect(() => {
    let observer
    const frame = requestAnimationFrame(() => {
      if (!hash) window.scrollTo({ top: 0, behavior: "instant" })
      else {
        const scrollToAnchor = () => {
          const target = document.getElementById(hash.slice(1))
          if (target) {
            target.scrollIntoView()
            observer?.disconnect()
          }
        }
        observer = new MutationObserver(scrollToAnchor)
        observer.observe(document.getElementById("main-content"), {
          childList: true,
          subtree: true,
        })
        scrollToAnchor()
      }
    })
    return () => {
      cancelAnimationFrame(frame)
      observer?.disconnect()
    }
  }, [pathname, hash])
  return (
    <div className="sn-app catalog-theme flex min-h-screen w-full flex-col font-inter">
      {!neetExperience && <Navbar />}
      <div
        id="main-content"
        tabIndex={-1}
        className="flex min-w-0 flex-1 flex-col"
      >
        <RouteErrorBoundary>
          <Suspense fallback={<PageLoadingFallback />}>{children}</Suspense>
        </RouteErrorBoundary>
      </div>
      <SupportLink />
    </div>
  )
}

export default AppShell
