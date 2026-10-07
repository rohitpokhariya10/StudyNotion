import PageLoadingFallback from "@/shared/ui/PageLoadingFallback"
import { useSelector } from "react-redux"
import { Navigate } from "react-router"

export default function RoleRoute({ allowedRoles, children }) {
  const { isAuthenticated, status } = useSelector((state) => state.auth)
  const { user } = useSelector((state) => state.profile)

  if (status === "checking") {
    return (
      <PageLoadingFallback accessibleLabel="Checking account permissions" />
    )
  }

  if (!isAuthenticated) return <Navigate to="/login" replace />

  return allowedRoles.includes(user?.accountType) ? (
    children
  ) : (
    <Navigate to="/dashboard/my-profile" replace />
  )
}
