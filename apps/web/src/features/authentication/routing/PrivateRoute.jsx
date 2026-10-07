import PageLoadingFallback from "@/shared/ui/PageLoadingFallback"
// This will prevent non-authenticated users from accessing this route
import { useSelector } from "react-redux"
import { Navigate, useLocation } from "react-router"

function PrivateRoute({ allowPendingPolicies = false, children }) {
  const { isAuthenticated, requiresPolicyAcceptance, status } = useSelector(
    (state) => state.auth
  )
  const deletionPending = useSelector(
    (state) => state.profile.user?.deletionPending === true
  )
  const location = useLocation()

  if (status === "checking") {
    return <PageLoadingFallback accessibleLabel="Checking your session" />
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }
  if (
    deletionPending &&
    location.pathname.toLowerCase() !== "/dashboard/settings"
  ) {
    return <Navigate to="/dashboard/settings" replace />
  }
  if (deletionPending) {
    return children
  }
  if (requiresPolicyAcceptance && !allowPendingPolicies) {
    return <Navigate to="/accept-terms" replace state={{ from: location }} />
  }
  if (!requiresPolicyAcceptance && allowPendingPolicies) {
    return <Navigate to="/dashboard/my-profile" replace />
  }
  return children
}

export default PrivateRoute
