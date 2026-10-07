// This will prevent authenticated users from accessing this route
import { sanitizeInternalRedirect } from "@/shared/lib/routing/internalRedirect"
import PageLoadingFallback from "@/shared/ui/PageLoadingFallback"
import { useSelector } from "react-redux"
import { Navigate, useLocation } from "react-router"

function OpenRoute({ children }) {
  const { isAuthenticated, requiresPolicyAcceptance, status } = useSelector(
    (state) => state.auth
  )
  const location = useLocation()

  if (status === "checking") {
    return <PageLoadingFallback accessibleLabel="Checking your session" />
  }

  if (!isAuthenticated) return children

  const destination = sanitizeInternalRedirect(location.state?.from)
  return requiresPolicyAcceptance ? (
    <Navigate to="/accept-terms" replace state={{ from: destination }} />
  ) : (
    <Navigate to={destination} replace />
  )
}

export default OpenRoute
