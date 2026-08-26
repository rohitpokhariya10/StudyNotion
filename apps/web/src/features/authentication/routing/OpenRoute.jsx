// This will prevent authenticated users from accessing this route
import { sanitizeInternalRedirect } from "@/shared/lib/routing/internalRedirect"
import { useSelector } from "react-redux"
import { Navigate, useLocation } from "react-router"

function OpenRoute({ children }) {
  const { isAuthenticated, requiresPolicyAcceptance, status } = useSelector(
    (state) => state.auth
  )
  const location = useLocation()

  if (status === "checking") {
    return (
      <div
        className="grid min-h-[calc(100vh-3.5rem)] place-items-center"
        role="status"
        aria-label="Checking your session"
      >
        <div className="spinner" />
      </div>
    )
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
