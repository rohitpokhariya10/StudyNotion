import PageLoadingFallback from "@/shared/ui/PageLoadingFallback"
import RouteErrorBoundary from "@/shared/ui/RouteErrorBoundary"
import Navbar from "@/widgets/navbar"
import { Suspense } from "react"

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
