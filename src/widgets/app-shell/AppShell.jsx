import { Suspense } from "react"

import Navbar from "../../components/Common/Navbar"
import PageLoadingFallback from "../../shared/ui/PageLoadingFallback"
import RouteErrorBoundary from "../../shared/ui/RouteErrorBoundary"

function AppShell({ children }) {
  return (
    <div className="flex min-h-screen w-full flex-col bg-richblack-900 font-inter">
      <Navbar />
      <RouteErrorBoundary>
        <Suspense fallback={<PageLoadingFallback />}>{children}</Suspense>
      </RouteErrorBoundary>
    </div>
  )
}

export default AppShell
